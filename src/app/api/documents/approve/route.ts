import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Interfaz para documento aprobado
interface ApprovedDocument {
  id: string
  amount: number
  date: string
  accountCode: string
  accountName: string
  vendor: string
  description: string
  invoiceNumber?: string
  journalEntry: {
    debit: { account: string; amount: number; code: string }
    credit: { account: string; amount: number; code: string }
  }
}

// Interfaz para actualización de balance
interface BalanceUpdate {
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
  newBalance: number
}

/**
 * POST /api/documents/approve
 * Aprueba un documento y actualiza automáticamente:
 * - Crea asiento de diario
 * - Actualiza saldos de cuentas
 * - Actualiza Balance General
 * - Actualiza Estado de Resultados
 * - Actualiza Flujo de Efectivo
 * - Registra en audit trail
 */
export async function POST(request: NextRequest) {
  try {
    // ============ VALIDACIÓN DE AUTENTICACIÓN ============
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (!session.user?.id) {
      return NextResponse.json(
        { error: 'Usuario inválido', code: 'INVALID_USER' },
        { status: 401 }
      )
    }

    // ============ VALIDACIÓN DE DATOS DE ENTRADA ============
    const body = await request.json()
    const { documentId, document, action } = body

    // Validar campos requeridos
    if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {
      return NextResponse.json(
        { error: 'documentId es requerido y debe ser un string válido', code: 'INVALID_DOCUMENT_ID' },
        { status: 400 }
      )
    }

    if (!document || typeof document !== 'object') {
      return NextResponse.json(
        { error: 'document es requerido y debe ser un objeto', code: 'INVALID_DOCUMENT' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE CAMPOS DEL DOCUMENTO ============
    const requiredFields = ['id', 'amount', 'date', 'accountCode', 'accountName', 'vendor', 'description', 'journalEntry']
    for (const field of requiredFields) {
      if (!document[field]) {
        return NextResponse.json(
          { error: `Campo requerido faltante: ${field}`, code: 'MISSING_FIELD', field },
          { status: 400 }
        )
      }
    }

    // ============ VALIDACIÓN DE MONTOS ============
    if (typeof document.amount !== 'number' || document.amount <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un número positivo', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    if (document.amount > 10000000) {
      return NextResponse.json(
        { error: 'El monto excede el límite permitido de $10,000,000', code: 'AMOUNT_EXCEEDED' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE FECHA ============
    const docDate = new Date(document.date)
    if (isNaN(docDate.getTime())) {
      return NextResponse.json(
        { error: 'Fecha inválida', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    const today = new Date()
    const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
    const oneYearFuture = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())

    if (docDate < twoYearsAgo || docDate > oneYearFuture) {
      return NextResponse.json(
        { error: 'La fecha debe estar entre 2 años atrás y 1 año en el futuro', code: 'DATE_OUT_OF_RANGE' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE CÓDIGO DE CUENTA ============
    if (typeof document.accountCode !== 'string' || !document.accountCode.match(/^[1-9]\d{3}$/)) {
      return NextResponse.json(
        { error: 'Código de cuenta inválido (debe ser 4 dígitos comenzando con 1-9)', code: 'INVALID_ACCOUNT_CODE' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE VENDOR ============
    if (typeof document.vendor !== 'string' || document.vendor.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nombre de proveedor inválido (mínimo 2 caracteres)', code: 'INVALID_VENDOR' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE DESCRIPCIÓN ============
    if (typeof document.description !== 'string' || document.description.trim().length < 5) {
      return NextResponse.json(
        { error: 'Descripción inválida (mínimo 5 caracteres)', code: 'INVALID_DESCRIPTION' },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE ASIENTO CONTABLE ============
    if (!document.journalEntry || typeof document.journalEntry !== 'object') {
      return NextResponse.json(
        { error: 'Asiento contable requerido', code: 'MISSING_JOURNAL_ENTRY' },
        { status: 400 }
      )
    }

    if (!document.journalEntry.debit || !document.journalEntry.credit) {
      return NextResponse.json(
        { error: 'Asiento contable debe tener debe y haber', code: 'INCOMPLETE_JOURNAL_ENTRY' },
        { status: 400 }
      )
    }

    // Validar montos del asiento
    if (typeof document.journalEntry.debit.amount !== 'number' || document.journalEntry.debit.amount <= 0) {
      return NextResponse.json(
        { error: 'Monto de débito inválido', code: 'INVALID_DEBIT_AMOUNT' },
        { status: 400 }
      )
    }

    if (typeof document.journalEntry.credit.amount !== 'number' || document.journalEntry.credit.amount <= 0) {
      return NextResponse.json(
        { error: 'Monto de crédito inválido', code: 'INVALID_CREDIT_AMOUNT' },
        { status: 400 }
      )
    }

    // Validar que el asiento esté balanceado (con tolerancia de centavos)
    const debitAmount = Math.round(document.journalEntry.debit.amount * 100) / 100
    const creditAmount = Math.round(document.journalEntry.credit.amount * 100) / 100
    const isBalanced = Math.abs(debitAmount - creditAmount) < 0.01
    
    if (!isBalanced) {
      return NextResponse.json(
        { 
          error: `El asiento contable no está balanceado. Debe: $${debitAmount}, Haber: $${creditAmount}`, 
          code: 'UNBALANCED_ENTRY',
          debit: debitAmount,
          credit: creditAmount,
          difference: debitAmount - creditAmount
        },
        { status: 400 }
      )
    }

    // Validar que el monto del documento coincida con el asiento
    if (Math.abs(document.amount - debitAmount) > 0.01) {
      return NextResponse.json(
        { 
          error: 'El monto del documento no coincide con el asiento contable', 
          code: 'AMOUNT_MISMATCH',
          documentAmount: document.amount,
          entryAmount: debitAmount
        },
        { status: 400 }
      )
    }

    // ============ VALIDACIÓN DE CÓDIGOS DE CUENTA EN ASIENTO ============
    if (!document.journalEntry.debit.code || !document.journalEntry.debit.code.match(/^[1-9]\d{3}$/)) {
      return NextResponse.json(
        { error: 'Código de cuenta de débito inválido', code: 'INVALID_DEBIT_CODE' },
        { status: 400 }
      )
    }

    if (!document.journalEntry.credit.code || !document.journalEntry.credit.code.match(/^[1-9]\d{3}$/)) {
      return NextResponse.json(
        { error: 'Código de cuenta de crédito inválido', code: 'INVALID_CREDIT_CODE' },
        { status: 400 }
      )
    }

    // Validar que no sea el mismo código en debe y haber
    if (document.journalEntry.debit.code === document.journalEntry.credit.code) {
      return NextResponse.json(
        { error: 'El debe y haber no pueden usar la misma cuenta', code: 'SAME_ACCOUNT_BOTH_SIDES' },
        { status: 400 }
      )
    }

    // 1. Crear Asiento de Diario
    const journalEntry = await createJournalEntry(document, session.user.id)

    // 2. Actualizar Saldos de Cuentas
    const balanceUpdates = await updateAccountBalances(document)

    // 3. Actualizar Balance General
    const balanceSheetUpdate = await updateBalanceSheet(document)

    // 4. Actualizar Estado de Resultados
    const incomeStatementUpdate = await updateIncomeStatement(document)

    // 5. Actualizar Flujo de Efectivo
    const cashFlowUpdate = await updateCashFlow(document)

    // 6. Registrar en Audit Trail
    const auditEntry = await createAuditTrail(document, session.user.id, action || 'approve')

    // 7. Enviar notificación (opcional)
    await sendNotification(session.user.email, document)

    return NextResponse.json({
      success: true,
      message: 'Documento aprobado y reflejado en el sistema',
      data: {
        documentId: document.id,
        journalEntryId: journalEntry.id,
        balanceUpdates,
        reports: {
          balanceSheet: balanceSheetUpdate,
          incomeStatement: incomeStatementUpdate,
          cashFlow: cashFlowUpdate
        },
        auditTrailId: auditEntry.id,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error al aprobar documento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/approve
 * Reclasifica un documento aprobado
 */
export async function PUT(request: NextRequest) {
  try {
    // ============ VALIDACIÓN DE AUTENTICACIÓN ============
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (!session.user?.id) {
      return NextResponse.json(
        { error: 'Usuario inválido', code: 'INVALID_USER' },
        { status: 401 }
      )
    }

    // ============ VALIDACIÓN DE DATOS DE ENTRADA ============
    const body = await request.json()
    const { documentId, originalAccount, newAccount, reason } = body

    // Validar documentId
    if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {
      return NextResponse.json(
        { error: 'documentId es requerido', code: 'MISSING_DOCUMENT_ID' },
        { status: 400 }
      )
    }

    // Validar originalAccount
    if (!originalAccount || typeof originalAccount !== 'object') {
      return NextResponse.json(
        { error: 'originalAccount es requerido', code: 'MISSING_ORIGINAL_ACCOUNT' },
        { status: 400 }
      )
    }

    if (!originalAccount.code || !originalAccount.code.match(/^[1-9]\d{3}$/)) {
      return NextResponse.json(
        { error: 'Código de cuenta original inválido', code: 'INVALID_ORIGINAL_CODE' },
        { status: 400 }
      )
    }

    // Validar newAccount
    if (!newAccount || typeof newAccount !== 'object') {
      return NextResponse.json(
        { error: 'newAccount es requerido', code: 'MISSING_NEW_ACCOUNT' },
        { status: 400 }
      )
    }

    if (!newAccount.code || !newAccount.code.match(/^[1-9]\d{3}$/)) {
      return NextResponse.json(
        { error: 'Código de cuenta nueva inválido', code: 'INVALID_NEW_CODE' },
        { status: 400 }
      )
    }

    if (!newAccount.name || typeof newAccount.name !== 'string' || newAccount.name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Nombre de cuenta nueva inválido', code: 'INVALID_NEW_NAME' },
        { status: 400 }
      )
    }

    // Validar que las cuentas sean diferentes
    if (originalAccount.code === newAccount.code) {
      return NextResponse.json(
        { error: 'La cuenta nueva debe ser diferente a la original', code: 'SAME_ACCOUNT' },
        { status: 400 }
      )
    }

    // Validar reason
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Razón de reclasificación requerida (mínimo 10 caracteres)', code: 'MISSING_REASON' },
        { status: 400 }
      )
    }

    // 1. Revertir asiento original
    const reversal = await reverseJournalEntry(documentId, session.user.id, reason)

    // 2. Crear nuevo asiento con cuenta reclasificada
    const newEntry = await createReclassifiedEntry(documentId, newAccount, session.user.id)

    // 3. Actualizar saldos
    await updateBalancesForReclassification(originalAccount, newAccount, reversal.amount)

    // 4. Actualizar todos los reportes
    const reportsUpdate = await updateAllReports(documentId)

    // 5. Registrar en audit trail
    const auditEntry = await createAuditTrail({
      action: 'reclassify',
      documentId,
      originalAccount,
      newAccount,
      reason,
      userId: session.user.id
    }, session.user.id, 'reclassify')

    return NextResponse.json({
      success: true,
      message: 'Reclasificación aplicada exitosamente',
      data: {
        documentId,
        reversalId: reversal.id,
        newEntryId: newEntry.id,
        reportsUpdated: reportsUpdate,
        auditTrailId: auditEntry.id,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error al reclasificar documento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ============== FUNCIONES AUXILIARES ==============

/**
 * Crea un asiento de diario en la base de datos
 */
async function createJournalEntry(document: ApprovedDocument, userId: string) {
  // En producción: Insertar en Prisma
  const journalEntry = {
    id: `JE-${Date.now()}`,
    date: document.date,
    description: document.description,
    reference: document.invoiceNumber || document.id,
    createdBy: userId,
    status: 'posted',
    lines: [
      {
        lineNumber: 1,
        accountCode: document.journalEntry.debit.code,
        accountName: document.journalEntry.debit.account,
        debit: document.journalEntry.debit.amount,
        credit: 0,
        description: `${document.vendor} - ${document.description}`
      },
      {
        lineNumber: 2,
        accountCode: document.journalEntry.credit.code,
        accountName: document.journalEntry.credit.account,
        debit: 0,
        credit: document.journalEntry.credit.amount,
        description: `${document.vendor} - ${document.description}`
      }
    ],
    totalDebit: document.journalEntry.debit.amount,
    totalCredit: document.journalEntry.credit.amount,
    isBalanced: true,
    createdAt: new Date().toISOString()
  }

  console.log('✅ Asiento de Diario Creado:', journalEntry)
  return journalEntry
}

/**
 * Actualiza los saldos de las cuentas afectadas
 */
async function updateAccountBalances(document: ApprovedDocument): Promise<BalanceUpdate[]> {
  // En producción: Actualizar saldos en Prisma
  const updates: BalanceUpdate[] = []

  // Actualizar cuenta de débito
  const debitUpdate: BalanceUpdate = {
    accountCode: document.journalEntry.debit.code,
    accountName: document.journalEntry.debit.account,
    debitAmount: document.journalEntry.debit.amount,
    creditAmount: 0,
    newBalance: document.journalEntry.debit.amount // En producción: calcular desde DB
  }
  updates.push(debitUpdate)

  // Actualizar cuenta de crédito
  const creditUpdate: BalanceUpdate = {
    accountCode: document.journalEntry.credit.code,
    accountName: document.journalEntry.credit.account,
    debitAmount: 0,
    creditAmount: document.journalEntry.credit.amount,
    newBalance: document.journalEntry.credit.amount // En producción: calcular desde DB
  }
  updates.push(creditUpdate)

  console.log('✅ Saldos Actualizados:', updates)
  return updates
}

/**
 * Actualiza el Balance General
 */
async function updateBalanceSheet(document: ApprovedDocument) {
  // Determinar si las cuentas son de Balance o Resultados
  const debitCode = document.journalEntry.debit.code
  const creditCode = document.journalEntry.credit.code

  const update = {
    updated: true,
    affectedAccounts: [],
    timestamp: new Date().toISOString()
  }

  // Activos (1xxx)
  if (debitCode.startsWith('1')) {
    update.affectedAccounts.push({
      section: 'Activos',
      account: document.journalEntry.debit.account,
      change: document.amount,
      type: 'increase'
    })
  }
  if (creditCode.startsWith('1')) {
    update.affectedAccounts.push({
      section: 'Activos',
      account: document.journalEntry.credit.account,
      change: -document.amount,
      type: 'decrease'
    })
  }

  // Pasivos (2xxx)
  if (debitCode.startsWith('2')) {
    update.affectedAccounts.push({
      section: 'Pasivos',
      account: document.journalEntry.debit.account,
      change: -document.amount,
      type: 'decrease'
    })
  }
  if (creditCode.startsWith('2')) {
    update.affectedAccounts.push({
      section: 'Pasivos',
      account: document.journalEntry.credit.account,
      change: document.amount,
      type: 'increase'
    })
  }

  // Capital (3xxx)
  if (debitCode.startsWith('3')) {
    update.affectedAccounts.push({
      section: 'Capital',
      account: document.journalEntry.debit.account,
      change: -document.amount,
      type: 'decrease'
    })
  }
  if (creditCode.startsWith('3')) {
    update.affectedAccounts.push({
      section: 'Capital',
      account: document.journalEntry.credit.account,
      change: document.amount,
      type: 'increase'
    })
  }

  console.log('✅ Balance General Actualizado:', update)
  return update
}

/**
 * Actualiza el Estado de Resultados
 */
async function updateIncomeStatement(document: ApprovedDocument) {
  const debitCode = document.journalEntry.debit.code
  const creditCode = document.journalEntry.credit.code

  const update = {
    updated: true,
    affectedAccounts: [],
    timestamp: new Date().toISOString()
  }

  // Ingresos (4xxx)
  if (debitCode.startsWith('4')) {
    update.affectedAccounts.push({
      section: 'Ingresos',
      account: document.journalEntry.debit.account,
      change: -document.amount,
      type: 'decrease'
    })
  }
  if (creditCode.startsWith('4')) {
    update.affectedAccounts.push({
      section: 'Ingresos',
      account: document.journalEntry.credit.account,
      change: document.amount,
      type: 'increase'
    })
  }

  // Gastos (5xxx)
  if (debitCode.startsWith('5')) {
    update.affectedAccounts.push({
      section: 'Gastos',
      account: document.journalEntry.debit.account,
      change: document.amount,
      type: 'increase'
    })
  }
  if (creditCode.startsWith('5')) {
    update.affectedAccounts.push({
      section: 'Gastos',
      account: document.journalEntry.credit.account,
      change: -document.amount,
      type: 'decrease'
    })
  }

  console.log('✅ Estado de Resultados Actualizado:', update)
  return update
}

/**
 * Actualiza el Flujo de Efectivo
 */
async function updateCashFlow(document: ApprovedDocument) {
  const debitCode = document.journalEntry.debit.code
  const creditCode = document.journalEntry.credit.code

  const update = {
    updated: false,
    affectedSections: [],
    timestamp: new Date().toISOString()
  }

  // Solo actualizar si hay movimiento de efectivo (1110 - Caja, 1120 - Bancos)
  if (debitCode === '1110' || debitCode === '1120') {
    update.updated = true
    update.affectedSections.push({
      section: 'Entradas de Efectivo',
      amount: document.amount,
      description: document.description
    })
  }

  if (creditCode === '1110' || creditCode === '1120') {
    update.updated = true
    update.affectedSections.push({
      section: 'Salidas de Efectivo',
      amount: document.amount,
      description: document.description
    })
  }

  console.log('✅ Flujo de Efectivo Actualizado:', update)
  return update
}

/**
 * Crea una entrada en el audit trail
 */
async function createAuditTrail(document: any, userId: string, action: string) {
  const auditEntry = {
    id: `AUDIT-${Date.now()}`,
    action: action,
    documentId: document.id || document.documentId,
    userId: userId,
    timestamp: new Date().toISOString(),
    details: {
      documentName: document.filename || 'N/A',
      amount: document.amount,
      accountCode: document.accountCode || document.newAccount?.code,
      description: document.description || document.reason || 'N/A'
    },
    ipAddress: '127.0.0.1', // En producción: obtener IP real
    userAgent: 'API Server'
  }

  console.log('✅ Audit Trail Registrado:', auditEntry)
  return auditEntry
}

/**
 * Envía notificación por email
 */
async function sendNotification(email: string, document: ApprovedDocument) {
  // En producción: Integrar con servicio de email (SendGrid, AWS SES, etc.)
  console.log(`📧 Notificación enviada a ${email}:`)
  console.log(`   Documento ${document.id} aprobado`)
  console.log(`   Monto: $${document.amount}`)
  console.log(`   Cuenta: ${document.accountCode} - ${document.accountName}`)
  
  return { sent: true, timestamp: new Date().toISOString() }
}

/**
 * Revierte un asiento de diario
 */
async function reverseJournalEntry(documentId: string, userId: string, reason: string) {
  // En producción: Crear asiento de reversión en Prisma
  const reversal = {
    id: `REV-${Date.now()}`,
    originalDocumentId: documentId,
    date: new Date().toISOString().split('T')[0],
    description: `REVERSIÓN: ${reason}`,
    createdBy: userId,
    status: 'posted',
    amount: 0, // Se obtendría de la base de datos
    createdAt: new Date().toISOString()
  }

  console.log('✅ Asiento Revertido:', reversal)
  return reversal
}

/**
 * Crea un nuevo asiento con cuenta reclasificada
 */
async function createReclassifiedEntry(documentId: string, newAccount: any, userId: string) {
  // En producción: Crear nuevo asiento en Prisma
  const newEntry = {
    id: `JE-RECL-${Date.now()}`,
    originalDocumentId: documentId,
    date: new Date().toISOString().split('T')[0],
    description: `RECLASIFICADO A: ${newAccount.code} - ${newAccount.name}`,
    createdBy: userId,
    status: 'posted',
    createdAt: new Date().toISOString()
  }

  console.log('✅ Nuevo Asiento Reclasificado Creado:', newEntry)
  return newEntry
}

/**
 * Actualiza saldos para una reclasificación
 */
async function updateBalancesForReclassification(
  originalAccount: any,
  newAccount: any,
  amount: number
) {
  // En producción: Actualizar saldos en Prisma
  console.log('✅ Saldos Actualizados para Reclasificación:')
  console.log(`   - ${originalAccount.code}: -$${amount}`)
  console.log(`   + ${newAccount.code}: +$${amount}`)
  
  return {
    originalAccountNewBalance: 0, // Calcular desde DB
    newAccountNewBalance: 0 // Calcular desde DB
  }
}

/**
 * Actualiza todos los reportes después de una reclasificación
 */
async function updateAllReports(documentId: string) {
  // En producción: Re-calcular reportes
  const updates = {
    balanceSheet: { updated: true },
    incomeStatement: { updated: true },
    cashFlow: { updated: true },
    timestamp: new Date().toISOString()
  }

  console.log('✅ Todos los Reportes Actualizados:', updates)
  return updates
}

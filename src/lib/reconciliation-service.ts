import { prisma } from './prisma'
import { logAudit } from './audit'

/**
 * Motor de matching automático para reconciliación bancaria
 */

interface MatchCandidate {
  type: 'invoice' | 'expense' | 'payment'
  id: string
  amount: number
  date: Date
  description: string
  confidence: number
  amountDifference: number
  dateDifference: number
}

/**
 * Encuentra matches potenciales para una transacción bancaria
 */
export async function findMatchCandidates(
  transactionId: string,
  userId: string
): Promise<MatchCandidate[]> {
  const transaction = await (prisma as any).bankTransaction.findUnique({
    where: { id: transactionId },
    include: { bankAccount: true },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const candidates: MatchCandidate[] = []
  const txAmount = Math.abs(transaction.amount)
  const txDate = new Date(transaction.date)

  // Buscar facturas (invoices) para depósitos/créditos
  if (transaction.amount < 0 || transaction.credit > 0) {
    const invoices = await (prisma as any).invoice.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'PARTIAL'] },
        bankTransactionId: null, // No reconciliadas
      },
    })

    for (const invoice of invoices) {
      const amountDiff = Math.abs(invoice.total - txAmount)
      const dateDiff = Math.abs(
        (new Date(invoice.issueDate).getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Calcular confidence score
      let confidence = 1.0

      // Penalizar por diferencia de monto
      if (amountDiff > 0) {
        confidence -= Math.min(amountDiff / txAmount, 0.5)
      }

      // Penalizar por diferencia de fecha (más de 7 días)
      if (dateDiff > 7) {
        confidence -= Math.min((dateDiff - 7) / 30, 0.3)
      }

      // Match exacto de monto y fecha cercana = alta confianza
      if (amountDiff < 0.01 && dateDiff <= 3) {
        confidence = 0.95
      }

      // Solo incluir si confianza > 30%
      if (confidence > 0.3) {
        candidates.push({
          type: 'invoice',
          id: invoice.id,
          amount: invoice.total,
          date: new Date(invoice.issueDate),
          description: `Invoice #${invoice.invoiceNumber} - ${invoice.customerName}`,
          confidence,
          amountDifference: amountDiff,
          dateDifference: dateDiff,
        })
      }
    }
  }

  // Buscar gastos (expenses) para débitos/pagos
  if (transaction.amount > 0 || transaction.debit > 0) {
    const expenses = await (prisma as any).expense.findMany({
      where: {
        userId,
        bankTransactionId: null, // No reconciliadas
      },
    })

    for (const expense of expenses) {
      const amountDiff = Math.abs(expense.amount - txAmount)
      const dateDiff = Math.abs(
        (new Date(expense.date).getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      let confidence = 1.0

      if (amountDiff > 0) {
        confidence -= Math.min(amountDiff / txAmount, 0.5)
      }

      if (dateDiff > 7) {
        confidence -= Math.min((dateDiff - 7) / 30, 0.3)
      }

      if (amountDiff < 0.01 && dateDiff <= 3) {
        confidence = 0.95
      }

      if (confidence > 0.3) {
        candidates.push({
          type: 'expense',
          id: expense.id,
          amount: expense.amount,
          date: new Date(expense.date),
          description: expense.description,
          confidence,
          amountDifference: amountDiff,
          dateDifference: dateDiff,
        })
      }
    }
  }

  // Ordenar por confianza (mayor a menor)
  candidates.sort((a, b) => b.confidence - a.confidence)

  return candidates
}

/**
 * Aplica matching automático basado en reglas
 */
export async function autoMatchTransaction(
  transactionId: string,
  userId: string,
  minConfidence: number = 0.9
): Promise<{ matched: boolean; matchId?: string; confidence?: number }> {
  const candidates = await findMatchCandidates(transactionId, userId)

  if (candidates.length === 0) {
    return { matched: false }
  }

  const bestMatch = candidates[0]

  // Solo auto-match si confianza >= minConfidence (default 90%)
  if (bestMatch.confidence < minConfidence) {
    return { matched: false }
  }

  // Crear match
  const match = await (prisma as any).reconciliationMatch.create({
    data: {
      bankTransactionId: transactionId,
      matchType: bestMatch.confidence >= 0.95 ? 'EXACT' : 'AUTOMATIC',
      confidence: bestMatch.confidence,
      amountDifference: bestMatch.amountDifference,
      dateDifference: bestMatch.dateDifference,
      isConfirmed: true, // Auto-confirmado si confianza muy alta
      confirmedBy: userId,
      confirmedAt: new Date(),
    },
  })

  // Actualizar la transacción bancaria con el match
  if (bestMatch.type === 'invoice') {
    await (prisma as any).bankTransaction.update({
      where: { id: transactionId },
      data: {
        matchedInvoiceId: bestMatch.id,
        reconciled: true,
        reconciledAt: new Date(),
      },
    })

    await (prisma as any).invoice.update({
      where: { id: bestMatch.id },
      data: { status: 'PAID' },
    })
  } else if (bestMatch.type === 'expense') {
    await (prisma as any).bankTransaction.update({
      where: { id: transactionId },
      data: {
        matchedExpenseId: bestMatch.id,
        reconciled: true,
        reconciledAt: new Date(),
      },
    })
  }

  // Log de auditoría
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'RECONCILIATION_MATCH',
    entityId: match.id,
    changes: {
      transactionId,
      matchType: bestMatch.type,
      matchId: bestMatch.id,
      confidence: bestMatch.confidence,
    },
  })

  return {
    matched: true,
    matchId: match.id,
    confidence: bestMatch.confidence,
  }
}

/**
 * Confirma un match sugerido manualmente
 */
export async function confirmMatch(
  transactionId: string,
  matchType: 'invoice' | 'expense' | 'payment',
  matchId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transaction = await (prisma as any).bankTransaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return { success: false, error: 'Transaction not found' }
    }

    if (transaction.reconciled) {
      return { success: false, error: 'Transaction already reconciled' }
    }

    // Obtener información del match
    let matchEntity: any
    let amountDiff = 0
    let dateDiff = 0

    if (matchType === 'invoice') {
      matchEntity = await (prisma as any).invoice.findUnique({
        where: { id: matchId },
      })
      amountDiff = Math.abs(matchEntity.total - Math.abs(transaction.amount))
      dateDiff = Math.abs(
        (new Date(matchEntity.issueDate).getTime() - new Date(transaction.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    } else if (matchType === 'expense') {
      matchEntity = await (prisma as any).expense.findUnique({
        where: { id: matchId },
      })
      amountDiff = Math.abs(matchEntity.amount - Math.abs(transaction.amount))
      dateDiff = Math.abs(
        (new Date(matchEntity.date).getTime() - new Date(transaction.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    }

    if (!matchEntity) {
      return { success: false, error: 'Match entity not found' }
    }

    // Crear match
    const match = await (prisma as any).reconciliationMatch.create({
      data: {
        bankTransactionId: transactionId,
        matchType: 'MANUAL',
        confidence: 1.0, // Manual match = 100% confianza
        amountDifference: amountDiff,
        dateDifference: dateDiff,
        isConfirmed: true,
        confirmedBy: userId,
        confirmedAt: new Date(),
      },
    })

    // Actualizar transacción y entidad
    const updateData: any = {
      reconciled: true,
      reconciledAt: new Date(),
    }

    if (matchType === 'invoice') {
      updateData.matchedInvoiceId = matchId
      await (prisma as any).invoice.update({
        where: { id: matchId },
        data: { status: 'PAID' },
      })
    } else if (matchType === 'expense') {
      updateData.matchedExpenseId = matchId
    } else if (matchType === 'payment') {
      updateData.matchedPaymentId = matchId
    }

    await (prisma as any).bankTransaction.update({
      where: { id: transactionId },
      data: updateData,
    })

    // Log de auditoría
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'RECONCILIATION_MATCH',
      entityId: match.id,
      changes: {
        transactionId,
        matchType,
        matchId,
        manual: true,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error confirming match:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Desmarca una reconciliación
 */
export async function unmatchTransaction(
  transactionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transaction = await (prisma as any).bankTransaction.findUnique({
      where: { id: transactionId },
      include: {
        invoice: true,
        expense: true,
      },
    })

    if (!transaction) {
      return { success: false, error: 'Transaction not found' }
    }

    if (!transaction.reconciled) {
      return { success: false, error: 'Transaction not reconciled' }
    }

    // Revertir estado de invoice si existe
    if (transaction.matchedInvoiceId && transaction.invoice) {
      await (prisma as any).invoice.update({
        where: { id: transaction.matchedInvoiceId },
        data: { status: 'SENT' },
      })
    }

    // Actualizar transacción
    await (prisma as any).bankTransaction.update({
      where: { id: transactionId },
      data: {
        reconciled: false,
        reconciledAt: null,
        matchedInvoiceId: null,
        matchedExpenseId: null,
        matchedPaymentId: null,
      },
    })

    // Eliminar match
    await (prisma as any).reconciliationMatch.deleteMany({
      where: { bankTransactionId: transactionId },
    })

    // Log de auditoría
    await logAudit({
      userId,
      action: 'DELETE',
      entityType: 'RECONCILIATION_MATCH',
      entityId: transactionId,
      changes: { unmatched: true },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error unmatching transaction:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Auto-reconcilia todas las transacciones no reconciliadas de una cuenta
 */
export async function autoReconcileAccount(
  bankAccountId: string,
  userId: string,
  minConfidence: number = 0.9
): Promise<{ matched: number; total: number }> {
  const transactions = await (prisma as any).bankTransaction.findMany({
    where: {
      bankAccountId,
      reconciled: false,
    },
  })

  let matched = 0

  for (const transaction of transactions) {
    const result = await autoMatchTransaction(transaction.id, userId, minConfidence)
    if (result.matched) {
      matched++
    }
  }

  return {
    matched,
    total: transactions.length,
  }
}

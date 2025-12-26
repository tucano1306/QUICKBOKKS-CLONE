import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener datos de conciliación bancaria
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const bankAccountId = searchParams.get('bankAccountId')

    // Obtener cuentas bancarias
    const bankAccounts = await prisma.bankAccount.findMany({
      where: companyId ? { companyId } : {},
      include: {
        reconciliations: {
          orderBy: { endDate: 'desc' },
          take: 1
        },
        _count: {
          select: { bankTransactions: true }
        }
      },
      orderBy: { accountName: 'asc' }
    })

    // Formatear cuentas con información de conciliación
    const formattedAccounts = await Promise.all(bankAccounts.map(async (account) => {
      // Obtener transacciones sin conciliar
      const unreconciledTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId: account.id,
          reconciled: false
        },
        orderBy: { date: 'desc' }
      })

      // Calcular diferencia
      const lastReconciliation = account.reconciliations[0]
      const bookBalance = unreconciledTransactions.reduce((sum, t) => {
        return sum + (t.credit - t.debit)
      }, lastReconciliation?.closingBalance || account.balance)

      return {
        id: account.id,
        name: account.accountName,
        accountNumber: account.mask || account.accountNumber?.slice(-4) || '****',
        bankBalance: account.balance,
        bookBalance: bookBalance,
        difference: account.balance - bookBalance,
        lastReconciled: lastReconciliation?.endDate || account.lastReconciled,
        status: Math.abs(account.balance - bookBalance) < 0.01 ? 'reconciled' : 
               lastReconciliation ? 'pending' : 'unreconciled',
        unreconciledCount: unreconciledTransactions.length
      }
    }))

    // Si se especifica una cuenta, obtener transacciones detalladas
    let reconciliationItems: any[] = []
    if (bankAccountId) {
      const transactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId },
        orderBy: { date: 'desc' },
        take: 100
      })

      reconciliationItems = transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description || t.name,
        type: t.credit > 0 ? 'credit' : 'debit',
        amount: Math.abs(t.credit > 0 ? t.credit : t.debit),
        status: t.reconciled ? 'matched' : 'unmatched',
        bankStatement: true,
        bookRecord: t.matchedExpenseId || t.matchedInvoiceId ? true : false,
        reference: t.reference
      }))
    }

    // Obtener historial de conciliaciones
    const reconciliationHistory = await prisma.bankReconciliation.findMany({
      where: bankAccountId ? { bankAccountId } : {},
      include: {
        bankAccount: true
      },
      orderBy: { endDate: 'desc' },
      take: 10
    })

    return NextResponse.json({
      success: true,
      bankAccounts: formattedAccounts,
      reconciliationItems,
      reconciliationHistory: reconciliationHistory.map(r => ({
        id: r.id,
        accountName: r.bankAccount.accountName,
        period: `${r.startDate.toISOString().split('T')[0]} - ${r.endDate.toISOString().split('T')[0]}`,
        openingBalance: r.openingBalance,
        closingBalance: r.closingBalance,
        status: r.status,
        reconciledBy: r.reconciledBy,
        date: r.createdAt
      })),
      stats: {
        totalAccounts: formattedAccounts.length,
        reconciledAccounts: formattedAccounts.filter(a => a.status === 'reconciled').length,
        pendingAccounts: formattedAccounts.filter(a => a.status === 'pending').length,
        totalDifference: formattedAccounts.reduce((sum, a) => sum + Math.abs(a.difference), 0)
      }
    })

  } catch (error) {
    console.error('Error fetching reconciliation data:', error)
    return NextResponse.json({ 
      error: 'Error al obtener datos de conciliación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Ejecutar acciones de conciliación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, bankAccountId, transactionIds, closingBalance, startDate, endDate } = body

    switch (action) {
      case 'start':
        // Iniciar nueva conciliación
        const account = await prisma.bankAccount.findUnique({
          where: { id: bankAccountId },
          include: {
            reconciliations: {
              orderBy: { endDate: 'desc' },
              take: 1
            }
          }
        })

        if (!account) {
          return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
        }

        const openingBalance = account.reconciliations[0]?.closingBalance || account.balance

        const newReconciliation = await prisma.bankReconciliation.create({
          data: {
            bankAccountId,
            startDate: new Date(startDate || new Date()),
            endDate: new Date(endDate || new Date()),
            openingBalance,
            closingBalance: closingBalance || account.balance,
            status: 'IN_PROGRESS'
          }
        })

        return NextResponse.json({ 
          success: true, 
          reconciliation: newReconciliation 
        })

      case 'match':
        // Marcar transacciones como conciliadas
        await prisma.bankTransaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { 
            reconciled: true,
            reconciledAt: new Date(),
            reconciledBy: session.user?.id
          }
        })
        return NextResponse.json({ success: true })

      case 'unmatch':
        // Desmarcar transacciones
        await prisma.bankTransaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { 
            reconciled: false,
            reconciledAt: null,
            reconciledBy: null
          }
        })
        return NextResponse.json({ success: true })

      case 'complete':
        // Completar conciliación
        const { reconciliationId } = body
        
        await prisma.bankReconciliation.update({
          where: { id: reconciliationId },
          data: {
            status: 'COMPLETED',
            reconciledBy: session.user?.id,
            closingBalance
          }
        })

        // Actualizar última conciliación en cuenta
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { lastReconciled: new Date() }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Conciliación completada exitosamente' 
        })

      case 'auto-match':
        // Auto-matching de transacciones
        const matched = await autoMatchTransactions(bankAccountId)
        return NextResponse.json({ 
          success: true, 
          message: `${matched} transacciones emparejadas automáticamente`,
          matchedCount: matched
        })

      case 'add-adjustment':
        // Agregar ajuste de conciliación
        const { amount, description, type } = body
        
        await prisma.bankTransaction.create({
          data: {
            bankAccountId,
            date: new Date(),
            name: 'Adjustment: ' + description,
            description,
            amount: type === 'debit' ? -Math.abs(amount) : Math.abs(amount),
            debit: type === 'debit' ? Math.abs(amount) : 0,
            credit: type === 'credit' ? Math.abs(amount) : 0,
            reconciled: true,
            reconciledAt: new Date(),
            reconciledBy: session.user?.id
          }
        })

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing reconciliation:', error)
    return NextResponse.json({ 
      error: 'Error al procesar conciliación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Auto-matching de transacciones
async function autoMatchTransactions(bankAccountId: string): Promise<number> {
  // Obtener transacciones sin conciliar
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      reconciled: false
    }
  })

  // Obtener gastos sin vincular
  const expenses = await prisma.expense.findMany({
    where: {
      bankTransactions: { none: {} }
    }
  })

  // Obtener facturas pagadas sin vincular
  const invoices = await prisma.invoice.findMany({
    where: {
      status: 'PAID',
      bankTransactions: { none: {} }
    }
  })

  let matchedCount = 0

  for (const t of transactions) {
    // Intentar emparejar con gastos (por monto y fecha cercana)
    const matchingExpense = expenses.find(e => 
      Math.abs(Number(e.amount) - Math.abs(t.amount)) < 0.01 &&
      Math.abs(new Date(e.date).getTime() - new Date(t.date).getTime()) < 7 * 24 * 60 * 60 * 1000
    )

    if (matchingExpense && t.debit > 0) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          matchedExpenseId: matchingExpense.id,
          reconciled: true,
          reconciledAt: new Date()
        }
      })
      matchedCount++
      continue
    }

    // Intentar emparejar con facturas (por monto y fecha cercana)
    const matchingInvoice = invoices.find(i => 
      Math.abs(Number(i.total) - Math.abs(t.amount)) < 0.01 &&
      i.paidDate &&
      Math.abs(new Date(i.paidDate).getTime() - new Date(t.date).getTime()) < 7 * 24 * 60 * 60 * 1000
    )

    if (matchingInvoice && t.credit > 0) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          matchedInvoiceId: matchingInvoice.id,
          reconciled: true,
          reconciledAt: new Date()
        }
      })
      matchedCount++
    }
  }

  return matchedCount
}

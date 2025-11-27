import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/banking/reconciliation
 * Obtiene reconciliaciones y transacciones pendientes
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const bankAccountId = searchParams.get('bankAccountId')
    const status = searchParams.get('status') // 'pending' | 'completed' | 'all'

    // Get reconciliations
    const whereClause: any = {
      bankAccount: {
        userId: session.user.id
      }
    }

    if (bankAccountId) {
      whereClause.bankAccountId = bankAccountId
    }

    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase()
    }

    const reconciliations = await prisma.bankReconciliation.findMany({
      where: whereClause,
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
            balance: true
          }
        },
        matches: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get pending transactions for reconciliation
    let pendingTransactions: any[] = []
    if (bankAccountId) {
      pendingTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId,
          reconciled: false,
          bankAccount: {
            userId: session.user.id
          }
        },
        orderBy: { date: 'desc' }
      })
    }

    // Calculate summary
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            bankTransactions: {
              where: { reconciled: false }
            }
          }
        }
      }
    })

    const summary = {
      totalAccounts: accounts.length,
      totalPendingTransactions: accounts.reduce((sum, acc) => sum + acc._count.bankTransactions, 0),
      accounts: accounts.map(acc => ({
        id: acc.id,
        name: acc.accountName,
        bankName: acc.bankName,
        balance: acc.balance,
        pendingCount: acc._count.bankTransactions
      }))
    }

    return NextResponse.json({
      reconciliations,
      pendingTransactions,
      summary
    })

  } catch (error: any) {
    console.error('Error getting reconciliation data:', error)
    return NextResponse.json(
      { error: 'Failed to get reconciliation data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banking/reconciliation
 * Crea una nueva conciliación
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      bankAccountId,
      startDate,
      endDate,
      statementBalance, // Saldo del extracto bancario
      transactionIds = [], // IDs de transacciones a conciliar
      adjustments = [] // Ajustes manuales
    } = body

    if (!bankAccountId || !endDate || statementBalance === undefined) {
      return NextResponse.json(
        { error: 'Bank account, end date and statement balance are required' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        userId: session.user.id
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Get previous reconciliation for opening balance
    const lastReconciliation = await prisma.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        status: 'COMPLETED'
      },
      orderBy: { endDate: 'desc' }
    })

    const openingBalance = lastReconciliation?.closingBalance || 0

    // Calculate book balance from transactions
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        id: transactionIds.length > 0 ? { in: transactionIds } : undefined,
        reconciled: false
      }
    })

    const transactionTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
    const calculatedBalance = openingBalance + transactionTotal

    // Calculate difference
    const difference = statementBalance - calculatedBalance

    // Create reconciliation
    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        startDate: startDate ? new Date(startDate) : (lastReconciliation?.endDate || new Date()),
        endDate: new Date(endDate),
        openingBalance,
        closingBalance: statementBalance,
        status: difference === 0 ? 'COMPLETED' : 'IN_PROGRESS',
        notes: `Calculado: ${calculatedBalance.toFixed(2)}, Diferencia: ${difference.toFixed(2)}`
      }
    })

    // If transactions are provided, mark them as reconciled
    if (transactionIds.length > 0 && difference === 0) {
      await prisma.bankTransaction.updateMany({
        where: {
          id: { in: transactionIds },
          bankAccountId
        },
        data: {
          reconciled: true,
          reconciledAt: new Date()
        }
      })
    }

    // Create adjustment transactions if needed
    for (const adjustment of adjustments) {
      await prisma.bankTransaction.create({
        data: {
          bankAccountId,
          date: new Date(),
          name: adjustment.description || 'Ajuste de conciliación',
          description: `Ajuste por conciliación - ${reconciliation.id}`,
          amount: adjustment.amount,
          debit: adjustment.amount < 0 ? Math.abs(adjustment.amount) : 0,
          credit: adjustment.amount > 0 ? adjustment.amount : 0,
          balance: account.balance + adjustment.amount,
          reconciled: true,
          category: ['Ajuste', 'Conciliación'],
          transactionCode: 'ADJUSTMENT'
        }
      })

      // Update account balance
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: account.balance + adjustment.amount }
      })
    }

    return NextResponse.json({
      success: true,
      reconciliation,
      difference,
      transactionsReconciled: transactionIds.length,
      status: difference === 0 ? 'balanced' : 'has_difference'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to create reconciliation' },
      { status: 500 }
    )
  }
}

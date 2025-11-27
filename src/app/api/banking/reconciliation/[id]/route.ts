import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/banking/reconciliation/[id]
 * Actualiza o confirma una conciliación
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await req.json()
    const { action, transactionIds, statementBalance } = body

    // Find the reconciliation
    const reconciliation = await prisma.bankReconciliation.findFirst({
      where: {
        id,
        bankAccount: {
          userId: session.user.id
        }
      },
      include: {
        bankAccount: true
      }
    })

    if (!reconciliation) {
      return NextResponse.json(
        { error: 'Reconciliation not found' },
        { status: 404 }
      )
    }

    if (action === 'confirm') {
      // Confirm the reconciliation - calculate difference dynamically
      const reconciledTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId: reconciliation.bankAccountId,
          reconciled: true,
          date: {
            gte: reconciliation.startDate,
            lte: reconciliation.endDate
          }
        }
      })

      const clearedBalance = reconciliation.openingBalance + 
        reconciledTransactions.reduce((sum, t) => sum + t.amount, 0)
      const difference = reconciliation.closingBalance - clearedBalance

      if (difference !== 0) {
        return NextResponse.json(
          { error: 'Cannot confirm reconciliation with difference. Adjust first.' },
          { status: 400 }
        )
      }

      await prisma.bankReconciliation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          reconciledBy: session.user.id
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Reconciliation confirmed successfully'
      })

    } else if (action === 'reconcile_transactions') {
      // Mark specific transactions as reconciled
      if (!transactionIds || transactionIds.length === 0) {
        return NextResponse.json(
          { error: 'Transaction IDs required' },
          { status: 400 }
        )
      }

      await prisma.bankTransaction.updateMany({
        where: {
          id: { in: transactionIds },
          bankAccountId: reconciliation.bankAccountId
        },
        data: {
          reconciled: true,
          reconciledAt: new Date()
        }
      })

      // Recalculate difference
      const reconciledTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId: reconciliation.bankAccountId,
          reconciled: true,
          date: {
            gte: reconciliation.startDate,
            lte: reconciliation.endDate
          }
        }
      })

      const clearedBalance = reconciliation.openingBalance + 
        reconciledTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      const newDifference = reconciliation.closingBalance - clearedBalance

      await prisma.bankReconciliation.update({
        where: { id },
        data: {
          status: newDifference === 0 ? 'COMPLETED' : 'IN_PROGRESS',
          reconciledBy: newDifference === 0 ? session.user.id : null,
          notes: `Saldo conciliado: ${clearedBalance.toFixed(2)}, Diferencia: ${newDifference.toFixed(2)}`
        }
      })

      return NextResponse.json({
        success: true,
        clearedBalance,
        difference: newDifference,
        transactionsReconciled: transactionIds.length
      })

    } else if (action === 'update_statement_balance') {
      // Update statement balance and recalculate
      // Get reconciled transactions to calculate current cleared balance
      const reconciledTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId: reconciliation.bankAccountId,
          reconciled: true,
          date: {
            gte: reconciliation.startDate,
            lte: reconciliation.endDate
          }
        }
      })

      const clearedBalance = reconciliation.openingBalance + 
        reconciledTransactions.reduce((sum, t) => sum + t.amount, 0)
      const newDifference = statementBalance - clearedBalance

      await prisma.bankReconciliation.update({
        where: { id },
        data: {
          closingBalance: statementBalance,
          status: newDifference === 0 ? 'COMPLETED' : 'IN_PROGRESS'
        }
      })

      return NextResponse.json({
        success: true,
        difference: newDifference
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error updating reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to update reconciliation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/banking/reconciliation/[id]
 * Obtiene detalles de una conciliación
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const reconciliation = await prisma.bankReconciliation.findFirst({
      where: {
        id,
        bankAccount: {
          userId: session.user.id
        }
      },
      include: {
        bankAccount: true,
        matches: true
      }
    })

    if (!reconciliation) {
      return NextResponse.json(
        { error: 'Reconciliation not found' },
        { status: 404 }
      )
    }

    // Get transactions in the period
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId: reconciliation.bankAccountId,
        date: {
          gte: reconciliation.startDate,
          lte: reconciliation.endDate
        }
      },
      orderBy: { date: 'desc' }
    })

    const reconciledTransactions = transactions.filter(t => t.reconciled)
    const unreconciledTransactions = transactions.filter(t => !t.reconciled)

    return NextResponse.json({
      reconciliation,
      transactions: {
        all: transactions,
        reconciled: reconciledTransactions,
        unreconciled: unreconciledTransactions
      },
      summary: {
        totalTransactions: transactions.length,
        reconciledCount: reconciledTransactions.length,
        unreconciledCount: unreconciledTransactions.length,
        reconciledAmount: reconciledTransactions.reduce((sum, t) => sum + t.amount, 0),
        unreconciledAmount: unreconciledTransactions.reduce((sum, t) => sum + t.amount, 0)
      }
    })

  } catch (error: any) {
    console.error('Error getting reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to get reconciliation' },
      { status: 500 }
    )
  }
}

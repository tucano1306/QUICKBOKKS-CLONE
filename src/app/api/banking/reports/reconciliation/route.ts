import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/banking/reports/reconciliation
 * Genera reporte de conciliación
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
    const reconciliationId = searchParams.get('reconciliationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let report: any = {
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.email
    }

    if (reconciliationId) {
      // Report for specific reconciliation
      const reconciliation = await prisma.bankReconciliation.findFirst({
        where: {
          id: reconciliationId,
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

      const transactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId: reconciliation.bankAccountId,
          date: {
            gte: reconciliation.startDate,
            lte: reconciliation.endDate
          }
        },
        orderBy: { date: 'asc' }
      })

      const reconciledTx = transactions.filter(t => t.reconciled)
      const unreconciledTx = transactions.filter(t => !t.reconciled)

      // Calculate cleared balance dynamically
      const clearedBalance = reconciliation.openingBalance + 
        reconciledTx.reduce((sum, t) => sum + t.amount, 0)
      const difference = reconciliation.closingBalance - clearedBalance

      report = {
        ...report,
        type: 'single_reconciliation',
        account: {
          id: reconciliation.bankAccount.id,
          name: reconciliation.bankAccount.accountName,
          bankName: reconciliation.bankAccount.bankName
        },
        period: {
          start: reconciliation.startDate,
          end: reconciliation.endDate
        },
        balances: {
          opening: reconciliation.openingBalance,
          closing: reconciliation.closingBalance,
          cleared: clearedBalance,
          difference: difference
        },
        status: reconciliation.status,
        reconciledBy: reconciliation.reconciledBy,
        updatedAt: reconciliation.updatedAt,
        transactions: {
          total: transactions.length,
          reconciled: {
            count: reconciledTx.length,
            deposits: reconciledTx.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
            withdrawals: reconciledTx.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
          },
          unreconciled: {
            count: unreconciledTx.length,
            deposits: unreconciledTx.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
            withdrawals: unreconciledTx.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
            items: unreconciledTx
          }
        }
      }

    } else if (bankAccountId) {
      // Report for account
      const account = await prisma.bankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: session.user.id
        }
      })

      if (!account) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        )
      }

      const whereDate: any = {}
      if (startDate) whereDate.gte = new Date(startDate)
      if (endDate) whereDate.lte = new Date(endDate)

      const reconciliations = await prisma.bankReconciliation.findMany({
        where: {
          bankAccountId,
          ...(startDate || endDate ? { endDate: whereDate } : {})
        },
        orderBy: { endDate: 'desc' }
      })

      const transactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId,
          ...(startDate || endDate ? { date: whereDate } : {})
        },
        orderBy: { date: 'asc' }
      })

      const reconciledTx = transactions.filter(t => t.reconciled)
      const unreconciledTx = transactions.filter(t => !t.reconciled)

      report = {
        ...report,
        type: 'account_reconciliation_summary',
        account: {
          id: account.id,
          name: account.accountName,
          bankName: account.bankName,
          currentBalance: account.balance
        },
        period: {
          start: startDate || 'all time',
          end: endDate || 'present'
        },
        reconciliations: {
          total: reconciliations.length,
          completed: reconciliations.filter(r => r.status === 'COMPLETED').length,
          inProgress: reconciliations.filter(r => r.status === 'IN_PROGRESS').length,
          history: reconciliations.map(r => ({
            id: r.id,
            period: `${r.startDate.toISOString().split('T')[0]} - ${r.endDate.toISOString().split('T')[0]}`,
            status: r.status,
            closingBalance: r.closingBalance,
            updatedAt: r.updatedAt
          }))
        },
        transactions: {
          total: transactions.length,
          reconciledCount: reconciledTx.length,
          unreconciledCount: unreconciledTx.length,
          reconciledPercentage: transactions.length > 0 
            ? ((reconciledTx.length / transactions.length) * 100).toFixed(1) 
            : '0'
        },
        summary: {
          totalDeposits: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
          totalWithdrawals: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
          netChange: transactions.reduce((sum, t) => sum + t.amount, 0)
        }
      }

    } else {
      // Summary report for all accounts
      const accounts = await prisma.bankAccount.findMany({
        where: { userId: session.user.id },
        include: {
          reconciliations: {
            where: { status: 'COMPLETED' },
            orderBy: { endDate: 'desc' },
            take: 1
          },
          _count: {
            select: {
              bankTransactions: true
            }
          }
        }
      })

      const unreconciledCounts = await Promise.all(
        accounts.map(async (acc) => {
          const count = await prisma.bankTransaction.count({
            where: {
              bankAccountId: acc.id,
              reconciled: false
            }
          })
          return { accountId: acc.id, count }
        })
      )

      report = {
        ...report,
        type: 'all_accounts_summary',
        accounts: accounts.map(acc => {
          const unrec = unreconciledCounts.find(u => u.accountId === acc.id)
          const lastRec = acc.reconciliations[0]
          
          return {
            id: acc.id,
            name: acc.accountName,
            bankName: acc.bankName,
            balance: acc.balance,
            totalTransactions: acc._count.bankTransactions,
            unreconciledTransactions: unrec?.count || 0,
            lastReconciliation: lastRec ? {
              date: lastRec.endDate,
              balance: lastRec.closingBalance
            } : null,
            status: unrec?.count === 0 ? 'fully_reconciled' : 'pending_reconciliation'
          }
        }),
        totals: {
          totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
          accountsCount: accounts.length,
          fullyReconciled: accounts.filter((acc, i) => 
            unreconciledCounts.find(u => u.accountId === acc.id)?.count === 0
          ).length
        }
      }
    }

    return NextResponse.json(report)

  } catch (error: any) {
    console.error('Error generating reconciliation report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

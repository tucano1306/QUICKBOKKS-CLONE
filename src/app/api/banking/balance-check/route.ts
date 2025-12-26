import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/banking/balance-check
 * Compara saldo contable vs bancario
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

    if (!bankAccountId) {
      // Return summary for all accounts
      const accounts = await prisma.bankAccount.findMany({
        where: { userId: session.user.id },
        include: {
          bankTransactions: {
            orderBy: { date: 'desc' },
            take: 1
          },
          reconciliations: {
            where: { status: 'COMPLETED' },
            orderBy: { endDate: 'desc' },
            take: 1
          }
        }
      })

      const summary = accounts.map(account => {
        const lastReconciliation = account.reconciliations[0]
        const bookBalance = account.balance
        const lastReconciledBalance = lastReconciliation?.closingBalance || 0
        
        return {
          accountId: account.id,
          accountName: account.accountName,
          bankName: account.bankName,
          bookBalance,
          lastReconciledBalance,
          lastReconciliationDate: lastReconciliation?.endDate || null,
          potentialDifference: bookBalance - lastReconciledBalance,
          status: bookBalance === lastReconciledBalance ? 'balanced' : 'check_required'
        }
      })

      return NextResponse.json({ accounts: summary })
    }

    // Detailed check for specific account
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

    // Get all transactions
    const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId },
      orderBy: { date: 'asc' }
    })

    // Calculate running balance
    let runningBalance = 0
    const balanceHistory = transactions.map(t => {
      runningBalance += t.amount
      return {
        id: t.id,
        date: t.date,
        description: t.name,
        amount: t.amount,
        runningBalance,
        recordedBalance: t.balance,
        discrepancy: runningBalance !== t.balance ? runningBalance - t.balance : 0
      }
    })

    // Find discrepancies
    const discrepancies = balanceHistory.filter(b => b.discrepancy !== 0)

    // Get last reconciliation
    const lastReconciliation = await prisma.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        status: 'COMPLETED'
      },
      orderBy: { endDate: 'desc' }
    })

    // Unreconciled transactions
    const unreconciledTransactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        reconciled: false
      },
      orderBy: { date: 'desc' }
    })

    const unreconciledTotal = unreconciledTransactions.reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.accountName,
        bankName: account.bankName,
        currentBalance: account.balance
      },
      calculatedBalance: runningBalance,
      difference: account.balance - runningBalance,
      lastReconciliation: lastReconciliation ? {
        date: lastReconciliation.endDate,
        balance: lastReconciliation.closingBalance
      } : null,
      unreconciled: {
        count: unreconciledTransactions.length,
        total: unreconciledTotal,
        transactions: unreconciledTransactions
      },
      discrepancies: {
        count: discrepancies.length,
        items: discrepancies.slice(0, 20) // Limit to 20 most recent
      },
      status: discrepancies.length === 0 && account.balance === runningBalance 
        ? 'balanced' 
        : 'discrepancies_found'
    })

  } catch (error: any) {
    console.error('Error checking balance:', error)
    return NextResponse.json(
      { error: 'Failed to check balance' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banking/balance-check
 * Crear ajuste para cuadrar saldos
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
      targetBalance,
      reason,
      adjustmentDate
    } = body

    if (!bankAccountId || targetBalance === undefined) {
      return NextResponse.json(
        { error: 'Bank account and target balance are required' },
        { status: 400 }
      )
    }

    // Verify account
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

    const adjustmentAmount = targetBalance - account.balance

    if (adjustmentAmount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Balance already matches target',
        adjustment: 0
      })
    }

    // Create adjustment transaction
    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.bankTransaction.create({
        data: {
          bankAccountId,
          date: adjustmentDate ? new Date(adjustmentDate) : new Date(),
          name: 'Ajuste de Balance',
          description: reason || `Ajuste para cuadrar saldo: ${account.balance} → ${targetBalance}`,
          amount: adjustmentAmount,
          debit: adjustmentAmount < 0 ? Math.abs(adjustmentAmount) : 0,
          credit: adjustmentAmount > 0 ? adjustmentAmount : 0,
          balance: targetBalance,
          reconciled: true,
          reconciledAt: new Date(),
          category: ['Ajuste', 'Cuadre de Saldo'],
          transactionCode: 'ADJUSTMENT',
          notes: `Ajuste automático - Diferencia: ${adjustmentAmount.toFixed(2)}`
        }
      })

      // Update account balance
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: targetBalance }
      })

      return adjustment
    })

    return NextResponse.json({
      success: true,
      message: 'Balance adjusted successfully',
      adjustment: {
        id: result.id,
        amount: adjustmentAmount,
        previousBalance: account.balance,
        newBalance: targetBalance
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error adjusting balance:', error)
    return NextResponse.json(
      { error: 'Failed to adjust balance' },
      { status: 500 }
    )
  }
}

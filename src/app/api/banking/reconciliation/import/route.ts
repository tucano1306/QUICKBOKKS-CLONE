import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/banking/reconciliation/import
 * Importa extracto bancario para conciliación
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
      transactions, // Array of transactions from statement
      statementStartDate,
      statementEndDate,
      statementOpeningBalance,
      statementClosingBalance
    } = body

    if (!bankAccountId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Bank account and transactions array are required' },
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

    // Get existing transactions in the period for matching
    const existingTransactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        date: {
          gte: new Date(statementStartDate),
          lte: new Date(statementEndDate)
        }
      }
    })

    // Match imported transactions with existing ones
    const matchResults = {
      matched: [] as any[],
      unmatched: [] as any[],
      newTransactions: [] as any[]
    }

    for (const importedTx of transactions) {
      // Try to find a match
      const match = existingTransactions.find(existingTx => {
        const dateMatch = new Date(importedTx.date).toDateString() === 
                         new Date(existingTx.date).toDateString()
        const amountMatch = Math.abs(importedTx.amount - existingTx.amount) < 0.01
        const descMatch = importedTx.description?.toLowerCase().includes(
          existingTx.name?.toLowerCase().substring(0, 10) || ''
        )
        
        return dateMatch && amountMatch
      })

      if (match) {
        matchResults.matched.push({
          imported: importedTx,
          existing: match,
          confidence: 'high'
        })
      } else {
        matchResults.unmatched.push(importedTx)
      }
    }

    // Find existing transactions not in import (potential discrepancies)
    const importedDates = transactions.map((t: any) => new Date(t.date).toDateString())
    const unmatchedExisting = existingTransactions.filter(t => {
      const matched = matchResults.matched.some(m => m.existing.id === t.id)
      return !matched
    })

    // Create new transactions for unmatched imports
    for (const tx of matchResults.unmatched) {
      const newTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId,
          date: new Date(tx.date),
          name: tx.description || 'Imported transaction',
          description: tx.reference || '',
          amount: tx.amount,
          debit: tx.amount < 0 ? Math.abs(tx.amount) : 0,
          credit: tx.amount > 0 ? tx.amount : 0,
          balance: 0, // Will be recalculated
          reconciled: false,
          pending: false,
          category: ['Importado'],
          transactionCode: tx.amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
          notes: 'Importado desde extracto bancario'
        }
      })
      matchResults.newTransactions.push(newTx)
    }

    // Create a reconciliation record
    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        startDate: new Date(statementStartDate),
        endDate: new Date(statementEndDate),
        openingBalance: statementOpeningBalance || 0,
        closingBalance: statementClosingBalance || 0,
        status: 'IN_PROGRESS',
        notes: `Diferencia: ${((statementClosingBalance || 0) - account.balance).toFixed(2)}`
      }
    })

    return NextResponse.json({
      success: true,
      reconciliationId: reconciliation.id,
      results: {
        imported: transactions.length,
        matched: matchResults.matched.length,
        unmatched: matchResults.unmatched.length,
        newTransactionsCreated: matchResults.newTransactions.length,
        existingUnmatched: unmatchedExisting.length
      },
      matches: matchResults.matched,
      discrepancies: {
        unmatchedImported: matchResults.unmatched,
        unmatchedExisting
      },
      difference: (statementClosingBalance || 0) - account.balance
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error importing statement:', error)
    return NextResponse.json(
      { error: 'Failed to import statement' },
      { status: 500 }
    )
  }
}

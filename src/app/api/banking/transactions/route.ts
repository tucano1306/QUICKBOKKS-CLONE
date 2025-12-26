import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBankTransactions } from '@/lib/bank-service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/banking/transactions
 * Obtiene transacciones bancarias con filtros
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const reconciled = searchParams.get('reconciled')

    // If bankAccountId is provided, try bank-service first
    if (bankAccountId) {
      try {
        const result = await getBankTransactions(bankAccountId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
          reconciled: reconciled === 'true' ? true : reconciled === 'false' ? false : undefined,
        })

        if (result.success) {
          return NextResponse.json({
            transactions: result.transactions,
            total: result.total,
          })
        }
      } catch {
        // Fallback to direct prisma query
      }
    }

    // Direct prisma query - get all transactions for user's accounts
    const whereClause: any = {
      bankAccount: {
        userId: session.user.id
      }
    }

    if (bankAccountId) {
      whereClause.bankAccountId = bankAccountId
    }

    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate) }
    }

    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: new Date(endDate) }
    }

    if (reconciled === 'true' || reconciled === 'false') {
      whereClause.reconciled = reconciled === 'true'
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: whereClause,
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0
    })

    const total = await prisma.bankTransaction.count({ where: whereClause })

    return NextResponse.json({
      transactions,
      total,
    })
  } catch (error: any) {
    console.error('Error getting transactions:', error)
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banking/transactions
 * Crea una nueva transacción bancaria manual
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
      date,
      name,
      description,
      amount,
      type = 'expense', // 'income' or 'expense'
      category,
      merchantName,
      reference,
      notes
    } = body

    if (!bankAccountId || !name || amount === undefined) {
      return NextResponse.json(
        { error: 'Bank account ID, name, and amount are required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
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

    // Calculate debit/credit and actual amount
    const absAmount = Math.abs(amount)
    const isIncome = type === 'income'
    const actualAmount = isIncome ? absAmount : -absAmount
    const debit = isIncome ? 0 : absAmount
    const credit = isIncome ? absAmount : 0

    // Create the transaction
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: date ? new Date(date) : new Date(),
        name,
        description: description || '',
        amount: actualAmount,
        debit,
        credit,
        balance: account.balance + actualAmount,
        reconciled: false,
        pending: false,
        category: category ? [category] : [],
        merchantName: merchantName || null,
        reference: reference || null,
        notes: notes || null
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true
          }
        }
      }
    })

    // Update account balance
    const newBalance = account.balance + actualAmount
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: newBalance }
    })

    return NextResponse.json({
      success: true,
      transaction,
      newBalance
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

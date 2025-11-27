import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/banking/transfers
 * Obtiene historial de transferencias
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') // 'internal' | 'external' | 'all'
    const status = searchParams.get('status') // 'pending' | 'completed' | 'cancelled'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get transfers - transactions categorized as transfers
    const whereClause: any = {
      bankAccount: {
        userId: session.user.id
      },
      OR: [
        { category: { has: 'Transferencia' } },
        { category: { has: 'Transfer' } },
        { category: { has: 'TRANSFER' } }
      ]
    }

    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate) }
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: new Date(endDate) }
    }

    const transfers = await prisma.bankTransaction.findMany({
      where: whereClause,
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
            accountNumber: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit
    })

    // Group transfers by reference/date to show paired transfers
    const groupedTransfers = transfers.reduce((acc: any[], transfer) => {
      // Check if this is part of an existing pair
      const existingPair = acc.find(t => 
        t.date === transfer.date.toISOString() && 
        Math.abs(t.amount) === Math.abs(transfer.amount) &&
        t.id !== transfer.id
      )

      if (existingPair) {
        existingPair.pairedWith = transfer
      } else {
        acc.push({
          ...transfer,
          date: transfer.date.toISOString(),
          isInternal: transfer.name?.includes('Transferencia a') || transfer.name?.includes('Transferencia desde'),
          isExternal: transfer.name?.includes('externo') || transfer.name?.includes('otro banco')
        })
      }

      return acc
    }, [])

    return NextResponse.json({
      transfers: groupedTransfers,
      total: transfers.length
    })

  } catch (error: any) {
    console.error('Error getting transfers:', error)
    return NextResponse.json(
      { error: 'Failed to get transfers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banking/transfers
 * Crea una nueva transferencia
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
      fromAccountId,
      toAccountId,
      amount,
      description,
      date,
      type = 'internal', // 'internal' | 'external'
      externalBankName,
      externalAccountNumber,
      externalAccountHolder,
      reference
    } = body

    if (!fromAccountId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'From account and valid amount are required' },
        { status: 400 }
      )
    }

    // Verify source account belongs to user
    const fromAccount = await prisma.bankAccount.findFirst({
      where: {
        id: fromAccountId,
        userId: session.user.id
      }
    })

    if (!fromAccount) {
      return NextResponse.json(
        { error: 'Source account not found' },
        { status: 404 }
      )
    }

    // Check sufficient balance
    if (fromAccount.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance in source account' },
        { status: 400 }
      )
    }

    const transferDate = date ? new Date(date) : new Date()
    const transferRef = reference || `TRF-${Date.now()}`

    if (type === 'internal') {
      // Internal transfer - between user's own accounts
      if (!toAccountId) {
        return NextResponse.json(
          { error: 'Destination account required for internal transfer' },
          { status: 400 }
        )
      }

      if (fromAccountId === toAccountId) {
        return NextResponse.json(
          { error: 'Source and destination accounts must be different' },
          { status: 400 }
        )
      }

      // Verify destination account belongs to user
      const toAccount = await prisma.bankAccount.findFirst({
        where: {
          id: toAccountId,
          userId: session.user.id
        }
      })

      if (!toAccount) {
        return NextResponse.json(
          { error: 'Destination account not found' },
          { status: 404 }
        )
      }

      // Create both transactions in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Debit from source account
        const debitTransaction = await tx.bankTransaction.create({
          data: {
            bankAccountId: fromAccountId,
            date: transferDate,
            name: `Transferencia a ${toAccount.accountName}`,
            description: description || 'Transferencia entre cuentas',
            amount: -amount,
            debit: amount,
            credit: 0,
            balance: fromAccount.balance - amount,
            reconciled: false,
            pending: false,
            category: ['Transferencia'],
            transactionCode: 'TRANSFER',
            notes: `Ref: ${transferRef}`
          }
        })

        // Credit to destination account
        const creditTransaction = await tx.bankTransaction.create({
          data: {
            bankAccountId: toAccountId,
            date: transferDate,
            name: `Transferencia desde ${fromAccount.accountName}`,
            description: description || 'Transferencia entre cuentas',
            amount: amount,
            debit: 0,
            credit: amount,
            balance: toAccount.balance + amount,
            reconciled: false,
            pending: false,
            category: ['Transferencia'],
            transactionCode: 'TRANSFER',
            notes: `Ref: ${transferRef}`
          }
        })

        // Update account balances
        await tx.bankAccount.update({
          where: { id: fromAccountId },
          data: { balance: fromAccount.balance - amount }
        })

        await tx.bankAccount.update({
          where: { id: toAccountId },
          data: { balance: toAccount.balance + amount }
        })

        return {
          debitTransaction,
          creditTransaction,
          fromAccountNewBalance: fromAccount.balance - amount,
          toAccountNewBalance: toAccount.balance + amount
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Internal transfer completed successfully',
        transfer: result,
        reference: transferRef
      }, { status: 201 })

    } else {
      // External transfer - to another bank
      if (!externalBankName || !externalAccountNumber) {
        return NextResponse.json(
          { error: 'External bank details are required' },
          { status: 400 }
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        // Debit from source account
        const transaction = await tx.bankTransaction.create({
          data: {
            bankAccountId: fromAccountId,
            date: transferDate,
            name: `Transferencia externa a ${externalBankName}`,
            description: `${description || 'Transferencia externa'} - Cuenta: ${externalAccountNumber}${externalAccountHolder ? ` - Beneficiario: ${externalAccountHolder}` : ''}`,
            amount: -amount,
            debit: amount,
            credit: 0,
            balance: fromAccount.balance - amount,
            reconciled: false,
            pending: true, // External transfers start as pending
            category: ['Transferencia', 'Externa'],
            transactionCode: 'TRANSFER',
            merchantName: externalBankName,
            notes: `Banco: ${externalBankName}, Cuenta: ${externalAccountNumber}, Ref: ${transferRef}`
          }
        })

        // Update source account balance
        await tx.bankAccount.update({
          where: { id: fromAccountId },
          data: { balance: fromAccount.balance - amount }
        })

        return {
          transaction,
          newBalance: fromAccount.balance - amount
        }
      })

      return NextResponse.json({
        success: true,
        message: 'External transfer initiated successfully',
        transfer: result,
        reference: transferRef,
        status: 'pending'
      }, { status: 201 })
    }

  } catch (error: any) {
    console.error('Error creating transfer:', error)
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    )
  }
}

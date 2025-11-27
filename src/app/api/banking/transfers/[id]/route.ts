import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/banking/transfers/[id]/confirm
 * Confirma una transferencia pendiente
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
    const { action } = body // 'confirm' | 'cancel'

    // Find the transaction
    const transaction = await prisma.bankTransaction.findFirst({
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

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (!transaction.pending) {
      return NextResponse.json(
        { error: 'Transaction is not pending' },
        { status: 400 }
      )
    }

    if (action === 'confirm') {
      // Confirm the transfer
      await prisma.bankTransaction.update({
        where: { id },
        data: {
          pending: false,
          reconciled: true,
          notes: `${transaction.notes} | Confirmado: ${new Date().toISOString()}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Transfer confirmed successfully'
      })

    } else if (action === 'cancel') {
      // Cancel the transfer - reverse the balance change
      await prisma.$transaction(async (tx) => {
        // Restore the balance
        await tx.bankAccount.update({
          where: { id: transaction.bankAccountId },
          data: {
            balance: transaction.bankAccount.balance + Math.abs(transaction.amount)
          }
        })

        // Mark transaction as cancelled
        await tx.bankTransaction.update({
          where: { id },
          data: {
            pending: false,
            category: [...(transaction.category || []), 'Cancelada'],
            notes: `${transaction.notes} | Cancelado: ${new Date().toISOString()}`
          }
        })
      })

      return NextResponse.json({
        success: true,
        message: 'Transfer cancelled and balance restored'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error updating transfer:', error)
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBankTransactions } from '@/lib/bank-service'

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

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'Bank account ID is required' },
        { status: 400 }
      )
    }

    const result = await getBankTransactions(bankAccountId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      reconciled: reconciled === 'true' ? true : reconciled === 'false' ? false : undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      transactions: result.transactions,
      total: result.total,
    })
  } catch (error: any) {
    console.error('Error getting transactions:', error)
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}

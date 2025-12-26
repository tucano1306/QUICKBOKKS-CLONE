import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unmatchTransaction } from '@/lib/reconciliation-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/banking/reconcile/unmatch
 * Desmarca una reconciliación
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
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const result = await unmatchTransaction(transactionId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction unmatched successfully',
    })
  } catch (error: any) {
    console.error('Error unmatching transaction:', error)
    return NextResponse.json(
      { error: 'Failed to unmatch transaction' },
      { status: 500 }
    )
  }
}

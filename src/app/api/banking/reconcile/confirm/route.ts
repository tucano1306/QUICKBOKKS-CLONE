import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { confirmMatch } from '@/lib/reconciliation-service'

/**
 * POST /api/banking/reconcile/confirm
 * Confirma un match manualmente
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
    const { transactionId, matchType, matchId } = body

    if (!transactionId || !matchType || !matchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await confirmMatch(
      transactionId,
      matchType,
      matchId,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Match confirmed successfully',
    })
  } catch (error: any) {
    console.error('Error confirming match:', error)
    return NextResponse.json(
      { error: 'Failed to confirm match' },
      { status: 500 }
    )
  }
}

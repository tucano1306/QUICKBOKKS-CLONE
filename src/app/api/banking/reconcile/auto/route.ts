import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { autoReconcileAccount } from '@/lib/reconciliation-service'

/**
 * POST /api/banking/reconcile/auto
 * Auto-reconcilia todas las transacciones de una cuenta
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
    const { bankAccountId, minConfidence = 0.9 } = body

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'Bank account ID is required' },
        { status: 400 }
      )
    }

    const result = await autoReconcileAccount(
      bankAccountId,
      session.user.id,
      minConfidence
    )

    return NextResponse.json({
      success: true,
      matched: result.matched,
      total: result.total,
      message: `Auto-reconciled ${result.matched} of ${result.total} transactions`,
    })
  } catch (error: any) {
    console.error('Error auto-reconciling:', error)
    return NextResponse.json(
      { error: 'Failed to auto-reconcile' },
      { status: 500 }
    )
  }
}

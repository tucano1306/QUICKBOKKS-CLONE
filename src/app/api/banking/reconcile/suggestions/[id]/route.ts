import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findMatchCandidates } from '@/lib/reconciliation-service'

/**
 * GET /api/banking/reconcile/suggestions/[id]
 * Obtiene sugerencias de matching para una transacción
 */
export async function GET(
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

    const candidates = await findMatchCandidates(params.id, session.user.id)

    return NextResponse.json({
      transactionId: params.id,
      suggestions: candidates,
    })
  } catch (error: any) {
    console.error('Error getting match suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}

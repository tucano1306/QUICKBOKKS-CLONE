import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncBankTransactions } from '@/lib/bank-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/banking/sync
 * Sincroniza transacciones de una cuenta bancaria
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
    const { bankAccountId } = body

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'Bank account ID is required' },
        { status: 400 }
      )
    }

    const result = await syncBankTransactions(bankAccountId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      added: result.added,
      modified: result.modified,
      removed: result.removed,
      hasMore: result.hasMore,
      message: `Synced ${result.added} new transactions`,
    })
  } catch (error: any) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { completeBankConnection } from '@/lib/bank-service'

/**
 * POST /api/banking/connect
 * Completa la conexión bancaria después de Plaid Link
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
    const { publicToken, metadata } = body

    if (!publicToken || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await completeBankConnection(
      session.user.id,
      publicToken,
      metadata
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      accounts: result.accounts,
      message: `Successfully connected ${result.accounts?.length || 0} account(s)`,
    })
  } catch (error: any) {
    console.error('Error connecting bank account:', error)
    return NextResponse.json(
      { error: 'Failed to connect bank account' },
      { status: 500 }
    )
  }
}

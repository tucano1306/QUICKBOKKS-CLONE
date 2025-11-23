import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateBankConnection } from '@/lib/bank-service'

/**
 * POST /api/banking/link/token
 * Genera un link token para iniciar Plaid Link
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

    const userId = session.user.id
    const userName = session.user.name || session.user.email || 'User'

    const result = await initiateBankConnection(userId, userName)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      linkToken: result.linkToken,
      expiration: result.expiration,
    })
  } catch (error: any) {
    console.error('Error creating link token:', error)
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    )
  }
}

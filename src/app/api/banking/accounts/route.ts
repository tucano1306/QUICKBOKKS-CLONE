import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserBankAccounts, updateBankAccountBalance } from '@/lib/bank-service'

/**
 * GET /api/banking/accounts
 * Obtiene todas las cuentas bancarias del usuario
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

    const result = await getUserBankAccounts(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      accounts: result.accounts,
    })
  } catch (error: any) {
    console.error('Error getting bank accounts:', error)
    return NextResponse.json(
      { error: 'Failed to get bank accounts' },
      { status: 500 }
    )
  }
}

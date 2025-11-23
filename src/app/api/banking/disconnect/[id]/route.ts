import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disconnectBankAccount } from '@/lib/bank-service'

/**
 * DELETE /api/banking/disconnect/[id]
 * Desconecta una cuenta bancaria
 */
export async function DELETE(
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

    const result = await disconnectBankAccount(params.id, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account disconnected successfully',
    })
  } catch (error: any) {
    console.error('Error disconnecting bank account:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect bank account' },
      { status: 500 }
    )
  }
}

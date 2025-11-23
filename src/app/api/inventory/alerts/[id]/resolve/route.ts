import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveAlert } from '@/lib/stock-alert-service'

/**
 * POST /api/inventory/alerts/[id]/resolve
 * Marca una alerta como resuelta
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await resolveAlert(params.id, session.user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
    })
  } catch (error: any) {
    console.error('Error resolving alert:', error)
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 })
  }
}

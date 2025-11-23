import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveAlerts, resolveAlert } from '@/lib/stock-alert-service'

/**
 * GET /api/inventory/alerts
 * Obtiene alertas activas de stock
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const alertType = searchParams.get('alertType') || undefined

    const result = await getActiveAlerts(session.user.id, { alertType })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ alerts: result.alerts })
  } catch (error: any) {
    console.error('Error getting alerts:', error)
    return NextResponse.json({ error: 'Failed to get alerts' }, { status: 500 })
  }
}

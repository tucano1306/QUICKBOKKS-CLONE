import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { adjustInventory } from '@/lib/inventory-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inventory/movements/adjust
 * Ajusta inventario manualmente
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await adjustInventory(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      movement: result.movement,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error adjusting inventory:', error)
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 })
  }
}

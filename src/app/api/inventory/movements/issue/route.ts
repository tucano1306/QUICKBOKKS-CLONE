import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { issueInventory } from '@/lib/inventory-service'

/**
 * POST /api/inventory/movements/issue
 * Registra salida de inventario (venta/uso)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await issueInventory(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      movement: result.movement,
      cost: result.cost,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error issuing inventory:', error)
    return NextResponse.json({ error: 'Failed to issue inventory' }, { status: 500 })
  }
}

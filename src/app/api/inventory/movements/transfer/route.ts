import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transferInventory } from '@/lib/inventory-service'

/**
 * POST /api/inventory/movements/transfer
 * Transfiere inventario entre almacenes
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await transferInventory(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer completed successfully',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error transferring inventory:', error)
    return NextResponse.json({ error: 'Failed to transfer inventory' }, { status: 500 })
  }
}

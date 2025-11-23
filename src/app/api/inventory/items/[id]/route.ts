import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateInventoryItem } from '@/lib/inventory-service'

/**
 * PUT /api/inventory/items/[id]
 * Actualiza un item de inventario
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await updateInventoryItem(params.id, session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      item: result.item,
    })
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

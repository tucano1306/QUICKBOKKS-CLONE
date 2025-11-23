import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateWarehouse } from '@/lib/warehouse-service'

/**
 * PUT /api/inventory/warehouses/[id]
 * Actualiza un almacén
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

    const result = await updateWarehouse(params.id, session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      warehouse: result.warehouse,
    })
  } catch (error: any) {
    console.error('Error updating warehouse:', error)
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 })
  }
}

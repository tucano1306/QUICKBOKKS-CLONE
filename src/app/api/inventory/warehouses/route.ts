import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createWarehouse, getWarehouses, updateWarehouse } from '@/lib/warehouse-service'

/**
 * GET /api/inventory/warehouses
 * Lista todos los almacenes del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getWarehouses(session.user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ warehouses: result.warehouses })
  } catch (error: any) {
    console.error('Error getting warehouses:', error)
    return NextResponse.json({ error: 'Failed to get warehouses' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/warehouses
 * Crea un nuevo almacén
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await createWarehouse(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      warehouse: result.warehouse,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating warehouse:', error)
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 })
  }
}

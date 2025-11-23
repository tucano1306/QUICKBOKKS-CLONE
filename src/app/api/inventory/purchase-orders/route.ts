import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPurchaseOrder, getPurchaseOrders } from '@/lib/warehouse-service'

/**
 * GET /api/inventory/purchase-orders
 * Lista órdenes de compra
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const result = await getPurchaseOrders(session.user.id, { status })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ orders: result.orders })
  } catch (error: any) {
    console.error('Error getting purchase orders:', error)
    return NextResponse.json({ error: 'Failed to get purchase orders' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/purchase-orders
 * Crea una nueva orden de compra
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await createPurchaseOrder(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      purchaseOrder: result.purchaseOrder,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPurchaseOrder, getPurchaseOrders } from '@/lib/warehouse-service'
import { validatePurchaseOrderRequest } from '@/lib/validation-middleware'

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
    const vendorId = searchParams.get('vendorId') || undefined
    const companyId = searchParams.get('companyId') || undefined
    const search = searchParams.get('q') || searchParams.get('search') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(String(searchParams.get('startDate')))
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(String(searchParams.get('endDate')))
      : undefined
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 200, 500) : 200

    const result = await getPurchaseOrders(session.user.id, {
      status,
      vendorId,
      companyId,
      search,
      startDate,
      endDate,
      limit,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ orders: result.orders, metrics: result.metrics })
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

    const { data: body, error } = await validatePurchaseOrderRequest(req)
    if (error) return error

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

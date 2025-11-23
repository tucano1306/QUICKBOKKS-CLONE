import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { receivePurchaseOrder, updatePurchaseOrderStatus } from '@/lib/warehouse-service'

/**
 * POST /api/inventory/purchase-orders/[id]/receive
 * Recibe mercancía de una orden de compra
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

    const body = await req.json()

    const result = await receivePurchaseOrder(params.id, session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    })
  } catch (error: any) {
    console.error('Error receiving purchase order:', error)
    return NextResponse.json({ error: 'Failed to receive purchase order' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePurchaseOrderStatus } from '@/lib/warehouse-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const status = body?.status || body?.nextStatus

    if (!status) {
      return NextResponse.json({ error: 'El estado es requerido' }, { status: 400 })
    }

    const result = await updatePurchaseOrderStatus(
      params.id,
      session.user.id,
      status
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, status: result.purchaseOrder?.status })
  } catch (error: any) {
    console.error('Error updating purchase order status:', error)
    return NextResponse.json({ error: 'Failed to update purchase order status' }, { status: 500 })
  }
}

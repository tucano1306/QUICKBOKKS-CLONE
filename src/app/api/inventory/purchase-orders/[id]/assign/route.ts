import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePurchaseOrder } from '@/lib/warehouse-service'

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
    const assignedTo = body?.assignedTo || body?.userId

    if (!assignedTo) {
      return NextResponse.json({ error: 'assignedTo es requerido' }, { status: 400 })
    }

    const result = await updatePurchaseOrder(params.id, session.user.id, {
      assignedTo,
      approvedBy: body?.approvedBy,
      requestedBy: body?.requestedBy,
      notes: body?.notes,
      metadata: body?.metadata,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, purchaseOrder: result.purchaseOrder })
  } catch (error: any) {
    console.error('Error assigning purchase order:', error)
    return NextResponse.json({ error: 'Failed to assign purchase order' }, { status: 500 })
  }
}

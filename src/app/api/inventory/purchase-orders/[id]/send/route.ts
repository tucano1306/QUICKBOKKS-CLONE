import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePurchaseOrderStatus } from '@/lib/warehouse-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const result = await updatePurchaseOrderStatus(
      params.id,
      session.user.id,
      'SENT'
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status: result.purchaseOrder?.status,
      delivery: {
        method: body?.deliveryMethod || 'EMAIL',
        recipients: body?.recipients || [],
        message: body?.message,
        attachments: body?.attachments || [],
        sentAt: new Date().toISOString(),
        sentBy: session.user.id,
      },
    })
  } catch (error: any) {
    console.error('Error sending purchase order:', error)
    return NextResponse.json({ error: 'Failed to send purchase order' }, { status: 500 })
  }
}

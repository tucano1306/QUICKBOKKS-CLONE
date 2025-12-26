import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPurchaseOrders } from '@/lib/warehouse-service'

export const dynamic = 'force-dynamic'

function toDateString(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

function buildCsv(orders: any[]) {
  const header = [
    'PO Number',
    'Vendor',
    'Status',
    'Order Date',
    'Expected Date',
    'Total',
    'Subtotal',
    'Tax',
    'Shipping',
    'Requested By',
    'Approved By',
    'Assigned To',
  ]

  const rows = orders.map((order) => [
    order.poNumber,
    order.vendorName,
    order.status,
    toDateString(order.orderDate),
    toDateString(order.expectedDate),
    order.total ?? 0,
    order.subtotal ?? 0,
    order.tax ?? 0,
    order.shipping ?? 0,
    order.requestedBy || '',
    order.approvedBy || '',
    order.assignedTo || '',
  ])

  return [header, ...rows]
    .map((cols) =>
      cols
        .map((value) => {
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          const needsQuotes = /[",\n]/.test(stringValue)
          const safeValue = stringValue.replace(/"/g, '""')
          return needsQuotes ? `"${safeValue}"` : safeValue
        })
        .join(',')
    )
    .join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') || 'csv').toLowerCase()
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

    const result = await getPurchaseOrders(session.user.id, {
      status,
      vendorId,
      companyId,
      search,
      startDate,
      endDate,
      limit: 1000,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    if (format === 'json') {
      return NextResponse.json({ orders: result.orders, metrics: result.metrics })
    }

    const csv = buildCsv(result.orders)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="purchase-orders-${Date.now()}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting purchase orders:', error)
    return NextResponse.json({ error: 'Failed to export purchase orders' }, { status: 500 })
  }
}

import { prisma } from './prisma'
import { logAudit } from './audit'

const DEFAULT_COMPANY_ID = 'default-company-001'

type PurchaseHistoryOptions = {
  companyId?: string
  vendorId?: string
  category?: string
  search?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}

type ManualRecordPayload = {
  companyId?: string
  vendorId: string
  purchaseDate: string
  category?: string
  reference?: string
  description?: string
  subtotal?: number
  taxAmount?: number
  total: number
  attachments?: string[]
}

function buildManualRecord(record: any) {
  return {
    id: record.id,
    source: 'MANUAL' as const,
    editable: true,
    vendorId: record.vendor?.id || record.vendorId,
    vendorName: record.vendor?.name || 'Proveedor',
    vendorNumber: record.vendor?.vendorNumber,
    category: record.category,
    reference: record.reference,
    description: record.description,
    total: record.total,
    subtotal: record.subtotal,
    taxAmount: record.taxAmount,
    status: record.status,
    date: record.purchaseDate,
    attachments: record.attachments,
  }
}

function buildPurchaseOrderRecord(order: any) {
  return {
    id: `po_${order.id}`,
    source: 'PURCHASE_ORDER' as const,
    editable: false,
    vendorId: order.vendor?.id || order.vendorId,
    vendorName: order.vendor?.name || order.vendorName,
    vendorNumber: order.vendor?.vendorNumber,
    category: 'Orden de compra',
    reference: order.poNumber,
    description: order.description || order.notes,
    total: order.total,
    status: order.status,
    date: order.orderDate,
  }
}

function buildVendorBillRecord(bill: any) {
  return {
    id: `bill_${bill.id}`,
    source: 'VENDOR_BILL' as const,
    editable: false,
    vendorId: bill.vendor?.id || bill.vendorId,
    vendorName: bill.vendor?.name || bill.vendor?.vendorNumber || 'Proveedor',
    vendorNumber: bill.vendor?.vendorNumber,
    category: bill.category,
    reference: bill.billNumber,
    description: bill.description,
    total: bill.total,
    status: bill.status,
    date: bill.issueDate,
    balance: bill.balance,
  }
}

export async function listPurchaseHistory(
  userId: string,
  options: PurchaseHistoryOptions = {}
) {
  try {
    const companyId = options.companyId || DEFAULT_COMPANY_ID
    const limit = options.limit || 500

    const manualWhere: any = { companyId }
    if (options.vendorId) manualWhere.vendorId = options.vendorId
    if (options.category) manualWhere.category = options.category
    if (options.startDate || options.endDate) {
      manualWhere.purchaseDate = {}
      if (options.startDate) manualWhere.purchaseDate.gte = options.startDate
      if (options.endDate) manualWhere.purchaseDate.lte = options.endDate
    }
    if (options.search) {
      manualWhere.OR = [
        { reference: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [manualRecords, purchaseOrders, vendorBills] = await Promise.all([
      (prisma as any).vendorPurchaseRecord.findMany({
        where: manualWhere,
        include: {
          vendor: { select: { id: true, name: true, vendorNumber: true } },
        },
        orderBy: { purchaseDate: 'desc' },
        take: limit,
      }),
      (prisma as any).purchaseOrder.findMany({
        where: {
          userId,
          ...(companyId ? { companyId } : {}),
          ...(options.vendorId ? { vendorId: options.vendorId } : {}),
        },
        include: {
          vendor: { select: { id: true, name: true, vendorNumber: true } },
        },
        orderBy: { orderDate: 'desc' },
        take: limit,
      }),
      (prisma as any).vendorPayable.findMany({
        where: {
          companyId,
          ...(options.vendorId ? { vendorId: options.vendorId } : {}),
          ...(options.category ? { category: options.category } : {}),
        },
        include: {
          vendor: { select: { id: true, name: true, vendorNumber: true } },
        },
        orderBy: { issueDate: 'desc' },
        take: limit,
      }),
    ])

    const history = [
      ...manualRecords.map(buildManualRecord),
      ...purchaseOrders.map(buildPurchaseOrderRecord),
      ...vendorBills.map(buildVendorBillRecord),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalSpent = history.reduce((sum, record) => sum + (record.total || 0), 0)
    const manualCount = manualRecords.length
    const vendorCount = new Set(
      history.map((record) => record.vendorId).filter(Boolean)
    ).size
    const pendingBills = vendorBills.filter((bill: any) => bill.status !== 'PAID').length

    return {
      success: true,
      records: history,
      metrics: {
        totalSpent,
        manualCount,
        vendorCount,
        pendingBills,
      },
    }
  } catch (error: any) {
    console.error('Error listing purchase history:', error)
    return { success: false, error: error.message }
  }
}

export async function createPurchaseHistoryRecord(userId: string, data: ManualRecordPayload) {
  const companyId = data.companyId || DEFAULT_COMPANY_ID
  try {
    const record = await (prisma as any).vendorPurchaseRecord.create({
      data: {
        companyId,
        vendorId: data.vendorId,
        purchaseDate: new Date(data.purchaseDate),
        category: data.category,
        reference: data.reference,
        description: data.description,
        subtotal: data.subtotal ?? 0,
        taxAmount: data.taxAmount ?? 0,
        total: data.total,
        attachments: data.attachments || [],
      },
      include: {
        vendor: { select: { id: true, name: true, vendorNumber: true } },
      },
    })

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'PURCHASE_HISTORY',
      entityId: record.id,
      changes: { total: record.total, vendorId: record.vendorId },
    })

    return { success: true, record: buildManualRecord(record) }
  } catch (error: any) {
    console.error('Error creating purchase history record:', error)
    return { success: false, error: error.message }
  }
}

export async function updatePurchaseHistoryRecord(
  recordId: string,
  userId: string,
  data: ManualRecordPayload
) {
  try {
    const record = await (prisma as any).vendorPurchaseRecord.update({
      where: { id: recordId },
      data: {
        vendorId: data.vendorId,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        category: data.category,
        reference: data.reference,
        description: data.description,
        subtotal: data.subtotal ?? 0,
        taxAmount: data.taxAmount ?? 0,
        total: data.total,
        attachments: data.attachments || [],
      },
      include: {
        vendor: { select: { id: true, name: true, vendorNumber: true } },
      },
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'PURCHASE_HISTORY',
      entityId: record.id,
      changes: { total: record.total },
    })

    return { success: true, record: buildManualRecord(record) }
  } catch (error: any) {
    console.error('Error updating purchase history record:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePurchaseHistoryRecord(recordId: string, userId: string) {
  try {
    const record = await (prisma as any).vendorPurchaseRecord.delete({
      where: { id: recordId },
    })

    await logAudit({
      userId,
      action: 'DELETE',
      entityType: 'PURCHASE_HISTORY',
      entityId: recordId,
      changes: { vendorId: record.vendorId, total: record.total },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting purchase history record:', error)
    return { success: false, error: error.message }
  }
}

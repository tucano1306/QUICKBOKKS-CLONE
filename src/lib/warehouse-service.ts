import { prisma } from './prisma'
import { logAudit } from './audit'
import { receiveInventory } from './inventory-service'

/**
 * Servicio de gestión de almacenes y órdenes de compra
 */

const DEFAULT_COMPANY_ID = 'default-company-001'
const PO_STATUS_VALUES = new Set([
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'PARTIAL',
  'RECEIVED',
  'CANCELLED',
])

type PurchaseOrderItemInput = {
  inventoryItemId?: string | null
  description: string
  quantity: number | string
  unitCost: number | string
}

type PurchaseOrderTotals = {
  items: Array<{
    inventoryItemId: string | null
    description: string
    quantity: number
    unitCost: number
    totalCost: number
  }>
  subtotal: number
}

function normalizePOStatus(status?: string | null) {
  if (!status) return null
  const upper = status.toUpperCase()
  return PO_STATUS_VALUES.has(upper) ? upper : null
}

function sanitizeOrderItems(rawItems: PurchaseOrderItemInput[] = []): PurchaseOrderTotals {
  const items: PurchaseOrderTotals['items'] = []
  let subtotal = 0

  rawItems.forEach((item) => {
    const quantity = Number(item.quantity) || 0
    const unitCost = Number(item.unitCost) || 0
    if (!item.description || quantity <= 0) return
    const totalCost = parseFloat((quantity * unitCost).toFixed(2))
    subtotal += totalCost
    items.push({
      inventoryItemId: item.inventoryItemId || null,
      description: item.description,
      quantity,
      unitCost,
      totalCost,
    })
  })

  return { items, subtotal: parseFloat(subtotal.toFixed(2)) }
}

async function getVendorForOrder(vendorId?: string | null, companyId?: string | null) {
  if (!vendorId) return null

  const vendor = await (prisma as any).vendor.findFirst({
    where: {
      id: vendorId,
      ...(companyId ? { companyId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vendorNumber: true,
      companyId: true,
    },
  })

  if (vendor) return vendor

  return (prisma as any).vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vendorNumber: true,
      companyId: true,
    },
  })
}

async function getPurchaseOrderById(poId: string, userId?: string) {
  return (prisma as any).purchaseOrder.findFirst({
    where: {
      id: poId,
      ...(userId ? { userId } : {}),
    },
    include: {
      items: true,
    },
  })
}

export async function getPurchaseOrderDetail(poId: string, userId: string) {
  try {
    const purchaseOrder = await getPurchaseOrderById(poId, userId)

    if (!purchaseOrder) {
      return { success: false, error: 'Orden de compra no encontrada' }
    }

    return { success: true, purchaseOrder }
  } catch (error: any) {
    console.error('Error fetching purchase order detail:', error)
    return { success: false, error: error.message }
  }
}

// ============ WAREHOUSES ============

export async function createWarehouse(userId: string, data: any) {
  try {
    const warehouse = await (prisma as any).warehouse.create({
      data: {
        userId,
        ...data,
      },
    })

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'WAREHOUSE',
      entityId: warehouse.id,
      changes: { name: warehouse.name, code: warehouse.code },
    })

    return { success: true, warehouse }
  } catch (error: any) {
    console.error('Error creating warehouse:', error)
    return { success: false, error: error.message }
  }
}

export async function updateWarehouse(warehouseId: string, userId: string, data: any) {
  try {
    const warehouse = await (prisma as any).warehouse.update({
      where: { id: warehouseId },
      data,
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'WAREHOUSE',
      entityId: warehouse.id,
      changes: data,
    })

    return { success: true, warehouse }
  } catch (error: any) {
    console.error('Error updating warehouse:', error)
    return { success: false, error: error.message }
  }
}

export async function getWarehouses(userId: string) {
  try {
    const warehouses = await (prisma as any).warehouse.findMany({
      where: { userId, isActive: true },
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    })

    return { success: true, warehouses }
  } catch (error: any) {
    console.error('Error getting warehouses:', error)
    return { success: false, error: error.message }
  }
}

// ============ PURCHASE ORDERS ============

export async function createPurchaseOrder(userId: string, data: any) {
  const companyId = data.companyId || DEFAULT_COMPANY_ID
  try {
    const vendor = await getVendorForOrder(data.vendorId, companyId)
    if (data.vendorId && !vendor) {
      return { success: false, error: 'Proveedor inválido' }
    }

    const status = normalizePOStatus(data.status) || 'DRAFT'
    const { items, subtotal: computedSubtotal } = sanitizeOrderItems(data.items)

    const subtotal =
      data.subtotal !== undefined ? Number(data.subtotal) : computedSubtotal
    const tax = data.tax !== undefined ? Number(data.tax) : 0
    const shipping = data.shipping !== undefined ? Number(data.shipping) : 0
    const total =
      data.total !== undefined ? Number(data.total) : subtotal + tax + shipping

    const poId = await (prisma as any).$transaction(async (tx: any) => {
      const count = await tx.purchaseOrder.count({
        where: { userId },
      })
      const poNumber = data.poNumber || `PO-${String(count + 1).padStart(6, '0')}`

      const po = await tx.purchaseOrder.create({
        data: {
          userId,
          poNumber,
          vendorId: vendor?.id || data.vendorId || null,
          vendorName: vendor?.name || data.vendorName || 'Proveedor sin nombre',
          vendorEmail: vendor?.email || data.vendorEmail,
          vendorPhone: vendor?.phone || data.vendorPhone,
          orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          status,
          subtotal,
          tax,
          shipping,
          total,
          notes: data.notes,
          terms: data.terms,
          description: data.description,
          requestedBy: data.requestedBy,
          approvedBy: data.approvedBy,
          assignedTo: data.assignedTo,
          metadata: data.metadata,
        },
      })

      if (items.length) {
        await tx.purchaseOrderItem.createMany({
          data: items.map((item) => ({
            purchaseOrderId: po.id,
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
        })
      }

      await logAudit({
        userId,
        action: 'CREATE',
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        changes: { poNumber, total },
      })

      return po.id
    })

    const purchaseOrder = await getPurchaseOrderById(poId)
    return { success: true, purchaseOrder }
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return { success: false, error: error.message }
  }
}

export async function updatePurchaseOrder(
  poId: string,
  userId: string,
  data: any
) {
  try {
    const existing = await (prisma as any).purchaseOrder.findFirst({
      where: {
        id: poId,
        userId,
      },
    })

    if (!existing) {
      return { success: false, error: 'Orden de compra no encontrada' }
    }

    // Note: PurchaseOrder doesn't have companyId, use vendor's companyId for lookup
    const vendor = await getVendorForOrder(data.vendorId, data.companyId)
    if (data.vendorId && !vendor) {
      return { success: false, error: 'Proveedor inválido' }
    }

    const { items, subtotal: computedSubtotal } = sanitizeOrderItems(data.items)

    const subtotal =
      data.subtotal !== undefined
        ? Number(data.subtotal)
        : items.length
        ? computedSubtotal
        : existing.subtotal
    const tax = data.tax !== undefined ? Number(data.tax) : existing.tax
    const shipping =
      data.shipping !== undefined ? Number(data.shipping) : existing.shipping
    const total =
      data.total !== undefined ? Number(data.total) : subtotal + tax + shipping
    const status = normalizePOStatus(data.status) || existing.status

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          vendorId: vendor?.id || data.vendorId || existing.vendorId,
          vendorName:
            vendor?.name || data.vendorName || existing.vendorName || 'Proveedor',
          vendorEmail: vendor?.email || data.vendorEmail || existing.vendorEmail,
          vendorPhone: vendor?.phone || data.vendorPhone || existing.vendorPhone,
          expectedDate: data.expectedDate
            ? new Date(data.expectedDate)
            : existing.expectedDate,
          orderDate: data.orderDate
            ? new Date(data.orderDate)
            : existing.orderDate,
          subtotal,
          tax,
          shipping,
          total,
          notes: data.notes ?? existing.notes,
          terms: data.terms ?? existing.terms,
          description: data.description ?? existing.description,
          requestedBy: data.requestedBy ?? existing.requestedBy,
          approvedBy: data.approvedBy ?? existing.approvedBy,
          assignedTo: data.assignedTo ?? existing.assignedTo,
          metadata: data.metadata ?? existing.metadata,
          status,
        },
      })

      if (Array.isArray(data.items)) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } })
        if (items.length) {
          await tx.purchaseOrderItem.createMany({
            data: items.map((item) => ({
              purchaseOrderId: poId,
              inventoryItemId: item.inventoryItemId,
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            })),
          })
        }
      }

      await logAudit({
        userId,
        action: 'UPDATE',
        entityType: 'PURCHASE_ORDER',
        entityId: poId,
        changes: { status, total },
      })
    })

    const purchaseOrder = await getPurchaseOrderById(poId)
    return { success: true, purchaseOrder }
  } catch (error: any) {
    console.error('Error updating purchase order:', error)
    return { success: false, error: error.message }
  }
}

export async function updatePurchaseOrderStatus(
  poId: string,
  userId: string,
  status: string
) {
  try {
    const normalized = normalizePOStatus(status)
    if (!normalized) {
      return { success: false, error: 'Estado inválido' }
    }

    const existing = await (prisma as any).purchaseOrder.findFirst({
      where: {
        id: poId,
        userId,
      },
    })

    if (!existing) {
      return { success: false, error: 'Orden de compra no encontrada' }
    }

    const statusData: Record<string, any> = { status: normalized }
    if (normalized === 'SENT') {
      statusData.sentAt = new Date()
    }
    if (normalized === 'RECEIVED') {
      statusData.receivedDate = new Date()
    }

    const po = await (prisma as any).purchaseOrder.update({
      where: { id: poId },
      data: statusData,
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      changes: { status: normalized },
    })

    return { success: true, purchaseOrder: po }
  } catch (error: any) {
    console.error('Error updating PO status:', error)
    return { success: false, error: error.message }
  }
}

export async function receivePurchaseOrder(
  poId: string,
  userId: string,
  data: {
    warehouseId: string
    items: Array<{
      itemId: string
      receivedQty: number
      batchNumber?: string
      expirationDate?: Date
    }>
  }
) {
  try {
    const po = await (prisma as any).purchaseOrder.findFirst({
      where: { id: poId, userId },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    if (!po) {
      return { success: false, error: 'Purchase order not found' }
    }

    for (const receivedItem of data.items) {
      const poItem = po.items.find((i: any) => i.id === receivedItem.itemId)
      
      if (!poItem || !poItem.inventoryItemId) continue

      await receiveInventory(userId, {
        inventoryItemId: poItem.inventoryItemId,
        warehouseId: data.warehouseId,
        quantity: receivedItem.receivedQty,
        unitCost: poItem.unitCost,
        batchNumber: receivedItem.batchNumber,
        expirationDate: receivedItem.expirationDate,
        referenceType: 'PurchaseOrder',
        referenceId: poId,
        notes: `Received from PO ${po.poNumber}`,
      })

      await (prisma as any).purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQty: poItem.receivedQty + receivedItem.receivedQty,
        },
      })
    }

    const updatedPO = await (prisma as any).purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    })

    const allReceived = updatedPO.items.every(
      (item: any) => item.receivedQty >= item.quantity
    )
    const partialReceived = updatedPO.items.some(
      (item: any) => item.receivedQty > 0
    )

    let newStatus = po.status
    if (allReceived) {
      newStatus = 'RECEIVED'
    } else if (partialReceived) {
      newStatus = 'PARTIAL'
    }

    await (prisma as any).purchaseOrder.update({
      where: { id: poId },
      data: {
        status: newStatus,
        receivedDate: allReceived ? new Date() : null,
      },
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      changes: { status: newStatus, received: true },
    })

    return { success: true, status: newStatus }
  } catch (error: any) {
    console.error('Error receiving purchase order:', error)
    return { success: false, error: error.message }
  }
}

export async function getPurchaseOrders(
  userId: string,
  options?: {
    companyId?: string
    status?: string
    vendorId?: string
    search?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }
) {
  try {
    const where: any = { userId }

    // Note: PurchaseOrder model doesn't have companyId field
    // companyId filter is ignored

    const normalizedStatus = normalizePOStatus(options?.status)
    if (normalizedStatus) {
      where.status = normalizedStatus
    }

    if (options?.vendorId) {
      where.vendorId = options.vendorId
    }

    if (options?.startDate || options?.endDate) {
      where.orderDate = {}
      if (options.startDate) where.orderDate.gte = options.startDate
      if (options.endDate) where.orderDate.lte = options.endDate
    }

    if (options?.search) {
      const term = options.search
      where.OR = [
        { poNumber: { contains: term, mode: 'insensitive' } },
        { vendorName: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ]
    }

    const orders = await (prisma as any).purchaseOrder.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { orderDate: 'desc' },
      take: options?.limit || 200,
    })

    const metrics = orders.reduce(
      (acc: { pending: number; received: number; draft: number }, order: any) => {
        if (order.status === 'RECEIVED') acc.received += order.total || 0
        if (order.status === 'DRAFT') acc.draft += order.total || 0
        if (order.status === 'SENT' || order.status === 'CONFIRMED') {
          acc.pending += order.total || 0
        }
        return acc
      },
      { pending: 0, received: 0, draft: 0 }
    )

    return { success: true, orders, metrics }
  } catch (error: any) {
    console.error('Error getting purchase orders:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePurchaseOrder(poId: string, userId: string) {
  try {
    const po = await (prisma as any).purchaseOrder.findFirst({
      where: { id: poId, userId },
      include: { items: true },
    })

    if (!po) {
      return { success: false, error: 'Purchase order not found' }
    }

    if (po.status !== 'DRAFT') {
      return { success: false, error: 'Can only delete draft purchase orders' }
    }

    await (prisma as any).purchaseOrder.delete({
      where: { id: poId },
    })

    await logAudit({
      userId,
      action: 'DELETE',
      entityType: 'PURCHASE_ORDER',
      entityId: poId,
      changes: { poNumber: po.poNumber },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting purchase order:', error)
    return { success: false, error: error.message }
  }
}

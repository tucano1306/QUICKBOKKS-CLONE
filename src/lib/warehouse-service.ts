import { prisma } from './prisma'
import { logAudit } from './audit'
import { receiveInventory } from './inventory-service'

/**
 * Servicio de gestión de almacenes y órdenes de compra
 */

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
  try {
    // Generar número de PO
    const count = await (prisma as any).purchaseOrder.count({
      where: { userId },
    })
    const poNumber = `PO-${String(count + 1).padStart(6, '0')}`

    const po = await (prisma as any).purchaseOrder.create({
      data: {
        userId,
        poNumber,
        vendorName: data.vendorName,
        vendorEmail: data.vendorEmail,
        vendorPhone: data.vendorPhone,
        orderDate: data.orderDate || new Date(),
        expectedDate: data.expectedDate,
        status: 'DRAFT',
        subtotal: 0,
        tax: 0,
        shipping: data.shipping || 0,
        total: 0,
        notes: data.notes,
        terms: data.terms,
      },
    })

    // Crear items
    let subtotal = 0
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const totalCost = item.quantity * item.unitCost

        await (prisma as any).purchaseOrderItem.create({
          data: {
            purchaseOrderId: po.id,
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost,
          },
        })

        subtotal += totalCost
      }
    }

    // Actualizar totales
    const tax = data.tax || 0
    const shipping = data.shipping || 0
    const total = subtotal + tax + shipping

    await (prisma as any).purchaseOrder.update({
      where: { id: po.id },
      data: {
        subtotal,
        tax,
        shipping,
        total,
      },
    })

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      changes: { poNumber, total },
    })

    return { success: true, purchaseOrder: { ...po, subtotal, tax, total } }
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return { success: false, error: error.message }
  }
}

export async function updatePurchaseOrderStatus(
  poId: string,
  userId: string,
  status: string
) {
  try {
    const po = await (prisma as any).purchaseOrder.update({
      where: { id: poId },
      data: { status },
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      changes: { status },
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
    const po = await (prisma as any).purchaseOrder.findUnique({
      where: { id: poId },
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

    // Procesar cada item recibido
    for (const receivedItem of data.items) {
      const poItem = po.items.find((i: any) => i.id === receivedItem.itemId)
      
      if (!poItem) continue

      // Registrar entrada de inventario
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

      // Actualizar cantidad recibida en el item de la PO
      await (prisma as any).purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQty: poItem.receivedQty + receivedItem.receivedQty,
        },
      })
    }

    // Verificar si la PO está completa
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
    status?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }
) {
  try {
    const where: any = { userId }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.startDate || options?.endDate) {
      where.orderDate = {}
      if (options.startDate) where.orderDate.gte = options.startDate
      if (options.endDate) where.orderDate.lte = options.endDate
    }

    const orders = await (prisma as any).purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
      take: options?.limit || 100,
    })

    return { success: true, orders }
  } catch (error: any) {
    console.error('Error getting purchase orders:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePurchaseOrder(poId: string, userId: string) {
  try {
    const po = await (prisma as any).purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    })

    if (!po) {
      return { success: false, error: 'Purchase order not found' }
    }

    // Solo permitir borrar si está en DRAFT
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

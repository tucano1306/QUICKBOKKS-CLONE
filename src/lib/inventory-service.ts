import { prisma } from './prisma'
import { calculateCost, updateAverageCost } from './valuation-service'
import { logAudit } from './audit'
import { checkStockAlerts } from './stock-alert-service'

/**
 * Servicio principal de gestión de inventario
 */

/**
 * Crea un nuevo item de inventario
 */
export async function createInventoryItem(userId: string, data: any) {
  try {
    const item = await (prisma as any).inventoryItem.create({
      data: {
        userId,
        ...data,
        avgCost: data.unitCost || 0,
      },
      include: {
        warehouse: true,
      },
    })

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'INVENTORY_ITEM',
      entityId: item.id,
      changes: { sku: item.sku, name: item.name },
    })

    return { success: true, item }
  } catch (error: any) {
    console.error('Error creating inventory item:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza un item de inventario
 */
export async function updateInventoryItem(
  itemId: string,
  userId: string,
  data: any
) {
  try {
    const item = await (prisma as any).inventoryItem.update({
      where: { id: itemId },
      data,
      include: {
        warehouse: true,
      },
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: item.id,
      changes: data,
    })

    return { success: true, item }
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Registra una entrada de inventario (compra)
 */
export async function receiveInventory(
  userId: string,
  data: {
    inventoryItemId: string
    warehouseId: string
    quantity: number
    unitCost: number
    batchNumber?: string
    manufacturedDate?: Date
    expirationDate?: Date
    serialNumbers?: string[]
    referenceType?: string
    referenceId?: string
    notes?: string
  }
) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: data.inventoryItemId },
    })

    if (!item) {
      return { success: false, error: 'Item not found' }
    }

    // Crear batch si se trackean batches
    let batchId = null
    if (item.trackBatches && data.batchNumber) {
      const batch = await (prisma as any).batch.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          batchNumber: data.batchNumber,
          quantity: data.quantity,
          unitCost: data.unitCost,
          manufacturedDate: data.manufacturedDate,
          expirationDate: data.expirationDate,
        },
      })
      batchId = batch.id
    }

    // Crear números de serie si se trackean
    if (item.trackSerial && data.serialNumbers) {
      for (const serialNumber of data.serialNumbers) {
        await (prisma as any).serialNumber.create({
          data: {
            inventoryItemId: data.inventoryItemId,
            serialNumber,
            unitCost: data.unitCost,
            status: 'IN_STOCK',
          },
        })
      }
    }

    // Crear movimiento de stock
    const movement = await (prisma as any).stockMovement.create({
      data: {
        userId,
        inventoryItemId: data.inventoryItemId,
        warehouseId: data.warehouseId,
        batchId,
        movementType: 'PURCHASE',
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.quantity * data.unitCost,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
      },
    })

    // Actualizar cantidad y costo promedio
    const newQuantity = item.quantity + data.quantity
    const newAvgCost = await updateAverageCost(
      data.inventoryItemId,
      data.quantity,
      data.unitCost
    )

    await (prisma as any).inventoryItem.update({
      where: { id: data.inventoryItemId },
      data: {
        quantity: newQuantity,
        avgCost: newAvgCost,
        unitCost: data.unitCost,
      },
    })

    // Verificar alertas
    await checkStockAlerts(data.inventoryItemId, userId)

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'STOCK_MOVEMENT',
      entityId: movement.id,
      changes: { type: 'PURCHASE', quantity: data.quantity },
    })

    return { success: true, movement }
  } catch (error: any) {
    console.error('Error receiving inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Registra una salida de inventario (venta)
 */
export async function issueInventory(
  userId: string,
  data: {
    inventoryItemId: string
    warehouseId: string
    quantity: number
    serialNumbers?: string[]
    referenceType?: string
    referenceId?: string
    notes?: string
  }
) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: data.inventoryItemId },
    })

    if (!item) {
      return { success: false, error: 'Item not found' }
    }

    if (item.quantity < data.quantity) {
      return { success: false, error: 'Insufficient stock' }
    }

    // Calcular costo usando el método configurado
    const costCalc = await calculateCost(
      data.inventoryItemId,
      data.quantity,
      data.serialNumbers
    )

    // Actualizar números de serie si aplica
    if (item.trackSerial && data.serialNumbers) {
      await (prisma as any).serialNumber.updateMany({
        where: {
          serialNumber: { in: data.serialNumbers },
        },
        data: {
          status: 'SOLD',
          soldDate: new Date(),
        },
      })
    }

    // Descontar de batches según método FIFO/LIFO
    if (item.trackBatches) {
      await deductFromBatches(
        data.inventoryItemId,
        data.quantity,
        item.costMethod
      )
    }

    // Crear movimiento de stock
    const movement = await (prisma as any).stockMovement.create({
      data: {
        userId,
        inventoryItemId: data.inventoryItemId,
        warehouseId: data.warehouseId,
        movementType: 'SALE',
        quantity: data.quantity,
        unitCost: costCalc.unitCost,
        totalCost: costCalc.totalCost,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
      },
    })

    // Actualizar cantidad
    await (prisma as any).inventoryItem.update({
      where: { id: data.inventoryItemId },
      data: {
        quantity: item.quantity - data.quantity,
      },
    })

    // Verificar alertas
    await checkStockAlerts(data.inventoryItemId, userId)

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'STOCK_MOVEMENT',
      entityId: movement.id,
      changes: { type: 'SALE', quantity: data.quantity },
    })

    return { success: true, movement, cost: costCalc }
  } catch (error: any) {
    console.error('Error issuing inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ajusta el inventario manualmente
 */
export async function adjustInventory(
  userId: string,
  data: {
    inventoryItemId: string
    warehouseId: string
    quantity: number // Positivo = agregar, Negativo = quitar
    unitCost?: number
    reason: string
  }
) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: data.inventoryItemId },
    })

    if (!item) {
      return { success: false, error: 'Item not found' }
    }

    const newQuantity = item.quantity + data.quantity

    if (newQuantity < 0) {
      return { success: false, error: 'Adjustment would result in negative stock' }
    }

    const unitCost = data.unitCost || item.avgCost

    // Crear movimiento
    const movement = await (prisma as any).stockMovement.create({
      data: {
        userId,
        inventoryItemId: data.inventoryItemId,
        warehouseId: data.warehouseId,
        movementType: 'ADJUSTMENT',
        quantity: Math.abs(data.quantity),
        unitCost,
        totalCost: Math.abs(data.quantity) * unitCost,
        description: data.reason,
      },
    })

    // Actualizar cantidad
    await (prisma as any).inventoryItem.update({
      where: { id: data.inventoryItemId },
      data: { quantity: newQuantity },
    })

    // Si es ajuste positivo y hay costo, actualizar promedio
    if (data.quantity > 0 && data.unitCost) {
      await updateAverageCost(data.inventoryItemId, data.quantity, data.unitCost)
    }

    await checkStockAlerts(data.inventoryItemId, userId)

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'STOCK_ADJUSTMENT',
      entityId: movement.id,
      changes: { quantity: data.quantity, reason: data.reason },
    })

    return { success: true, movement }
  } catch (error: any) {
    console.error('Error adjusting inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Transfiere inventario entre almacenes
 */
export async function transferInventory(
  userId: string,
  data: {
    inventoryItemId: string
    fromWarehouseId: string
    toWarehouseId: string
    quantity: number
    notes?: string
  }
) {
  try {
    // Verificar stock en origen
    const fromItem = await (prisma as any).inventoryItem.findFirst({
      where: {
        id: data.inventoryItemId,
        warehouseId: data.fromWarehouseId,
      },
    })

    if (!fromItem || fromItem.quantity < data.quantity) {
      return { success: false, error: 'Insufficient stock in source warehouse' }
    }

    // Crear o encontrar item en destino
    let toItem = await (prisma as any).inventoryItem.findFirst({
      where: {
        sku: fromItem.sku,
        warehouseId: data.toWarehouseId,
      },
    })

    if (!toItem) {
      // Crear item en almacén destino
      toItem = await (prisma as any).inventoryItem.create({
        data: {
          userId,
          warehouseId: data.toWarehouseId,
          sku: fromItem.sku,
          name: fromItem.name,
          description: fromItem.description,
          category: fromItem.category,
          itemType: fromItem.itemType,
          unit: fromItem.unit,
          quantity: 0,
          minStock: fromItem.minStock,
          maxStock: fromItem.maxStock,
          trackBatches: fromItem.trackBatches,
          trackSerial: fromItem.trackSerial,
          costMethod: fromItem.costMethod,
          unitCost: fromItem.unitCost,
          avgCost: fromItem.avgCost,
          salePrice: fromItem.salePrice,
        },
      })
    }

    // Movimiento de salida
    await (prisma as any).stockMovement.create({
      data: {
        userId,
        inventoryItemId: fromItem.id,
        warehouseId: data.fromWarehouseId,
        movementType: 'TRANSFER',
        quantity: data.quantity,
        unitCost: fromItem.avgCost,
        totalCost: data.quantity * fromItem.avgCost,
        description: `Transfer to ${data.toWarehouseId}`,
        notes: data.notes,
      },
    })

    // Movimiento de entrada
    await (prisma as any).stockMovement.create({
      data: {
        userId,
        inventoryItemId: toItem.id,
        warehouseId: data.toWarehouseId,
        movementType: 'TRANSFER',
        quantity: data.quantity,
        unitCost: fromItem.avgCost,
        totalCost: data.quantity * fromItem.avgCost,
        description: `Transfer from ${data.fromWarehouseId}`,
        notes: data.notes,
      },
    })

    // Actualizar cantidades
    await (prisma as any).inventoryItem.update({
      where: { id: fromItem.id },
      data: { quantity: fromItem.quantity - data.quantity },
    })

    await (prisma as any).inventoryItem.update({
      where: { id: toItem.id },
      data: { quantity: toItem.quantity + data.quantity },
    })

    await checkStockAlerts(fromItem.id, userId)
    await checkStockAlerts(toItem.id, userId)

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'STOCK_TRANSFER',
      entityId: fromItem.id,
      changes: { quantity: data.quantity, from: data.fromWarehouseId, to: data.toWarehouseId },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error transferring inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Descuenta cantidad de batches según método FIFO/LIFO
 */
async function deductFromBatches(
  inventoryItemId: string,
  quantity: number,
  method: string
) {
  const orderBy = method === 'FIFO' ? { receivedDate: 'asc' as const } : { receivedDate: 'desc' as const }

  const batches = await (prisma as any).batch.findMany({
    where: {
      inventoryItemId,
      isActive: true,
      quantity: { gt: 0 },
    },
    orderBy,
  })

  let remaining = quantity

  for (const batch of batches) {
    if (remaining <= 0) break

    const deduct = Math.min(remaining, batch.quantity)
    const newQty = batch.quantity - deduct

    await (prisma as any).batch.update({
      where: { id: batch.id },
      data: {
        quantity: newQty,
        isActive: newQty > 0,
      },
    })

    remaining -= deduct
  }
}

/**
 * Obtiene el historial de movimientos de un item
 */
export async function getStockMovements(
  inventoryItemId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    movementType?: string
    limit?: number
  }
) {
  try {
    const where: any = { inventoryItemId }

    if (options?.startDate || options?.endDate) {
      where.movementDate = {}
      if (options.startDate) where.movementDate.gte = options.startDate
      if (options.endDate) where.movementDate.lte = options.endDate
    }

    if (options?.movementType) {
      where.movementType = options.movementType
    }

    const movements = await (prisma as any).stockMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      take: options?.limit || 100,
      include: {
        batch: true,
        serialNumber: true,
      },
    })

    return { success: true, movements }
  } catch (error: any) {
    console.error('Error getting stock movements:', error)
    return { success: false, error: error.message }
  }
}

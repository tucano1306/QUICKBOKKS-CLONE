import { prisma } from './prisma'

/**
 * Servicio de valuación de inventario
 * Implementa FIFO, LIFO y Average Cost
 */

interface CostCalculation {
  unitCost: number
  totalCost: number
  method: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC'
}

/**
 * Calcula el costo usando FIFO (First In, First Out)
 * Los primeros items en entrar son los primeros en salir
 */
export async function calculateFIFOCost(
  inventoryItemId: string,
  quantity: number
): Promise<CostCalculation> {
  // Obtener batches ordenados por fecha (más antiguos primero)
  const batches = await (prisma as any).batch.findMany({
    where: {
      inventoryItemId,
      isActive: true,
      quantity: { gt: 0 },
    },
    orderBy: {
      receivedDate: 'asc', // FIFO: más antiguos primero
    },
  })

  let remainingQty = quantity
  let totalCost = 0

  for (const batch of batches) {
    if (remainingQty <= 0) break

    const qtyFromBatch = Math.min(remainingQty, batch.quantity)
    totalCost += qtyFromBatch * batch.unitCost
    remainingQty -= qtyFromBatch
  }

  if (remainingQty > 0) {
    throw new Error(`Insufficient stock. Missing ${remainingQty} units`)
  }

  const unitCost = totalCost / quantity

  return {
    unitCost,
    totalCost,
    method: 'FIFO',
  }
}

/**
 * Calcula el costo usando LIFO (Last In, First Out)
 * Los últimos items en entrar son los primeros en salir
 */
export async function calculateLIFOCost(
  inventoryItemId: string,
  quantity: number
): Promise<CostCalculation> {
  // Obtener batches ordenados por fecha (más recientes primero)
  const batches = await (prisma as any).batch.findMany({
    where: {
      inventoryItemId,
      isActive: true,
      quantity: { gt: 0 },
    },
    orderBy: {
      receivedDate: 'desc', // LIFO: más recientes primero
    },
  })

  let remainingQty = quantity
  let totalCost = 0

  for (const batch of batches) {
    if (remainingQty <= 0) break

    const qtyFromBatch = Math.min(remainingQty, batch.quantity)
    totalCost += qtyFromBatch * batch.unitCost
    remainingQty -= qtyFromBatch
  }

  if (remainingQty > 0) {
    throw new Error(`Insufficient stock. Missing ${remainingQty} units`)
  }

  const unitCost = totalCost / quantity

  return {
    unitCost,
    totalCost,
    method: 'LIFO',
  }
}

/**
 * Calcula el costo promedio ponderado
 * Promedio de todos los costos de compra
 */
export async function calculateAverageCost(
  inventoryItemId: string,
  quantity: number
): Promise<CostCalculation> {
  const item = await (prisma as any).inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: {
      batches: {
        where: {
          isActive: true,
          quantity: { gt: 0 },
        },
      },
    },
  })

  if (!item) {
    throw new Error('Inventory item not found')
  }

  if (item.quantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${item.quantity}, Required: ${quantity}`)
  }

  // Usar el costo promedio almacenado
  const unitCost = item.avgCost || item.unitCost
  const totalCost = unitCost * quantity

  return {
    unitCost,
    totalCost,
    method: 'AVERAGE',
  }
}

/**
 * Calcula el costo específico usando números de serie
 */
export async function calculateSpecificCost(
  serialNumbers: string[]
): Promise<CostCalculation> {
  const serials = await (prisma as any).serialNumber.findMany({
    where: {
      serialNumber: { in: serialNumbers },
      status: 'IN_STOCK',
    },
  })

  if (serials.length !== serialNumbers.length) {
    throw new Error('Some serial numbers not found or already sold')
  }

  const totalCost = serials.reduce((sum: number, serial: any) => sum + serial.unitCost, 0)
  const unitCost = totalCost / serials.length

  return {
    unitCost,
    totalCost,
    method: 'SPECIFIC',
  }
}

/**
 * Actualiza el costo promedio de un item después de una compra
 */
export async function updateAverageCost(
  inventoryItemId: string,
  newQty: number,
  newUnitCost: number
): Promise<number> {
  const item = await (prisma as any).inventoryItem.findUnique({
    where: { id: inventoryItemId },
  })

  if (!item) {
    throw new Error('Inventory item not found')
  }

  const currentQty = item.quantity
  const currentAvgCost = item.avgCost || item.unitCost

  // Calcular nuevo costo promedio ponderado
  const totalCost = (currentQty * currentAvgCost) + (newQty * newUnitCost)
  const totalQty = currentQty + newQty
  const newAvgCost = totalQty > 0 ? totalCost / totalQty : newUnitCost

  // Actualizar en base de datos
  await (prisma as any).inventoryItem.update({
    where: { id: inventoryItemId },
    data: {
      avgCost: newAvgCost,
      unitCost: newUnitCost, // Último costo de compra
    },
  })

  return newAvgCost
}

/**
 * Calcula el costo basado en el método del item
 */
export async function calculateCost(
  inventoryItemId: string,
  quantity: number,
  serialNumbers?: string[]
): Promise<CostCalculation> {
  const item = await (prisma as any).inventoryItem.findUnique({
    where: { id: inventoryItemId },
  })

  if (!item) {
    throw new Error('Inventory item not found')
  }

  // Si tiene números de serie, usar método específico
  if (item.trackSerial && serialNumbers && serialNumbers.length > 0) {
    return calculateSpecificCost(serialNumbers)
  }

  // Usar el método configurado en el item
  switch (item.costMethod) {
    case 'FIFO':
      return calculateFIFOCost(inventoryItemId, quantity)
    
    case 'LIFO':
      return calculateLIFOCost(inventoryItemId, quantity)
    
    case 'AVERAGE':
      return calculateAverageCost(inventoryItemId, quantity)
    
    case 'SPECIFIC':
      if (!serialNumbers || serialNumbers.length === 0) {
        throw new Error('Serial numbers required for SPECIFIC cost method')
      }
      return calculateSpecificCost(serialNumbers)
    
    default:
      return calculateAverageCost(inventoryItemId, quantity)
  }
}

/**
 * Calcula el valor total del inventario de un almacén
 */
export async function calculateWarehouseValue(
  warehouseId: string,
  method: 'CURRENT' | 'AVERAGE' | 'SALE' = 'AVERAGE'
): Promise<{ totalValue: number; itemCount: number }> {
  const items = await (prisma as any).inventoryItem.findMany({
    where: {
      warehouseId,
      isActive: true,
      quantity: { gt: 0 },
    },
  })

  let totalValue = 0
  
  for (const item of items) {
    let itemValue = 0
    
    switch (method) {
      case 'CURRENT':
        itemValue = item.quantity * item.unitCost
        break
      
      case 'AVERAGE':
        itemValue = item.quantity * (item.avgCost || item.unitCost)
        break
      
      case 'SALE':
        itemValue = item.quantity * (item.salePrice || item.unitCost)
        break
    }
    
    totalValue += itemValue
  }

  return {
    totalValue,
    itemCount: items.length,
  }
}

/**
 * Genera reporte de valuación de inventario
 */
export async function generateValuationReport(
  userId: string,
  warehouseId?: string
): Promise<any> {
  const where: any = { userId, isActive: true }
  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  const items = await (prisma as any).inventoryItem.findMany({
    where,
    include: {
      warehouse: true,
      batches: {
        where: { isActive: true, quantity: { gt: 0 } },
      },
    },
  })

  const report = items.map((item: any) => {
    const fifoValue = item.quantity * (item.batches[0]?.unitCost || item.unitCost)
    const lifoValue = item.quantity * (item.batches[item.batches.length - 1]?.unitCost || item.unitCost)
    const avgValue = item.quantity * item.avgCost

    return {
      sku: item.sku,
      name: item.name,
      warehouse: item.warehouse.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      avgCost: item.avgCost,
      costMethod: item.costMethod,
      valuationFIFO: fifoValue,
      valuationLIFO: lifoValue,
      valuationAverage: avgValue,
      valuationCurrent: item.quantity * item.unitCost,
    }
  })

  const totals = report.reduce((acc: any, item: any) => ({
    totalFIFO: acc.totalFIFO + item.valuationFIFO,
    totalLIFO: acc.totalLIFO + item.valuationLIFO,
    totalAverage: acc.totalAverage + item.valuationAverage,
    totalCurrent: acc.totalCurrent + item.valuationCurrent,
  }), {
    totalFIFO: 0,
    totalLIFO: 0,
    totalAverage: 0,
    totalCurrent: 0,
  })

  return {
    items: report,
    totals,
    generatedAt: new Date(),
  }
}

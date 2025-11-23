import { prisma } from './prisma'

/**
 * Servicio de alertas de stock
 * Detección automática de stock bajo, vencimientos, etc.
 */

/**
 * Verifica y crea alertas para un item específico
 */
export async function checkStockAlerts(inventoryItemId: string, userId: string) {
  try {
    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: {
        batches: {
          where: { isActive: true },
        },
      },
    })

    if (!item || !item.isActive) return

    // Verificar stock bajo
    if (item.quantity <= item.minStock && item.quantity > 0) {
      await createOrUpdateAlert(inventoryItemId, userId, 'LOW_STOCK', item.minStock)
    } else if (item.quantity === 0) {
      await createOrUpdateAlert(inventoryItemId, userId, 'OUT_OF_STOCK', 0)
    } else if (item.maxStock && item.quantity >= item.maxStock) {
      await createOrUpdateAlert(inventoryItemId, userId, 'OVERSTOCK', item.maxStock)
    } else {
      // Resolver alertas si el stock está normal
      await resolveAlerts(inventoryItemId, ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK'])
    }

    // Verificar batches por vencer o vencidos
    if (item.trackBatches) {
      const now = new Date()
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() + 30) // 30 días de advertencia

      for (const batch of item.batches) {
        if (batch.expirationDate) {
          const expDate = new Date(batch.expirationDate)

          if (expDate < now) {
            await createOrUpdateAlert(
              inventoryItemId,
              userId,
              'EXPIRED',
              null,
              `Batch ${batch.batchNumber} expired`
            )
          } else if (expDate <= warningDate) {
            await createOrUpdateAlert(
              inventoryItemId,
              userId,
              'EXPIRING',
              null,
              `Batch ${batch.batchNumber} expiring soon`
            )
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking stock alerts:', error)
  }
}

/**
 * Crea o actualiza una alerta
 */
async function createOrUpdateAlert(
  inventoryItemId: string,
  userId: string,
  alertType: string,
  threshold: number | null,
  description?: string
) {
  const existing = await (prisma as any).stockAlert.findFirst({
    where: {
      inventoryItemId,
      alertType,
      isResolved: false,
    },
  })

  if (existing) {
    // Actualizar alerta existente
    await (prisma as any).stockAlert.update({
      where: { id: existing.id },
      data: {
        threshold,
        updatedAt: new Date(),
      },
    })
  } else {
    // Crear nueva alerta
    await (prisma as any).stockAlert.create({
      data: {
        inventoryItemId,
        userId,
        alertType,
        threshold,
        isActive: true,
        isResolved: false,
      },
    })
  }
}

/**
 * Resuelve alertas de ciertos tipos
 */
async function resolveAlerts(inventoryItemId: string, alertTypes: string[]) {
  await (prisma as any).stockAlert.updateMany({
    where: {
      inventoryItemId,
      alertType: { in: alertTypes },
      isResolved: false,
    },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
    },
  })
}

/**
 * Ejecuta verificación de alertas para todos los items activos
 */
export async function checkAllStockAlerts(userId: string) {
  try {
    const items = await (prisma as any).inventoryItem.findMany({
      where: {
        userId,
        isActive: true,
      },
    })

    for (const item of items) {
      await checkStockAlerts(item.id, userId)
    }

    return { success: true, itemsChecked: items.length }
  } catch (error: any) {
    console.error('Error checking all stock alerts:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene alertas activas de un usuario
 */
export async function getActiveAlerts(
  userId: string,
  options?: {
    alertType?: string
    warehouseId?: string
    limit?: number
  }
) {
  try {
    const where: any = {
      userId,
      isActive: true,
      isResolved: false,
    }

    if (options?.alertType) {
      where.alertType = options.alertType
    }

    const alerts = await (prisma as any).stockAlert.findMany({
      where,
      include: {
        inventoryItem: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 100,
    })

    // Filtrar por warehouse si se especifica
    const filtered = options?.warehouseId
      ? alerts.filter((a: any) => a.inventoryItem.warehouseId === options.warehouseId)
      : alerts

    return { success: true, alerts: filtered }
  } catch (error: any) {
    console.error('Error getting active alerts:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Marca una alerta como notificada
 */
export async function markAlertNotified(alertId: string) {
  try {
    await (prisma as any).stockAlert.update({
      where: { id: alertId },
      data: {
        notified: true,
        notifiedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error marking alert notified:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Resuelve manualmente una alerta
 */
export async function resolveAlert(alertId: string, resolvedBy: string) {
  try {
    await (prisma as any).stockAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error resolving alert:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene items que necesitan reorden
 */
export async function getItemsNeedingReorder(userId: string, warehouseId?: string) {
  try {
    const where: any = {
      userId,
      isActive: true,
      quantity: {
        lte: (prisma as any).raw('min_stock'),
      },
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    const items = await (prisma as any).inventoryItem.findMany({
      where,
      include: {
        warehouse: true,
        stockAlerts: {
          where: {
            isResolved: false,
            alertType: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
          },
        },
      },
      orderBy: {
        quantity: 'asc',
      },
    })

    const reorderList = items.map((item: any) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      warehouse: item.warehouse.name,
      currentQty: item.quantity,
      minStock: item.minStock,
      reorderQty: Math.max(item.maxStock || item.minStock * 2, item.minStock) - item.quantity,
      avgCost: item.avgCost,
      estimatedCost: (Math.max(item.maxStock || item.minStock * 2, item.minStock) - item.quantity) * item.avgCost,
    }))

    return { success: true, items: reorderList }
  } catch (error: any) {
    console.error('Error getting reorder list:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Genera reporte de alertas
 */
export async function generateAlertReport(userId: string, startDate?: Date, endDate?: Date) {
  try {
    const where: any = { userId }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const alerts = await (prisma as any).stockAlert.findMany({
      where,
      include: {
        inventoryItem: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const summary = {
      total: alerts.length,
      byType: {} as any,
      byStatus: {
        active: alerts.filter((a: any) => !a.isResolved).length,
        resolved: alerts.filter((a: any) => a.isResolved).length,
      },
      byWarehouse: {} as any,
    }

    alerts.forEach((alert: any) => {
      // Por tipo
      if (!summary.byType[alert.alertType]) {
        summary.byType[alert.alertType] = 0
      }
      summary.byType[alert.alertType]++

      // Por almacén
      const warehouseName = alert.inventoryItem.warehouse.name
      if (!summary.byWarehouse[warehouseName]) {
        summary.byWarehouse[warehouseName] = 0
      }
      summary.byWarehouse[warehouseName]++
    })

    return {
      success: true,
      summary,
      alerts,
      generatedAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error generating alert report:', error)
    return { success: false, error: error.message }
  }
}

import { prisma } from './prisma'

export interface AuditLogData {
  userId?: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'APPROVE' | 'REJECT'
  entityType: string
  entityId?: string
  changes?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra una acción en el log de auditoría
 */
export async function logAudit(data: AuditLogData) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Error logging audit:', error)
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Obtiene el historial de auditoría de una entidad
 */
export async function getEntityAuditHistory(entityType: string, entityId: string) {
  return await (prisma as any).auditLog.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: {
      timestamp: 'desc'
    }
  })
}

/**
 * Obtiene el historial de actividad de un usuario
 */
export async function getUserActivity(userId: string, limit: number = 50) {
  return await (prisma as any).auditLog.findMany({
    where: {
      userId
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: limit
  })
}

/**
 * Registra intento de login
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failReason?: string
) {
  try {
    await (prisma as any).loginAttempt.create({
      data: {
        email,
        success,
        ipAddress,
        userAgent,
        failReason
      }
    })
    
    // Verificar intentos fallidos recientes
    if (!success) {
      const recentAttempts = await (prisma as any).loginAttempt.findMany({
        where: {
          email,
          success: false,
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Últimos 15 minutos
          }
        }
      })
      
      // Si hay 5 o más intentos fallidos, podría bloquearse
      if (recentAttempts.length >= 5) {
        console.warn(`Múltiples intentos fallidos de login para ${email}`)
        return { blocked: true, attempts: recentAttempts.length }
      }
    }
    
    return { blocked: false }
  } catch (error) {
    console.error('Error logging login attempt:', error)
    return { blocked: false }
  }
}

/**
 * Compara objetos para detectar cambios (útil para auditoría)
 */
export function detectChanges(oldData: any, newData: any): any {
  const changes: any = {}
  
  Object.keys(newData).forEach(key => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      }
    }
  })
  
  return changes
}

/**
 * Obtiene estadísticas de auditoría
 */
export async function getAuditStats(startDate?: Date, endDate?: Date) {
  const where: any = {}
  
  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }
  
  const [totalActions, actionsByType, actionsByUser] = await Promise.all([
    (prisma as any).auditLog.count({ where }),
    (prisma as any).auditLog.groupBy({
      by: ['action'],
      where,
      _count: true
    }),
    (prisma as any).auditLog.groupBy({
      by: ['userId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    })
  ])
  
  return {
    totalActions,
    actionsByType,
    topUsers: actionsByUser
  }
}

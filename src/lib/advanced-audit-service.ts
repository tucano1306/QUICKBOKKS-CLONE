/**
 * FASE 8: Advanced Audit Service
 * System-wide activity logging and monitoring
 */

import { prisma } from './prisma';

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface SystemLogData {
  companyId?: string;
  userId?: string;
  level: LogLevel;
  category: string;
  action: string;
  resource?: string;
  resourceId?: string;
  message: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
}

interface ActivityQuery {
  companyId?: string;
  userId?: string;
  level?: LogLevel;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Log system activity
 */
export async function logActivity(data: SystemLogData) {
  try {
    const log = await (prisma as any).systemLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        level: data.level,
        category: data.category,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        message: data.message,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        duration: data.duration,
      },
    });

    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(query: ActivityQuery) {
  const {
    companyId,
    userId,
    level,
    category,
    startDate,
    endDate,
    limit = 100,
  } = query;

  const where: any = {};

  if (companyId) where.companyId = companyId;
  if (userId) where.userId = userId;
  if (level) where.level = level;
  if (category) where.category = category;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const logs = await (prisma as any).systemLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs;
}

/**
 * Get activity statistics
 */
export async function getActivityStats(companyId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await (prisma as any).systemLog.findMany({
    where: {
      companyId,
      createdAt: { gte: startDate },
    },
    select: {
      level: true,
      category: true,
      action: true,
      createdAt: true,
    },
  });

  // Count by level
  const byLevel = {
    DEBUG: 0,
    INFO: 0,
    WARNING: 0,
    ERROR: 0,
    CRITICAL: 0,
  };

  // Count by category
  const byCategory: Record<string, number> = {};

  // Count by action
  const byAction: Record<string, number> = {};

  // Count by day
  const byDay: Record<string, number> = {};

  logs.forEach((log: any) => {
    // By level
    byLevel[log.level as LogLevel]++;

    // By category
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;

    // By action
    byAction[log.action] = (byAction[log.action] || 0) + 1;

    // By day
    const day = log.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    total: logs.length,
    byLevel,
    byCategory: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    byAction: Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    byDay: Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])),
  };
}

/**
 * Get user activity summary
 */
export async function getUserActivity(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await (prisma as any).systemLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const actions = logs.reduce((acc: Record<string, number>, log: any) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const categories = logs.reduce((acc: Record<string, number>, log: any) => {
    acc[log.category] = (acc[log.category] || 0) + 1;
    return acc;
  }, {});

  return {
    totalActions: logs.length,
    recentActivity: logs.slice(0, 20),
    topActions: (Object.entries(actions) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    topCategories: (Object.entries(categories) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  };
}

/**
 * Get security events (failed logins, permission denials, etc.)
 */
export async function getSecurityEvents(companyId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const events = await (prisma as any).systemLog.findMany({
    where: {
      companyId,
      createdAt: { gte: startDate },
      OR: [
        { level: 'ERROR' },
        { level: 'CRITICAL' },
        { category: 'Auth' },
        { action: { contains: 'failed' } },
        { action: { contains: 'denied' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return events;
}

/**
 * Get audit trail for a specific resource
 */
export async function getResourceAuditTrail(resource: string, resourceId: string) {
  const logs = await (prisma as any).systemLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: { createdAt: 'desc' },
  });

  return logs;
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(companyId: string, startDate: Date, endDate: Date) {
  const logs = await (prisma as any).systemLog.findMany({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Critical events
  const criticalEvents = logs.filter((log: any) => log.level === 'CRITICAL');

  // Failed operations
  const failures = logs.filter((log: any) =>
    log.action.includes('failed') || log.level === 'ERROR'
  );

  // Data modifications
  const dataChanges = logs.filter((log: any) =>
    ['CREATE', 'UPDATE', 'DELETE'].some((action) => log.action.includes(action))
  );

  // User access
  const userAccess = logs.filter((log: any) => log.category === 'Auth');

  // Export operations
  const exports = logs.filter((log: any) => log.action.includes('export'));

  return {
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalEvents: logs.length,
      criticalEvents: criticalEvents.length,
      failures: failures.length,
      dataChanges: dataChanges.length,
      userAccessEvents: userAccess.length,
      exportOperations: exports.length,
    },
    criticalEvents: criticalEvents.slice(0, 50),
    recentFailures: failures.slice(0, 50),
    dataModifications: dataChanges.slice(0, 100),
    exportActivity: exports,
  };
}

/**
 * Clean old logs (data retention policy)
 */
export async function cleanOldLogs(retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await (prisma as any).systemLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      level: { in: ['DEBUG', 'INFO'] },
    },
  });

  console.log(`✓ Cleaned ${result.count} old logs (older than ${retentionDays} days)`);
  return result.count;
}

/**
 * Middleware helper to log API requests
 */
export function createAuditMiddleware() {
  return async (req: any, userId?: string, companyId?: string) => {
    const startTime = Date.now();

    const logData: SystemLogData = {
      userId,
      companyId,
      level: 'INFO',
      category: 'API',
      action: `${req.method} ${req.url}`,
      message: `API request to ${req.url}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
      metadata: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
      },
    };

    return {
      log: logData,
      finish: async (statusCode: number, error?: any) => {
        const duration = Date.now() - startTime;
        
        await logActivity({
          ...logData,
          level: error ? 'ERROR' : statusCode >= 400 ? 'WARNING' : 'INFO',
          duration,
          metadata: {
            ...logData.metadata,
            statusCode,
            error: error?.message,
          },
        });
      },
    };
  };
}

/**
 * Log data change with before/after snapshots
 */
export async function logDataChange(data: {
  companyId?: string;
  userId?: string;
  resource: string;
  resourceId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  before?: any;
  after?: any;
  changes?: Array<{ field: string; oldValue: any; newValue: any }>;
}) {
  return logActivity({
    companyId: data.companyId,
    userId: data.userId,
    level: 'INFO',
    category: 'Data',
    action: `${data.action}_${data.resource}`,
    resource: data.resource,
    resourceId: data.resourceId,
    message: `${data.action} ${data.resource} ${data.resourceId}`,
    metadata: {
      before: data.before,
      after: data.after,
      changes: data.changes,
    },
  });
}

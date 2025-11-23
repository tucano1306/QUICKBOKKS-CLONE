/**
 * FASE 10: Audit Logging Service
 * 
 * Comprehensive audit trail for compliance and security
 */

import { prisma } from './prisma';

export async function logAction(
  companyId: string,
  userId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  changes: any = null,
  metadata: any = null
) {
  return await (prisma as any).auditLog.create({
    data: {
      companyId,
      userId,
      action,
      resource,
      resourceId,
      changes: changes ? JSON.stringify(changes) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      severity: 'INFO',
      timestamp: new Date(),
    },
  });
}

export async function getAuditLogs(companyId: string, filters: any = {}) {
  const where: any = { companyId };
  
  if (filters.userId) where.userId = filters.userId;
  if (filters.resource) where.resource = filters.resource;
  if (filters.action) where.action = filters.action;
  if (filters.startDate) {
    where.timestamp = { gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    where.timestamp = { ...where.timestamp, lte: new Date(filters.endDate) };
  }
  
  return await (prisma as any).auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters.limit || 100,
  });
}

export async function getResourceHistory(resource: string, resourceId: string) {
  return await (prisma as any).auditLog.findMany({
    where: { resource, resourceId },
    orderBy: { timestamp: 'asc' },
  });
}

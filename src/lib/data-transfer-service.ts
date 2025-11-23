/**
 * FASE 10: Data Export/Import Service
 * 
 * Export data to CSV/Excel/PDF and import from QuickBooks/Xero
 */

import { prisma } from './prisma';

export async function createExport(
  companyId: string,
  userId: string,
  type: string,
  format: string,
  filters: any = null
) {
  return await (prisma as any).dataExport.create({
    data: {
      companyId,
      userId,
      type,
      format,
      filters: filters ? JSON.stringify(filters) : null,
      status: 'PENDING',
    },
  });
}

export async function getExportStatus(exportId: string) {
  return await (prisma as any).dataExport.findUnique({
    where: { id: exportId },
  });
}

export async function updateExportStatus(
  exportId: string,
  status: string,
  fileUrl: string | null = null,
  error: string | null = null
) {
  return await (prisma as any).dataExport.update({
    where: { id: exportId },
    data: {
      status,
      fileUrl,
      error,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });
}

export async function createImport(
  companyId: string,
  userId: string,
  source: string,
  fileUrl: string,
  fileSize: number
) {
  return await (prisma as any).dataImport.create({
    data: {
      companyId,
      userId,
      source,
      fileUrl,
      fileSize,
      status: 'PENDING',
    },
  });
}

export async function updateImportStatus(
  importId: string,
  status: string,
  importedCount: number | null = null,
  errorCount: number | null = null,
  errors: any = null
) {
  return await (prisma as any).dataImport.update({
    where: { id: importId },
    data: {
      status,
      importedCount,
      errorCount,
      errors: errors ? JSON.stringify(errors) : null,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });
}

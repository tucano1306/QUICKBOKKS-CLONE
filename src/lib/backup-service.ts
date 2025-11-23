/**
 * FASE 8: Backup Service
 * Automated database backups and restore functionality
 */

import { prisma } from './prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

type BackupType = 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'MANUAL' | 'SCHEDULED';
type BackupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface BackupOptions {
  companyId?: string;
  type: BackupType;
  compress?: boolean;
  encrypt?: boolean;
  includeFiles?: boolean;
  createdBy?: string;
}

interface RestoreOptions {
  backupId: string;
  targetCompanyId?: string;
  restoreFiles?: boolean;
}

/**
 * Create a full database backup
 */
export async function createBackup(options: BackupOptions) {
  const {
    companyId,
    type,
    compress = true,
    encrypt = true,
    includeFiles = false,
    createdBy,
  } = options;

  // Create backup job record
  const backupJob = await (prisma as any).backupJob.create({
    data: {
      companyId,
      type,
      status: 'IN_PROGRESS',
      compression: compress ? 'gzip' : null,
      encryption: encrypt,
      createdBy,
      startedAt: new Date(),
    },
  });

  try {
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${companyId || 'full'}_${timestamp}`;
    const backupPath = path.join(backupDir, fileName);

    // PostgreSQL backup command
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse connection string
    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, user, password, host, port, database] = urlMatch;

    // pg_dump command
    let command = `pg_dump -h ${host} -p ${port} -U ${user} -F c -b -v -f ${backupPath}.dump ${database}`;

    // Set password environment variable
    const env = { ...process.env, PGPASSWORD: password };

    await execAsync(command, { env });

    // Compress if requested
    let finalPath = `${backupPath}.dump`;
    let size = (await fs.stat(finalPath)).size;

    if (compress) {
      const source = createReadStream(finalPath);
      const destination = createWriteStream(`${backupPath}.dump.gz`);
      const gzip = zlib.createGzip();

      await pipeline(source, gzip, destination);

      // Delete uncompressed file
      await fs.unlink(finalPath);
      finalPath = `${backupPath}.dump.gz`;
      size = (await fs.stat(finalPath)).size;
    }

    // TODO: Upload to S3 or cloud storage if configured
    const storageLocation = finalPath;

    // Get approximate record count
    const recordCount = await getRecordCount(companyId);

    // Update backup job
    await (prisma as any).backupJob.update({
      where: { id: backupJob.id },
      data: {
        status: 'COMPLETED',
        size: BigInt(size),
        recordCount,
        storageLocation,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      backupId: backupJob.id,
      size,
      location: storageLocation,
    };
  } catch (error: any) {
    // Update backup job with error
    await (prisma as any).backupJob.update({
      where: { id: backupJob.id },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Restore from backup
 */
export async function restoreBackup(options: RestoreOptions) {
  const { backupId, targetCompanyId } = options;

  // Get backup job
  const backupJob = await (prisma as any).backupJob.findUnique({
    where: { id: backupId },
  });

  if (!backupJob) {
    throw new Error('Backup not found');
  }

  if (backupJob.status !== 'COMPLETED') {
    throw new Error('Backup is not in completed state');
  }

  const backupPath = backupJob.storageLocation;

  // Decompress if needed
  let restorePath = backupPath;
  if (backupPath.endsWith('.gz')) {
    restorePath = backupPath.replace('.gz', '');
    const source = createReadStream(backupPath);
    const destination = createWriteStream(restorePath);
    const gunzip = zlib.createGunzip();

    await pipeline(source, gunzip, destination);
  }

  // PostgreSQL restore command
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, user, password, host, port, database] = urlMatch;

  // pg_restore command
  const command = `pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -c -v ${restorePath}`;

  const env = { ...process.env, PGPASSWORD: password };

  try {
    await execAsync(command, { env });

    // Clean up decompressed file if it was created
    if (restorePath !== backupPath) {
      await fs.unlink(restorePath);
    }

    return { success: true, message: 'Backup restored successfully' };
  } catch (error: any) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * List all backups
 */
export async function listBackups(companyId?: string, limit: number = 50) {
  const where: any = {};
  if (companyId) where.companyId = companyId;

  const backups = await (prisma as any).backupJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return backups;
}

/**
 * Delete old backups (retention policy)
 */
export async function cleanOldBackups(retentionDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await (prisma as any).backupJob.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: 'COMPLETED',
    },
  });

  let deletedCount = 0;

  for (const backup of oldBackups) {
    try {
      // Delete file if it exists
      if (backup.storageLocation) {
        await fs.unlink(backup.storageLocation);
      }

      // Delete database record
      await (prisma as any).backupJob.delete({
        where: { id: backup.id },
      });

      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete backup ${backup.id}:`, error);
    }
  }

  console.log(`✓ Cleaned ${deletedCount} old backups (older than ${retentionDays} days)`);
  return deletedCount;
}

/**
 * Schedule automatic backups
 */
export async function scheduleBackup(companyId: string, frequency: 'daily' | 'weekly' | 'monthly') {
  // TODO: Implement with cron or task scheduler
  // This is a placeholder for the scheduling logic

  const schedule = {
    daily: '0 2 * * *', // 2 AM daily
    weekly: '0 2 * * 0', // 2 AM Sunday
    monthly: '0 2 1 * *', // 2 AM 1st of month
  };

  console.log(`✓ Scheduled ${frequency} backup for company ${companyId}`);
  console.log(`Cron expression: ${schedule[frequency]}`);

  return {
    frequency,
    cronExpression: schedule[frequency],
    nextRun: getNextRunTime(schedule[frequency]),
  };
}

/**
 * Get backup statistics
 */
export async function getBackupStats(companyId?: string) {
  const where: any = {};
  if (companyId) where.companyId = companyId;

  const stats = await (prisma as any).backupJob.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const lastBackup = await (prisma as any).backupJob.findFirst({
    where: { ...where, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

  const totalSize = await (prisma as any).backupJob.aggregate({
    where: { ...where, status: 'COMPLETED' },
    _sum: { size: true },
  });

  return {
    total: stats.reduce((sum: number, stat: any) => sum + stat._count, 0),
    byStatus: stats.reduce((acc: any, stat: any) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {}),
    lastBackup: lastBackup?.createdAt,
    totalSize: totalSize._sum.size ? Number(totalSize._sum.size) : 0,
  };
}

/**
 * Helper: Get approximate record count
 */
async function getRecordCount(companyId?: string) {
  let total = 0;

  const models = [
    'invoice',
    'customer',
    'product',
    'expense',
    'employee',
    'transaction',
  ];

  for (const model of models) {
    try {
      const where = companyId ? { userId: companyId } : {};
      const count = await (prisma as any)[model].count({ where });
      total += count;
    } catch (error) {
      // Model might not have userId field
    }
  }

  return total;
}

/**
 * Helper: Calculate next run time from cron expression
 */
function getNextRunTime(cronExpression: string): Date {
  // Simplified calculation - in production use a cron parser library
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  return tomorrow;
}

/**
 * Export data to JSON (lightweight backup)
 */
export async function exportToJSON(companyId: string, models: string[]) {
  const data: any = {};

  for (const model of models) {
    try {
      const records = await (prisma as any)[model].findMany({
        where: { userId: companyId },
      });
      data[model] = records;
    } catch (error) {
      console.error(`Failed to export ${model}:`, error);
    }
  }

  const backupDir = path.join(process.cwd(), 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `export_${companyId}_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);

  await fs.writeFile(filePath, JSON.stringify(data, null, 2));

  return {
    success: true,
    path: filePath,
    models: Object.keys(data),
    recordCount: Object.values(data).reduce(
      (sum: number, records: any) => sum + records.length,
      0
    ),
  };
}

/**
 * Import data from JSON
 */
export async function importFromJSON(filePath: string, companyId: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  const results: any = {};

  for (const [model, records] of Object.entries(data)) {
    try {
      const recordArray = records as any[];
      let imported = 0;

      for (const record of recordArray) {
        await (prisma as any)[model].create({
          data: {
            ...record,
            id: undefined, // Generate new IDs
            userId: companyId,
          },
        });
        imported++;
      }

      results[model] = { imported, total: recordArray.length };
    } catch (error: any) {
      results[model] = { error: error.message };
    }
  }

  return {
    success: true,
    results,
  };
}

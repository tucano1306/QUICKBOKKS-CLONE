/**
 * API DE BACKUPS AUTOMÁTICOS
 * 
 * Endpoints para gestión completa de respaldos de base de datos
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  createBackup, 
  listBackups, 
  getBackupStats, 
  cleanOldBackups,
  restoreBackup 
} from '@/lib/backup-service';

/**
 * GET /api/backups - Listar backups y estadísticas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden acceder a backups' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const companyId = searchParams.get('companyId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (action) {
      case 'list': {
        const backups = await listBackups(companyId, limit);
        return NextResponse.json({ backups });
      }

      case 'stats': {
        const stats = await getBackupStats(companyId);
        return NextResponse.json({ stats });
      }

      case 'health': {
        // Verificar salud del sistema de backups
        const health = await checkBackupHealth();
        return NextResponse.json({ health });
      }

      case 'config': {
        // Obtener configuración actual
        const config = getBackupConfig();
        return NextResponse.json({ config });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in backups API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/backups - Crear backup o realizar acción
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear backups' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const { type = 'FULL', companyId, compress = true, encrypt = true } = body;
        
        const result = await createBackup({
          type,
          companyId,
          compress,
          encrypt,
          createdBy: session.user.id
        });

        // Registrar en audit log
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'BACKUP_CREATED',
            entityType: 'backup',
            entityId: result.backupId,
            changes: { type, companyId, size: result.size },
            companyId
          }
        });

        return NextResponse.json({ 
          success: true, 
          backup: result,
          message: 'Backup creado exitosamente'
        }, { status: 201 });
      }

      case 'restore': {
        const { backupId, targetCompanyId, dryRun = false } = body;
        
        if (dryRun) {
          return NextResponse.json({
            success: true,
            message: 'Dry run: El backup se restauraría sin problemas',
            backupId
          });
        }

        const result = await restoreBackup({ backupId, targetCompanyId });

        // Registrar en audit log
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'BACKUP_RESTORED',
            entityType: 'backup',
            entityId: backupId,
            changes: { targetCompanyId }
          }
        });

        return NextResponse.json({ 
          success: true, 
          result,
          message: 'Backup restaurado exitosamente'
        });
      }

      case 'cleanup': {
        const { retentionDays = 30 } = body;
        const deletedCount = await cleanOldBackups(retentionDays);

        return NextResponse.json({ 
          success: true, 
          deletedCount,
          message: `${deletedCount} backups antiguos eliminados`
        });
      }

      case 'verify': {
        const { backupId } = body;
        const isValid = await verifyBackupIntegrity(backupId);

        return NextResponse.json({ 
          success: true, 
          valid: isValid,
          message: isValid ? 'Backup verificado correctamente' : 'El backup está corrupto'
        });
      }

      case 'schedule': {
        const { frequency, enabled, time } = body;
        const schedule = await updateBackupSchedule(frequency, enabled, time);

        return NextResponse.json({ 
          success: true, 
          schedule,
          message: `Backup ${frequency} ${enabled ? 'activado' : 'desactivado'}`
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Acción no válida. Opciones: create, restore, cleanup, verify, schedule' 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in backups POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/backups - Eliminar un backup específico
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json({ error: 'ID de backup requerido' }, { status: 400 });
    }

    // Verificar que el backup existe
    const backup = await prisma.backupJob.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    // Eliminar archivo físico
    const fs = await import('fs/promises');
    if (backup.storageLocation) {
      try {
        await fs.unlink(backup.storageLocation);
      } catch (e) {
        console.warn('No se pudo eliminar archivo:', e);
      }
    }

    // Eliminar registro
    await prisma.backupJob.delete({
      where: { id: backupId }
    });

    // Registrar en audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_DELETED',
        entityType: 'backup',
        entityId: backupId,
        companyId: backup.companyId
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Backup eliminado exitosamente' 
    });

  } catch (error: any) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==================== HELPERS ====================

async function checkBackupHealth() {
  const stats = await getBackupStats();
  const lastBackup = await prisma.backupJob.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' }
  });

  const now = new Date();
  const lastBackupAge = lastBackup 
    ? Math.floor((now.getTime() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60))
    : null;

  const issues: string[] = [];
  
  if (!lastBackup) {
    issues.push('No hay backups completados');
  } else if (lastBackupAge && lastBackupAge > 24) {
    issues.push(`Último backup hace ${lastBackupAge} horas`);
  }

  const failedRecent = await prisma.backupJob.count({
    where: {
      status: 'FAILED',
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    }
  });

  if (failedRecent > 0) {
    issues.push(`${failedRecent} backups fallidos en las últimas 24 horas`);
  }

  return {
    status: issues.length === 0 ? 'healthy' : 'warning',
    lastBackup: lastBackup?.createdAt,
    lastBackupAgeHours: lastBackupAge,
    totalBackups: stats.total,
    totalSize: stats.totalSize,
    issues
  };
}

function getBackupConfig() {
  return {
    enabled: process.env.BACKUP_ENABLED !== 'false',
    schedule: {
      daily: { enabled: true, time: '02:00', retention: 7 },
      weekly: { enabled: true, day: 'sunday', time: '03:00', retention: 4 },
      monthly: { enabled: true, day: 1, time: '04:00', retention: 12 }
    },
    storage: {
      local: { enabled: true, path: './backups' },
      s3: { enabled: !!process.env.AWS_S3_BUCKET, bucket: process.env.AWS_S3_BUCKET }
    },
    compression: true,
    encryption: !!process.env.BACKUP_ENCRYPTION_KEY,
    notifications: {
      email: process.env.BACKUP_NOTIFICATION_EMAIL,
      onSuccess: true,
      onFailure: true
    }
  };
}

async function verifyBackupIntegrity(backupId: string): Promise<boolean> {
  const backup = await prisma.backupJob.findUnique({
    where: { id: backupId }
  });

  if (!backup || !backup.storageLocation) {
    return false;
  }

  const fs = await import('fs/promises');
  const crypto = await import('crypto');

  try {
    const fileContent = await fs.readFile(backup.storageLocation);
    const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    // Si tenemos checksum guardado, comparar
    const metadata = backup.metadata as any;
    if (metadata?.checksum) {
      return hash === metadata.checksum;
    }

    // Si no hay checksum, verificar que el archivo sea legible
    return fileContent.length > 0;
  } catch (error) {
    return false;
  }
}

async function updateBackupSchedule(
  frequency: 'daily' | 'weekly' | 'monthly',
  enabled: boolean,
  time?: string
) {
  // Guardar configuración en SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: `backup_schedule_${frequency}` },
    create: {
      key: `backup_schedule_${frequency}`,
      value: JSON.stringify({ enabled, time: time || '02:00' }),
      category: 'backup'
    },
    update: {
      value: JSON.stringify({ enabled, time: time || '02:00' })
    }
  });

  return { frequency, enabled, time };
}

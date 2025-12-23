/**
 * SCHEDULER DE BACKUPS AUTOMÁTICOS
 * 
 * Sistema de programación de backups con:
 * - Cron jobs para backups diarios, semanales y mensuales
 * - Monitoreo de salud del sistema
 * - Notificaciones automáticas
 * - Limpieza de backups antiguos
 */

import { createBackup, cleanOldBackups, getBackupStats } from './backup-service';
import { prisma } from './prisma';

// ==================== TIPOS ====================

interface ScheduleConfig {
  daily: { enabled: boolean; time: string; retention: number };
  weekly: { enabled: boolean; dayOfWeek: number; time: string; retention: number };
  monthly: { enabled: boolean; dayOfMonth: number; time: string; retention: number };
}

interface BackupJob {
  id: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  nextRun: Date;
  lastRun?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// ==================== CONFIGURACIÓN ====================

const DEFAULT_SCHEDULE: ScheduleConfig = {
  daily: { enabled: true, time: '02:00', retention: 7 },
  weekly: { enabled: true, dayOfWeek: 0, time: '03:00', retention: 4 }, // Domingo
  monthly: { enabled: true, dayOfMonth: 1, time: '04:00', retention: 12 }
};

// ==================== ESTADO GLOBAL ====================

let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
const scheduledJobs: Map<string, BackupJob> = new Map();

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Inicia el scheduler de backups
 */
export function startBackupScheduler() {
  if (schedulerRunning) {
    console.log('⚠️ Backup scheduler ya está corriendo');
    return;
  }

  console.log('🚀 Iniciando scheduler de backups automáticos...');
  schedulerRunning = true;

  // Calcular próximas ejecuciones
  initializeScheduledJobs();

  // Verificar cada minuto si hay que ejecutar algún backup
  schedulerInterval = setInterval(async () => {
    await checkAndExecuteScheduledBackups();
  }, 60000); // 1 minuto

  // Ejecutar limpieza diaria a las 05:00
  scheduleCleanup();

  console.log('✅ Backup scheduler iniciado');
  logNextScheduledBackups();
}

/**
 * Detiene el scheduler de backups
 */
export function stopBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerRunning = false;
  scheduledJobs.clear();
  console.log('⏹️ Backup scheduler detenido');
}

/**
 * Obtiene el estado del scheduler
 */
export function getSchedulerStatus() {
  return {
    running: schedulerRunning,
    jobs: Array.from(scheduledJobs.values()),
    config: DEFAULT_SCHEDULE
  };
}

// ==================== FUNCIONES INTERNAS ====================

/**
 * Inicializa los jobs programados
 */
function initializeScheduledJobs() {
  const schedule = DEFAULT_SCHEDULE;

  // Job diario
  if (schedule.daily.enabled) {
    const nextRun = calculateNextRun('daily', schedule.daily.time);
    scheduledJobs.set('daily', {
      id: 'daily',
      schedule: 'daily',
      nextRun,
      status: 'pending'
    });
  }

  // Job semanal
  if (schedule.weekly.enabled) {
    const nextRun = calculateNextRunWeekly(schedule.weekly.dayOfWeek, schedule.weekly.time);
    scheduledJobs.set('weekly', {
      id: 'weekly',
      schedule: 'weekly',
      nextRun,
      status: 'pending'
    });
  }

  // Job mensual
  if (schedule.monthly.enabled) {
    const nextRun = calculateNextRunMonthly(schedule.monthly.dayOfMonth, schedule.monthly.time);
    scheduledJobs.set('monthly', {
      id: 'monthly',
      schedule: 'monthly',
      nextRun,
      status: 'pending'
    });
  }
}

/**
 * Calcula la próxima ejecución diaria
 */
function calculateNextRun(schedule: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Calcula la próxima ejecución semanal
 */
function calculateNextRunWeekly(dayOfWeek: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  
  next.setHours(hours, minutes, 0, 0);
  
  // Calcular días hasta el próximo día de la semana
  const daysUntil = (dayOfWeek - next.getDay() + 7) % 7;
  
  if (daysUntil === 0 && next <= now) {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + daysUntil);
  }
  
  return next;
}

/**
 * Calcula la próxima ejecución mensual
 */
function calculateNextRunMonthly(dayOfMonth: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  
  next.setDate(dayOfMonth);
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }
  
  // Ajustar si el día no existe en el mes (ej: 31 en febrero)
  while (next.getDate() !== dayOfMonth) {
    next.setDate(next.getDate() - 1);
  }
  
  return next;
}

/**
 * Verifica y ejecuta backups programados
 */
async function checkAndExecuteScheduledBackups() {
  const now = new Date();

  for (const [, job] of scheduledJobs) {
    if (job.status === 'pending' && job.nextRun <= now) {
      await executeScheduledBackup(job);
    }
  }
}

/**
 * Ejecuta un backup programado
 */
async function executeScheduledBackup(job: BackupJob) {
  console.log(`\n🔄 Ejecutando backup ${job.schedule}...`);
  job.status = 'running';

  try {
    const result = await createBackup({
      type: 'SCHEDULED',
      compress: true,
      encrypt: true
    });

    job.status = 'completed';
    job.lastRun = new Date();
    
    console.log(`✅ Backup ${job.schedule} completado: ${result.backupId}`);
    
    // Enviar notificación de éxito
    await sendBackupNotification(job.schedule, 'success', result);

    // Limpiar backups antiguos según política de retención
    const retention = DEFAULT_SCHEDULE[job.schedule].retention;
    if (job.schedule === 'daily') {
      await cleanOldBackups(retention);
    }

  } catch (error: any) {
    job.status = 'failed';
    console.error(`❌ Backup ${job.schedule} falló:`, error.message);
    
    // Enviar notificación de fallo
    await sendBackupNotification(job.schedule, 'failure', null, error.message);
  }

  // Programar próxima ejecución
  rescheduleJob(job);
}

/**
 * Reprograma un job para la próxima ejecución
 */
function rescheduleJob(job: BackupJob) {
  const schedule = DEFAULT_SCHEDULE[job.schedule];
  
  switch (job.schedule) {
    case 'daily':
      job.nextRun = calculateNextRun('daily', schedule.time);
      break;
    case 'weekly':
      job.nextRun = calculateNextRunWeekly(
        (schedule as typeof DEFAULT_SCHEDULE.weekly).dayOfWeek, 
        schedule.time
      );
      break;
    case 'monthly':
      job.nextRun = calculateNextRunMonthly(
        (schedule as typeof DEFAULT_SCHEDULE.monthly).dayOfMonth, 
        schedule.time
      );
      break;
  }
  
  job.status = 'pending';
  console.log(`📅 Próximo backup ${job.schedule}: ${job.nextRun.toLocaleString()}`);
}

/**
 * Programa la limpieza diaria de backups
 */
function scheduleCleanup() {
  const now = new Date();
  const cleanupTime = new Date(now);
  cleanupTime.setHours(5, 0, 0, 0);
  
  if (cleanupTime <= now) {
    cleanupTime.setDate(cleanupTime.getDate() + 1);
  }

  const msUntilCleanup = cleanupTime.getTime() - now.getTime();

  setTimeout(async () => {
    console.log('\n🧹 Ejecutando limpieza de backups antiguos...');
    
    try {
      const dailyDeleted = await cleanOldBackups(DEFAULT_SCHEDULE.daily.retention);
      const weeklyDeleted = await cleanOldBackups(DEFAULT_SCHEDULE.weekly.retention * 7);
      const monthlyDeleted = await cleanOldBackups(DEFAULT_SCHEDULE.monthly.retention * 30);
      
      console.log(`✅ Limpieza completada: ${dailyDeleted + weeklyDeleted + monthlyDeleted} backups eliminados`);
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
    }

    // Reprogramar para mañana
    scheduleCleanup();
  }, msUntilCleanup);
}

/**
 * Envía notificación del estado del backup
 */
async function sendBackupNotification(
  schedule: string, 
  status: 'success' | 'failure',
  result?: any,
  error?: string
) {
  const notificationEmail = process.env.BACKUP_NOTIFICATION_EMAIL;
  const webhookUrl = process.env.BACKUP_WEBHOOK_URL;

  const message = status === 'success'
    ? `✅ Backup ${schedule} completado exitosamente. Tamaño: ${formatBytes(result?.size || 0)}`
    : `❌ Backup ${schedule} falló: ${error}`;

  // Log del sistema
  try {
    await prisma.systemLog.create({
      data: {
        level: status === 'success' ? 'INFO' : 'ERROR',
        category: 'backup',
        action: status === 'success' ? 'BACKUP_COMPLETED' : 'BACKUP_FAILED',
        resource: 'backup-scheduler',
        message,
        metadata: {
          schedule,
          status,
          result,
          error
        }
      }
    });
  } catch (e) {
    console.error('Error logging to database:', e);
  }

  // Email notification
  if (notificationEmail) {
    try {
      // Usar servicio de email interno
      await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: notificationEmail,
          subject: `[COMPUTOPLUS] Backup ${schedule} - ${status.toUpperCase()}`,
          text: message
        })
      });
    } catch (e) {
      console.error('Error sending email notification:', e);
    }
  }

  // Webhook notification
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: `backup.${status}`,
          schedule,
          timestamp: new Date().toISOString(),
          result,
          error
        })
      });
    } catch (e) {
      console.error('Error sending webhook notification:', e);
    }
  }
}

/**
 * Muestra los próximos backups programados
 */
function logNextScheduledBackups() {
  console.log('\n📅 Próximos backups programados:');
  
  const sortedJobs = Array.from(scheduledJobs.values())
    .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());

  for (const job of sortedJobs) {
    const timeUntil = formatTimeUntil(job.nextRun);
    console.log(`   ${job.schedule.padEnd(8)} → ${job.nextRun.toLocaleString()} (en ${timeUntil})`);
  }
}

/**
 * Formatea bytes a formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Formatea tiempo hasta una fecha
 */
function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} día${days > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${minutes}m`;
}

// ==================== EJECUTAR BACKUP MANUAL ====================

/**
 * Ejecuta un backup manual inmediato
 */
export async function runManualBackup(companyId?: string): Promise<any> {
  console.log('🔄 Ejecutando backup manual...');
  
  try {
    const result = await createBackup({
      type: 'MANUAL',
      companyId,
      compress: true,
      encrypt: true
    });

    console.log('✅ Backup manual completado:', result.backupId);
    await sendBackupNotification('manual', 'success', result);
    
    return result;
  } catch (error: any) {
    console.error('❌ Backup manual falló:', error.message);
    await sendBackupNotification('manual', 'failure', null, error.message);
    throw error;
  }
}

// ==================== HEALTH CHECK ====================

/**
 * Verifica la salud del sistema de backups
 */
export async function checkBackupSystemHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  lastBackup: Date | null;
  nextBackup: Date | null;
  issues: string[];
  stats: any;
}> {
  const issues: string[] = [];
  const stats = await getBackupStats();

  // Obtener último backup exitoso
  const lastBackup = await prisma.backupJob.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' }
  });

  // Verificar antigüedad del último backup
  if (lastBackup) {
    const hoursSinceLastBackup = (Date.now() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastBackup > 48) {
      issues.push(`Último backup hace ${Math.floor(hoursSinceLastBackup)} horas`);
    }
  } else {
    issues.push('No hay backups completados');
  }

  // Verificar backups fallidos recientes
  const recentFailed = await prisma.backupJob.count({
    where: {
      status: 'FAILED',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (recentFailed > 0) {
    issues.push(`${recentFailed} backup(s) fallido(s) en las últimas 24 horas`);
  }

  // Verificar espacio de almacenamiento
  // Storage space verification is handled by cloud providers

  // Próximo backup programado
  const nextBackupJob = Array.from(scheduledJobs.values())
    .filter(j => j.status === 'pending')
    .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())[0];

  const getHealthStatus = (issueCount: number) => {
    if (issueCount === 0) return 'healthy'
    if (issueCount > 1) return 'critical'
    return 'warning'
  }

  return {
    status: getHealthStatus(issues.length),
    lastBackup: lastBackup?.createdAt || null,
    nextBackup: nextBackupJob?.nextRun || null,
    issues,
    stats
  };
}

// ==================== INICIALIZACIÓN AUTOMÁTICA ====================

// Iniciar scheduler si está habilitado
if (process.env.BACKUP_SCHEDULER_ENABLED === 'true') {
  // Esperar a que la aplicación inicie
  setTimeout(() => {
    startBackupScheduler();
  }, 5000);
}

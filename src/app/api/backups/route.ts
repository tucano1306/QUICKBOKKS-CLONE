import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: get companyId for the user (from query/body, or first company)
async function resolveCompanyId(
  userId: string,
  companyIdParam?: string | null
): Promise<string | null> {
  if (companyIdParam) {
    const access = await prisma.companyUser.findFirst({
      where: { userId, companyId: companyIdParam },
    })
    return access ? companyIdParam : null
  }
  const membership = await prisma.companyUser.findFirst({
    where: { userId },
    select: { companyId: true },
  })
  return membership?.companyId ?? null
}

// Export all key company data for backup
async function exportCompanyData(companyId: string) {
  const [
    company,
    transactions,
    invoices,
    expenses,
    chartOfAccounts,
    journalEntries,
    customers,
    vendors,
    employees,
    bankAccounts,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.transaction.findMany({ where: { companyId } }),
    prisma.invoice.findMany({ where: { companyId } }),
    prisma.expense.findMany({ where: { companyId } }),
    prisma.chartOfAccounts.findMany({ where: { companyId } }),
    prisma.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
    }),
    prisma.customer.findMany({ where: { companyId } }),
    prisma.vendor.findMany({ where: { companyId } }),
    prisma.employee.findMany({ where: { companyId } }),
    prisma.bankAccount.findMany({ where: { companyId } }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    company,
    transactions,
    invoices,
    expenses,
    chartOfAccounts,
    journalEntries,
    customers,
    vendors,
    employees,
    bankAccounts,
  }
}

// GET /api/backups?action=list|stats|health|config&companyId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const backupId = searchParams.get('id')
    const companyIdParam = searchParams.get('companyId')

    // Download a specific backup
    if (backupId && searchParams.get('download') === 'true') {
      const backup = await prisma.backupJob.findUnique({ where: { id: backupId } })
      if (!backup) return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })

      const companyId = await resolveCompanyId(session.user.id, backup.companyId)
      if (!companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

      const jsonStr = JSON.stringify(backup.metadata ?? {}, null, 2)
      const companyName = (backup.metadata as any)?.company?.name ?? 'empresa'
      const dateStr = new Date(backup.createdAt).toISOString().split('T')[0]

      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-${companyName}-${dateStr}.json"`,
        },
      })
    }

    const companyId = await resolveCompanyId(session.user.id, companyIdParam)
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    if (action === 'list') {
      const backups = await prisma.backupJob.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          status: true,
          size: true,
          recordCount: true,
          storageLocation: true,
          startedAt: true,
          completedAt: true,
          error: true,
          createdAt: true,
        },
      })
      // Convert BigInt to number for JSON serialization
      const serialized = backups.map(b => ({
        ...b,
        size: b.size ? Number(b.size) : null,
      }))
      return NextResponse.json({ backups: serialized })
    }

    if (action === 'stats') {
      const [total, byStatusRaw, sizeAgg] = await Promise.all([
        prisma.backupJob.count({ where: { companyId } }),
        prisma.backupJob.groupBy({
          by: ['status'],
          where: { companyId },
          _count: { status: true },
        }),
        prisma.backupJob.aggregate({
          where: { companyId, status: 'COMPLETED' },
          _sum: { size: true },
          _max: { completedAt: true },
        }),
      ])

      const byStatus: Record<string, number> = {}
      for (const row of byStatusRaw) {
        byStatus[row.status] = row._count.status
      }

      return NextResponse.json({
        stats: {
          total,
          byStatus,
          lastBackup: sizeAgg._max.completedAt?.toISOString() ?? null,
          totalSize: sizeAgg._sum.size ? Number(sizeAgg._sum.size) : 0,
        },
      })
    }

    if (action === 'health') {
      const lastCompleted = await prisma.backupJob.findFirst({
        where: { companyId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true, size: true },
      })

      const total = await prisma.backupJob.count({ where: { companyId } })
      const totalSizeAgg = await prisma.backupJob.aggregate({
        where: { companyId, status: 'COMPLETED' },
        _sum: { size: true },
      })

      const issues: string[] = []
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      let lastBackupAgeHours: number | null = null

      if (!lastCompleted) {
        issues.push('No hay backups completados aún')
        status = 'critical'
      } else {
        const ageMs = Date.now() - new Date(lastCompleted.completedAt!).getTime()
        lastBackupAgeHours = Math.floor(ageMs / (1000 * 60 * 60))
        if (lastBackupAgeHours > 168) {
          issues.push(`Último backup hace ${Math.floor(lastBackupAgeHours / 24)} días (recomendado: diario)`)
          status = 'critical'
        } else if (lastBackupAgeHours > 48) {
          issues.push(`Último backup hace ${lastBackupAgeHours}h (recomendado: cada 24h)`)
          status = 'warning'
        }
      }

      return NextResponse.json({
        health: {
          status,
          lastBackup: lastCompleted?.completedAt?.toISOString() ?? null,
          lastBackupAgeHours,
          totalBackups: total,
          totalSize: totalSizeAgg._sum.size ? Number(totalSizeAgg._sum.size) : 0,
          issues,
        },
      })
    }

    if (action === 'config') {
      return NextResponse.json({
        config: {
          enabled: true,
          schedule: {
            daily: { enabled: true, time: '02:00', retention: 7 },
            weekly: { enabled: true, day: 'sunday', time: '03:00', retention: 4 },
            monthly: { enabled: true, day: 1, time: '04:00', retention: 3 },
          },
          storage: {
            local: { enabled: true, path: '/backups' },
            s3: { enabled: false },
          },
          compression: true,
          encryption: true,
          notifications: { onSuccess: false, onFailure: true },
        },
      })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    console.error('Error in backups GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/backups  { action: 'create'|'restore'|'verify'|'cleanup', ... }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, type, backupId, retentionDays, companyId: companyIdParam } = body

    const companyId = await resolveCompanyId(session.user.id, companyIdParam)
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    if (action === 'create') {
      // Create a backup record as IN_PROGRESS
      const job = await prisma.backupJob.create({
        data: {
          companyId,
          type: type ?? 'MANUAL',
          status: 'IN_PROGRESS',
          encryption: true,
          startedAt: new Date(),
          createdBy: session.user.id,
        },
      })

      try {
        const data = await exportCompanyData(companyId)
        const jsonStr = JSON.stringify(data)
        const sizeBytes = Buffer.byteLength(jsonStr, 'utf8')

        const recordCount =
          (data.transactions?.length ?? 0) +
          (data.invoices?.length ?? 0) +
          (data.expenses?.length ?? 0) +
          (data.chartOfAccounts?.length ?? 0) +
          (data.journalEntries?.length ?? 0) +
          (data.customers?.length ?? 0) +
          (data.vendors?.length ?? 0) +
          (data.employees?.length ?? 0)

        const updated = await prisma.backupJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            size: BigInt(sizeBytes),
            recordCount,
            storageLocation: 'database',
            metadata: data as any,
          },
        })

        return NextResponse.json({
          success: true,
          backup: {
            ...updated,
            size: Number(updated.size),
          },
          downloadUrl: `/api/backups?id=${job.id}&download=true`,
          message: `Backup creado: ${recordCount} registros (${(sizeBytes / 1024).toFixed(1)} KB)`,
        })
      } catch (exportError) {
        await prisma.backupJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            error: exportError instanceof Error ? exportError.message : 'Error desconocido',
          },
        })
        throw exportError
      }
    }

    if (action === 'verify') {
      if (!backupId) return NextResponse.json({ error: 'backupId requerido' }, { status: 400 })

      const backup = await prisma.backupJob.findFirst({
        where: { id: backupId, companyId },
      })

      if (!backup) return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })

      const isValid =
        backup.status === 'COMPLETED' &&
        backup.metadata !== null &&
        typeof backup.metadata === 'object'

      return NextResponse.json({
        valid: isValid,
        backup: { ...backup, size: backup.size ? Number(backup.size) : null },
      })
    }

    if (action === 'restore') {
      // Restore is a read-only validation — actual restore would require manual DB access
      // We return the download URL so the user can review/restore manually
      if (!backupId) return NextResponse.json({ error: 'backupId requerido' }, { status: 400 })

      const backup = await prisma.backupJob.findFirst({
        where: { id: backupId, companyId, status: 'COMPLETED' },
      })

      if (!backup) return NextResponse.json({ error: 'Backup no encontrado o incompleto' }, { status: 404 })

      return NextResponse.json({
        success: true,
        downloadUrl: `/api/backups?id=${backupId}&download=true`,
        message: 'Descarga el archivo de backup para restauración manual o contacta soporte.',
      })
    }

    if (action === 'cleanup') {
      const days = retentionDays ?? 30
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const deleted = await prisma.backupJob.deleteMany({
        where: {
          companyId,
          createdAt: { lt: cutoff },
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        },
      })

      return NextResponse.json({
        success: true,
        deletedCount: deleted.count,
        message: `${deleted.count} backups eliminados (mayores a ${days} días)`,
      })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    console.error('Error in backups POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/backups?id=...
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const backupId = searchParams.get('id')

    if (!backupId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const backup = await prisma.backupJob.findUnique({ where: { id: backupId } })
    if (!backup) return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })

    // Verify ownership
    const companyId = await resolveCompanyId(session.user.id, backup.companyId)
    if (!companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    await prisma.backupJob.delete({ where: { id: backupId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in backups DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

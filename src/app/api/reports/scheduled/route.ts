
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get scheduled reports from audit log or create default list
    // In production, this would be from a ScheduledReport table
    
    // Get recent report generations from audit log
    const recentReports = await prisma.auditLog.findMany({
      where: {
        companyId,
        action: { contains: 'report' }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    })

    // Default scheduled reports
    const scheduledReports = [
      {
        id: 'SR-001',
        name: 'Estado de Resultados Mensual',
        type: 'income-statement',
        frequency: 'monthly',
        recipients: ['contabilidad@empresa.com'],
        format: 'pdf',
        lastRun: recentReports.find(r => r.entityType === 'income-statement')?.timestamp?.toISOString() || null,
        nextRun: getNextRunDate('monthly'),
        status: 'active'
      },
      {
        id: 'SR-002',
        name: 'Balance General Trimestral',
        type: 'balance-sheet',
        frequency: 'quarterly',
        recipients: ['gerencia@empresa.com', 'contabilidad@empresa.com'],
        format: 'pdf',
        lastRun: recentReports.find(r => r.entityType === 'balance-sheet')?.timestamp?.toISOString() || null,
        nextRun: getNextRunDate('quarterly'),
        status: 'active'
      },
      {
        id: 'SR-003',
        name: 'Reporte de Flujo de Caja Semanal',
        type: 'cash-flow',
        frequency: 'weekly',
        recipients: ['tesoreria@empresa.com'],
        format: 'excel',
        lastRun: recentReports.find(r => r.entityType === 'cash-flow')?.timestamp?.toISOString() || null,
        nextRun: getNextRunDate('weekly'),
        status: 'active'
      },
      {
        id: 'SR-004',
        name: 'Cuentas por Cobrar Vencidas',
        type: 'accounts-receivable',
        frequency: 'daily',
        recipients: ['cobranza@empresa.com'],
        format: 'excel',
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        nextRun: getNextRunDate('daily'),
        status: 'active'
      },
      {
        id: 'SR-005',
        name: 'Reporte de Impuestos Mensual',
        type: 'tax-report',
        frequency: 'monthly',
        recipients: ['fiscal@empresa.com'],
        format: 'pdf',
        lastRun: recentReports.find(r => r.entityType === 'tax')?.timestamp?.toISOString() || null,
        nextRun: getNextRunDate('monthly'),
        status: 'active'
      }
    ]

    // Summary
    const summary = {
      total: scheduledReports.length,
      active: scheduledReports.filter(r => r.status === 'active').length,
      paused: scheduledReports.filter(r => r.status === 'paused').length,
      daily: scheduledReports.filter(r => r.frequency === 'daily').length,
      weekly: scheduledReports.filter(r => r.frequency === 'weekly').length,
      monthly: scheduledReports.filter(r => r.frequency === 'monthly').length,
      quarterly: scheduledReports.filter(r => r.frequency === 'quarterly').length
    }

    return NextResponse.json({ 
      reports: scheduledReports,
      summary
    })

  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json({ error: 'Error fetching reports' }, { status: 500 })
  }
}

function getNextRunDate(frequency: string): string {
  const now = new Date()
  let next: Date

  switch (frequency) {
    case 'daily':
      next = new Date(now.getTime() + 86400000)
      break
    case 'weekly':
      next = new Date(now.getTime() + 7 * 86400000)
      break
    case 'monthly':
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      break
    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3)
      next = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1)
      break
    default:
      next = new Date(now.getTime() + 86400000)
  }

  return next.toISOString()
}

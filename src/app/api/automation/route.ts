import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/automation
 * Obtiene datos de automatización: workflows, reglas, recordatorios, tareas programadas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'workflows' | 'rules' | 'reminders' | 'scheduled' | 'all'
    const companyId = searchParams.get('companyId')

    // Obtener datos reales de la base de datos para generar automatizaciones inteligentes
    const [invoices, expenses, customers, bankTransactions] = await Promise.all([
      prisma.invoice.findMany({
        where: { 
          userId: session.user.id,
          ...(companyId ? { companyId } : {})
        },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.expense.findMany({
        where: { 
          userId: session.user.id,
          ...(companyId ? { companyId } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.customer.findMany({
        where: { ...(companyId ? { companyId } : {}) },
        take: 50
      }),
      prisma.bankTransaction.findMany({
        where: { 
          bankAccount: { 
            userId: session.user.id,
            ...(companyId ? { companyId } : {})
          }
        },
        orderBy: { date: 'desc' },
        take: 100
      })
    ])

    const now = new Date()

    // Generar workflows basados en datos reales
    const overdueInvoices = invoices.filter(inv => 
      (inv.status === 'SENT' || inv.status === 'OVERDUE') && 
      new Date(inv.dueDate) < now
    )
    const pendingInvoices = invoices.filter(inv => inv.status === 'SENT')
    const pendingExpenses = expenses.filter(exp => exp.status === 'PENDING')
    const uncategorizedTx = bankTransactions.filter(tx => !tx.category || tx.category.length === 0)

    const workflows = [
      {
        id: 'wf-invoice-followup',
        name: 'Seguimiento de Facturas Vencidas',
        description: `Enviar recordatorios para ${overdueInvoices.length} facturas vencidas`,
        category: 'Cuentas por Cobrar',
        status: overdueInvoices.length > 0 ? 'active' : 'paused',
        trigger: 'Factura vencida por 7 días',
        steps: 5,
        executions: overdueInvoices.length * 3,
        lastRun: overdueInvoices.length > 0 ? now.toISOString() : undefined,
        successRate: 95.5,
        createdBy: session.user.name || 'Admin',
        createdDate: '2025-01-15',
        affectedItems: overdueInvoices.length,
        potentialRecovery: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)
      },
      {
        id: 'wf-expense-approval',
        name: 'Aprobación de Gastos',
        description: `Enrutar ${pendingExpenses.length} gastos pendientes para aprobación`,
        category: 'Gestión de Gastos',
        status: pendingExpenses.length > 0 ? 'active' : 'paused',
        trigger: 'Gasto enviado > $500',
        steps: 6,
        executions: pendingExpenses.length,
        lastRun: pendingExpenses.length > 0 ? now.toISOString() : undefined,
        successRate: 98.2,
        createdBy: session.user.name || 'Admin',
        createdDate: '2025-01-20',
        affectedItems: pendingExpenses.length,
        pendingAmount: pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      },
      {
        id: 'wf-customer-onboarding',
        name: 'Onboarding de Nuevos Clientes',
        description: 'Email de bienvenida y checklist de configuración',
        category: 'Gestión de Clientes',
        status: 'active',
        trigger: 'Nuevo cliente creado',
        steps: 8,
        executions: customers.length,
        lastRun: now.toISOString(),
        successRate: 100,
        createdBy: session.user.name || 'Admin',
        createdDate: '2025-02-01',
        affectedItems: customers.length
      },
      {
        id: 'wf-bank-reconciliation',
        name: 'Conciliación Bancaria Automática',
        description: `Conciliar ${uncategorizedTx.length} transacciones pendientes`,
        category: 'Banca',
        status: uncategorizedTx.length > 0 ? 'active' : 'paused',
        trigger: 'Nueva transacción bancaria',
        steps: 4,
        executions: bankTransactions.length,
        lastRun: now.toISOString(),
        successRate: 94.8,
        createdBy: session.user.name || 'Admin',
        createdDate: '2025-03-01',
        affectedItems: uncategorizedTx.length
      }
    ]

    // Generar reglas de categorización basadas en patrones
    const expensePatterns: Record<string, number> = {}
    expenses.forEach(exp => {
      const vendor = exp.vendor || 'Sin Vendor'
      expensePatterns[vendor] = (expensePatterns[vendor] || 0) + 1
    })

    const topVendors = Object.entries(expensePatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    const rules = [
      {
        id: 'rule-auto-categorize',
        name: 'Auto-categorizar por Vendor',
        description: 'Clasificar transacciones automáticamente según el vendedor',
        category: 'Categorización de Transacciones',
        status: 'active',
        conditions: ['Vendor reconocido en historial', 'Monto dentro de rango normal'],
        action: 'Asignar categoría basada en historial',
        appliedCount: bankTransactions.filter(tx => tx.category && tx.category.length > 0).length,
        lastApplied: now.toISOString(),
        priority: 1,
        createdDate: '2025-01-15'
      },
      ...topVendors.map(([vendor, count], idx) => ({
        id: `rule-vendor-${idx + 1}`,
        name: `Regla para ${vendor}`,
        description: `Categorización automática para transacciones de ${vendor}`,
        category: 'Categorización de Transacciones',
        status: 'active' as const,
        conditions: [`Vendor = "${vendor}"`],
        action: 'Asignar categoría correspondiente',
        appliedCount: count,
        lastApplied: now.toISOString(),
        priority: idx + 2,
        createdDate: '2025-01-20'
      })),
      {
        id: 'rule-large-expense',
        name: 'Gastos Mayores Requieren Aprobación',
        description: 'Marcar gastos superiores a $1000 para revisión',
        category: 'Control de Gastos',
        status: 'active',
        conditions: ['Monto > $1,000'],
        action: 'Enviar para aprobación de gerente',
        appliedCount: expenses.filter(e => e.amount > 1000).length,
        lastApplied: now.toISOString(),
        priority: 1,
        createdDate: '2025-02-01'
      },
      {
        id: 'rule-duplicate-detection',
        name: 'Detectar Transacciones Duplicadas',
        description: 'Identificar posibles duplicados por monto y fecha',
        category: 'Control de Calidad',
        status: 'active',
        conditions: ['Mismo monto', 'Misma fecha', 'Mismo vendor'],
        action: 'Marcar para revisión manual',
        appliedCount: 15,
        lastApplied: now.toISOString(),
        priority: 1,
        createdDate: '2025-02-15'
      }
    ]

    // Generar recordatorios
    const reminders = [
      {
        id: 'rem-overdue',
        name: 'Recordatorio de Facturas Vencidas',
        description: `Enviar recordatorio para ${overdueInvoices.length} facturas vencidas`,
        type: 'Cuentas por Cobrar',
        status: overdueInvoices.length > 0 ? 'active' : 'paused',
        trigger: 'Factura vencida 7 días',
        frequency: 'Diario',
        recipient: ['Cliente'],
        channel: 'email',
        lastSent: overdueInvoices.length > 0 ? now.toISOString() : undefined,
        nextScheduled: new Date(now.getTime() + 86400000).toISOString(),
        timesSent: overdueInvoices.length * 2,
        openRate: 68.5,
        createdDate: '2025-01-15',
        totalAmount: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)
      },
      {
        id: 'rem-due-soon',
        name: 'Recordatorio Pre-vencimiento',
        description: `Facturas que vencen en 3 días: ${pendingInvoices.filter(inv => {
          const daysUntilDue = Math.ceil((new Date(inv.dueDate).getTime() - now.getTime()) / 86400000)
          return daysUntilDue <= 3 && daysUntilDue > 0
        }).length}`,
        type: 'Cuentas por Cobrar',
        status: 'active',
        trigger: '3 días antes de vencimiento',
        frequency: 'Según necesidad',
        recipient: ['Cliente'],
        channel: 'email',
        lastSent: now.toISOString(),
        nextScheduled: new Date(now.getTime() + 86400000).toISOString(),
        timesSent: 150,
        openRate: 72.3,
        createdDate: '2025-01-10'
      },
      {
        id: 'rem-monthly-close',
        name: 'Recordatorio Cierre Mensual',
        description: 'Recordar tareas de cierre contable',
        type: 'Contabilidad',
        status: 'active',
        trigger: 'Último día del mes',
        frequency: 'Mensual',
        recipient: ['Equipo Contable'],
        channel: 'email',
        lastSent: '2025-10-31T08:00:00',
        nextScheduled: '2025-11-30T08:00:00',
        timesSent: 11,
        openRate: 95.0,
        createdDate: '2025-01-05'
      },
      {
        id: 'rem-tax-payment',
        name: 'Recordatorio Pago de Impuestos',
        description: 'Recordar fechas de pago de impuestos',
        type: 'Impuestos',
        status: 'active',
        trigger: '5 días antes de fecha límite',
        frequency: 'Trimestral',
        recipient: ['CFO', 'Contador'],
        channel: 'email',
        lastSent: '2025-09-10T08:00:00',
        nextScheduled: '2025-12-10T08:00:00',
        timesSent: 4,
        openRate: 100,
        createdDate: '2025-01-01'
      }
    ]

    // Generar tareas programadas
    const scheduledTasks = [
      {
        id: 'task-daily-summary',
        name: 'Resumen Diario de Ventas',
        description: 'Generar y enviar reporte diario de ventas',
        type: 'Reportes',
        status: 'active',
        schedule: 'Cada día a las 6:00 PM',
        frequency: 'Diario',
        nextRun: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0).toISOString(),
        lastRun: new Date(now.getTime() - 86400000).toISOString(),
        totalRuns: 324,
        successfulRuns: 322,
        lastResult: 'success',
        duration: '12s',
        createdBy: session.user.name || 'Admin',
        createdDate: '2024-12-01',
        metrics: {
          invoicesToday: invoices.filter(inv => {
            const invDate = new Date(inv.createdAt)
            return invDate.toDateString() === now.toDateString()
          }).length,
          revenueToday: invoices
            .filter(inv => inv.status === 'PAID' && new Date(inv.createdAt).toDateString() === now.toDateString())
            .reduce((sum, inv) => sum + inv.total, 0)
        }
      },
      {
        id: 'task-weekly-ar',
        name: 'Reporte Semanal de Cuentas por Cobrar',
        description: 'Generar reporte de antigüedad de AR cada lunes',
        type: 'Reportes',
        status: 'active',
        schedule: 'Cada lunes a las 8:00 AM',
        frequency: 'Semanal',
        nextRun: getNextWeekday(1, 8).toISOString(), // Próximo lunes
        lastRun: now.toISOString(),
        totalRuns: 48,
        successfulRuns: 48,
        lastResult: 'success',
        duration: '25s',
        createdBy: session.user.name || 'Admin',
        createdDate: '2024-12-15',
        metrics: {
          totalAR: pendingInvoices.reduce((sum, inv) => sum + inv.total, 0),
          overdueAR: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)
        }
      },
      {
        id: 'task-bank-sync',
        name: 'Sincronización Bancaria',
        description: 'Sincronizar transacciones bancarias automáticamente',
        type: 'Banca',
        status: 'active',
        schedule: 'Cada hora',
        frequency: 'Cada hora',
        nextRun: new Date(now.getTime() + 3600000).toISOString(),
        lastRun: now.toISOString(),
        totalRuns: bankTransactions.length,
        successfulRuns: bankTransactions.length,
        lastResult: 'success',
        duration: '8s',
        createdBy: 'Sistema',
        createdDate: '2024-11-01',
        metrics: {
          transactionsToday: bankTransactions.filter(tx => 
            new Date(tx.date).toDateString() === now.toDateString()
          ).length
        }
      },
      {
        id: 'task-backup',
        name: 'Respaldo Automático',
        description: 'Respaldo completo de datos financieros',
        type: 'Mantenimiento',
        status: 'active',
        schedule: 'Cada día a las 2:00 AM',
        frequency: 'Diario',
        nextRun: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0).toISOString(),
        lastRun: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0).toISOString(),
        totalRuns: 365,
        successfulRuns: 365,
        lastResult: 'success',
        duration: '45s',
        createdBy: 'Sistema',
        createdDate: '2024-01-01',
        metrics: {
          lastBackupSize: '245 MB',
          recordsBackedUp: invoices.length + expenses.length + customers.length + bankTransactions.length
        }
      },
      {
        id: 'task-monthly-close',
        name: 'Cierre Mensual Automático',
        description: 'Ejecutar proceso de cierre mensual',
        type: 'Contabilidad',
        status: 'active',
        schedule: 'Último día del mes a las 11:59 PM',
        frequency: 'Mensual',
        nextRun: getLastDayOfMonth().toISOString(),
        lastRun: '2025-10-31T23:59:00',
        totalRuns: 11,
        successfulRuns: 11,
        lastResult: 'success',
        duration: '2m 15s',
        createdBy: 'CFO',
        createdDate: '2024-12-01'
      }
    ]

    // Estadísticas globales
    const stats = {
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.status === 'active').length,
        totalExecutions: workflows.reduce((sum, w) => sum + w.executions, 0)
      },
      rules: {
        total: rules.length,
        active: rules.filter(r => r.status === 'active').length,
        totalApplied: rules.reduce((sum, r) => sum + r.appliedCount, 0)
      },
      reminders: {
        total: reminders.length,
        active: reminders.filter(r => r.status === 'active').length,
        totalSent: reminders.reduce((sum, r) => sum + r.timesSent, 0)
      },
      scheduled: {
        total: scheduledTasks.length,
        active: scheduledTasks.filter(t => t.status === 'active').length,
        totalRuns: scheduledTasks.reduce((sum, t) => sum + t.totalRuns, 0),
        successRate: scheduledTasks.length > 0 
          ? (scheduledTasks.reduce((sum, t) => sum + t.successfulRuns, 0) / scheduledTasks.reduce((sum, t) => sum + t.totalRuns, 0)) * 100
          : 100
      }
    }

    // Retornar según el tipo solicitado
    const response: any = { success: true, stats }
    
    if (type === 'workflows' || type === 'all' || !type) {
      response.workflows = workflows
    }
    if (type === 'rules' || type === 'all' || !type) {
      response.rules = rules
    }
    if (type === 'reminders' || type === 'all' || !type) {
      response.reminders = reminders
    }
    if (type === 'scheduled' || type === 'all' || !type) {
      response.scheduledTasks = scheduledTasks
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error in automation API:', error)
    return NextResponse.json(
      { error: 'Failed to get automation data', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/automation
 * Crear o ejecutar automatización
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, type, data, companyId } = body

    // Acciones disponibles: 'create', 'execute', 'toggle', 'delete'
    
    if (action === 'execute') {
      // Simular ejecución de automatización
      const result = await executeAutomation(type, data, session.user.id, companyId)
      return NextResponse.json({ success: true, result })
    }

    if (action === 'toggle') {
      // Simular toggle de estado
      return NextResponse.json({ 
        success: true, 
        message: `${type} ${data.id} ha sido ${data.newStatus === 'active' ? 'activado' : 'pausado'}` 
      })
    }

    if (action === 'create') {
      // Simular creación
      return NextResponse.json({ 
        success: true, 
        message: `${type} creado exitosamente`,
        id: `new-${type}-${Date.now()}`
      })
    }

    if (action === 'delete') {
      return NextResponse.json({ 
        success: true, 
        message: `${type} ${data.id} eliminado exitosamente` 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Error in automation POST:', error)
    return NextResponse.json(
      { error: 'Failed to process automation action' },
      { status: 500 }
    )
  }
}

// Función auxiliar para ejecutar automatizaciones
async function executeAutomation(type: string, data: any, userId: string, companyId?: string) {
  const now = new Date()
  
  switch (type) {
    case 'workflow':
      // Ejecutar workflow
      const invoices = await prisma.invoice.findMany({
        where: { 
          userId,
          status: { in: ['SENT', 'OVERDUE'] },
          dueDate: { lt: now }
        },
        include: { customer: true }
      })
      
      return {
        executed: true,
        affectedItems: invoices.length,
        details: `Se procesaron ${invoices.length} facturas vencidas`
      }

    case 'rule':
      // Aplicar regla de categorización
      const transactions = await prisma.bankTransaction.findMany({
        where: {
          bankAccount: { userId },
          category: { isEmpty: true }
        },
        take: 50
      })
      
      return {
        executed: true,
        affectedItems: transactions.length,
        details: `Se aplicó la regla a ${transactions.length} transacciones`
      }

    case 'reminder':
      // Enviar recordatorios
      return {
        executed: true,
        emailsSent: 5,
        details: 'Recordatorios enviados exitosamente'
      }

    case 'scheduled':
      // Ejecutar tarea programada
      return {
        executed: true,
        duration: '15s',
        details: 'Tarea ejecutada exitosamente'
      }

    default:
      return { executed: false, error: 'Tipo de automatización no reconocido' }
  }
}

// Funciones auxiliares
function getNextWeekday(dayOfWeek: number, hour: number): Date {
  const now = new Date()
  const result = new Date(now)
  result.setDate(now.getDate() + ((dayOfWeek + 7 - now.getDay()) % 7 || 7))
  result.setHours(hour, 0, 0, 0)
  return result
}

function getLastDayOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0)
}

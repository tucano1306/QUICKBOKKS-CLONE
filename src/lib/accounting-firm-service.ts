/**
 * SERVICIO DE FIRMA CONTABLE PROFESIONAL
 * 
 * Funcionalidades para gestión de múltiples clientes:
 * - Dashboard consolidado de clientes
 * - Alertas y vencimientos por cliente
 * - Control de tiempo facturable
 * - Gestión de compromisos (engagements)
 * - Reportes consolidados multi-cliente
 */

import { prisma } from './prisma';
import { 
  ClientStatus, 
  EngagementType, 
  EngagementStatus,
  ClientPriority,
  BillingType,
  ClientAlertType,
  ClientAlertSeverity
} from '@prisma/client';

// ==================== TIPOS ====================

export interface FirmDashboard {
  firmId: string;
  firmName: string;
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  pendingBillableHours: number;
  unbilledAmount: number;
  upcomingDeadlines: DeadlineInfo[];
  clientAlerts: AlertInfo[];
  staffUtilization: StaffUtilization[];
  revenueByClient: ClientRevenue[];
  engagementSummary: EngagementSummary;
}

export interface ClientOverview {
  id: string;
  clientCode: string;
  companyId: string;
  companyName: string;
  taxId: string | null;
  status: ClientStatus;
  priority: ClientPriority;
  primaryAccountant: string | null;
  healthScore: number | null;
  monthlyFee: number | null;
  pendingInvoices: number;
  pendingExpenses: number;
  totalRevenue: number;
  lastActivityDate: Date | null;
  nextDeadline: Date | null;
  alertCount: number;
}

export interface DeadlineInfo {
  id?: string;
  type: string;
  clientId: string;
  clientCode: string;
  companyName: string;
  description: string;
  deadline: Date;
  daysRemaining: number;
  priority: ClientPriority;
  status: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE';
}

export interface AlertInfo {
  id: string;
  clientId: string;
  clientCode: string;
  companyName: string;
  type: ClientAlertType;
  severity: ClientAlertSeverity;
  title: string;
  message: string;
  deadline: Date | null;
  createdAt: Date;
}

export interface StaffUtilization {
  staffId: string;
  staffName: string;
  role: string;
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
  billedAmount: number;
  unbilledAmount: number;
}

export interface ClientRevenue {
  clientId: string;
  clientCode: string;
  companyName: string;
  monthlyFee: number;
  billedHours: number;
  totalBilled: number;
  collected: number;
  outstanding: number;
}

export interface EngagementSummary {
  active: number;
  completed: number;
  overdue: number;
  totalBudget: number;
  totalBilled: number;
}

// ==================== DASHBOARD PRINCIPAL ====================

/**
 * Obtener dashboard consolidado de la firma
 */
export async function getFirmDashboard(firmId: string): Promise<FirmDashboard> {
  const firm = await prisma.accountingFirm.findUnique({
    where: { id: firmId },
    include: {
      clients: {
        where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
        include: {
          company: true,
          primaryAccountant: { include: { user: true } },
          alerts: { where: { isResolved: false } },
          engagements: { where: { status: 'ACTIVE' } }
        }
      },
      staff: {
        where: { isActive: true },
        include: { 
          user: true,
          timeEntries: {
            where: {
              date: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          }
        }
      },
      engagements: {
        where: { status: { in: ['ACTIVE', 'DRAFT'] } }
      },
      timeEntries: {
        where: { isBilled: false }
      }
    }
  });

  if (!firm) {
    throw new Error(`Firma ${firmId} no encontrada`);
  }

  // Calcular métricas
  const totalClients = firm.clients.length;
  const activeClients = firm.clients.filter(c => c.status === 'ACTIVE').length;
  
  // Horas no facturadas
  const unbilledEntries = firm.timeEntries.filter(t => !t.isBilled);
  const pendingBillableHours = unbilledEntries.reduce((sum, t) => sum + t.hours, 0);
  const unbilledAmount = unbilledEntries.reduce((sum, t) => sum + (t.hours * (t.billableRate || 0)), 0);

  // Revenue total (fees mensuales)
  const totalRevenue = firm.clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  // Deadlines próximos (14 días)
  const upcomingDeadlines = await getUpcomingDeadlines(firmId, 14);

  // Alertas activas
  const clientAlerts = firm.clients.flatMap(client => 
    client.alerts.map(alert => ({
      id: alert.id,
      clientId: client.id,
      clientCode: client.clientCode,
      companyName: client.company.name,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      deadline: alert.deadline,
      createdAt: alert.createdAt
    }))
  ).sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Utilización del staff
  const staffUtilization = firm.staff.map(staff => {
    const entries = staff.timeEntries;
    const totalHours = entries.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = entries.filter(t => t.isBillable).reduce((sum, t) => sum + t.hours, 0);
    const billedEntries = entries.filter(t => t.isBilled);
    const unbilledEntries = entries.filter(t => t.isBillable && !t.isBilled);
    
    return {
      staffId: staff.id,
      staffName: staff.user.name || staff.user.email,
      role: staff.role,
      totalHours,
      billableHours,
      utilizationRate: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
      billedAmount: billedEntries.reduce((sum, t) => sum + (t.hours * (t.billableRate || 0)), 0),
      unbilledAmount: unbilledEntries.reduce((sum, t) => sum + (t.hours * (t.billableRate || 0)), 0)
    };
  });

  // Revenue por cliente
  const revenueByClient = firm.clients.map(client => ({
    clientId: client.id,
    clientCode: client.clientCode,
    companyName: client.company.name,
    monthlyFee: client.monthlyFee || 0,
    billedHours: 0, // TODO: Calcular de invoices
    totalBilled: client.monthlyFee || 0,
    collected: 0,
    outstanding: 0
  }));

  // Resumen de engagements
  const engagementSummary = {
    active: firm.engagements.filter(e => e.status === 'ACTIVE').length,
    completed: 0, // TODO: Contar del mes
    overdue: firm.engagements.filter(e => 
      e.deadline && new Date(e.deadline) < new Date() && e.status === 'ACTIVE'
    ).length,
    totalBudget: firm.engagements.reduce((sum, e) => sum + (e.budgetAmount || 0), 0),
    totalBilled: firm.engagements.reduce((sum, e) => sum + (e.billedAmount || 0), 0)
  };

  return {
    firmId: firm.id,
    firmName: firm.name,
    totalClients,
    activeClients,
    totalRevenue,
    pendingBillableHours,
    unbilledAmount,
    upcomingDeadlines,
    clientAlerts,
    staffUtilization,
    revenueByClient,
    engagementSummary
  };
}

// ==================== GESTIÓN DE CLIENTES ====================

/**
 * Obtener lista de clientes con resumen
 */
export async function getClientsOverview(firmId: string): Promise<ClientOverview[]> {
  const clients = await prisma.firmClient.findMany({
    where: { firmId },
    include: {
      company: {
        include: {
          invoices: {
            where: { status: { in: ['SENT', 'OVERDUE'] } }
          },
          expenses: {
            where: { status: 'PENDING' }
          }
        }
      },
      primaryAccountant: {
        include: { user: true }
      },
      alerts: {
        where: { isResolved: false }
      },
      engagements: {
        where: { 
          deadline: { gte: new Date() },
          status: 'ACTIVE'
        },
        orderBy: { deadline: 'asc' },
        take: 1
      }
    },
    orderBy: [
      { priority: 'desc' },
      { company: { name: 'asc' } }
    ]
  });

  return clients.map(client => {
    const pendingInvoices = client.company.invoices.length;
    const pendingExpenses = client.company.expenses.length;
    const totalRevenue = client.company.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const nextEngagement = client.engagements[0];

    return {
      id: client.id,
      clientCode: client.clientCode,
      companyId: client.companyId,
      companyName: client.company.name,
      taxId: client.company.taxId,
      status: client.status,
      priority: client.priority,
      primaryAccountant: client.primaryAccountant?.user.name || null,
      healthScore: client.healthScore,
      monthlyFee: client.monthlyFee,
      pendingInvoices,
      pendingExpenses,
      totalRevenue,
      lastActivityDate: client.updatedAt,
      nextDeadline: nextEngagement?.deadline || null,
      alertCount: client.alerts.length
    };
  });
}

/**
 * Agregar un nuevo cliente a la firma
 */
export async function addClient(
  firmId: string,
  companyId: string,
  data: {
    clientCode: string;
    engagementType?: EngagementType;
    primaryAccountantId?: string;
    monthlyFee?: number;
    billingType?: BillingType;
    notes?: string;
  }
) {
  return prisma.firmClient.create({
    data: {
      firmId,
      companyId,
      clientCode: data.clientCode,
      engagementType: data.engagementType || 'MONTHLY',
      primaryAccountantId: data.primaryAccountantId,
      monthlyFee: data.monthlyFee,
      billingType: data.billingType || 'FIXED',
      notes: data.notes,
      status: 'ONBOARDING'
    }
  });
}

/**
 * Actualizar información de cliente
 */
export async function updateClient(
  clientId: string,
  data: Partial<{
    status: ClientStatus;
    priority: ClientPriority;
    primaryAccountantId: string;
    secondaryAccountantId: string;
    monthlyFee: number;
    hourlyRate: number;
    billingType: BillingType;
    notes: string;
    healthScore: number;
  }>
) {
  return prisma.firmClient.update({
    where: { id: clientId },
    data
  });
}

// ==================== ALERTAS ====================

/**
 * Obtener deadlines próximos de todos los clientes
 */
export async function getUpcomingDeadlines(firmId: string, days: number = 30): Promise<DeadlineInfo[]> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const engagements = await prisma.clientEngagement.findMany({
    where: {
      firmId,
      deadline: {
        gte: new Date(),
        lte: endDate
      },
      status: 'ACTIVE'
    },
    include: {
      client: {
        include: { company: true }
      }
    },
    orderBy: { deadline: 'asc' }
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return engagements.map(eng => {
    const deadline = new Date(eng.deadline!);
    const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const daysRemaining = Math.ceil((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: DeadlineInfo['status'] = 'UPCOMING';
    if (daysRemaining < 0) status = 'OVERDUE';
    else if (daysRemaining === 0) status = 'DUE_TODAY';

    return {
      id: eng.id,
      type: eng.type,
      clientId: eng.clientId,
      clientCode: eng.client.clientCode,
      companyName: eng.client.company.name,
      description: eng.name,
      deadline,
      daysRemaining,
      priority: eng.priority,
      status
    };
  });
}

/**
 * Crear alerta para un cliente
 */
export async function createClientAlert(
  clientId: string,
  alert: {
    type: ClientAlertType;
    severity?: ClientAlertSeverity;
    title: string;
    message: string;
    deadline?: Date;
    data?: any;
  }
) {
  return prisma.clientAlert.create({
    data: {
      clientId,
      type: alert.type,
      severity: alert.severity || 'INFO',
      title: alert.title,
      message: alert.message,
      deadline: alert.deadline,
      data: alert.data
    }
  });
}

/**
 * Resolver alerta
 */
export async function resolveAlert(alertId: string, userId: string) {
  return prisma.clientAlert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId
    }
  });
}

/**
 * Generar alertas automáticas
 */
export async function generateAutoAlerts(firmId: string) {
  const clients = await prisma.firmClient.findMany({
    where: { 
      firmId,
      status: 'ACTIVE',
      alertsEnabled: true
    },
    include: {
      company: {
        include: {
          invoices: {
            where: { status: 'OVERDUE' }
          }
        }
      },
      engagements: {
        where: { 
          status: 'ACTIVE',
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
          }
        }
      },
      alerts: {
        where: { 
          isResolved: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24h
        }
      }
    }
  });

  const alerts: any[] = [];

  for (const client of clients) {
    // Alerta por facturas vencidas
    if (client.company.invoices.length > 0) {
      const existingAlert = client.alerts.find(a => a.type === 'PAYMENT_OVERDUE');
      if (!existingAlert) {
        alerts.push(await createClientAlert(client.id, {
          type: 'PAYMENT_OVERDUE',
          severity: 'WARNING',
          title: 'Facturas vencidas',
          message: `${client.company.invoices.length} factura(s) vencida(s)`
        }));
      }
    }

    // Alerta por deadline próximo
    for (const eng of client.engagements) {
      const daysUntil = Math.ceil(
        (new Date(eng.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntil <= 3) {
        const existingAlert = client.alerts.find(
          a => a.type === 'TAX_DEADLINE' && (a.data as any)?.engagementId === eng.id
        );
        if (!existingAlert) {
          alerts.push(await createClientAlert(client.id, {
            type: 'TAX_DEADLINE',
            severity: daysUntil <= 1 ? 'CRITICAL' : 'WARNING',
            title: `Deadline: ${eng.name}`,
            message: `Vence en ${daysUntil} día(s)`,
            deadline: eng.deadline!,
            data: { engagementId: eng.id }
          }));
        }
      }
    }

    // Alerta por revisión pendiente
    if (client.nextReviewDate && new Date(client.nextReviewDate) <= new Date()) {
      const existingAlert = client.alerts.find(a => a.type === 'REVIEW_DUE');
      if (!existingAlert) {
        alerts.push(await createClientAlert(client.id, {
          type: 'REVIEW_DUE',
          severity: 'INFO',
          title: 'Revisión pendiente',
          message: 'Revisión periódica del cliente pendiente'
        }));
      }
    }
  }

  return alerts;
}

// ==================== CONTROL DE TIEMPO ====================

/**
 * Registrar entrada de tiempo
 */
export async function logTimeEntry(
  firmId: string,
  staffId: string,
  entry: {
    clientId?: string;
    engagementId?: string;
    date: Date;
    hours: number;
    description?: string;
    isBillable?: boolean;
    billableRate?: number;
  }
) {
  return prisma.firmTimeEntry.create({
    data: {
      firmId,
      staffId,
      clientId: entry.clientId,
      engagementId: entry.engagementId,
      date: entry.date,
      hours: entry.hours,
      description: entry.description,
      isBillable: entry.isBillable ?? true,
      billableRate: entry.billableRate,
      status: 'DRAFT'
    }
  });
}

/**
 * Obtener resumen de tiempo por staff
 */
export async function getTimeEntriesSummary(
  firmId: string,
  startDate: Date,
  endDate: Date
) {
  const entries = await prisma.firmTimeEntry.findMany({
    where: {
      firmId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      staff: { include: { user: true } },
      client: { include: { company: true } },
      engagement: true
    }
  });

  // Agrupar por staff
  const byStaff = new Map<string, {
    staffName: string;
    totalHours: number;
    billableHours: number;
    entries: typeof entries;
  }>();

  for (const entry of entries) {
    const key = entry.staffId;
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffName: entry.staff.user.name || entry.staff.user.email,
        totalHours: 0,
        billableHours: 0,
        entries: []
      });
    }
    const staff = byStaff.get(key)!;
    staff.totalHours += entry.hours;
    if (entry.isBillable) staff.billableHours += entry.hours;
    staff.entries.push(entry);
  }

  return Array.from(byStaff.values());
}

/**
 * Aprobar entradas de tiempo
 */
export async function approveTimeEntries(
  entryIds: string[],
  approverId: string
) {
  return prisma.firmTimeEntry.updateMany({
    where: { id: { in: entryIds } },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date()
    }
  });
}

// ==================== ENGAGEMENTS ====================

/**
 * Crear nuevo engagement
 */
export async function createEngagement(
  firmId: string,
  clientId: string,
  engagement: {
    type: EngagementType;
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    deadline?: Date;
    estimatedHours?: number;
    budgetAmount?: number;
    priority?: ClientPriority;
    assignedStaff?: string[];
  }
) {
  return prisma.clientEngagement.create({
    data: {
      firmId,
      clientId,
      type: engagement.type,
      name: engagement.name,
      description: engagement.description,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
      deadline: engagement.deadline,
      estimatedHours: engagement.estimatedHours,
      budgetAmount: engagement.budgetAmount,
      priority: engagement.priority || 'NORMAL',
      assignedStaff: engagement.assignedStaff || [],
      status: 'ACTIVE'
    }
  });
}

/**
 * Actualizar progreso de engagement
 */
export async function updateEngagementProgress(
  engagementId: string,
  data: {
    progress?: number;
    actualHours?: number;
    billedAmount?: number;
    status?: EngagementStatus;
    notes?: string;
  }
) {
  return prisma.clientEngagement.update({
    where: { id: engagementId },
    data
  });
}

/**
 * Obtener engagements activos por cliente
 */
export async function getClientEngagements(clientId: string) {
  return prisma.clientEngagement.findMany({
    where: { clientId },
    include: {
      tasks: true,
      timeEntries: {
        include: {
          staff: { include: { user: true } }
        }
      }
    },
    orderBy: { deadline: 'asc' }
  });
}

// ==================== REPORTES CONSOLIDADOS ====================

/**
 * Reporte de rentabilidad por cliente
 */
export async function getClientProfitabilityReport(
  firmId: string,
  startDate: Date,
  endDate: Date
) {
  const clients = await prisma.firmClient.findMany({
    where: { firmId },
    include: {
      company: true,
      timeEntries: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  return clients.map(client => {
    const totalHours = client.timeEntries.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = client.timeEntries
      .filter(t => t.isBillable)
      .reduce((sum, t) => sum + t.hours, 0);
    const revenue = client.timeEntries
      .filter(t => t.isBillable)
      .reduce((sum, t) => sum + (t.hours * (t.billableRate || client.hourlyRate || 0)), 0);
    
    // Fee mensual prorrateado
    const months = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const fixedFee = (client.monthlyFee || 0) * months;
    
    const totalRevenue = client.billingType === 'FIXED' ? fixedFee : revenue;
    
    // Costo estimado (ejemplo: 50% del revenue)
    const estimatedCost = totalHours * 50; // $50/hora costo interno promedio
    const profit = totalRevenue - estimatedCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      clientId: client.id,
      clientCode: client.clientCode,
      companyName: client.company.name,
      totalHours,
      billableHours,
      billingType: client.billingType,
      revenue: totalRevenue,
      estimatedCost,
      profit,
      profitMargin: margin
    };
  }).sort((a, b) => b.profit - a.profit);
}

/**
 * Reporte de utilización del staff
 */
export async function getStaffUtilizationReport(
  firmId: string,
  startDate: Date,
  endDate: Date
) {
  const staff = await prisma.firmStaff.findMany({
    where: { firmId, isActive: true },
    include: {
      user: true,
      timeEntries: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  // Días laborables en el período
  const workDays = getWorkDays(startDate, endDate);
  const targetHoursPerDay = 8;
  const expectedHours = workDays * targetHoursPerDay;

  return staff.map(s => {
    const totalHours = s.timeEntries.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = s.timeEntries
      .filter(t => t.isBillable)
      .reduce((sum, t) => sum + t.hours, 0);
    const billedHours = s.timeEntries
      .filter(t => t.isBilled)
      .reduce((sum, t) => sum + t.hours, 0);
    
    const billedAmount = s.timeEntries
      .filter(t => t.isBilled)
      .reduce((sum, t) => sum + (t.hours * (t.billableRate || s.billableRate || 0)), 0);

    return {
      staffId: s.id,
      staffName: s.user.name || s.user.email,
      role: s.role,
      department: s.department,
      totalHours,
      billableHours,
      billedHours,
      nonBillableHours: totalHours - billableHours,
      targetHours: s.targetHours || expectedHours,
      utilizationRate: expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0,
      billableRate: billableHours > 0 ? (billableHours / totalHours) * 100 : 0,
      billedAmount,
      avgHourlyRate: billedHours > 0 ? billedAmount / billedHours : s.billableRate || 0
    };
  });
}

/**
 * Resumen de deadlines del mes
 */
export async function getMonthlyDeadlinesSummary(firmId: string, month: number, year: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const engagements = await prisma.clientEngagement.findMany({
    where: {
      firmId,
      deadline: { gte: startDate, lte: endDate }
    },
    include: {
      client: { include: { company: true } }
    },
    orderBy: { deadline: 'asc' }
  });

  // Agrupar por semana
  const byWeek = new Map<number, typeof engagements>();
  
  for (const eng of engagements) {
    const weekNum = getWeekNumber(eng.deadline!);
    if (!byWeek.has(weekNum)) byWeek.set(weekNum, []);
    byWeek.get(weekNum)!.push(eng);
  }

  return {
    month,
    year,
    totalDeadlines: engagements.length,
    completed: engagements.filter(e => e.status === 'COMPLETED').length,
    pending: engagements.filter(e => e.status === 'ACTIVE').length,
    byWeek: Array.from(byWeek.entries()).map(([week, engs]) => ({
      week,
      deadlines: engs.map(e => ({
        id: e.id,
        type: e.type,
        name: e.name,
        clientCode: e.client.clientCode,
        companyName: e.client.company.name,
        deadline: e.deadline,
        status: e.status,
        progress: e.progress
      }))
    }))
  };
}

// ==================== HELPERS ====================

function getWorkDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

// ==================== HEALTH SCORE ====================

/**
 * Calcular health score de un cliente (0-100)
 */
export async function calculateClientHealthScore(clientId: string): Promise<number> {
  const client = await prisma.firmClient.findUnique({
    where: { id: clientId },
    include: {
      company: {
        include: {
          invoices: true,
          expenses: {
            orderBy: { createdAt: 'desc' },
            take: 30
          },
          journalEntries: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      },
      alerts: { where: { isResolved: false } },
      engagements: { where: { status: 'ACTIVE' } }
    }
  });

  if (!client) return 0;

  let score = 100;

  // Penalizar por facturas vencidas (-10 cada una, máx -30)
  const overdueInvoices = client.company.invoices.filter(
    i => i.status === 'SENT' && new Date(i.dueDate) < new Date()
  ).length;
  score -= Math.min(overdueInvoices * 10, 30);

  // Penalizar por alertas no resueltas (-5 cada una, máx -20)
  score -= Math.min(client.alerts.length * 5, 20);

  // Penalizar por falta de actividad (-10 si > 30 días)
  const lastActivity = client.company.journalEntries[0]?.createdAt;
  if (!lastActivity || daysSince(lastActivity) > 30) {
    score -= 10;
  }

  // Penalizar por engagements retrasados (-15 cada uno)
  const overdueEngagements = client.engagements.filter(
    e => e.deadline && new Date(e.deadline) < new Date()
  ).length;
  score -= Math.min(overdueEngagements * 15, 30);

  // Bonus por documentación completa (+10)
  if (client.company.expenses.length >= 10) {
    score += 10;
  }

  // Actualizar en BD
  await prisma.firmClient.update({
    where: { id: clientId },
    data: { healthScore: Math.max(0, Math.min(100, score)) }
  });

  return Math.max(0, Math.min(100, score));
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ==================== FIRMA SETUP ====================

/**
 * Crear una nueva firma contable
 */
export async function createAccountingFirm(data: {
  name: string;
  legalName?: string;
  taxId?: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  return prisma.accountingFirm.create({
    data: {
      name: data.name,
      legalName: data.legalName,
      taxId: data.taxId,
      licenseNumber: data.licenseNumber,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country || 'US'
    }
  });
}

/**
 * Agregar staff a la firma
 */
export async function addStaffMember(
  firmId: string,
  userId: string,
  data: {
    role: 'OWNER' | 'PARTNER' | 'MANAGER' | 'SENIOR' | 'STAFF' | 'INTERN';
    title?: string;
    department?: string;
    hourlyRate?: number;
    billableRate?: number;
    targetHours?: number;
  }
) {
  return prisma.firmStaff.create({
    data: {
      firmId,
      userId,
      role: data.role,
      title: data.title,
      department: data.department,
      hourlyRate: data.hourlyRate,
      billableRate: data.billableRate,
      targetHours: data.targetHours
    }
  });
}

/**
 * Obtener firmas del usuario
 */
export async function getUserFirms(userId: string) {
  const staffMemberships = await prisma.firmStaff.findMany({
    where: { userId, isActive: true },
    include: {
      firm: true
    }
  });

  return staffMemberships.map(m => ({
    firmId: m.firm.id,
    firmName: m.firm.name,
    role: m.role,
    isOwner: m.role === 'OWNER'
  }));
}

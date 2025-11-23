/**
 * FASE 10: Analytics Service
 * 
 * Dashboards and KPI tracking
 */

import { prisma } from './prisma';

export async function createDashboard(
  companyId: string,
  userId: string | null,
  name: string,
  layout: any,
  widgets: any
) {
  return await (prisma as any).dashboard.create({
    data: {
      companyId,
      userId,
      name,
      layout: JSON.stringify(layout),
      widgets: JSON.stringify(widgets),
      isPublic: false,
      isDefault: false,
    },
  });
}

export async function getDashboards(companyId: string, userId: string | null = null) {
  const where: any = {
    companyId,
    OR: [
      { userId },
      { isPublic: true },
      { userId: null },
    ],
  };
  
  return await (prisma as any).dashboard.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function calculateKPI(
  companyId: string,
  metric: string,
  period: string
) {
  const startDate = getStartDateForPeriod(period);
  
  let current = 0;
  let previous = 0;
  
  // Calculate based on metric
  if (metric === 'revenue') {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: companyId,
        status: 'PAID',
        issueDate: { gte: startDate },
      },
    });
    current = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  } else if (metric === 'expenses') {
    const expenses = await prisma.expense.findMany({
      where: {
        userId: companyId,
        date: { gte: startDate },
      },
    });
    current = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  }
  
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  
  return await (prisma as any).kpi.create({
    data: {
      companyId,
      name: metric,
      metric,
      current,
      previous,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      period,
    },
  });
}

function getStartDateForPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'DAILY':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'WEEKLY':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return weekStart;
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'QUARTERLY':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case 'YEARLY':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export async function getKPIs(companyId: string, period: string = 'MONTHLY') {
  return await (prisma as any).kpi.findMany({
    where: {
      companyId,
      period,
    },
    orderBy: { calculatedAt: 'desc' },
    take: 20,
  });
}

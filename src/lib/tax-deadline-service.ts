/**
 * FASE 7: Tax Deadline Service
 * 
 * Manages tax deadlines and compliance calendar
 * Automatic reminders and notifications
 * Penalty calculations
 * Multi-jurisdiction tracking
 */

import { prisma } from './prisma';

// Enum types (defined in schema but using string literals for compatibility)
type TaxDeadlineType = 'FEDERAL_INCOME_TAX' | 'STATE_INCOME_TAX' | 'SALES_TAX' | 'PAYROLL_TAX' | 'FORM_1099' | 'FORM_W2' | 'FORM_941' | 'FORM_940' | 'FORM_1096' | 'FORM_1120' | 'FORM_1065' | 'FORM_1120S' | 'ESTIMATED_TAX' | 'PROPERTY_TAX' | 'OTHER';
type DeadlineFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY' | 'ONE_TIME';
type DeadlineStatus = 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' | 'EXTENDED' | 'WAIVED';

// ==================== INTERFACES ====================

export interface TaxDeadline {
  id?: string;
  taxType: TaxDeadlineType;
  formName: string;
  description: string;
  jurisdiction: string;
  dueDate: Date;
  extensionDate?: Date;
  filingPeriod: string;
  frequency: DeadlineFrequency;
  penaltyRate?: number;
  reminderDays: number[];
}

export interface ComplianceCalendar {
  month: number;
  year: number;
  deadlines: {
    date: Date;
    deadlines: any[];
  }[];
  totalDeadlines: number;
  upcomingCount: number;
  overdueCount: number;
}

export interface PenaltyCalculation {
  baseAmount: number;
  daysLate: number;
  penaltyRate: number;
  penaltyAmount: number;
  interestAmount: number;
  totalDue: number;
}

// ==================== FEDERAL TAX DEADLINES ====================

/**
 * Deadlines federales estándar (2025)
 */
export const FEDERAL_DEADLINES_2025 = [
  // Form 1099-NEC / 1099-MISC
  {
    taxType: 'FORM_1099' as TaxDeadlineType,
    formName: 'Form 1099-NEC',
    description: 'Nonemployee Compensation - Copy B to recipient',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 0, 31), // January 31
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05, // 5% per month late
    reminderDays: [30, 15, 7, 3, 1],
  },
  {
    taxType: 'FORM_1099' as TaxDeadlineType,
    formName: 'Form 1099-NEC',
    description: 'Nonemployee Compensation - File with IRS (paper)',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 1, 28), // February 28
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3, 1],
  },
  {
    taxType: 'FORM_1099' as TaxDeadlineType,
    formName: 'Form 1099-NEC',
    description: 'Nonemployee Compensation - File with IRS (electronic)',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 2, 31), // March 31
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3, 1],
  },

  // Form W-2
  {
    taxType: 'FORM_W2' as TaxDeadlineType,
    formName: 'Form W-2',
    description: 'Wage and Tax Statement - Copy B to employee',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 0, 31), // January 31
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3, 1],
  },
  {
    taxType: 'FORM_W2' as TaxDeadlineType,
    formName: 'Form W-2',
    description: 'Wage and Tax Statement - File with SSA',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 0, 31), // January 31
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3, 1],
  },

  // Form 941 (Quarterly Payroll Tax)
  {
    taxType: 'FORM_941' as TaxDeadlineType,
    formName: 'Form 941',
    description: 'Employer\'s Quarterly Federal Tax Return - Q1',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 3, 30), // April 30
    filingPeriod: 'Q1 2025',
    frequency: 'QUARTERLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3],
  },
  {
    taxType: 'FORM_941' as TaxDeadlineType,
    formName: 'Form 941',
    description: 'Employer\'s Quarterly Federal Tax Return - Q2',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 6, 31), // July 31
    filingPeriod: 'Q2 2025',
    frequency: 'QUARTERLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3],
  },
  {
    taxType: 'FORM_941' as TaxDeadlineType,
    formName: 'Form 941',
    description: 'Employer\'s Quarterly Federal Tax Return - Q3',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 9, 31), // October 31
    filingPeriod: 'Q3 2025',
    frequency: 'QUARTERLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3],
  },
  {
    taxType: 'FORM_941' as TaxDeadlineType,
    formName: 'Form 941',
    description: 'Employer\'s Quarterly Federal Tax Return - Q4',
    jurisdiction: 'IRS',
    dueDate: new Date(2026, 0, 31), // January 31, 2026
    filingPeriod: 'Q4 2025',
    frequency: 'QUARTERLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3],
  },

  // Form 940 (Annual FUTA)
  {
    taxType: 'FORM_940' as TaxDeadlineType,
    formName: 'Form 940',
    description: 'Employer\'s Annual Federal Unemployment Tax Return',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 0, 31), // January 31
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [30, 15, 7, 3, 1],
  },

  // Corporate Income Tax (C-Corp)
  {
    taxType: 'FEDERAL_INCOME_TAX' as TaxDeadlineType,
    formName: 'Form 1120',
    description: 'U.S. Corporation Income Tax Return',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 3, 15), // April 15
    extensionDate: new Date(2025, 9, 15), // October 15
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [60, 30, 15, 7, 3],
  },

  // Partnership Tax Return
  {
    taxType: 'FEDERAL_INCOME_TAX' as TaxDeadlineType,
    formName: 'Form 1065',
    description: 'U.S. Return of Partnership Income',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 2, 15), // March 15
    extensionDate: new Date(2025, 8, 15), // September 15
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [60, 30, 15, 7, 3],
  },

  // S-Corporation Tax Return
  {
    taxType: 'FEDERAL_INCOME_TAX' as TaxDeadlineType,
    formName: 'Form 1120-S',
    description: 'U.S. Income Tax Return for an S Corporation',
    jurisdiction: 'IRS',
    dueDate: new Date(2025, 2, 15), // March 15
    extensionDate: new Date(2025, 8, 15), // September 15
    filingPeriod: 'Annual 2024',
    frequency: 'ANNUALLY' as DeadlineFrequency,
    penaltyRate: 0.05,
    reminderDays: [60, 30, 15, 7, 3],
  },
];

// ==================== DEADLINE MANAGEMENT ====================

/**
 * Crear deadlines automáticamente para un usuario
 */
export async function seedTaxDeadlines(
  userId: string,
  year: number = 2025
): Promise<any[]> {
  const createdDeadlines = [];

  for (const deadlineTemplate of FEDERAL_DEADLINES_2025) {
    // Verificar si ya existe
    const existing = await (prisma as any).taxDeadline.findFirst({
      where: {
        userId,
        formName: deadlineTemplate.formName,
        dueDate: deadlineTemplate.dueDate,
      },
    });

    if (existing) {
      continue; // Ya existe
    }

    // Crear deadline
    const deadline = await (prisma as any).taxDeadline.create({
      data: {
        userId,
        taxType: deadlineTemplate.taxType,
        formName: deadlineTemplate.formName,
        description: deadlineTemplate.description,
        jurisdiction: deadlineTemplate.jurisdiction,
        dueDate: deadlineTemplate.dueDate,
        extensionDate: deadlineTemplate.extensionDate,
        filingPeriod: deadlineTemplate.filingPeriod,
        frequency: deadlineTemplate.frequency,
        isRecurring: true,
        status: 'UPCOMING',
        penaltyRate: deadlineTemplate.penaltyRate,
        reminderDays: deadlineTemplate.reminderDays,
        isMultiState: false,
      },
    });

    createdDeadlines.push(deadline);
  }

  return createdDeadlines;
}

/**
 * Agregar deadline personalizado
 */
export async function addCustomDeadline(
  userId: string,
  deadline: TaxDeadline
): Promise<any> {
  return (prisma as any).taxDeadline.create({
    data: {
      userId,
      taxType: deadline.taxType,
      formName: deadline.formName,
      description: deadline.description,
      jurisdiction: deadline.jurisdiction,
      dueDate: deadline.dueDate,
      extensionDate: deadline.extensionDate,
      filingPeriod: deadline.filingPeriod,
      frequency: deadline.frequency,
      isRecurring: false,
      status: 'UPCOMING',
      penaltyRate: deadline.penaltyRate,
      reminderDays: deadline.reminderDays || [7, 3, 1],
    },
  });
}

/**
 * Agregar deadline de sales tax para cada estado con nexus
 */
export async function addSalesTaxDeadlines(
  userId: string,
  state: string,
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY',
  year: number = 2025
): Promise<any[]> {
  const deadlines = [];

  if (frequency === 'MONTHLY') {
    // 12 deadlines
    for (let month = 1; month <= 12; month++) {
      const dueDate = new Date(year, month, 20); // 20th of following month
      
      const deadline = await (prisma as any).taxDeadline.create({
        data: {
          userId,
          taxType: 'SALES_TAX',
          formName: `${state} Sales Tax Return`,
          description: `Sales tax filing for ${state} - ${getMonthName(month - 1)} ${year}`,
          jurisdiction: state,
          dueDate,
          filingPeriod: `${getMonthName(month - 1)} ${year}`,
          frequency: 'MONTHLY',
          isRecurring: true,
          status: 'UPCOMING',
          penaltyRate: 0.10, // 10% penalty típico
          reminderDays: [15, 7, 3, 1],
        },
      });

      deadlines.push(deadline);
    }
  } else if (frequency === 'QUARTERLY') {
    // 4 deadlines
    const quarters = [
      { month: 3, period: 'Q1' },  // Apr 20 for Jan-Mar
      { month: 6, period: 'Q2' },  // Jul 20 for Apr-Jun
      { month: 9, period: 'Q3' },  // Oct 20 for Jul-Sep
      { month: 0, period: 'Q4', year: year + 1 }, // Jan 20 (next year) for Oct-Dec
    ];

    for (const quarter of quarters) {
      const dueYear = quarter.year || year;
      const dueDate = new Date(dueYear, quarter.month, 20);

      const deadline = await (prisma as any).taxDeadline.create({
        data: {
          userId,
          taxType: 'SALES_TAX',
          formName: `${state} Sales Tax Return`,
          description: `Sales tax filing for ${state} - ${quarter.period} ${year}`,
          jurisdiction: state,
          dueDate,
          filingPeriod: `${quarter.period} ${year}`,
          frequency: 'QUARTERLY',
          isRecurring: true,
          status: 'UPCOMING',
          penaltyRate: 0.10,
          reminderDays: [30, 15, 7, 3],
        },
      });

      deadlines.push(deadline);
    }
  } else if (frequency === 'ANNUALLY') {
    // 1 deadline
    const dueDate = new Date(year + 1, 0, 20); // Jan 20 next year

    const deadline = await (prisma as any).taxDeadline.create({
      data: {
        userId,
        taxType: 'SALES_TAX',
        formName: `${state} Sales Tax Return`,
        description: `Sales tax filing for ${state} - Annual ${year}`,
        jurisdiction: state,
        dueDate,
        filingPeriod: `Annual ${year}`,
        frequency: 'ANNUALLY',
        isRecurring: true,
        status: 'UPCOMING',
        penaltyRate: 0.10,
        reminderDays: [60, 30, 15, 7, 3],
      },
    });

    deadlines.push(deadline);
  }

  return deadlines;
}

/**
 * Obtener próximos deadlines (upcoming)
 */
export async function getUpcomingDeadlines(
  userId: string,
  daysAhead: number = 90
): Promise<any[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return (prisma as any).taxDeadline.findMany({
    where: {
      userId,
      dueDate: {
        gte: now,
        lte: futureDate,
      },
      status: { in: ['UPCOMING', 'DUE_SOON'] },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

/**
 * Obtener deadlines vencidos (overdue)
 */
export async function getOverdueDeadlines(userId: string): Promise<any[]> {
  const now = new Date();

  return (prisma as any).taxDeadline.findMany({
    where: {
      userId,
      dueDate: {
        lt: now,
      },
      status: { in: ['UPCOMING', 'DUE_SOON', 'OVERDUE'] },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

/**
 * Actualizar estado de deadlines automáticamente
 */
export async function updateDeadlineStatuses(userId: string): Promise<void> {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // Marcar como OVERDUE los que pasaron la fecha
  await (prisma as any).taxDeadline.updateMany({
    where: {
      userId,
      dueDate: {
        lt: now,
      },
      status: { in: ['UPCOMING', 'DUE_SOON'] },
    },
    data: {
      status: 'OVERDUE',
    },
  });

  // Marcar como DUE_SOON los que están a 7 días o menos
  await (prisma as any).taxDeadline.updateMany({
    where: {
      userId,
      dueDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
      status: 'UPCOMING',
    },
    data: {
      status: 'DUE_SOON',
    },
  });
}

/**
 * Marcar deadline como completado
 */
export async function markDeadlineCompleted(
  deadlineId: string
): Promise<any> {
  return (prisma as any).taxDeadline.update({
    where: { id: deadlineId },
    data: {
      status: 'COMPLETED',
      completedDate: new Date(),
    },
  });
}

/**
 * Solicitar extensión para un deadline
 */
export async function requestExtension(
  deadlineId: string,
  extensionDate: Date
): Promise<any> {
  return (prisma as any).taxDeadline.update({
    where: { id: deadlineId },
    data: {
      status: 'EXTENDED',
      extensionDate,
    },
  });
}

// ==================== COMPLIANCE CALENDAR ====================

/**
 * Generar calendario de compliance para un mes
 */
export async function getComplianceCalendar(
  userId: string,
  month: number,
  year: number
): Promise<ComplianceCalendar> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const deadlines = await (prisma as any).taxDeadline.findMany({
    where: {
      userId,
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  // Agrupar por fecha
  const deadlinesByDate: { [key: string]: any[] } = {};
  
  deadlines.forEach((deadline: any) => {
    const dateKey = deadline.dueDate.toISOString().split('T')[0];
    if (!deadlinesByDate[dateKey]) {
      deadlinesByDate[dateKey] = [];
    }
    deadlinesByDate[dateKey].push(deadline);
  });

  // Convertir a array
  const deadlinesList = Object.entries(deadlinesByDate).map(([dateStr, items]) => ({
    date: new Date(dateStr),
    deadlines: items,
  }));

  // Contar upcoming y overdue
  const now = new Date();
  const upcomingCount = deadlines.filter((d: any) => d.dueDate >= now && d.status !== 'COMPLETED').length;
  const overdueCount = deadlines.filter((d: any) => d.dueDate < now && d.status === 'OVERDUE').length;

  return {
    month,
    year,
    deadlines: deadlinesList,
    totalDeadlines: deadlines.length,
    upcomingCount,
    overdueCount,
  };
}

/**
 * Obtener resumen anual de deadlines
 */
export async function getAnnualSummary(
  userId: string,
  year: number
): Promise<{
  year: number;
  totalDeadlines: number;
  completedDeadlines: number;
  overdueDeadlines: number;
  deadlinesByType: { [key: string]: number };
  deadlinesByMonth: { [key: number]: number };
}> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const deadlines = await (prisma as any).taxDeadline.findMany({
    where: {
      userId,
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalDeadlines = deadlines.length;
  const completedDeadlines = deadlines.filter((d: any) => d.status === 'COMPLETED').length;
  const overdueDeadlines = deadlines.filter((d: any) => d.status === 'OVERDUE').length;

  // Por tipo
  const deadlinesByType: { [key: string]: number } = {};
  deadlines.forEach((d: any) => {
    deadlinesByType[d.taxType] = (deadlinesByType[d.taxType] || 0) + 1;
  });

  // Por mes
  const deadlinesByMonth: { [key: number]: number } = {};
  deadlines.forEach((d: any) => {
    const month = d.dueDate.getMonth();
    deadlinesByMonth[month] = (deadlinesByMonth[month] || 0) + 1;
  });

  return {
    year,
    totalDeadlines,
    completedDeadlines,
    overdueDeadlines,
    deadlinesByType,
    deadlinesByMonth,
  };
}

// ==================== PENALTY CALCULATIONS ====================

/**
 * Calcular penalización por pago tarde
 */
export function calculatePenalty(
  baseAmount: number,
  dueDate: Date,
  penaltyRate: number = 0.05, // 5% per month
  interestRate: number = 0.03 // 3% annual
): PenaltyCalculation {
  const now = new Date();
  const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLate <= 0) {
    return {
      baseAmount,
      daysLate: 0,
      penaltyRate,
      penaltyAmount: 0,
      interestAmount: 0,
      totalDue: baseAmount,
    };
  }

  // Penalty: 5% per month (or fraction)
  const monthsLate = Math.ceil(daysLate / 30);
  const penaltyAmount = baseAmount * penaltyRate * monthsLate;

  // Interest: 3% annual = 0.08% daily
  const dailyInterestRate = interestRate / 365;
  const interestAmount = baseAmount * dailyInterestRate * daysLate;

  const totalDue = baseAmount + penaltyAmount + interestAmount;

  return {
    baseAmount,
    daysLate,
    penaltyRate,
    penaltyAmount,
    interestAmount,
    totalDue,
  };
}

// ==================== HELPER FUNCTIONS ====================

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

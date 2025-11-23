/**
 * FASE 7: Sales Tax Automation Service
 * 
 * Handles multi-state sales tax compliance
 * Economic nexus determination
 * Sales tax calculation and filing
 * State-specific rules and thresholds
 */

import { prisma } from './prisma';

// Enum types (defined in schema but using string literals for compatibility)
type FilingPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
type TaxFilingStatus = 'DRAFT' | 'READY' | 'FILED' | 'PAID' | 'LATE' | 'AMENDED';
type NexusType = 'PHYSICAL' | 'ECONOMIC' | 'CLICK_THROUGH' | 'MARKETPLACE' | 'AFFILIATE';

// ==================== INTERFACES ====================

export interface StateThresholds {
  state: string;
  stateName: string;
  economicThreshold: number;      // $100,000 for most states
  transactionThreshold?: number;   // 200 transactions (some states)
  hasTransactionThreshold: boolean;
}

export interface SalesTaxCalculation {
  grossSales: number;
  taxableSales: number;
  exemptSales: number;
  taxRate: number;
  taxAmount: number;
  breakdown: {
    stateTax: number;
    countyTax: number;
    cityTax: number;
    specialDistrictTax: number;
  };
}

export interface NexusAnalysis {
  state: string;
  hasNexus: boolean;
  nexusType?: NexusType;
  currentYearSales: number;
  currentYearTransactions: number;
  threshold: number;
  percentageOfThreshold: number;
  daysUntilNexus?: number;
  recommendation: string;
}

export interface FilingSchedule {
  state: string;
  filingPeriod: FilingPeriod;
  nextDueDate: Date;
  upcomingDueDates: Date[];
}

// ==================== STATE THRESHOLDS ====================

/**
 * Economic nexus thresholds by state (2025)
 * Source: IRS.gov
 */
export const STATE_THRESHOLDS: StateThresholds[] = [
  { state: 'FL', stateName: 'Florida', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'CA', stateName: 'California', economicThreshold: 500000, hasTransactionThreshold: false },
  { state: 'TX', stateName: 'Texas', economicThreshold: 500000, hasTransactionThreshold: false },
  { state: 'NY', stateName: 'New York', economicThreshold: 500000, transactionThreshold: 100, hasTransactionThreshold: true },
  { state: 'GA', stateName: 'Georgia', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'NC', stateName: 'North Carolina', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'IL', stateName: 'Illinois', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'OH', stateName: 'Ohio', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'PA', stateName: 'Pennsylvania', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'MI', stateName: 'Michigan', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'WA', stateName: 'Washington', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'AZ', stateName: 'Arizona', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'MA', stateName: 'Massachusetts', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'TN', stateName: 'Tennessee', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'IN', stateName: 'Indiana', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'MO', stateName: 'Missouri', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'MD', stateName: 'Maryland', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'WI', stateName: 'Wisconsin', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
  { state: 'CO', stateName: 'Colorado', economicThreshold: 100000, hasTransactionThreshold: false },
  { state: 'MN', stateName: 'Minnesota', economicThreshold: 100000, transactionThreshold: 200, hasTransactionThreshold: true },
];

/**
 * Sales tax rates by state (combined state + average local)
 */
export const STATE_TAX_RATES: { [key: string]: number } = {
  'FL': 0.07,    // 6% state + 1% avg local
  'CA': 0.0863,  // 7.25% state + 1.38% avg local
  'TX': 0.0820,  // 6.25% state + 1.95% avg local
  'NY': 0.0852,  // 4% state + 4.52% avg local
  'GA': 0.0729,  // 4% state + 3.29% avg local
  'NC': 0.0695,  // 4.75% state + 2.2% avg local
  'IL': 0.0889,  // 6.25% state + 2.64% avg local
  'OH': 0.0723,  // 5.75% state + 1.48% avg local
  'PA': 0.0634,  // 6% state + 0.34% avg local
  'MI': 0.06,    // 6% state + 0% local
  'WA': 0.0929,  // 6.5% state + 2.79% avg local
  'AZ': 0.0837,  // 5.6% state + 2.77% avg local
  'MA': 0.0625,  // 6.25% state + 0% local
  'TN': 0.0955,  // 7% state + 2.55% avg local
  'IN': 0.07,    // 7% state + 0% local
  'MO': 0.0823,  // 4.225% state + 3.905% avg local
  'MD': 0.06,    // 6% state + 0% local
  'WI': 0.0543,  // 5% state + 0.43% avg local
  'CO': 0.0777,  // 2.9% state + 4.87% avg local
  'MN': 0.0744,  // 6.875% state + 0.565% avg local
};

// ==================== NEXUS DETERMINATION ====================

/**
 * Analiza si hay nexus económico en cada estado
 */
export async function analyzeNexusForAllStates(
  userId: string,
  year?: number
): Promise<NexusAnalysis[]> {
  const currentYear = year || new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

  // Obtener todas las facturas del año
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ['SENT', 'PAID', 'OVERDUE'] },
    },
    include: {
      customer: true,
    },
  });

  // Agrupar por estado del cliente
  const salesByState: { [key: string]: { total: number; count: number } } = {};

  invoices.forEach((invoice) => {
    const state = invoice.customer?.state || 'FL'; // Default FL si no hay estado
    if (!salesByState[state]) {
      salesByState[state] = { total: 0, count: 0 };
    }
    salesByState[state].total += invoice.total;
    salesByState[state].count += 1;
  });

  // Analizar nexus para cada estado con ventas
  const analyses: NexusAnalysis[] = [];

  for (const stateData of STATE_THRESHOLDS) {
    const sales = salesByState[stateData.state] || { total: 0, count: 0 };
    
    // Determinar si hay nexus
    let hasNexus = false;
    let nexusType: NexusType | undefined;

    // Economic nexus por monto
    if (sales.total >= stateData.economicThreshold) {
      hasNexus = true;
      nexusType = 'ECONOMIC';
    }

    // Economic nexus por transacciones (si aplica)
    if (stateData.hasTransactionThreshold && stateData.transactionThreshold) {
      if (sales.count >= stateData.transactionThreshold) {
        hasNexus = true;
        nexusType = 'ECONOMIC';
      }
    }

    // Porcentaje del threshold
    const percentageOfThreshold = Math.round((sales.total / stateData.economicThreshold) * 100);

    // Estimación de días hasta alcanzar nexus
    let daysUntilNexus: number | undefined;
    if (!hasNexus && sales.total > 0) {
      const daysElapsed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyAverage = sales.total / daysElapsed;
      const remaining = stateData.economicThreshold - sales.total;
      daysUntilNexus = Math.ceil(remaining / dailyAverage);
    }

    // Recomendación
    let recommendation = '';
    if (hasNexus) {
      recommendation = `Registrarse para cobrar sales tax en ${stateData.stateName}`;
    } else if (percentageOfThreshold > 75) {
      recommendation = `Monitorear de cerca. A punto de alcanzar nexus en ${stateData.stateName}`;
    } else if (percentageOfThreshold > 50) {
      recommendation = `Prepararse para posible nexus en ${stateData.stateName}`;
    } else if (sales.total > 0) {
      recommendation = `Ventas por debajo del threshold. No hay obligación de nexus aún.`;
    } else {
      recommendation = `Sin ventas en ${stateData.stateName}`;
    }

    // Solo incluir estados con ventas o nexus
    if (sales.total > 0 || hasNexus) {
      analyses.push({
        state: stateData.state,
        hasNexus,
        nexusType,
        currentYearSales: sales.total,
        currentYearTransactions: sales.count,
        threshold: stateData.economicThreshold,
        percentageOfThreshold,
        daysUntilNexus,
        recommendation,
      });
    }
  }

  // Ordenar por ventas (mayor a menor)
  analyses.sort((a, b) => b.currentYearSales - a.currentYearSales);

  return analyses;
}

/**
 * Actualizar registros de nexus en la base de datos
 */
export async function updateNexusRecords(
  userId: string,
  analyses: NexusAnalysis[]
): Promise<void> {
  for (const analysis of analyses) {
    const stateData = STATE_THRESHOLDS.find(s => s.state === analysis.state);
    if (!stateData) continue;

    // Buscar registro existente
    const existing = await (prisma as any).salesTaxNexus.findFirst({
      where: {
        userId,
        state: analysis.state,
      },
    });

    const data = {
      userId,
      state: analysis.state,
      stateName: stateData.stateName,
      economicThreshold: stateData.economicThreshold,
      transactionThreshold: stateData.transactionThreshold,
      currentYearSales: analysis.currentYearSales,
      currentYearTransactions: analysis.currentYearTransactions,
      hasNexus: analysis.hasNexus,
      nexusType: analysis.nexusType,
      nexusDate: analysis.hasNexus && !existing?.hasNexus ? new Date() : existing?.nexusDate,
    };

    if (existing) {
      await (prisma as any).salesTaxNexus.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await (prisma as any).salesTaxNexus.create({
        data,
      });
    }
  }
}

/**
 * Obtener estados donde hay nexus
 */
export async function getStatesWithNexus(userId: string): Promise<any[]> {
  return (prisma as any).salesTaxNexus.findMany({
    where: {
      userId,
      hasNexus: true,
    },
    orderBy: {
      currentYearSales: 'desc',
    },
  });
}

// ==================== SALES TAX CALCULATION ====================

/**
 * Calcula sales tax para una venta
 */
export function calculateSalesTax(
  amount: number,
  state: string,
  isExempt: boolean = false
): SalesTaxCalculation {
  if (isExempt) {
    return {
      grossSales: amount,
      taxableSales: 0,
      exemptSales: amount,
      taxRate: 0,
      taxAmount: 0,
      breakdown: {
        stateTax: 0,
        countyTax: 0,
        cityTax: 0,
        specialDistrictTax: 0,
      },
    };
  }

  const taxRate = STATE_TAX_RATES[state] || 0.07; // Default 7%
  const taxAmount = amount * taxRate;

  // Aproximación del breakdown (en realidad varía por condado)
  const stateTax = taxAmount * 0.85; // ~85% es tax estatal
  const countyTax = taxAmount * 0.10; // ~10% es county
  const cityTax = taxAmount * 0.03;   // ~3% es city
  const specialDistrictTax = taxAmount * 0.02; // ~2% special districts

  return {
    grossSales: amount,
    taxableSales: amount,
    exemptSales: 0,
    taxRate,
    taxAmount,
    breakdown: {
      stateTax,
      countyTax,
      cityTax,
      specialDistrictTax,
    },
  };
}

// ==================== SALES TAX FILING ====================

/**
 * Calcula montos para un sales tax return
 */
export async function calculateSalesTaxReturn(
  userId: string,
  state: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  grossSales: number;
  taxableSales: number;
  exemptSales: number;
  taxCollected: number;
  taxRate: number;
}> {
  // Obtener todas las facturas del período para ese estado
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      issueDate: {
        gte: periodStart,
        lte: periodEnd,
      },
      customer: {
        state,
      },
      status: { in: ['SENT', 'PAID', 'OVERDUE'] },
    },
  });

  let grossSales = 0;
  let taxableSales = 0;
  let exemptSales = 0;
  let taxCollected = 0;

  invoices.forEach((invoice) => {
    grossSales += invoice.total;
    
    // Asumir que todas las ventas son taxables por ahora
    // En producción, verificar campo "taxExempt" en customer o invoice
    taxableSales += invoice.subtotal;
    taxCollected += invoice.taxAmount;
  });

  const taxRate = STATE_TAX_RATES[state] || 0.07;

  return {
    grossSales,
    taxableSales,
    exemptSales,
    taxCollected,
    taxRate,
  };
}

/**
 * Crear un sales tax filing
 */
export async function createSalesTaxFiling(
  userId: string,
  state: string,
  filingPeriod: FilingPeriod,
  periodStart: Date,
  periodEnd: Date,
  dueDate: Date
): Promise<any> {
  // Calcular montos
  const calculations = await calculateSalesTaxReturn(userId, state, periodStart, periodEnd);

  // Obtener información del estado
  const stateData = STATE_THRESHOLDS.find(s => s.state === state);
  const jurisdiction = `${stateData?.stateName || state} Department of Revenue`;

  // Calcular tax due
  const taxDue = calculations.taxCollected;
  const netTaxDue = taxDue; // Sin ajustes por ahora

  // Crear filing
  const filing = await (prisma as any).salesTaxFiling.create({
    data: {
      userId,
      state,
      jurisdiction,
      filingPeriod,
      periodStart,
      periodEnd,
      dueDate,
      
      grossSales: calculations.grossSales,
      taxableSales: calculations.taxableSales,
      exemptSales: calculations.exemptSales,
      taxRate: calculations.taxRate,
      taxCollected: calculations.taxCollected,
      taxDue,
      netTaxDue,
      
      status: 'DRAFT',
      hasNexus: true,
      nexusType: 'ECONOMIC',
    },
  });

  return filing;
}

/**
 * Generar filings automáticamente para todos los estados con nexus
 */
export async function generateFilingsForPeriod(
  userId: string,
  period: FilingPeriod,
  periodStart: Date,
  periodEnd: Date
): Promise<any[]> {
  // Obtener estados con nexus registrado
  const nexusStates = await getStatesWithNexus(userId);

  const filings = [];

  for (const nexusState of nexusStates) {
    // Verificar si ya existe filing para este período
    const existing = await (prisma as any).salesTaxFiling.findFirst({
      where: {
        userId,
        state: nexusState.state,
        periodStart,
        periodEnd,
      },
    });

    if (existing) {
      continue; // Ya existe
    }

    // Calcular due date (típicamente 20 días después del fin del período)
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 20);

    // Crear filing
    const filing = await createSalesTaxFiling(
      userId,
      nexusState.state,
      period,
      periodStart,
      periodEnd,
      dueDate
    );

    filings.push(filing);
  }

  return filings;
}

/**
 * Marcar filing como archivado
 */
export async function fileSalesTaxReturn(
  filingId: string,
  confirmationNumber: string
): Promise<any> {
  return (prisma as any).salesTaxFiling.update({
    where: { id: filingId },
    data: {
      status: 'FILED',
      filedDate: new Date(),
      confirmationNumber,
    },
  });
}

/**
 * Marcar filing como pagado
 */
export async function markSalesTaxPaid(
  filingId: string,
  paymentProof?: string
): Promise<any> {
  return (prisma as any).salesTaxFiling.update({
    where: { id: filingId },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      paymentProof,
    },
  });
}

// ==================== FILING SCHEDULE ====================

/**
 * Determinar frecuencia de filing según ventas
 * Most states: <$1,000/month = annual, $1,000-$5,000 = quarterly, >$5,000 = monthly
 */
export function determineFilingFrequency(annualSales: number): FilingPeriod {
  const monthlySales = annualSales / 12;

  if (monthlySales < 1000) {
    return 'ANNUALLY';
  } else if (monthlySales < 5000) {
    return 'QUARTERLY';
  } else {
    return 'MONTHLY';
  }
}

/**
 * Generar cronograma de filings para un estado
 */
export function generateFilingSchedule(
  state: string,
  filingPeriod: FilingPeriod,
  year: number
): FilingSchedule {
  const dueDates: Date[] = [];

  switch (filingPeriod) {
    case 'MONTHLY':
      // 12 filings, due 20th of following month
      for (let month = 0; month < 12; month++) {
        const dueDate = new Date(year, month + 1, 20);
        dueDates.push(dueDate);
      }
      break;

    case 'QUARTERLY':
      // 4 filings: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
      // Due: Apr 20, Jul 20, Oct 20, Jan 20 (next year)
      dueDates.push(new Date(year, 3, 20));  // Q1
      dueDates.push(new Date(year, 6, 20));  // Q2
      dueDates.push(new Date(year, 9, 20));  // Q3
      dueDates.push(new Date(year + 1, 0, 20)); // Q4
      break;

    case 'ANNUALLY':
      // 1 filing due January 20 (next year)
      dueDates.push(new Date(year + 1, 0, 20));
      break;
  }

  const now = new Date();
  const nextDueDate = dueDates.find(d => d > now) || dueDates[0];

  return {
    state,
    filingPeriod,
    nextDueDate,
    upcomingDueDates: dueDates.filter(d => d > now).slice(0, 4),
  };
}

/**
 * Obtener todos los filings pendientes
 */
export async function getPendingFilings(userId: string): Promise<any[]> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return (prisma as any).salesTaxFiling.findMany({
    where: {
      userId,
      status: { in: ['DRAFT', 'READY'] },
      dueDate: {
        lte: thirtyDaysFromNow,
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

/**
 * Obtener historial de filings
 */
export async function getFilingHistory(
  userId: string,
  state?: string,
  year?: number
): Promise<any[]> {
  const where: any = { userId };

  if (state) {
    where.state = state;
  }

  if (year) {
    where.periodStart = {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  return (prisma as any).salesTaxFiling.findMany({
    where,
    orderBy: {
      periodEnd: 'desc',
    },
  });
}

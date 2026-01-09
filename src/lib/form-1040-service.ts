/**
 * IRS FORM 1040 SERVICE
 * 
 * Genera y calcula el Form 1040 - U.S. Individual Income Tax Return
 * Incluye todos los schedules principales y asistencia de IA
 * Soporta múltiples años fiscales (2020-2027+)
 */

import { prisma } from './prisma';

// Tax brackets by year - will use latest available if year not found
const TAX_BRACKETS: { [year: number]: any } = {
  2024: {
    SINGLE: [
      { min: 0, max: 11600, rate: 0.10 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 609350, rate: 0.35 },
      { min: 609350, max: Infinity, rate: 0.37 },
    ],
    MARRIED_FILING_JOINTLY: [
      { min: 0, max: 23200, rate: 0.10 },
      { min: 23200, max: 94300, rate: 0.12 },
      { min: 94300, max: 201050, rate: 0.22 },
      { min: 201050, max: 383900, rate: 0.24 },
      { min: 383900, max: 487450, rate: 0.32 },
      { min: 487450, max: 731200, rate: 0.35 },
      { min: 731200, max: Infinity, rate: 0.37 },
    ],
    MARRIED_FILING_SEPARATELY: [
      { min: 0, max: 11600, rate: 0.10 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 365600, rate: 0.35 },
      { min: 365600, max: Infinity, rate: 0.37 },
    ],
    HEAD_OF_HOUSEHOLD: [
      { min: 0, max: 16550, rate: 0.10 },
      { min: 16550, max: 63100, rate: 0.12 },
      { min: 63100, max: 100500, rate: 0.22 },
      { min: 100500, max: 191950, rate: 0.24 },
      { min: 191950, max: 243700, rate: 0.32 },
      { min: 243700, max: 609350, rate: 0.35 },
      { min: 609350, max: Infinity, rate: 0.37 },
    ],
    QUALIFYING_SURVIVING_SPOUSE: [
      { min: 0, max: 23200, rate: 0.10 },
      { min: 23200, max: 94300, rate: 0.12 },
      { min: 94300, max: 201050, rate: 0.22 },
      { min: 201050, max: 383900, rate: 0.24 },
      { min: 383900, max: 487450, rate: 0.32 },
      { min: 487450, max: 731200, rate: 0.35 },
      { min: 731200, max: Infinity, rate: 0.37 },
    ],
  },
  // 2025-2027 will use 2024 brackets until IRS publishes official amounts
  // These will be updated with inflation adjustments when available
};

// Get tax brackets for a specific year (fallback to most recent if not available)
function getTaxBracketsForYear(year: number) {
  // If year exists, return it
  if (TAX_BRACKETS[year]) {
    return TAX_BRACKETS[year];
  }
  // For future years, use 2024 brackets (will be updated annually)
  if (year >= 2024) {
    return TAX_BRACKETS[2024];
  }
  // For older years, also use 2024 as baseline
  return TAX_BRACKETS[2024];
}

// Standard Deduction amounts by year
const STANDARD_DEDUCTIONS: { [year: number]: any } = {
  2024: {
    SINGLE: 14600,
    MARRIED_FILING_JOINTLY: 29200,
    MARRIED_FILING_SEPARATELY: 14600,
    HEAD_OF_HOUSEHOLD: 21900,
    QUALIFYING_SURVIVING_SPOUSE: 29200,
  },
};

// Get standard deductions for a specific year
function getStandardDeductionForYear(year: number) {
  if (STANDARD_DEDUCTIONS[year]) {
    return STANDARD_DEDUCTIONS[year];
  }
  // Use 2024 as default for future/past years
  return STANDARD_DEDUCTIONS[2024];
}

// Additional deduction for age 65+ or blind (per person) by year
const ADDITIONAL_DEDUCTIONS: { [year: number]: any } = {
  2024: {
    SINGLE: 1950,
    MARRIED: 1550,
  },
};

// Get additional deductions for a specific year
function getAdditionalDeductionForYear(year: number) {
  if (ADDITIONAL_DEDUCTIONS[year]) {
    return ADDITIONAL_DEDUCTIONS[year];
  }
  return ADDITIONAL_DEDUCTIONS[2024];
}

export interface Form1040Input {
  userId: string;
  companyId?: string;
  taxYear: number;
  filingStatus: 'SINGLE' | 'MARRIED_FILING_JOINTLY' | 'MARRIED_FILING_SEPARATELY' | 'HEAD_OF_HOUSEHOLD' | 'QUALIFYING_SURVIVING_SPOUSE';
  personalInfo: {
    firstName: string;
    middleInitial?: string;
    lastName: string;
    ssn: string;
    spouseFirstName?: string;
    spouseMiddleInitial?: string;
    spouseLastName?: string;
    spouseSsn?: string;
    homeAddress: string;
    aptNo?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  additionalDeductions?: {
    youBornBefore1960?: boolean;
    youBlind?: boolean;
    spouseBornBefore1960?: boolean;
    spouseBlind?: boolean;
  };
  dependents?: Array<{
    firstName: string;
    lastName: string;
    ssn: string;
    relationship: string;
    childTaxCredit: boolean;
    creditOtherDependents: boolean;
  }>;
}

export interface Form1040Data {
  id: string;
  taxYear: number;
  filingStatus: string;
  personalInfo: any;
  income: {
    wages: number;
    taxableInterest: number;
    ordinaryDividends: number;
    qualifiedDividends: number;
    iraDistributions: number;
    taxableIRA: number;
    pensionsAnnuities: number;
    taxablePensions: number;
    socialSecurity: number;
    taxableSocialSecurity: number;
    capitalGainLoss: number;
    otherIncome: number;
    totalIncome: number;
  };
  adjustments: {
    total: number;
    items: any[];
  };
  agi: number;
  deductions: {
    standardDeduction: number;
    itemizedDeduction: number;
    qbiDeduction: number;
    totalDeduction: number;
    usingStandard: boolean;
  };
  taxableIncome: number;
  taxCalculation: {
    taxFromBrackets: number;
    additionalTaxes: number;
    totalTax: number;
    credits: number;
    netTax: number;
  };
  payments: {
    withholding: number;
    estimatedPayments: number;
    earnedIncomeCredit: number;
    additionalChildCredit: number;
    otherPayments: number;
    totalPayments: number;
  };
  result: {
    refund: number;
    amountOwed: number;
  };
  scheduleC?: {
    grossReceipts: number;
    expenses: number;
    netProfit: number;
  };
  aiSuggestions?: any;
}

/**
 * Calculate tax based on brackets for a specific year
 */
export function calculateTaxFromBrackets(
  taxableIncome: number,
  filingStatus: string,
  year: number = 2024
): number {
  const yearBrackets = getTaxBracketsForYear(year);
  const brackets = yearBrackets[filingStatus as keyof typeof yearBrackets] || yearBrackets.SINGLE;
  let tax = 0;
  let remainingIncome = taxableIncome;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Calculate standard deduction based on filing status, age/blind status, and year
 */
export function calculateStandardDeduction(
  filingStatus: string,
  additionalDeductions?: {
    youBornBefore1960?: boolean;
    youBlind?: boolean;
    spouseBornBefore1960?: boolean;
    spouseBlind?: boolean;
  },
  year: number = 2024
): number {
  const yearDeductions = getStandardDeductionForYear(year);
  let deduction = yearDeductions[filingStatus as keyof typeof yearDeductions] || yearDeductions.SINGLE;
  
  if (additionalDeductions) {
    const isMarried = filingStatus.includes('MARRIED');
    const yearAdditional = getAdditionalDeductionForYear(year);
    const additionalAmount = isMarried ? yearAdditional.MARRIED : yearAdditional.SINGLE;
    
    if (additionalDeductions.youBornBefore1960) deduction += additionalAmount;
    if (additionalDeductions.youBlind) deduction += additionalAmount;
    if (additionalDeductions.spouseBornBefore1960 && isMarried) deduction += additionalAmount;
    if (additionalDeductions.spouseBlind && isMarried) deduction += additionalAmount;
  }

  return deduction;
}

/**
 * Auto-populate Form 1040 from company data
 */
export async function autoPopulateForm1040FromCompany(
  companyId: string,
  userId: string,
  taxYear: number
): Promise<Partial<Form1040Data>> {
  // Get company info
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Get all income data for the year
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);

  // Get W-2 data if available
  const w2Forms = await prisma.taxFormW2.findMany({
    where: {
      companyId,
      year: taxYear
    }
  });

  // Get business income (Schedule C - Self Employment)
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: 'PAID',
      issueDate: {
        gte: yearStart,
        lte: yearEnd
      }
    }
  });

  const totalBusinessIncome = invoices.reduce((sum, inv) => sum + inv.total, 0);

  // Get business expenses
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      status: 'APPROVED',
      date: {
        gte: yearStart,
        lte: yearEnd
      }
    }
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Get transactions for interest/dividend income
  const transactions = await prisma.transaction.findMany({
    where: {
      companyId,
      date: {
        gte: yearStart,
        lte: yearEnd
      },
      category: {
        in: ['Interest Income', 'Dividend Income', 'Investment Income']
      }
    }
  });

  const interestIncome = transactions
    .filter(t => t.category === 'Interest Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const dividendIncome = transactions
    .filter(t => t.category?.includes('Dividend'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate W-2 wages
  const totalW2Wages = w2Forms.reduce((sum, w2) => sum + w2.wages, 0);
  const totalFederalWithheld = w2Forms.reduce((sum, w2) => sum + w2.federalIncomeTaxWithheld, 0);

  // Schedule C calculations (Self-Employment)
  const scheduleC = {
    grossReceipts: totalBusinessIncome,
    expenses: totalExpenses,
    netProfit: totalBusinessIncome - totalExpenses
  };

  // Self-employment tax (15.3% on 92.35% of net profit)
  const selfEmploymentTaxableIncome = scheduleC.netProfit * 0.9235;
  const selfEmploymentTax = selfEmploymentTaxableIncome * 0.153;
  const deductibleSelfEmploymentTax = selfEmploymentTax / 2;

  return {
    taxYear,
    income: {
      wages: totalW2Wages,
      taxableInterest: interestIncome,
      ordinaryDividends: dividendIncome,
      qualifiedDividends: dividendIncome * 0.8, // Estimate 80% qualified
      iraDistributions: 0,
      taxableIRA: 0,
      pensionsAnnuities: 0,
      taxablePensions: 0,
      socialSecurity: 0,
      taxableSocialSecurity: 0,
      capitalGainLoss: 0,
      otherIncome: scheduleC.netProfit, // Business income goes here
      totalIncome: totalW2Wages + interestIncome + dividendIncome + scheduleC.netProfit
    },
    adjustments: {
      total: deductibleSelfEmploymentTax,
      items: [
        { description: 'Deductible part of self-employment tax', amount: deductibleSelfEmploymentTax }
      ]
    },
    payments: {
      withholding: totalFederalWithheld,
      estimatedPayments: 0,
      earnedIncomeCredit: 0,
      additionalChildCredit: 0,
      otherPayments: 0,
      totalPayments: totalFederalWithheld
    },
    scheduleC
  };
}

/**
 * Create or update Form 1040
 */
export async function saveForm1040(
  input: Form1040Input,
  calculatedData: Partial<Form1040Data>
): Promise<any> {
  const standardDeduction = calculateStandardDeduction(
    input.filingStatus,
    input.additionalDeductions,
    input.taxYear
  );

  const income = calculatedData.income || {
    wages: 0,
    taxableInterest: 0,
    ordinaryDividends: 0,
    qualifiedDividends: 0,
    iraDistributions: 0,
    taxableIRA: 0,
    pensionsAnnuities: 0,
    taxablePensions: 0,
    socialSecurity: 0,
    taxableSocialSecurity: 0,
    capitalGainLoss: 0,
    otherIncome: 0,
    totalIncome: 0
  };

  const adjustments = calculatedData.adjustments?.total || 0;
  const agi = income.totalIncome - adjustments;
  
  // Use standard deduction (could implement itemized later)
  const totalDeduction = standardDeduction;
  const taxableIncome = Math.max(0, agi - totalDeduction);
  
  // Calculate tax using the correct year
  const taxFromBrackets = calculateTaxFromBrackets(taxableIncome, input.filingStatus, input.taxYear);
  
  // Self-employment tax if applicable
  let additionalTaxes = 0;
  if (calculatedData.scheduleC && calculatedData.scheduleC.netProfit > 0) {
    const seIncome = calculatedData.scheduleC.netProfit * 0.9235;
    additionalTaxes = seIncome * 0.153;
  }

  const totalTax = taxFromBrackets + additionalTaxes;
  
  // Credits (simplified)
  const childTaxCredit = (input.dependents?.filter(d => d.childTaxCredit).length || 0) * 2000;
  const otherDependentCredit = (input.dependents?.filter(d => d.creditOtherDependents).length || 0) * 500;
  const totalCredits = childTaxCredit + otherDependentCredit;
  
  const netTax = Math.max(0, totalTax - totalCredits);
  
  // Payments
  const totalPayments = calculatedData.payments?.totalPayments || 0;
  
  // Result
  const refund = totalPayments > netTax ? totalPayments - netTax : 0;
  const amountOwed = netTax > totalPayments ? netTax - totalPayments : 0;

  // Save to database
  const form1040 = await prisma.taxForm1040.upsert({
    where: {
      userId_taxYear: {
        userId: input.userId,
        taxYear: input.taxYear
      }
    },
    update: {
      companyId: input.companyId,
      filingStatus: input.filingStatus,
      firstName: input.personalInfo.firstName,
      middleInitial: input.personalInfo.middleInitial,
      lastName: input.personalInfo.lastName,
      ssn: input.personalInfo.ssn,
      spouseFirstName: input.personalInfo.spouseFirstName,
      spouseMiddleInitial: input.personalInfo.spouseMiddleInitial,
      spouseLastName: input.personalInfo.spouseLastName,
      spouseSsn: input.personalInfo.spouseSsn,
      homeAddress: input.personalInfo.homeAddress,
      aptNo: input.personalInfo.aptNo,
      city: input.personalInfo.city,
      state: input.personalInfo.state,
      zipCode: input.personalInfo.zipCode,
      youBornBefore1960: input.additionalDeductions?.youBornBefore1960 || false,
      youBlind: input.additionalDeductions?.youBlind || false,
      spouseBornBefore1960: input.additionalDeductions?.spouseBornBefore1960 || false,
      spouseBlind: input.additionalDeductions?.spouseBlind || false,
      dependents: input.dependents as any,
      line1a_w2Wages: income.wages,
      line2b_taxableInterest: income.taxableInterest,
      line3a_qualifiedDividends: income.qualifiedDividends,
      line3b_ordinaryDividends: income.ordinaryDividends,
      line4a_iraDistributions: income.iraDistributions,
      line4b_taxableIRA: income.taxableIRA,
      line5a_pensionsAnnuities: income.pensionsAnnuities,
      line5b_taxablePensions: income.taxablePensions,
      line6a_socialSecurity: income.socialSecurity,
      line6b_taxableSocialSecurity: income.taxableSocialSecurity,
      line7_capitalGainLoss: income.capitalGainLoss,
      line8_otherIncome: income.otherIncome,
      line9_totalIncome: income.totalIncome,
      line10_adjustments: adjustments,
      line11_adjustedGrossIncome: agi,
      line12_standardOrItemized: totalDeduction,
      line14_totalDeductions: totalDeduction,
      line15_taxableIncome: taxableIncome,
      line16_tax: taxFromBrackets,
      line17_schedule2Tax: additionalTaxes,
      line18_totalTax: totalTax,
      line19_childTaxCredit: totalCredits,
      line22_netTax: netTax,
      line24_totalTax: netTax,
      line25a_w2Withholding: calculatedData.payments?.withholding || 0,
      line26_estimatedPayments: calculatedData.payments?.estimatedPayments || 0,
      line32_totalPayments: totalPayments,
      line33_overpayment: refund,
      line34a_refundAmount: refund,
      line36_amountYouOwe: amountOwed,
      hasScheduleC: (calculatedData.scheduleC?.netProfit || 0) !== 0,
      hasScheduleSE: (calculatedData.scheduleC?.netProfit || 0) > 0,
      scheduleC_grossReceipts: calculatedData.scheduleC?.grossReceipts || 0,
      scheduleC_expenses: calculatedData.scheduleC?.expenses || 0,
      scheduleC_netProfit: calculatedData.scheduleC?.netProfit || 0,
    },
    create: {
      userId: input.userId,
      companyId: input.companyId,
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      firstName: input.personalInfo.firstName,
      middleInitial: input.personalInfo.middleInitial,
      lastName: input.personalInfo.lastName,
      ssn: input.personalInfo.ssn,
      spouseFirstName: input.personalInfo.spouseFirstName,
      spouseMiddleInitial: input.personalInfo.spouseMiddleInitial,
      spouseLastName: input.personalInfo.spouseLastName,
      spouseSsn: input.personalInfo.spouseSsn,
      homeAddress: input.personalInfo.homeAddress,
      aptNo: input.personalInfo.aptNo,
      city: input.personalInfo.city,
      state: input.personalInfo.state,
      zipCode: input.personalInfo.zipCode,
      youBornBefore1960: input.additionalDeductions?.youBornBefore1960 || false,
      youBlind: input.additionalDeductions?.youBlind || false,
      spouseBornBefore1960: input.additionalDeductions?.spouseBornBefore1960 || false,
      spouseBlind: input.additionalDeductions?.spouseBlind || false,
      dependents: input.dependents as any,
      line1a_w2Wages: income.wages,
      line2b_taxableInterest: income.taxableInterest,
      line3a_qualifiedDividends: income.qualifiedDividends,
      line3b_ordinaryDividends: income.ordinaryDividends,
      line4a_iraDistributions: income.iraDistributions,
      line4b_taxableIRA: income.taxableIRA,
      line5a_pensionsAnnuities: income.pensionsAnnuities,
      line5b_taxablePensions: income.taxablePensions,
      line6a_socialSecurity: income.socialSecurity,
      line6b_taxableSocialSecurity: income.taxableSocialSecurity,
      line7_capitalGainLoss: income.capitalGainLoss,
      line8_otherIncome: income.otherIncome,
      line9_totalIncome: income.totalIncome,
      line10_adjustments: adjustments,
      line11_adjustedGrossIncome: agi,
      line12_standardOrItemized: totalDeduction,
      line14_totalDeductions: totalDeduction,
      line15_taxableIncome: taxableIncome,
      line16_tax: taxFromBrackets,
      line17_schedule2Tax: additionalTaxes,
      line18_totalTax: totalTax,
      line19_childTaxCredit: totalCredits,
      line22_netTax: netTax,
      line24_totalTax: netTax,
      line25a_w2Withholding: calculatedData.payments?.withholding || 0,
      line26_estimatedPayments: calculatedData.payments?.estimatedPayments || 0,
      line32_totalPayments: totalPayments,
      line33_overpayment: refund,
      line34a_refundAmount: refund,
      line36_amountYouOwe: amountOwed,
      hasScheduleC: (calculatedData.scheduleC?.netProfit || 0) !== 0,
      hasScheduleSE: (calculatedData.scheduleC?.netProfit || 0) > 0,
      scheduleC_grossReceipts: calculatedData.scheduleC?.grossReceipts || 0,
      scheduleC_expenses: calculatedData.scheduleC?.expenses || 0,
      scheduleC_netProfit: calculatedData.scheduleC?.netProfit || 0,
    }
  });

  return form1040;
}

/**
 * Get Form 1040 by user and year
 */
export async function getForm1040(userId: string, taxYear: number) {
  return await prisma.taxForm1040.findUnique({
    where: {
      userId_taxYear: { userId, taxYear }
    }
  });
}

/**
 * Get AI suggestions for tax optimization
 */
export async function getAITaxSuggestions(form1040Data: any): Promise<any[]> {
  const suggestions: any[] = [];
  
  // Safe access to fields
  const agi = form1040Data.line11_adjustedGrossIncome || 0;
  const taxableIncome = form1040Data.line15_taxableIncome || 0;
  const totalTax = form1040Data.line24_totalTax || 0;
  const amountOwed = form1040Data.line36_amountYouOwe || 0;
  const refund = form1040Data.line34a_refundAmount || 0;
  const scheduleC_netProfit = form1040Data.scheduleC_netProfit || 0;
  const w2Wages = form1040Data.line1a_w2Wages || 0;
  const dependents = form1040Data.dependents || [];
  const filingStatus = form1040Data.filingStatus || 'SINGLE';
  const standardDeduction = form1040Data.line12_standardOrItemized || 0;

  // Always provide general optimization tips
  if (agi > 0) {
    suggestions.push({
      type: 'general',
      title: '💡 Estrategia de Planificación Tributaria',
      description: `Con un AGI de $${agi.toFixed(2)}, considere estrategias de planificación fiscal durante el año para minimizar impuestos futuros. Esto incluye: contribuciones a cuentas de retiro, gastos médicos agrupados, y timing de ingresos/deducciones.`,
      potentialSavings: null
    });
  }

  // Retirement contribution suggestions
  if (w2Wages > 0 || scheduleC_netProfit > 0) {
    const totalEarnings = w2Wages + scheduleC_netProfit;
    const iraContributionLimit = 7000; // 2024 limit ($6,500 + $1,000 catch-up if 50+)
    
    suggestions.push({
      type: 'retirement',
      title: '🏦 Contribución a IRA Tradicional',
      description: `Puede contribuir hasta $${iraContributionLimit.toLocaleString()} a una IRA tradicional antes del 15 de abril del próximo año y reducir su AGI. Esto puede bajar su tasa impositiva efectiva y aumentar su reembolso.`,
      potentialSavings: iraContributionLimit * 0.22 // Assuming 22% bracket
    });
  }

  // SEP-IRA for self-employed
  if (scheduleC_netProfit > 400) {
    const maxSEPContribution = Math.min(scheduleC_netProfit * 0.20, 69000); // 20% for Schedule C
    suggestions.push({
      type: 'retirement',
      title: '💼 SEP-IRA para Trabajadores Independientes',
      description: `Como trabajador independiente con ganancia neta de $${scheduleC_netProfit.toFixed(2)}, puede contribuir hasta $${maxSEPContribution.toFixed(0)} a una SEP-IRA. Esta contribución reduce directamente su ingreso gravable.`,
      potentialSavings: maxSEPContribution * 0.24
    });

    // Health insurance deduction
    suggestions.push({
      type: 'health',
      title: '🏥 Deducción de Seguro de Salud',
      description: 'Los trabajadores independientes pueden deducir el 100% de las primas de seguro de salud (medical, dental, long-term care) para usted, su cónyuge y dependientes como un ajuste al ingreso (above-the-line deduction). Esta deducción reduce su AGI y no está limitada por el 7.5% del AGI.',
      potentialSavings: 12000 * 0.24 // Estimate $12k annual premium
    });

    // Home office deduction
    suggestions.push({
      type: 'business',
      title: '🏠 Deducción de Oficina en Casa',
      description: 'Si usa una parte de su hogar EXCLUSIVAMENTE para negocios de manera regular, puede deducir: (1) Método simplificado: $5 por pie cuadrado hasta 300 sq ft = $1,500 max, o (2) Método real: porcentaje de hipoteca/renta, utilities, seguros, reparaciones, depreciación.',
      potentialSavings: 1500 * 0.24
    });

    // QBI Deduction
    if (scheduleC_netProfit > 0 && taxableIncome < 191950) {
      const qbiDeduction = Math.min(scheduleC_netProfit * 0.20, taxableIncome * 0.20);
      suggestions.push({
        type: 'business',
        title: '📊 Deducción QBI (Qualified Business Income)',
        description: `Puede calificar para una deducción del 20% de su ingreso calificado de negocio (QBI). Esto podría ser hasta $${qbiDeduction.toFixed(2)}. Esta deducción reduce directamente su ingreso gravable sin necesidad de gastos adicionales.`,
        potentialSavings: qbiDeduction * 0.24
      });
    }

    // Mileage tracking
    suggestions.push({
      type: 'business',
      title: '🚗 Deducción de Millas de Negocio',
      description: 'Rastree TODAS las millas de negocio. En 2024, la tasa es $0.67 por milla. Si maneja 10,000 millas al año para negocios = $6,700 de deducción. Use una app como MileIQ para rastrear automáticamente.',
      potentialSavings: 6700 * 0.24
    });
  }

  // Estimated tax payments to avoid penalties
  if (amountOwed > 1000) {
    const penalty = amountOwed * 0.05;
    suggestions.push({
      type: 'planning',
      title: '⚠️ Evite Multas con Pagos Estimados',
      description: `Debe $${amountOwed.toFixed(2)} en impuestos. Si debe más de $1,000, puede enfrentar multas por pago insuficiente. Haga pagos estimados trimestrales en 2026 (fechas: 4/15, 6/15, 9/15, 1/15/2027). Pague al menos el 90% del impuesto de 2026 o 100% del impuesto de 2025.`,
      potentialSavings: penalty
    });
  }

  // HSA contributions
  if (w2Wages > 0 || scheduleC_netProfit > 0) {
    const hsaLimit = filingStatus.includes('MARRIED') ? 8300 : 4150; // 2024 family/individual limits
    suggestions.push({
      type: 'health',
      title: '💊 Health Savings Account (HSA)',
      description: `Si tiene un plan de salud con deducible alto (HDHP), puede contribuir hasta $${hsaLimit.toLocaleString()} a una HSA. Triple beneficio tributario: (1) Deducible al contribuir, (2) Crece sin impuestos, (3) Retiros sin impuestos para gastos médicos calificados.`,
      potentialSavings: hsaLimit * 0.22
    });
  }

  // Child Tax Credit optimization
  if (dependents && dependents.length > 0) {
    const eligibleChildren = dependents.filter((d: any) => d.childTaxCredit).length;
    const potentialCredit = eligibleChildren * 2000;
    
    if (potentialCredit > 0) {
      suggestions.push({
        type: 'credits',
        title: '👨‍👩‍👧‍👦 Maximice Child Tax Credit',
        description: `Tiene ${eligibleChildren} niño(s) elegible(s) para el Child Tax Credit. Asegúrese de: (1) Tener SSN válido para cada niño, (2) El niño vivió con usted 6+ meses, (3) El niño es menor de 17 años al final del año. Crédito potencial: $${potentialCredit.toLocaleString()}. Hasta $1,700 por niño es reembolsable.`,
        potentialSavings: potentialCredit
      });
    }

    // Dependent Care Credit
    suggestions.push({
      type: 'credits',
      title: '👶 Crédito por Cuidado de Dependientes',
      description: 'Si paga por cuidado de niños menores de 13 años para poder trabajar, puede calificar para el Child and Dependent Care Credit. Hasta $3,000 en gastos por 1 niño ($6,000 por 2+). El crédito es 20-35% de los gastos según su AGI.',
      potentialSavings: 6000 * 0.35
    });
  }

  // Itemized deductions review
  if (standardDeduction > 0) {
    const threshold = filingStatus.includes('MARRIED') ? 29200 : 
                      filingStatus === 'HEAD_OF_HOUSEHOLD' ? 21900 : 14600;
    
    suggestions.push({
      type: 'deduction',
      title: '📋 Revise si Itemizar es Mejor',
      description: `Está usando la deducción estándar de $${standardDeduction.toFixed(2)}. Si tiene: hipoteca ($750k límite), impuestos estatales/locales ($10k límite), donaciones caritativas, gastos médicos (>7.5% AGI), considere itemizar. Si sus deducciones detalladas > $${threshold.toLocaleString()}, ahorrará más.`,
      potentialSavings: null
    });
  }

  // Charitable contributions
  suggestions.push({
    type: 'deduction',
    title: '❤️ Donaciones Caritativas',
    description: 'Haga donaciones a organizaciones 501(c)(3) calificadas antes del 31 de diciembre. Si dona activos apreciados (acciones que han subido de valor), evita pagar impuestos sobre las ganancias de capital Y puede deducir el valor total de mercado. Estrategia: Done activos apreciados en vez de efectivo.',
    potentialSavings: null
  });

  // Tax loss harvesting
  if (form1040Data.line7_capitalGainLoss !== undefined) {
    suggestions.push({
      type: 'investment',
      title: '📈 Tax Loss Harvesting',
      description: 'Revise su portafolio de inversiones. Puede vender inversiones con pérdidas para compensar ganancias de capital. Las pérdidas netas de capital pueden deducir hasta $3,000 de ingreso ordinario por año. Las pérdidas adicionales se trasladan a años futuros.',
      potentialSavings: 3000 * 0.22
    });
  }

  // Roth conversion strategy
  if (refund > 5000 || (agi > 0 && agi < 100000)) {
    suggestions.push({
      type: 'retirement',
      title: '💰 Considere Conversión Roth',
      description: 'Si su ingreso es bajo este año, considere convertir parte de su IRA tradicional a Roth IRA. Pagará impuestos ahora a una tasa potencialmente más baja, pero los retiros futuros serán libres de impuestos. Estrategia útil en años de bajo ingreso o jubilación temprana.',
      potentialSavings: null
    });
  }

  // Energy credits
  suggestions.push({
    type: 'credits',
    title: '🌞 Créditos de Energía',
    description: 'Créditos disponibles para mejoras de energía: (1) 30% de crédito para paneles solares (sin límite), (2) 30% hasta $1,200 para ventanas/puertas eficientes, (3) 30% hasta $2,000 para bombas de calor. Estos créditos reducen su impuesto dólar por dólar.',
    potentialSavings: null
  });

  // Student loan interest
  if (w2Wages > 0 && agi < 185000) {
    suggestions.push({
      type: 'deduction',
      title: '🎓 Deducción de Intereses de Préstamos Estudiantiles',
      description: 'Puede deducir hasta $2,500 en intereses de préstamos estudiantiles como un ajuste al ingreso (above-the-line). No necesita itemizar. La deducción se elimina gradualmente para AGI > $75k (soltero) o $155k (casado).',
      potentialSavings: 2500 * 0.22
    });
  }

  // State and local taxes
  suggestions.push({
    type: 'planning',
    title: '🏛️ Planificación de Impuestos Estatales',
    description: 'El límite SALT (State and Local Taxes) es $10,000. Si está cerca de este límite, considere: (1) Prepagar impuestos estatales en enero, (2) Pagar impuestos de propiedad por adelantado, (3) Hacer donaciones caritativas que den créditos estatales.',
    potentialSavings: null
  });

  // Always add final tip
  suggestions.push({
    type: 'general',
    title: '📚 Consulte con un Profesional',
    description: 'Estas sugerencias son generales. Para maximizar ahorros y asegurar cumplimiento, consulte con un CPA o Enrolled Agent. El costo de asesoría profesional ($200-500) puede ahorrarle miles en impuestos y evitar errores costosos.',
    potentialSavings: null
  });

  return suggestions;
}

/**
 * Generate Form 1040 summary for display
 */
export function generateForm1040Summary(form1040: any): string {
  return `
FORM 1040 - U.S. Individual Income Tax Return (${form1040.taxYear})

INFORMACIÓN PERSONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: ${form1040.firstName} ${form1040.middleInitial || ''} ${form1040.lastName}
SSN: XXX-XX-${form1040.ssn.slice(-4)}
Estado Civil: ${form1040.filingStatus}
Dirección: ${form1040.homeAddress}, ${form1040.city}, ${form1040.state} ${form1040.zipCode}

INGRESOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1a. Salarios (W-2):                    $${form1040.line1a_w2Wages.toFixed(2)}
2b. Intereses Gravables:               $${form1040.line2b_taxableInterest.toFixed(2)}
3b. Dividendos Ordinarios:             $${form1040.line3b_ordinaryDividends.toFixed(2)}
8.  Otros Ingresos (Schedule 1):       $${form1040.line8_otherIncome.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9.  INGRESO TOTAL:                     $${form1040.line9_totalIncome.toFixed(2)}

AJUSTES E INGRESO BRUTO AJUSTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. Ajustes:                           $${form1040.line10_adjustments.toFixed(2)}
11. INGRESO BRUTO AJUSTADO (AGI):      $${form1040.line11_adjustedGrossIncome.toFixed(2)}

DEDUCCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. Deducción Estándar/Detallada:      $${form1040.line12_standardOrItemized.toFixed(2)}
15. INGRESO GRAVABLE:                  $${form1040.line15_taxableIncome.toFixed(2)}

IMPUESTO Y CRÉDITOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. Impuesto (de tablas):              $${form1040.line16_tax.toFixed(2)}
17. Impuestos Adicionales (Sch 2):     $${form1040.line17_schedule2Tax.toFixed(2)}
18. Impuesto Total:                    $${form1040.line18_totalTax.toFixed(2)}
19. Créditos:                          $${form1040.line19_childTaxCredit.toFixed(2)}
24. IMPUESTO NETO:                     $${form1040.line24_totalTax.toFixed(2)}

PAGOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25a. Retenciones (W-2):                $${form1040.line25a_w2Withholding.toFixed(2)}
26. Pagos Estimados:                   $${form1040.line26_estimatedPayments.toFixed(2)}
32. PAGOS TOTALES:                     $${form1040.line32_totalPayments.toFixed(2)}

RESULTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${form1040.line33_overpayment > 0 
  ? `34. REEMBOLSO:                         $${form1040.line34a_refundAmount.toFixed(2)}`
  : `36. CANTIDAD ADEUDADA:                 $${form1040.line36_amountYouOwe.toFixed(2)}`}
`;
}

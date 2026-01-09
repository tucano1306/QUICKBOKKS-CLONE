/**
 * IRS FORM 1040 SERVICE
 * 
 * Genera y calcula el Form 1040 - U.S. Individual Income Tax Return
 * Incluye todos los schedules principales y asistencia de IA
 */

import { prisma } from './prisma';

// Tax brackets for 2024 (adjust as needed for different years)
const TAX_BRACKETS_2024 = {
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
};

// Standard Deduction amounts for 2024
const STANDARD_DEDUCTION_2024 = {
  SINGLE: 14600,
  MARRIED_FILING_JOINTLY: 29200,
  MARRIED_FILING_SEPARATELY: 14600,
  HEAD_OF_HOUSEHOLD: 21900,
  QUALIFYING_SURVIVING_SPOUSE: 29200,
};

// Additional deduction for age 65+ or blind (per person)
const ADDITIONAL_DEDUCTION_2024 = {
  SINGLE: 1950,
  MARRIED: 1550,
};

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
 * Calculate tax based on brackets
 */
export function calculateTaxFromBrackets(
  taxableIncome: number,
  filingStatus: string
): number {
  const brackets = TAX_BRACKETS_2024[filingStatus as keyof typeof TAX_BRACKETS_2024] || TAX_BRACKETS_2024.SINGLE;
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
 * Calculate standard deduction based on filing status and age/blind status
 */
export function calculateStandardDeduction(
  filingStatus: string,
  additionalDeductions?: {
    youBornBefore1960?: boolean;
    youBlind?: boolean;
    spouseBornBefore1960?: boolean;
    spouseBlind?: boolean;
  }
): number {
  let deduction = STANDARD_DEDUCTION_2024[filingStatus as keyof typeof STANDARD_DEDUCTION_2024] || STANDARD_DEDUCTION_2024.SINGLE;
  
  if (additionalDeductions) {
    const isMarried = filingStatus.includes('MARRIED');
    const additionalAmount = isMarried ? ADDITIONAL_DEDUCTION_2024.MARRIED : ADDITIONAL_DEDUCTION_2024.SINGLE;
    
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
    input.additionalDeductions
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
  
  // Calculate tax
  const taxFromBrackets = calculateTaxFromBrackets(taxableIncome, input.filingStatus);
  
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
  
  // Check if using standard deduction when itemized might be better
  if (form1040Data.line12_standardOrItemized === form1040Data.standardDeduction) {
    suggestions.push({
      type: 'deduction',
      title: 'Revisar Deducción Detallada',
      description: 'Actualmente está usando la deducción estándar. Revise si tiene suficientes gastos deducibles (hipoteca, impuestos estatales, donaciones) que excedan la deducción estándar.',
      potentialSavings: null
    });
  }

  // Check for retirement contributions
  if (form1040Data.scheduleC_netProfit > 0) {
    const maxSEPContribution = Math.min(form1040Data.scheduleC_netProfit * 0.25, 69000);
    suggestions.push({
      type: 'retirement',
      title: 'Contribución SEP-IRA',
      description: `Como trabajador independiente, puede contribuir hasta $${maxSEPContribution.toFixed(0)} a una SEP-IRA y reducir su ingreso gravable.`,
      potentialSavings: maxSEPContribution * 0.24 // Assuming 24% bracket
    });
  }

  // Check for health insurance deduction
  if (form1040Data.scheduleC_netProfit > 0) {
    suggestions.push({
      type: 'health',
      title: 'Deducción de Seguro de Salud',
      description: 'Los trabajadores independientes pueden deducir el 100% de las primas de seguro de salud como un ajuste al ingreso.',
      potentialSavings: null
    });
  }

  // Check for home office deduction
  if (form1040Data.scheduleC_netProfit > 0) {
    suggestions.push({
      type: 'business',
      title: 'Deducción de Oficina en Casa',
      description: 'Si usa una parte de su hogar exclusivamente para negocios, puede calificar para la deducción de oficina en casa.',
      potentialSavings: null
    });
  }

  // Check for estimated payments
  if (form1040Data.line36_amountYouOwe > 1000) {
    suggestions.push({
      type: 'planning',
      title: 'Pagos Estimados Trimestrales',
      description: 'Debe más de $1,000 en impuestos. Considere hacer pagos estimados trimestrales para evitar multas por pago insuficiente.',
      potentialSavings: form1040Data.line36_amountYouOwe * 0.05 // Approximate penalty
    });
  }

  // Check for child tax credit
  if (form1040Data.dependents && form1040Data.dependents.length > 0) {
    suggestions.push({
      type: 'credits',
      title: 'Crédito Tributario por Hijos',
      description: 'Verifique que todos sus dependientes elegibles estén reclamando el máximo crédito disponible ($2,000 por hijo menor de 17 años).',
      potentialSavings: null
    });
  }

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

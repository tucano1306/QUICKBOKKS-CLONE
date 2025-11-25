/**
 * TAX FORMS GENERATION SERVICE
 * 
 * Genera formularios tributarios obligatorios:
 * - Form 941: Quarterly Federal Tax Return
 * - Form 940: Annual FUTA Tax Return
 * - RT-6: Florida Quarterly Reemployment Tax Report
 * - W-2: Wage and Tax Statement (Individual)
 * - W-3: Transmittal of Wage and Tax Statements
 */

import { prisma } from './prisma';

// ============== INTERFACES ==============

export interface Form941Data {
  quarter: number;
  year: number;
  ein: string;
  companyName: string;
  companyAddress: string;
  numberOfEmployees: number;
  wagesAndTips: number;
  federalIncomeTaxWithheld: number;
  socialSecurityWages: number;
  socialSecurityTax: number;
  medicareWages: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalTaxes: number;
  totalDeposits: number;
  balanceDue: number;
  overpayment: number;
}

export interface Form940Data {
  year: number;
  ein: string;
  companyName: string;
  companyAddress: string;
  stateQualification: string;
  totalPayments: number;
  exemptPayments: number;
  paymentsExcludingFUTA: number;
  totalFUTAWages: number;
  futaTaxBeforeAdjustments: number;
  stateUnemploymentTaxCredit: number;
  totalFUTATax: number;
  totalDeposits: number;
  balanceDue: number;
  overpayment: number;
}

export interface RT6Data {
  quarter: number;
  year: number;
  employerAccountNumber: string;
  companyName: string;
  companyAddress: string;
  totalWages: number;
  excessWages: number;
  taxableWages: number;
  taxRate: number; // Florida SUI rate (default 2.7%)
  taxDue: number;
  adjustments: number;
  totalDue: number;
  employeeCount: number;
  employees: Array<{
    ssn: string;
    name: string;
    wages: number;
  }>;
}

export interface W2Data {
  year: number;
  ein: string;
  companyName: string;
  companyAddress: string;
  employeeSSN: string;
  employeeName: string;
  employeeAddress: string;
  wages: number;
  federalIncomeTaxWithheld: number;
  socialSecurityWages: number;
  socialSecurityTaxWithheld: number;
  medicareWages: number;
  medicareTaxWithheld: number;
  stateWages: number;
  stateIncomeTaxWithheld: number;
  stateName: string;
  stateEIN: string;
}

export interface W3Data {
  year: number;
  ein: string;
  companyName: string;
  companyAddress: string;
  establishmentNumber: string;
  numberOfW2Forms: number;
  totalWages: number;
  totalFederalIncomeTaxWithheld: number;
  totalSocialSecurityWages: number;
  totalSocialSecurityTaxWithheld: number;
  totalMedicareWages: number;
  totalMedicareTaxWithheld: number;
  totalStateWages: number;
  totalStateIncomeTaxWithheld: number;
}

// ============== FORM 941 - QUARTERLY FEDERAL TAX ==============

export async function generateForm941(
  companyId: string,
  quarter: number,
  year: number
): Promise<Form941Data> {
  // Calcular fechas del trimestre
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  // Obtener todos los payrolls del trimestre
  const payrolls = await prisma.payroll.findMany({
    where: {
      periodStart: { gte: quarterStart, lte: quarterEnd },
    },
    include: {
      employee: true,
    },
  });

  let totalWages = 0;
  let totalFederalTax = 0;
  let totalSocialSecurityWages = 0;
  let totalSocialSecurityTax = 0;
  let totalMedicareWages = 0;
  let totalMedicareTax = 0;
  let totalAdditionalMedicareTax = 0;

  const employeeSet = new Set<string>();

  payrolls.forEach(payroll => {
    employeeSet.add(payroll.employeeId);

    const grossPay = parseFloat(payroll.grossSalary.toString());
    totalWages += grossPay;

    // Impuesto federal retenido (aproximación 15% de deducciones)
    const federalTax = payroll.deductions * 0.15;
    totalFederalTax += federalTax;

    // Social Security (6.2% hasta el límite)
    const SS_LIMIT = 168600; // 2024 limit
    const ssWages = Math.min(grossPay, SS_LIMIT);
    totalSocialSecurityWages += ssWages;
    totalSocialSecurityTax += ssWages * 0.062;

    // Medicare (1.45% sin límite)
    totalMedicareWages += grossPay;
    totalMedicareTax += grossPay * 0.0145;

    // Additional Medicare (0.9% sobre $200,000)
    if (grossPay > 200000) {
      const additionalWages = grossPay - 200000;
      totalAdditionalMedicareTax += additionalWages * 0.009;
    }
  });

  const totalTaxes = totalFederalTax + totalSocialSecurityTax + totalMedicareTax + totalAdditionalMedicareTax;

  // Buscar depósitos realizados (simplificado - en producción buscar en tabla de pagos de impuestos)
  const totalDeposits = totalTaxes; // Asumir que se depositó correctamente

  const balanceDue = Math.max(0, totalTaxes - totalDeposits);
  const overpayment = Math.max(0, totalDeposits - totalTaxes);

  const form941: Form941Data = {
    quarter,
    year,
    ein: 'XX-XXXXXXX', // Obtener del perfil de la empresa
    companyName: 'Company Name', // Obtener del perfil
    companyAddress: 'Company Address', // Obtener del perfil
    numberOfEmployees: employeeSet.size,
    wagesAndTips: totalWages,
    federalIncomeTaxWithheld: totalFederalTax,
    socialSecurityWages: totalSocialSecurityWages,
    socialSecurityTax: totalSocialSecurityTax,
    medicareWages: totalMedicareWages,
    medicareTax: totalMedicareTax,
    additionalMedicareTax: totalAdditionalMedicareTax,
    totalTaxes,
    totalDeposits,
    balanceDue,
    overpayment,
  };

  // Guardar en la base de datos
  // TODO: Agregar modelo TaxForm941 al schema de Prisma
  /*
  await prisma.taxForm941.create({
    data: {
      userId: companyId,
      quarter,
      year,
      numberOfEmployees: employeeSet.size,
      wagesAndTips: totalWages,
      federalIncomeTaxWithheld: totalFederalTax,
      socialSecurityWages: totalSocialSecurityWages,
      socialSecurityTax: totalSocialSecurityTax,
      medicareWages: totalMedicareWages,
      medicareTax: totalMedicareTax,
      totalTaxes,
      deposits: totalDeposits,
      balanceDue,
      overpayment,
      status: 'DRAFT',
    },
  });
  */

  return form941;
}

// ============== FORM 940 - ANNUAL FUTA TAX ==============

export async function generateForm940(
  companyId: string,
  year: number
): Promise<Form940Data> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // Obtener todos los payrolls del año
  const payrolls = await prisma.payroll.findMany({
    where: {
      periodStart: { gte: yearStart, lte: yearEnd },
    },
    include: {
      employee: true,
    },
  });

  let totalPayments = 0;
  let exemptPayments = 0;
  let paymentsExcludingFUTA = 0;

  const FUTA_WAGE_BASE = 7000; // Base salarial FUTA
  const FUTA_RATE = 0.006; // 0.6% después del crédito estatal

  const employeeWages: Record<string, number> = {};

  payrolls.forEach(payroll => {
    const employeeId = payroll.employeeId;
    const grossPay = parseFloat(payroll.grossSalary.toString());
    
    totalPayments += grossPay;

    if (!employeeWages[employeeId]) {
      employeeWages[employeeId] = 0;
    }
    employeeWages[employeeId] += grossPay;
  });

  // Calcular salarios FUTA (solo primeros $7,000 por empleado)
  let totalFUTAWages = 0;
  Object.values(employeeWages).forEach(wages => {
    totalFUTAWages += Math.min(wages, FUTA_WAGE_BASE);
  });

  const futaTaxBeforeAdjustments = totalFUTAWages * 0.06; // 6% antes del crédito
  const stateUnemploymentTaxCredit = totalFUTAWages * 0.054; // 5.4% crédito estatal
  const totalFUTATax = totalFUTAWages * FUTA_RATE; // 0.6% neto

  // Depósitos realizados (simplificado)
  const totalDeposits = totalFUTATax;

  const balanceDue = Math.max(0, totalFUTATax - totalDeposits);
  const overpayment = Math.max(0, totalDeposits - totalFUTATax);

  const form940: Form940Data = {
    year,
    ein: 'XX-XXXXXXX',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    stateQualification: 'FL', // Florida
    totalPayments,
    exemptPayments,
    paymentsExcludingFUTA,
    totalFUTAWages,
    futaTaxBeforeAdjustments,
    stateUnemploymentTaxCredit,
    totalFUTATax,
    totalDeposits,
    balanceDue,
    overpayment,
  };

  // Guardar en la base de datos
  // TODO: Agregar modelo TaxForm940 al schema de Prisma
  /*
  await prisma.taxForm940.create({
    data: {
      userId: companyId,
      year,
      totalWages: totalPayments,
      exemptWages: exemptPayments,
      excessWages: paymentsExcludingFUTA,
      taxableWages: totalFUTAWages,
      futaTax: totalFUTATax,
      stateUnemploymentCredit: stateUnemploymentTaxCredit,
      deposits: totalDeposits,
      balanceDue,
      overpayment,
      status: 'DRAFT',
    },
  });
  */

  return form940;
}

// ============== RT-6 - FLORIDA REEMPLOYMENT TAX ==============

export async function generateRT6(
  companyId: string,
  quarter: number,
  year: number
): Promise<RT6Data> {
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  // Obtener payrolls del trimestre
  const payrolls = await prisma.payroll.findMany({
    where: {
      periodStart: { gte: quarterStart, lte: quarterEnd },
    },
    include: {
      employee: true,
    },
  });

  const FLORIDA_SUI_RATE = 0.027; // 2.7% Florida SUI
  const WAGE_BASE = 7000; // Base salarial Florida

  let totalWages = 0;
  let excessWages = 0;
  let taxableWages = 0;

  const employeeWages: Record<string, { name: string; ssn: string; wages: number }> = {};

  payrolls.forEach(payroll => {
    const employeeId = payroll.employeeId;
    const grossPay = parseFloat(payroll.grossSalary.toString());
    
    if (!employeeWages[employeeId]) {
      employeeWages[employeeId] = {
        name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        ssn: payroll.employee.taxId || '***-**-****',
        wages: 0,
      };
    }
    
    employeeWages[employeeId].wages += grossPay;
    totalWages += grossPay;
  });

  // Calcular salarios gravables (primeros $7,000 por empleado)
  const employees: Array<{ ssn: string; name: string; wages: number }> = [];
  
  Object.values(employeeWages).forEach(emp => {
    const taxable = Math.min(emp.wages, WAGE_BASE);
    const excess = Math.max(0, emp.wages - WAGE_BASE);
    
    taxableWages += taxable;
    excessWages += excess;
    
    employees.push({
      ssn: emp.ssn,
      name: emp.name,
      wages: emp.wages,
    });
  });

  const taxDue = taxableWages * FLORIDA_SUI_RATE;
  const adjustments = 0;
  const totalDue = taxDue + adjustments;

  const rt6: RT6Data = {
    quarter,
    year,
    employerAccountNumber: 'FL-XXXXXXX',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    totalWages,
    excessWages,
    taxableWages,
    taxRate: FLORIDA_SUI_RATE,
    taxDue,
    adjustments,
    totalDue,
    employeeCount: Object.keys(employeeWages).length,
    employees,
  };

  // Guardar en la base de datos
  // TODO: Agregar modelo FloridaRT6 al schema de Prisma
  /*
  await prisma.floridaRT6.create({
    data: {
      userId: companyId,
      quarter,
      year,
      totalWages,
      excessWages,
      taxableWages,
      taxRate: FLORIDA_SUI_RATE,
      contributionDue: taxDue,
      adjustments,
      totalDue,
      employeeCount: Object.keys(employeeWages).length,
      status: 'DRAFT',
    },
  });
  */

  // Return placeholder since model doesn't exist - return the full RT6Data
  return rt6;
}

// ============== W-2 - WAGE AND TAX STATEMENT ==============

export async function generateW2(
  companyId: string,
  employeeId: string,
  year: number
): Promise<W2Data> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // Obtener employee
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Empleado no encontrado');
  }

  // Obtener todos los payrolls del empleado en el año
  const payrolls = await prisma.payroll.findMany({
    where: {
      employeeId,
      periodStart: { gte: yearStart, lte: yearEnd },
    },
  });

  let totalWages = 0;
  let federalIncomeTaxWithheld = 0;
  let socialSecurityWages = 0;
  let socialSecurityTaxWithheld = 0;
  let medicareWages = 0;
  let medicareTaxWithheld = 0;
  let stateWages = 0;
  let stateIncomeTaxWithheld = 0;

  const SS_LIMIT = 168600; // 2024 limit
  let ssWagesYTD = 0;

  payrolls.forEach(payroll => {
    const grossPay = parseFloat(payroll.grossSalary.toString());
    totalWages += grossPay;
    stateWages += grossPay;

    // Federal Income Tax (aproximación 15% de deducciones)
    const federalTax = payroll.deductions * 0.15;
    federalIncomeTaxWithheld += federalTax;

    // State Income Tax (Florida no tiene, pero otras estados sí)
    // Aproximación 5% de deducciones
    const stateTax = payroll.deductions * 0.05;
    stateIncomeTaxWithheld += stateTax;

    // Social Security (6.2% hasta el límite)
    const ssWagesThisPeriod = Math.min(grossPay, SS_LIMIT - ssWagesYTD);
    if (ssWagesThisPeriod > 0) {
      socialSecurityWages += ssWagesThisPeriod;
      socialSecurityTaxWithheld += ssWagesThisPeriod * 0.062;
      ssWagesYTD += ssWagesThisPeriod;
    }

    // Medicare (1.45% sin límite)
    medicareWages += grossPay;
    medicareTaxWithheld += grossPay * 0.0145;

    // Additional Medicare 0.9% sobre $200,000 (incluido en medicareTax)
    if (grossPay > 200000) {
      medicareTaxWithheld += (grossPay - 200000) * 0.009;
    }
  });

  const w2: W2Data = {
    year,
    ein: 'XX-XXXXXXX',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    employeeSSN: employee.taxId || '***-**-****',
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeAddress: employee.address || '',
    wages: totalWages,
    federalIncomeTaxWithheld,
    socialSecurityWages,
    socialSecurityTaxWithheld,
    medicareWages,
    medicareTaxWithheld,
    stateWages,
    stateIncomeTaxWithheld,
    stateName: 'FL',
    stateEIN: '',
  };

  return w2;
}

// ============== W-3 - TRANSMITTAL SUMMARY ==============

export async function generateW3(
  companyId: string,
  year: number
): Promise<W3Data> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // Obtener todos los empleados
  const employees = await prisma.employee.findMany({
    where: { userId: companyId },
  });

  let totalWages = 0;
  let totalFederalIncomeTaxWithheld = 0;
  let totalSocialSecurityWages = 0;
  let totalSocialSecurityTaxWithheld = 0;
  let totalMedicareWages = 0;
  let totalMedicareTaxWithheld = 0;
  let totalStateWages = 0;
  let totalStateIncomeTaxWithheld = 0;

  // Generar W-2 para cada empleado y sumar totales
  for (const employee of employees) {
    const w2 = await generateW2(companyId, employee.id, year);
    
    totalWages += w2.wages;
    totalFederalIncomeTaxWithheld += w2.federalIncomeTaxWithheld;
    totalSocialSecurityWages += w2.socialSecurityWages;
    totalSocialSecurityTaxWithheld += w2.socialSecurityTaxWithheld;
    totalMedicareWages += w2.medicareWages;
    totalMedicareTaxWithheld += w2.medicareTaxWithheld;
    totalStateWages += w2.stateWages;
    totalStateIncomeTaxWithheld += w2.stateIncomeTaxWithheld;
  }

  const w3: W3Data = {
    year,
    ein: 'XX-XXXXXXX',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    establishmentNumber: '001',
    numberOfW2Forms: employees.length,
    totalWages,
    totalFederalIncomeTaxWithheld,
    totalSocialSecurityWages,
    totalSocialSecurityTaxWithheld,
    totalMedicareWages,
    totalMedicareTaxWithheld,
    totalStateWages,
    totalStateIncomeTaxWithheld,
  };

  return w3;
}

// ============== HELPER FUNCTIONS ==============

export async function getQuarterlyForms941(companyId: string, year: number) {
  // TODO: Agregar modelo TaxForm941 al schema de Prisma
  return [];
  /*
  return await prisma.taxForm941.findMany({
    where: { userId: companyId, year },
    orderBy: { quarter: 'asc' },
  });
  */
}

export async function getAnnualForm940(companyId: string, year: number) {
  // TODO: Agregar modelo TaxForm940 al schema de Prisma
  return null;
  /*
  return await prisma.taxForm940.findFirst({
    where: { userId: companyId, year },
  });
  */
}

export async function getQuarterlyRT6(companyId: string, year: number) {
  // TODO: Agregar modelo FloridaRT6 al schema de Prisma
  return [];
  /*
  return await prisma.floridaRT6.findMany({
    where: { userId: companyId, year },
    orderBy: { quarter: 'asc' },
  });
  */
}

export async function getAllW2ForYear(companyId: string, year: number) {
  const employees = await prisma.employee.findMany({
    where: { userId: companyId },
  });

  const w2Forms: W2Data[] = [];
  for (const employee of employees) {
    const w2 = await generateW2(companyId, employee.id, year);
    w2Forms.push(w2);
  }

  return w2Forms;
}

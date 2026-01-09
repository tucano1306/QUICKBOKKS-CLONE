/**
 * TAX FORMS GENERATION SERVICE
 * 
 * Genera formularios tributarios obligatorios:
 * - Form 941: Quarterly Federal Tax Return
 * - Form 940: Annual FUTA Tax Return
 * - RT-6: Florida Quarterly Reemployment Tax Report
 * - W-2: Wage and Tax Statement (Individual)
 * - W-3: Transmittal of Wage and Tax Statements
 * - Form 1099-NEC: Nonemployee Compensation
 * - Form 1096: Annual Summary and Transmittal of U.S. Information Returns
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

export interface Form1099NECData {
  year: number;
  payerName: string;
  payerEIN: string;
  payerAddress: string;
  recipientName: string;
  recipientTIN: string;
  recipientAddress: string;
  box1NonemployeeCompensation: number;
  box4FederalTaxWithheld: number;
  box5StateTaxWithheld: number;
  box6StateIncome: number;
  stateName: string;
  statePayerNumber: string;
}

export interface Form1096Data {
  year: number;
  payerName: string;
  payerEIN: string;
  payerAddress: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  formType: string;
  totalForms: number;
  totalAmount: number;
  form1099Ids: string[];
}

// ============== FORM 941 - QUARTERLY FEDERAL TAX ==============

export async function generateForm941(
  companyId: string,
  quarter: number,
  year: number
): Promise<Form941Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Calcular fechas del trimestre
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  // Obtener todos los payrolls del trimestre
  const payrolls = await prisma.payroll.findMany({
    where: {
      companyId,
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
    ein: company.taxId || 'XX-XXXXXXX',
    companyName: company.name,
    companyAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
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

  // Guardar o actualizar en la base de datos
  await prisma.taxForm941.upsert({
    where: {
      companyId_quarter_year: { companyId, quarter, year }
    },
    update: {
      ein: form941.ein,
      companyName: form941.companyName,
      companyAddress: form941.companyAddress,
      numberOfEmployees: form941.numberOfEmployees,
      wagesAndTips: form941.wagesAndTips,
      federalIncomeTaxWithheld: form941.federalIncomeTaxWithheld,
      socialSecurityWages: form941.socialSecurityWages,
      socialSecurityTax: form941.socialSecurityTax,
      medicareWages: form941.medicareWages,
      medicareTax: form941.medicareTax,
      additionalMedicareTax: form941.additionalMedicareTax,
      totalTaxes: form941.totalTaxes,
      totalDeposits: form941.totalDeposits,
      balanceDue: form941.balanceDue,
      overpayment: form941.overpayment,
    },
    create: {
      companyId,
      quarter,
      year,
      ein: form941.ein,
      companyName: form941.companyName,
      companyAddress: form941.companyAddress,
      numberOfEmployees: form941.numberOfEmployees,
      wagesAndTips: form941.wagesAndTips,
      federalIncomeTaxWithheld: form941.federalIncomeTaxWithheld,
      socialSecurityWages: form941.socialSecurityWages,
      socialSecurityTax: form941.socialSecurityTax,
      medicareWages: form941.medicareWages,
      medicareTax: form941.medicareTax,
      additionalMedicareTax: form941.additionalMedicareTax,
      totalTaxes: form941.totalTaxes,
      totalDeposits: form941.totalDeposits,
      balanceDue: form941.balanceDue,
      overpayment: form941.overpayment,
      status: 'DRAFT',
    },
  });

  return form941;
}

// ============== FORM 940 - ANNUAL FUTA TAX ==============

export async function generateForm940(
  companyId: string,
  year: number
): Promise<Form940Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // Obtener todos los payrolls del año
  const payrolls = await prisma.payroll.findMany({
    where: {
      companyId,
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
    ein: company.taxId || 'XX-XXXXXXX',
    companyName: company.name,
    companyAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
    stateQualification: company.state || 'FL',
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

  // Guardar o actualizar en la base de datos
  await prisma.taxForm940.upsert({
    where: {
      companyId_year: { companyId, year }
    },
    update: {
      ein: form940.ein,
      companyName: form940.companyName,
      companyAddress: form940.companyAddress,
      stateQualification: form940.stateQualification,
      totalPayments: form940.totalPayments,
      exemptPayments: form940.exemptPayments,
      paymentsExcludingFUTA: form940.paymentsExcludingFUTA,
      totalFUTAWages: form940.totalFUTAWages,
      futaTaxBeforeAdjustments: form940.futaTaxBeforeAdjustments,
      stateUnemploymentTaxCredit: form940.stateUnemploymentTaxCredit,
      totalFUTATax: form940.totalFUTATax,
      totalDeposits: form940.totalDeposits,
      balanceDue: form940.balanceDue,
      overpayment: form940.overpayment,
    },
    create: {
      companyId,
      year,
      ein: form940.ein,
      companyName: form940.companyName,
      companyAddress: form940.companyAddress,
      stateQualification: form940.stateQualification,
      totalPayments: form940.totalPayments,
      exemptPayments: form940.exemptPayments,
      paymentsExcludingFUTA: form940.paymentsExcludingFUTA,
      totalFUTAWages: form940.totalFUTAWages,
      futaTaxBeforeAdjustments: form940.futaTaxBeforeAdjustments,
      stateUnemploymentTaxCredit: form940.stateUnemploymentTaxCredit,
      totalFUTATax: form940.totalFUTATax,
      totalDeposits: form940.totalDeposits,
      balanceDue: form940.balanceDue,
      overpayment: form940.overpayment,
      status: 'DRAFT',
    },
  });

  return form940;
}

// ============== RT-6 - FLORIDA REEMPLOYMENT TAX ==============

export async function generateRT6(
  companyId: string,
  quarter: number,
  year: number
): Promise<RT6Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  // Obtener payrolls del trimestre
  const payrolls = await prisma.payroll.findMany({
    where: {
      companyId,
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
    employerAccountNumber: company.taxId ? `FL-${company.taxId.replace('-', '')}` : 'FL-XXXXXXX',
    companyName: company.name,
    companyAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
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

  // Guardar o actualizar en la base de datos
  await prisma.floridaRT6.upsert({
    where: {
      companyId_quarter_year: { companyId, quarter, year }
    },
    update: {
      employerAccountNumber: rt6.employerAccountNumber,
      companyName: rt6.companyName,
      companyAddress: rt6.companyAddress,
      totalWages: rt6.totalWages,
      excessWages: rt6.excessWages,
      taxableWages: rt6.taxableWages,
      taxRate: rt6.taxRate,
      taxDue: rt6.taxDue,
      adjustments: rt6.adjustments,
      totalDue: rt6.totalDue,
      employeeCount: rt6.employeeCount,
      employeeDetails: rt6.employees,
    },
    create: {
      companyId,
      quarter,
      year,
      employerAccountNumber: rt6.employerAccountNumber,
      companyName: rt6.companyName,
      companyAddress: rt6.companyAddress,
      totalWages: rt6.totalWages,
      excessWages: rt6.excessWages,
      taxableWages: rt6.taxableWages,
      taxRate: rt6.taxRate,
      taxDue: rt6.taxDue,
      adjustments: rt6.adjustments,
      totalDue: rt6.totalDue,
      employeeCount: rt6.employeeCount,
      employeeDetails: rt6.employees,
      status: 'DRAFT',
    },
  });

  return rt6;
}

// ============== W-2 - WAGE AND TAX STATEMENT ==============

export async function generateW2(
  companyId: string,
  employeeId: string,
  year: number
): Promise<W2Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

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
      companyId,
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
    ein: company.taxId || 'XX-XXXXXXX',
    companyName: company.name,
    companyAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
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
    stateName: company.state || 'FL',
    stateEIN: company.taxId || '',
  };

  // Guardar o actualizar en la base de datos
  await prisma.taxFormW2.upsert({
    where: {
      companyId_employeeId_year: { companyId, employeeId, year }
    },
    update: {
      ein: w2.ein,
      employeeSSN: w2.employeeSSN,
      employeeName: w2.employeeName,
      employeeAddress: w2.employeeAddress,
      wages: w2.wages,
      federalIncomeTaxWithheld: w2.federalIncomeTaxWithheld,
      socialSecurityWages: w2.socialSecurityWages,
      socialSecurityTaxWithheld: w2.socialSecurityTaxWithheld,
      medicareWages: w2.medicareWages,
      medicareTaxWithheld: w2.medicareTaxWithheld,
      stateWages: w2.stateWages,
      stateIncomeTaxWithheld: w2.stateIncomeTaxWithheld,
      stateName: w2.stateName,
      stateEIN: w2.stateEIN,
    },
    create: {
      companyId,
      employeeId,
      year,
      ein: w2.ein,
      employeeSSN: w2.employeeSSN,
      employeeName: w2.employeeName,
      employeeAddress: w2.employeeAddress,
      wages: w2.wages,
      federalIncomeTaxWithheld: w2.federalIncomeTaxWithheld,
      socialSecurityWages: w2.socialSecurityWages,
      socialSecurityTaxWithheld: w2.socialSecurityTaxWithheld,
      medicareWages: w2.medicareWages,
      medicareTaxWithheld: w2.medicareTaxWithheld,
      stateWages: w2.stateWages,
      stateIncomeTaxWithheld: w2.stateIncomeTaxWithheld,
      stateName: w2.stateName,
      stateEIN: w2.stateEIN,
      status: 'DRAFT',
    },
  });

  return w2;
}

// ============== W-3 - TRANSMITTAL SUMMARY ==============

export async function generateW3(
  companyId: string,
  year: number
): Promise<W3Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Obtener todos los empleados de la empresa
  const employees = await prisma.employee.findMany({
    where: { companyId },
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
    ein: company.taxId || 'XX-XXXXXXX',
    companyName: company.name,
    companyAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
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

  // Obtener IDs de los W2 generados
  const w2Records = await prisma.taxFormW2.findMany({
    where: { companyId, year },
    select: { id: true }
  });
  const w2FormIds = w2Records.map(w => w.id);

  // Guardar o actualizar en la base de datos
  await prisma.taxFormW3.upsert({
    where: {
      companyId_year: { companyId, year }
    },
    update: {
      ein: w3.ein,
      companyName: w3.companyName,
      companyAddress: w3.companyAddress,
      totalW2Forms: w3.numberOfW2Forms,
      totalWages: w3.totalWages,
      totalFederalTaxWithheld: w3.totalFederalIncomeTaxWithheld,
      totalSocialSecurityWages: w3.totalSocialSecurityWages,
      totalSocialSecurityTax: w3.totalSocialSecurityTaxWithheld,
      totalMedicareWages: w3.totalMedicareWages,
      totalMedicareTax: w3.totalMedicareTaxWithheld,
      totalStateWages: w3.totalStateWages,
      totalStateTaxWithheld: w3.totalStateIncomeTaxWithheld,
      w2FormIds,
    },
    create: {
      companyId,
      year,
      ein: w3.ein,
      companyName: w3.companyName,
      companyAddress: w3.companyAddress,
      totalW2Forms: w3.numberOfW2Forms,
      totalWages: w3.totalWages,
      totalFederalTaxWithheld: w3.totalFederalIncomeTaxWithheld,
      totalSocialSecurityWages: w3.totalSocialSecurityWages,
      totalSocialSecurityTax: w3.totalSocialSecurityTaxWithheld,
      totalMedicareWages: w3.totalMedicareWages,
      totalMedicareTax: w3.totalMedicareTaxWithheld,
      totalStateWages: w3.totalStateWages,
      totalStateTaxWithheld: w3.totalStateIncomeTaxWithheld,
      w2FormIds,
      status: 'DRAFT',
    },
  });

  return w3;
}

// ============== HELPER FUNCTIONS ==============

export async function getQuarterlyForms941(companyId: string, year: number) {
  return await prisma.taxForm941.findMany({
    where: { companyId, year },
    orderBy: { quarter: 'asc' },
  });
}

export async function getAnnualForm940(companyId: string, year: number) {
  return await prisma.taxForm940.findFirst({
    where: { companyId, year },
  });
}

export async function getQuarterlyRT6(companyId: string, year: number) {
  return await prisma.floridaRT6.findMany({
    where: { companyId, year },
    orderBy: { quarter: 'asc' },
  });
}

export async function getAllW2ForYear(companyId: string, year: number) {
  // Primero verificar si ya existen W2 generados
  const existingW2s = await prisma.taxFormW2.findMany({
    where: { companyId, year },
    include: { employee: true }
  });

  if (existingW2s.length > 0) {
    return existingW2s;
  }

  // Si no existen, generar nuevos
  const employees = await prisma.employee.findMany({
    where: { companyId },
  });

  const w2Forms: W2Data[] = [];
  for (const employee of employees) {
    const w2 = await generateW2(companyId, employee.id, year);
    w2Forms.push(w2);
  }

  return w2Forms;
}

export async function getW3ForYear(companyId: string, year: number) {
  return await prisma.taxFormW3.findFirst({
    where: { companyId, year },
  });
}

// ============== FORM 1099-NEC - NONEMPLOYEE COMPENSATION ==============

export async function generate1099NEC(
  companyId: string,
  vendorId: string,
  year: number
): Promise<Form1099NECData> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Obtener datos del vendor/contractor
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId }
  });

  if (!vendor) {
    throw new Error('Proveedor/Contratista no encontrado');
  }

  // Calcular el año fiscal
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  // Obtener todos los pagos al vendor durante el año
  const payments = await prisma.vendorPayable.findMany({
    where: {
      vendorId,
      status: 'PAID',
      issueDate: {
        gte: yearStart,
        lte: yearEnd
      }
    }
  });

  // También buscar en gastos si aplica
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      date: {
        gte: yearStart,
        lte: yearEnd
      },
      status: 'APPROVED',
      // Filtrar por vendor name o descripción si hay relación
      description: {
        contains: vendor.name,
        mode: 'insensitive'
      }
    }
  });

  // Calcular total de compensación no-empleado
  let totalCompensation = 0;
  
  // Sumar pagos a proveedores
  payments.forEach(payment => {
    totalCompensation += payment.total;
  });

  // Sumar gastos relacionados
  expenses.forEach(expense => {
    totalCompensation += expense.amount;
  });

  // Solo se requiere 1099-NEC si el total es >= $600
  if (totalCompensation < 600) {
    console.log(`Vendor ${vendor.name} tiene pagos menores a $600 (${totalCompensation}), 1099-NEC no requerido`);
  }

  const form1099: Form1099NECData = {
    year,
    payerName: company.name,
    payerEIN: company.taxId || 'XX-XXXXXXX',
    payerAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
    recipientName: vendor.name,
    recipientTIN: vendor.taxId || 'XXX-XX-XXXX',
    recipientAddress: `${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.country || ''}`.trim(),
    box1NonemployeeCompensation: totalCompensation,
    box4FederalTaxWithheld: 0, // Normalmente no hay retención para contractors
    box5StateTaxWithheld: 0,
    box6StateIncome: totalCompensation,
    stateName: company.state || 'FL',
    statePayerNumber: company.taxId || ''
  };

  // Guardar o actualizar en la base de datos
  await prisma.taxForm1099.upsert({
    where: {
      // No hay unique constraint, así que usamos create/update manualmente
      id: `${companyId}-${vendorId}-${year}-NEC`
    },
    update: {
      payerName: form1099.payerName,
      payerEIN: form1099.payerEIN,
      payerAddress: company.address || '',
      payerCity: company.city || '',
      payerState: company.state || 'FL',
      payerZip: company.zipCode || '',
      recipientName: form1099.recipientName,
      recipientTIN: form1099.recipientTIN,
      recipientAddress: vendor.address || '',
      recipientCity: vendor.city || '',
      recipientState: vendor.state || '',
      recipientZip: vendor.country || '',
      box1Amount: form1099.box1NonemployeeCompensation,
      box4Amount: form1099.box4FederalTaxWithheld,
      taxYear: year,
    },
    create: {
      id: `${companyId}-${vendorId}-${year}-NEC`,
      userId: companyId, // Usar companyId como userId por ahora
      companyId,
      payerName: form1099.payerName,
      payerEIN: form1099.payerEIN,
      payerAddress: company.address || '',
      payerCity: company.city || '',
      payerState: company.state || 'FL',
      payerZip: company.zipCode || '',
      recipientName: form1099.recipientName,
      recipientTIN: form1099.recipientTIN,
      recipientAddress: vendor.address || '',
      recipientCity: vendor.city || '',
      recipientState: vendor.state || '',
      recipientZip: vendor.country || '',
      recipientEmail: vendor.email,
      formType: 'NEC',
      taxYear: year,
      box1Amount: form1099.box1NonemployeeCompensation,
      box4Amount: form1099.box4FederalTaxWithheld,
      filingRequired: totalCompensation >= 600,
      status: 'DRAFT',
    },
  });

  return form1099;
}

// ============== FORM 1096 - TRANSMITTAL OF 1099s ==============

export async function generate1096(
  companyId: string,
  year: number
): Promise<Form1096Data> {
  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Obtener todos los 1099s de la empresa para el año
  const form1099s = await prisma.taxForm1099.findMany({
    where: {
      companyId,
      taxYear: year,
      filingRequired: true
    }
  });

  // Si no hay 1099s existentes, intentar generar para vendors que califiquen
  if (form1099s.length === 0) {
    // Obtener todos los vendors
    const vendors = await prisma.vendor.findMany({
      where: { companyId }
    });

    // Generar 1099 para cada vendor que califique
    for (const vendor of vendors) {
      try {
        await generate1099NEC(companyId, vendor.id, year);
      } catch (error) {
        console.error(`Error generando 1099 para vendor ${vendor.name}:`, error);
      }
    }

    // Volver a obtener los 1099s generados
    const generatedForms = await prisma.taxForm1099.findMany({
      where: {
        companyId,
        taxYear: year,
        filingRequired: true
      }
    });

    // Usar los generados
    form1099s.push(...generatedForms);
  }

  // Calcular totales
  let totalAmount = 0;
  const form1099Ids: string[] = [];

  form1099s.forEach(form => {
    totalAmount += form.box1Amount;
    form1099Ids.push(form.id);
  });

  const form1096: Form1096Data = {
    year,
    payerName: company.name,
    payerEIN: company.taxId || 'XX-XXXXXXX',
    payerAddress: `${company.address || ''}, ${company.city || ''}, ${company.state || ''} ${company.zipCode || ''}`.trim(),
    contactName: company.name,
    contactPhone: company.phone || '',
    contactEmail: company.email || '',
    formType: '1099-NEC',
    totalForms: form1099s.length,
    totalAmount,
    form1099Ids
  };

  // Guardar o actualizar en la base de datos
  await prisma.taxForm1096.upsert({
    where: {
      companyId_taxYear_formType: {
        companyId,
        taxYear: year,
        formType: '1099-NEC'
      }
    },
    update: {
      totalForms: form1096.totalForms,
      totalAmount: form1096.totalAmount,
      payerName: form1096.payerName,
      payerEIN: form1096.payerEIN,
      payerAddress: company.address || '',
      payerCity: company.city || '',
      payerState: company.state || 'FL',
      payerZip: company.zipCode || '',
      contactName: form1096.contactName,
      contactPhone: form1096.contactPhone,
      contactEmail: form1096.contactEmail,
      form1099Ids: form1096.form1099Ids,
    },
    create: {
      userId: companyId,
      companyId,
      taxYear: year,
      formType: '1099-NEC',
      totalForms: form1096.totalForms,
      totalAmount: form1096.totalAmount,
      payerName: form1096.payerName,
      payerEIN: form1096.payerEIN,
      payerAddress: company.address || '',
      payerCity: company.city || '',
      payerState: company.state || 'FL',
      payerZip: company.zipCode || '',
      contactName: form1096.contactName,
      contactPhone: form1096.contactPhone,
      contactEmail: form1096.contactEmail,
      form1099Ids: form1096.form1099Ids,
      status: 'DRAFT',
    },
  });

  return form1096;
}

// ============== HELPER FUNCTIONS FOR 1099 & 1096 ==============

export async function getAll1099ForYear(companyId: string, year: number) {
  return await prisma.taxForm1099.findMany({
    where: { companyId, taxYear: year },
    orderBy: { recipientName: 'asc' },
  });
}

export async function get1096ForYear(companyId: string, year: number) {
  return await prisma.taxForm1096.findFirst({
    where: { companyId, taxYear: year },
  });
}

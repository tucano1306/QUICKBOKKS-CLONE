/**
 * FASE 7: Tax Compliance Service
 * 
 * Handles IRS form generation (1099-NEC, 1099-MISC, 1096)
 * W-9 collection and validation
 * Form 1099 filing thresholds and validation
 * IRS compliance rules
 */

import { prisma } from './prisma';

// Enum types (defined in schema but using string literals for compatibility)
type Form1099Type = 'NEC' | 'MISC' | 'INT' | 'DIV' | 'B' | 'K';
type Tax1099Status = 'DRAFT' | 'READY' | 'SENT' | 'FILED' | 'CORRECTED' | 'VOID';
type TINType = 'SSN' | 'EIN';
type W9Status = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'EXPIRED' | 'REJECTED';

// ==================== INTERFACES ====================

export interface Form1099Data {
  recipientName: string;
  recipientTIN: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientEmail?: string;
  formType: Form1099Type;
  taxYear: number;
  amounts: {
    box1?: number;  // Nonemployee compensation (1099-NEC)
    box2?: number;  // Rents (1099-MISC)
    box3?: number;  // Other income (1099-MISC)
    box4?: number;  // Federal income tax withheld
    box5?: number;  // Fishing boat proceeds
    box6?: number;  // Medical and health care payments
    box7?: number;  // Payer made direct sales
    box8?: number;  // Substitute payments
    box10?: number; // Crop insurance proceeds
  };
  expenseIds?: string[];
  invoiceIds?: string[];
}

export interface Form1096Summary {
  taxYear: number;
  formType: string;
  totalForms: number;
  totalAmount: number;
  form1099Ids: string[];
}

export interface W9Request {
  businessName: string;
  vendorId?: string;
  email: string;
}

export interface ComplianceReport {
  taxYear: number;
  totalContractors: number;
  contractors1099Required: number;
  contractors1099Generated: number;
  total1099Amount: number;
  w9CollectionRate: number; // %
  filingStatus: {
    draft: number;
    ready: number;
    sent: number;
    filed: number;
  };
  complianceScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

// ==================== FORM 1099 GENERATION ====================

/**
 * Genera formularios 1099 para todos los contractors que califican
 * Umbral IRS: $600 o más pagados durante el año fiscal
 */
export async function generate1099FormsForYear(
  userId: string,
  taxYear: number
): Promise<{ forms: any[]; summary: string }> {
  // 1. Obtener información del pagador (empresa)
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const payerInfo = {
    name: process.env.COMPANY_NAME || user.company || 'Company Name',
    ein: process.env.COMPANY_EIN || '00-0000000',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
    state: process.env.COMPANY_STATE || 'FL',
    zip: process.env.COMPANY_ZIP || '',
  };

  // 2. Obtener todos los gastos del año para empleados marcados como contractors
  const startDate = new Date(taxYear, 0, 1); // Jan 1
  const endDate = new Date(taxYear, 11, 31, 23, 59, 59); // Dec 31

  // Agrupar gastos por empleado (contractors)
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      employee: {
        employeeType: 'CONTRACTOR', // Solo contractors
      },
    },
    include: {
      employee: true,
    },
  });

  // Agrupar por contractor
  const contractorPayments = expenses.reduce((acc: any, expense: any) => {
    const employeeId = expense.employeeId;
    if (!employeeId) return acc;

    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: expense.employee,
        expenses: [],
        total: 0,
      };
    }

    acc[employeeId].expenses.push(expense);
    acc[employeeId].total += expense.amount;
    return acc;
  }, {});

  // 3. Generar 1099 para cada contractor que supera el umbral de $600
  const forms = [];
  const FILING_THRESHOLD = 600;

  for (const employeeId in contractorPayments) {
    const data = contractorPayments[employeeId];
    const { employee, expenses: employeeExpenses, total } = data;

    // Verificar umbral
    if (total < FILING_THRESHOLD) {
      continue; // No requiere 1099
    }

    // Verificar que tenga W-9 o información fiscal
    if (!employee.taxId) {
      console.warn(`Contractor ${employee.firstName} ${employee.lastName} no tiene TIN/SSN registrado`);
      continue;
    }

    // Crear 1099-NEC (Nonemployee Compensation)
    const form1099 = await prisma.taxForm1099.create({
      data: {
        userId,
        
        // Payer info
        payerName: payerInfo.name,
        payerEIN: payerInfo.ein,
        payerAddress: payerInfo.address,
        payerCity: payerInfo.city,
        payerState: payerInfo.state,
        payerZip: payerInfo.zip,
        
        // Recipient info
        recipientName: `${employee.firstName} ${employee.lastName}`,
        recipientTIN: employee.taxId,
        recipientAddress: employee.address || '',
        recipientCity: '', // TODO: Parse from address or add city field
        recipientState: 'FL',
        recipientZip: '',
        recipientEmail: employee.email || '',
        
        // Form details
        formType: 'NEC',
        taxYear,
        box1Amount: total, // Nonemployee compensation
        box4Amount: 0, // Withheld (si aplica)
        
        // Status
        status: 'READY',
        filingRequired: true,
        
        // Related expenses
        expenseIds: employeeExpenses.map((e: any) => e.id),
      },
    });

    forms.push(form1099);
  }

  const summary = `Generados ${forms.length} formularios 1099-NEC para el año ${taxYear}. Umbral de archivo: $${FILING_THRESHOLD}.`;
  
  return { forms, summary };
}

/**
 * Genera un 1099 individual manualmente
 */
export async function generate1099Form(
  userId: string,
  data: Form1099Data
): Promise<any> {
  // Obtener información del pagador
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const payerInfo = {
    name: process.env.COMPANY_NAME || user.company || 'Company Name',
    ein: process.env.COMPANY_EIN || '00-0000000',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
    state: process.env.COMPANY_STATE || 'FL',
    zip: process.env.COMPANY_ZIP || '',
  };

  // Calcular total basado en el tipo de formulario
  let totalAmount = 0;
  if (data.formType === 'NEC') {
    totalAmount = data.amounts.box1 || 0;
  } else if (data.formType === 'MISC') {
    totalAmount = (data.amounts.box1 || 0) + (data.amounts.box2 || 0) + (data.amounts.box3 || 0);
  }

  // Verificar umbral de $600
  const filingRequired = totalAmount >= 600;

  const form1099 = await prisma.taxForm1099.create({
    data: {
      userId,
      
      // Payer
      payerName: payerInfo.name,
      payerEIN: payerInfo.ein,
      payerAddress: payerInfo.address,
      payerCity: payerInfo.city,
      payerState: payerInfo.state,
      payerZip: payerInfo.zip,
      
      // Recipient
      recipientName: data.recipientName,
      recipientTIN: data.recipientTIN,
      recipientAddress: data.recipientAddress,
      recipientCity: data.recipientCity,
      recipientState: data.recipientState,
      recipientZip: data.recipientZip,
      recipientEmail: data.recipientEmail,
      
      // Form details
      formType: data.formType,
      taxYear: data.taxYear,
      box1Amount: data.amounts.box1 || 0,
      box2Amount: data.amounts.box2 || 0,
      box3Amount: data.amounts.box3 || 0,
      box4Amount: data.amounts.box4 || 0,
      box5Amount: data.amounts.box5 || 0,
      box6Amount: data.amounts.box6 || 0,
      box7Amount: data.amounts.box7 || 0,
      box8Amount: data.amounts.box8 || 0,
      box10Amount: data.amounts.box10 || 0,
      
      // Status
      status: 'DRAFT',
      filingRequired,
      
      // Relations
      expenseIds: data.expenseIds || [],
      invoiceIds: data.invoiceIds || [],
    },
  });

  return form1099;
}

/**
 * Validar formulario 1099 antes de enviar
 */
export function validate1099Form(form: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar información del pagador
  if (!form.payerEIN || form.payerEIN.length !== 10) {
    errors.push('EIN del pagador inválido. Debe tener formato XX-XXXXXXX');
  }

  // Validar información del receptor
  if (!form.recipientTIN || (form.recipientTIN.length !== 9 && form.recipientTIN.length !== 11)) {
    errors.push('TIN/SSN del receptor inválido. Debe tener 9 o 11 caracteres');
  }

  if (!form.recipientName) {
    errors.push('Nombre del receptor requerido');
  }

  if (!form.recipientAddress) {
    errors.push('Dirección del receptor requerida');
  }

  // Validar montos según tipo de formulario
  if (form.formType === 'NEC') {
    if (form.box1Amount <= 0) {
      errors.push('Box 1 (Nonemployee compensation) debe ser mayor a $0 para 1099-NEC');
    }
  } else if (form.formType === 'MISC') {
    const totalMISC = (form.box1Amount || 0) + (form.box2Amount || 0) + (form.box3Amount || 0);
    if (totalMISC <= 0) {
      errors.push('Debe haber al menos un monto positivo en 1099-MISC');
    }
  }

  // Validar año fiscal
  const currentYear = new Date().getFullYear();
  if (form.taxYear > currentYear) {
    errors.push(`Año fiscal no puede ser futuro. Año actual: ${currentYear}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Marcar 1099 como enviado al receptor
 */
export async function send1099ToRecipient(form1099Id: string): Promise<any> {
  const form = await prisma.taxForm1099.findUnique({
    where: { id: form1099Id },
  });

  if (!form) {
    throw new Error('Formulario 1099 no encontrado');
  }

  // Validar antes de enviar
  const validation = validate1099Form(form);
  if (!validation.valid) {
    throw new Error(`No se puede enviar: ${validation.errors.join(', ')}`);
  }

  // Aquí iría la lógica de envío por email con el PDF del 1099
  // Por ahora solo actualizamos el estado

  return prisma.taxForm1099.update({
    where: { id: form1099Id },
    data: {
      status: 'SENT',
      sentToRecipient: true,
      sentDate: new Date(),
    },
  });
}

/**
 * Marcar 1099 como archivado con el IRS
 */
export async function file1099WithIRS(form1099Id: string): Promise<any> {
  return prisma.taxForm1099.update({
    where: { id: form1099Id },
    data: {
      status: 'FILED',
      filedWithIRS: true,
      irsFiledDate: new Date(),
    },
  });
}

// ==================== FORM 1096 (ANNUAL SUMMARY) ====================

/**
 * Genera formulario 1096 (resumen anual) para un conjunto de 1099s
 */
export async function generate1096Summary(
  userId: string,
  taxYear: number,
  formType: string = '1099-NEC'
): Promise<any> {
  // Obtener todos los 1099 del año y tipo especificado
  const forms1099 = await prisma.taxForm1099.findMany({
    where: {
      userId,
      taxYear,
      formType: formType.replace('1099-', '') as any, // "NEC", "MISC", etc.
      status: { in: ['READY', 'SENT', 'FILED'] },
    },
  });

  if (forms1099.length === 0) {
    throw new Error(`No hay formularios ${formType} para el año ${taxYear}`);
  }

  // Calcular totales
  const totalForms = forms1099.length;
  let totalAmount = 0;

  forms1099.forEach((form: any) => {
    if (form.formType === 'NEC') {
      totalAmount += form.box1Amount;
    } else if (form.formType === 'MISC') {
      totalAmount += form.box1Amount + form.box2Amount + form.box3Amount;
    }
  });

  // Obtener información del pagador
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const payerInfo = {
    name: process.env.COMPANY_NAME || user?.company || 'Company Name',
    ein: process.env.COMPANY_EIN || '00-0000000',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
    state: process.env.COMPANY_STATE || 'FL',
    zip: process.env.COMPANY_ZIP || '',
  };

  // Crear Form 1096
  const form1096 = await prisma.taxForm1096.create({
    data: {
      userId,
      taxYear,
      formType,
      totalForms,
      totalAmount,
      
      // Payer info
      payerName: payerInfo.name,
      payerEIN: payerInfo.ein,
      payerAddress: payerInfo.address,
      payerCity: payerInfo.city,
      payerState: payerInfo.state,
      payerZip: payerInfo.zip,
      
      // Contact
      contactName: user?.name || '',
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
      
      // References
      form1099Ids: forms1099.map((f: any) => f.id),
    },
  });

  return form1096;
}

// ==================== W-9 MANAGEMENT ====================

/**
 * Solicitar W-9 a un vendor/contractor
 */
export async function requestW9(
  userId: string,
  request: W9Request
): Promise<any> {
  const w9 = await prisma.w9Information.create({
    data: {
      userId,
      businessName: request.businessName,
      vendorId: request.vendorId,
      status: 'PENDING',
      
      // Temporales hasta que se complete
      taxClassification: 'INDIVIDUAL',
      tinType: 'SSN',
      tin: '', // Se llenará cuando el vendor lo envíe
      address: '',
      city: '',
      state: '',
      zip: '',
    },
  });

  // Aquí se enviaría un email al vendor solicitando el W-9
  // Por ahora solo creamos el registro

  return w9;
}

/**
 * Verificar si un vendor tiene W-9 válido
 */
export async function checkW9Status(
  userId: string,
  vendorId: string
): Promise<{ hasW9: boolean; w9?: any; status?: W9Status }> {
  const w9 = await prisma.w9Information.findFirst({
    where: {
      userId,
      vendorId,
      status: { in: ['SUBMITTED', 'VERIFIED'] },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!w9) {
    return { hasW9: false };
  }

  return {
    hasW9: true,
    w9,
    status: w9.status,
  };
}

/**
 * Actualizar información de W-9 cuando el vendor la envía
 */
export async function submitW9Information(
  w9Id: string,
  data: {
    individualName?: string;
    taxClassification: string;
    tinType: TINType;
    tin: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }
): Promise<any> {
  // Validar TIN format
  if (data.tinType === 'SSN' && data.tin.length !== 9) {
    throw new Error('SSN debe tener 9 dígitos');
  }
  if (data.tinType === 'EIN' && data.tin.length !== 9) {
    throw new Error('EIN debe tener 9 dígitos (sin guión)');
  }

  return prisma.w9Information.update({
    where: { id: w9Id },
    data: {
      ...data,
      taxClassification: data.taxClassification as any,
      status: 'SUBMITTED' as any,
      submittedDate: new Date(),
    },
  });
}

// ==================== COMPLIANCE REPORTING ====================

/**
 * Genera reporte de cumplimiento fiscal
 */
export async function generateComplianceReport(
  userId: string,
  taxYear: number
): Promise<ComplianceReport> {
  // 1. Obtener todos los contractors
  const contractors = await prisma.employee.findMany({
    where: {
      userId,
      employeeType: 'CONTRACTOR',
    },
  });

  const totalContractors = contractors.length;

  // 2. Calcular pagos a contractors en el año
  const startDate = new Date(taxYear, 0, 1);
  const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      employee: { employeeType: 'CONTRACTOR' },
    },
    include: {
      employee: true,
    },
  });

  // Agrupar por contractor
  const contractorPayments: { [key: string]: number } = {};
  expenses.forEach((expense: any) => {
    if (expense.employeeId) {
      contractorPayments[expense.employeeId] = (contractorPayments[expense.employeeId] || 0) + expense.amount;
    }
  });

  // Contractors que requieren 1099 ($600+)
  const contractors1099Required = Object.values(contractorPayments).filter(amount => amount >= 600).length;

  // 3. Obtener 1099s generados
  const forms1099 = await prisma.taxForm1099.findMany({
    where: {
      userId,
      taxYear,
    },
  });

  const contractors1099Generated = forms1099.length;
  const total1099Amount = forms1099.reduce((sum: number, form: any) => sum + form.box1Amount, 0);

  // 4. W-9 collection rate
  const w9Records = await prisma.w9Information.findMany({
    where: {
      userId,
      status: { in: ['SUBMITTED', 'VERIFIED'] },
    },
  });

  const w9CollectionRate = totalContractors > 0 
    ? Math.round((w9Records.length / totalContractors) * 100) 
    : 0;

  // 5. Filing status breakdown
  const filingStatus = {
    draft: forms1099.filter((f: any) => f.status === 'DRAFT').length,
    ready: forms1099.filter((f: any) => f.status === 'READY').length,
    sent: forms1099.filter((f: any) => f.status === 'SENT').length,
    filed: forms1099.filter((f: any) => f.status === 'FILED').length,
  };

  // 6. Compliance score (0-100)
  let complianceScore = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Penalización por 1099s faltantes
  const missing1099s = contractors1099Required - contractors1099Generated;
  if (missing1099s > 0) {
    complianceScore -= missing1099s * 10;
    issues.push(`${missing1099s} contractor(s) requieren 1099 pero no se ha generado`);
    recommendations.push('Generar formularios 1099 faltantes antes del 31 de enero');
  }

  // Penalización por W-9s faltantes
  if (w9CollectionRate < 100) {
    complianceScore -= (100 - w9CollectionRate) / 4;
    issues.push(`${100 - w9CollectionRate}% de contractors no tienen W-9`);
    recommendations.push('Solicitar W-9 a todos los contractors antes de realizar pagos');
  }

  // Penalización por 1099s no enviados
  const unsent1099s = filingStatus.draft + filingStatus.ready;
  if (unsent1099s > 0 && new Date() > new Date(taxYear + 1, 0, 31)) {
    complianceScore -= unsent1099s * 5;
    issues.push(`${unsent1099s} formularios 1099 no han sido enviados (Fecha límite: 31 de enero)`);
    recommendations.push('Enviar formularios 1099 inmediatamente para evitar penalizaciones');
  }

  // Bonus por estar al día
  if (filingStatus.filed === contractors1099Generated && contractors1099Generated > 0) {
    issues.push('¡Excelente! Todos los formularios 1099 han sido archivados con el IRS');
  }

  complianceScore = Math.max(0, Math.min(100, complianceScore));

  return {
    taxYear,
    totalContractors,
    contractors1099Required,
    contractors1099Generated,
    total1099Amount,
    w9CollectionRate,
    filingStatus,
    complianceScore,
    issues,
    recommendations,
  };
}

/**
 * Obtener lista de 1099s por año
 */
export async function get1099List(
  userId: string,
  taxYear: number,
  status?: Tax1099Status
): Promise<any[]> {
  const where: any = {
    userId,
    taxYear,
  };

  if (status) {
    where.status = status;
  }

  return prisma.taxForm1099.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Obtener detalles de un 1099 específico
 */
export async function get1099Details(form1099Id: string): Promise<any> {
  return prisma.taxForm1099.findUnique({
    where: { id: form1099Id },
  });
}

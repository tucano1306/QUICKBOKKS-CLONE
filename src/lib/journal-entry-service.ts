/**
 * SERVICIO DE ASIENTOS CONTABLES AUTOMÁTICOS
 * 
 * Este servicio genera asientos contables (journal entries) automáticamente
 * cuando se crean transacciones, gastos o se pagan facturas.
 * 
 * Principio de Partida Doble:
 * - Cada operación debe tener al menos un débito y un crédito
 * - Total Débitos = Total Créditos
 */

import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// Códigos de cuentas estándar (deben existir en ChartOfAccounts)
const ACCOUNT_CODES = {
  // Activos
  CASH: '1000',           // Efectivo / Caja
  BANK: '1100',           // Bancos
  ACCOUNTS_RECEIVABLE: '1200', // Cuentas por Cobrar
  
  // Pasivos
  ACCOUNTS_PAYABLE: '2000',    // Cuentas por Pagar
  
  // Patrimonio
  RETAINED_EARNINGS: '3000',   // Utilidades Retenidas
  
  // Ingresos
  SALES_REVENUE: '4000',       // Ingresos por Ventas
  SERVICE_REVENUE: '4100',     // Ingresos por Servicios
  OTHER_INCOME: '4900',        // Otros Ingresos
  
  // Gastos
  OPERATING_EXPENSES: '5000',  // Gastos Operativos
  SALARIES_EXPENSE: '5100',    // Gastos de Salarios
  RENT_EXPENSE: '5200',        // Gastos de Alquiler
  UTILITIES_EXPENSE: '5300',   // Servicios Públicos
  OTHER_EXPENSES: '5900',      // Otros Gastos
};

interface JournalEntryData {
  date: Date;
  description: string;
  reference?: string;
  companyId: string;
  createdBy: string;
  lines: {
    accountCode: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

/**
 * Genera un número de asiento único
 */
async function generateEntryNumber(companyId: string): Promise<string> {
  const count = await prisma.journalEntry.count({
    where: { companyId }
  });
  const year = new Date().getFullYear();
  return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
}

/**
 * Obtiene el ID de una cuenta por su código
 */
async function getAccountId(code: string, companyId: string): Promise<string | null> {
  const account = await prisma.chartOfAccounts.findFirst({
    where: { 
      code,
      OR: [
        { companyId },
        { companyId: null } // Cuentas globales
      ]
    }
  });
  return account?.id || null;
}

/**
 * Crea un asiento contable con validación de partida doble
 */
export async function createJournalEntry(data: JournalEntryData) {
  // Validar partida doble
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Asiento desbalanceado: Débitos ($${totalDebit}) != Créditos ($${totalCredit})`);
  }
  
  // Obtener IDs de cuentas
  const linesWithAccountIds = await Promise.all(
    data.lines.map(async (line, index) => {
      const accountId = await getAccountId(line.accountCode, data.companyId);
      if (!accountId) {
        throw new Error(`Cuenta no encontrada: ${line.accountCode}`);
      }
      return {
        accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description || '',
        lineNumber: index + 1
      };
    })
  );
  
  const entryNumber = await generateEntryNumber(data.companyId);
  
  // Crear el asiento
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: data.date,
      description: data.description,
      reference: data.reference,
      companyId: data.companyId,
      createdBy: data.createdBy,
      status: 'POSTED',
      lines: {
        create: linesWithAccountIds
      }
    },
    include: { lines: true }
  });
  
  console.log(`✅ Asiento creado: ${entryNumber} - ${data.description}`);
  return journalEntry;
}

/**
 * Genera asiento para una TRANSACCIÓN DE INGRESO
 * 
 * Débito: Efectivo/Banco (aumenta activo)
 * Crédito: Ingresos (aumenta patrimonio)
 */
export async function createIncomeEntry(
  amount: number,
  description: string,
  date: Date,
  companyId: string,
  createdBy: string,
  reference?: string
) {
  return createJournalEntry({
    date,
    description: `Ingreso: ${description}`,
    reference,
    companyId,
    createdBy,
    lines: [
      { accountCode: ACCOUNT_CODES.CASH, debit: amount, credit: 0, description: 'Entrada de efectivo' },
      { accountCode: ACCOUNT_CODES.OTHER_INCOME, debit: 0, credit: amount, description }
    ]
  });
}

/**
 * Genera asiento para un GASTO
 * 
 * Débito: Gastos (aumenta gastos)
 * Crédito: Efectivo/Banco (disminuye activo)
 */
export async function createExpenseEntry(
  amount: number,
  description: string,
  category: string,
  date: Date,
  companyId: string,
  createdBy: string,
  reference?: string
) {
  // Mapear categoría a cuenta de gasto
  let expenseAccountCode = ACCOUNT_CODES.OTHER_EXPENSES;
  
  if (category.toLowerCase().includes('salario') || category.toLowerCase().includes('payroll')) {
    expenseAccountCode = ACCOUNT_CODES.SALARIES_EXPENSE;
  } else if (category.toLowerCase().includes('alquiler') || category.toLowerCase().includes('rent')) {
    expenseAccountCode = ACCOUNT_CODES.RENT_EXPENSE;
  } else if (category.toLowerCase().includes('servicio') || category.toLowerCase().includes('utility')) {
    expenseAccountCode = ACCOUNT_CODES.UTILITIES_EXPENSE;
  }
  
  return createJournalEntry({
    date,
    description: `Gasto: ${description}`,
    reference,
    companyId,
    createdBy,
    lines: [
      { accountCode: expenseAccountCode, debit: amount, credit: 0, description },
      { accountCode: ACCOUNT_CODES.CASH, debit: 0, credit: amount, description: 'Salida de efectivo' }
    ]
  });
}

/**
 * Genera asiento para EMISIÓN DE FACTURA (venta a crédito)
 * 
 * Débito: Cuentas por Cobrar (aumenta activo)
 * Crédito: Ingresos por Ventas (aumenta patrimonio)
 */
export async function createInvoiceEntry(
  amount: number,
  invoiceNumber: string,
  customerName: string,
  date: Date,
  companyId: string,
  createdBy: string
) {
  return createJournalEntry({
    date,
    description: `Factura ${invoiceNumber} - ${customerName}`,
    reference: invoiceNumber,
    companyId,
    createdBy,
    lines: [
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: amount, credit: 0, description: `Cuenta por cobrar - ${customerName}` },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: amount, description: `Venta - Factura ${invoiceNumber}` }
    ]
  });
}

/**
 * Genera asiento para COBRO DE FACTURA
 * 
 * Débito: Efectivo/Banco (aumenta activo)
 * Crédito: Cuentas por Cobrar (disminuye activo)
 */
export async function createPaymentReceivedEntry(
  amount: number,
  invoiceNumber: string,
  customerName: string,
  date: Date,
  companyId: string,
  createdBy: string
) {
  return createJournalEntry({
    date,
    description: `Cobro Factura ${invoiceNumber} - ${customerName}`,
    reference: invoiceNumber,
    companyId,
    createdBy,
    lines: [
      { accountCode: ACCOUNT_CODES.BANK, debit: amount, credit: 0, description: `Depósito - Factura ${invoiceNumber}` },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, description: `Cobro - ${customerName}` }
    ]
  });
}

// ============================================
// MIGRACIÓN: Crear asientos para datos existentes
// ============================================

export async function migrateExistingTransactions(companyId: string, createdBy: string) {
  console.log('\n🔄 Migrando transacciones existentes a asientos contables...\n');
  
  let created = 0;
  let errors = 0;
  
  // 1. Migrar transacciones
  const transactions = await prisma.transaction.findMany({
    where: { companyId }
  });
  
  for (const tx of transactions) {
    try {
      if (tx.type === 'INCOME') {
        await createIncomeEntry(
          Number(tx.amount),
          tx.description || tx.category || 'Ingreso',
          tx.date,
          companyId,
          createdBy,
          tx.id
        );
        created++;
      } else if (tx.type === 'EXPENSE') {
        await createExpenseEntry(
          Number(tx.amount),
          tx.description || tx.category || 'Gasto',
          tx.category || 'General',
          tx.date,
          companyId,
          createdBy,
          tx.id
        );
        created++;
      }
    } catch (error: any) {
      console.error(`❌ Error en transacción ${tx.id}: ${error.message}`);
      errors++;
    }
  }
  
  // 2. Migrar gastos
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    include: { category: true }
  });
  
  for (const exp of expenses) {
    try {
      await createExpenseEntry(
        Number(exp.amount),
        exp.description || 'Gasto',
        exp.category?.name || 'General',
        exp.date,
        companyId,
        createdBy,
        exp.id
      );
      created++;
    } catch (error: any) {
      console.error(`❌ Error en gasto ${exp.id}: ${error.message}`);
      errors++;
    }
  }
  
  // 3. Migrar facturas
  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { customer: true }
  });
  
  for (const inv of invoices) {
    try {
      // Crear asiento de factura
      await createInvoiceEntry(
        Number(inv.total),
        inv.invoiceNumber,
        inv.customer?.name || 'Cliente',
        inv.issueDate,
        companyId,
        createdBy
      );
      created++;
      
      // Si está pagada, crear asiento de cobro
      if (inv.status === 'PAID' && inv.paidDate) {
        await createPaymentReceivedEntry(
          Number(inv.total),
          inv.invoiceNumber,
          inv.customer?.name || 'Cliente',
          inv.paidDate,
          companyId,
          createdBy
        );
        created++;
      }
    } catch (error: any) {
      console.error(`❌ Error en factura ${inv.invoiceNumber}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n✅ Migración completada: ${created} asientos creados, ${errors} errores\n`);
  return { created, errors };
}

// ============================================
// Script de ejecución directa
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const companyId = args[0] || 'cmis3j65t000712d2bx4izgfy';
  const createdBy = 'system-migration';
  
  console.log('═'.repeat(60));
  console.log('🔧 SERVICIO DE ASIENTOS CONTABLES AUTOMÁTICOS');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${companyId}`);
  console.log('═'.repeat(60));
  
  // Verificar que existen las cuentas necesarias
  console.log('\n📋 Verificando catálogo de cuentas...');
  
  const requiredAccounts = Object.entries(ACCOUNT_CODES);
  let missingAccounts: string[] = [];
  
  for (const [name, code] of requiredAccounts) {
    const account = await getAccountId(code, companyId);
    if (!account) {
      missingAccounts.push(`${code} - ${name}`);
    }
  }
  
  if (missingAccounts.length > 0) {
    console.log('\n⚠️  CUENTAS FALTANTES:');
    missingAccounts.forEach(acc => console.log(`   - ${acc}`));
    console.log('\n❌ Por favor crea las cuentas faltantes antes de continuar.');
    console.log('   O ejecuta el seed del catálogo de cuentas.\n');
    process.exit(1);
  }
  
  console.log('✅ Todas las cuentas necesarias existen\n');
  
  // Migrar datos existentes
  await migrateExistingTransactions(companyId, createdBy);
  
  await prisma.$disconnect();
}

// Solo ejecutar si es el script principal
if (require.main === module) {
  main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
}

/**
 * SERVICIO DE ASIENTOS CONTABLES AUTOMÁTICOS
 * 
 * Genera asientos contables cuando se crean transacciones, gastos o facturas.
 * Principio de Partida Doble: Débitos = Créditos
 */

import { prisma } from '@/lib/prisma';

// Códigos de cuentas estándar
const ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1100',
  ACCOUNTS_RECEIVABLE: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_REVENUE: '4000',
  OTHER_INCOME: '4900',
  OPERATING_EXPENSES: '5000',
  SALARIES_EXPENSE: '5100',
  RENT_EXPENSE: '5200',
  UTILITIES_EXPENSE: '5300',
  OTHER_EXPENSES: '5900',
};

async function getAccountId(code: string, companyId: string): Promise<string | null> {
  const account = await prisma.chartOfAccounts.findFirst({
    where: { 
      code,
      OR: [
        { companyId },
        { companyId: null }
      ]
    }
  });
  return account?.id || null;
}

async function generateEntryNumber(companyId: string): Promise<string> {
  const count = await prisma.journalEntry.count({
    where: { companyId }
  });
  const year = new Date().getFullYear();
  return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
}

interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

async function createJournalEntry(
  companyId: string,
  date: Date,
  description: string,
  lines: JournalLine[],
  reference?: string,
  createdBy?: string
) {
  // Validar partida doble
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error(`Asiento desbalanceado: Débitos ($${totalDebit}) != Créditos ($${totalCredit})`);
    return null;
  }
  
  try {
    // Obtener IDs de cuentas
    const linesWithIds = await Promise.all(
      lines.map(async (line, index) => {
        const accountId = await getAccountId(line.accountCode, companyId);
        if (!accountId) {
          throw new Error(`Cuenta no encontrada: ${line.accountCode}`);
        }
        return {
          accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          lineNumber: index + 1
        };
      })
    );
    
    const entryNumber = await generateEntryNumber(companyId);
    
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date,
        description,
        reference,
        companyId,
        createdBy: createdBy || 'system',
        status: 'POSTED',
        lines: {
          create: linesWithIds
        }
      },
      include: { lines: true }
    });
    
    console.log(`✅ Asiento creado: ${entryNumber}`);
    return entry;
  } catch (error: any) {
    console.error(`Error creando asiento: ${error.message}`);
    return null;
  }
}

/**
 * Crear asiento para INGRESO
 * Débito: Caja (activo aumenta)
 * Crédito: Ingresos (patrimonio aumenta)
 */
export async function createIncomeJournalEntry(
  companyId: string,
  amount: number,
  description: string,
  date: Date,
  reference?: string,
  createdBy?: string
) {
  return createJournalEntry(
    companyId,
    date,
    `Ingreso: ${description}`,
    [
      { accountCode: ACCOUNT_CODES.CASH, debit: amount, credit: 0, description: 'Entrada de efectivo' },
      { accountCode: ACCOUNT_CODES.OTHER_INCOME, debit: 0, credit: amount, description }
    ],
    reference,
    createdBy
  );
}

/**
 * Crear asiento para GASTO
 * Débito: Gastos (gasto aumenta)
 * Crédito: Caja (activo disminuye)
 */
export async function createExpenseJournalEntry(
  companyId: string,
  amount: number,
  description: string,
  category: string,
  date: Date,
  reference?: string,
  createdBy?: string
) {
  // Mapear categoría a cuenta de gasto
  let expenseAccountCode = ACCOUNT_CODES.OTHER_EXPENSES;
  const categoryLower = category?.toLowerCase() || '';
  
  if (categoryLower.includes('salario') || categoryLower.includes('payroll') || categoryLower.includes('sueldo')) {
    expenseAccountCode = ACCOUNT_CODES.SALARIES_EXPENSE;
  } else if (categoryLower.includes('alquiler') || categoryLower.includes('rent')) {
    expenseAccountCode = ACCOUNT_CODES.RENT_EXPENSE;
  } else if (categoryLower.includes('servicio') || categoryLower.includes('utility') || categoryLower.includes('luz') || categoryLower.includes('agua')) {
    expenseAccountCode = ACCOUNT_CODES.UTILITIES_EXPENSE;
  }
  
  return createJournalEntry(
    companyId,
    date,
    `Gasto: ${description}`,
    [
      { accountCode: expenseAccountCode, debit: amount, credit: 0, description },
      { accountCode: ACCOUNT_CODES.CASH, debit: 0, credit: amount, description: 'Pago de gasto' }
    ],
    reference,
    createdBy
  );
}

/**
 * Crear asiento para FACTURA EMITIDA (venta a crédito)
 * Débito: Cuentas por Cobrar (activo aumenta)
 * Crédito: Ingresos por Ventas (patrimonio aumenta)
 */
export async function createInvoiceJournalEntry(
  companyId: string,
  amount: number,
  invoiceNumber: string,
  customerName: string,
  date: Date,
  createdBy?: string
) {
  return createJournalEntry(
    companyId,
    date,
    `Factura ${invoiceNumber} - ${customerName}`,
    [
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: amount, credit: 0, description: `CxC - ${customerName}` },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: amount, description: `Venta - ${invoiceNumber}` }
    ],
    invoiceNumber,
    createdBy
  );
}

/**
 * Crear asiento para COBRO DE FACTURA
 * Débito: Banco (activo aumenta)
 * Crédito: Cuentas por Cobrar (activo disminuye)
 */
export async function createPaymentReceivedJournalEntry(
  companyId: string,
  amount: number,
  invoiceNumber: string,
  customerName: string,
  date: Date,
  createdBy?: string
) {
  return createJournalEntry(
    companyId,
    date,
    `Cobro Factura ${invoiceNumber} - ${customerName}`,
    [
      { accountCode: ACCOUNT_CODES.BANK, debit: amount, credit: 0, description: `Depósito - ${invoiceNumber}` },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, description: `Cobro - ${customerName}` }
    ],
    `${invoiceNumber}-PAYMENT`,
    createdBy
  );
}

/**
 * REVERTIR asiento contable (crear contra-asiento)
 * Usado cuando se elimina una transacción o gasto
 */
export async function reverseJournalEntry(
  journalEntryId: string,
  reason: string,
  createdBy?: string
) {
  try {
    const original = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true }
    });

    if (!original) {
      console.log(`Asiento ${journalEntryId} no encontrado para revertir`);
      return null;
    }

    // Crear líneas inversas (intercambiar débitos y créditos)
    const reversedLines = await Promise.all(
      original.lines.map(async (line, index) => ({
        accountId: line.accountId,
        debit: line.credit, // Invertir
        credit: line.debit, // Invertir
        description: `REVERSIÓN: ${line.description}`,
        lineNumber: index + 1
      }))
    );

    const entryNumber = await generateEntryNumber(original.companyId);

    const reversalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(),
        description: `REVERSIÓN: ${original.description} - ${reason}`,
        reference: `REV-${original.entryNumber}`,
        companyId: original.companyId,
        createdBy: createdBy || 'system',
        status: 'POSTED',
        lines: {
          create: reversedLines
        }
      }
    });

    console.log(`✅ Asiento revertido: ${original.entryNumber} → ${entryNumber}`);
    return reversalEntry;
  } catch (error: any) {
    console.error(`Error revirtiendo asiento: ${error.message}`);
    return null;
  }
}

/**
 * Buscar journal entry por referencia (transaction ID, expense ID, etc.)
 */
export async function findJournalEntryByReference(reference: string) {
  return prisma.journalEntry.findFirst({
    where: { reference },
    include: { lines: true }
  });
}

/**
 * Eliminar transacción con reversión de asiento contable
 */
export async function deleteTransactionWithReversal(
  transactionId: string,
  userId: string
) {
  // Buscar asiento contable asociado
  const journalEntry = await findJournalEntryByReference(transactionId);
  
  if (journalEntry) {
    await reverseJournalEntry(journalEntry.id, 'Transacción eliminada', userId);
  }
  
  // Eliminar la transacción
  await prisma.transaction.delete({ where: { id: transactionId } });
}

/**
 * Eliminar gasto con reversión de asiento contable
 */
export async function deleteExpenseWithReversal(
  expenseId: string,
  userId: string
) {
  // Buscar asiento contable asociado
  const journalEntry = await findJournalEntryByReference(expenseId);
  
  if (journalEntry) {
    await reverseJournalEntry(journalEntry.id, 'Gasto eliminado', userId);
  }
  
  // Eliminar el gasto
  await prisma.expense.delete({ where: { id: expenseId } });
}

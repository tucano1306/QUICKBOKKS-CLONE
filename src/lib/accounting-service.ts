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
        date: original.date, // ✅ Usar la misma fecha del asiento original para reportes por período
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

// ============================================
// FUNCIONES ATÓMICAS PARA CREAR TRANSACCIONES/GASTOS CON JE
// Usar estas funciones en lugar de prisma.transaction.create directamente
// ============================================

interface CreateTransactionParams {
  companyId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description?: string;
  category?: string;
  date?: Date;
  notes?: string;
  userId: string;
}

/**
 * Crear transacción con Journal Entry de forma ATÓMICA
 * Si falla el JE, se revierte la transacción
 */
export async function createTransactionWithJE(params: CreateTransactionParams) {
  const { companyId, type, amount, description, category, date, notes, userId } = params;
  const txDate = date || new Date();
  const txDescription = description || category || (type === 'INCOME' ? 'Ingreso' : 'Gasto');
  
  return prisma.$transaction(async (tx) => {
    // 1. Crear la transacción
    const transaction = await tx.transaction.create({
      data: {
        companyId,
        type,
        category: category || (type === 'INCOME' ? 'Ingreso General' : 'Gasto General'),
        description: txDescription,
        amount,
        date: txDate,
        status: 'COMPLETED',
        notes
      }
    });

    // 2. Buscar cuenta de caja
    const cashAccount = await tx.chartOfAccounts.findFirst({
      where: { 
        code: ACCOUNT_CODES.CASH,
        OR: [{ companyId }, { companyId: null }]
      }
    });

    if (!cashAccount) {
      throw new Error('Cuenta de Caja (1000) no encontrada. Ejecute el seed de cuentas.');
    }

    // 3. Determinar cuenta de ingreso/gasto
    let targetAccountCode: string;
    if (type === 'INCOME') {
      targetAccountCode = ACCOUNT_CODES.OTHER_INCOME;
    } else {
      const categoryLower = (category || '').toLowerCase();
      if (categoryLower.includes('salario') || categoryLower.includes('chofer') || categoryLower.includes('sueldo')) {
        targetAccountCode = ACCOUNT_CODES.SALARIES_EXPENSE;
      } else if (categoryLower.includes('alquiler') || categoryLower.includes('rent')) {
        targetAccountCode = ACCOUNT_CODES.RENT_EXPENSE;
      } else if (categoryLower.includes('servicio') || categoryLower.includes('luz') || categoryLower.includes('agua')) {
        targetAccountCode = ACCOUNT_CODES.UTILITIES_EXPENSE;
      } else {
        targetAccountCode = ACCOUNT_CODES.OTHER_EXPENSES;
      }
    }

    const targetAccount = await tx.chartOfAccounts.findFirst({
      where: { 
        code: targetAccountCode,
        OR: [{ companyId }, { companyId: null }]
      }
    });

    if (!targetAccount) {
      throw new Error(`Cuenta ${targetAccountCode} no encontrada. Ejecute el seed de cuentas.`);
    }

    // 4. Generar número de asiento
    const jeCount = await tx.journalEntry.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const entryNumber = `JE-${year}-${String(jeCount + 1).padStart(6, '0')}`;

    // 5. Crear Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        date: txDate,
        description: `${type === 'INCOME' ? 'Ingreso' : 'Gasto'}: ${txDescription}`,
        reference: transaction.id,
        companyId,
        createdBy: userId,
        status: 'POSTED',
        lines: {
          create: type === 'INCOME' 
            ? [
                { accountId: cashAccount.id, debit: amount, credit: 0, description: 'Entrada de efectivo', lineNumber: 1 },
                { accountId: targetAccount.id, debit: 0, credit: amount, description: txDescription, lineNumber: 2 }
              ]
            : [
                { accountId: targetAccount.id, debit: amount, credit: 0, description: txDescription, lineNumber: 1 },
                { accountId: cashAccount.id, debit: 0, credit: amount, description: 'Pago de gasto', lineNumber: 2 }
              ]
        }
      }
    });

    console.log(`✅ Transacción ${transaction.id} creada con JE ${journalEntry.entryNumber}`);
    return { transaction, journalEntry };
  });
}

interface CreateExpenseParams {
  companyId: string;
  userId: string;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  description?: string;
  vendor?: string;
  date?: Date;
  paymentMethod?: string;
  notes?: string;
  attachments?: string[];
}

/**
 * Crear gasto con Journal Entry de forma ATÓMICA
 * Si falla el JE, se revierte el gasto
 */
export async function createExpenseWithJE(params: CreateExpenseParams) {
  const { 
    companyId, userId, categoryId, categoryName, amount, 
    description, vendor, date, paymentMethod, notes, attachments 
  } = params;
  
  const expDate = date || new Date();
  
  return prisma.$transaction(async (tx) => {
    // 1. Crear el gasto
    const expense = await tx.expense.create({
      data: {
        userId,
        companyId,
        categoryId,
        amount,
        date: expDate,
        description: description || 'Gasto',
        vendor: vendor || '',
        paymentMethod: (paymentMethod as any) || 'CASH',
        status: 'PENDING',
        attachments: attachments || [],
        notes
      },
      include: { category: true }
    });

    // 2. Buscar cuenta de caja
    const cashAccount = await tx.chartOfAccounts.findFirst({
      where: { 
        code: ACCOUNT_CODES.CASH,
        OR: [{ companyId }, { companyId: null }]
      }
    });

    if (!cashAccount) {
      throw new Error('Cuenta de Caja (1000) no encontrada');
    }

    // 3. Determinar cuenta de gasto
    const catName = (categoryName || expense.category?.name || '').toLowerCase();
    let expenseAccountCode = ACCOUNT_CODES.OTHER_EXPENSES;
    
    if (catName.includes('salario') || catName.includes('chofer') || catName.includes('sueldo')) {
      expenseAccountCode = ACCOUNT_CODES.SALARIES_EXPENSE;
    } else if (catName.includes('alquiler') || catName.includes('rent')) {
      expenseAccountCode = ACCOUNT_CODES.RENT_EXPENSE;
    } else if (catName.includes('servicio') || catName.includes('luz') || catName.includes('agua')) {
      expenseAccountCode = ACCOUNT_CODES.UTILITIES_EXPENSE;
    }

    const expenseAccount = await tx.chartOfAccounts.findFirst({
      where: { 
        code: expenseAccountCode,
        OR: [{ companyId }, { companyId: null }]
      }
    });

    if (!expenseAccount) {
      throw new Error(`Cuenta de gastos (${expenseAccountCode}) no encontrada`);
    }

    // 4. Generar número de asiento
    const jeCount = await tx.journalEntry.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const entryNumber = `JE-${year}-${String(jeCount + 1).padStart(6, '0')}`;

    // 5. Crear Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        date: expDate,
        description: `Gasto: ${description || expense.category?.name || 'General'}`,
        reference: expense.id,
        companyId,
        createdBy: userId,
        status: 'POSTED',
        lines: {
          create: [
            { accountId: expenseAccount.id, debit: amount, credit: 0, description: description || 'Gasto', lineNumber: 1 },
            { accountId: cashAccount.id, debit: 0, credit: amount, description: 'Pago de gasto', lineNumber: 2 }
          ]
        }
      }
    });

    console.log(`✅ Gasto ${expense.id} creado con JE ${journalEntry.entryNumber}`);
    return { expense, journalEntry };
  });
}


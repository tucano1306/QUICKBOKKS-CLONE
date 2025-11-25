/**
 * ADVANCED ACCOUNTING REPORTS SERVICE
 * 
 * Reportes contables avanzados:
 * - Mayor Analítico (Analytical Ledger)
 * - Balance de Comprobación Detallado (Trial Balance)
 * - Asientos de Diario Legal (Legal Journal Format)
 * - Módulo de Cuentas de Crédito
 */

import { prisma } from './prisma';

// ============== INTERFACES ==============

export interface AnalyticalLedgerEntry {
  date: Date;
  journalEntryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
}

export interface AnalyticalLedger {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  entries: AnalyticalLedgerEntry[];
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface TrialBalanceAccount {
  code: string;
  name: string;
  type: string;
  category: string;
  openingBalance: number;
  debits: number;
  credits: number;
  closingBalance: number;
  level: number;
}

export interface TrialBalance {
  period: {
    startDate: Date;
    endDate: Date;
  };
  accounts: TrialBalanceAccount[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebits: number;
    periodCredits: number;
    closingDebit: number;
    closingCredit: number;
  };
  isBalanced: boolean;
}

export interface LegalJournalEntry {
  entryNumber: string;
  correlativeNumber: number;
  date: Date;
  description: string;
  reference?: string;
  lines: Array<{
    lineNumber: number;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  status: string;
}

export interface LegalJournal {
  period: {
    startDate: Date;
    endDate: Date;
  };
  entries: LegalJournalEntry[];
  totalEntries: number;
  totalDebits: number;
  totalCredits: number;
}

export interface CreditAccountReconciliation {
  accountId: string;
  accountName: string;
  cardNumber: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  charges: Array<{
    date: Date;
    description: string;
    amount: number;
    matched: boolean;
  }>;
  payments: Array<{
    date: Date;
    description: string;
    amount: number;
    matched: boolean;
  }>;
  unmatchedCharges: number;
  unmatchedPayments: number;
  difference: number;
  isReconciled: boolean;
}

// ============== MAYOR ANALÍTICO (ANALYTICAL LEDGER) ==============

export async function generateAnalyticalLedger(
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticalLedger> {
  // Obtener la cuenta
  const account = await prisma.chartOfAccounts.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error('Cuenta no encontrada');
  }

  // Calcular saldo de apertura (antes del startDate)
  const openingEntries = await prisma.journalEntryLine.findMany({
    where: {
      accountId,
      journalEntry: {
        date: { lt: startDate },
        status: 'POSTED',
      },
    },
    include: {
      journalEntry: true,
    },
  });

  let openingBalance = 0;
  openingEntries.forEach(line => {
    if (account.type === 'ASSET' || account.type === 'EXPENSE') {
      openingBalance += line.debit - line.credit;
    } else {
      openingBalance += line.credit - line.debit;
    }
  });

  // Obtener movimientos del período
  const periodEntries = await prisma.journalEntryLine.findMany({
    where: {
      accountId,
      journalEntry: {
        date: { gte: startDate, lte: endDate },
        status: 'POSTED',
      },
    },
    include: {
      journalEntry: true,
    },
    orderBy: {
      journalEntry: {
        date: 'asc',
      },
    },
  });

  let runningBalance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const entries: AnalyticalLedgerEntry[] = periodEntries.map(line => {
    const debit = line.debit;
    const credit = line.credit;

    totalDebits += debit;
    totalCredits += credit;

    // Actualizar balance corriente según el tipo de cuenta
    if (account.type === 'ASSET' || account.type === 'EXPENSE') {
      runningBalance += debit - credit;
    } else {
      runningBalance += credit - debit;
    }

    return {
      date: line.journalEntry.date,
      journalEntryNumber: line.journalEntry.entryNumber,
      description: line.journalEntry.description,
      debit,
      credit,
      balance: runningBalance,
      reference: line.journalEntry.reference || undefined,
    };
  });

  const closingBalance = runningBalance;

  return {
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    openingBalance,
    entries,
    totalDebits,
    totalCredits,
    closingBalance,
    period: { startDate, endDate },
  };
}

// ============== BALANCE DE COMPROBACIÓN DETALLADO ==============

export async function generateDetailedTrialBalance(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TrialBalance> {
  // Obtener todas las cuentas activas
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  const accountBalances: TrialBalanceAccount[] = [];

  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebits = 0;
  let totalPeriodCredits = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  for (const account of accounts) {
    // Saldo de apertura
    const openingEntries = await prisma.journalEntryLine.findMany({
      where: {
        accountId: account.id,
        journalEntry: {
          date: { lt: startDate },
          status: 'POSTED',
        },
      },
    });

    let openingBalance = 0;
    openingEntries.forEach(line => {
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        openingBalance += line.debit - line.credit;
      } else {
        openingBalance += line.credit - line.debit;
      }
    });

    // Movimientos del período
    const periodEntries = await prisma.journalEntryLine.findMany({
      where: {
        accountId: account.id,
        journalEntry: {
          date: { gte: startDate, lte: endDate },
          status: 'POSTED',
        },
      },
    });

    let periodDebits = 0;
    let periodCredits = 0;

    periodEntries.forEach(line => {
      periodDebits += line.debit;
      periodCredits += line.credit;
    });

    // Saldo de cierre
    let closingBalance = openingBalance;
    if (account.type === 'ASSET' || account.type === 'EXPENSE') {
      closingBalance += periodDebits - periodCredits;
    } else {
      closingBalance += periodCredits - periodDebits;
    }

    // Acumular totales
    if (openingBalance > 0) {
      totalOpeningDebit += openingBalance;
    } else {
      totalOpeningCredit += Math.abs(openingBalance);
    }

    totalPeriodDebits += periodDebits;
    totalPeriodCredits += periodCredits;

    if (closingBalance > 0) {
      totalClosingDebit += closingBalance;
    } else {
      totalClosingCredit += Math.abs(closingBalance);
    }

    accountBalances.push({
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category || '',
      openingBalance,
      debits: periodDebits,
      credits: periodCredits,
      closingBalance,
      level: account.level,
    });
  }

  const isBalanced = 
    Math.abs(totalPeriodDebits - totalPeriodCredits) < 0.01 &&
    Math.abs(totalClosingDebit - totalClosingCredit) < 0.01;

  return {
    period: { startDate, endDate },
    accounts: accountBalances,
    totals: {
      openingDebit: totalOpeningDebit,
      openingCredit: totalOpeningCredit,
      periodDebits: totalPeriodDebits,
      periodCredits: totalPeriodCredits,
      closingDebit: totalClosingDebit,
      closingCredit: totalClosingCredit,
    },
    isBalanced,
  };
}

// ============== ASIENTOS DE DIARIO LEGAL ==============

export async function generateLegalJournal(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<LegalJournal> {
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      status: { in: ['POSTED', 'APPROVED'] },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
        orderBy: {
          lineNumber: 'asc',
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  let correlativeNumber = 1;
  let totalDebits = 0;
  let totalCredits = 0;

  const entries: LegalJournalEntry[] = journalEntries.map(entry => {
    const lines = entry.lines.map((line, index) => ({
      lineNumber: index + 1,
      accountCode: line.account.code,
      accountName: line.account.name,
      debit: line.debit,
      credit: line.credit,
    }));

    const entryTotalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const entryTotalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    totalDebits += entryTotalDebit;
    totalCredits += entryTotalCredit;

    const legalEntry: LegalJournalEntry = {
      entryNumber: entry.entryNumber,
      correlativeNumber: correlativeNumber++,
      date: entry.date,
      description: entry.description,
      reference: entry.reference || undefined,
      lines,
      totalDebit: entryTotalDebit,
      totalCredit: entryTotalCredit,
      createdBy: entry.createdBy,
      approvedBy: entry.approvedBy || undefined,
      approvedAt: entry.approvedAt || undefined,
      status: entry.status,
    };

    return legalEntry;
  });

  return {
    period: { startDate, endDate },
    entries,
    totalEntries: entries.length,
    totalDebits,
    totalCredits,
  };
}

// ============== MÓDULO DE CUENTAS DE CRÉDITO ==============

export async function reconcileCreditAccount(
  bankAccountId: string,
  statementDate: Date,
  statementBalance: number
): Promise<CreditAccountReconciliation> {
  // Obtener la cuenta bancaria (tarjeta de crédito)
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccount || bankAccount.accountType !== 'CREDIT_CARD') {
    throw new Error('Cuenta de crédito no encontrada');
  }

  // Obtener todas las transacciones hasta la fecha del estado de cuenta
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      date: { lte: statementDate },
    },
    orderBy: {
      date: 'asc',
    },
  });

  const charges: Array<{
    date: Date;
    description: string;
    amount: number;
    matched: boolean;
  }> = [];

  const payments: Array<{
    date: Date;
    description: string;
    amount: number;
    matched: boolean;
  }> = [];

  let bookBalance = 0;

  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount.toString());

    if (amount < 0) {
      // Cargo (negativo)
      charges.push({
        date: tx.date,
        description: tx.description,
        amount: Math.abs(amount),
        matched: tx.reconciled,
      });
      bookBalance += Math.abs(amount);
    } else {
      // Pago (positivo)
      payments.push({
        date: tx.date,
        description: tx.description,
        amount: amount,
        matched: tx.reconciled,
      });
      bookBalance -= amount;
    }
  });

  const unmatchedCharges = charges.filter(c => !c.matched).reduce((sum, c) => sum + c.amount, 0);
  const unmatchedPayments = payments.filter(p => !p.matched).reduce((sum, p) => sum + p.amount, 0);

  const difference = Math.abs(statementBalance - bookBalance);
  const isReconciled = difference < 0.01;

  return {
    accountId: bankAccountId,
    accountName: bankAccount.accountName,
    cardNumber: bankAccount.accountNumber.slice(-4),
    statementDate,
    statementBalance,
    bookBalance,
    charges,
    payments,
    unmatchedCharges,
    unmatchedPayments,
    difference,
    isReconciled,
  };
}

export async function autoMatchCreditTransactions(
  bankAccountId: string,
  tolerance: number = 0.01
): Promise<number> {
  // Obtener transacciones no reconciliadas
  const unreconciled = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      reconciled: false,
    },
    orderBy: {
      date: 'asc',
    },
  });

  let matchedCount = 0;

  // Lógica simple de matching: marcar como reconciliadas las que coincidan con journal entries
  for (const tx of unreconciled) {
    // Buscar journal entries con el mismo monto y fecha cercana
    const potentialMatches = await prisma.journalEntry.findMany({
      where: {
        date: {
          gte: new Date(tx.date.getTime() - 7 * 24 * 60 * 60 * 1000), // ±7 días
          lte: new Date(tx.date.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'POSTED',
      },
      include: {
        lines: true,
      },
    });

    for (const entry of potentialMatches) {
      const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
      const entryAmount = totalDebit - totalCredit;

      if (Math.abs(entryAmount - parseFloat(tx.amount.toString())) < tolerance) {
        // Match encontrado
        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { reconciled: true },
        });
        matchedCount++;
        break;
      }
    }
  }

  return matchedCount;
}

// ============== RECLASIFICACIÓN DE CUENTAS ==============

export async function reclassifyTransaction(
  journalEntryLineId: string,
  newAccountId: string,
  reason: string,
  userId: string
): Promise<void> {
  // Obtener la línea original
  const line = await prisma.journalEntryLine.findUnique({
    where: { id: journalEntryLineId },
    include: {
      journalEntry: true,
      account: true,
    },
  });

  if (!line) {
    throw new Error('Línea de asiento no encontrada');
  }

  // Verificar que el asiento no esté aprobado
  if (line.journalEntry.status === 'APPROVED') {
    throw new Error('No se puede reclasificar un asiento aprobado');
  }

  const oldAccountId = line.accountId;

  // Actualizar la cuenta
  await prisma.journalEntryLine.update({
    where: { id: journalEntryLineId },
    data: {
      accountId: newAccountId,
    },
  });

  // Crear registro de auditoría (en una tabla de auditoría si existe)
  // Por ahora, registrar en un log o crear un comment en el journal entry
  await prisma.journalEntry.update({
    where: { id: line.journalEntryId },
    data: {
      reference: `${line.journalEntry.reference || ''} | Reclasificado: ${line.account.code} → Nueva cuenta por ${userId}: ${reason}`,
    },
  });

  // Actualizar balances de las cuentas
  const amount = line.debit - line.credit;

  await prisma.chartOfAccounts.update({
    where: { id: oldAccountId },
    data: {
      balance: {
        decrement: amount,
      },
    },
  });

  await prisma.chartOfAccounts.update({
    where: { id: newAccountId },
    data: {
      balance: {
        increment: amount,
      },
    },
  });
}

export async function bulkReclassifyTransactions(
  reclassifications: Array<{
    journalEntryLineId: string;
    newAccountId: string;
    reason: string;
  }>,
  userId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const item of reclassifications) {
    try {
      await reclassifyTransaction(
        item.journalEntryLineId,
        item.newAccountId,
        item.reason,
        userId
      );
      success++;
    } catch (error) {
      console.error(`Error reclasificando línea ${item.journalEntryLineId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// ============== BÚSQUEDA POR NÚMERO DE CHEQUE ==============

export async function searchByCheckNumber(
  userId: string,
  checkNumber: string
): Promise<any[]> {
  // Buscar en payrolls
  // TODO: Payroll checkNumber field doesn't exist in schema
  // const payrolls = await prisma.payroll.findMany({
  //   where: {
  //     // checkNumber: {
  //     //   contains: checkNumber,
  //     // },
  //   },
  //   include: {
  //     employee: true,
  //   },
  // });
  const payrolls: any[] = [];

  // Buscar en journal entries (referencia)
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      reference: {
        contains: checkNumber,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  return [
    // Payrolls disabled due to missing checkNumber field in Payroll schema
    // ...payrolls.map(p => ({
    //   id: p.id,
    //   type: 'payroll',
    //   checkNumber: p.checkNumber,
    //   date: p.periodEnd,
    //   employee: `${p.employee.firstName} ${p.employee.lastName}`,
    //   amount: p.netSalary,
    // })),
    ...journalEntries.map(je => ({
      id: je.id,
      type: 'journal_entry',
      entryNumber: je.entryNumber,
      date: je.date,
      description: je.description,
      reference: je.reference,
      amount: je.lines.reduce((sum: number, line: any) => sum + parseFloat(line.debit.toString()), 0),
    })),
  ];
}

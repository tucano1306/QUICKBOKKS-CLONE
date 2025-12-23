import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasAllZeroAmounts(lines: any[]): boolean {
  return lines.every(l => (l.debit || 0) === 0 && (l.credit || 0) === 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isExpenseAccount(account: any): boolean {
  return account?.type === 'EXPENSE';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCashAccount(account: any): boolean {
  return account?.type === 'ASSET' && account?.code === '1000';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRevenueAccount(account: any): boolean {
  return account?.type === 'REVENUE';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fixExpenseLines(lines: any[], amount: number, entryNumber: string): Promise<void> {
  for (const line of lines) {
    if (isExpenseAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: amount, credit: 0 }
      });
      console.log(`✅ ${entryNumber} - ${line.account?.name}: Debit $${amount.toFixed(2)}`);
    } else if (isCashAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: 0, credit: amount }
      });
      console.log(`✅ ${entryNumber} - ${line.account?.name}: Credit $${amount.toFixed(2)}`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fixIncomeLines(lines: any[], amount: number): Promise<void> {
  for (const line of lines) {
    if (isCashAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: amount, credit: 0 }
      });
    } else if (isRevenueAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: 0, credit: amount }
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fixExpenseTypeLines(lines: any[], amount: number): Promise<void> {
  for (const line of lines) {
    if (isExpenseAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: amount, credit: 0 }
      });
    } else if (isCashAccount(line.account)) {
      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { debit: 0, credit: amount }
      });
    }
  }
}

async function fixExpenses(companyId: string): Promise<{ fixed: number; alreadyOk: number; notFound: number }> {
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    include: { category: true }
  });
  
  let fixed = 0, alreadyOk = 0, notFound = 0;
  
  for (const exp of expenses) {
    const je = await prisma.journalEntry.findFirst({
      where: { reference: exp.id },
      include: { lines: { include: { account: true } } }
    });
    
    if (!je) { notFound++; continue; }
    if (!hasAllZeroAmounts(je.lines)) { alreadyOk++; continue; }
    
    await fixExpenseLines(je.lines, exp.amount || 0, je.entryNumber);
    fixed++;
  }
  
  return { fixed, alreadyOk, notFound };
}

async function fixTransactions(companyId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({ where: { companyId } });
  let txFixed = 0;
  
  for (const tx of transactions) {
    const je = await prisma.journalEntry.findFirst({
      where: { reference: tx.id },
      include: { lines: { include: { account: true } } }
    });
    
    if (!je || !hasAllZeroAmounts(je.lines)) continue;
    
    const amount = tx.amount || 0;
    
    if (tx.type === 'INCOME') {
      await fixIncomeLines(je.lines, amount);
    } else if (tx.type === 'EXPENSE') {
      await fixExpenseTypeLines(je.lines, amount);
    }
    
    txFixed++;
    console.log(`✅ TX ${je.entryNumber} - ${tx.description}: $${amount.toFixed(2)}`);
  }
  
  return txFixed;
}

async function main(): Promise<void> {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  console.log('=== CORRIGIENDO MONTOS DE JOURNAL ENTRIES ===\n');
  
  const expResult = await fixExpenses(companyId);
  const txFixed = await fixTransactions(companyId);
  
  console.log('\n=== RESUMEN ===');
  console.log('Expenses corregidos:', expResult.fixed);
  console.log('Expenses ya OK:', expResult.alreadyOk);
  console.log('Expenses sin JE:', expResult.notFound);
  console.log('Transacciones corregidas:', txFixed);
  
  await prisma.$disconnect();
}

main().catch(console.error); // NOSONAR - tsx doesn't support top-level await

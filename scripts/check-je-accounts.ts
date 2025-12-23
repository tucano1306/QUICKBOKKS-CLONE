import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logExpenseDetails(exp: any) {
  console.log('\nExpense:', exp.id.slice(-8), '|', exp.description || exp.vendor || 'Sin desc', '| $' + exp.amount?.toFixed(2));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logJournalEntry(je: any) {
  console.log('  JE:', je.entryNumber, '| Fecha:', je.date.toISOString().split('T')[0]);
  for (const line of je.lines) {
    console.log('    Line:', line.account?.code, line.account?.name, '| Type:', line.account?.type, '| D:', line.debit?.toFixed(2), 'C:', line.credit?.toFixed(2));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logMissingJE(je: any, exp: any) {
  console.log('JE sin cuenta EXPENSE:', je.entryNumber, '| Expense:', exp.description, '$' + exp.amount);
  je.lines.forEach((l: { account?: { code?: string; name?: string; type?: string } }) => {
    console.log('  -', l.account?.code, l.account?.name, 'Type:', l.account?.type);
  });
}

async function checkTopExpenses(companyId: string, startDate: Date, endDate: Date) {
  const expenses = await prisma.expense.findMany({
    where: { companyId, date: { gte: startDate, lte: endDate } },
    orderBy: { amount: 'desc' },
    take: 10
  });
  
  console.log('=== VERIFICANDO JE DE EXPENSES MAS GRANDES ===');
  
  for (const exp of expenses) {
    const je = await prisma.journalEntry.findFirst({
      where: { reference: exp.id },
      include: { lines: { include: { account: true } } }
    });
    
    logExpenseDetails(exp);
    if (je) {
      logJournalEntry(je);
    } else {
      console.log('  ❌ NO TIENE JOURNAL ENTRY!');
    }
  }
}

async function listExpenseAccounts(companyId: string) {
  console.log('\n=== CUENTAS TIPO EXPENSE EN EL SISTEMA ===');
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { 
      type: 'EXPENSE',
      OR: [{ companyId }, { companyId: null }] 
    }
  });
  
  accounts.forEach(a => console.log(a.code, '-', a.name));
}

async function analyzeJournalEntries(companyId: string, startDate: Date, endDate: Date) {
  console.log('\n=== ANÁLISIS DE JOURNAL ENTRIES ===');
  const jeWithExpRef = await prisma.journalEntry.findMany({
    where: { 
      companyId,
      date: { gte: startDate, lte: endDate },
      reference: { not: null }
    },
    include: { lines: { include: { account: true } } }
  });
  
  let hasExpenseAccount = 0;
  let missingExpenseAccount = 0;
  
  for (const je of jeWithExpRef) {
    const hasExpType = je.lines.some(l => l.account?.type === 'EXPENSE');
    if (hasExpType) {
      hasExpenseAccount++;
    } else {
      missingExpenseAccount++;
      if (je.reference) {
        const exp = await prisma.expense.findFirst({ where: { id: je.reference } });
        if (exp) logMissingJE(je, exp);
      }
    }
  }
  
  console.log('\nJE con cuenta EXPENSE:', hasExpenseAccount);
  console.log('JE SIN cuenta EXPENSE:', missingExpenseAccount);
}

async function check() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31T23:59:59.999');
  
  await checkTopExpenses(companyId, startDate, endDate);
  await listExpenseAccounts(companyId);
  await analyzeJournalEntries(companyId, startDate, endDate);
  
  await prisma.$disconnect();
}

check().catch(console.error); // NOSONAR - tsx doesn't support top-level await

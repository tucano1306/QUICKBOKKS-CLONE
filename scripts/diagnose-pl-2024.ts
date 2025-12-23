import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31T23:59:59.999');
  
  console.log('=== DIAGNÓSTICO P&L 2024 ===');
  console.log('Periodo:', startDate.toISOString(), '-', endDate.toISOString());
  console.log('CompanyId:', companyId);
  
  // 1. Journal Entries en 2024
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
      status: 'POSTED'
    },
    include: { lines: { include: { account: true } } }
  });
  
  console.log('\n1. JOURNAL ENTRIES en 2024:', journalEntries.length);
  
  let jeRevenue = 0, jeExpense = 0;
  const jeExpenseByAccount: Record<string, number> = {};
  const jeRevenueByAccount: Record<string, number> = {};
  
  for (const je of journalEntries) {
    for (const line of je.lines) {
      if (!line.account) continue;
      
      if (line.account.type === 'REVENUE') {
        const amount = (line.credit || 0) - (line.debit || 0);
        jeRevenue += amount;
        jeRevenueByAccount[line.account.name] = (jeRevenueByAccount[line.account.name] || 0) + amount;
      } else if (line.account.type === 'EXPENSE') {
        const amount = (line.debit || 0) - (line.credit || 0);
        jeExpense += amount;
        jeExpenseByAccount[line.account.name] = (jeExpenseByAccount[line.account.name] || 0) + amount;
      }
    }
  }
  console.log('  Revenue (JE):', jeRevenue.toFixed(2));
  console.log('  Expenses (JE):', jeExpense.toFixed(2));
  
  // 2. Transactions (tipo EXPENSE) en 2024
  const txExpenses = await prisma.transaction.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
      type: 'EXPENSE',
      status: 'COMPLETED'
    }
  });
  const txExpenseTotal = txExpenses.reduce((s, t) => s + (t.amount || 0), 0);
  console.log('\n2. TRANSACCIONES tipo EXPENSE en 2024:', txExpenses.length);
  console.log('  Total:', txExpenseTotal.toFixed(2));
  
  // 3. Tabla expenses en 2024
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate }
    },
    include: { category: true }
  });
  const expTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  console.log('\n3. TABLA EXPENSES en 2024:', expenses.length);
  console.log('  Total:', expTotal.toFixed(2));
  
  // 4. Journal entries references
  const jeRefs = await prisma.journalEntry.findMany({
    where: { 
      companyId, 
      date: { gte: startDate, lte: endDate }, 
      reference: { not: null } 
    },
    select: { reference: true }
  });
  const refsSet = new Set(jeRefs.map(j => j.reference));
  
  const expWithoutJE = expenses.filter(e => !refsSet.has(e.id));
  const txExpWithoutJE = txExpenses.filter(t => !refsSet.has(t.id));
  
  console.log('\n4. REGISTROS SIN JOURNAL ENTRY (no contados):');
  console.log('  Expenses sin JE:', expWithoutJE.length, 'Total:', expWithoutJE.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2));
  console.log('  Tx EXPENSE sin JE:', txExpWithoutJE.length, 'Total:', txExpWithoutJE.reduce((s, t) => s + (t.amount || 0), 0).toFixed(2));
  
  // 5. Muestra de expenses sin JE
  if (expWithoutJE.length > 0) {
    console.log('\n5. MUESTRA de expenses sin JE:');
    expWithoutJE.slice(0, 10).forEach(e => {
      console.log(`  - ${e.date?.toISOString().split('T')[0]} | ${e.description || e.vendor || 'Sin desc'} | $${e.amount?.toFixed(2)} | Cat: ${(e.category as any)?.name || 'N/A'}`);
    });
  }
  
  // 6. Desglose por categoría de JE expenses
  console.log('\n6. DESGLOSE GASTOS (JE) por cuenta:');
  Object.entries(jeExpenseByAccount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, amount]) => {
      console.log(`  ${name}: $${amount.toFixed(2)}`);
    });

  // 7. Verificar si hay transacciones INCOME
  const txIncome = await prisma.transaction.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
      type: 'INCOME',
      status: 'COMPLETED'
    }
  });
  const txIncomeTotal = txIncome.reduce((s, t) => s + (t.amount || 0), 0);
  console.log('\n7. TRANSACCIONES tipo INCOME en 2024:', txIncome.length, 'Total:', txIncomeTotal.toFixed(2));
  
  await prisma.$disconnect();
}

checkData().catch(console.error); // NOSONAR - tsx doesn't support top-level await

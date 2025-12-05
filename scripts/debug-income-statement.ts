import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const startDate = new Date('2023-01-06');
  const endDate = new Date('2023-06-30');
  endDate.setHours(23, 59, 59, 999);

  console.log('\n=== PERÍODO SELECCIONADO ===');
  console.log(`Start: ${startDate.toISOString()}`);
  console.log(`End: ${endDate.toISOString()}`);

  // 1. Verificar TODOS los journal entries
  const allJE = await prisma.journalEntry.findMany({
    where: { status: 'POSTED' },
    include: {
      lines: {
        include: { account: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log('\n=== TODOS LOS JOURNAL ENTRIES ===');
  for (const je of allJE) {
    console.log(`${je.date.toISOString().split('T')[0]} - ${je.description}`);
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE' && line.debit > 0) {
        console.log(`   EXPENSE: ${line.account.name} $${line.debit}`);
      }
      if (line.account?.type === 'REVENUE' && line.credit > 0) {
        console.log(`   REVENUE: ${line.account.name} $${line.credit}`);
      }
    }
  }

  // 2. Journal entries en el período
  const jeInPeriod = await prisma.journalEntry.findMany({
    where: {
      status: 'POSTED',
      date: { gte: startDate, lte: endDate }
    },
    include: {
      lines: {
        include: { account: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log('\n=== JOURNAL ENTRIES EN PERÍODO (2023-01-06 → 2023-06-30) ===');
  console.log(`Total: ${jeInPeriod.length}`);
  
  let totalExpenses = 0;
  let totalRevenue = 0;
  
  for (const je of jeInPeriod) {
    console.log(`${je.date.toISOString().split('T')[0]} - ${je.description}`);
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE' && line.debit > 0) {
        console.log(`   EXPENSE: ${line.account.name} $${line.debit}`);
        totalExpenses += line.debit;
      }
      if (line.account?.type === 'REVENUE' && line.credit > 0) {
        console.log(`   REVENUE: ${line.account.name} $${line.credit}`);
        totalRevenue += line.credit;
      }
    }
  }

  console.log('\n=== TOTALES DEL PERÍODO ===');
  console.log(`Total Ingresos: $${totalRevenue}`);
  console.log(`Total Gastos: $${totalExpenses}`);
  console.log(`Utilidad: $${totalRevenue - totalExpenses}`);

  // 3. Verificar datos legacy (expenses table) en el período
  const expensesInPeriod = await prisma.expense.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    },
    orderBy: { date: 'asc' }
  });

  console.log('\n=== GASTOS (tabla expenses) EN PERÍODO ===');
  let expenseTableTotal = 0;
  for (const exp of expensesInPeriod) {
    console.log(`${exp.date.toISOString().split('T')[0]} - ${exp.description}: $${exp.amount}`);
    expenseTableTotal += exp.amount;
  }
  console.log(`Total desde tabla expenses: $${expenseTableTotal}`);

  // 4. Verificar qué está trayendo la consulta del API
  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      isActive: true,
      type: { in: ['REVENUE', 'EXPENSE'] },
    },
    include: {
      journalEntries: {
        where: {
          journalEntry: {
            date: { gte: startDate, lte: endDate },
            status: 'POSTED',
          },
        },
        include: {
          journalEntry: true
        }
      },
    },
  });

  console.log('\n=== CONSULTA COMO EN EL API ===');
  let apiExpenses = 0;
  let apiRevenue = 0;
  
  for (const account of accounts) {
    const balance = account.type === 'REVENUE'
      ? account.journalEntries.reduce((sum, line) => sum + (line.credit || 0) - (line.debit || 0), 0)
      : account.journalEntries.reduce((sum, line) => sum + (line.debit || 0) - (line.credit || 0), 0);

    if (balance > 0) {
      if (account.type === 'EXPENSE') {
        console.log(`EXPENSE ${account.name}: $${balance}`);
        apiExpenses += balance;
        // Mostrar las líneas
        for (const line of account.journalEntries) {
          console.log(`   -> JE Date: ${line.journalEntry.date.toISOString().split('T')[0]} - ${line.journalEntry.description}`);
        }
      } else if (account.type === 'REVENUE') {
        console.log(`REVENUE ${account.name}: $${balance}`);
        apiRevenue += balance;
      }
    }
  }

  console.log('\n=== TOTALES SEGÚN CONSULTA API ===');
  console.log(`Total Ingresos: $${apiRevenue}`);
  console.log(`Total Gastos: $${apiExpenses}`);

  await prisma.$disconnect();
}

main();

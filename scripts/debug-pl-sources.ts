/**
 * Script para debugear las fuentes de datos del P&L
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPLSources() {
  // Buscar la primera compañía que tenga datos
  const companies = await prisma.company.findMany();
  
  // Encontrar compañía con más journalEntries
  let bestCompany = null;
  let maxEntries = 0;
  
  for (const c of companies) {
    const jeCount = await prisma.journalEntry.count({ where: { companyId: c.id } });
    const txCount = await prisma.transaction.count({ where: { companyId: c.id } });
    const expCount = await prisma.expense.count({ where: { companyId: c.id } });
    console.log(`${c.name}: JE=${jeCount}, TX=${txCount}, EXP=${expCount}`);
    if (jeCount + txCount + expCount > maxEntries) {
      maxEntries = jeCount + txCount + expCount;
      bestCompany = c;
    }
  }
  
  if (!bestCompany) {
    console.log('No hay compañías con datos');
    return;
  }
  
  const companyId = bestCompany.id;
  
  console.log('='.repeat(60));
  console.log('DEBUG: FUENTES DE DATOS PARA P&L');
  console.log('='.repeat(60));
  console.log(`Compañía seleccionada: ${bestCompany.name} (${companyId})`);
  console.log('='.repeat(60));

  // 1. Journal Entries con cuentas de REVENUE
  console.log('\n📊 JOURNAL ENTRIES - REVENUE:');
  const revenueJE = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId },
      account: { type: 'REVENUE' }
    },
    include: {
      journalEntry: { select: { date: true, description: true, reference: true, status: true } },
      account: { select: { name: true, code: true } }
    }
  });
  
  let totalRevenueJE = 0;
  for (const line of revenueJE) {
    const amount = (line.credit || 0) - (line.debit || 0);
    if (amount > 0) {
      totalRevenueJE += amount;
      const dateStr = line.journalEntry.date.toISOString().split('T')[0];
      console.log(`  ${dateStr} | $${amount.toFixed(2)} | ${line.account?.name} | Ref: ${line.journalEntry.reference || 'N/A'}`);
    }
  }
  console.log(`  TOTAL Revenue (JE): $${totalRevenueJE.toFixed(2)}`);

  // 2. Journal Entries con cuentas de EXPENSE
  console.log('\n📊 JOURNAL ENTRIES - EXPENSES:');
  const expenseJE = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId },
      account: { type: 'EXPENSE' }
    },
    include: {
      journalEntry: { select: { date: true, description: true, reference: true, status: true } },
      account: { select: { name: true, code: true } }
    }
  });
  
  let totalExpenseJE = 0;
  for (const line of expenseJE) {
    const amount = (line.debit || 0) - (line.credit || 0);
    if (amount > 0) {
      totalExpenseJE += amount;
      const dateStr = line.journalEntry.date.toISOString().split('T')[0];
      console.log(`  ${dateStr} | $${amount.toFixed(2)} | ${line.account?.name} | Ref: ${line.journalEntry.reference || 'N/A'}`);
    }
  }
  console.log(`  TOTAL Expenses (JE): $${totalExpenseJE.toFixed(2)}`);

  // 3. Transacciones tipo INCOME
  console.log('\n💰 TRANSACCIONES - INCOME:');
  const incomeTransactions = await prisma.transaction.findMany({
    where: { companyId, type: 'INCOME', status: 'COMPLETED' },
    orderBy: { date: 'asc' }
  });
  
  // Obtener referencias de JE para evitar doble conteo
  const jeRefs = new Set<string>();
  const allJEs = await prisma.journalEntry.findMany({
    where: { companyId, reference: { not: null } },
    select: { reference: true }
  });
  allJEs.forEach(je => je.reference && jeRefs.add(je.reference));

  let totalIncomeWithJE = 0;
  let totalIncomeWithoutJE = 0;
  for (const t of incomeTransactions) {
    const hasJE = jeRefs.has(t.id);
    const dateStr = t.date.toISOString().split('T')[0];
    const jeStatus = hasJE ? '✓ JE' : '⚠ SIN JE';
    console.log(`  ${dateStr} | $${(t.amount || 0).toFixed(2)} | ${t.category} | ${jeStatus}`);
    if (hasJE) {
      totalIncomeWithJE += t.amount || 0;
    } else {
      totalIncomeWithoutJE += t.amount || 0;
    }
  }
  console.log(`  TOTAL Income (con JE): $${totalIncomeWithJE.toFixed(2)}`);
  console.log(`  TOTAL Income (sin JE): $${totalIncomeWithoutJE.toFixed(2)}`);

  // 4. Transacciones tipo EXPENSE
  console.log('\n💸 TRANSACCIONES - EXPENSE:');
  const expenseTransactions = await prisma.transaction.findMany({
    where: { companyId, type: 'EXPENSE', status: 'COMPLETED' },
    orderBy: { date: 'asc' }
  });
  
  let totalExpenseWithJE = 0;
  let totalExpenseWithoutJE = 0;
  for (const t of expenseTransactions) {
    const hasJE = jeRefs.has(t.id);
    const dateStr = t.date.toISOString().split('T')[0];
    const jeStatus = hasJE ? '✓ JE' : '⚠ SIN JE';
    console.log(`  ${dateStr} | $${(t.amount || 0).toFixed(2)} | ${t.category} | ${jeStatus}`);
    if (hasJE) {
      totalExpenseWithJE += t.amount || 0;
    } else {
      totalExpenseWithoutJE += t.amount || 0;
    }
  }
  console.log(`  TOTAL Expense Tx (con JE): $${totalExpenseWithJE.toFixed(2)}`);
  console.log(`  TOTAL Expense Tx (sin JE): $${totalExpenseWithoutJE.toFixed(2)}`);

  // 5. Tabla Expenses (gastos directos)
  console.log('\n📋 TABLA EXPENSES (Gastos directos):');
  const directExpenses = await prisma.expense.findMany({
    where: { companyId },
    include: { category: true },
    orderBy: { date: 'asc' }
  });
  
  let totalDirectExpenses = 0;
  let totalDirectWithoutJE = 0;
  for (const exp of directExpenses) {
    const hasJE = jeRefs.has(exp.id);
    const dateStr = exp.date.toISOString().split('T')[0];
    const jeStatus = hasJE ? '✓ JE' : '⚠ SIN JE';
    const catName = (exp.category as any)?.name || exp.vendor || 'Sin categoría';
    console.log(`  ${dateStr} | $${(exp.amount || 0).toFixed(2)} | ${catName} | ${exp.description} | ${jeStatus}`);
    totalDirectExpenses += exp.amount || 0;
    if (!hasJE) {
      totalDirectWithoutJE += exp.amount || 0;
    }
  }
  console.log(`  TOTAL Expenses directos: $${totalDirectExpenses.toFixed(2)}`);
  console.log(`  TOTAL sin JE (agregaría al P&L): $${totalDirectWithoutJE.toFixed(2)}`);

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📈 RESUMEN PARA P&L (con source=both):');
  console.log('='.repeat(60));
  console.log(`INGRESOS:`);
  console.log(`  - Desde Journal Entries: $${totalRevenueJE.toFixed(2)}`);
  console.log(`  - Transacciones sin JE:  $${totalIncomeWithoutJE.toFixed(2)}`);
  console.log(`  TOTAL INGRESOS:          $${(totalRevenueJE + totalIncomeWithoutJE).toFixed(2)}`);
  console.log(`\nGASTOS:`);
  console.log(`  - Desde Journal Entries: $${totalExpenseJE.toFixed(2)}`);
  console.log(`  - Transacciones sin JE:  $${totalExpenseWithoutJE.toFixed(2)}`);
  console.log(`  - Expenses sin JE:       $${totalDirectWithoutJE.toFixed(2)}`);
  console.log(`  TOTAL GASTOS:            $${(totalExpenseJE + totalExpenseWithoutJE + totalDirectWithoutJE).toFixed(2)}`);
  
  const totalIncome = totalRevenueJE + totalIncomeWithoutJE;
  const totalExpense = totalExpenseJE + totalExpenseWithoutJE + totalDirectWithoutJE;
  console.log(`\n💵 UTILIDAD NETA: $${(totalIncome - totalExpense).toFixed(2)}`);

  await prisma.$disconnect();
}

debugPLSources().catch(console.error);

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

// Helper types
interface CategoryMap { [key: string]: { name: string; amount: number } }

// Helper: Add amount to category
function addToCategory(map: CategoryMap, catName: string, amount: number): void {
  if (!map[catName]) map[catName] = { name: catName, amount: 0 };
  map[catName].amount += amount;
}

// Helper function: Build expense category map
async function buildExpenseCategoryMap(companyId: string | null): Promise<Map<string, string>> {
  const expenses = await prisma.expense.findMany({
    where: { ...(companyId && { companyId }) },
    select: { id: true, category: { select: { name: true } } }
  });
  const map = new Map<string, string>();
  for (const exp of expenses) {
    if (exp.category?.name) map.set(exp.id, exp.category.name);
  }
  return map;
}

// Helper: Process a single journal line for revenue
function processRevenueLine(
  line: { credit: number | null; debit: number | null; account: { name: string } | null },
  incomeByCategory: CategoryMap
): number {
  if (!line.account) return 0;
  const amount = (line.credit || 0) - (line.debit || 0);
  addToCategory(incomeByCategory, line.account.name, amount);
  return amount;
}

// Helper: Process a single journal line for expense
function processExpenseLine(
  line: { credit: number | null; debit: number | null; account: { name: string } | null },
  reference: string | null,
  expenseCategoryMap: Map<string, string>,
  expensesByCategory: CategoryMap
): number {
  if (!line.account) return 0;
  const amount = (line.debit || 0) - (line.credit || 0);
  const catName = (reference && expenseCategoryMap.get(reference)) || line.account.name;
  addToCategory(expensesByCategory, catName, amount);
  return amount;
}

// Helper function: Process journal entries
async function processJournalEntries(
  companyId: string | null,
  startDate: Date,
  endDate: Date,
  expenseCategoryMap: Map<string, string>
) {
  const entries = await prisma.journalEntry.findMany({
    where: {
      ...(companyId && { companyId }),
      date: { gte: startDate, lte: endDate },
      status: 'POSTED',
    },
    include: { lines: { include: { account: true } } },
  });

  const incomeByCategory: CategoryMap = {};
  const expensesByCategory: CategoryMap = {};
  let revenue = 0, expenses = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.account?.type === 'REVENUE') {
        revenue += processRevenueLine(line, incomeByCategory);
      } else if (line.account?.type === 'EXPENSE') {
        expenses += processExpenseLine(line, entry.reference, expenseCategoryMap, expensesByCategory);
      }
    }
  }

  return { revenue, expenses, incomeByCategory, expensesByCategory };
}

// Helper: Process a single transaction
function processTransaction(
  t: { id: string; type: string; amount: number | null; category: string | null },
  txWithJE: Set<string>,
  incomeByCategory: CategoryMap,
  expensesByCategory: CategoryMap
): { income: number; expense: number } {
  if (txWithJE.has(t.id)) return { income: 0, expense: 0 };
  
  const amount = t.amount || 0;
  if (t.type === 'INCOME') {
    addToCategory(incomeByCategory, t.category || 'Ingresos sin Categoría', amount);
    return { income: amount, expense: 0 };
  }
  if (t.type === 'EXPENSE') {
    addToCategory(expensesByCategory, t.category || 'Gastos sin Categoría', amount);
    return { income: 0, expense: amount };
  }
  return { income: 0, expense: 0 };
}

// Helper function: Process legacy data
async function processLegacyData(
  companyId: string | null,
  startDate: Date,
  endDate: Date,
  incomeByCategory: CategoryMap,
  expensesByCategory: CategoryMap
) {
  const transactions = await prisma.transaction.findMany({
    where: { ...(companyId && { companyId }), date: { gte: startDate, lte: endDate }, status: 'COMPLETED' }
  });

  const journalRefs = await prisma.journalEntry.findMany({
    where: { ...(companyId && { companyId }), date: { gte: startDate, lte: endDate }, reference: { not: null } },
    select: { reference: true }
  });
  const references = journalRefs.map(je => je.reference).filter((r): r is string => r !== null);
  const txWithJE = new Set<string>(references);

  let legacyIncome = 0, legacyExpenses = 0;

  for (const t of transactions) {
    const { income, expense } = processTransaction(t, txWithJE, incomeByCategory, expensesByCategory);
    legacyIncome += income;
    legacyExpenses += expense;
  }

  const expenses = await prisma.expense.findMany({
    where: { ...(companyId && { companyId }), date: { gte: startDate, lte: endDate } },
    include: { category: true }
  });

  for (const exp of expenses) {
    if (txWithJE.has(exp.id)) continue;
    legacyExpenses += exp.amount || 0;
    const catName = (exp.category as any)?.name || exp.vendor || 'Otros Gastos';
    addToCategory(expensesByCategory, catName, exp.amount || 0);
  }

  return { legacyIncome, legacyExpenses };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const dataSource = searchParams.get('source') || 'both';
    
    const startDate = new Date(startDateStr || new Date().toISOString());
    const endDate = new Date(endDateStr || new Date().toISOString());
    endDate.setHours(23, 59, 59, 999);

    const expenseCategoryMap = await buildExpenseCategoryMap(companyId);
    const journalData = await processJournalEntries(companyId, startDate, endDate, expenseCategoryMap);
    
    let legacyIncome = 0, legacyExpenses = 0;
    if (dataSource === 'legacy' || dataSource === 'both') {
      const legacy = await processLegacyData(
        companyId, startDate, endDate, 
        journalData.incomeByCategory, journalData.expensesByCategory
      );
      legacyIncome = legacy.legacyIncome;
      legacyExpenses = legacy.legacyExpenses;
    }

    const includeLegacy = dataSource === 'legacy' || dataSource === 'both';
    const totalRevenue = journalData.revenue + (includeLegacy ? legacyIncome : 0);
    const totalExpenses = journalData.expenses + (includeLegacy ? legacyExpenses : 0);
    const netIncome = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const incomeStatement = {
      revenue: {
        operating: Object.values(journalData.incomeByCategory).filter(c => c.amount > 0).map(c => ({
          code: '', name: c.name, balance: c.amount
        })),
        nonOperating: [],
        total: totalRevenue
      },
      expenses: {
        operating: Object.values(journalData.expensesByCategory).filter(c => c.amount > 0).map(c => ({
          code: '', name: c.name, balance: c.amount
        })),
        nonOperating: [],
        costOfSales: [],
        total: totalExpenses
      },
      netIncome,
      netMargin,
      dataSource,
      sources: {
        journalEntries: { revenue: journalData.revenue, expenses: journalData.expenses },
        legacy: { income: legacyIncome, expenses: legacyExpenses }
      }
    };

    return NextResponse.json({ period: { startDate, endDate }, incomeStatement });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error generating income statement:', err.message);
    return NextResponse.json({ 
      error: 'Error al generar estado de resultados',
      details: err.message || 'Unknown error'
    }, { status: 500 });
  }
}

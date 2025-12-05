import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get recent expenses
  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      description: true,
      date: true,
      amount: true,
      companyId: true,
      createdAt: true,
    },
  });

  console.log('\n=== RECENT EXPENSES ===\n');
  expenses.forEach((e, i) => {
    console.log(`${i + 1}. ${e.description}`);
    console.log(`   Date: ${e.date.toISOString().split('T')[0]}`);
    console.log(`   Amount: $${e.amount}`);
    console.log(`   CompanyId: ${e.companyId || 'NULL'}`);
    console.log(`   Created: ${e.createdAt.toISOString()}`);
    console.log('');
  });

  // Check what "Este Mes" should filter
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  console.log(`\n=== "ESTE MES" DATE RANGE ===`);
  console.log(`Start: ${startOfMonth.toISOString()}`);
  console.log(`End: ${endOfMonth.toISOString()}`);

  // Find expenses that would match "Este Mes"
  const thisMonthExpenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  console.log(`\n=== EXPENSES IN "ESTE MES" ===`);
  console.log(`Count: ${thisMonthExpenses.length}`);
  thisMonthExpenses.forEach((e, i) => {
    console.log(`${i + 1}. ${e.description} - $${e.amount} (${e.date.toISOString().split('T')[0]})`);
  });

  await prisma.$disconnect();
}

main();

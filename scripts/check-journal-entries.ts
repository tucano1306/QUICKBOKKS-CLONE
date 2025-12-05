import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check "Este Mes" date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  console.log(`\n=== "Este Mes" (Dec 2025) ===`);
  console.log(`Start: ${startOfMonth.toISOString()}`);
  console.log(`End: ${endOfMonth.toISOString()}`);

  // Journal entries in "Este Mes" - matching income-statement logic
  const jeThisMonth = await prisma.journalEntry.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: 'POSTED',
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  console.log(`\nJournal entries in "Este Mes": ${jeThisMonth.length}`);
  
  let totalExpenses = 0;
  for (const entry of jeThisMonth) {
    for (const line of entry.lines) {
      if (line.account?.type === 'EXPENSE' && line.debit > 0) {
        console.log(`  - ${entry.description}: $${line.debit} (Date: ${entry.date.toISOString().split('T')[0]})`);
        totalExpenses += line.debit;
      }
    }
  }
  
  console.log(`\n=== TOTAL EXPENSES "Este Mes" ===`);
  console.log(`$${totalExpenses}`);

  // Verify the fixed journal entry
  const fixedJE = await prisma.journalEntry.findUnique({
    where: { id: 'cmit4fo61000312ut6391tmzg' }
  });
  console.log(`\n=== Verified Fixed Entry ===`);
  console.log(`"pago del vehiculo Suburban" now has date: ${fixedJE?.date.toISOString()}`);

  await prisma.$disconnect();
}

main();

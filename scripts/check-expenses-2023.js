const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExpenses2023() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2023-12-31T23:59:59.999');
  
  console.log('Checking expenses for 2023...');
  console.log('Start:', startDate.toISOString());
  console.log('End:', endDate.toISOString());
  
  const je = await prisma.journalEntry.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
      status: 'POSTED',
      lines: { some: { account: { type: 'EXPENSE' } } }
    },
    include: { lines: { include: { account: true } } }
  });
  
  console.log('\nJE in 2023 with expenses:', je.length);
  
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const j of je) {
    console.log('\n---', j.date.toISOString().slice(0,10), '|', j.description);
    for (const l of j.lines) {
      if (l.account?.type === 'EXPENSE') {
        totalDebit += l.debit || 0;
        totalCredit += l.credit || 0;
        console.log('  ', l.account.name, '| Debit:', l.debit, '| Credit:', l.credit);
      }
    }
  }
  
  console.log('\n========================================');
  console.log('TOTAL DEBIT (expenses):', totalDebit);
  console.log('TOTAL CREDIT (reversals):', totalCredit);
  console.log('NET EXPENSES 2023:', totalDebit - totalCredit);
  
  await prisma.$disconnect();
}

checkExpenses2023();

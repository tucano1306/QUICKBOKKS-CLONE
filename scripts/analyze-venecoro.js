const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeVenecoro() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  
  const jeWithExpenses = await prisma.journalEntry.findMany({
    where: { 
      companyId: companyId,
      status: 'POSTED',
      lines: { some: { account: { type: 'EXPENSE' } } }
    },
    include: { lines: { include: { account: true } } },
    orderBy: { date: 'asc' }
  });
  
  console.log('Journal Entries with expense accounts (POSTED only):\n');
  
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const je of jeWithExpenses) {
    console.log('----------------------------------------');
    console.log('JE ID:', je.id);
    console.log('Date:', je.date.toISOString().slice(0,10));
    console.log('Description:', je.description);
    console.log('Reference:', je.reference);
    console.log('Status:', je.status);
    
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE') {
        console.log('  EXPENSE Line:', line.account.name);
        console.log('    Debit:', line.debit, '| Credit:', line.credit);
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      }
    }
  }
  
  console.log('\n========================================');
  console.log('TOTALS for EXPENSE accounts:');
  console.log('  Total Debit:', totalDebit);
  console.log('  Total Credit:', totalCredit);
  console.log('  Net Expense (Debit - Credit):', totalDebit - totalCredit);
  
  await prisma.$disconnect();
}

analyzeVenecoro();

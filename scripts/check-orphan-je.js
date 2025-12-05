const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphanedJournalEntries() {
  const company = await prisma.company.findFirst();
  console.log('Company:', company?.id);
  
  // Contar expenses
  const expenses = await prisma.expense.count({ where: { companyId: company?.id } });
  console.log('Expenses count:', expenses);
  
  // Buscar journal entries con cuentas de gastos
  const jeWithExpenses = await prisma.journalEntry.findMany({
    where: { 
      companyId: company?.id,
      lines: {
        some: {
          account: { type: 'EXPENSE' }
        }
      }
    },
    include: {
      lines: { include: { account: true } }
    }
  });
  
  console.log('\nJournal Entries with expense accounts:', jeWithExpenses.length);
  
  let totalExpenseAmount = 0;
  
  for (const je of jeWithExpenses) {
    console.log('\nJE:', je.id);
    console.log('  Date:', je.date.toISOString().slice(0,10));
    console.log('  Description:', je.description);
    console.log('  Reference:', je.reference);
    
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE') {
        console.log('  EXPENSE:', line.account.name, '| Debit:', line.debit);
        totalExpenseAmount += line.debit || 0;
      }
    }
  }
  
  console.log('\n===================');
  console.log('Total expense amount in JE:', totalExpenseAmount);
  
  await prisma.$disconnect();
}

checkOrphanedJournalEntries();

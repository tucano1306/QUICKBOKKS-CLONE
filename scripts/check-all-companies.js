const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllCompanies() {
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
    console.log('\n========================================');
    console.log('Company:', company.name, '| ID:', company.id);
    
    // Expenses
    const expenses = await prisma.expense.count({ where: { companyId: company.id } });
    const expenseTotal = await prisma.expense.aggregate({ 
      where: { companyId: company.id },
      _sum: { amount: true }
    });
    console.log('  Expenses:', expenses, '| Total:', expenseTotal._sum.amount || 0);
    
    // Transactions
    const transactions = await prisma.transaction.count({ where: { companyId: company.id } });
    console.log('  Transactions:', transactions);
    
    // Journal Entries
    const jeCount = await prisma.journalEntry.count({ where: { companyId: company.id } });
    console.log('  Journal Entries:', jeCount);
    
    // JE with expense accounts
    const jeExpenses = await prisma.journalEntry.findMany({
      where: { 
        companyId: company.id,
        lines: { some: { account: { type: 'EXPENSE' } } }
      },
      include: { lines: { include: { account: true } } }
    });
    
    let expenseFromJE = 0;
    for (const je of jeExpenses) {
      for (const line of je.lines) {
        if (line.account?.type === 'EXPENSE') {
          expenseFromJE += line.debit || 0;
        }
      }
    }
    console.log('  Expense amount from JE:', expenseFromJE);
    
    // List JE with expenses
    if (jeExpenses.length > 0) {
      console.log('  --- JE with expenses: ---');
      for (const je of jeExpenses) {
        console.log('    ', je.date.toISOString().slice(0,10), '|', je.description, '| ref:', je.reference);
      }
    }
  }
  
  await prisma.$disconnect();
}

checkAllCompanies();

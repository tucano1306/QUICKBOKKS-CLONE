import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  
  console.log('=== CATEGORIAS DE GASTOS ===');
  const cats = await prisma.expenseCategory.findMany({ where: { companyId } });
  cats.forEach(c => console.log(c.id.slice(-8), '-', c.name));
  
  console.log('\n=== CUENTAS TIPO EXPENSE ===');
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { type: 'EXPENSE', OR: [{ companyId }, { companyId: null }] }
  });
  accounts.forEach(a => console.log(a.code, '-', a.name));
  
  console.log('\n=== MUESTRA DE EXPENSES CON CATEGORIA ===');
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    include: { category: true },
    take: 15
  });
  expenses.forEach(e => {
    console.log(e.description?.slice(0, 30) || e.vendor?.slice(0, 30), '| Cat:', e.category?.name, '| $' + e.amount);
  });
  
  await prisma.$disconnect();
}

check().catch(console.error); // NOSONAR

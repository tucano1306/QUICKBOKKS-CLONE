const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Obtener todas las empresas
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  });
  console.log('=== EMPRESAS ===');
  companies.forEach(c => console.log(c.id, '-', c.name));
  
  // Verificar Leonardo específicamente
  const leonardoId = 'cmk6gn8f60001hps2qgnsamx0';
  console.log('\n=== VERIFICACION DETALLADA LEONARDO ===');
  const leonardoTx = await prisma.transaction.findMany({
    where: { companyId: leonardoId },
    orderBy: { date: 'desc' }
  });
  console.log('Total transacciones en Leonardo:', leonardoTx.length);
  console.log('Detalle de TODAS las transacciones de Leonardo:');
  leonardoTx.forEach((t, i) => {
    console.log(`${i+1}. ${t.type} | ${t.description || t.category} | $${t.amount} | ${t.date.toISOString().split('T')[0]}`);
  });
  
  // Contar transacciones por empresa
  console.log('\n=== TRANSACCIONES POR EMPRESA ===');
  for (const company of companies) {
    const count = await prisma.transaction.count({
      where: { companyId: company.id }
    });
    const incomeCount = await prisma.transaction.count({
      where: { companyId: company.id, type: 'INCOME' }
    });
    const expenseCount = await prisma.transaction.count({
      where: { companyId: company.id, type: 'EXPENSE' }
    });
    console.log(`${company.name}: Total=${count}, Ingresos=${incomeCount}, Gastos=${expenseCount}`);
  }
  
  // Muestra algunos ingresos de cada empresa para verificar
  console.log('\n=== ULTIMOS 5 INGRESOS POR EMPRESA ===');
  for (const company of companies) {
    const incomes = await prisma.transaction.findMany({
      where: { companyId: company.id, type: 'INCOME' },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, description: true, amount: true, date: true, category: true }
    });
    if (incomes.length > 0) {
      console.log(`\n${company.name}:`);
      incomes.forEach(i => console.log(`  - ${i.description || i.category} | $${i.amount} | ${i.date.toISOString().split('T')[0]}`));
    }
  }
  
  await prisma.$disconnect();
}
check();

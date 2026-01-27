const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar la transacción específica de servicios
    const trans = await prisma.transaction.findMany({
      where: {
        description: { contains: 'servicios', mode: 'insensitive' }
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        companyId: true,
        type: true
      }
    });
    
    console.log('=== Transacciones con "servicios" ===');
    console.log(JSON.stringify(trans, null, 2));
    
    // Ver todas las empresas
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });
    console.log('\n=== Empresas ===');
    console.log(JSON.stringify(companies, null, 2));
    
    // Transacciones sin companyId
    const noCompany = await prisma.transaction.count({
      where: { companyId: null }
    });
    console.log('\n=== Transacciones sin companyId ===');
    console.log('Total:', noCompany);
    
    // Transacciones de enero 2024
    const enero2024 = await prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date('2024-01-01'),
          lt: new Date('2024-02-01')
        }
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        companyId: true,
        type: true
      }
    });
    console.log('\n=== Transacciones de Enero 2024 ===');
    console.log(JSON.stringify(enero2024, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = 'cmis3j65t000712d2bx4izgfy';

async function main() {
  console.log('📋 Cuentas existentes en el catálogo:\n');
  
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { 
      OR: [
        { companyId: COMPANY_ID },
        { companyId: null }
      ]
    },
    orderBy: { code: 'asc' }
  });
  
  if (accounts.length === 0) {
    console.log('❌ No hay cuentas en el catálogo');
    console.log('   Ejecuta: npx prisma db seed para crear las cuentas base');
  } else {
    console.log(`Total: ${accounts.length} cuentas\n`);
    accounts.forEach(a => {
      console.log(`${a.code.padEnd(8)} | ${a.type.padEnd(12)} | ${a.name}`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

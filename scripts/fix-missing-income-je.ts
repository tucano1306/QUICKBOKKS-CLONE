import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingIncomeJE() {
  console.log('\n🔧 CREANDO JOURNAL ENTRY PARA INGRESO FALTANTE\n');
  console.log('='.repeat(60));
  
  // Buscar el ingreso de $3,374.68
  const incomeTransaction = await prisma.transaction.findFirst({
    where: {
      type: 'INCOME',
      amount: {
        gte: 3374,
        lte: 3375
      }
    }
  });
  
  if (!incomeTransaction) {
    console.log('❌ No se encontró la transacción de ingreso');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📋 Transacción encontrada:');
  console.log(`   ID: ${incomeTransaction.id}`);
  console.log(`   Descripción: ${incomeTransaction.description}`);
  console.log(`   Monto: $${incomeTransaction.amount}`);
  console.log(`   Fecha: ${incomeTransaction.date.toISOString().split('T')[0]}`);
  
  // Buscar cuentas necesarias
  const revenueAccount = await prisma.chartOfAccounts.findFirst({
    where: { type: 'REVENUE' }
  });
  
  const cashAccount = await prisma.chartOfAccounts.findFirst({
    where: { type: 'ASSET' }
  });
  
  if (!revenueAccount || !cashAccount) {
    console.log('❌ No se encontraron las cuentas necesarias');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n   Cuenta Revenue: ${revenueAccount.name} (${revenueAccount.id})`);
  console.log(`   Cuenta Asset: ${cashAccount.name} (${cashAccount.id})`);
  
  // Crear Journal Entry
  const je = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-INC-${Date.now()}`,
      date: incomeTransaction.date,
      description: `Ingreso: ${incomeTransaction.description}`,
      status: 'POSTED',
      createdBy: 'system',
      companyId: incomeTransaction.companyId,
      lines: {
        create: [
          {
            lineNumber: 1,
            accountId: cashAccount.id,
            description: incomeTransaction.description,
            debit: incomeTransaction.amount,
            credit: 0
          },
          {
            lineNumber: 2,
            accountId: revenueAccount.id,
            description: incomeTransaction.description,
            debit: 0,
            credit: incomeTransaction.amount
          }
        ]
      }
    },
    include: {
      lines: {
        include: { account: true }
      }
    }
  });
  
  console.log('\n✅ Journal Entry creado:');
  console.log(`   Entry Number: ${je.entryNumber}`);
  console.log(`   Fecha: ${je.date.toISOString().split('T')[0]}`);
  console.log(`   Status: ${je.status}`);
  console.log(`   Líneas:`);
  for (const line of je.lines) {
    console.log(`      - ${line.account?.name}: D=$${line.debit} C=$${line.credit}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Ahora el ingreso debería aparecer en el P&L de Junio 2023');
  
  await prisma.$disconnect();
}

createMissingIncomeJE().catch(console.error);

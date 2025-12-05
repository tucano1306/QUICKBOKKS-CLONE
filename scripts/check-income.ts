import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIncomeTransactions() {
  console.log('\n🔍 BUSCANDO TRANSACCIONES DE INGRESO\n');
  console.log('='.repeat(60));
  
  // 1. Buscar transacciones de tipo INCOME
  const incomeTransactions = await prisma.transaction.findMany({
    where: { type: 'INCOME' },
    orderBy: { date: 'desc' }
  });
  
  console.log(`\n📋 Transacciones INCOME encontradas: ${incomeTransactions.length}\n`);
  
  for (const t of incomeTransactions) {
    console.log(`ID: ${t.id}`);
    console.log(`Descripción: ${t.description}`);
    console.log(`Monto: $${t.amount}`);
    console.log(`Fecha: ${t.date.toISOString().split('T')[0]}`);
    console.log(`Status: ${t.status}`);
    console.log('---');
  }
  
  // 2. Buscar el ingreso específico de $3,374.68
  console.log('\n📋 Buscando ingreso de ~$3,374.68...');
  
  const specificIncome = await prisma.transaction.findMany({
    where: {
      amount: {
        gte: 3370,
        lte: 3380
      }
    }
  });
  
  if (specificIncome.length > 0) {
    console.log('\n✅ Encontrado:');
    for (const t of specificIncome) {
      console.log(`   ID: ${t.id}`);
      console.log(`   Descripción: ${t.description}`);
      console.log(`   Monto: $${t.amount}`);
      console.log(`   Fecha: ${t.date.toISOString().split('T')[0]}`);
      console.log(`   Tipo: ${t.type}`);
      console.log(`   Status: ${t.status}`);
    }
  } else {
    console.log('   ❌ No encontrado en transactions');
  }
  
  // 3. Buscar journal entries de junio 2023
  console.log('\n📋 Journal Entries de Junio 2023:');
  
  const jesJune2023 = await prisma.journalEntry.findMany({
    where: {
      date: {
        gte: new Date('2023-06-01'),
        lte: new Date('2023-06-30')
      }
    },
    include: {
      lines: {
        include: { account: true }
      }
    }
  });
  
  console.log(`\n   Total JEs en Jun 2023: ${jesJune2023.length}`);
  
  for (const je of jesJune2023) {
    console.log(`\n   JE: ${je.entryNumber}`);
    console.log(`   Fecha: ${je.date.toISOString().split('T')[0]}`);
    console.log(`   Descripción: ${je.description}`);
    console.log(`   Status: ${je.status}`);
    console.log(`   Líneas:`);
    for (const line of je.lines) {
      const accountType = line.account?.type || 'N/A';
      const accountName = line.account?.name || 'Sin cuenta';
      console.log(`      - ${accountName} (${accountType}): D=$${line.debit} C=$${line.credit}`);
    }
  }
  
  // 4. Buscar TODOS los journal entries con cuentas REVENUE
  console.log('\n\n📋 TODOS los Journal Entries con cuentas REVENUE:');
  
  const allJEs = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: { account: true }
      }
    }
  });
  
  let revenueJEs = 0;
  for (const je of allJEs) {
    const hasRevenue = je.lines.some(l => l.account?.type === 'REVENUE');
    if (hasRevenue) {
      revenueJEs++;
      console.log(`\n   JE: ${je.entryNumber} - ${je.date.toISOString().split('T')[0]}`);
      console.log(`   Descripción: ${je.description}`);
      console.log(`   Status: ${je.status}`);
      for (const line of je.lines) {
        if (line.account?.type === 'REVENUE') {
          console.log(`      💰 REVENUE: ${line.account.name} - C=$${line.credit}`);
        }
      }
    }
  }
  
  console.log(`\n   Total JEs con REVENUE: ${revenueJEs}`);
  
  // 5. Verificar cuentas tipo REVENUE
  console.log('\n📋 Cuentas tipo REVENUE en el sistema:');
  
  const revenueAccounts = await prisma.chartOfAccounts.findMany({
    where: { type: 'REVENUE' }
  });
  
  for (const acc of revenueAccounts) {
    console.log(`   - ${acc.code}: ${acc.name}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  await prisma.$disconnect();
}

checkIncomeTransactions().catch(console.error);

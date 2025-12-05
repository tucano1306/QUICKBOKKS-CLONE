const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixReversalDates() {
  const companyId = 'cmis3j65t000712d2bx4izgfy';
  
  // Buscar reversiones (tienen REV- en el reference)
  const reversals = await prisma.journalEntry.findMany({
    where: {
      companyId,
      reference: { startsWith: 'REV-' }
    }
  });
  
  console.log('Found', reversals.length, 'reversals');
  
  for (const rev of reversals) {
    console.log('\nReversal:', rev.id);
    console.log('  Current date:', rev.date.toISOString().slice(0,10));
    console.log('  Description:', rev.description);
    
    // Extraer el ID original del reference (ej: REV-JE-2025-000003 -> buscar por descripción)
    // Buscar el JE original que tiene la misma descripción pero sin "REVERSIÓN:"
    const originalDesc = rev.description.replace('REVERSIÓN: ', '').replace(' - Gasto eliminado', '');
    
    const original = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        description: originalDesc,
        reference: { not: { startsWith: 'REV-' } }
      }
    });
    
    if (original) {
      console.log('  Original JE found:', original.id);
      console.log('  Original date:', original.date.toISOString().slice(0,10));
      
      // Actualizar la reversión para que tenga la misma fecha que el original
      await prisma.journalEntry.update({
        where: { id: rev.id },
        data: { date: original.date }
      });
      
      console.log('  ✅ Updated reversal date to:', original.date.toISOString().slice(0,10));
    } else {
      console.log('  ⚠️ Original JE not found for:', originalDesc);
    }
  }
  
  console.log('\n========================================');
  console.log('Done! Running verification...');
  
  // Verificar
  const jeIn2023 = await prisma.journalEntry.findMany({
    where: {
      companyId,
      date: { gte: new Date('2023-01-01'), lte: new Date('2023-12-31T23:59:59.999') },
      status: 'POSTED',
      lines: { some: { account: { type: 'EXPENSE' } } }
    },
    include: { lines: { include: { account: true } } }
  });
  
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const j of jeIn2023) {
    for (const l of j.lines) {
      if (l.account?.type === 'EXPENSE') {
        totalDebit += l.debit || 0;
        totalCredit += l.credit || 0;
      }
    }
  }
  
  console.log('\nAfter fix - JE in 2023 with expenses:', jeIn2023.length);
  console.log('TOTAL DEBIT:', totalDebit);
  console.log('TOTAL CREDIT:', totalCredit);
  console.log('NET EXPENSES 2023:', totalDebit - totalCredit);
  
  await prisma.$disconnect();
}

fixReversalDates();

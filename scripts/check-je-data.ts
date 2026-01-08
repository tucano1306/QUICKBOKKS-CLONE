import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJournalEntries() {
  console.log('Checking journal entries...\n');
  
  const entries = await prisma.journalEntry.findMany({
    take: 10,
    include: { lines: true },
    orderBy: { createdAt: 'desc' }
  });
  
  let entriesWithZeroAmounts = 0;
  
  entries.forEach(e => {
    const totalDebit = e.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = e.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    
    console.log(`Entry: ${e.entryNumber}`);
    console.log(`  Description: ${e.description}`);
    console.log(`  Lines: ${e.lines.length}`);
    console.log(`  Total Debit: $${totalDebit.toFixed(2)}`);
    console.log(`  Total Credit: $${totalCredit.toFixed(2)}`);
    
    if (totalDebit === 0 && totalCredit === 0) {
      entriesWithZeroAmounts++;
      console.log('  ⚠️ ZERO AMOUNTS - needs fix');
    }
    
    e.lines.forEach((l, i) => {
      console.log(`    Line ${i + 1}: Debit=$${Number(l.debit).toFixed(2)}, Credit=$${Number(l.credit).toFixed(2)}`);
    });
    console.log('---');
  });
  
  console.log(`\nTotal entries checked: ${entries.length}`);
  console.log(`Entries with zero amounts: ${entriesWithZeroAmounts}`);
  
  await prisma.$disconnect();
}

checkJournalEntries().catch(console.error);

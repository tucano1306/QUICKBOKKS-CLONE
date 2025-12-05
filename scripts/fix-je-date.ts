import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fix the journal entry date
  const result = await prisma.journalEntry.update({
    where: { id: 'cmit4fo61000312ut6391tmzg' },
    data: { date: new Date('2023-06-05') }
  });

  console.log('✅ Fixed journal entry date!');
  console.log(`   Old date was: 2025-12-05`);
  console.log(`   New date: ${result.date.toISOString()}`);

  await prisma.$disconnect();
}

main();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteJournalEntries() {
  console.log('Eliminando asientos contables...\n');
  
  // Primero eliminar las líneas de asientos
  const deletedLines = await prisma.journalEntryLine.deleteMany({});
  console.log(`Líneas de asientos eliminadas: ${deletedLines.count}`);
  
  // Luego eliminar los asientos
  const deleted = await prisma.journalEntry.deleteMany({});
  console.log(`Asientos contables eliminados: ${deleted.count}`);
  
  console.log('\n✅ Todos los asientos contables han sido eliminados');
  
  await prisma.$disconnect();
}

deleteJournalEntries().catch(console.error);

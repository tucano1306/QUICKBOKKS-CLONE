import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const startDate = new Date('2023-01-06');
  const endDate = new Date('2023-06-30');
  endDate.setHours(23, 59, 59, 999);

  console.log('\n=== GASTOS EN PERÍODO 2023-01-06 → 2023-06-30 ===\n');

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    },
    orderBy: { date: 'asc' }
  });

  for (const exp of expenses) {
    const je = await prisma.journalEntry.findFirst({
      where: { reference: exp.id }
    });
    
    console.log(`${exp.date.toISOString().split('T')[0]} - ${exp.description}: $${exp.amount}`);
    console.log(`   ${je ? '✅ Tiene Journal Entry' : '❌ SIN Journal Entry'}`);
    console.log('');
  }

  // Crear journal entry para el gasto que no tiene
  const expWithoutJE = expenses.filter(async (e) => {
    const je = await prisma.journalEntry.findFirst({ where: { reference: e.id } });
    return !je;
  });

  // Buscar gastos sin JE
  console.log('\n=== CREANDO JOURNAL ENTRIES FALTANTES ===\n');
  
  for (const exp of expenses) {
    const existingJE = await prisma.journalEntry.findFirst({
      where: { reference: exp.id }
    });

    if (!existingJE) {
      console.log(`Creando JE para: ${exp.description}`);
      
      // Buscar cuenta de gastos
      const expenseAccount = await prisma.chartOfAccounts.findFirst({
        where: { 
          companyId: exp.companyId!,
          type: 'EXPENSE',
          isActive: true 
        }
      });

      // Buscar cuenta de efectivo
      const cashAccount = await prisma.chartOfAccounts.findFirst({
        where: { 
          companyId: exp.companyId!,
          code: '1100',
          isActive: true 
        }
      });

      if (expenseAccount && cashAccount) {
        const entryNumber = `JE-EXP-${Date.now()}`;
        
        await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: exp.date,
            description: `Gasto: ${exp.description}`,
            reference: exp.id,
            companyId: exp.companyId!,
            createdBy: exp.userId,
            status: 'POSTED',
            lines: {
              create: [
                {
                  accountId: expenseAccount.id,
                  debit: exp.amount,
                  credit: 0,
                  description: exp.description,
                  lineNumber: 1
                },
                {
                  accountId: cashAccount.id,
                  debit: 0,
                  credit: exp.amount,
                  description: 'Pago de gasto',
                  lineNumber: 2
                }
              ]
            }
          }
        });
        
        console.log(`   ✅ Journal Entry creado para ${exp.description}`);
      } else {
        console.log(`   ❌ No se encontraron cuentas necesarias`);
      }
    }
  }

  console.log('\n=== VERIFICACIÓN FINAL ===\n');
  
  // Recalcular totales
  const jeInPeriod = await prisma.journalEntry.findMany({
    where: {
      status: 'POSTED',
      date: { gte: startDate, lte: endDate }
    },
    include: {
      lines: {
        include: { account: true }
      }
    }
  });

  let totalExpenses = 0;
  let totalRevenue = 0;

  for (const je of jeInPeriod) {
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE' && line.debit > 0) {
        totalExpenses += line.debit;
      }
      if (line.account?.type === 'REVENUE' && line.credit > 0) {
        totalRevenue += line.credit;
      }
    }
  }

  console.log(`Total Ingresos: $${totalRevenue.toFixed(2)}`);
  console.log(`Total Gastos: $${totalExpenses.toFixed(2)}`);
  console.log(`Utilidad: $${(totalRevenue - totalExpenses).toFixed(2)}`);

  await prisma.$disconnect();
}

main();

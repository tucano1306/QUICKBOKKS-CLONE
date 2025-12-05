/**
 * Script para arreglar datos faltantes y vincular JEs correctamente
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixData() {
  const companyId = 'cmis3j65t000712d2bx4izgfy'; // Venecoro
  
  console.log('='.repeat(60));
  console.log('ARREGLANDO DATOS DE P&L');
  console.log('='.repeat(60));

  // 1. Encontrar el JE del ingreso de $3,374.68 y vincularlo con la transacción
  console.log('\n1️⃣ Buscando JE del ingreso $3,374.68...');
  
  const incomeJELine = await prisma.journalEntryLine.findFirst({
    where: {
      credit: 3374.68,
      journalEntry: { companyId }
    },
    include: { journalEntry: true }
  });
  
  if (incomeJELine) {
    console.log(`   Encontrado JE: ${incomeJELine.journalEntry.entryNumber}`);
    console.log(`   Reference actual: ${incomeJELine.journalEntry.reference || 'NULL'}`);
    
    // Buscar la transacción correspondiente
    const incomeTx = await prisma.transaction.findFirst({
      where: {
        companyId,
        type: 'INCOME',
        amount: 3374.68
      }
    });
    
    if (incomeTx) {
      console.log(`   Transacción encontrada: ${incomeTx.id}`);
      
      // Actualizar el JE con la referencia correcta
      await prisma.journalEntry.update({
        where: { id: incomeJELine.journalEntry.id },
        data: { reference: incomeTx.id }
      });
      console.log(`   ✅ JE actualizado con reference: ${incomeTx.id}`);
    }
  }

  // 2. Crear JE para el gasto de $4,202.80 (Salarios Choferes - pago a Cesar driver)
  console.log('\n2️⃣ Buscando gasto sin JE ($4,202.80)...');
  
  const expenseWithoutJE = await prisma.expense.findFirst({
    where: {
      companyId,
      amount: 4202.80
    },
    include: { category: true }
  });
  
  if (expenseWithoutJE) {
    console.log(`   Gasto encontrado: ${expenseWithoutJE.description}`);
    console.log(`   Fecha: ${expenseWithoutJE.date.toISOString().split('T')[0]}`);
    
    // Verificar si ya tiene JE
    const existingJE = await prisma.journalEntry.findFirst({
      where: { reference: expenseWithoutJE.id }
    });
    
    if (existingJE) {
      console.log(`   ⚠️ Ya tiene JE: ${existingJE.entryNumber}`);
    } else {
      // Buscar cuentas
      const cashAccount = await prisma.chartOfAccounts.findFirst({
        where: { code: '1000', OR: [{ companyId }, { companyId: null }] }
      });
      
      const expenseAccount = await prisma.chartOfAccounts.findFirst({
        where: { 
          type: 'EXPENSE',
          OR: [{ companyId }, { companyId: null }],
          name: { contains: 'Salarios' }
        }
      }) || await prisma.chartOfAccounts.findFirst({
        where: { 
          type: 'EXPENSE',
          OR: [{ companyId }, { companyId: null }]
        }
      });
      
      if (!cashAccount || !expenseAccount) {
        console.log('   ❌ No se encontraron las cuentas necesarias');
        console.log(`   Cash: ${cashAccount?.id}, Expense: ${expenseAccount?.id}`);
      } else {
        // Contar JEs existentes para generar número
        const jeCount = await prisma.journalEntry.count({ where: { companyId } });
        const entryNumber = `JE-EXP-${Date.now()}`;
        
        const newJE = await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: expenseWithoutJE.date,
            description: `Gasto: ${expenseWithoutJE.description}`,
            reference: expenseWithoutJE.id,
            companyId,
            createdBy: 'system-fix',
            status: 'POSTED',
            lines: {
              create: [
                {
                  accountId: expenseAccount.id,
                  debit: 4202.80,
                  credit: 0,
                  description: expenseWithoutJE.description || 'Salarios Choferes',
                  lineNumber: 1
                },
                {
                  accountId: cashAccount.id,
                  debit: 0,
                  credit: 4202.80,
                  description: expenseWithoutJE.description || 'Salarios Choferes',
                  lineNumber: 2
                }
              ]
            }
          }
        });
        
        console.log(`   ✅ Journal Entry creado: ${newJE.entryNumber}`);
      }
    }
  } else {
    console.log('   No se encontró el gasto de $4,202.80');
  }

  // 3. Verificar estado final
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICACIÓN FINAL');
  console.log('='.repeat(60));
  
  // Transacciones sin JE
  const allJERefs = await prisma.journalEntry.findMany({
    where: { companyId, reference: { not: null } },
    select: { reference: true }
  });
  const jeRefSet = new Set(allJERefs.map(j => j.reference));
  
  const txWithoutJE = await prisma.transaction.findMany({
    where: { companyId, status: 'COMPLETED' }
  });
  
  console.log('\nTransacciones:');
  for (const tx of txWithoutJE) {
    const hasJE = jeRefSet.has(tx.id);
    console.log(`  ${tx.type} $${tx.amount} - ${hasJE ? '✓ JE' : '⚠ SIN JE'}`);
  }
  
  const expWithoutJE = await prisma.expense.findMany({
    where: { companyId }
  });
  
  console.log('\nExpenses:');
  for (const exp of expWithoutJE) {
    const hasJE = jeRefSet.has(exp.id);
    console.log(`  $${exp.amount} ${exp.description} - ${hasJE ? '✓ JE' : '⚠ SIN JE'}`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Proceso completado');
}

fixData().catch(console.error);

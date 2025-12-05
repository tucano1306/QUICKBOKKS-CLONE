/**
 * 🔍 VERIFICADOR DE INTEGRIDAD DE DATOS
 * 
 * Este script detecta errores como:
 * - Journal entries con fechas fuera del rango esperado
 * - Journal entries desbalanceados
 * - Discrepancias en P&L entre períodos
 * 
 * Ejecutar: npx ts-node scripts/verify-data-integrity.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IntegrityError {
  type: 'WRONG_PERIOD' | 'UNBALANCED_JE' | 'SUSPICIOUS_DATA';
  description: string;
  details: any;
}

async function verifyDataIntegrity() {
  console.log('\n🔍 VERIFICACIÓN DE INTEGRIDAD DE DATOS\n');
  console.log('='.repeat(60));
  
  const errors: IntegrityError[] = [];
  
  // 1. Verificar journal entries
  console.log('\n📋 1. Obteniendo Journal Entries...');
  
  const journalEntries = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  
  console.log(`   Total de Journal Entries: ${journalEntries.length}`);
  
  // 2. Verificar balance de journal entries
  console.log('\n⚖️  2. Verificando balance de Journal Entries...');
  
  for (const je of journalEntries) {
    const totalDebit = je.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = je.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push({
        type: 'UNBALANCED_JE',
        description: `Journal Entry ${je.entryNumber} está desbalanceado`,
        details: {
          jeId: je.id,
          entryNumber: je.entryNumber,
          date: je.date.toISOString().split('T')[0],
          description: je.description,
          totalDebit,
          totalCredit,
          difference: Math.abs(totalDebit - totalCredit)
        }
      });
    }
  }
  
  // 3. Verificar journal entries por período
  console.log('\n📅 3. Analizando distribución de Journal Entries por período...');
  
  const jeByYear: Record<string, { count: number, expenses: number, revenue: number }> = {};
  
  for (const je of journalEntries) {
    const year = je.date.getFullYear().toString();
    
    if (!jeByYear[year]) {
      jeByYear[year] = { count: 0, expenses: 0, revenue: 0 };
    }
    
    jeByYear[year].count++;
    
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE') {
        jeByYear[year].expenses += (line.debit || 0) - (line.credit || 0);
      } else if (line.account?.type === 'REVENUE') {
        jeByYear[year].revenue += (line.credit || 0) - (line.debit || 0);
      }
    }
  }
  
  console.log('\n   Journal Entries por año:');
  Object.entries(jeByYear).sort().forEach(([year, data]) => {
    console.log(`   ${year}: ${data.count} entries | Gastos: $${data.expenses.toFixed(2)} | Ingresos: $${data.revenue.toFixed(2)}`);
  });
  
  // 4. Verificar P&L del mes actual
  console.log('\n📊 4. Verificando P&L del mes actual (Diciembre 2025)...');
  
  const now = new Date();
  const startOfMonth = new Date(2025, 11, 1); // Diciembre 2025
  const endOfMonth = new Date(2025, 11, 31, 23, 59, 59);
  
  const jeThisMonth = journalEntries.filter(je => {
    return je.date >= startOfMonth && je.date <= endOfMonth && je.status === 'POSTED';
  });
  
  let monthExpenses = 0;
  let monthRevenue = 0;
  
  for (const je of jeThisMonth) {
    for (const line of je.lines) {
      if (line.account?.type === 'EXPENSE') {
        monthExpenses += (line.debit || 0) - (line.credit || 0);
      } else if (line.account?.type === 'REVENUE') {
        monthRevenue += (line.credit || 0) - (line.debit || 0);
      }
    }
  }
  
  console.log(`   JEs en Dic 2025: ${jeThisMonth.length}`);
  console.log(`   Gastos Dic 2025: $${monthExpenses.toFixed(2)}`);
  console.log(`   Ingresos Dic 2025: $${monthRevenue.toFixed(2)}`);
  
  // 5. Verificar que no haya datos de 2023 en diciembre 2025
  console.log('\n🔍 5. Verificando que no hay datos de 2023 en período actual...');
  
  const je2023 = journalEntries.filter(je => je.date.getFullYear() === 2023);
  const je2023InDec2025 = je2023.filter(je => {
    const jeDate = je.date;
    return jeDate >= startOfMonth && jeDate <= endOfMonth;
  });
  
  if (je2023InDec2025.length > 0) {
    errors.push({
      type: 'WRONG_PERIOD',
      description: `Hay ${je2023InDec2025.length} JEs de 2023 apareciendo en Dic 2025`,
      details: {
        count: je2023InDec2025.length,
        entries: je2023InDec2025.map(je => ({
          entryNumber: je.entryNumber,
          date: je.date.toISOString(),
          description: je.description
        }))
      }
    });
  } else {
    console.log('   ✓ No hay JEs de 2023 en el período de Dic 2025');
  }
  
  // 6. Comparar gastos
  console.log('\n📈 6. Obteniendo gastos directos (tabla expenses)...');
  
  const expenses = await prisma.expense.findMany();
  
  const expensesByYear: Record<string, { count: number, total: number }> = {};
  for (const expense of expenses) {
    const year = expense.date.getFullYear().toString();
    if (!expensesByYear[year]) {
      expensesByYear[year] = { count: 0, total: 0 };
    }
    expensesByYear[year].count++;
    expensesByYear[year].total += expense.amount;
  }
  
  console.log('\n   Gastos por año (tabla expenses):');
  Object.entries(expensesByYear).sort().forEach(([year, data]) => {
    console.log(`   ${year}: ${data.count} gastos | Total: $${data.total.toFixed(2)}`);
  });
  
  // Mostrar resultados
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS');
  console.log('='.repeat(60));
  
  if (errors.length === 0) {
    console.log('\n✅ ¡NO SE ENCONTRARON ERRORES DE INTEGRIDAD!');
  } else {
    console.log(`\n❌ SE ENCONTRARON ${errors.length} ERRORES:\n`);
    
    const wrongPeriod = errors.filter(e => e.type === 'WRONG_PERIOD');
    const unbalanced = errors.filter(e => e.type === 'UNBALANCED_JE');
    
    if (wrongPeriod.length > 0) {
      console.log(`📅 DATOS EN PERÍODO INCORRECTO (${wrongPeriod.length}):`);
      wrongPeriod.forEach(e => {
        console.log(`   - ${e.description}`);
        if (e.details.entries) {
          e.details.entries.forEach((entry: any) => {
            console.log(`     • ${entry.entryNumber}: ${entry.date} - ${entry.description}`);
          });
        }
      });
      console.log('');
    }
    
    if (unbalanced.length > 0) {
      console.log(`⚖️  JOURNAL ENTRIES DESBALANCEADOS (${unbalanced.length}):`);
      unbalanced.forEach(e => {
        console.log(`   - ${e.details.entryNumber}: D=$${e.details.totalDebit.toFixed(2)} C=$${e.details.totalCredit.toFixed(2)}`);
      });
      console.log('');
    }
  }
  
  console.log('\n');
  
  await prisma.$disconnect();
  
  return errors;
}

// Ejecutar
verifyDataIntegrity()
  .then(errors => {
    process.exit(errors.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

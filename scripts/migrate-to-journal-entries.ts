/**
 * MIGRACIÓN: Crear asientos contables para datos existentes
 * 
 * Ejecutar: npx tsx scripts/migrate-to-journal-entries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = process.argv[2] || 'cmis3j65t000712d2bx4izgfy';
const CREATED_BY = 'system-migration';

// Códigos de cuentas (deben existir en el catálogo)
const ACCOUNTS = {
  CASH: '1000',
  BANK: '1100',
  ACCOUNTS_RECEIVABLE: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_REVENUE: '4000',
  OTHER_INCOME: '4900',
  OPERATING_EXPENSES: '5000',
  SALARIES_EXPENSE: '5100',
  RENT_EXPENSE: '5200',
  UTILITIES_EXPENSE: '5300',
  OTHER_EXPENSES: '5900',
};

async function getAccountId(code: string): Promise<string | null> {
  const account = await prisma.chartOfAccounts.findFirst({
    where: { 
      code,
      OR: [
        { companyId: COMPANY_ID },
        { companyId: null }
      ]
    }
  });
  return account?.id || null;
}

async function generateEntryNumber(): Promise<string> {
  const count = await prisma.journalEntry.count({
    where: { companyId: COMPANY_ID }
  });
  const year = new Date().getFullYear();
  return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function createJournalEntry(
  date: Date,
  description: string,
  lines: { accountCode: string; debit: number; credit: number; description: string }[],
  reference?: string
) {
  // Validar partida doble
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Asiento desbalanceado: Débitos ($${totalDebit}) != Créditos ($${totalCredit})`);
  }
  
  // Obtener IDs de cuentas
  const linesWithIds = await Promise.all(
    lines.map(async (line, index) => {
      const accountId = await getAccountId(line.accountCode);
      if (!accountId) {
        throw new Error(`Cuenta no encontrada: ${line.accountCode}`);
      }
      return {
        accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        lineNumber: index + 1
      };
    })
  );
  
  const entryNumber = await generateEntryNumber();
  
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date,
      description,
      reference,
      companyId: COMPANY_ID,
      createdBy: CREATED_BY,
      status: 'POSTED',
      lines: {
        create: linesWithIds
      }
    },
    include: { lines: true }
  });
  
  return entry;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 MIGRACIÓN: CREAR ASIENTOS CONTABLES');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log('═'.repeat(60));
  
  // Verificar cuentas necesarias
  console.log('\n📋 Verificando cuentas necesarias...');
  const requiredAccounts = Object.entries(ACCOUNTS);
  let missingAccounts: string[] = [];
  
  for (const [name, code] of requiredAccounts) {
    const account = await getAccountId(code);
    if (!account) {
      missingAccounts.push(`${code} - ${name}`);
    }
  }
  
  if (missingAccounts.length > 0) {
    console.log('\n❌ CUENTAS FALTANTES:');
    missingAccounts.forEach(acc => console.log(`   - ${acc}`));
    console.log('\nEjecuta primero: npx tsx scripts/seed-chart-of-accounts.ts');
    await prisma.$disconnect();
    process.exit(1);
  }
  
  console.log('✅ Todas las cuentas necesarias existen\n');
  
  let created = 0;
  let errors = 0;
  
  // ============================================
  // 1. MIGRAR TRANSACCIONES
  // ============================================
  console.log('💰 Migrando transacciones...\n');
  
  const transactions = await prisma.transaction.findMany({
    where: { companyId: COMPANY_ID }
  });
  
  for (const tx of transactions) {
    try {
      const amount = Number(tx.amount);
      const desc = tx.description || tx.category || 'Transacción';
      
      if (tx.type === 'INCOME') {
        // Ingreso: Débito Caja, Crédito Ingresos
        await createJournalEntry(
          tx.date,
          `Ingreso: ${desc}`,
          [
            { accountCode: ACCOUNTS.CASH, debit: amount, credit: 0, description: 'Entrada de efectivo' },
            { accountCode: ACCOUNTS.OTHER_INCOME, debit: 0, credit: amount, description: desc }
          ],
          tx.id
        );
        console.log(`✅ Ingreso: $${amount.toFixed(2)} - ${desc}`);
        created++;
        
      } else if (tx.type === 'EXPENSE') {
        // Gasto: Débito Gastos, Crédito Caja
        await createJournalEntry(
          tx.date,
          `Gasto: ${desc}`,
          [
            { accountCode: ACCOUNTS.OTHER_EXPENSES, debit: amount, credit: 0, description: desc },
            { accountCode: ACCOUNTS.CASH, debit: 0, credit: amount, description: 'Salida de efectivo' }
          ],
          tx.id
        );
        console.log(`✅ Gasto: $${amount.toFixed(2)} - ${desc}`);
        created++;
      }
    } catch (error: any) {
      console.log(`❌ Error en transacción ${tx.id}: ${error.message}`);
      errors++;
    }
  }
  
  // ============================================
  // 2. MIGRAR GASTOS (tabla expenses)
  // ============================================
  console.log('\n💸 Migrando gastos...\n');
  
  const expenses = await prisma.expense.findMany({
    where: { companyId: COMPANY_ID },
    include: { category: true }
  });
  
  for (const exp of expenses) {
    try {
      const amount = Number(exp.amount);
      const desc = exp.description || 'Gasto';
      const category = exp.category?.name || 'General';
      
      // Mapear categoría a cuenta
      let expenseAccount = ACCOUNTS.OTHER_EXPENSES;
      if (category.toLowerCase().includes('salario') || category.toLowerCase().includes('payroll')) {
        expenseAccount = ACCOUNTS.SALARIES_EXPENSE;
      } else if (category.toLowerCase().includes('alquiler') || category.toLowerCase().includes('rent')) {
        expenseAccount = ACCOUNTS.RENT_EXPENSE;
      } else if (category.toLowerCase().includes('servicio') || category.toLowerCase().includes('utility')) {
        expenseAccount = ACCOUNTS.UTILITIES_EXPENSE;
      }
      
      await createJournalEntry(
        exp.date,
        `Gasto: ${desc} (${category})`,
        [
          { accountCode: expenseAccount, debit: amount, credit: 0, description: desc },
          { accountCode: ACCOUNTS.CASH, debit: 0, credit: amount, description: 'Pago de gasto' }
        ],
        exp.id
      );
      console.log(`✅ Gasto: $${amount.toFixed(2)} - ${desc} [${category}]`);
      created++;
      
    } catch (error: any) {
      console.log(`❌ Error en gasto ${exp.id}: ${error.message}`);
      errors++;
    }
  }
  
  // ============================================
  // 3. MIGRAR FACTURAS
  // ============================================
  console.log('\n🧾 Migrando facturas...\n');
  
  const invoices = await prisma.invoice.findMany({
    where: { companyId: COMPANY_ID },
    include: { customer: true }
  });
  
  for (const inv of invoices) {
    try {
      const amount = Number(inv.total);
      const customerName = inv.customer?.name || 'Cliente';
      
      // Asiento de emisión: Débito CxC, Crédito Ingresos
      await createJournalEntry(
        inv.issueDate,
        `Factura ${inv.invoiceNumber} - ${customerName}`,
        [
          { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: amount, credit: 0, description: `CxC - ${customerName}` },
          { accountCode: ACCOUNTS.SALES_REVENUE, debit: 0, credit: amount, description: `Venta - Factura ${inv.invoiceNumber}` }
        ],
        inv.id
      );
      console.log(`✅ Factura emitida: ${inv.invoiceNumber} - $${amount.toFixed(2)}`);
      created++;
      
      // Si está pagada, crear asiento de cobro
      if (inv.status === 'PAID' && inv.paidDate) {
        await createJournalEntry(
          inv.paidDate,
          `Cobro Factura ${inv.invoiceNumber} - ${customerName}`,
          [
            { accountCode: ACCOUNTS.BANK, debit: amount, credit: 0, description: `Depósito - Factura ${inv.invoiceNumber}` },
            { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, description: `Cobro - ${customerName}` }
          ],
          `${inv.id}-payment`
        );
        console.log(`✅ Cobro recibido: ${inv.invoiceNumber} - $${amount.toFixed(2)}`);
        created++;
      }
      
    } catch (error: any) {
      console.log(`❌ Error en factura ${inv.invoiceNumber}: ${error.message}`);
      errors++;
    }
  }
  
  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('═'.repeat(60));
  console.log(`✅ Asientos creados: ${created}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('═'.repeat(60));
  
  // Verificar balance
  const entries = await prisma.journalEntry.findMany({
    where: { companyId: COMPANY_ID },
    include: { lines: true }
  });
  
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const entry of entries) {
    for (const line of entry.lines) {
      totalDebits += Number(line.debit || 0);
      totalCredits += Number(line.credit || 0);
    }
  }
  
  console.log(`\n📊 Verificación de Partida Doble:`);
  console.log(`   Total Débitos:  $${totalDebits.toFixed(2)}`);
  console.log(`   Total Créditos: $${totalCredits.toFixed(2)}`);
  console.log(`   Diferencia:     $${Math.abs(totalDebits - totalCredits).toFixed(2)}`);
  
  if (Math.abs(totalDebits - totalCredits) < 0.01) {
    console.log(`   ✅ BALANCE CORRECTO`);
  } else {
    console.log(`   ❌ BALANCE INCORRECTO`);
  }
  
  console.log('\n');
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

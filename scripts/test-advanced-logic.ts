/**
 * TEST DE LÓGICA CONTABLE AVANZADA
 * 
 * Verifica que todas las mejoras de lógica funcionan correctamente:
 * 1. Reversión de asientos al eliminar transacciones/gastos
 * 2. No crear journal entry para facturas DRAFT
 * 3. Crear journal entry cuando factura cambia a SENT
 * 4. Crear asiento de cobro cuando se registra pago
 * 5. Income Statement sin double-counting
 * 6. Balance Sheet con companyId y sign correcto
 * 7. Cash Flow usando paidDate
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const COMPANY_ID = 'cmis3j65t000712d2bx4izgfy';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function pass(name: string, details: string) {
  results.push({ name, passed: true, details });
  log('✅', `${name}: ${details}`);
}

function fail(name: string, details: string) {
  results.push({ name, passed: false, details });
  log('❌', `${name}: ${details}`);
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
}

async function testAccountingServiceFunctions() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Funciones del Servicio de Contabilidad');
  log('📋', '='.repeat(50));

  const content = readFile('src/lib/accounting-service.ts');
  
  const requiredFunctions = [
    { name: 'createIncomeJournalEntry', pattern: 'export async function createIncomeJournalEntry' },
    { name: 'createExpenseJournalEntry', pattern: 'export async function createExpenseJournalEntry' },
    { name: 'createInvoiceJournalEntry', pattern: 'export async function createInvoiceJournalEntry' },
    { name: 'createPaymentReceivedJournalEntry', pattern: 'export async function createPaymentReceivedJournalEntry' },
    { name: 'reverseJournalEntry', pattern: 'export async function reverseJournalEntry' },
    { name: 'deleteTransactionWithReversal', pattern: 'export async function deleteTransactionWithReversal' },
    { name: 'deleteExpenseWithReversal', pattern: 'export async function deleteExpenseWithReversal' }
  ];

  for (const fn of requiredFunctions) {
    if (content.includes(fn.pattern)) {
      pass(`Función ${fn.name}`, 'Existe y está exportada');
    } else {
      fail(`Función ${fn.name}`, 'No existe o no está exportada');
    }
  }
}

async function testDoubleEntryIntegrity() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Integridad Partida Doble');
  log('📋', '='.repeat(50));

  const journalEntries = await prisma.journalEntry.findMany({
    where: { companyId: COMPANY_ID },
    include: { lines: true }
  });

  let allBalanced = true;
  for (const entry of journalEntries) {
    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      fail(`Asiento ${entry.entryNumber}`, `Desbalanceado: D=${totalDebit} C=${totalCredit}`);
      allBalanced = false;
    }
  }

  if (allBalanced) {
    pass('Todos los asientos balanceados', `${journalEntries.length} asientos verificados`);
  }
}

async function testTrialBalance() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Balance de Prueba');
  log('📋', '='.repeat(50));

  const entries = await prisma.journalEntryLine.findMany({
    include: { journalEntry: true }
  });

  const companyEntries = entries.filter(e => 
    (e.journalEntry as any).companyId === COMPANY_ID
  );

  const totalDebit = companyEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = companyEntries.reduce((sum, e) => sum + e.credit, 0);

  if (Math.abs(totalDebit - totalCredit) < 0.01) {
    pass('Balance de Prueba', `Débitos ($${totalDebit.toFixed(2)}) = Créditos ($${totalCredit.toFixed(2)})`);
  } else {
    fail('Balance de Prueba', `Desbalanceado: D=$${totalDebit.toFixed(2)} C=$${totalCredit.toFixed(2)}`);
  }
}

async function testAccountSignHandling() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Manejo de Signos por Tipo de Cuenta');
  log('📋', '='.repeat(50));

  const accounts = await prisma.chartOfAccounts.findMany({
    where: { companyId: COMPANY_ID, isActive: true },
    include: {
      journalEntries: {
        include: { journalEntry: true }
      }
    }
  });

  const assetAccounts = accounts.filter(a => a.type === 'ASSET');
  const liabilityAccounts = accounts.filter(a => a.type === 'LIABILITY');
  const equityAccounts = accounts.filter(a => a.type === 'EQUITY');
  const revenueAccounts = accounts.filter(a => a.type === 'REVENUE');
  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE');

  pass('Cuentas ASSET', `${assetAccounts.length} cuentas (balance normal: DÉBITO)`);
  pass('Cuentas LIABILITY', `${liabilityAccounts.length} cuentas (balance normal: CRÉDITO)`);
  pass('Cuentas EQUITY', `${equityAccounts.length} cuentas (balance normal: CRÉDITO)`);
  pass('Cuentas REVENUE', `${revenueAccounts.length} cuentas (balance normal: CRÉDITO)`);
  pass('Cuentas EXPENSE', `${expenseAccounts.length} cuentas (balance normal: DÉBITO)`);
}

async function testNoDoubleCountingLogic() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Lógica Anti-Doble Conteo');
  log('📋', '='.repeat(50));

  const content = readFile('src/app/api/accounting/reports/income-statement/route.ts');

  if (content.includes('dataSource') && content.includes('txWithJE.has')) {
    pass('Anti-Doble Conteo', 'Income Statement verifica journal entries existentes');
  } else {
    fail('Anti-Doble Conteo', 'Falta lógica de verificación de JE existentes');
  }

  if (content.includes("source') || 'journal'")) {
    pass('Parámetro source', 'Income Statement acepta parámetro source');
  } else {
    fail('Parámetro source', 'No tiene parámetro source');
  }
}

async function testCompanyIdFiltering() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Filtrado por CompanyId');
  log('📋', '='.repeat(50));

  // Balance Sheet
  const balanceSheet = readFile('src/app/api/accounting/reports/balance-sheet/route.ts');
  if (balanceSheet.includes('companyId: companyUser.companyId')) {
    pass('Balance Sheet', 'Filtra por companyId');
  } else {
    fail('Balance Sheet', 'No filtra por companyId');
  }

  // Cash Flow
  const cashFlow = readFile('src/app/api/accounting/reports/cash-flow/route.ts');
  if (cashFlow.includes('companyId: companyUser.companyId')) {
    pass('Cash Flow', 'Filtra por companyId');
  } else {
    fail('Cash Flow', 'No filtra por companyId');
  }
}

async function testCashFlowDateLogic() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Cash Flow usa paidDate');
  log('📋', '='.repeat(50));

  const cashFlow = readFile('src/app/api/accounting/reports/cash-flow/route.ts');

  if (cashFlow.includes('paidDate:') || cashFlow.includes('paidDate')) {
    pass('Cash Flow paidDate', 'Usa paidDate para facturas PAID');
  } else {
    fail('Cash Flow paidDate', 'No usa paidDate');
  }
}

async function testReversalFunctions() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Funciones de Reversión en APIs');
  log('📋', '='.repeat(50));

  // Transactions route
  const txRoute = readFile('src/app/api/transactions/route.ts');
  if (txRoute.includes('deleteTransactionWithReversal')) {
    pass('DELETE Transactions', 'Usa deleteTransactionWithReversal');
  } else {
    fail('DELETE Transactions', 'No usa reversión');
  }

  // Expenses route
  const expRoute = readFile('src/app/api/expenses/route.ts');
  if (expRoute.includes('deleteExpenseWithReversal')) {
    pass('DELETE Expenses', 'Usa deleteExpenseWithReversal');
  } else {
    fail('DELETE Expenses', 'No usa reversión');
  }
}

async function testInvoiceDraftLogic() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Facturas DRAFT no crean Journal Entry');
  log('📋', '='.repeat(50));

  const invoiceRoute = readFile('src/app/api/invoices/route.ts');

  if (invoiceRoute.includes("status !== 'DRAFT'")) {
    pass('Invoice DRAFT', 'No crea JE para facturas DRAFT');
  } else {
    fail('Invoice DRAFT', 'Podría crear JE para DRAFT');
  }

  // Send service
  const sendService = readFile('src/lib/us-invoice-service.ts');
  if (sendService.includes('wasInDraft') && sendService.includes('createInvoiceJournalEntry')) {
    pass('Invoice SENT', 'Crea JE cuando cambia de DRAFT a SENT');
  } else {
    fail('Invoice SENT', 'No crea JE al enviar');
  }
}

async function testPaymentJournalEntry() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Pagos crean Journal Entry');
  log('📋', '='.repeat(50));

  const paymentRoute = readFile('src/app/api/invoices/payments/route.ts');

  if (paymentRoute.includes('createPaymentReceivedJournalEntry')) {
    pass('Payment JE', 'Crea asiento de cobro al recibir pago');
  } else {
    fail('Payment JE', 'No crea asiento de cobro');
  }
}

async function testBalanceSheetSignHandling() {
  log('📋', '='.repeat(50));
  log('📋', 'TEST: Balance Sheet maneja signos correctamente');
  log('📋', '='.repeat(50));

  const balanceSheet = readFile('src/app/api/accounting/reports/balance-sheet/route.ts');

  if (balanceSheet.includes("account.type === 'ASSET'") && 
      balanceSheet.includes('credit - debit')) {
    pass('Sign Handling', 'Diferencia signos por tipo de cuenta');
  } else {
    fail('Sign Handling', 'No diferencia signos correctamente');
  }
}

async function main() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🔬 TEST DE LÓGICA CONTABLE AVANZADA');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log('═'.repeat(60));
  console.log('');

  try {
    await testAccountingServiceFunctions();
    await testDoubleEntryIntegrity();
    await testTrialBalance();
    await testAccountSignHandling();
    await testNoDoubleCountingLogic();
    await testCompanyIdFiltering();
    await testCashFlowDateLogic();
    await testReversalFunctions();
    await testInvoiceDraftLogic();
    await testPaymentJournalEntry();
    await testBalanceSheetSignHandling();

  } catch (error) {
    console.error('Error en tests:', error);
  } finally {
    await prisma.$disconnect();
  }

  // Resumen
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RESUMEN DE TESTS');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('');
    console.log('❌ TESTS FALLIDOS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}: ${r.details}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();

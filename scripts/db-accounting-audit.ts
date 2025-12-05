/**
 * AUDITORÍA CONTABLE DIRECTA (Base de Datos)
 * 
 * Este script accede directamente a la BD para verificar
 * la integridad y consistencia de los datos contables.
 * 
 * Ejecutar: npx tsx scripts/db-accounting-audit.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = process.env.COMPANY_ID || 'cmis3j65t000712d2bx4izgfy';

interface AuditResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  data?: any;
}

const auditResults: AuditResult[] = [];

function addResult(category: string, test: string, status: AuditResult['status'], details: string, data?: any) {
  auditResults.push({ category, test, status, details, data });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${test}: ${details}`);
}

// ============================================
// 1. VERIFICAR CONEXIÓN Y DATOS BÁSICOS
// ============================================
async function auditConnection() {
  console.log('\n🔌 VERIFICACIÓN DE CONEXIÓN\n' + '='.repeat(50));
  
  try {
    const company = await prisma.company.findUnique({
      where: { id: COMPANY_ID }
    });
    
    if (company) {
      addResult('Conexión', 'Base de datos', 'PASS', `Conectado - Empresa: ${company.name}`);
    } else {
      addResult('Conexión', 'Empresa', 'FAIL', `No se encontró la empresa ${COMPANY_ID}`);
    }
  } catch (error: any) {
    addResult('Conexión', 'Base de datos', 'FAIL', `Error: ${error.message}`);
  }
}

// ============================================
// 2. REGLA DE PARTIDA DOBLE
// ============================================
async function auditDoubleEntry() {
  console.log('\n📚 AUDITORÍA: PARTIDA DOBLE\n' + '='.repeat(50));
  
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { companyId: COMPANY_ID },
      include: { lines: true }
    });
    
    if (entries.length === 0) {
      addResult('Partida Doble', 'Asientos', 'WARNING', 'No hay asientos contables registrados - Esto es un PROBLEMA si hay transacciones');
      return;
    }

    let unbalancedCount = 0;
    
    for (const entry of entries) {
      const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        unbalancedCount++;
        addResult('Partida Doble', `Asiento ${entry.entryNumber}`, 'FAIL', 
          `Desbalanceado: Débito=$${totalDebit.toFixed(2)}, Crédito=$${totalCredit.toFixed(2)}`);
      }
    }

    if (unbalancedCount === 0) {
      addResult('Partida Doble', 'Todos los asientos', 'PASS', `${entries.length} asientos balanceados correctamente`);
    }
  } catch (error: any) {
    addResult('Partida Doble', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// 3. VERIFICAR CATÁLOGO DE CUENTAS
// ============================================
async function auditChartOfAccounts() {
  console.log('\n📋 AUDITORÍA: CATÁLOGO DE CUENTAS\n' + '='.repeat(50));
  
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    if (accounts.length === 0) {
      addResult('Catálogo', 'Cuentas', 'FAIL', 'No hay cuentas contables configuradas');
      return;
    }

    // Verificar cuentas por tipo
    const byType: Record<string, number> = {};
    for (const acc of accounts) {
      byType[acc.type] = (byType[acc.type] || 0) + 1;
    }

    addResult('Catálogo', 'Total cuentas', 'PASS', `${accounts.length} cuentas registradas`);
    
    // Verificar tipos esenciales
    const essentialTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    for (const type of essentialTypes) {
      if (!byType[type]) {
        addResult('Catálogo', `Tipo ${type}`, 'WARNING', `No hay cuentas de tipo ${type}`);
      } else {
        addResult('Catálogo', `Tipo ${type}`, 'PASS', `${byType[type]} cuentas`);
      }
    }
  } catch (error: any) {
    addResult('Catálogo', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// 4. CONSISTENCIA TRANSACCIONES vs ASIENTOS
// ============================================
async function auditTransactionsConsistency() {
  console.log('\n💰 AUDITORÍA: CONSISTENCIA TRANSACCIONES\n' + '='.repeat(50));
  
  try {
    // Contar transacciones
    const transactions = await prisma.transaction.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    // Contar gastos
    const expenses = await prisma.expense.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    // Contar asientos
    const journalEntries = await prisma.journalEntry.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    const totalTransactions = transactions.length;
    const totalExpenses = expenses.length;
    const totalEntries = journalEntries.length;
    const totalOperations = totalTransactions + totalExpenses;
    
    addResult('Consistencia', 'Transacciones', 'PASS', `${totalTransactions} transacciones registradas`);
    addResult('Consistencia', 'Gastos', 'PASS', `${totalExpenses} gastos registrados`);
    addResult('Consistencia', 'Asientos', 'PASS', `${totalEntries} asientos contables`);
    
    // PROBLEMA CRÍTICO: Si hay transacciones pero no asientos
    if (totalOperations > 0 && totalEntries === 0) {
      addResult('Consistencia', 'Partida Doble', 'FAIL', 
        `¡CRÍTICO! Hay ${totalOperations} operaciones pero 0 asientos contables. Los movimientos NO se reflejan en contabilidad.`);
    } else if (totalOperations > totalEntries) {
      addResult('Consistencia', 'Partida Doble', 'WARNING', 
        `Posible inconsistencia: ${totalOperations} operaciones vs ${totalEntries} asientos`);
    }

    // Calcular totales
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);
    
    const totalExpenseAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const transactionExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);
    
    console.log('\n📊 RESUMEN FINANCIERO:');
    console.log(`   Ingresos (transactions): $${totalIncome.toFixed(2)}`);
    console.log(`   Gastos (expenses table): $${totalExpenseAmount.toFixed(2)}`);
    console.log(`   Gastos (transactions):   $${transactionExpenses.toFixed(2)}`);
    console.log(`   Total gastos combinados: $${(totalExpenseAmount + transactionExpenses).toFixed(2)}`);
    
  } catch (error: any) {
    addResult('Consistencia', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// 5. INTEGRIDAD DE FACTURAS
// ============================================
async function auditInvoices() {
  console.log('\n🧾 AUDITORÍA: INTEGRIDAD FACTURAS\n' + '='.repeat(50));
  
  try {
    const invoices = await prisma.invoice.findMany({
      where: { companyId: COMPANY_ID },
      include: { items: true }
    });
    
    if (invoices.length === 0) {
      addResult('Facturas', 'Datos', 'WARNING', 'No hay facturas registradas');
      return;
    }

    let inconsistentCount = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    for (const inv of invoices) {
      const itemsTotal = inv.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      const invoiceTotal = Number(inv.total);
      totalBilled += invoiceTotal;
      
      if (inv.status === 'PAID') {
        totalPaid += invoiceTotal;
      }
      
      // Verificar que el total coincide con los items (con tolerancia para impuestos)
      const diff = Math.abs(itemsTotal - invoiceTotal);
      if (diff > invoiceTotal * 0.15) { // Más del 15% de diferencia
        inconsistentCount++;
        addResult('Facturas', `Factura ${inv.invoiceNumber}`, 'WARNING', 
          `Diferencia significativa: Items=$${itemsTotal.toFixed(2)}, Total=$${invoiceTotal.toFixed(2)}`);
      }
    }

    addResult('Facturas', 'Total facturas', 'PASS', `${invoices.length} facturas`);
    addResult('Facturas', 'Facturado', 'PASS', `Total facturado: $${totalBilled.toFixed(2)}`);
    addResult('Facturas', 'Cobrado', 'PASS', `Total cobrado: $${totalPaid.toFixed(2)}`);
    
    if (inconsistentCount > 0) {
      addResult('Facturas', 'Consistencia', 'WARNING', `${inconsistentCount} facturas con diferencias`);
    } else {
      addResult('Facturas', 'Consistencia', 'PASS', 'Todas las facturas son consistentes');
    }
    
  } catch (error: any) {
    addResult('Facturas', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// 6. BALANCE DE PRUEBA
// ============================================
async function auditTrialBalance() {
  console.log('\n⚖️ AUDITORÍA: BALANCE DE PRUEBA\n' + '='.repeat(50));
  
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { companyId: COMPANY_ID },
      include: { 
        lines: {
          include: { account: true }
        }
      }
    });
    
    if (entries.length === 0) {
      addResult('Balance Prueba', 'Datos', 'WARNING', 'No hay asientos para calcular balance');
      return;
    }

    let totalDebits = 0;
    let totalCredits = 0;
    const accountBalances: Record<string, { name: string, debit: number, credit: number }> = {};

    for (const entry of entries) {
      for (const line of entry.lines) {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        totalDebits += debit;
        totalCredits += credit;
        
        const accId = line.accountId;
        if (!accountBalances[accId]) {
          accountBalances[accId] = { 
            name: line.account?.name || 'Desconocida', 
            debit: 0, 
            credit: 0 
          };
        }
        accountBalances[accId].debit += debit;
        accountBalances[accId].credit += credit;
      }
    }

    const difference = Math.abs(totalDebits - totalCredits);
    
    if (difference < 0.01) {
      addResult('Balance Prueba', 'Débitos = Créditos', 'PASS', 
        `Total Débitos: $${totalDebits.toFixed(2)} = Total Créditos: $${totalCredits.toFixed(2)}`);
    } else {
      addResult('Balance Prueba', 'Débitos = Créditos', 'FAIL', 
        `Diferencia de $${difference.toFixed(2)} - Débitos: $${totalDebits.toFixed(2)}, Créditos: $${totalCredits.toFixed(2)}`);
    }

    // Mostrar cuentas con saldos
    console.log('\n   Saldos por cuenta:');
    for (const [id, acc] of Object.entries(accountBalances)) {
      const balance = acc.debit - acc.credit;
      console.log(`   - ${acc.name}: Débito $${acc.debit.toFixed(2)}, Crédito $${acc.credit.toFixed(2)}, Saldo $${balance.toFixed(2)}`);
    }
    
  } catch (error: any) {
    addResult('Balance Prueba', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// 7. VERIFICAR PROBLEMAS CONOCIDOS
// ============================================
async function auditKnownIssues() {
  console.log('\n🔧 AUDITORÍA: PROBLEMAS CONOCIDOS\n' + '='.repeat(50));
  
  try {
    // Verificar si hay transacciones sin asiento asociado
    const transactions = await prisma.transaction.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    const journalEntries = await prisma.journalEntry.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    if (transactions.length > 0 && journalEntries.length === 0) {
      addResult('Problemas', 'Asientos automáticos', 'FAIL', 
        '¡Las transacciones NO generan asientos contables automáticamente!');
    }
    
    // Verificar facturas pagadas sin registro
    const paidInvoices = await prisma.invoice.findMany({
      where: { 
        companyId: COMPANY_ID,
        status: 'PAID'
      }
    });
    
    if (paidInvoices.length > 0 && journalEntries.length === 0) {
      addResult('Problemas', 'Cobros de facturas', 'FAIL', 
        '¡Las facturas pagadas NO generan asientos contables!');
    }
    
    // Verificar gastos sin asiento
    const expenses = await prisma.expense.findMany({
      where: { companyId: COMPANY_ID }
    });
    
    if (expenses.length > 0 && journalEntries.length === 0) {
      addResult('Problemas', 'Gastos', 'FAIL', 
        '¡Los gastos NO generan asientos contables!');
    }
    
  } catch (error: any) {
    addResult('Problemas', 'Error', 'FAIL', error.message);
  }
}

// ============================================
// EJECUTAR AUDITORÍA COMPLETA
// ============================================
async function runAudit() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 AUDITORÍA CONTABLE COMPLETA (Acceso Directo BD)');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log('═'.repeat(60));

  await auditConnection();
  await auditChartOfAccounts();
  await auditDoubleEntry();
  await auditTransactionsConsistency();
  await auditInvoices();
  await auditTrialBalance();
  await auditKnownIssues();

  // Resumen final
  const passed = auditResults.filter(r => r.status === 'PASS').length;
  const failed = auditResults.filter(r => r.status === 'FAIL').length;
  const warnings = auditResults.filter(r => r.status === 'WARNING').length;

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE AUDITORÍA');
  console.log('═'.repeat(60));
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log(`⚠️  Advertencias: ${warnings}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n❌ PROBLEMAS CRÍTICOS ENCONTRADOS:');
    auditResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));
  }

  if (warnings > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    auditResults
      .filter(r => r.status === 'WARNING')
      .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));
  }

  console.log('\n');
  
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runAudit().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

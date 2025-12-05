/**
 * AUDITORÍA CONTABLE COMPLETA
 * 
 * Este script verifica la integridad y consistencia de los datos contables.
 * Ejecutar: npx tsx scripts/accounting-audit.ts
 */

export {};

const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3000';
const AUDIT_COMPANY_ID = process.env.AUDIT_COMPANY_ID || 'cmis3j65t000712d2bx4izgfy';

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

async function fetchAPI(endpoint: string) {
  try {
    const res = await fetch(`${AUDIT_BASE_URL}${endpoint}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================
// 1. REGLA DE PARTIDA DOBLE
// ============================================
async function auditDoubleEntry() {
  console.log('\n📚 AUDITORÍA: PARTIDA DOBLE\n' + '='.repeat(50));
  
  const data = await fetchAPI(`/api/accounting/journal-entries?companyId=${AUDIT_COMPANY_ID}`);
  
  if (!data || !Array.isArray(data)) {
    addResult('Partida Doble', 'Obtener asientos', 'WARNING', 'No se pudieron obtener asientos contables');
    return;
  }

  let unbalancedCount = 0;
  
  for (const entry of data) {
    const totalDebit = entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
    const totalCredit = entry.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0;
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      unbalancedCount++;
      addResult('Partida Doble', `Asiento ${entry.entryNumber}`, 'FAIL', 
        `Desbalanceado: Débito=$${totalDebit.toFixed(2)}, Crédito=$${totalCredit.toFixed(2)}`);
    }
  }

  if (unbalancedCount === 0 && data.length > 0) {
    addResult('Partida Doble', 'Todos los asientos', 'PASS', `${data.length} asientos balanceados correctamente`);
  } else if (data.length === 0) {
    addResult('Partida Doble', 'Asientos', 'WARNING', 'No hay asientos contables registrados');
  }
}

// ============================================
// 2. ECUACIÓN CONTABLE: ACTIVO = PASIVO + CAPITAL
// ============================================
async function auditAccountingEquation() {
  console.log('\n📊 AUDITORÍA: ECUACIÓN CONTABLE\n' + '='.repeat(50));
  
  const data = await fetchAPI(`/api/accounting/reports/balance-sheet?companyId=${AUDIT_COMPANY_ID}&date=${new Date().toISOString()}`);
  
  if (!data || !data.balanceSheet) {
    addResult('Ecuación Contable', 'Balance General', 'WARNING', 'No se pudo obtener el balance general');
    return;
  }

  const assets = data.balanceSheet.assets?.total || 0;
  const liabilities = data.balanceSheet.liabilities?.total || 0;
  const equity = data.balanceSheet.equity?.total || 0;
  const liabPlusEquity = liabilities + equity;
  const difference = Math.abs(assets - liabPlusEquity);

  if (difference < 0.01) {
    addResult('Ecuación Contable', 'A = P + C', 'PASS', 
      `Activos ($${assets.toFixed(2)}) = Pasivos ($${liabilities.toFixed(2)}) + Capital ($${equity.toFixed(2)})`);
  } else {
    addResult('Ecuación Contable', 'A = P + C', 'FAIL', 
      `Desbalance de $${difference.toFixed(2)} - Activos: $${assets.toFixed(2)}, Pasivo+Capital: $${liabPlusEquity.toFixed(2)}`);
  }
}

// ============================================
// 3. CONSISTENCIA DE TRANSACCIONES
// ============================================
async function auditTransactionConsistency() {
  console.log('\n💰 AUDITORÍA: CONSISTENCIA TRANSACCIONES\n' + '='.repeat(50));
  
  const transactions = await fetchAPI(`/api/transactions?companyId=${AUDIT_COMPANY_ID}`);
  const expenses = await fetchAPI(`/api/expenses?companyId=${AUDIT_COMPANY_ID}`);
  const incomeStatement = await fetchAPI(`/api/accounting/reports/income-statement?companyId=${AUDIT_COMPANY_ID}&startDate=2020-01-01&endDate=${new Date().toISOString()}`);

  if (!transactions && !expenses) {
    addResult('Consistencia', 'Datos', 'WARNING', 'No se pudieron obtener transacciones ni gastos');
    return;
  }

  // Sumar ingresos de transacciones
  const txIncome = (transactions || [])
    .filter((t: any) => t.type === 'INCOME' && t.status === 'COMPLETED')
    .reduce((s: number, t: any) => s + (t.amount || 0), 0);

  // Sumar gastos de transacciones  
  const txExpenses = (transactions || [])
    .filter((t: any) => t.type === 'EXPENSE' && t.status === 'COMPLETED')
    .reduce((s: number, t: any) => s + (t.amount || 0), 0);

  // Sumar gastos de tabla expenses
  const expenseTableTotal = (expenses || [])
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);

  addResult('Consistencia', 'Ingresos en Transacciones', 'PASS', `Total: $${txIncome.toFixed(2)}`);
  addResult('Consistencia', 'Gastos en Transacciones', 'PASS', `Total: $${txExpenses.toFixed(2)}`);
  addResult('Consistencia', 'Gastos en tabla Expenses', 'PASS', `Total: $${expenseTableTotal.toFixed(2)}`);

  // Comparar con Estado de Resultados
  if (incomeStatement?.incomeStatement) {
    const reportedRevenue = incomeStatement.incomeStatement.revenue?.total || 0;
    const reportedExpenses = incomeStatement.incomeStatement.expenses?.total || 0;
    
    const revenueMatch = Math.abs(reportedRevenue - txIncome) < 0.01;
    const expenseMatch = Math.abs(reportedExpenses - (txExpenses + expenseTableTotal)) < 0.01;

    if (revenueMatch) {
      addResult('Consistencia', 'Ingresos vs P&L', 'PASS', 'Los ingresos coinciden con el Estado de Resultados');
    } else {
      addResult('Consistencia', 'Ingresos vs P&L', 'FAIL', 
        `Diferencia: Transacciones=$${txIncome.toFixed(2)}, Reporte=$${reportedRevenue.toFixed(2)}`);
    }

    if (expenseMatch) {
      addResult('Consistencia', 'Gastos vs P&L', 'PASS', 'Los gastos coinciden con el Estado de Resultados');
    } else {
      addResult('Consistencia', 'Gastos vs P&L', 'WARNING', 
        `Diferencia: TX+Exp=$${(txExpenses + expenseTableTotal).toFixed(2)}, Reporte=$${reportedExpenses.toFixed(2)}`);
    }
  }
}

// ============================================
// 4. INTEGRIDAD DE FACTURAS
// ============================================
async function auditInvoiceIntegrity() {
  console.log('\n🧾 AUDITORÍA: INTEGRIDAD FACTURAS\n' + '='.repeat(50));
  
  const invoices = await fetchAPI(`/api/invoices?companyId=${AUDIT_COMPANY_ID}`);
  
  if (!invoices || !Array.isArray(invoices)) {
    addResult('Facturas', 'Datos', 'WARNING', 'No se pudieron obtener facturas');
    return;
  }

  let invalidCalc = 0;
  let negativeTotals = 0;
  let missingCustomer = 0;

  for (const inv of invoices) {
    // Verificar cálculo: subtotal + tax - discount = total
    const calculatedTotal = (inv.subtotal || 0) + (inv.taxAmount || 0) - (inv.discount || 0);
    if (Math.abs(calculatedTotal - (inv.total || 0)) > 0.01) {
      invalidCalc++;
    }

    if (inv.total < 0) negativeTotals++;
    if (!inv.customerId) missingCustomer++;
  }

  if (invalidCalc === 0) {
    addResult('Facturas', 'Cálculos', 'PASS', `${invoices.length} facturas con cálculos correctos`);
  } else {
    addResult('Facturas', 'Cálculos', 'FAIL', `${invalidCalc} facturas con cálculos incorrectos`);
  }

  if (negativeTotals > 0) {
    addResult('Facturas', 'Totales negativos', 'FAIL', `${negativeTotals} facturas con totales negativos`);
  }

  if (missingCustomer > 0) {
    addResult('Facturas', 'Sin cliente', 'WARNING', `${missingCustomer} facturas sin cliente asignado`);
  }
}

// ============================================
// 5. CATÁLOGO DE CUENTAS
// ============================================
async function auditChartOfAccounts() {
  console.log('\n📋 AUDITORÍA: CATÁLOGO DE CUENTAS\n' + '='.repeat(50));
  
  const accounts = await fetchAPI(`/api/accounting/chart-of-accounts?companyId=${AUDIT_COMPANY_ID}`);
  
  if (!accounts || !Array.isArray(accounts)) {
    addResult('Catálogo', 'Datos', 'FAIL', 'No se pudo obtener el catálogo de cuentas');
    return;
  }

  // Verificar estructura básica GAAP
  const types = new Set(accounts.map((a: any) => a.type));
  const requiredTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
  const missingTypes = requiredTypes.filter(t => !types.has(t));

  if (missingTypes.length === 0) {
    addResult('Catálogo', 'Tipos de cuenta', 'PASS', 'Todos los tipos de cuenta GAAP están presentes');
  } else {
    addResult('Catálogo', 'Tipos de cuenta', 'FAIL', `Faltan tipos: ${missingTypes.join(', ')}`);
  }

  // Verificar códigos duplicados
  const codes = accounts.map((a: any) => a.code);
  const duplicates = codes.filter((c: string, i: number) => codes.indexOf(c) !== i);
  
  if (duplicates.length === 0) {
    addResult('Catálogo', 'Códigos únicos', 'PASS', 'No hay códigos duplicados');
  } else {
    addResult('Catálogo', 'Códigos únicos', 'FAIL', `Códigos duplicados: ${[...new Set(duplicates)].join(', ')}`);
  }

  addResult('Catálogo', 'Total cuentas', 'PASS', `${accounts.length} cuentas en el catálogo`);
}

// ============================================
// 6. FLUJO DE EFECTIVO
// ============================================
async function auditCashFlow() {
  console.log('\n💵 AUDITORÍA: FLUJO DE EFECTIVO\n' + '='.repeat(50));
  
  const today = new Date().toISOString();
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
  
  const cashFlow = await fetchAPI(`/api/accounting/reports/cash-flow?companyId=${AUDIT_COMPANY_ID}&startDate=${startOfYear}&endDate=${today}`);
  
  if (!cashFlow || !cashFlow.cashFlow) {
    addResult('Flujo Efectivo', 'Datos', 'WARNING', 'No se pudo obtener el flujo de efectivo');
    return;
  }

  const { operating, investing, financing } = cashFlow.cashFlow;
  
  addResult('Flujo Efectivo', 'Operaciones', 'PASS', 
    `Entradas: $${operating.inflow.toFixed(2)}, Salidas: $${operating.outflow.toFixed(2)}, Neto: $${operating.net.toFixed(2)}`);
  
  addResult('Flujo Efectivo', 'Inversión', 'PASS', 
    `Neto: $${investing.net.toFixed(2)}`);
  
  addResult('Flujo Efectivo', 'Financiamiento', 'PASS', 
    `Neto: $${financing.net.toFixed(2)}`);
}

// ============================================
// 7. REGLAS DE NEGOCIO ESPECÍFICAS
// ============================================
async function auditBusinessRules() {
  console.log('\n📏 AUDITORÍA: REGLAS DE NEGOCIO\n' + '='.repeat(50));
  
  const transactions = await fetchAPI(`/api/transactions?companyId=${AUDIT_COMPANY_ID}`);
  
  if (transactions) {
    // Verificar que todos los ingresos tengan descripción
    const incomeWithoutDesc = transactions.filter((t: any) => 
      t.type === 'INCOME' && (!t.description || t.description.trim() === '')
    );
    
    if (incomeWithoutDesc.length === 0) {
      addResult('Reglas Negocio', 'Descripciones', 'PASS', 'Todas las transacciones tienen descripción');
    } else {
      addResult('Reglas Negocio', 'Descripciones', 'WARNING', `${incomeWithoutDesc.length} transacciones sin descripción`);
    }

    // Verificar montos negativos
    const negativeAmounts = transactions.filter((t: any) => t.amount < 0);
    if (negativeAmounts.length === 0) {
      addResult('Reglas Negocio', 'Montos positivos', 'PASS', 'No hay montos negativos');
    } else {
      addResult('Reglas Negocio', 'Montos positivos', 'FAIL', `${negativeAmounts.length} transacciones con montos negativos`);
    }
  }

  // Verificar impuestos en facturas
  const invoices = await fetchAPI(`/api/invoices?companyId=${AUDIT_COMPANY_ID}`);
  if (invoices && invoices.length > 0) {
    const taxableWithoutTax = invoices.filter((i: any) => 
      !i.taxExempt && i.subtotal > 0 && (!i.taxAmount || i.taxAmount === 0)
    );
    
    if (taxableWithoutTax.length === 0) {
      addResult('Reglas Negocio', 'Impuestos', 'PASS', 'Todas las facturas gravables tienen impuesto');
    } else {
      addResult('Reglas Negocio', 'Impuestos', 'WARNING', `${taxableWithoutTax.length} facturas gravables sin impuesto`);
    }
  }
}

// ============================================
// EJECUTAR AUDITORÍA
// ============================================
async function runFullAudit() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 AUDITORÍA CONTABLE COMPLETA');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${AUDIT_COMPANY_ID}`);
  console.log(`🌐 URL: ${AUDIT_BASE_URL}`);
  console.log('═'.repeat(60));

  await auditDoubleEntry();
  await auditAccountingEquation();
  await auditTransactionConsistency();
  await auditInvoiceIntegrity();
  await auditChartOfAccounts();
  await auditCashFlow();
  await auditBusinessRules();

  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE AUDITORÍA');
  console.log('═'.repeat(60));
  
  const passed = auditResults.filter(r => r.status === 'PASS').length;
  const failed = auditResults.filter(r => r.status === 'FAIL').length;
  const warnings = auditResults.filter(r => r.status === 'WARNING').length;
  
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log(`⚠️  Advertencias: ${warnings}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n❌ PROBLEMAS CRÍTICOS ENCONTRADOS:');
    auditResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   • [${r.category}] ${r.test}: ${r.details}`);
    });
  }

  if (warnings > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    auditResults.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`   • [${r.category}] ${r.test}: ${r.details}`);
    });
  }

  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

runFullAudit().catch(console.error);

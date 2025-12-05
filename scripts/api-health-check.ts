/**
 * API Health Check Script
 * Ejecuta: npx tsx scripts/api-health-check.ts
 * 
 * Verifica que todos los endpoints de la aplicación respondan correctamente
 */

export {};

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const COMPANY_ID = process.env.COMPANY_ID || 'cmis3j65t000712d2bx4izgfy';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  responseTime: number;
  error?: string;
}

const healthResults: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  url: string,
  options: RequestInit = {},
  expectedStatus: number[] = [200, 201]
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const responseTime = Date.now() - startTime;
    const passed = expectedStatus.includes(response.status);
    
    return {
      endpoint: name,
      method,
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      error: passed ? undefined : `Expected ${expectedStatus.join('|')}, got ${response.status}`
    };
  } catch (error: any) {
    return {
      endpoint: name,
      method,
      status: 'FAIL',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runHealthCheck() {
  console.log('\n🏥 API HEALTH CHECK');
  console.log('='.repeat(60));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log('='.repeat(60));
  
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];
  
  // ============================================
  // DEFINIR TODOS LOS ENDPOINTS A PROBAR
  // ============================================
  
  const endpoints = [
    // Auth & Session
    { name: 'Auth Providers', method: 'GET', url: '/api/auth/providers' },
    
    // Dashboard & Analytics
    { name: 'Dashboard Stats', method: 'GET', url: `/api/dashboard?companyId=${COMPANY_ID}` },
    { name: 'AI Chat', method: 'POST', url: '/api/ai/chat', body: { message: 'hola', companyId: COMPANY_ID }, expected: [200, 401] },
    
    // Customers
    { name: 'List Customers', method: 'GET', url: `/api/customers?companyId=${COMPANY_ID}` },
    
    // Invoices
    { name: 'List Invoices', method: 'GET', url: `/api/invoices?companyId=${COMPANY_ID}` },
    
    // Expenses - puede requerir auth
    { name: 'List Expenses', method: 'GET', url: `/api/expenses?companyId=${COMPANY_ID}`, expected: [200, 401] },
    
    // Transactions - puede requerir auth
    { name: 'List Transactions', method: 'GET', url: `/api/transactions?companyId=${COMPANY_ID}`, expected: [200, 401] },
    
    // Accounting - Chart of Accounts
    { name: 'Chart of Accounts', method: 'GET', url: `/api/accounting/chart-of-accounts?companyId=${COMPANY_ID}`, expected: [200, 401] },
    
    // Accounting - Journal Entries
    { name: 'Journal Entries', method: 'GET', url: `/api/accounting/journal-entries?companyId=${COMPANY_ID}`, expected: [200, 401] },
    
    // Accounting Reports
    { name: 'Income Statement', method: 'GET', url: `/api/accounting/reports/income-statement?companyId=${COMPANY_ID}&startDate=${startOfMonth}&endDate=${today}` },
    { name: 'Balance Sheet', method: 'GET', url: `/api/accounting/reports/balance-sheet?companyId=${COMPANY_ID}&date=${today}`, expected: [200, 401] },
    { name: 'Cash Flow', method: 'GET', url: `/api/accounting/reports/cash-flow?companyId=${COMPANY_ID}&startDate=${startOfMonth}&endDate=${today}`, expected: [200, 401] },
    { name: 'Trial Balance', method: 'GET', url: `/api/accounting/reports/trial-balance?companyId=${COMPANY_ID}&date=${today}` },
    
    // Banking
    { name: 'Bank Accounts', method: 'GET', url: `/api/banking/accounts?companyId=${COMPANY_ID}` },
    { name: 'Bank Transactions', method: 'GET', url: `/api/banking/transactions?companyId=${COMPANY_ID}` },
    
    // Products & Inventory
    { name: 'Products', method: 'GET', url: `/api/products?companyId=${COMPANY_ID}` },
    { name: 'Inventory', method: 'GET', url: `/api/inventory?companyId=${COMPANY_ID}` },
    
    // Payroll
    { name: 'Employees', method: 'GET', url: `/api/employees?companyId=${COMPANY_ID}` },
    { name: 'Payroll', method: 'GET', url: `/api/payroll?companyId=${COMPANY_ID}` },
    
    // Tax
    { name: 'Tax Rates', method: 'GET', url: `/api/tax/rates?companyId=${COMPANY_ID}` },
    { name: 'Tax Report', method: 'GET', url: `/api/reports/tax?companyId=${COMPANY_ID}`, expected: [200, 401, 404] },
    
    // Reports
    { name: 'Overdue Invoices', method: 'GET', url: `/api/reports/overdue-invoices?companyId=${COMPANY_ID}`, expected: [200, 401] },
    
    // Companies/Tenants
    { name: 'Companies', method: 'GET', url: '/api/companies', expected: [200, 401] },
    
    // Tools
    { name: 'Excel Export', method: 'GET', url: '/api/tools/excel', expected: [200, 400, 405] },
  ];
  
  // ============================================
  // EJECUTAR TESTS
  // ============================================
  
  console.log('\n📋 Testing Endpoints...\n');
  
  for (const ep of endpoints) {
    const result = await testEndpoint(
      ep.name,
      ep.method,
      `${BASE_URL}${ep.url}`,
      ep.body ? { body: JSON.stringify(ep.body) } : {},
      ep.expected || [200, 201]
    );
    
    healthResults.push(result);
    
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const timeStr = `${result.responseTime}ms`.padStart(6);
    const statusStr = result.statusCode ? `[${result.statusCode}]` : '[---]';
    
    console.log(`${icon} ${statusStr} ${timeStr} | ${ep.method.padEnd(4)} ${ep.name}`);
    
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  }
  
  // ============================================
  // RESUMEN
  // ============================================
  
  const passed = healthResults.filter(r => r.status === 'PASS').length;
  const failed = healthResults.filter(r => r.status === 'FAIL').length;
  const skipped = healthResults.filter(r => r.status === 'SKIP').length;
  const avgTime = Math.round(healthResults.reduce((a, r) => a + r.responseTime, 0) / healthResults.length);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`⏱️  Avg Time: ${avgTime}ms`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ ENDPOINTS CON ERRORES:');
    healthResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   - ${r.endpoint}: ${r.error}`);
      });
  }
  
  console.log('\n');
  
  // Exit code para CI/CD
  process.exit(failed > 0 ? 1 : 0);
}

runHealthCheck().catch(console.error);

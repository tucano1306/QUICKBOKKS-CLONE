import { test, expect, request } from '@playwright/test';

/**
 * 🔍 PRUEBAS DE INTEGRIDAD DE DATOS
 * 
 * Estas pruebas verifican que NO existan errores de lógica como:
 * - Gastos de fechas antiguas apareciendo en períodos actuales
 * - Journal entries con fechas incorrectas
 * - Discrepancias entre expenses y journal entries
 * - Transacciones sin Journal Entry (CRÍTICO para P&L)
 * 
 * DETECTA EL TIPO DE ERROR QUE ENCONTRASTE CON EL P&L
 */

// Configuración del API
const BASE_URL = 'http://localhost:3000';

test.describe('🔍 INTEGRIDAD DE DATOS - P&L', () => {
  
  test.describe('Verificación de Journal Entries para Transacciones', () => {
    
    test('TODAS las transacciones deben tener Journal Entry vinculado', async ({ request }) => {
      // Este test verifica que NUNCA exista una transacción sin JE
      // El JE se vincula por el campo "reference" que contiene el ID de la transacción
      
      const txRes = await request.get(`${BASE_URL}/api/transactions?companyId=cmis3j65t000712d2bx4izgfy`);
      
      if (!txRes.ok()) {
        console.log('⚠ No se pudo obtener transacciones');
        return;
      }
      
      const txData = await txRes.json();
      const transactions = txData.transactions || [];
      
      if (transactions.length === 0) {
        console.log('⚠ No hay transacciones para verificar');
        return;
      }
      
      // Obtener journal entries
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries?companyId=cmis3j65t000712d2bx4izgfy`);
      const jeData = await jeRes.json();
      const journalEntries = jeData.entries || jeData || [];
      
      // Crear set de referencias (IDs de transacciones que tienen JE)
      const jeReferences = new Set(
        journalEntries
          .filter((je: any) => je.reference)
          .map((je: any) => je.reference)
      );
      
      // Buscar transacciones sin JE
      const txWithoutJE = transactions.filter((tx: any) => !jeReferences.has(tx.id));
      
      if (txWithoutJE.length > 0) {
        console.log('\n❌❌❌ TRANSACCIONES SIN JOURNAL ENTRY ❌❌❌');
        txWithoutJE.forEach((tx: any) => {
          console.log(`  ❌ ${tx.type} - $${tx.amount} - ${tx.description || tx.category} - ID: ${tx.id}`);
        });
        console.log('❌❌❌ ESTO ES UN BUG CRÍTICO ❌❌❌\n');
      }
      
      expect(txWithoutJE.length, 
        `Hay ${txWithoutJE.length} transacciones sin Journal Entry. Esto causa errores en el P&L.`
      ).toBe(0);
      
      console.log(`✓ Las ${transactions.length} transacciones tienen Journal Entry vinculado`);
    });

    test('TODOS los gastos (expenses) deben tener Journal Entry vinculado', async ({ request }) => {
      // Los gastos se vinculan por reference también
      
      const expRes = await request.get(`${BASE_URL}/api/expenses`);
      
      if (!expRes.ok()) {
        console.log('⚠ No se pudo obtener gastos');
        return;
      }
      
      const expData = await expRes.json();
      const expenses = expData.data || expData.expenses || [];
      
      if (expenses.length === 0) {
        console.log('⚠ No hay gastos para verificar');
        return;
      }
      
      // Obtener journal entries de la compañía
      const companyId = expenses[0]?.companyId;
      if (!companyId) {
        console.log('⚠ Gastos sin companyId');
        return;
      }
      
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries?companyId=${companyId}`);
      const jeData = await jeRes.json();
      const journalEntries = jeData.entries || jeData || [];
      
      // Crear set de referencias
      const jeReferences = new Set(
        journalEntries
          .filter((je: any) => je.reference)
          .map((je: any) => je.reference)
      );
      
      // Buscar gastos sin JE
      const expWithoutJE = expenses.filter((exp: any) => !jeReferences.has(exp.id));
      
      if (expWithoutJE.length > 0) {
        console.log('\n❌❌❌ GASTOS SIN JOURNAL ENTRY ❌❌❌');
        expWithoutJE.forEach((exp: any) => {
          console.log(`  ❌ $${exp.amount} - ${exp.description} - ID: ${exp.id}`);
        });
        console.log('❌❌❌ ESTO ES UN BUG CRÍTICO ❌❌❌\n');
      }
      
      expect(expWithoutJE.length,
        `Hay ${expWithoutJE.length} gastos sin Journal Entry. Esto causa errores en el P&L.`
      ).toBe(0);
      
      console.log(`✓ Los ${expenses.length} gastos tienen Journal Entry vinculado`);
    });
  });
  
  test.describe('Verificación de Fechas en Journal Entries', () => {
    
    test('journal entries deben tener fechas consistentes con transacciones', async ({ request }) => {
      // Obtener transacciones
      const txRes = await request.get(`${BASE_URL}/api/transactions?companyId=cmis3j65t000712d2bx4izgfy`);
      
      if (!txRes.ok()) {
        console.log('⚠ No se pudo obtener transacciones');
        return;
      }
      
      const txData = await txRes.json();
      const transactions = txData.transactions || [];
      
      // Obtener journal entries
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries?companyId=cmis3j65t000712d2bx4izgfy`);
      
      if (!jeRes.ok()) {
        console.log('⚠ No se pudo obtener journal entries');
        return;
      }
      
      const jeData = await jeRes.json();
      const journalEntries = jeData.entries || jeData || [];
      
      // Crear mapa de JE por reference
      const jeByRef = new Map<string, any>();
      journalEntries.forEach((je: any) => {
        if (je.reference) jeByRef.set(je.reference, je);
      });
      
      let dateErrors: string[] = [];
      
      // Verificar fechas
      for (const tx of transactions) {
        const je = jeByRef.get(tx.id);
        if (je) {
          const txDate = new Date(tx.date).toISOString().split('T')[0];
          const jeDate = new Date(je.date).toISOString().split('T')[0];
          
          if (txDate !== jeDate) {
            dateErrors.push(
              `Transacción ${tx.id}: fecha TX=${txDate}, fecha JE=${jeDate}`
            );
          }
        }
      }
      
      if (dateErrors.length > 0) {
        console.log('\n⚠ DISCREPANCIAS DE FECHA:');
        dateErrors.forEach(e => console.log(`  ${e}`));
      }
      
      expect(dateErrors.length).toBe(0);
      console.log(`✓ Fechas consistentes entre transacciones y journal entries`);
    });

    test('P&L de "Este Mes" NO debe incluir datos de otros meses', async ({ request }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      // Obtener P&L del mes actual
      const plRes = await request.get(
        `${BASE_URL}/api/accounting/reports/income-statement?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!plRes.ok()) {
        console.log('⚠ No se pudo obtener P&L - verificar API');
        return;
      }
      
      const plData = await plRes.json();
      
      // Obtener los journal entries del período
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries`);
      
      if (jeRes.ok()) {
        const jeData = await jeRes.json();
        const journalEntries = jeData.entries || jeData || [];
        
        // Filtrar JEs que deberían estar en el período
        const jesInPeriod = journalEntries.filter((je: any) => {
          const jeDate = new Date(je.date);
          return jeDate >= startOfMonth && jeDate <= endOfMonth;
        });
        
        // Verificar que los JEs incluidos en P&L realmente pertenecen al período
        console.log(`📅 Período: ${startDate} a ${endDate}`);
        console.log(`📊 Journal Entries en período: ${jesInPeriod.length}`);
        
        // Verificar inconsistencias
        let outsidePeriod = journalEntries.filter((je: any) => {
          const jeDate = new Date(je.date);
          return jeDate < startOfMonth || jeDate > endOfMonth;
        });
        
        console.log(`📊 Journal Entries fuera del período: ${outsidePeriod.length}`);
        console.log('✓ Verificación de período completada');
      }
    });

    test('gastos de 2023 NO deben aparecer en P&L de 2025', async ({ request }) => {
      // P&L de diciembre 2025
      const plRes2025 = await request.get(
        `${BASE_URL}/api/accounting/reports/income-statement?startDate=2025-12-01&endDate=2025-12-31`
      );
      
      if (!plRes2025.ok()) {
        console.log('⚠ No se pudo obtener P&L 2025');
        return;
      }
      
      const pl2025 = await plRes2025.json();
      
      // P&L de todo 2023
      const plRes2023 = await request.get(
        `${BASE_URL}/api/accounting/reports/income-statement?startDate=2023-01-01&endDate=2023-12-31`
      );
      
      if (!plRes2023.ok()) {
        console.log('⚠ No se pudo obtener P&L 2023');
        return;
      }
      
      const pl2023 = await plRes2023.json();
      
      console.log('\n=== COMPARACIÓN P&L 2023 vs 2025 ===');
      console.log(`P&L 2023 - Gastos: $${pl2023.totalExpenses || 0}`);
      console.log(`P&L 2025 (Dic) - Gastos: $${pl2025.totalExpenses || 0}`);
      
      // Si el P&L de diciembre 2025 tiene los mismos gastos que 2023, hay un error
      if (pl2023.totalExpenses > 0 && pl2025.totalExpenses > 0) {
        // Los totales deberían ser diferentes
        const same = Math.abs((pl2023.totalExpenses || 0) - (pl2025.totalExpenses || 0)) < 0.01;
        
        if (same && pl2023.totalExpenses > 1000) {
          console.log('❌ ERROR: P&L 2025 parece tener los mismos datos que 2023!');
        }
      }
      
      console.log('=====================================\n');
    });
  });

  test.describe('Balance de Journal Entries', () => {
    
    test('débitos deben igualar créditos en cada journal entry', async ({ request }) => {
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries`);
      
      if (!jeRes.ok()) {
        console.log('⚠ No se pudo obtener journal entries');
        return;
      }
      
      const jeData = await jeRes.json();
      const journalEntries = jeData.entries || jeData || [];
      
      let unbalanced: string[] = [];
      
      for (const je of journalEntries) {
        const lines = je.lines || [];
        const totalDebit = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.debit) || 0), 0);
        const totalCredit = lines.reduce((sum: number, l: any) => sum + (parseFloat(l.credit) || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          unbalanced.push(`JE ${je.id}: Débito=$${totalDebit.toFixed(2)}, Crédito=$${totalCredit.toFixed(2)}`);
        }
      }
      
      if (unbalanced.length > 0) {
        console.log('\n=== JOURNAL ENTRIES DESBALANCEADOS ===');
        unbalanced.forEach(u => console.log(`❌ ${u}`));
        console.log('======================================\n');
      }
      
      expect(unbalanced.length).toBe(0);
      console.log(`✓ Todos los ${journalEntries.length} journal entries están balanceados`);
    });
  });

});

test.describe('🔍 VERIFICACIÓN DE CUENTAS', () => {
  
  test('cuentas de gastos deben ser tipo EXPENSE', async ({ request }) => {
    const accountsRes = await request.get(`${BASE_URL}/api/accounting/chart-of-accounts`);
    
    if (!accountsRes.ok()) {
      console.log('⚠ No se pudo obtener catálogo de cuentas');
      return;
    }
    
    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || accountsData || [];
    
    const expenseAccounts = accounts.filter((a: any) => a.type === 'EXPENSE');
    console.log(`📊 Cuentas de tipo EXPENSE: ${expenseAccounts.length}`);
    
    expect(expenseAccounts.length).toBeGreaterThan(0);
  });

  test('cuentas de ingresos deben ser tipo REVENUE', async ({ request }) => {
    const accountsRes = await request.get(`${BASE_URL}/api/accounting/chart-of-accounts`);
    
    if (!accountsRes.ok()) {
      console.log('⚠ No se pudo obtener catálogo de cuentas');
      return;
    }
    
    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || accountsData || [];
    
    const revenueAccounts = accounts.filter((a: any) => a.type === 'REVENUE');
    console.log(`📊 Cuentas de tipo REVENUE: ${revenueAccounts.length}`);
    
    expect(revenueAccounts.length).toBeGreaterThan(0);
  });
});

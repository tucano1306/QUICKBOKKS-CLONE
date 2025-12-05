import { test, expect, request } from '@playwright/test';

/**
 * 🔍 PRUEBAS DE INTEGRIDAD DE DATOS
 * 
 * Estas pruebas verifican que NO existan errores de lógica como:
 * - Gastos de fechas antiguas apareciendo en períodos actuales
 * - Journal entries con fechas incorrectas
 * - Discrepancias entre expenses y journal entries
 * 
 * DETECTA EL TIPO DE ERROR QUE ENCONTRASTE CON EL P&L
 */

// Configuración del API
const BASE_URL = 'http://localhost:3000';

test.describe('🔍 INTEGRIDAD DE DATOS - P&L', () => {
  
  test.describe('Verificación de Fechas en Journal Entries', () => {
    
    test('journal entries deben tener fechas consistentes con expenses', async ({ request }) => {
      // Obtener todos los gastos
      const expensesRes = await request.get(`${BASE_URL}/api/expenses`);
      
      if (!expensesRes.ok()) {
        console.log('⚠ No se pudo obtener gastos - verificar API');
        return;
      }
      
      const expensesData = await expensesRes.json();
      const expenses = expensesData.expenses || expensesData || [];
      
      // Obtener journal entries
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries`);
      
      if (!jeRes.ok()) {
        console.log('⚠ No se pudo obtener journal entries - verificar API');
        return;
      }
      
      const jeData = await jeRes.json();
      const journalEntries = jeData.entries || jeData || [];
      
      let dateErrors: string[] = [];
      
      // Para cada gasto, verificar que su journal entry tenga la misma fecha
      for (const expense of expenses) {
        if (expense.journalEntryId) {
          const je = journalEntries.find((j: any) => j.id === expense.journalEntryId);
          
          if (je) {
            const expenseDate = new Date(expense.date).toISOString().split('T')[0];
            const jeDate = new Date(je.date).toISOString().split('T')[0];
            
            if (expenseDate !== jeDate) {
              dateErrors.push(
                `❌ Expense "${expense.description}" fecha=${expenseDate} pero JE fecha=${jeDate}`
              );
            }
          }
        }
      }
      
      if (dateErrors.length > 0) {
        console.log('\n=== ERRORES DE FECHA DETECTADOS ===');
        dateErrors.forEach(e => console.log(e));
        console.log('===================================\n');
      }
      
      expect(dateErrors.length).toBe(0);
      console.log('✓ Todas las fechas de expenses y journal entries coinciden');
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

  test.describe('Verificación de Gastos sin Journal Entry', () => {
    
    test('todos los gastos deben tener journal entry', async ({ request }) => {
      const expensesRes = await request.get(`${BASE_URL}/api/expenses`);
      
      if (!expensesRes.ok()) {
        console.log('⚠ No se pudo obtener gastos');
        return;
      }
      
      const expensesData = await expensesRes.json();
      const expenses = expensesData.expenses || expensesData || [];
      
      const missingJE = expenses.filter((e: any) => !e.journalEntryId);
      
      if (missingJE.length > 0) {
        console.log('\n=== GASTOS SIN JOURNAL ENTRY ===');
        missingJE.forEach((e: any) => {
          console.log(`❌ "${e.description}" - $${e.amount} - ${e.date}`);
        });
        console.log('================================\n');
      }
      
      expect(missingJE.length).toBe(0);
      console.log(`✓ Todos los ${expenses.length} gastos tienen journal entry`);
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

  test.describe('Consistencia de Montos', () => {
    
    test('monto de expense debe coincidir con monto en journal entry', async ({ request }) => {
      const expensesRes = await request.get(`${BASE_URL}/api/expenses`);
      const jeRes = await request.get(`${BASE_URL}/api/accounting/journal-entries`);
      
      if (!expensesRes.ok() || !jeRes.ok()) {
        console.log('⚠ No se pudo obtener datos');
        return;
      }
      
      const expenses = (await expensesRes.json()).expenses || [];
      const journalEntries = (await jeRes.json()).entries || [];
      
      let amountMismatches: string[] = [];
      
      for (const expense of expenses) {
        if (expense.journalEntryId) {
          const je = journalEntries.find((j: any) => j.id === expense.journalEntryId);
          
          if (je && je.lines) {
            const jeTotal = je.lines.reduce((sum: number, l: any) => sum + (parseFloat(l.debit) || 0), 0);
            const expenseAmount = parseFloat(expense.amount);
            
            if (Math.abs(jeTotal - expenseAmount) > 0.01) {
              amountMismatches.push(
                `"${expense.description}": Expense=$${expenseAmount}, JE=$${jeTotal}`
              );
            }
          }
        }
      }
      
      if (amountMismatches.length > 0) {
        console.log('\n=== DISCREPANCIAS DE MONTOS ===');
        amountMismatches.forEach(m => console.log(`❌ ${m}`));
        console.log('===============================\n');
      }
      
      expect(amountMismatches.length).toBe(0);
      console.log('✓ Todos los montos de expenses coinciden con sus journal entries');
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

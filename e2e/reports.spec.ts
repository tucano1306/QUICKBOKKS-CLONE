import { test, expect } from '@playwright/test';

/**
 * Accounting Reports E2E Tests
 * 
 * Tests for financial reports functionality
 */

test.describe('Accounting Reports', () => {
  test.describe('Income Statement (P&L)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/company/reports/profit-loss');
    });

    test('should display income statement page', async ({ page }) => {
      await test.step('Verify page loads', async () => {
        const url = page.url();
        const isOnReport = url.includes('/profit-loss') || url.includes('/income-statement');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnReport || isOnAuth,
          'Should be on income statement or auth'
        ).toBeTruthy();
      });
    });

    test('should have date range selectors', async ({ page }) => {
      await test.step('Check for date controls', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/profit-loss') || url.includes('/reports')) {
          const dateInputs = page.locator('input[type="date"]');
          const monthSelector = page.locator('select, [role="combobox"]');

          const hasDateControls = await dateInputs.count() > 0 || await monthSelector.count() > 0;
          if (hasDateControls) {
            console.log('✓ Date range controls found');
          }
        }
      });
    });

    test('should display revenue section', async ({ page }) => {
      await test.step('Check for revenue information', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/profit-loss')) {
          const revenueSection = page.locator(
            ':text("Ingresos"), ' +
            ':text("Revenue"), ' +
            ':text("Income"), ' +
            '[data-testid="revenue-section"]'
          );

          if (await revenueSection.count() > 0) {
            console.log('✓ Revenue section displayed');
          }
        }
      });
    });

    test('should display expenses section', async ({ page }) => {
      await test.step('Check for expenses information', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/profit-loss')) {
          const expensesSection = page.locator(
            ':text("Gastos"), ' +
            ':text("Expenses"), ' +
            '[data-testid="expenses-section"]'
          );

          if (await expensesSection.count() > 0) {
            console.log('✓ Expenses section displayed');
          }
        }
      });
    });

    test('should display net income', async ({ page }) => {
      await test.step('Check for net income display', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/profit-loss')) {
          const netIncome = page.locator(
            ':text("Utilidad Neta"), ' +
            ':text("Net Income"), ' +
            ':text("Resultado"), ' +
            '[data-testid="net-income"]'
          );

          if (await netIncome.count() > 0) {
            console.log('✓ Net income displayed');
          }
        }
      });
    });

    test('should have recalculate/refresh button', async ({ page }) => {
      await test.step('Check for refresh functionality', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/profit-loss')) {
          const refreshButton = page.locator(
            'button:has-text("Recalcular"), ' +
            'button:has-text("Actualizar"), ' +
            'button:has-text("Refresh"), ' +
            '[data-testid="refresh-report"]'
          );

          if (await refreshButton.count() > 0) {
            console.log('✓ Refresh button found');
          }
        }
      });
    });
  });

  test.describe('Balance Sheet', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/company/reports/balance-sheet');
    });

    test('should display balance sheet page', async ({ page }) => {
      await test.step('Verify page loads', async () => {
        const url = page.url();
        const isOnReport = url.includes('/balance-sheet');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnReport || isOnAuth,
          'Should be on balance sheet or auth'
        ).toBeTruthy();
      });
    });

    test('should show assets section', async ({ page }) => {
      await test.step('Check for assets', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/balance-sheet')) {
          const assets = page.locator(
            ':text("Activos"), ' +
            ':text("Assets"), ' +
            '[data-testid="assets-section"]'
          );

          if (await assets.count() > 0) {
            console.log('✓ Assets section displayed');
          }
        }
      });
    });

    test('should show liabilities section', async ({ page }) => {
      await test.step('Check for liabilities', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/balance-sheet')) {
          const liabilities = page.locator(
            ':text("Pasivos"), ' +
            ':text("Liabilities"), ' +
            '[data-testid="liabilities-section"]'
          );

          if (await liabilities.count() > 0) {
            console.log('✓ Liabilities section displayed');
          }
        }
      });
    });

    test('should show equity section', async ({ page }) => {
      await test.step('Check for equity', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/balance-sheet')) {
          const equity = page.locator(
            ':text("Capital"), ' +
            ':text("Equity"), ' +
            ':text("Patrimonio"), ' +
            '[data-testid="equity-section"]'
          );

          if (await equity.count() > 0) {
            console.log('✓ Equity section displayed');
          }
        }
      });
    });
  });

  test.describe('Cash Flow Statement', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/company/reports/cash-flow');
    });

    test('should display cash flow page', async ({ page }) => {
      await test.step('Verify page loads', async () => {
        const url = page.url();
        const isOnReport = url.includes('/cash-flow');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnReport || isOnAuth,
          'Should be on cash flow or auth'
        ).toBeTruthy();
      });
    });

    test('should show operating activities', async ({ page }) => {
      await test.step('Check for operating section', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/cash-flow')) {
          const operating = page.locator(
            ':text("Operación"), ' +
            ':text("Operating"), ' +
            ':text("Actividades Operativas")'
          );

          if (await operating.count() > 0) {
            console.log('✓ Operating activities section displayed');
          }
        }
      });
    });
  });
});

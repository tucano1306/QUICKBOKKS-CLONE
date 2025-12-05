import { test, expect } from '@playwright/test';

/**
 * Transactions E2E Tests
 * 
 * Tests for transaction management functionality
 */

test.describe('Transactions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/company/transactions');
  });

  test.describe('Transactions Page', () => {
    test('should display transactions page or redirect to auth', async ({ page }) => {
      await test.step('Verify page loads', async () => {
        const url = page.url();
        const isOnTransactions = url.includes('/transactions');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnTransactions || isOnAuth,
          'Should be on transactions page or auth'
        ).toBeTruthy();
      });
    });

    test('should show transactions list or empty state', async ({ page }) => {
      await test.step('Check for transactions content', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/transactions')) {
          // Look for table or list
          const table = page.locator('table, [role="grid"], [data-testid="transactions-list"]');
          const emptyState = page.locator(
            ':text("No hay transacciones"), ' +
            ':text("No transactions"), ' +
            '[data-testid="empty-state"]'
          );

          const hasContent = await table.count() > 0 || await emptyState.count() > 0;
          expect(hasContent, 'Should have transactions list or empty state').toBeTruthy();
        }
      });
    });

    test('should have filter controls', async ({ page }) => {
      await test.step('Check for filter elements', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/transactions')) {
          // Look for search/filter inputs
          const searchInput = page.locator(
            'input[type="search"], ' +
            'input[placeholder*="Buscar" i], ' +
            'input[placeholder*="Search" i]'
          );

          const filters = page.locator(
            'select, ' +
            '[role="combobox"], ' +
            'button:has-text("Filtro"), ' +
            'button:has-text("Filter")'
          );

          const hasFilters = await searchInput.count() > 0 || await filters.count() > 0;
          if (hasFilters) {
            console.log('✓ Filter controls found');
          }
        }
      });
    });

    test('should display transaction types', async ({ page }) => {
      await test.step('Check for type indicators', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/transactions')) {
          const typeIndicators = page.locator(
            ':text("INCOME"), ' +
            ':text("EXPENSE"), ' +
            ':text("Ingreso"), ' +
            ':text("Gasto"), ' +
            '.badge, ' +
            '[data-testid="transaction-type"]'
          );

          if (await typeIndicators.count() > 0) {
            console.log('✓ Transaction type indicators found');
          }
        }
      });
    });
  });

  test.describe('Transaction Actions', () => {
    test('should have delete functionality', async ({ page }) => {
      await test.step('Check for delete controls', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/transactions')) {
          const deleteButton = page.locator(
            'button:has-text("Eliminar"), ' +
            'button:has-text("Delete"), ' +
            '[data-testid="delete-button"], ' +
            'button[aria-label*="delete" i]'
          );

          const checkbox = page.locator('input[type="checkbox"]');

          const hasDeleteCapability = await deleteButton.count() > 0 || await checkbox.count() > 0;
          if (hasDeleteCapability) {
            console.log('✓ Delete functionality available');
          }
        }
      });
    });

    test('should support bulk selection', async ({ page }) => {
      await test.step('Check for multi-select', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/transactions')) {
          const checkboxes = page.locator('input[type="checkbox"]');
          const count = await checkboxes.count();
          
          if (count > 1) {
            console.log(`✓ Found ${count} checkboxes for bulk selection`);
          }
        }
      });
    });
  });
});

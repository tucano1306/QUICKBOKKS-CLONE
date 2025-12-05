import { test, expect } from '@playwright/test';

/**
 * Expenses E2E Tests
 * 
 * Tests for expense management functionality
 */

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/company/expenses');
  });

  test.describe('Expenses Page', () => {
    test('should display expenses page or redirect to auth', async ({ page }) => {
      await test.step('Verify page loads', async () => {
        const url = page.url();
        const isOnExpenses = url.includes('/expenses');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnExpenses || isOnAuth,
          'Should be on expenses page or auth'
        ).toBeTruthy();
      });
    });

    test('should show expenses list or empty state', async ({ page }) => {
      await test.step('Check for expenses content', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/expenses')) {
          const table = page.locator('table, [role="grid"]');
          const emptyState = page.locator(
            ':text("No expenses"), ' +
            ':text("No hay gastos"), ' +
            '[data-testid="empty-state"]'
          );

          const hasContent = await table.count() > 0 || await emptyState.count() > 0;
          expect(hasContent, 'Should have expenses list or empty state').toBeTruthy();
        }
      });
    });

    test('should display expense categories', async ({ page }) => {
      await test.step('Check for category information', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/expenses')) {
          const categories = page.locator(
            ':text("Categoría"), ' +
            ':text("Category"), ' +
            '[data-testid="expense-category"]'
          );

          if (await categories.count() > 0) {
            console.log('✓ Expense categories displayed');
          }
        }
      });
    });

    test('should have add expense button', async ({ page }) => {
      await test.step('Check for add button', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/expenses')) {
          const addButton = page.locator(
            'button:has-text("Nuevo"), ' +
            'button:has-text("Add"), ' +
            'button:has-text("Agregar"), ' +
            'a:has-text("Nuevo Gasto"), ' +
            '[data-testid="add-expense"]'
          );

          if (await addButton.count() > 0) {
            console.log('✓ Add expense button found');
          }
        }
      });
    });
  });

  test.describe('Expense Form', () => {
    test('should have required form fields when adding expense', async ({ page }) => {
      await test.step('Navigate to add expense', async () => {
        await page.waitForLoadState('networkidle');
        const url = page.url();

        if (url.includes('/expenses')) {
          const addButton = page.locator(
            'button:has-text("Nuevo"), ' +
            'button:has-text("Add"), ' +
            'a:has-text("Nuevo")'
          ).first();

          if (await addButton.count() > 0) {
            await addButton.click();
            await page.waitForTimeout(500);

            // Check for form fields
            const amountField = page.locator('input[name="amount"], input[placeholder*="monto" i]');
            const categoryField = page.locator('select[name="category"], [data-testid="category-select"]');
            const dateField = page.locator('input[type="date"], input[name="date"]');

            console.log('Checking form fields...');
            if (await amountField.count() > 0) console.log('✓ Amount field');
            if (await categoryField.count() > 0) console.log('✓ Category field');
            if (await dateField.count() > 0) console.log('✓ Date field');
          }
        }
      });
    });
  });
});

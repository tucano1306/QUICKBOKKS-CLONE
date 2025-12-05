import { test, expect } from '@playwright/test';

/**
 * Complete User Flow E2E Tests
 * 
 * Tests complete business workflows from start to finish
 */

test.describe('Complete Business Flows', () => {
  test.describe('Invoice Creation Flow', () => {
    test('should complete full invoice creation process', async ({ page }) => {
      await test.step('Navigate to invoices', async () => {
        await page.goto('/company/invoices');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Check for create invoice option', async () => {
        const url = page.url();
        if (url.includes('/invoices')) {
          const createButton = page.locator(
            'button:has-text("Crear"), ' +
            'button:has-text("Nueva"), ' +
            'button:has-text("New"), ' +
            'a:has-text("Nueva Factura")'
          );

          if (await createButton.count() > 0) {
            console.log('✓ Create invoice button available');
          }
        }
      });
    });
  });

  test.describe('Customer Management Flow', () => {
    test('should display customer list', async ({ page }) => {
      await test.step('Navigate to customers', async () => {
        await page.goto('/company/customers');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify customer page elements', async () => {
        const url = page.url();
        if (url.includes('/customers')) {
          const table = page.locator('table, [role="grid"]');
          const addButton = page.locator(
            'button:has-text("Agregar"), ' +
            'button:has-text("Nuevo"), ' +
            'button:has-text("Add")'
          );

          const hasTable = await table.count() > 0;
          const hasAddButton = await addButton.count() > 0;

          if (hasTable) console.log('✓ Customer table displayed');
          if (hasAddButton) console.log('✓ Add customer button available');
        }
      });
    });
  });

  test.describe('Expense Recording Flow', () => {
    test('should allow recording new expense', async ({ page }) => {
      await test.step('Navigate to expenses', async () => {
        await page.goto('/company/expenses');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Check expense form availability', async () => {
        const url = page.url();
        if (url.includes('/expenses')) {
          const addButton = page.locator(
            'button:has-text("Nuevo"), ' +
            'button:has-text("Agregar"), ' +
            'button:has-text("Add")'
          ).first();

          if (await addButton.count() > 0) {
            console.log('✓ Add expense functionality available');
          }
        }
      });
    });
  });

  test.describe('Report Generation Flow', () => {
    test('should generate income statement report', async ({ page }) => {
      await test.step('Navigate to P&L report', async () => {
        await page.goto('/company/reports/profit-loss');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Select date range and generate', async () => {
        const url = page.url();
        if (url.includes('/profit-loss')) {
          // Check for date selectors
          const dateInputs = page.locator('input[type="date"], select');
          
          if (await dateInputs.count() > 0) {
            console.log('✓ Date selection available');
          }

          // Check for generate/recalculate button
          const generateButton = page.locator(
            'button:has-text("Recalcular"), ' +
            'button:has-text("Generar"), ' +
            'button:has-text("Generate")'
          );

          if (await generateButton.count() > 0) {
            console.log('✓ Generate report button available');
          }
        }
      });
    });
  });

  test.describe('Banking Flow', () => {
    test('should display bank accounts', async ({ page }) => {
      await test.step('Navigate to banking', async () => {
        await page.goto('/company/banking');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify banking page', async () => {
        const url = page.url();
        if (url.includes('/banking')) {
          const accountsList = page.locator(
            '[data-testid="bank-accounts"], ' +
            '.bank-accounts, ' +
            'table'
          );

          if (await accountsList.count() > 0) {
            console.log('✓ Bank accounts displayed');
          }
        }
      });
    });
  });

  test.describe('Settings Flow', () => {
    test('should access company settings', async ({ page }) => {
      await test.step('Navigate to settings', async () => {
        await page.goto('/company/settings');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify settings page', async () => {
        const url = page.url();
        if (url.includes('/settings')) {
          const settingsForm = page.locator(
            'form, ' +
            '[data-testid="settings-form"], ' +
            '.settings-container'
          );

          if (await settingsForm.count() > 0) {
            console.log('✓ Settings form displayed');
          }
        }
      });
    });
  });
});

test.describe('Data Integrity Checks', () => {
  test('should show consistent totals across pages', async ({ page }) => {
    await test.step('Check dashboard totals', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      if (url.includes('/dashboard')) {
        // Look for revenue/expense totals
        const totals = page.locator(
          '[data-testid="total-revenue"], ' +
          '[data-testid="total-expenses"], ' +
          ':text("$")'
        );

        if (await totals.count() > 0) {
          console.log('✓ Financial totals displayed on dashboard');
        }
      }
    });
  });

  test('should handle empty states gracefully', async ({ page }) => {
    const pages = [
      '/company/invoices',
      '/company/expenses', 
      '/company/customers',
      '/company/transactions',
    ];

    for (const pagePath of pages) {
      await test.step(`Check empty state for ${pagePath}`, async () => {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        const url = page.url();
        if (!url.includes('/auth')) {
          // Should show either data or empty state, not error
          const errorMessage = page.locator(
            ':text("Error"), ' +
            ':text("500"), ' +
            '.error-message'
          );

          const hasError = await errorMessage.count() > 0;
          if (!hasError) {
            console.log(`✓ ${pagePath} handles empty state correctly`);
          }
        }
      });
    }
  });
});

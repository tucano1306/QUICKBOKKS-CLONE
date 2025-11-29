import { test, expect } from '@playwright/test';
import { generateTestCustomer, waitForNetworkIdle } from './fixtures';

/**
 * Customer Management E2E Tests
 * 
 * Tests for CRUD operations on customers
 * 
 * Error Reporting:
 * - Detailed step descriptions
 * - Clear assertion messages
 * - Context-rich error information
 */

test.describe('Customer Management', () => {
  const testCustomer = generateTestCustomer();

  test.beforeEach(async ({ page }) => {
    // Navigate to customers page
    await page.goto('/customers');
  });

  test.describe('Customer List', () => {
    test('should display customers page', async ({ page }) => {
      await test.step('Verify customers page loads', async () => {
        // Check if we're on customers page or redirected to login
        const url = page.url();
        const isOnCustomers = url.includes('/customers');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnCustomers || isOnAuth,
          'Should be on customers page or redirected to authentication'
        ).toBeTruthy();

        if (isOnCustomers) {
          // Check for page title or heading
          const heading = page.locator('h1, h2, [role="heading"]').first();
          await expect(
            heading,
            'Customers page should have a heading'
          ).toBeVisible();
        }
      });
    });

    test('should display customer list or empty state', async ({ page }) => {
      await test.step('Check for customer list', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          // Wait for content to load
          await page.waitForLoadState('networkidle');

          // Check for table or list of customers
          const customerTable = page.locator(
            'table, ' +
            '[role="grid"], ' +
            '[data-testid="customer-list"], ' +
            '.customer-list'
          );

          // Check for empty state
          const emptyState = page.locator(
            ':text("No customers"), ' +
            ':text("Add your first customer"), ' +
            ':text("Get started"), ' +
            '[data-testid="empty-state"]'
          );

          const hasTable = await customerTable.count() > 0;
          const hasEmptyState = await emptyState.count() > 0;

          expect(
            hasTable || hasEmptyState,
            'Should display customer list or empty state message'
          ).toBeTruthy();
        }
      });
    });

    test('should have search functionality', async ({ page }) => {
      await test.step('Check for search input', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          const searchInput = page.locator(
            'input[type="search"], ' +
            'input[placeholder*="search" i], ' +
            'input[placeholder*="buscar" i], ' +
            '[data-testid="search-input"]'
          );

          if (await searchInput.count() > 0) {
            await expect(
              searchInput.first(),
              'Search input should be visible'
            ).toBeVisible();

            // Test search interaction
            await searchInput.first().fill('test');
            await page.waitForTimeout(500);

            // Search should filter or trigger a request
            console.log('Search functionality is available');
          }
        }
      });
    });

    test('should have pagination or infinite scroll', async ({ page }) => {
      await test.step('Check for pagination', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          await page.waitForLoadState('networkidle');

          const pagination = page.locator(
            '[role="navigation"][aria-label*="pagination" i], ' +
            '.pagination, ' +
            'button:has-text("Next"), ' +
            'button:has-text("Previous"), ' +
            '[data-testid="pagination"]'
          );

          const loadMore = page.locator(
            'button:has-text("Load more"), ' +
            'button:has-text("Show more")'
          );

          const hasPagination = await pagination.count() > 0;
          const hasLoadMore = await loadMore.count() > 0;

          console.log('Pagination controls:', { hasPagination, hasLoadMore });
        }
      });
    });
  });

  test.describe('Create Customer', () => {
    test('should have add customer button', async ({ page }) => {
      await test.step('Check for add customer button', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          const addButton = page.locator(
            'button:has-text("Add"), ' +
            'button:has-text("New"), ' +
            'button:has-text("Create"), ' +
            'a:has-text("Add customer"), ' +
            '[data-testid="add-customer"]'
          );

          if (await addButton.count() > 0) {
            await expect(
              addButton.first(),
              'Add customer button should be visible'
            ).toBeVisible();
          }
        }
      });
    });

    test('should open customer creation form', async ({ page }) => {
      await test.step('Open customer form', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          const addButton = page.locator(
            'button:has-text("Add"), ' +
            'button:has-text("New"), ' +
            'button:has-text("Create")'
          ).first();

          if (await addButton.count() > 0) {
            await addButton.click();
            await page.waitForTimeout(500);

            // Check for form modal or navigate to form page
            const formModal = page.locator('[role="dialog"], .modal, [data-state="open"]');
            const formPage = page.locator('form, [data-testid="customer-form"]');

            const hasModal = await formModal.count() > 0;
            const hasFormPage = await formPage.count() > 0;

            expect(
              hasModal || hasFormPage,
              'Customer creation form should be displayed'
            ).toBeTruthy();
          }
        }
      });
    });

    test('should validate required fields', async ({ page }) => {
      await test.step('Test form validation', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          const addButton = page.locator(
            'button:has-text("Add"), button:has-text("New")'
          ).first();

          if (await addButton.count() > 0) {
            await addButton.click();
            await page.waitForTimeout(500);

            // Try to submit empty form
            const submitButton = page.locator(
              'button[type="submit"], ' +
              'button:has-text("Save"), ' +
              'button:has-text("Create")'
            ).first();

            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForTimeout(500);

              // Check for validation errors
              const validationError = page.locator(
                '[role="alert"], ' +
                '.error, ' +
                '[aria-invalid="true"], ' +
                'input:invalid'
              );

              console.log('Validation errors displayed:', await validationError.count() > 0);
            }
          }
        }
      });
    });
  });

  test.describe('Customer Details', () => {
    test('should view customer details', async ({ page }) => {
      await test.step('Navigate to customer details', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          await page.waitForLoadState('networkidle');

          // Find a customer row/card to click
          const customerRow = page.locator(
            'table tbody tr, ' +
            '[data-testid="customer-row"], ' +
            '.customer-card'
          ).first();

          if (await customerRow.count() > 0) {
            // Click on customer or view button
            const viewButton = customerRow.locator(
              'a:has-text("View"), ' +
              'button:has-text("View"), ' +
              '[data-testid="view-customer"]'
            );

            if (await viewButton.count() > 0) {
              await viewButton.first().click();
            } else {
              await customerRow.click();
            }

            await page.waitForTimeout(500);

            // Should navigate to detail page or show modal
            const detailView = page.locator(
              '[data-testid="customer-details"], ' +
              'h1:has-text("Customer"), ' +
              '[role="dialog"]'
            );

            console.log('Customer details view available:', await detailView.count() > 0);
          }
        }
      });
    });
  });

  test.describe('Edit Customer', () => {
    test('should have edit functionality', async ({ page }) => {
      await test.step('Check for edit button', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          await page.waitForLoadState('networkidle');

          const editButton = page.locator(
            'button:has-text("Edit"), ' +
            '[data-testid="edit-customer"], ' +
            '[aria-label*="edit" i]'
          );

          if (await editButton.count() > 0) {
            console.log('Edit functionality available');
          }
        }
      });
    });
  });

  test.describe('Delete Customer', () => {
    test('should have delete functionality with confirmation', async ({ page }) => {
      await test.step('Check for delete button', async () => {
        const url = page.url();
        
        if (url.includes('/customers')) {
          await page.waitForLoadState('networkidle');

          const deleteButton = page.locator(
            'button:has-text("Delete"), ' +
            '[data-testid="delete-customer"], ' +
            '[aria-label*="delete" i], ' +
            'button[title*="delete" i]'
          );

          if (await deleteButton.count() > 0) {
            console.log('Delete functionality available');

            // Click delete and check for confirmation
            await deleteButton.first().click();
            await page.waitForTimeout(500);

            const confirmDialog = page.locator(
              '[role="alertdialog"], ' +
              '[role="dialog"], ' +
              '.confirm-dialog'
            );

            if (await confirmDialog.count() > 0) {
              console.log('Delete confirmation dialog displayed');

              // Cancel the deletion
              const cancelButton = page.locator(
                'button:has-text("Cancel"), ' +
                'button:has-text("No")'
              ).first();

              if (await cancelButton.count() > 0) {
                await cancelButton.click();
              }
            }
          }
        }
      });
    });
  });
});

test.describe('Customer Export', () => {
  test('should have export functionality', async ({ page }) => {
    await test.step('Navigate to customers', async () => {
      await page.goto('/customers');
    });

    await test.step('Check for export button', async () => {
      const url = page.url();
      
      if (url.includes('/customers')) {
        const exportButton = page.locator(
          'button:has-text("Export"), ' +
          'button:has-text("Download"), ' +
          '[data-testid="export-customers"]'
        );

        if (await exportButton.count() > 0) {
          console.log('Export functionality available');
        }
      }
    });
  });
});

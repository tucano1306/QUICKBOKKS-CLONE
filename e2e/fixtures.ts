import { test, expect, Page } from '@playwright/test';

/**
 * Test Fixtures and Helpers
 * 
 * Provides reusable test utilities with clear error reporting
 */

// Extended test with custom fixtures
export const customTest = test.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Setup authenticated session
    await page.goto('/dashboard');
    await use(page);
  },
});

/**
 * Page Object Models
 * 
 * Encapsulate page interactions for cleaner tests
 */

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToDashboard() {
    await this.page.goto('/dashboard');
    await expect(
      this.page,
      'Should navigate to dashboard'
    ).toHaveURL(/.*dashboard/);
  }

  async goToCustomers() {
    await this.page.goto('/customers');
    await expect(
      this.page,
      'Should navigate to customers page'
    ).toHaveURL(/.*customers/);
  }

  async goToInvoices() {
    await this.page.goto('/company/invoices');
    await expect(
      this.page,
      'Should navigate to invoices page'
    ).toHaveURL(/.*invoices/);
  }

  async goToSettings() {
    await this.page.goto('/settings');
    await expect(
      this.page,
      'Should navigate to settings page'
    ).toHaveURL(/.*settings/);
  }
}

export class FormHelper {
  constructor(private page: Page) {}

  async fillInput(selector: string, value: string, description: string) {
    const input = this.page.locator(selector);
    await expect(
      input,
      `Input "${description}" should be visible`
    ).toBeVisible();
    await input.fill(value);
    await expect(
      input,
      `Input "${description}" should have value "${value}"`
    ).toHaveValue(value);
  }

  async selectOption(selector: string, value: string, description: string) {
    const select = this.page.locator(selector);
    await expect(
      select,
      `Select "${description}" should be visible`
    ).toBeVisible();
    await select.selectOption(value);
  }

  async clickButton(selector: string, description: string) {
    const button = this.page.locator(selector);
    await expect(
      button,
      `Button "${description}" should be visible`
    ).toBeVisible();
    await expect(
      button,
      `Button "${description}" should be enabled`
    ).toBeEnabled();
    await button.click();
  }

  async submitForm(submitSelector = 'button[type="submit"]') {
    await this.clickButton(submitSelector, 'Submit button');
  }
}

export class TableHelper {
  constructor(private page: Page, private tableSelector: string) {}

  async getRowCount(): Promise<number> {
    const rows = this.page.locator(`${this.tableSelector} tbody tr`);
    return await rows.count();
  }

  async getRowByText(text: string) {
    return this.page.locator(`${this.tableSelector} tbody tr`).filter({
      hasText: text,
    });
  }

  async clickRowAction(rowText: string, actionText: string) {
    const row = await this.getRowByText(rowText);
    await expect(
      row,
      `Row containing "${rowText}" should exist`
    ).toBeVisible();
    
    const actionButton = row.locator(`button:has-text("${actionText}"), a:has-text("${actionText}")`);
    await expect(
      actionButton,
      `Action "${actionText}" should be available for row "${rowText}"`
    ).toBeVisible();
    await actionButton.click();
  }
}

export class ToastHelper {
  constructor(private page: Page) {}

  async expectSuccess(message?: string) {
    const toast = this.page.locator('[role="alert"], [data-sonner-toast], .toast-success, .Toastify__toast--success');
    await expect(
      toast,
      `Success toast should appear${message ? ` with message: "${message}"` : ''}`
    ).toBeVisible({ timeout: 10000 });
    
    if (message) {
      await expect(
        toast,
        `Toast should contain message: "${message}"`
      ).toContainText(message);
    }
  }

  async expectError(message?: string) {
    const toast = this.page.locator('[role="alert"][data-type="error"], .toast-error, .Toastify__toast--error');
    await expect(
      toast,
      `Error toast should appear${message ? ` with message: "${message}"` : ''}`
    ).toBeVisible({ timeout: 10000 });
    
    if (message) {
      await expect(
        toast,
        `Error toast should contain: "${message}"`
      ).toContainText(message);
    }
  }
}

export class ModalHelper {
  constructor(private page: Page) {}

  async waitForModal() {
    const modal = this.page.locator('[role="dialog"], [data-state="open"], .modal');
    await expect(
      modal,
      'Modal should be visible'
    ).toBeVisible({ timeout: 5000 });
    return modal;
  }

  async confirmModal() {
    const modal = await this.waitForModal();
    const confirmButton = modal.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK"), button:has-text("Delete")');
    await expect(
      confirmButton,
      'Confirm button should be visible in modal'
    ).toBeVisible();
    await confirmButton.click();
  }

  async cancelModal() {
    const modal = await this.waitForModal();
    const cancelButton = modal.locator('button:has-text("Cancel"), button:has-text("No"), button:has-text("Close")');
    await expect(
      cancelButton,
      'Cancel button should be visible in modal'
    ).toBeVisible();
    await cancelButton.click();
  }

  async closeModal() {
    const closeButton = this.page.locator('[data-state="open"] button[aria-label="Close"], .modal-close, button:has-text("×")');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try pressing Escape
      await this.page.keyboard.press('Escape');
    }
  }
}

/**
 * Error Reporting Utilities
 */

export async function withErrorContext<T>(
  description: string,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const enhancedError = new Error(
      `\n` +
      `╔══════════════════════════════════════════════════════════════════╗\n` +
      `║ TEST FAILURE                                                      ║\n` +
      `╠══════════════════════════════════════════════════════════════════╣\n` +
      `║ Context: ${description.padEnd(56)}║\n` +
      `║ Error: ${String(error).slice(0, 55).padEnd(57)}║\n` +
      `╚══════════════════════════════════════════════════════════════════╝\n`
    );
    throw enhancedError;
  }
}

export async function assertWithDetails(
  page: Page,
  condition: boolean,
  message: string,
  details?: Record<string, unknown>
) {
  if (!condition) {
    const screenshot = await page.screenshot();
    const detailsStr = details ? JSON.stringify(details, null, 2) : 'N/A';
    throw new Error(
      `Assertion failed: ${message}\n` +
      `Additional details: ${detailsStr}\n` +
      `Current URL: ${page.url()}`
    );
  }
}

/**
 * Wait Utilities
 */

export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Data Generation
 */

export function generateTestCustomer() {
  const timestamp = Date.now();
  return {
    name: `Test Customer ${timestamp}`,
    email: `test.customer.${timestamp}@example.com`,
    phone: '305-555-0100',
    address: '123 Test Street',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    country: 'USA',
  };
}

export function generateTestInvoice() {
  const timestamp = Date.now();
  return {
    invoiceNumber: `INV-${timestamp}`,
    amount: 1000.00,
    taxRate: 7.0, // Florida sales tax
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

export function generateTestProduct() {
  const timestamp = Date.now();
  return {
    name: `Test Product ${timestamp}`,
    sku: `SKU-${timestamp}`,
    price: 99.99,
    quantity: 100,
    description: 'Test product for E2E testing',
  };
}

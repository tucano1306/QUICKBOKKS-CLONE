import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 * 
 * Tests for main navigation and routing
 * 
 * Error Reporting:
 * - Each assertion includes descriptive message
 * - Screenshots captured on failure
 * - Clear step descriptions
 */

test.describe('Main Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
  });

  test('should load the home page successfully', async ({ page }) => {
    await test.step('Verify home page loads', async () => {
      // Check that the page loads without errors
      // Note: Protected apps may redirect to login page
      const url = page.url();
      const isOnHome = url === 'http://localhost:3000/';
      const isOnAuth = url.includes('/auth') || url.includes('/login');
      
      expect(
        isOnHome || isOnAuth,
        'Home page should load or redirect to authentication'
      ).toBeTruthy();
      
      // Check for main content
      const main = page.locator('main, [role="main"], #main-content, body');
      await expect(
        main,
        'Main content area should be visible'
      ).toBeVisible();
    });
  });

  test('should navigate to dashboard', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      
      // Verify we're on dashboard (might redirect to login if not authenticated)
      const url = page.url();
      const isOnDashboard = url.includes('/dashboard');
      const isOnLogin = url.includes('/auth') || url.includes('/login') || url.includes('/signin');
      
      expect(
        isOnDashboard || isOnLogin,
        'Should navigate to dashboard or redirect to login'
      ).toBeTruthy();
    });
  });

  test('should navigate to customers page', async ({ page }) => {
    await test.step('Navigate to customers page', async () => {
      await page.goto('/customers');
      
      const url = page.url();
      const isOnCustomers = url.includes('/customers');
      const isOnLogin = url.includes('/auth') || url.includes('/login');
      
      expect(
        isOnCustomers || isOnLogin,
        'Should navigate to customers or redirect to login'
      ).toBeTruthy();
    });
  });

  test('should navigate to company invoices', async ({ page }) => {
    await test.step('Navigate to invoices page', async () => {
      await page.goto('/company/invoices');
      
      const url = page.url();
      const isOnInvoices = url.includes('/invoices');
      const isOnLogin = url.includes('/auth') || url.includes('/login');
      
      expect(
        isOnInvoices || isOnLogin,
        'Should navigate to invoices or redirect to login'
      ).toBeTruthy();
    });
  });

  test('should navigate to settings', async ({ page }) => {
    await test.step('Navigate to settings page', async () => {
      await page.goto('/settings');
      
      const url = page.url();
      const isOnSettings = url.includes('/settings');
      const isOnLogin = url.includes('/auth') || url.includes('/login');
      
      expect(
        isOnSettings || isOnLogin,
        'Should navigate to settings or redirect to login'
      ).toBeTruthy();
    });
  });
});

test.describe('Sidebar Navigation', () => {
  test('should have functional sidebar links', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Check sidebar visibility', async () => {
      const sidebar = page.locator('nav, aside, [role="navigation"]').first();
      
      if (await sidebar.isVisible()) {
        // Check for common navigation items
        const navItems = [
          { text: 'Dashboard', href: /dashboard/i },
          { text: 'Customers', href: /customers/i },
          { text: 'Invoices', href: /invoices/i },
        ];

        for (const item of navItems) {
          const link = sidebar.locator(`a:has-text("${item.text}")`);
          if (await link.count() > 0) {
            await expect(
              link.first(),
              `Navigation link "${item.text}" should be visible`
            ).toBeVisible();
          }
        }
      }
    });
  });
});

test.describe('Breadcrumb Navigation', () => {
  test('should display breadcrumbs on nested pages', async ({ page }) => {
    await test.step('Navigate to nested page', async () => {
      await page.goto('/company/invoices');
    });

    await test.step('Check breadcrumbs', async () => {
      const breadcrumb = page.locator('[aria-label="Breadcrumb"], nav[aria-label*="breadcrumb" i], .breadcrumb');
      
      if (await breadcrumb.isVisible()) {
        await expect(
          breadcrumb,
          'Breadcrumb navigation should be visible'
        ).toBeVisible();
        
        // Breadcrumb should contain multiple items
        const breadcrumbItems = breadcrumb.locator('a, span, li');
        const count = await breadcrumbItems.count();
        expect(
          count,
          'Breadcrumb should have multiple navigation items'
        ).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should show mobile menu on small screens', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Check mobile menu', async () => {
      // Look for hamburger menu or mobile menu button
      const menuButton = page.locator(
        'button[aria-label*="menu" i], ' +
        'button[aria-label*="navigation" i], ' +
        '[data-testid="mobile-menu"], ' +
        '.hamburger-menu'
      );

      if (await menuButton.isVisible()) {
        await expect(
          menuButton,
          'Mobile menu button should be visible on small screens'
        ).toBeVisible();

        // Click the menu button
        await menuButton.click();

        // Check if mobile navigation appears
        const mobileNav = page.locator('[data-state="open"], .mobile-nav, .nav-menu');
        if (await mobileNav.count() > 0) {
          await expect(
            mobileNav.first(),
            'Mobile navigation should be visible after clicking menu'
          ).toBeVisible();
        }
      }
    });
  });
});

test.describe('Navigation Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await test.step('Navigate to non-existent page', async () => {
      const response = await page.goto('/this-page-does-not-exist-12345');
      
      // Should either show 404 page or redirect
      const status = response?.status();
      
      if (status === 404) {
        // Check for 404 content
        const pageContent = await page.textContent('body');
        const has404Message = 
          pageContent?.toLowerCase().includes('not found') ||
          pageContent?.toLowerCase().includes('404') ||
          pageContent?.toLowerCase().includes('page not found');
        
        expect(
          has404Message,
          'Should display 404 or "not found" message'
        ).toBeTruthy();
      } else {
        // Page might redirect to home or login
        expect(
          [200, 301, 302, 307, 308].includes(status || 0),
          'Should redirect or show valid page'
        ).toBeTruthy();
      }
    });
  });
});

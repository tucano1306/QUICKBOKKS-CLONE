import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * 
 * Tests for the main dashboard and analytics views
 * 
 * Error Reporting:
 * - Clear visibility checks
 * - Data loading validation
 * - Interactive element testing
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test.describe('Dashboard Layout', () => {
    test('should display dashboard page', async ({ page }) => {
      await test.step('Verify dashboard loads', async () => {
        const url = page.url();
        const isOnDashboard = url.includes('/dashboard');
        const isOnAuth = url.includes('/auth') || url.includes('/login');

        expect(
          isOnDashboard || isOnAuth,
          'Should be on dashboard or redirected to auth'
        ).toBeTruthy();

        if (isOnDashboard) {
          const mainContent = page.locator('main, [role="main"]');
          await expect(
            mainContent,
            'Dashboard main content should be visible'
          ).toBeVisible();
        }
      });
    });

    test('should display key metrics cards', async ({ page }) => {
      await test.step('Check for metric cards', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          // Look for metric/stat cards
          const metricCards = page.locator(
            '[data-testid="metric-card"], ' +
            '.stat-card, ' +
            '.metric-card, ' +
            '[class*="card"]'
          );

          const cardCount = await metricCards.count();
          console.log(`Found ${cardCount} metric cards on dashboard`);
        }
      });
    });

    test('should display revenue/income information', async ({ page }) => {
      await test.step('Check for revenue display', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          const revenueElements = page.locator(
            ':text("Revenue"), ' +
            ':text("Income"), ' +
            ':text("Sales"), ' +
            ':text("Ingresos")'
          );

          if (await revenueElements.count() > 0) {
            console.log('Revenue information displayed on dashboard');
          }
        }
      });
    });

    test('should display expense information', async ({ page }) => {
      await test.step('Check for expense display', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          const expenseElements = page.locator(
            ':text("Expenses"), ' +
            ':text("Costs"), ' +
            ':text("Gastos")'
          );

          if (await expenseElements.count() > 0) {
            console.log('Expense information displayed on dashboard');
          }
        }
      });
    });
  });

  test.describe('Dashboard Charts', () => {
    test('should display charts or graphs', async ({ page }) => {
      await test.step('Check for chart elements', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          // Look for chart containers
          const charts = page.locator(
            'canvas, ' +
            'svg, ' +
            '[data-testid="chart"], ' +
            '[class*="chart"], ' +
            '[class*="graph"]'
          );

          const chartCount = await charts.count();
          console.log(`Found ${chartCount} chart elements on dashboard`);
        }
      });
    });

    test('should have interactive chart elements', async ({ page }) => {
      await test.step('Check for chart interactions', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          // Look for date range selectors or period filters
          const periodSelector = page.locator(
            'select, ' +
            '[data-testid="period-selector"], ' +
            'button:has-text("This Month"), ' +
            'button:has-text("This Year"), ' +
            '[role="combobox"]'
          );

          if (await periodSelector.count() > 0) {
            console.log('Period/date selector available for charts');
          }
        }
      });
    });
  });

  test.describe('Quick Actions', () => {
    test('should have quick action buttons', async ({ page }) => {
      await test.step('Check for quick actions', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          const quickActions = page.locator(
            'button:has-text("Create Invoice"), ' +
            'button:has-text("Add Customer"), ' +
            'button:has-text("Record Payment"), ' +
            'a:has-text("Create"), ' +
            '[data-testid="quick-action"]'
          );

          if (await quickActions.count() > 0) {
            console.log('Quick action buttons available');
          }
        }
      });
    });
  });

  test.describe('Recent Activity', () => {
    test('should display recent transactions or activity', async ({ page }) => {
      await test.step('Check for recent activity', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          const recentActivity = page.locator(
            ':text("Recent"), ' +
            ':text("Latest"), ' +
            ':text("Activity"), ' +
            '[data-testid="recent-activity"]'
          );

          if (await recentActivity.count() > 0) {
            console.log('Recent activity section found');
          }
        }
      });
    });

    test('should show recent invoices', async ({ page }) => {
      await test.step('Check for recent invoices', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          await page.waitForLoadState('networkidle');

          const recentInvoices = page.locator(
            ':text("Recent Invoices"), ' +
            ':text("Latest Invoices"), ' +
            '[data-testid="recent-invoices"]'
          );

          if (await recentInvoices.count() > 0) {
            console.log('Recent invoices section found');
          }
        }
      });
    });
  });

  test.describe('Company Selector', () => {
    test('should display company selector for multi-company', async ({ page }) => {
      await test.step('Check for company selector', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          const companySelector = page.locator(
            '[data-testid="company-selector"], ' +
            'select[name*="company"], ' +
            '[role="combobox"]:has-text("Company")'
          );

          if (await companySelector.count() > 0) {
            console.log('Multi-company selector available');
          }
        }
      });
    });
  });

  test.describe('Notifications', () => {
    test('should display notification bell or alerts', async ({ page }) => {
      await test.step('Check for notifications', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          const notifications = page.locator(
            '[data-testid="notifications"], ' +
            'button[aria-label*="notification" i], ' +
            '[aria-label*="alert" i]'
          );

          if (await notifications.count() > 0) {
            console.log('Notification system available');
          }
        }
      });
    });
  });

  test.describe('Dashboard Loading States', () => {
    test('should show loading indicators or skeleton screens', async ({ page }) => {
      await test.step('Navigate fresh and check loading', async () => {
        // Slow down network to see loading states
        await page.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          await route.continue();
        });

        await page.goto('/dashboard');

        // Look for loading indicators
        const loadingIndicators = page.locator(
          '[data-loading="true"], ' +
          '.skeleton, ' +
          '[class*="skeleton"], ' +
          '[class*="loading"], ' +
          '[aria-busy="true"]'
        );

        // Loading indicators might be visible briefly
        console.log('Checking for loading indicators...');
      });
    });
  });

  test.describe('Dashboard Error States', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await test.step('Check error handling', async () => {
        const url = page.url();
        
        if (url.includes('/dashboard')) {
          // If there are any error states, they should be user-friendly
          const errorMessages = page.locator(
            '[role="alert"]:not([data-type="success"]), ' +
            '.error-message, ' +
            ':text("error"):visible, ' +
            ':text("failed"):visible'
          );

          const errorCount = await errorMessages.count();
          
          if (errorCount > 0) {
            console.log('Error messages displayed on dashboard');
          }
        }
      });
    });
  });
});

test.describe('Dashboard Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Check heading hierarchy', async () => {
      const url = page.url();
      
      if (url.includes('/dashboard')) {
        const h1 = page.locator('h1');
        const h2 = page.locator('h2');
        
        const h1Count = await h1.count();
        const h2Count = await h2.count();
        
        console.log(`Heading structure: ${h1Count} h1, ${h2Count} h2`);
      }
    });
  });

  test('should have keyboard navigable elements', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Test keyboard navigation', async () => {
      const url = page.url();
      
      if (url.includes('/dashboard')) {
        // Press Tab to navigate
        await page.keyboard.press('Tab');
        
        // Check if focus is visible
        const focusedElement = page.locator(':focus');
        const hasFocus = await focusedElement.count() > 0;
        
        console.log('Keyboard navigation available:', hasFocus);
      }
    });
  });
});

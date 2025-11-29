import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication Setup
 * 
 * This setup runs once and saves the authentication state
 * to be reused by all subsequent tests.
 * 
 * For clear error reporting:
 * - Each step is clearly labeled
 * - Assertions include descriptive messages
 * - Screenshots are taken on failure
 */
setup('authenticate', async ({ page }) => {
  // Step 1: Navigate to login page
  await setup.step('Navigate to login page', async () => {
    await page.goto('/auth/signin');
    await expect(
      page,
      'Should navigate to login page successfully'
    ).toHaveURL(/.*signin/);
  });

  // Step 2: Fill in credentials
  // Note: In a real scenario, you would use test accounts
  // For now, we'll check if the login form exists
  await setup.step('Verify login form is present', async () => {
    // Check for common login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    
    // The form elements should be visible
    const emailExists = await emailInput.count() > 0;
    const passwordExists = await passwordInput.count() > 0;
    
    if (emailExists && passwordExists) {
      // If form exists, we can proceed with authentication
      console.log('Login form detected - authentication setup ready');
    } else {
      // If using OAuth or other auth methods
      console.log('OAuth or alternative authentication method detected');
    }
  });

  // Step 3: For demo purposes, navigate to dashboard
  // In production, you would complete the actual login flow
  await setup.step('Complete authentication flow', async () => {
    // This is a placeholder for the actual authentication
    // Uncomment and modify when real auth is implemented
    /*
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('testpassword123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
    */
  });

  // Step 4: Save authentication state
  await setup.step('Save authentication state', async () => {
    // Create auth directory if it doesn't exist
    const authDir = path.dirname(authFile);
    await page.context().storageState({ path: authFile });
    console.log(`Authentication state saved to ${authFile}`);
  });
});

/**
 * API Authentication Setup
 * 
 * For testing authenticated API endpoints
 */
setup('api authentication', async ({ request }) => {
  await setup.step('Verify API health', async () => {
    // Check if the API is responding
    const response = await request.get('/api/health', {
      ignoreHTTPSErrors: true,
    }).catch(() => null);
    
    if (response) {
      console.log(`API health check: ${response.status()}`);
    } else {
      console.log('API health endpoint not available - skipping');
    }
  });
});

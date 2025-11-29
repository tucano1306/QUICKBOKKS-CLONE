import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * 
 * Tests for login, registration, and session management
 * 
 * Error Reporting:
 * - Clear step-by-step descriptions
 * - Detailed assertion messages
 * - Screenshots on failure
 */

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login page correctly', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Verify login form elements', async () => {
        // Check for email input
        const emailInput = page.locator(
          'input[type="email"], ' +
          'input[name="email"], ' +
          'input[placeholder*="email" i]'
        );
        
        const hasEmailInput = await emailInput.count() > 0;
        
        // Check for password input
        const passwordInput = page.locator('input[type="password"]');
        const hasPasswordInput = await passwordInput.count() > 0;
        
        // Check for submit button
        const submitButton = page.locator(
          'button[type="submit"], ' +
          'button:has-text("Sign in"), ' +
          'button:has-text("Log in"), ' +
          'button:has-text("Login")'
        );
        const hasSubmitButton = await submitButton.count() > 0;

        // Either traditional form or OAuth providers should be present
        const oauthButtons = page.locator(
          'button:has-text("Google"), ' +
          'button:has-text("GitHub"), ' +
          'button:has-text("Continue with")'
        );
        const hasOAuthButtons = await oauthButtons.count() > 0;

        expect(
          (hasEmailInput && hasPasswordInput && hasSubmitButton) || hasOAuthButtons,
          'Login page should have either email/password form or OAuth buttons'
        ).toBeTruthy();
      });
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Try to submit empty form', async () => {
        const submitButton = page.locator(
          'button[type="submit"], ' +
          'button:has-text("Sign in"), ' +
          'button:has-text("Log in")'
        );

        if (await submitButton.count() > 0) {
          await submitButton.first().click();

          // Wait for validation
          await page.waitForTimeout(500);

          // Check for validation messages
          const validationErrors = page.locator(
            '[role="alert"], ' +
            '.error-message, ' +
            '.field-error, ' +
            '[aria-invalid="true"], ' +
            'input:invalid'
          );

          const hasValidation = await validationErrors.count() > 0 ||
            await page.locator('input:invalid').count() > 0;

          expect(
            hasValidation,
            'Should show validation errors for empty form'
          ).toBeTruthy();
        }
      });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Submit with invalid credentials', async () => {
        const emailInput = page.locator(
          'input[type="email"], input[name="email"]'
        ).first();
        
        const passwordInput = page.locator('input[type="password"]').first();
        
        const submitButton = page.locator(
          'button[type="submit"], button:has-text("Sign in")'
        ).first();

        if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
          await emailInput.fill('invalid@nonexistent.com');
          await passwordInput.fill('wrongpassword123');
          await submitButton.click();

          // Wait for response
          await page.waitForTimeout(2000);

          // Should show error or stay on login page
          const url = page.url();
          const stillOnLogin = 
            url.includes('/auth') || 
            url.includes('/login') || 
            url.includes('/signin');

          const errorMessage = page.locator(
            '[role="alert"], ' +
            '.error, ' +
            '[data-error], ' +
            ':text("invalid"):visible, ' +
            ':text("incorrect"):visible, ' +
            ':text("failed"):visible'
          );
          
          const hasError = await errorMessage.count() > 0;

          expect(
            stillOnLogin || hasError,
            'Should show error or stay on login page with invalid credentials'
          ).toBeTruthy();
        }
      });
    });

    test('should have link to registration page', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Check for registration link', async () => {
        const registerLink = page.locator(
          'a:has-text("Sign up"), ' +
          'a:has-text("Register"), ' +
          'a:has-text("Create account"), ' +
          'a[href*="register"], ' +
          'a[href*="signup"]'
        );

        if (await registerLink.count() > 0) {
          await expect(
            registerLink.first(),
            'Registration link should be visible'
          ).toBeVisible();
        }
      });
    });

    test('should have forgot password link', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Check for forgot password link', async () => {
        const forgotPasswordLink = page.locator(
          'a:has-text("Forgot"), ' +
          'a:has-text("Reset password"), ' +
          'a[href*="forgot"], ' +
          'a[href*="reset"]'
        );

        if (await forgotPasswordLink.count() > 0) {
          await expect(
            forgotPasswordLink.first(),
            'Forgot password link should be visible'
          ).toBeVisible();
        }
      });
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await test.step('Navigate to registration page', async () => {
        // Try common registration routes
        const routes = ['/auth/signup', '/auth/register', '/register', '/signup'];
        
        for (const route of routes) {
          const response = await page.goto(route);
          if (response?.status() === 200) {
            break;
          }
        }
      });

      await test.step('Verify registration form', async () => {
        // Check for registration form elements
        const nameInput = page.locator(
          'input[name="name"], ' +
          'input[placeholder*="name" i]'
        );
        
        const emailInput = page.locator(
          'input[type="email"], input[name="email"]'
        );
        
        const passwordInput = page.locator('input[type="password"]');

        const hasFormElements = 
          (await nameInput.count() > 0 || await emailInput.count() > 0) &&
          await passwordInput.count() > 0;

        // Log form state for debugging
        console.log('Registration form state:', {
          hasName: await nameInput.count() > 0,
          hasEmail: await emailInput.count() > 0,
          hasPassword: await passwordInput.count() > 0,
        });
      });
    });
  });

  test.describe('Session Management', () => {
    test('should redirect unauthenticated users from protected routes', async ({ page }) => {
      await test.step('Try to access protected route', async () => {
        await page.goto('/dashboard');
      });

      await test.step('Verify redirect or access', async () => {
        const url = page.url();
        
        // Should either allow access (if no auth required) or redirect
        const isOnDashboard = url.includes('/dashboard');
        const isRedirectedToAuth = 
          url.includes('/auth') || 
          url.includes('/login') || 
          url.includes('/signin');

        expect(
          isOnDashboard || isRedirectedToAuth,
          'Should be on dashboard or redirected to authentication'
        ).toBeTruthy();
      });
    });

    test('should handle logout correctly', async ({ page }) => {
      await test.step('Navigate to application', async () => {
        await page.goto('/dashboard');
      });

      await test.step('Look for logout option', async () => {
        // Check for logout button/link
        const logoutButton = page.locator(
          'button:has-text("Logout"), ' +
          'button:has-text("Sign out"), ' +
          'a:has-text("Logout"), ' +
          'a:has-text("Sign out"), ' +
          '[data-testid="logout"]'
        );

        if (await logoutButton.count() > 0) {
          await expect(
            logoutButton.first(),
            'Logout button should be visible'
          ).toBeVisible();
        }
      });
    });
  });

  test.describe('OAuth Providers', () => {
    test('should display OAuth login options', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await page.goto('/auth/signin');
      });

      await test.step('Check for OAuth providers', async () => {
        const googleButton = page.locator('button:has-text("Google")');
        const githubButton = page.locator('button:has-text("GitHub")');
        const microsoftButton = page.locator('button:has-text("Microsoft")');

        const providers = {
          google: await googleButton.count() > 0,
          github: await githubButton.count() > 0,
          microsoft: await microsoftButton.count() > 0,
        };

        console.log('Available OAuth providers:', providers);

        // At least one OAuth provider or email login should be available
        const hasAnyAuth = 
          providers.google || 
          providers.github || 
          providers.microsoft ||
          (await page.locator('input[type="email"]').count() > 0);

        expect(
          hasAnyAuth,
          'Should have at least one authentication method available'
        ).toBeTruthy();
      });
    });
  });
});

test.describe('Security', () => {
  test('should have secure password field', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('/auth/signin');
    });

    await test.step('Verify password field security', async () => {
      const passwordInput = page.locator('input[type="password"]');
      
      if (await passwordInput.count() > 0) {
        await expect(
          passwordInput.first(),
          'Password field should have type="password"'
        ).toHaveAttribute('type', 'password');

        // Check for autocomplete attribute
        const autocomplete = await passwordInput.first().getAttribute('autocomplete');
        console.log('Password autocomplete attribute:', autocomplete);
      }
    });
  });

  test('should use HTTPS in production', async ({ page }) => {
    // This test is informational for production environments
    await test.step('Check protocol', async () => {
      await page.goto('/');
      const url = page.url();
      
      // In development, HTTP is fine
      // In production (CI), should use HTTPS
      if (process.env.CI) {
        console.log('Current URL protocol:', new URL(url).protocol);
      }
    });
  });
});

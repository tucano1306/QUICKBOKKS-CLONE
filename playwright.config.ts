import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * 
 * QuickBooks Clone - Florida/Miami USA
 * 
 * Run all tests: npx playwright test
 * Run in UI mode: npx playwright test --ui
 * Run specific test: npx playwright test auth.spec.ts
 * Generate report: npx playwright show-report
 */

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Parallel execution
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter - detailed for local, CI-friendly for pipelines
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    // Detailed error reporting
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Global timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on first retry
    video: 'on-first-retry',
    
    // Browser context options
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Locale settings for Florida/USA
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs auth setup before tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Tablet viewport
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',
});

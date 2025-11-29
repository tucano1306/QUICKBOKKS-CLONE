# E2E Testing with Playwright

## Overview

This document describes the End-to-End (E2E) testing setup for the QuickBooks Clone application using Playwright.

## Installation

Playwright and browser engines are already installed. To reinstall browsers:

```bash
npx playwright install
```

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Browser
```bash
npm run test:e2e:chromium   # Chromium only
npm run test:e2e:firefox    # Firefox only
npm run test:e2e:webkit     # WebKit/Safari only
npm run test:e2e:mobile     # Mobile viewports
```

### Interactive Mode
```bash
npm run test:e2e:ui         # Opens Playwright UI
npm run test:e2e:debug      # Debug mode with breakpoints
npm run test:e2e:headed     # See browsers in action
```

### View Reports
```bash
npm run test:e2e:report     # Opens HTML report
```

### Run All Tests (Jest + Playwright)
```bash
npm run test:all
```

## Test Structure

```
e2e/
├── auth.setup.ts        # Authentication setup (runs first)
├── fixtures.ts          # Reusable helpers and page objects
├── auth.spec.ts         # Authentication flow tests
├── navigation.spec.ts   # Navigation and routing tests
├── customers.spec.ts    # Customer CRUD tests
├── invoices.spec.ts     # Invoice management tests
├── dashboard.spec.ts    # Dashboard feature tests
├── api.spec.ts          # API endpoint tests
└── critical-flows.spec.ts # End-to-end user journeys
```

## Test Categories

### 1. Authentication Tests (`auth.spec.ts`)
- Login page display
- Form validation
- OAuth providers
- Session management
- Security checks

### 2. Navigation Tests (`navigation.spec.ts`)
- Main navigation
- Sidebar links
- Breadcrumbs
- Mobile navigation
- 404 handling

### 3. Customer Tests (`customers.spec.ts`)
- Customer list display
- Create customer
- Edit customer
- Delete with confirmation
- Search and pagination
- Export functionality

### 4. Invoice Tests (`invoices.spec.ts`)
- Invoice list
- Create invoice
- Florida tax compliance (7% sales tax)
- Invoice actions (send, download, mark paid)
- Recurring invoices

### 5. Dashboard Tests (`dashboard.spec.ts`)
- Layout and metrics
- Charts and graphs
- Quick actions
- Recent activity
- Company selector
- Accessibility

### 6. API Tests (`api.spec.ts`)
- Health check endpoints
- Customer API
- Invoice API
- Authentication API
- Error handling
- Rate limiting
- Data validation

### 7. Critical Flows (`critical-flows.spec.ts`)
- Invoice creation journey
- Customer management flow
- Dashboard overview
- Settings navigation
- Search and filter
- Error recovery
- Multi-company switching
- Responsive layout
- Accessibility (keyboard navigation)

## Configuration

### Browser Projects

| Project | Description |
|---------|-------------|
| chromium | Desktop Chrome |
| firefox | Desktop Firefox |
| webkit | Desktop Safari |
| mobile-chrome | Pixel 5 viewport |
| mobile-safari | iPhone 12 viewport |
| tablet | iPad viewport |

### Settings

- **Base URL**: `http://localhost:3000`
- **Timeout**: 30 seconds
- **Locale**: `en-US`
- **Timezone**: `America/New_York` (Florida)
- **Screenshot**: On failure only
- **Video**: On first retry
- **Trace**: On first retry

## Error Reporting

Tests are designed with clear, actionable error messages:

```typescript
await expect(
  page,
  'Customer page should load or redirect to authentication'
).toHaveURL(/customers|auth/);
```

Each assertion includes:
- Descriptive message
- Expected vs actual values
- Screenshots on failure
- Error context files

## Fixtures and Helpers

### Page Objects
- `NavigationHelper` - Navigation utilities
- `FormHelper` - Form interactions
- `TableHelper` - Table operations
- `ToastHelper` - Toast notifications
- `ModalHelper` - Modal interactions

### Test Data Generators
- `generateTestCustomer()` - Random customer data
- `generateTestInvoice()` - Invoice with Florida tax
- `generateTestProduct()` - Product with SKU

### Utility Functions
- `withErrorContext()` - Enhanced error reporting
- `waitForNetworkIdle()` - Network state waiting
- `waitForApiResponse()` - API response waiting

## Best Practices

1. **Use test.step()** for clear step documentation
2. **Include descriptive assertion messages**
3. **Handle auth redirects gracefully**
4. **Check for both success and auth redirect states**
5. **Use page objects for reusable interactions**
6. **Generate unique test data with timestamps**

## CI/CD Integration

For CI environments, set:
```bash
CI=true npm run test:e2e
```

This enables:
- Single worker execution
- 2 retries on failure
- JSON report output
- No server reuse

## Test Count

- **Total Tests**: 548
- **Test Files**: 8
- **Browser Projects**: 6

Each test runs across all 6 browser projects, giving comprehensive cross-browser coverage.

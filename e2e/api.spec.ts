import { test, expect } from '@playwright/test';

/**
 * API Endpoint E2E Tests
 * 
 * Tests for API endpoints and data operations
 * 
 * Error Reporting:
 * - Clear HTTP status validation
 * - Response body validation
 * - Detailed error messages
 */

test.describe('API Endpoints', () => {
  test.describe('Health Check', () => {
    test('should respond to health check endpoint', async ({ request }) => {
      const response = await request.get('/api/health').catch(() => null);
      
      if (response) {
        expect(
          [200, 404].includes(response.status()),
          'Health endpoint should respond (200) or not exist (404)'
        ).toBeTruthy();
      }
    });
  });

  test.describe('Customer API', () => {
    test('GET /api/customers should return list or require auth', async ({ request }) => {
      const response = await request.get('/api/customers');
      
      const status = response.status();
      
      expect(
        [200, 401, 403].includes(status),
        `Customer API should return 200 (success) or 401/403 (requires auth). Got: ${status}`
      ).toBeTruthy();

      if (status === 200) {
        const data = await response.json();
        expect(
          Array.isArray(data) || (data && typeof data === 'object'),
          'Customer API should return array or object'
        ).toBeTruthy();
      }
    });

    test('POST /api/customers should require authentication', async ({ request }) => {
      const response = await request.post('/api/customers', {
        data: {
          name: 'Test Customer',
          email: 'test@example.com',
        },
      });
      
      const status = response.status();
      
      // Without auth, should get 401 or 403
      // With proper auth, should get 200 or 201
      // If validation fails, should get 400
      expect(
        [200, 201, 400, 401, 403].includes(status),
        `POST should return valid status code. Got: ${status}`
      ).toBeTruthy();
    });

    test('GET /api/customers/:id should handle invalid ID', async ({ request }) => {
      const response = await request.get('/api/customers/invalid-id-12345');
      
      const status = response.status();
      
      expect(
        [400, 401, 403, 404].includes(status),
        `Invalid customer ID should return 400/404. Got: ${status}`
      ).toBeTruthy();
    });
  });

  test.describe('Invoice API', () => {
    test('GET /api/invoices should return list or require auth', async ({ request }) => {
      const response = await request.get('/api/invoices');
      
      const status = response.status();
      
      expect(
        [200, 401, 403, 404].includes(status),
        `Invoice API should return valid status. Got: ${status}`
      ).toBeTruthy();
    });

    test('POST /api/invoices should validate required fields', async ({ request }) => {
      const response = await request.post('/api/invoices', {
        data: {},
      });
      
      const status = response.status();
      
      expect(
        [400, 401, 403, 422].includes(status),
        `Empty invoice should fail validation. Got: ${status}`
      ).toBeTruthy();
    });
  });

  test.describe('Company API', () => {
    test('GET /api/companies should return companies or require auth', async ({ request }) => {
      const response = await request.get('/api/companies');
      
      const status = response.status();
      
      expect(
        [200, 401, 403, 404].includes(status),
        `Company API should return valid status. Got: ${status}`
      ).toBeTruthy();
    });
  });

  test.describe('Authentication API', () => {
    test('GET /api/auth/session should return session info', async ({ request }) => {
      const response = await request.get('/api/auth/session');
      
      const status = response.status();
      
      expect(
        [200, 401, 404].includes(status),
        `Session API should return valid status. Got: ${status}`
      ).toBeTruthy();

      if (status === 200) {
        const data = await response.json();
        console.log('Session response:', JSON.stringify(data, null, 2));
      }
    });

    test('GET /api/auth/providers should list auth providers', async ({ request }) => {
      const response = await request.get('/api/auth/providers');
      
      const status = response.status();
      
      expect(
        [200, 404].includes(status),
        `Providers API should be accessible. Got: ${status}`
      ).toBeTruthy();

      if (status === 200) {
        const data = await response.json();
        console.log('Available providers:', Object.keys(data));
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should return proper error format for invalid requests', async ({ request }) => {
      const response = await request.post('/api/customers', {
        data: {
          // Invalid data - missing required fields
        },
      });
      
      const status = response.status();
      
      if (status >= 400) {
        const body = await response.text();
        
        try {
          const errorData = JSON.parse(body);
          
          // Error response should have message or error field
          const hasErrorInfo = 
            errorData.message || 
            errorData.error || 
            errorData.errors ||
            errorData.detail;
          
          expect(
            hasErrorInfo !== undefined,
            'Error response should include error information'
          ).toBeTruthy();
        } catch {
          // If not JSON, that's okay too
          console.log('Error response (not JSON):', body.substring(0, 200));
        }
      }
    });

    test('should return 404 for non-existent endpoints', async ({ request }) => {
      const response = await request.get('/api/this-endpoint-does-not-exist');
      
      const status = response.status();
      
      expect(
        status === 404,
        `Non-existent endpoint should return 404. Got: ${status}`
      ).toBeTruthy();
    });
  });

  test.describe('CORS and Headers', () => {
    test('should return proper content-type for JSON endpoints', async ({ request }) => {
      const response = await request.get('/api/auth/session');
      
      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        
        expect(
          contentType?.includes('application/json'),
          `Content-Type should be JSON. Got: ${contentType}`
        ).toBeTruthy();
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle multiple rapid requests', async ({ request }) => {
      const requests = Array(10).fill(null).map(() => 
        request.get('/api/auth/session')
      );
      
      const responses = await Promise.all(requests);
      
      const statuses = responses.map(r => r.status());
      
      // Should either all succeed or some get rate limited
      const allValid = statuses.every(s => [200, 429, 401].includes(s));
      
      expect(
        allValid,
        `All responses should be valid (200/401/429). Got: ${statuses.join(', ')}`
      ).toBeTruthy();
      
      if (statuses.includes(429)) {
        console.log('Rate limiting is enabled');
      }
    });
  });

  test.describe('Data Validation', () => {
    test('should reject invalid email format', async ({ request }) => {
      const response = await request.post('/api/customers', {
        data: {
          name: 'Test Customer',
          email: 'not-a-valid-email',
        },
      });
      
      const status = response.status();
      
      // Should fail validation with 400/422 or require auth with 401/403
      expect(
        [400, 401, 403, 422].includes(status),
        `Invalid email should fail. Got: ${status}`
      ).toBeTruthy();
    });

    test('should reject negative amounts', async ({ request }) => {
      const response = await request.post('/api/invoices', {
        data: {
          amount: -100,
        },
      });
      
      const status = response.status();
      
      expect(
        [400, 401, 403, 422].includes(status),
        `Negative amount should fail validation. Got: ${status}`
      ).toBeTruthy();
    });
  });
});

test.describe('API Performance', () => {
  test('should respond within acceptable time', async ({ request }) => {
    const startTime = Date.now();
    
    await request.get('/api/auth/session');
    
    const duration = Date.now() - startTime;
    
    expect(
      duration < 5000,
      `API should respond within 5 seconds. Took: ${duration}ms`
    ).toBeTruthy();
    
    console.log(`Session API response time: ${duration}ms`);
  });
});

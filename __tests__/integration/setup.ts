/**
 * Integration Tests Setup
 * 
 * This file sets up the test environment for integration tests.
 * It creates a test database context and handles cleanup.
 */

import { PrismaClient } from '@prisma/client'

// Use a separate test database
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

// Create a test-specific Prisma client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
})

// Mock the prisma import to use our test client
jest.mock('@/lib/prisma', () => ({
  prisma: testPrisma,
}))

// Setup and teardown
beforeAll(async () => {
  // Connect to test database
  await testPrisma.$connect()
})

afterAll(async () => {
  // Disconnect from test database
  await testPrisma.$disconnect()
})

// Reset database state between tests (for isolation)
beforeEach(async () => {
  // You can add database cleanup logic here if needed
  // For example, wrapping each test in a transaction that gets rolled back
})

afterEach(async () => {
  // Clean up after each test if needed
})

/**
 * Helper function to create test data
 */
export async function createTestCompany() {
  return testPrisma.company.create({
    data: {
      id: `test-company-${Date.now()}`,
      name: 'Test Company',
      taxId: 'TEST000000XXX',
      email: 'test@company.com',
      phone: '555-0123',
      address: '123 Test St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      industry: 'Technology',
    },
  })
}

export async function createTestUser() {
  return testPrisma.user.create({
    data: {
      id: `test-user-${Date.now()}`,
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'hashedpassword',
    },
  })
}

export async function createTestCustomer(companyId: string) {
  return testPrisma.customer.create({
    data: {
      id: `test-customer-${Date.now()}`,
      name: 'Test Customer',
      email: `customer-${Date.now()}@example.com`,
      phone: '555-0124',
      address: '456 Customer Ave',
      city: 'Miami',
      state: 'FL',
      zipCode: '33102',
      country: 'USA',
      companyId,
      status: 'ACTIVE',
    },
  })
}

export async function cleanupTestData(ids: {
  companyId?: string
  userId?: string
  customerId?: string
}) {
  if (ids.customerId) {
    await testPrisma.customer.deleteMany({
      where: { id: ids.customerId },
    }).catch(() => {})
  }
  if (ids.companyId) {
    await testPrisma.company.deleteMany({
      where: { id: ids.companyId },
    }).catch(() => {})
  }
  if (ids.userId) {
    await testPrisma.user.deleteMany({
      where: { id: ids.userId },
    }).catch(() => {})
  }
}

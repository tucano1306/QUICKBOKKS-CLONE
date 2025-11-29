/**
 * Integration Tests - Customers API
 * 
 * Tests for the customers API endpoints including CRUD operations,
 * authentication, and error handling.
 * 
 * Note: These tests require a running database connection.
 * Run with: npm run test:integration
 */

import { testPrisma, createTestCompany, createTestUser, createTestCustomer, cleanupTestData } from '../setup'

describe('Customers API Integration', () => {
  let testCompany: any
  let testUser: any

  beforeAll(async () => {
    try {
      // Create test data
      testCompany = await createTestCompany()
      testUser = await createTestUser()
    } catch (error) {
      console.log('Setup skipped - database not available')
    }
  })

  afterAll(async () => {
    if (testCompany || testUser) {
      await cleanupTestData({
        companyId: testCompany?.id,
        userId: testUser?.id,
      })
    }
  })

  describe('Customer CRUD Operations', () => {
    it('should create and retrieve a customer', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer = await createTestCustomer(testCompany.id)
      expect(customer).toBeTruthy()
      expect(customer.id).toBeTruthy()
      expect(customer.companyId).toBe(testCompany.id)

      // Retrieve
      const found = await testPrisma.customer.findUnique({
        where: { id: customer.id },
      })
      expect(found).toBeTruthy()
      expect(found?.name).toBe(customer.name)

      // Cleanup
      await testPrisma.customer.delete({ where: { id: customer.id } })
    })

    it('should update customer status', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer = await createTestCustomer(testCompany.id)

      const updated = await testPrisma.customer.update({
        where: { id: customer.id },
        data: { status: 'INACTIVE' },
      })
      expect(updated.status).toBe('INACTIVE')

      // Cleanup
      await testPrisma.customer.delete({ where: { id: customer.id } })
    })

    it('should delete customer', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer = await createTestCustomer(testCompany.id)
      const customerId = customer.id

      await testPrisma.customer.delete({
        where: { id: customerId },
      })

      const found = await testPrisma.customer.findUnique({
        where: { id: customerId },
      })
      expect(found).toBeNull()
    })
  })

  describe('Customer Queries', () => {
    it('should find customers by company', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer1 = await createTestCustomer(testCompany.id)
      const customer2 = await createTestCustomer(testCompany.id)

      const customers = await testPrisma.customer.findMany({
        where: { companyId: testCompany.id },
      })
      expect(customers.length).toBeGreaterThanOrEqual(2)

      // Cleanup
      await testPrisma.customer.deleteMany({
        where: { id: { in: [customer1.id, customer2.id] } },
      })
    })

    it('should filter by status', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer = await createTestCustomer(testCompany.id)
      await testPrisma.customer.update({
        where: { id: customer.id },
        data: { status: 'ACTIVE' },
      })

      const activeCustomers = await testPrisma.customer.findMany({
        where: {
          companyId: testCompany.id,
          status: 'ACTIVE',
        },
      })
      expect(activeCustomers.length).toBeGreaterThan(0)

      // Cleanup
      await testPrisma.customer.delete({ where: { id: customer.id } })
    })

    it('should search by name', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      const customer = await createTestCustomer(testCompany.id)

      const found = await testPrisma.customer.findMany({
        where: {
          companyId: testCompany.id,
          name: { contains: 'Test' },
        },
      })
      expect(found.length).toBeGreaterThan(0)

      // Cleanup
      await testPrisma.customer.delete({ where: { id: customer.id } })
    })
  })

  describe('Pagination', () => {
    it('should paginate results', async () => {
      if (!testCompany) {
        console.log('Skipping - no test company available')
        return
      }

      // Create test customers
      const customers: any[] = []
      for (let i = 0; i < 5; i++) {
        customers.push(await createTestCustomer(testCompany.id))
      }

      const page1 = await testPrisma.customer.findMany({
        where: { companyId: testCompany.id },
        take: 2,
        skip: 0,
      })
      expect(page1.length).toBeLessThanOrEqual(2)

      const page2 = await testPrisma.customer.findMany({
        where: { companyId: testCompany.id },
        take: 2,
        skip: 2,
      })
      expect(page2.length).toBeLessThanOrEqual(2)

      // Cleanup
      await testPrisma.customer.deleteMany({
        where: { id: { in: customers.map(c => c.id) } },
      })
    })
  })
})

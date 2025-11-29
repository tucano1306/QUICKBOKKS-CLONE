/**
 * Integration Tests - Database Operations
 * 
 * Tests for database migrations, seeding, and data integrity.
 */

import { testPrisma, createTestCompany, createTestUser, createTestCustomer, cleanupTestData } from '../setup'

describe('Database Integration Tests', () => {
  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      const result = await testPrisma.$queryRaw`SELECT 1 as connected`
      expect(result).toBeTruthy()
    })
  })

  describe('Company Model', () => {
    let testCompany: any

    afterEach(async () => {
      if (testCompany?.id) {
        await cleanupTestData({ companyId: testCompany.id })
        testCompany = null
      }
    })

    it('should create a company', async () => {
      testCompany = await createTestCompany()
      expect(testCompany).toBeTruthy()
      expect(testCompany.id).toBeTruthy()
      expect(testCompany.name).toBe('Test Company')
    })

    it('should find company by id', async () => {
      testCompany = await createTestCompany()
      
      const found = await testPrisma.company.findUnique({
        where: { id: testCompany.id },
      })
      
      expect(found).toBeTruthy()
      expect(found?.id).toBe(testCompany.id)
    })

    it('should update company', async () => {
      testCompany = await createTestCompany()
      
      const updated = await testPrisma.company.update({
        where: { id: testCompany.id },
        data: { name: 'Updated Company Name' },
      })
      
      expect(updated.name).toBe('Updated Company Name')
    })

    it('should delete company', async () => {
      testCompany = await createTestCompany()
      const companyId = testCompany.id
      
      await testPrisma.company.delete({
        where: { id: companyId },
      })
      
      const found = await testPrisma.company.findUnique({
        where: { id: companyId },
      })
      
      expect(found).toBeNull()
      testCompany = null // Prevent cleanup error
    })
  })

  describe('User Model', () => {
    let testUser: any

    afterEach(async () => {
      if (testUser?.id) {
        await cleanupTestData({ userId: testUser.id })
        testUser = null
      }
    })

    it('should create a user', async () => {
      testUser = await createTestUser()
      expect(testUser).toBeTruthy()
      expect(testUser.id).toBeTruthy()
      expect(testUser.email).toContain('@example.com')
    })

    it('should find user by email', async () => {
      testUser = await createTestUser()
      
      const found = await testPrisma.user.findUnique({
        where: { email: testUser.email },
      })
      
      expect(found).toBeTruthy()
      expect(found?.id).toBe(testUser.id)
    })

    it('should enforce unique email constraint', async () => {
      testUser = await createTestUser()
      
      await expect(
        testPrisma.user.create({
          data: {
            name: 'Another User',
            email: testUser.email, // Same email
            password: 'password',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Customer Model', () => {
    let testCompany: any
    let testCustomer: any

    beforeAll(async () => {
      testCompany = await createTestCompany()
    })

    afterAll(async () => {
      await cleanupTestData({ companyId: testCompany?.id })
    })

    afterEach(async () => {
      if (testCustomer?.id) {
        await cleanupTestData({ customerId: testCustomer.id })
        testCustomer = null
      }
    })

    it('should create a customer linked to company', async () => {
      testCustomer = await createTestCustomer(testCompany.id)
      expect(testCustomer).toBeTruthy()
      expect(testCustomer.companyId).toBe(testCompany.id)
    })

    it('should find customers by company', async () => {
      testCustomer = await createTestCustomer(testCompany.id)
      
      const customers = await testPrisma.customer.findMany({
        where: { companyId: testCompany.id },
      })
      
      expect(customers.length).toBeGreaterThan(0)
    })

    it('should update customer status', async () => {
      testCustomer = await createTestCustomer(testCompany.id)
      
      const updated = await testPrisma.customer.update({
        where: { id: testCustomer.id },
        data: { status: 'INACTIVE' },
      })
      
      expect(updated.status).toBe('INACTIVE')
    })

    it('should support customer search by name', async () => {
      testCustomer = await createTestCustomer(testCompany.id)
      
      const found = await testPrisma.customer.findMany({
        where: {
          companyId: testCompany.id,
          name: { contains: 'Test' },
        },
      })
      
      expect(found.length).toBeGreaterThan(0)
    })
  })

  describe('Relationships', () => {
    let testCompany: any
    let testCustomer: any

    beforeAll(async () => {
      testCompany = await createTestCompany()
      testCustomer = await createTestCustomer(testCompany.id)
    })

    afterAll(async () => {
      await cleanupTestData({
        customerId: testCustomer?.id,
        companyId: testCompany?.id,
      })
    })

    it('should include customer invoices in query', async () => {
      const customer = await testPrisma.customer.findUnique({
        where: { id: testCustomer.id },
        include: {
          invoices: true,
        },
      })
      
      expect(customer).toBeTruthy()
      expect(customer?.invoices).toBeDefined()
      expect(Array.isArray(customer?.invoices)).toBe(true)
    })

    it('should count customer invoices', async () => {
      const customer = await testPrisma.customer.findUnique({
        where: { id: testCustomer.id },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      })
      
      expect(customer?._count).toBeDefined()
      expect(typeof customer?._count.invoices).toBe('number')
    })
  })

  describe('Transactions', () => {
    let testCompany: any

    beforeAll(async () => {
      testCompany = await createTestCompany()
    })

    afterAll(async () => {
      await cleanupTestData({ companyId: testCompany?.id })
    })

    it('should rollback transaction on error', async () => {
      const customerId = `test-customer-${Date.now()}`
      
      try {
        await testPrisma.$transaction(async (tx) => {
          // Create customer
          await tx.customer.create({
            data: {
              id: customerId,
              name: 'Transaction Test Customer',
              email: `tx-${Date.now()}@test.com`,
              companyId: testCompany.id,
              status: 'ACTIVE',
            },
          })
          
          // Force error
          throw new Error('Simulated error')
        })
      } catch (error) {
        // Transaction should have rolled back
      }
      
      // Customer should not exist
      const found = await testPrisma.customer.findUnique({
        where: { id: customerId },
      })
      
      expect(found).toBeNull()
    })

    it('should commit transaction on success', async () => {
      const customerId = `test-customer-${Date.now()}`
      
      await testPrisma.$transaction(async (tx) => {
        await tx.customer.create({
          data: {
            id: customerId,
            name: 'Transaction Test Customer',
            email: `tx-${Date.now()}@test.com`,
            companyId: testCompany.id,
            status: 'ACTIVE',
          },
        })
      })
      
      const found = await testPrisma.customer.findUnique({
        where: { id: customerId },
      })
      
      expect(found).toBeTruthy()
      
      // Cleanup
      await testPrisma.customer.delete({ where: { id: customerId } })
    })
  })
})

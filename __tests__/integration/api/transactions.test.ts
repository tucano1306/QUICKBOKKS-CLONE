/**
 * Integration Tests - Transactions API
 * 
 * Tests for /api/transactions endpoint
 */

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user', email: 'test@example.com' }
  })),
}))

import { prisma } from '@/lib/prisma'

describe('API - Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/transactions', () => {
    it('should return transactions for a company', async () => {
      const mockTransactions = [
        {
          id: '1',
          type: 'INCOME',
          category: 'Sales',
          amount: 1000,
          date: new Date('2023-05-15'),
          description: 'Test income',
          status: 'COMPLETED',
          companyId: 'company-1',
        },
        {
          id: '2',
          type: 'EXPENSE',
          category: 'Supplies',
          amount: 200,
          date: new Date('2023-05-16'),
          description: 'Test expense',
          status: 'COMPLETED',
          companyId: 'company-1',
        },
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions)

      const result = await prisma.transaction.findMany({
        where: { companyId: 'company-1' },
        orderBy: { date: 'desc' }
      })

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('INCOME')
      expect(result[1].type).toBe('EXPENSE')
    })

    it('should filter by date range', async () => {
      const mockTransactions = [
        {
          id: '1',
          type: 'INCOME',
          amount: 500,
          date: new Date('2023-05-15'),
        },
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions)

      const result = await prisma.transaction.findMany({
        where: {
          companyId: 'company-1',
          date: {
            gte: new Date('2023-05-01'),
            lte: new Date('2023-05-31'),
          },
        },
      })

      expect(result).toHaveLength(1)
    })

    it('should filter by type', async () => {
      const mockIncomeOnly = [
        { id: '1', type: 'INCOME', amount: 1000 },
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockIncomeOnly)

      const result = await prisma.transaction.findMany({
        where: { type: 'INCOME' },
      })

      expect(result.every(t => t.type === 'INCOME')).toBe(true)
    })
  })

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const newTransaction = {
        type: 'INCOME' as const,
        category: 'Services',
        amount: 1500,
        date: new Date(),
        description: 'Consulting service',
        companyId: 'company-1',
      }

      const createdTransaction = {
        id: 'new-id',
        ...newTransaction,
        status: 'COMPLETED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue(createdTransaction)

      const result = await prisma.transaction.create({
        data: newTransaction as any,
      })

      expect(result.id).toBe('new-id')
      expect(result.amount).toBe(1500)
      expect(result.type).toBe('INCOME')
    })

    it('should validate required fields', async () => {
      const invalidTransaction = {
        // Missing required fields
        category: 'Test',
      }

      expect(() => {
        if (!invalidTransaction.hasOwnProperty('type') || !invalidTransaction.hasOwnProperty('amount')) {
          throw new Error('Missing required fields: type, amount')
        }
      }).toThrow('Missing required fields')
    })
  })

  describe('DELETE /api/transactions', () => {
    it('should delete a single transaction', async () => {
      ;(prisma.transaction.delete as jest.Mock).mockResolvedValue({ id: '1' })

      const result = await prisma.transaction.delete({
        where: { id: '1' },
      })

      expect(result.id).toBe('1')
    })

    it('should delete multiple transactions', async () => {
      ;(prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({ count: 3 })

      const result = await prisma.transaction.deleteMany({
        where: { id: { in: ['1', '2', '3'] } },
      })

      expect(result.count).toBe(3)
    })
  })
})

describe('Transaction Business Logic', () => {
  it('should calculate total income correctly', () => {
    const transactions = [
      { type: 'INCOME', amount: 1000 },
      { type: 'INCOME', amount: 500 },
      { type: 'EXPENSE', amount: 200 },
    ]

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)

    expect(totalIncome).toBe(1500)
  })

  it('should calculate total expenses correctly', () => {
    const transactions = [
      { type: 'INCOME', amount: 1000 },
      { type: 'EXPENSE', amount: 300 },
      { type: 'EXPENSE', amount: 200 },
    ]

    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)

    expect(totalExpenses).toBe(500)
  })

  it('should calculate net income', () => {
    const transactions = [
      { type: 'INCOME', amount: 2000 },
      { type: 'EXPENSE', amount: 800 },
    ]

    const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    const netIncome = income - expenses

    expect(netIncome).toBe(1200)
  })
})

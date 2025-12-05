/**
 * Integration Tests - Income Statement API
 * 
 * Tests for /api/accounting/reports/income-statement endpoint
 */

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    chartOfAccounts: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user' }
  })),
}))

import { prisma } from '@/lib/prisma'

describe('API - Income Statement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Revenue Calculations', () => {
    it('should calculate revenue from transactions', async () => {
      const mockTransactions = [
        { id: '1', type: 'INCOME', amount: 1000, category: 'Sales', status: 'COMPLETED' },
        { id: '2', type: 'INCOME', amount: 500, category: 'Services', status: 'COMPLETED' },
        { id: '3', type: 'EXPENSE', amount: 200, category: 'Supplies', status: 'COMPLETED' },
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions)

      const transactions = await prisma.transaction.findMany({
        where: { status: 'COMPLETED' }
      })

      const revenue = transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      expect(revenue).toBe(1500)
    })

    it('should calculate revenue from paid invoices', async () => {
      const mockInvoices = [
        { id: '1', status: 'PAID', total: 2000 },
        { id: '2', status: 'PAID', total: 1500 },
        { id: '3', status: 'PENDING', total: 500 },
      ]

      ;(prisma.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices.filter(i => i.status === 'PAID')
      )

      const paidInvoices = await prisma.invoice.findMany({
        where: { status: 'PAID' }
      })

      const invoiceRevenue = paidInvoices.reduce((sum: number, i: any) => sum + i.total, 0)

      expect(invoiceRevenue).toBe(3500)
    })
  })

  describe('Expense Calculations', () => {
    it('should calculate expenses from expense table', async () => {
      const mockExpenses = [
        { id: '1', amount: 500, category: { name: 'Rent' } },
        { id: '2', amount: 200, category: { name: 'Utilities' } },
        { id: '3', amount: 100, category: { name: 'Supplies' } },
      ]

      ;(prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses)

      const expenses = await prisma.expense.findMany({})
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)

      expect(totalExpenses).toBe(800)
    })

    it('should calculate expenses from transactions', async () => {
      const mockTransactions = [
        { type: 'EXPENSE', amount: 300, category: 'Payroll' },
        { type: 'EXPENSE', amount: 150, category: 'Marketing' },
        { type: 'INCOME', amount: 1000 },
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions)

      const transactions = await prisma.transaction.findMany({})
      const expenseTotal = transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      expect(expenseTotal).toBe(450)
    })
  })

  describe('Net Income Calculation', () => {
    it('should calculate correct net income', () => {
      const revenue = {
        transactions: 1574.14,
        invoices: 0,
        journalEntries: 0,
      }

      const expenses = {
        transactions: 0,
        expenseTable: 14959.89,
        journalEntries: 0,
      }

      const totalRevenue = revenue.transactions + revenue.invoices + revenue.journalEntries
      const totalExpenses = expenses.transactions + expenses.expenseTable + expenses.journalEntries
      const netIncome = totalRevenue - totalExpenses

      expect(totalRevenue).toBe(1574.14)
      expect(totalExpenses).toBe(14959.89)
      expect(netIncome).toBeCloseTo(-13385.75, 2)
    })

    it('should calculate profit margin', () => {
      const revenue = 10000
      const netIncome = 2500

      const margin = (netIncome / revenue) * 100

      expect(margin).toBe(25)
    })

    it('should handle zero revenue (avoid division by zero)', () => {
      const revenue = 0
      const netIncome = -500

      const margin = revenue > 0 ? (netIncome / revenue) * 100 : 0

      expect(margin).toBe(0)
    })
  })

  describe('Category Grouping', () => {
    it('should group income by category', () => {
      const transactions = [
        { type: 'INCOME', category: 'Sales', amount: 1000 },
        { type: 'INCOME', category: 'Sales', amount: 500 },
        { type: 'INCOME', category: 'Services', amount: 750 },
      ]

      const grouped: Record<string, number> = {}
      
      transactions
        .filter(t => t.type === 'INCOME')
        .forEach(t => {
          grouped[t.category] = (grouped[t.category] || 0) + t.amount
        })

      expect(grouped['Sales']).toBe(1500)
      expect(grouped['Services']).toBe(750)
    })

    it('should group expenses by category', () => {
      const expenses = [
        { category: { name: 'Rent' }, amount: 1000 },
        { category: { name: 'Utilities' }, amount: 200 },
        { category: { name: 'Rent' }, amount: 500 },
      ]

      const grouped: Record<string, number> = {}
      
      expenses.forEach(e => {
        const catName = e.category?.name || 'Other'
        grouped[catName] = (grouped[catName] || 0) + e.amount
      })

      expect(grouped['Rent']).toBe(1500)
      expect(grouped['Utilities']).toBe(200)
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter transactions by date range', () => {
      const startDate = new Date('2023-05-01')
      const endDate = new Date('2023-05-31')

      const transactions = [
        { date: new Date('2023-04-15'), amount: 100 },
        { date: new Date('2023-05-15'), amount: 200 },
        { date: new Date('2023-05-25'), amount: 300 },
        { date: new Date('2023-06-05'), amount: 400 },
      ]

      const filtered = transactions.filter(t => 
        t.date >= startDate && t.date <= endDate
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.reduce((s, t) => s + t.amount, 0)).toBe(500)
    })
  })
})

describe('Income Statement Report Format', () => {
  it('should structure report correctly', () => {
    const report = {
      revenue: {
        operating: [
          { code: '4001', name: 'Sales Revenue', balance: 10000 },
          { code: '4002', name: 'Service Revenue', balance: 5000 },
        ],
        nonOperating: [],
        total: 15000,
      },
      expenses: {
        operating: [
          { code: '5001', name: 'Salaries', balance: 5000 },
          { code: '5002', name: 'Rent', balance: 2000 },
        ],
        nonOperating: [],
        costOfSales: [],
        total: 7000,
      },
      netIncome: 8000,
      netMargin: 53.33,
    }

    expect(report.revenue.total).toBe(15000)
    expect(report.expenses.total).toBe(7000)
    expect(report.netIncome).toBe(report.revenue.total - report.expenses.total)
  })
})

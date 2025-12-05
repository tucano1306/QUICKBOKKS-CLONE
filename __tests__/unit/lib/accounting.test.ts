/**
 * Unit Tests - Accounting Service Functions
 * 
 * Tests for accounting calculations and business logic
 */

import { calculateTax, calculateTotal, isOverdue, getDaysOverdue, generateInvoiceNumber, generateEmployeeNumber } from '@/lib/utils'

describe('Accounting - Tax Calculations', () => {
  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      expect(calculateTax(100, 10)).toBe(10)
      expect(calculateTax(1000, 7.5)).toBe(75)
      expect(calculateTax(500, 16)).toBe(80)
    })

    it('should handle zero amount', () => {
      expect(calculateTax(0, 10)).toBe(0)
    })

    it('should handle zero tax rate', () => {
      expect(calculateTax(100, 0)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateTax(33.33, 7)).toBe(2.33)
      expect(calculateTax(111.11, 5.5)).toBe(6.11)
    })

    it('should handle Florida tax rates', () => {
      // Florida state tax is 6%
      expect(calculateTax(100, 6)).toBe(6)
      // Miami-Dade discretionary surtax is 1%
      expect(calculateTax(100, 7)).toBe(7)
    })
  })

  describe('calculateTotal', () => {
    it('should calculate total with subtotal and tax', () => {
      expect(calculateTotal(100, 10)).toBe(110)
      expect(calculateTotal(500, 40)).toBe(540)
    })

    it('should apply discount correctly', () => {
      expect(calculateTotal(100, 10, 5)).toBe(105)
      expect(calculateTotal(1000, 70, 50)).toBe(1020)
    })

    it('should handle zero discount', () => {
      expect(calculateTotal(100, 10, 0)).toBe(110)
    })

    it('should handle zero tax', () => {
      expect(calculateTotal(100, 0, 10)).toBe(90)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateTotal(33.33, 2.33, 0.5)).toBe(35.16)
    })
  })
})

describe('Accounting - Due Date Logic', () => {
  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      expect(isOverdue(pastDate)).toBe(true)
    })

    it('should return false for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      expect(isOverdue(futureDate)).toBe(false)
    })

    it('should handle string dates', () => {
      const pastDate = '2020-01-01'
      expect(isOverdue(pastDate)).toBe(true)
    })
  })

  describe('getDaysOverdue', () => {
    it('should calculate days overdue correctly', () => {
      const daysAgo = 5
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - daysAgo)
      const result = getDaysOverdue(pastDate)
      expect(result).toBeGreaterThanOrEqual(daysAgo - 1)
      expect(result).toBeLessThanOrEqual(daysAgo + 1)
    })

    it('should return negative for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      expect(getDaysOverdue(futureDate)).toBeLessThan(0)
    })
  })
})

describe('Accounting - ID Generation', () => {
  describe('generateInvoiceNumber', () => {
    it('should generate valid invoice number format', () => {
      const invoiceNumber = generateInvoiceNumber()
      expect(invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/)
    })

    it('should generate unique numbers', () => {
      const numbers = new Set()
      for (let i = 0; i < 100; i++) {
        numbers.add(generateInvoiceNumber())
      }
      // Most should be unique (random component)
      expect(numbers.size).toBeGreaterThan(90)
    })

    it('should include current year and month', () => {
      const invoiceNumber = generateInvoiceNumber()
      const date = new Date()
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
      expect(invoiceNumber).toContain(yearMonth)
    })
  })

  describe('generateEmployeeNumber', () => {
    it('should generate valid employee number format', () => {
      const empNumber = generateEmployeeNumber()
      expect(empNumber).toMatch(/^EMP-\d{5}$/)
    })

    it('should generate unique numbers', () => {
      const numbers = new Set()
      for (let i = 0; i < 100; i++) {
        numbers.add(generateEmployeeNumber())
      }
      expect(numbers.size).toBeGreaterThan(90)
    })
  })
})

describe('Accounting - Invoice Scenarios', () => {
  it('should calculate invoice with multiple items', () => {
    const items = [
      { quantity: 2, price: 50 },
      { quantity: 1, price: 100 },
      { quantity: 5, price: 20 }
    ]
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    expect(subtotal).toBe(300)
    
    const tax = calculateTax(subtotal, 7) // 7% Florida
    expect(tax).toBe(21)
    
    const total = calculateTotal(subtotal, tax)
    expect(total).toBe(321)
  })

  it('should handle discount on invoice', () => {
    const subtotal = 500
    const discountPercent = 10
    const discount = subtotal * (discountPercent / 100)
    const afterDiscount = subtotal - discount
    const tax = calculateTax(afterDiscount, 7)
    const total = calculateTotal(afterDiscount, tax)
    
    expect(discount).toBe(50)
    expect(afterDiscount).toBe(450)
    expect(tax).toBe(31.5)
    expect(total).toBe(481.5)
  })
})

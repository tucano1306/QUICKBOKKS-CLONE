/**
 * Unit Tests - Price Calculations
 * 
 * Tests for invoice pricing, discounts, and tax calculations
 */

import { calculateTax, calculateTotal } from '@/lib/utils'

describe('Price Calculations', () => {
  describe('Tax Calculations', () => {
    it('should calculate Florida sales tax (6%)', () => {
      const subtotal = 100
      const floridaSalesTax = 6 // 6%
      const tax = calculateTax(subtotal, floridaSalesTax)
      expect(tax).toBe(6)
    })

    it('should calculate Miami-Dade surtax (7%)', () => {
      const subtotal = 100
      const miamiDadeTax = 7 // 6% state + 1% local
      const tax = calculateTax(subtotal, miamiDadeTax)
      expect(tax).toBe(7)
    })

    it('should handle decimal amounts correctly', () => {
      const subtotal = 99.99
      const taxRate = 7.5
      const tax = calculateTax(subtotal, taxRate)
      expect(tax).toBeCloseTo(7.50, 2)
    })

    it('should handle large amounts', () => {
      const subtotal = 10000
      const taxRate = 7
      const tax = calculateTax(subtotal, taxRate)
      expect(tax).toBe(700)
    })

    it('should return 0 for tax-exempt (0% rate)', () => {
      const subtotal = 100
      const tax = calculateTax(subtotal, 0)
      expect(tax).toBe(0)
    })
  })

  describe('Invoice Total Calculations', () => {
    it('should calculate simple total (subtotal + tax)', () => {
      const total = calculateTotal(100, 7)
      expect(total).toBe(107)
    })

    it('should apply discount correctly', () => {
      const total = calculateTotal(100, 7, 10)
      expect(total).toBe(97) // 100 + 7 - 10
    })

    it('should handle percentage-based discounts', () => {
      const subtotal = 100
      const taxAmount = 7
      const discountPercent = 10
      const discountAmount = subtotal * (discountPercent / 100) // $10
      
      const total = calculateTotal(subtotal, taxAmount, discountAmount)
      expect(total).toBe(97)
    })

    it('should handle no discount', () => {
      const total = calculateTotal(250, 17.50)
      expect(total).toBe(267.50)
    })

    it('should handle complex invoice', () => {
      // Invoice: $1,234.56 + $86.42 tax - $50 discount
      const total = calculateTotal(1234.56, 86.42, 50)
      expect(total).toBeCloseTo(1270.98, 2)
    })
  })

  describe('Line Item Calculations', () => {
    interface LineItem {
      description: string
      quantity: number
      unitPrice: number
      taxable: boolean
    }

    function calculateLineItemTotal(item: LineItem): number {
      return Number((item.quantity * item.unitPrice).toFixed(2))
    }

    function calculateInvoiceSubtotal(items: LineItem[]): number {
      return Number(
        items.reduce((sum, item) => sum + calculateLineItemTotal(item), 0).toFixed(2)
      )
    }

    function calculateTaxableAmount(items: LineItem[]): number {
      return Number(
        items
          .filter(item => item.taxable)
          .reduce((sum, item) => sum + calculateLineItemTotal(item), 0)
          .toFixed(2)
      )
    }

    const testItems: LineItem[] = [
      { description: 'Consulting Services', quantity: 10, unitPrice: 150, taxable: true },
      { description: 'Software License', quantity: 1, unitPrice: 500, taxable: true },
      { description: 'Travel Expenses', quantity: 1, unitPrice: 250, taxable: false },
    ]

    it('should calculate line item total correctly', () => {
      const item = testItems[0]
      const total = calculateLineItemTotal(item)
      expect(total).toBe(1500) // 10 * 150
    })

    it('should calculate invoice subtotal', () => {
      const subtotal = calculateInvoiceSubtotal(testItems)
      expect(subtotal).toBe(2250) // 1500 + 500 + 250
    })

    it('should calculate taxable amount (excluding non-taxable items)', () => {
      const taxable = calculateTaxableAmount(testItems)
      expect(taxable).toBe(2000) // 1500 + 500 (Travel is non-taxable)
    })

    it('should calculate full invoice with mixed taxable items', () => {
      const subtotal = calculateInvoiceSubtotal(testItems)
      const taxableAmount = calculateTaxableAmount(testItems)
      const taxRate = 7 // Florida + surtax
      const taxAmount = calculateTax(taxableAmount, taxRate)
      const total = calculateTotal(subtotal, taxAmount)

      expect(subtotal).toBe(2250)
      expect(taxableAmount).toBe(2000)
      expect(taxAmount).toBe(140) // 7% of $2000
      expect(total).toBe(2390) // $2250 + $140
    })

    it('should handle quantity with decimals', () => {
      const item: LineItem = {
        description: 'Hourly Work',
        quantity: 2.5,
        unitPrice: 100,
        taxable: true,
      }
      expect(calculateLineItemTotal(item)).toBe(250)
    })

    it('should handle fractional cents correctly', () => {
      const item: LineItem = {
        description: 'Item',
        quantity: 3,
        unitPrice: 33.33,
        taxable: true,
      }
      expect(calculateLineItemTotal(item)).toBe(99.99)
    })
  })

  describe('Discount Calculations', () => {
    function applyPercentageDiscount(amount: number, discountPercent: number): number {
      return Number((amount * (1 - discountPercent / 100)).toFixed(2))
    }

    function applyEarlyPaymentDiscount(
      amount: number,
      discountPercent: number,
      daysPaid: number,
      discountDays: number
    ): number {
      if (daysPaid <= discountDays) {
        return applyPercentageDiscount(amount, discountPercent)
      }
      return amount
    }

    it('should apply 10% discount correctly', () => {
      const discounted = applyPercentageDiscount(100, 10)
      expect(discounted).toBe(90)
    })

    it('should apply 25% discount correctly', () => {
      const discounted = applyPercentageDiscount(200, 25)
      expect(discounted).toBe(150)
    })

    it('should apply 2/10 NET 30 early payment discount', () => {
      // 2% discount if paid within 10 days
      const amount = 1000
      
      // Paid on day 5 - should get discount
      const earlyPayment = applyEarlyPaymentDiscount(amount, 2, 5, 10)
      expect(earlyPayment).toBe(980)
      
      // Paid on day 15 - no discount
      const latePayment = applyEarlyPaymentDiscount(amount, 2, 15, 10)
      expect(latePayment).toBe(1000)
    })

    it('should handle edge case - paid exactly on discount deadline', () => {
      const amount = 1000
      const discounted = applyEarlyPaymentDiscount(amount, 2, 10, 10)
      expect(discounted).toBe(980) // Should still get discount
    })
  })

  describe('Currency Rounding', () => {
    function roundToNearestCent(amount: number): number {
      return Math.round(amount * 100) / 100
    }

    it('should round down below half cent', () => {
      expect(roundToNearestCent(10.124)).toBe(10.12)
    })

    it('should round up at half cent', () => {
      expect(roundToNearestCent(10.125)).toBe(10.13)
    })

    it('should round up above half cent', () => {
      expect(roundToNearestCent(10.126)).toBe(10.13)
    })

    it('should handle exact amounts', () => {
      expect(roundToNearestCent(10.50)).toBe(10.50)
    })
  })
})

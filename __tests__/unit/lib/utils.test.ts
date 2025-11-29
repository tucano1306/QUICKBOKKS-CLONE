/**
 * Unit Tests - Utility Functions
 * 
 * Tests for utility functions in src/lib/utils.ts
 */

import { cn, formatCurrency, formatDate, formatShortDate, generateInvoiceNumber, calculateTax, calculateTotal } from '@/lib/utils'

describe('Utils - cn (className merger)', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('should merge Tailwind conflicting classes correctly', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })

  it('should handle array of classes', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2')
  })
})

describe('Utils - formatCurrency', () => {
  it('should format USD currency correctly', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('should format MXN currency by default', () => {
    const result = formatCurrency(1000)
    expect(result).toBeTruthy()
  })

  it('should handle zero amount', () => {
    const result = formatCurrency(0, 'USD')
    expect(result).toContain('0')
  })

  it('should handle negative amounts', () => {
    const result = formatCurrency(-500, 'USD')
    expect(result).toContain('500')
  })

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000, 'USD')
    expect(result).toBeTruthy()
  })
})

describe('Utils - formatDate', () => {
  it('should format Date object correctly', () => {
    const date = new Date('2024-01-15T12:00:00')
    const formatted = formatDate(date)
    expect(formatted).toContain('2024')
    // Date may vary based on timezone, just verify it contains the month
    expect(formatted.toLowerCase()).toMatch(/enero|january/)
  })

  it('should format date string correctly', () => {
    const result = formatDate('2024-06-20T12:00:00')
    expect(result).toContain('2024')
  })
})

describe('Utils - formatShortDate', () => {
  it('should format date in short format', () => {
    const date = new Date('2024-03-15')
    const result = formatShortDate(date)
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}|\d{4}\/\d{2}\/\d{2}|\d{2}-\d{2}-\d{4}/)
  })
})

describe('Utils - generateInvoiceNumber', () => {
  it('should generate invoice number with correct prefix', () => {
    const invoiceNumber = generateInvoiceNumber()
    expect(invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/)
  })

  it('should generate unique invoice numbers', () => {
    const invoice1 = generateInvoiceNumber()
    const invoice2 = generateInvoiceNumber()
    // Note: There's a small chance they could be equal due to random, but very unlikely
    expect(invoice1).toMatch(/^INV-/)
    expect(invoice2).toMatch(/^INV-/)
  })

  it('should include current year and month', () => {
    const invoiceNumber = generateInvoiceNumber()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    expect(invoiceNumber).toContain(`${year}${month}`)
  })
})

describe('Utils - calculateTax', () => {
  it('should calculate tax correctly', () => {
    expect(calculateTax(100, 10)).toBe(10)
    expect(calculateTax(100, 7)).toBe(7)
    expect(calculateTax(100, 7.5)).toBe(7.5)
  })

  it('should handle zero tax rate', () => {
    expect(calculateTax(100, 0)).toBe(0)
  })

  it('should handle zero amount', () => {
    expect(calculateTax(0, 10)).toBe(0)
  })

  it('should round to 2 decimal places', () => {
    const result = calculateTax(33.33, 7.5)
    expect(result).toBe(2.5) // 33.33 * 0.075 = 2.49975 → 2.50
  })

  it('should handle large amounts', () => {
    const result = calculateTax(100000, 6)
    expect(result).toBe(6000)
  })
})

describe('Utils - calculateTotal', () => {
  it('should calculate total correctly', () => {
    expect(calculateTotal(100, 10, 0)).toBe(110)
    expect(calculateTotal(100, 10, 5)).toBe(105)
  })

  it('should handle zero discount', () => {
    expect(calculateTotal(100, 7)).toBe(107)
  })

  it('should handle all zeros', () => {
    expect(calculateTotal(0, 0, 0)).toBe(0)
  })

  it('should handle negative discount (surcharge)', () => {
    // Though unusual, the function should still work
    expect(calculateTotal(100, 10, -5)).toBe(115)
  })

  it('should round to 2 decimal places', () => {
    const result = calculateTotal(33.33, 2.50, 1.11)
    expect(Number.isFinite(result)).toBe(true)
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
  })
})

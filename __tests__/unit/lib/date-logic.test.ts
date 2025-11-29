/**
 * Unit Tests - Date/Time Logic
 * 
 * Tests for date and time utility functions
 */

import {
  formatDate,
  formatShortDate,
} from '@/lib/utils'

describe('Date/Time Logic', () => {
  describe('Date Formatting', () => {
    it('should format date with full month name', () => {
      const date = new Date('2024-03-15T12:00:00Z')
      const formatted = formatDate(date)
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })

    it('should handle date strings', () => {
      const formatted = formatDate('2024-06-20')
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2024')
    })

    it('should handle ISO date strings', () => {
      const formatted = formatDate('2024-01-01T00:00:00.000Z')
      expect(formatted).toBeTruthy()
    })
  })

  describe('Short Date Format', () => {
    it('should return short date format', () => {
      const date = new Date('2024-03-15')
      const formatted = formatShortDate(date)
      expect(formatted).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00')
      const formatted = formatDate(leapYearDate)
      expect(formatted).toBeTruthy()
      expect(formatted.toLowerCase()).toMatch(/febrero|february/)
    })

    it('should handle end of year dates', () => {
      const endOfYear = new Date('2024-12-31T12:00:00')
      const formatted = formatDate(endOfYear)
      expect(formatted).toBeTruthy()
      expect(formatted.toLowerCase()).toMatch(/diciembre|december/)
    })

    it('should handle start of year dates', () => {
      const startOfYear = new Date('2024-01-01')
      const formatted = formatDate(startOfYear)
      expect(formatted).toBeTruthy()
    })
  })
})

describe('Payment Due Date Calculations', () => {
  /**
   * Calculate payment due date based on terms
   */
  function calculateDueDate(invoiceDate: Date, paymentTerms: string): Date {
    const dueDate = new Date(invoiceDate)
    
    switch (paymentTerms) {
      case 'NET_7':
        dueDate.setDate(dueDate.getDate() + 7)
        break
      case 'NET_15':
        dueDate.setDate(dueDate.getDate() + 15)
        break
      case 'NET_30':
        dueDate.setDate(dueDate.getDate() + 30)
        break
      case 'NET_60':
        dueDate.setDate(dueDate.getDate() + 60)
        break
      case 'NET_90':
        dueDate.setDate(dueDate.getDate() + 90)
        break
      case 'DUE_ON_RECEIPT':
        // Same as invoice date
        break
      default:
        dueDate.setDate(dueDate.getDate() + 30) // Default to NET_30
    }
    
    return dueDate
  }

  /**
   * Check if invoice is overdue
   */
  function isOverdue(dueDate: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  /**
   * Calculate days until due or days overdue
   */
  function getDaysUntilDue(dueDate: Date): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  describe('calculateDueDate', () => {
    it('should calculate NET_30 correctly', () => {
      const invoiceDate = new Date('2024-01-01T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'NET_30')
      // Date should be 30 days after Jan 1
      expect(dueDate.getTime()).toBe(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    })

    it('should calculate NET_7 correctly', () => {
      const invoiceDate = new Date('2024-01-01T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'NET_7')
      expect(dueDate.getTime()).toBe(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    })

    it('should calculate NET_15 correctly', () => {
      const invoiceDate = new Date('2024-01-01T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'NET_15')
      expect(dueDate.getTime()).toBe(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000)
    })

    it('should calculate NET_60 correctly', () => {
      const invoiceDate = new Date('2024-01-01T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'NET_60')
      expect(dueDate.getTime()).toBe(invoiceDate.getTime() + 60 * 24 * 60 * 60 * 1000)
    })

    it('should calculate NET_90 correctly', () => {
      const invoiceDate = new Date('2024-01-01')
      const dueDate = calculateDueDate(invoiceDate, 'NET_90')
      expect(dueDate.getMonth()).toBe(2) // Late March / April
    })

    it('should handle DUE_ON_RECEIPT', () => {
      const invoiceDate = new Date('2024-01-15T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'DUE_ON_RECEIPT')
      expect(dueDate.getTime()).toBe(invoiceDate.getTime())
    })

    it('should default to NET_30 for unknown terms', () => {
      const invoiceDate = new Date('2024-01-01T12:00:00')
      const dueDate = calculateDueDate(invoiceDate, 'UNKNOWN')
      expect(dueDate.getTime()).toBe(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    })

    it('should handle month boundary crossings', () => {
      const invoiceDate = new Date('2024-01-25')
      const dueDate = calculateDueDate(invoiceDate, 'NET_30')
      expect(dueDate.getMonth()).toBe(1) // February
    })

    it('should handle year boundary crossings', () => {
      const invoiceDate = new Date('2023-12-15')
      const dueDate = calculateDueDate(invoiceDate, 'NET_30')
      expect(dueDate.getFullYear()).toBe(2024)
      expect(dueDate.getMonth()).toBe(0) // January
    })
  })

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      expect(isOverdue(pastDate)).toBe(true)
    })

    it('should return false for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      expect(isOverdue(futureDate)).toBe(false)
    })

    it('should return false for today', () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      expect(isOverdue(today)).toBe(false)
    })
  })

  describe('getDaysUntilDue', () => {
    it('should return positive number for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      expect(getDaysUntilDue(futureDate)).toBe(5)
    })

    it('should return negative number for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 3)
      expect(getDaysUntilDue(pastDate)).toBe(-3)
    })

    it('should return 0 for today', () => {
      const today = new Date()
      expect(getDaysUntilDue(today)).toBe(0)
    })
  })
})

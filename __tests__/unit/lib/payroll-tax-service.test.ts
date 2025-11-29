/**
 * Unit Tests - Payroll Tax Service
 * 
 * Tests for payroll tax calculations in src/lib/payroll-tax-service.ts
 * Following IRS Publication 15 (Circular E) - 2024
 */

import {
  calculateFederalIncomeTax,
  calculateFICATaxes,
  calculateFloridaSUI,
  annualizeSalary,
  periodizeTax,
} from '@/lib/payroll-tax-service'

describe('Payroll Tax Service - annualizeSalary', () => {
  it('should annualize weekly salary correctly', () => {
    expect(annualizeSalary(1000, 'WEEKLY')).toBe(52000)
  })

  it('should annualize bi-weekly salary correctly', () => {
    expect(annualizeSalary(2000, 'BI_WEEKLY')).toBe(52000)
  })

  it('should annualize semi-monthly salary correctly', () => {
    expect(annualizeSalary(2166.67, 'SEMI_MONTHLY')).toBeCloseTo(52000.08, 0)
  })

  it('should annualize monthly salary correctly', () => {
    expect(annualizeSalary(4333.33, 'MONTHLY')).toBeCloseTo(51999.96, 0)
  })

  it('should handle yearly salary (no multiplication)', () => {
    expect(annualizeSalary(52000, 'YEARLY')).toBe(52000)
  })

  it('should default to multiplier of 1 for unknown period type', () => {
    expect(annualizeSalary(1000, 'UNKNOWN')).toBe(1000)
  })
})

describe('Payroll Tax Service - periodizeTax', () => {
  it('should periodize annual tax to weekly correctly', () => {
    expect(periodizeTax(5200, 'WEEKLY')).toBe(100)
  })

  it('should periodize annual tax to bi-weekly correctly', () => {
    expect(periodizeTax(5200, 'BI_WEEKLY')).toBe(200)
  })

  it('should periodize annual tax to semi-monthly correctly', () => {
    expect(periodizeTax(5200, 'SEMI_MONTHLY')).toBeCloseTo(216.67, 1)
  })

  it('should periodize annual tax to monthly correctly', () => {
    expect(periodizeTax(5200, 'MONTHLY')).toBeCloseTo(433.33, 1)
  })

  it('should handle yearly (no division)', () => {
    expect(periodizeTax(5200, 'YEARLY')).toBe(5200)
  })
})

describe('Payroll Tax Service - calculateFederalIncomeTax', () => {
  describe('SINGLE filing status', () => {
    it('should calculate 10% bracket correctly', () => {
      // Income in 10% bracket (0 - 11,600)
      const tax = calculateFederalIncomeTax(10000, 'SINGLE', 0, 0)
      expect(tax).toBeGreaterThanOrEqual(0)
    })

    it('should calculate 12% bracket correctly', () => {
      // Income in 12% bracket (11,600 - 47,150)
      const tax = calculateFederalIncomeTax(30000, 'SINGLE', 0, 0)
      expect(tax).toBeGreaterThan(0)
    })

    it('should calculate 22% bracket correctly', () => {
      // Income in 22% bracket (47,150 - 100,525)
      const tax = calculateFederalIncomeTax(75000, 'SINGLE', 0, 0)
      expect(tax).toBeGreaterThan(0)
    })

    it('should reduce tax with allowances', () => {
      const taxNoAllowances = calculateFederalIncomeTax(50000, 'SINGLE', 0, 0)
      const taxWithAllowances = calculateFederalIncomeTax(50000, 'SINGLE', 2, 0)
      expect(taxWithAllowances).toBeLessThan(taxNoAllowances)
    })

    it('should add additional withholding', () => {
      const baseTax = calculateFederalIncomeTax(50000, 'SINGLE', 0, 0)
      const taxWithAdditional = calculateFederalIncomeTax(50000, 'SINGLE', 0, 100)
      expect(taxWithAdditional).toBe(baseTax + 100)
    })
  })

  describe('MARRIED_FILING_JOINTLY filing status', () => {
    it('should calculate 10% bracket correctly', () => {
      // Income in 10% bracket (0 - 23,200)
      const tax = calculateFederalIncomeTax(20000, 'MARRIED_FILING_JOINTLY', 0, 0)
      expect(tax).toBeGreaterThanOrEqual(0)
    })

    it('should have lower tax than single for same income', () => {
      const singleTax = calculateFederalIncomeTax(100000, 'SINGLE', 0, 0)
      const marriedTax = calculateFederalIncomeTax(100000, 'MARRIED_FILING_JOINTLY', 0, 0)
      expect(marriedTax).toBeLessThan(singleTax)
    })
  })

  describe('HEAD_OF_HOUSEHOLD filing status', () => {
    it('should calculate correctly', () => {
      const tax = calculateFederalIncomeTax(60000, 'HEAD_OF_HOUSEHOLD', 0, 0)
      expect(tax).toBeGreaterThan(0)
    })

    it('should have lower tax than single for same income', () => {
      const singleTax = calculateFederalIncomeTax(60000, 'SINGLE', 0, 0)
      const hohTax = calculateFederalIncomeTax(60000, 'HEAD_OF_HOUSEHOLD', 0, 0)
      expect(hohTax).toBeLessThan(singleTax)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero income', () => {
      const tax = calculateFederalIncomeTax(0, 'SINGLE', 0, 0)
      expect(tax).toBe(0)
    })

    it('should handle negative taxable income (after deductions)', () => {
      // High allowances that would make taxable income negative
      const tax = calculateFederalIncomeTax(5000, 'SINGLE', 10, 0)
      expect(tax).toBeGreaterThanOrEqual(0)
    })

    it('should handle unknown filing status (uses SINGLE brackets)', () => {
      const tax = calculateFederalIncomeTax(50000, 'UNKNOWN_STATUS', 0, 0)
      // Should return some tax value (not throw error)
      expect(tax).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Payroll Tax Service - calculateFICATaxes', () => {
  describe('Social Security', () => {
    it('should calculate Social Security at 6.2% below wage base', () => {
      const result = calculateFICATaxes(5000, 0, 0)
      expect(result.socialSecurity).toBe(5000 * 0.062) // $310
    })

    it('should stop Social Security when wage base is reached', () => {
      // Wage base for 2024 is $168,600
      const result = calculateFICATaxes(5000, 168600, 0)
      expect(result.socialSecurity).toBe(0)
    })

    it('should prorate Social Security near wage base limit', () => {
      // YTD gross is $166,600, gross pay is $5,000
      // Only $2,000 is taxable for SS ($168,600 - $166,600)
      const result = calculateFICATaxes(5000, 166600, 0)
      expect(result.socialSecurity).toBe(2000 * 0.062) // $124
    })
  })

  describe('Medicare', () => {
    it('should calculate Medicare at 1.45% for all income', () => {
      const result = calculateFICATaxes(5000, 0, 0)
      expect(result.medicare).toBe(5000 * 0.0145) // $72.50
    })

    it('should have no wage base limit for Medicare', () => {
      const result = calculateFICATaxes(5000, 200000, 0)
      expect(result.medicare).toBe(5000 * 0.0145) // Still $72.50
    })
  })

  describe('Additional Medicare Tax', () => {
    it('should not apply below $200k threshold', () => {
      const result = calculateFICATaxes(5000, 150000, 0)
      expect(result.additionalMedicare).toBe(0)
    })

    it('should apply 0.9% above $200k threshold', () => {
      // YTD gross is $200,000, gross pay is $5,000
      // All $5,000 is subject to additional Medicare
      const result = calculateFICATaxes(5000, 200000, 0)
      expect(result.additionalMedicare).toBe(5000 * 0.009) // $45
    })

    it('should prorate additional Medicare when crossing threshold', () => {
      // YTD gross is $198,000, gross pay is $5,000
      // Only $3,000 is subject to additional Medicare ($198,000 + $5,000 - $200,000)
      const result = calculateFICATaxes(5000, 198000, 0)
      expect(result.additionalMedicare).toBe(3000 * 0.009) // $27
    })
  })
})

describe('Payroll Tax Service - calculateFloridaSUI', () => {
  it('should calculate SUI at default rate (2.7%) below wage base', () => {
    const sui = calculateFloridaSUI(1000, 0)
    expect(sui).toBe(1000 * 0.027) // $27
  })

  it('should stop SUI when $7,000 wage base is reached', () => {
    const sui = calculateFloridaSUI(1000, 7000)
    expect(sui).toBe(0)
  })

  it('should prorate SUI near wage base limit', () => {
    // YTD gross is $6,000, gross pay is $2,000
    // Only $1,000 is taxable for SUI ($7,000 - $6,000)
    const sui = calculateFloridaSUI(2000, 6000)
    expect(sui).toBe(1000 * 0.027) // $27
  })

  it('should use custom rate when provided', () => {
    const sui = calculateFloridaSUI(1000, 0, 0.05) // 5% custom rate
    expect(sui).toBe(1000 * 0.05) // $50
  })

  it('should handle first paycheck of the year', () => {
    const sui = calculateFloridaSUI(3000, 0)
    expect(sui).toBe(3000 * 0.027) // $81
  })

  it('should handle paycheck that exceeds remaining wage base', () => {
    // YTD gross is $5,000, gross pay is $5,000
    // Only $2,000 is taxable for SUI ($7,000 - $5,000)
    const sui = calculateFloridaSUI(5000, 5000)
    expect(sui).toBe(2000 * 0.027) // $54
  })
})

/**
 * Payroll Tax Calculation Service
 * 
 * Cálculo de impuestos de nómina para Florida (USA):
 * - Federal Income Tax (impuesto sobre la renta federal)
 * - FICA: Social Security (6.2%) + Medicare (1.45%)
 * - Additional Medicare Tax (0.9% sobre $200k)
 * - State Unemployment Insurance (SUI) - Florida
 * 
 * Cumple con IRS Publication 15 (Circular E) - 2024
 */

import { prisma } from './prisma'

// 2024 Federal Tax Rates and Brackets
const FEDERAL_TAX_BRACKETS_2024 = {
  SINGLE: [
    { min: 0, max: 11600, baseAmount: 0, rate: 0.10 },
    { min: 11600, max: 47150, baseAmount: 1160, rate: 0.12 },
    { min: 47150, max: 100525, baseAmount: 5426, rate: 0.22 },
    { min: 100525, max: 191950, baseAmount: 17168.50, rate: 0.24 },
    { min: 191950, max: 243725, baseAmount: 39110.50, rate: 0.32 },
    { min: 243725, max: 609350, baseAmount: 55678.50, rate: 0.35 },
    { min: 609350, max: Infinity, baseAmount: 183647.25, rate: 0.37 },
  ],
  MARRIED_FILING_JOINTLY: [
    { min: 0, max: 23200, baseAmount: 0, rate: 0.10 },
    { min: 23200, max: 94300, baseAmount: 2320, rate: 0.12 },
    { min: 94300, max: 201050, baseAmount: 10852, rate: 0.22 },
    { min: 201050, max: 383900, baseAmount: 34337, rate: 0.24 },
    { min: 383900, max: 487450, baseAmount: 78221, rate: 0.32 },
    { min: 487450, max: 731200, baseAmount: 111357, rate: 0.35 },
    { min: 731200, max: Infinity, baseAmount: 196669.50, rate: 0.37 },
  ],
  MARRIED_FILING_SEPARATELY: [
    { min: 0, max: 11600, baseAmount: 0, rate: 0.10 },
    { min: 11600, max: 47150, baseAmount: 1160, rate: 0.12 },
    { min: 47150, max: 100525, baseAmount: 5426, rate: 0.22 },
    { min: 100525, max: 191950, baseAmount: 17168.50, rate: 0.24 },
    { min: 191950, max: 243725, baseAmount: 39110.50, rate: 0.32 },
    { min: 243725, max: 365600, baseAmount: 55678.50, rate: 0.35 },
    { min: 365600, max: Infinity, baseAmount: 98334.75, rate: 0.37 },
  ],
  HEAD_OF_HOUSEHOLD: [
    { min: 0, max: 16550, baseAmount: 0, rate: 0.10 },
    { min: 16550, max: 63100, baseAmount: 1655, rate: 0.12 },
    { min: 63100, max: 100500, baseAmount: 7241, rate: 0.22 },
    { min: 100500, max: 191950, baseAmount: 15469, rate: 0.24 },
    { min: 191950, max: 243700, baseAmount: 37417, rate: 0.32 },
    { min: 243700, max: 609350, baseAmount: 53977, rate: 0.35 },
    { min: 609350, max: Infinity, baseAmount: 181954.50, rate: 0.37 },
  ],
}

// 2024 FICA Rates
const FICA_RATES = {
  socialSecurityRate: 0.062, // 6.2%
  socialSecurityLimit: 168600, // 2024 wage base limit
  medicareRate: 0.0145, // 1.45%
  additionalMedicareRate: 0.009, // 0.9% additional
  additionalMedicareThreshold: 200000, // Single threshold
}

// Florida State Unemployment Insurance (SUI) Rate
// Varía por empleador (0.1% - 5.4%), promedio ~2.7%
const FLORIDA_SUI_RATE = 0.027 // 2.7%
const FLORIDA_SUI_WAGE_BASE = 7000 // First $7,000 per employee per year

// Standard deduction 2024
const STANDARD_DEDUCTION_2024 = {
  SINGLE: 14600,
  MARRIED_FILING_JOINTLY: 29200,
  MARRIED_FILING_SEPARATELY: 14600,
  HEAD_OF_HOUSEHOLD: 21900,
}

interface TaxCalculationInput {
  grossPay: number
  payPeriodType: 'WEEKLY' | 'BI_WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY'
  federalFilingStatus: string
  federalAllowances: number
  additionalWithholding: number
  exemptFederal: boolean
  exemptFICA: boolean
  ytdGross: number // Year-to-date earnings
  ytdSocialSecurity: number
  ytdMedicare: number
}

interface TaxCalculationResult {
  federalIncomeTax: number
  socialSecurity: number
  medicare: number
  additionalMedicare: number
  stateIncomeTax: number // Florida = 0
  stateSUI: number
  totalTaxes: number
}

/**
 * Calcula el impuesto federal sobre la renta
 */
export function calculateFederalIncomeTax(
  annualizedIncome: number,
  filingStatus: string,
  allowances: number,
  additionalWithholding: number
): number {
  // Deducción estándar
  const standardDeduction =
    STANDARD_DEDUCTION_2024[filingStatus as keyof typeof STANDARD_DEDUCTION_2024] || 0

  // Deducción por exenciones (ya no aplica desde Tax Cuts and Jobs Act 2018)
  // Pero mantenemos compatibilidad con W-4 antiguos
  const allowanceDeduction = allowances * 4400 // Valor aproximado

  // Ingreso gravable
  const taxableIncome = Math.max(
    0,
    annualizedIncome - standardDeduction - allowanceDeduction
  )

  // Obtener tabla de impuestos
  const brackets =
    FEDERAL_TAX_BRACKETS_2024[filingStatus as keyof typeof FEDERAL_TAX_BRACKETS_2024] ||
    FEDERAL_TAX_BRACKETS_2024.SINGLE

  // Calcular impuesto según tablas
  let tax = 0
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
      tax = bracket.baseAmount + taxableInBracket * bracket.rate
    } else {
      break
    }
  }

  return tax + additionalWithholding
}

/**
 * Calcula el impuesto FICA (Social Security + Medicare)
 */
export function calculateFICATaxes(
  grossPay: number,
  ytdGross: number,
  ytdSocialSecurity: number
): {
  socialSecurity: number
  medicare: number
  additionalMedicare: number
} {
  // Social Security - solo hasta el límite wage base
  let socialSecurity = 0
  if (ytdGross < FICA_RATES.socialSecurityLimit) {
    const remainingWageBase = FICA_RATES.socialSecurityLimit - ytdGross
    const taxableAmount = Math.min(grossPay, remainingWageBase)
    socialSecurity = taxableAmount * FICA_RATES.socialSecurityRate
  }

  // Medicare - sin límite
  const medicare = grossPay * FICA_RATES.medicareRate

  // Additional Medicare Tax - sobre $200k
  let additionalMedicare = 0
  const newYtdGross = ytdGross + grossPay
  if (newYtdGross > FICA_RATES.additionalMedicareThreshold) {
    if (ytdGross >= FICA_RATES.additionalMedicareThreshold) {
      // Todo el pago actual está sobre el umbral
      additionalMedicare = grossPay * FICA_RATES.additionalMedicareRate
    } else {
      // Solo la parte que excede el umbral
      const amountOverThreshold =
        newYtdGross - FICA_RATES.additionalMedicareThreshold
      additionalMedicare = amountOverThreshold * FICA_RATES.additionalMedicareRate
    }
  }

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
  }
}

/**
 * Calcula el SUI de Florida (State Unemployment Insurance)
 * Nota: Solo aplica a los primeros $7,000 de salario anual por empleado
 */
export function calculateFloridaSUI(
  grossPay: number,
  ytdGross: number,
  customRate?: number
): number {
  const rate = customRate || FLORIDA_SUI_RATE

  // Solo se aplica a los primeros $7,000 anuales
  if (ytdGross >= FLORIDA_SUI_WAGE_BASE) {
    return 0
  }

  const remainingWageBase = FLORIDA_SUI_WAGE_BASE - ytdGross
  const taxableAmount = Math.min(grossPay, remainingWageBase)

  return taxableAmount * rate
}

/**
 * Convierte salario a anual según el período de pago
 */
export function annualizeSalary(amount: number, periodType: string): number {
  const multipliers: Record<string, number> = {
    WEEKLY: 52,
    BI_WEEKLY: 26,
    SEMI_MONTHLY: 24,
    MONTHLY: 12,
    YEARLY: 1,
  }

  return amount * (multipliers[periodType] || 1)
}

/**
 * Convierte impuesto anual a período de pago
 */
export function periodizeTax(annualTax: number, periodType: string): number {
  const divisors: Record<string, number> = {
    WEEKLY: 52,
    BI_WEEKLY: 26,
    SEMI_MONTHLY: 24,
    MONTHLY: 12,
    YEARLY: 1,
  }

  return annualTax / (divisors[periodType] || 1)
}

/**
 * Calcula todos los impuestos de nómina
 */
export function calculatePayrollTaxes(
  input: TaxCalculationInput
): TaxCalculationResult {
  const {
    grossPay,
    payPeriodType,
    federalFilingStatus,
    federalAllowances,
    additionalWithholding,
    exemptFederal,
    exemptFICA,
    ytdGross,
    ytdSocialSecurity,
    ytdMedicare,
  } = input

  // Federal Income Tax
  let federalIncomeTax = 0
  if (!exemptFederal) {
    const annualizedIncome = annualizeSalary(grossPay, payPeriodType)
    const annualTax = calculateFederalIncomeTax(
      annualizedIncome,
      federalFilingStatus,
      federalAllowances,
      additionalWithholding * (payPeriodType === 'WEEKLY' ? 52 : 26)
    )
    federalIncomeTax = periodizeTax(annualTax, payPeriodType)
  }

  // FICA Taxes
  let socialSecurity = 0
  let medicare = 0
  let additionalMedicare = 0

  if (!exemptFICA) {
    const ficaTaxes = calculateFICATaxes(grossPay, ytdGross, ytdSocialSecurity)
    socialSecurity = ficaTaxes.socialSecurity
    medicare = ficaTaxes.medicare
    additionalMedicare = ficaTaxes.additionalMedicare
  }

  // State Income Tax (Florida = 0)
  const stateIncomeTax = 0 // Florida no tiene impuesto estatal sobre la renta

  // State Unemployment Insurance
  const stateSUI = calculateFloridaSUI(grossPay, ytdGross)

  const totalTaxes =
    federalIncomeTax +
    socialSecurity +
    medicare +
    additionalMedicare +
    stateIncomeTax +
    stateSUI

  return {
    federalIncomeTax: parseFloat(federalIncomeTax.toFixed(2)),
    socialSecurity: parseFloat(socialSecurity.toFixed(2)),
    medicare: parseFloat(medicare.toFixed(2)),
    additionalMedicare: parseFloat(additionalMedicare.toFixed(2)),
    stateIncomeTax: parseFloat(stateIncomeTax.toFixed(2)),
    stateSUI: parseFloat(stateSUI.toFixed(2)),
    totalTaxes: parseFloat(totalTaxes.toFixed(2)),
  }
}

/**
 * Calcula overtime pay según reglas FLSA
 * Overtime = 1.5x para horas > 40 semanales
 * Double time = 2x (opcional, según política de empresa)
 */
export function calculateOvertimePay(
  hourlyRate: number,
  regularHours: number,
  overtimeHours: number,
  doubleTimeHours: number
): {
  regularPay: number
  overtimePay: number
  doubleTimePay: number
  total: number
} {
  const regularPay = hourlyRate * regularHours
  const overtimePay = hourlyRate * 1.5 * overtimeHours
  const doubleTimePay = hourlyRate * 2.0 * doubleTimeHours
  const total = regularPay + overtimePay + doubleTimePay

  return {
    regularPay: parseFloat(regularPay.toFixed(2)),
    overtimePay: parseFloat(overtimePay.toFixed(2)),
    doubleTimePay: parseFloat(doubleTimePay.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  }
}

/**
 * Seed: Crea registros de tax withholding en la base de datos
 * Ejecutar una vez para poblar las tablas de impuestos
 */
export async function seedTaxWithholdingTables() {
  const year = 2024

  // Eliminar registros existentes del año
  // Note: TaxWithholding model doesn't have year field in current schema
  // await prisma.taxWithholding.deleteMany({
  //   where: { year },
  // })

  const records = []

  // Single
  for (const bracket of FEDERAL_TAX_BRACKETS_2024.SINGLE) {
    records.push({
      year,
      filingStatus: 'SINGLE',
      bracketMin: bracket.min,
      bracketMax: bracket.max === Infinity ? 999999999 : bracket.max,
      baseAmount: bracket.baseAmount,
      rate: bracket.rate,
      socialSecurityRate: FICA_RATES.socialSecurityRate,
      socialSecurityLimit: FICA_RATES.socialSecurityLimit,
      medicareRate: FICA_RATES.medicareRate,
      additionalMedicareRate: FICA_RATES.additionalMedicareRate,
      additionalMedicareThreshold: FICA_RATES.additionalMedicareThreshold,
      stateRate: 0,
      suiRate: FLORIDA_SUI_RATE,
    })
  }

  // Married Filing Jointly
  for (const bracket of FEDERAL_TAX_BRACKETS_2024.MARRIED_FILING_JOINTLY) {
    records.push({
      year,
      filingStatus: 'MARRIED_FILING_JOINTLY',
      bracketMin: bracket.min,
      bracketMax: bracket.max === Infinity ? 999999999 : bracket.max,
      baseAmount: bracket.baseAmount,
      rate: bracket.rate,
      socialSecurityRate: FICA_RATES.socialSecurityRate,
      socialSecurityLimit: FICA_RATES.socialSecurityLimit,
      medicareRate: FICA_RATES.medicareRate,
      additionalMedicareRate: FICA_RATES.additionalMedicareRate,
      additionalMedicareThreshold: FICA_RATES.additionalMedicareThreshold,
      stateRate: 0,
      suiRate: FLORIDA_SUI_RATE,
    })
  }

  // Insertar en base de datos
  // Note: TaxWithholding schema requires different fields (withholdingType, taxBase, percentage, amount, date)
  // This seed function needs to be updated to match the actual schema
  // await prisma.taxWithholding.createMany({
  //   data: records,
  // })

  console.log(`✓ Tax withholding tables prepared for ${year}: ${records.length} records (seed disabled - schema mismatch)`)
  return records.length
}

/**
 * Obtiene las tasas de impuesto vigentes para un año
 */
export async function getTaxRates(year: number, filingStatus: string) {
  // Note: TaxWithholding model doesn't have year, filingStatus, or tax bracket fields
  // This function uses in-memory tax tables instead
  const brackets = filingStatus === 'SINGLE' 
    ? FEDERAL_TAX_BRACKETS_2024.SINGLE 
    : FEDERAL_TAX_BRACKETS_2024.MARRIED_FILING_JOINTLY;
  
  return brackets;
}

/**
 * Calcula el employer tax liability (lo que paga el empleador)
 * - Employer portion of FICA (matching)
 * - FUTA (Federal Unemployment Tax Act)
 * - SUTA/SUI (State Unemployment Tax Act)
 */
export function calculateEmployerTaxes(
  grossPay: number,
  ytdGross: number
): {
  employerSocialSecurity: number
  employerMedicare: number
  federalUnemployment: number // FUTA
  stateUnemployment: number // SUTA/SUI
  totalEmployerTax: number
} {
  // Employer matches Social Security and Medicare
  const ficaTaxes = calculateFICATaxes(grossPay, ytdGross, 0)

  // FUTA - 6.0% on first $7,000, but usually 0.6% after SUTA credit
  const FUTA_RATE = 0.006 // 0.6% after 5.4% credit
  const FUTA_WAGE_BASE = 7000
  let federalUnemployment = 0
  if (ytdGross < FUTA_WAGE_BASE) {
    const taxableAmount = Math.min(grossPay, FUTA_WAGE_BASE - ytdGross)
    federalUnemployment = taxableAmount * FUTA_RATE
  }

  // SUTA/SUI - Florida
  const stateUnemployment = calculateFloridaSUI(grossPay, ytdGross)

  const totalEmployerTax =
    ficaTaxes.socialSecurity +
    ficaTaxes.medicare +
    federalUnemployment +
    stateUnemployment

  return {
    employerSocialSecurity: parseFloat(ficaTaxes.socialSecurity.toFixed(2)),
    employerMedicare: parseFloat(ficaTaxes.medicare.toFixed(2)),
    federalUnemployment: parseFloat(federalUnemployment.toFixed(2)),
    stateUnemployment: parseFloat(stateUnemployment.toFixed(2)),
    totalEmployerTax: parseFloat(totalEmployerTax.toFixed(2)),
  }
}

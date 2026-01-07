import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Tax rates for Florida/USA (2025)
const TAX_RATES = {
  socialSecurity: 0.062, // 6.2% employee and employer
  medicare: 0.0145, // 1.45% employee and employer
  additionalMedicare: 0.009, // Additional 0.9% on wages over $200K
  futa: 0.006, // 0.6% FUTA (after SUTA credit)
  suta: 0.0275, // 2.75% Florida SUTA (average rate)
  socialSecurityWageBase: 168600, // 2025 wage base limit
  futaWageBase: 7000, // Per employee per year
  sutaWageBase: 7000, // Per employee per year
  additionalMedicareThreshold: 200000
}

// Simple federal tax withholding calculation (simplified)
function calculateFederalWithholding(grossPay: number, payPeriods: number = 24): number {
  const annualSalary = grossPay * payPeriods
  let tax = 0
  
  // 2025 tax brackets (Single filer, standard deduction)
  const standardDeduction = 14600
  const taxableIncome = Math.max(0, annualSalary - standardDeduction)
  
  if (taxableIncome <= 11600) {
    tax = taxableIncome * 0.10
  } else if (taxableIncome <= 47150) {
    tax = 1160 + (taxableIncome - 11600) * 0.12
  } else if (taxableIncome <= 100525) {
    tax = 5426 + (taxableIncome - 47150) * 0.22
  } else if (taxableIncome <= 191950) {
    tax = 17168.50 + (taxableIncome - 100525) * 0.24
  } else {
    tax = 39110.50 + (taxableIncome - 191950) * 0.32
  }
  
  return Math.round((tax / payPeriods) * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Default to current pay period if not specified
    const now = new Date()
    const defaultPeriodStart = periodStart 
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 16) // 16th of current month
    const defaultPeriodEnd = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month

    // Get all payroll data for the period
    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId,
        periodStart: {
          gte: defaultPeriodStart,
          lte: defaultPeriodEnd
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            salary: true
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    if (payrolls.length === 0) {
      return NextResponse.json({ 
        records: [],
        summary: {
          period: `${defaultPeriodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${defaultPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          totalFederalWithholding: 0,
          totalSocialSecurityEmployee: 0,
          totalSocialSecurityEmployer: 0,
          totalMedicareEmployee: 0,
          totalMedicareEmployer: 0,
          totalFUTA: 0,
          totalSUTA: 0,
          totalWithholdings: 0,
          totalEmployerContributions: 0,
          employees: 0
        }
      })
    }

    // Calculate tax records for each payroll
    const taxRecords = payrolls.map(payroll => {
      const grossPay = payroll.grossSalary
      
      // Calculate federal withholding
      const federalWithholding = calculateFederalWithholding(grossPay)
      
      // Social Security (6.2% up to wage base)
      const socialSecurity = Math.min(grossPay, TAX_RATES.socialSecurityWageBase) * TAX_RATES.socialSecurity
      
      // Medicare (1.45% + additional 0.9% over threshold)
      let medicare = grossPay * TAX_RATES.medicare
      if (grossPay > TAX_RATES.additionalMedicareThreshold) {
        medicare += (grossPay - TAX_RATES.additionalMedicareThreshold) * TAX_RATES.additionalMedicare
      }
      
      // FUTA (employer only, 0.6% on first $7,000)
      const futaEmployer = Math.min(grossPay, TAX_RATES.futaWageBase) * TAX_RATES.futa
      
      // Florida SUTA (employer only, 2.75% on first $7,000)
      const sutaEmployer = Math.min(grossPay, TAX_RATES.sutaWageBase) * TAX_RATES.suta
      
      const totalWithholdings = federalWithholding + socialSecurity + medicare
      const employerContributions = socialSecurity + medicare + futaEmployer + sutaEmployer

      return {
        id: payroll.id,
        employee: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        employeeId: payroll.employee.employeeNumber,
        period: `${payroll.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${payroll.periodEnd.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`,
        periodStart: payroll.periodStart.toISOString().split('T')[0],
        periodEnd: payroll.periodEnd.toISOString().split('T')[0],
        grossPay: Math.round(grossPay * 100) / 100,
        federalWithholding: Math.round(federalWithholding * 100) / 100,
        socialSecurity: Math.round(socialSecurity * 100) / 100,
        medicare: Math.round(medicare * 100) / 100,
        futaEmployer: Math.round(futaEmployer * 100) / 100,
        sutaEmployer: Math.round(sutaEmployer * 100) / 100,
        totalWithholdings: Math.round(totalWithholdings * 100) / 100,
        employerContributions: Math.round(employerContributions * 100) / 100,
        status: payroll.status.toLowerCase() as 'pending' | 'calculated' | 'filed' | 'paid'
      }
    })

    // Calculate summary
    const summary = {
      period: `${defaultPeriodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${defaultPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      totalFederalWithholding: taxRecords.reduce((sum, r) => sum + r.federalWithholding, 0),
      totalSocialSecurityEmployee: taxRecords.reduce((sum, r) => sum + r.socialSecurity, 0),
      totalSocialSecurityEmployer: taxRecords.reduce((sum, r) => sum + r.socialSecurity, 0),
      totalMedicareEmployee: taxRecords.reduce((sum, r) => sum + r.medicare, 0),
      totalMedicareEmployer: taxRecords.reduce((sum, r) => sum + r.medicare, 0),
      totalFUTA: taxRecords.reduce((sum, r) => sum + r.futaEmployer, 0),
      totalSUTA: taxRecords.reduce((sum, r) => sum + r.sutaEmployer, 0),
      totalWithholdings: taxRecords.reduce((sum, r) => sum + r.totalWithholdings, 0),
      totalEmployerContributions: taxRecords.reduce((sum, r) => sum + r.employerContributions, 0),
      employees: taxRecords.length
    }

    return NextResponse.json({ 
      records: taxRecords,
      summary
    })

  } catch (error) {
    console.error('Error fetching Florida payroll taxes:', error)
    return NextResponse.json({ error: 'Error fetching payroll taxes' }, { status: 500 })
  }
}

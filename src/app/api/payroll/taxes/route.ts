
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// US Tax Rates for 2024-2026 (Florida)
const TAX_RATES = {
  // FICA - Social Security & Medicare
  SOCIAL_SECURITY_EMPLOYEE: 0.062,  // 6.2% employee
  SOCIAL_SECURITY_EMPLOYER: 0.062,  // 6.2% employer
  SOCIAL_SECURITY_WAGE_BASE: 168600, // 2024 wage base limit
  MEDICARE_EMPLOYEE: 0.0145,        // 1.45% employee
  MEDICARE_EMPLOYER: 0.0145,        // 1.45% employer
  MEDICARE_ADDITIONAL: 0.009,       // Additional 0.9% for wages over $200k
  
  // Federal Unemployment (FUTA)
  FUTA_RATE: 0.006,                 // 0.6% after state credit
  FUTA_WAGE_BASE: 7000,             // First $7,000 per employee
  
  // Florida State Unemployment (SUTA)
  FLORIDA_SUTA_NEW_EMPLOYER: 0.027, // 2.7% for new employers
  FLORIDA_SUTA_WAGE_BASE: 7000,     // First $7,000 per employee
  
  // Workers' Compensation (varies by industry)
  WORKERS_COMP_RATE: 0.01,          // ~1% average for office work
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const period = searchParams.get('period') || 'current'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Get payroll data
    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId,
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: true
      }
    })

    // Get employees for department grouping
    const employees = await prisma.employee.findMany({
      where: { companyId }
    })

    // Calculate totals
    const totalGrossPay = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0)
    const totalDeductions = payrolls.reduce((s, p) => s + (p.deductions || 0), 0)
    const totalNetPay = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0)

    // US Tax Calculations
    
    // FICA - Social Security (6.2% employee + 6.2% employer)
    const socialSecurityEmployee = Math.min(totalGrossPay, TAX_RATES.SOCIAL_SECURITY_WAGE_BASE) * TAX_RATES.SOCIAL_SECURITY_EMPLOYEE
    const socialSecurityEmployer = Math.min(totalGrossPay, TAX_RATES.SOCIAL_SECURITY_WAGE_BASE) * TAX_RATES.SOCIAL_SECURITY_EMPLOYER
    
    // FICA - Medicare (1.45% employee + 1.45% employer)
    const medicareEmployee = totalGrossPay * TAX_RATES.MEDICARE_EMPLOYEE
    const medicareEmployer = totalGrossPay * TAX_RATES.MEDICARE_EMPLOYER
    
    // Federal Income Tax Withholding (estimated at ~15% average)
    const federalWithholding = totalGrossPay * 0.15
    
    // FUTA - Federal Unemployment (employer only)
    const futaTaxableWages = Math.min(employees.length * TAX_RATES.FUTA_WAGE_BASE, totalGrossPay)
    const futaTax = futaTaxableWages * TAX_RATES.FUTA_RATE
    
    // Florida SUTA - State Unemployment (employer only)
    const sutaTaxableWages = Math.min(employees.length * TAX_RATES.FLORIDA_SUTA_WAGE_BASE, totalGrossPay)
    const sutaTax = sutaTaxableWages * TAX_RATES.FLORIDA_SUTA_NEW_EMPLOYER
    
    // Workers' Compensation (employer only)
    const workersComp = totalGrossPay * TAX_RATES.WORKERS_COMP_RATE

    // Tax obligations summary - US/Florida format
    const taxObligations = [
      {
        id: 'FICA_SS',
        name: 'Social Security (FICA)',
        description: 'Social Security Tax - 6.2% employee + 6.2% employer',
        employeeAmount: socialSecurityEmployee,
        employerAmount: socialSecurityEmployer,
        amount: socialSecurityEmployee + socialSecurityEmployer,
        dueDate: '15th of following month',
        status: 'pending',
        form: 'Form 941'
      },
      {
        id: 'FICA_MED',
        name: 'Medicare (FICA)',
        description: 'Medicare Tax - 1.45% employee + 1.45% employer',
        employeeAmount: medicareEmployee,
        employerAmount: medicareEmployer,
        amount: medicareEmployee + medicareEmployer,
        dueDate: '15th of following month',
        status: 'pending',
        form: 'Form 941'
      },
      {
        id: 'FED_WITHHOLDING',
        name: 'Federal Income Tax',
        description: 'Federal income tax withheld from employee wages',
        employeeAmount: federalWithholding,
        employerAmount: 0,
        amount: federalWithholding,
        dueDate: '15th of following month',
        status: 'pending',
        form: 'Form 941'
      },
      {
        id: 'FUTA',
        name: 'Federal Unemployment (FUTA)',
        description: 'Federal unemployment tax - 0.6% employer only',
        employeeAmount: 0,
        employerAmount: futaTax,
        amount: futaTax,
        dueDate: 'Quarterly (Form 940)',
        status: 'pending',
        form: 'Form 940'
      },
      {
        id: 'FL_SUTA',
        name: 'Florida Unemployment (SUTA)',
        description: 'Florida reemployment tax - employer only',
        employeeAmount: 0,
        employerAmount: sutaTax,
        amount: sutaTax,
        dueDate: 'Quarterly',
        status: 'pending',
        form: 'RT-6'
      },
      {
        id: 'WORKERS_COMP',
        name: 'Workers\' Compensation',
        description: 'Florida workers\' compensation insurance',
        employeeAmount: 0,
        employerAmount: workersComp,
        amount: workersComp,
        dueDate: 'Per policy',
        status: 'pending',
        form: 'Insurance'
      }
    ]

    // Summary by department
    const employeesByDept: Record<string, string[]> = {}
    employees.forEach(emp => {
      const dept = emp.department || 'General'
      if (!employeesByDept[dept]) {
        employeesByDept[dept] = []
      }
      employeesByDept[dept].push(emp.id)
    })

    const departmentSummary = Object.entries(employeesByDept).map(([dept, empIds]) => {
      const deptPayrolls = payrolls.filter(p => empIds.includes(p.employeeId))
      return {
        department: dept,
        employees: empIds.length,
        grossPay: deptPayrolls.reduce((s, p) => s + (p.grossSalary || 0), 0),
        deductions: deptPayrolls.reduce((s, p) => s + (p.deductions || 0), 0),
        netPay: deptPayrolls.reduce((s, p) => s + (p.netSalary || 0), 0)
      }
    })

    // Calculate totals
    const totalEmployeeTaxes = socialSecurityEmployee + medicareEmployee + federalWithholding
    const totalEmployerTaxes = socialSecurityEmployer + medicareEmployer + futaTax + sutaTax + workersComp

    return NextResponse.json({ 
      summary: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalEmployees: employees.length,
        totalPayrolls: payrolls.length,
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        totalEmployeeTaxes,
        totalEmployerTaxes,
        totalTaxObligations: totalEmployeeTaxes + totalEmployerTaxes
      },
      taxRates: TAX_RATES,
      taxObligations,
      departmentSummary
    })

  } catch (error) {
    console.error('Error fetching payroll taxes:', error)
    return NextResponse.json({ error: 'Error fetching payroll taxes' }, { status: 500 })
  }
}

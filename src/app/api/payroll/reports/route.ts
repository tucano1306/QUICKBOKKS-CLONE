import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Get payrolls for the period
    const where: Record<string, unknown> = {}
    if (startDate) {
      where.payPeriodStart = { gte: new Date(startDate) }
    }
    if (endDate) {
      where.payPeriodEnd = { lte: new Date(endDate) }
    }

    // Get employees with their payroll records
    const employees = await prisma.employee.findMany({
      where: { companyId },
      include: {
        payrolls: {
          orderBy: { periodEnd: 'desc' },
          take: 1
        }
      }
    })

    // Calculate department costs
    const departmentMap = new Map<string, {
      department: string
      employees: number
      grossPay: number
      deductions: number
      netPay: number
      employerCosts: number
      totalCost: number
    }>()

    employees.forEach(emp => {
      const dept = emp.department || 'General'
      const record = emp.payrolls[0]
      
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          employees: 0,
          grossPay: 0,
          deductions: 0,
          netPay: 0,
          employerCosts: 0,
          totalCost: 0
        })
      }
      
      const deptData = departmentMap.get(dept)!
      deptData.employees++
      
      if (record) {
        deptData.grossPay += record.grossSalary || 0
        deptData.deductions += record.deductions || 0
        deptData.netPay += record.netSalary || 0
        // Estimate employer costs as ~10.65% of gross (US: 6.2% SS + 1.45% Medicare + 2.7% SUTA + 0.3% FUTA estimate)
        const employerCost = (record.grossSalary || 0) * 0.1065
        deptData.employerCosts += employerCost
        deptData.totalCost += (record.grossSalary || 0) + employerCost
      }
    })

    const departmentCosts = Array.from(departmentMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)

    // Calculate totals
    const totals = departmentCosts.reduce((acc, dept) => ({
      totalEmployees: acc.totalEmployees + dept.employees,
      totalGrossPay: acc.totalGrossPay + dept.grossPay,
      totalDeductions: acc.totalDeductions + dept.deductions,
      totalNetPay: acc.totalNetPay + dept.netPay,
      totalEmployerCosts: acc.totalEmployerCosts + dept.employerCosts,
      grandTotal: acc.grandTotal + dept.totalCost
    }), {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      totalEmployerCosts: 0,
      grandTotal: 0
    })

    // Standard report types
    const reports = [
      {
        id: 'payroll-summary',
        type: 'summary',
        name: 'Payroll Summary',
        description: 'Consolidated report of earnings, deductions, and net pay',
        color: 'blue'
      },
      {
        id: 'tax-report',
        type: 'tax',
        name: 'Tax Report',
        description: 'FICA (Social Security & Medicare), Federal & State Taxes',
        color: 'red'
      },
      {
        id: 'department-costs',
        type: 'costs',
        name: 'Department Costs',
        description: 'Total payroll cost analysis by department',
        color: 'purple'
      },
      {
        id: 'deductions-report',
        type: 'deductions',
        name: 'Deductions Report',
        description: 'Detailed breakdown of all applied deductions',
        color: 'orange'
      },
      {
        id: 'overtime-report',
        type: 'overtime',
        name: 'Overtime Report',
        description: 'Time and a half & double time analysis',
        color: 'green'
      },
      {
        id: 'employee-cost',
        type: 'employee',
        name: 'Employee Cost',
        description: 'Individual employee total cost breakdown',
        color: 'indigo'
      }
    ]

    return NextResponse.json({
      reports,
      departmentCosts,
      totals
    })
  } catch (error) {
    console.error('Error fetching payroll reports:', error)
    return NextResponse.json({ error: 'Error fetching reports' }, { status: 500 })
  }
}

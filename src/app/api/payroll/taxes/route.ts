
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Calculate tax obligations
    const totalGrossPay = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0)
    const totalDeductions = payrolls.reduce((s, p) => s + (p.deductions || 0), 0)
    const totalNetPay = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0)

    // IMSS calculation (employer portion ~25% of salary)
    const imssEmployer = totalGrossPay * 0.25

    // ISR withholding (already deducted)
    const isrWithheld = totalDeductions * 0.5 // Approximate ISR portion of deductions

    // Infonavit (5% of salary)
    const infonavit = totalGrossPay * 0.05

    // SAR (2% of salary)
    const sar = totalGrossPay * 0.02

    // Tax obligations summary
    const taxObligations = [
      {
        id: 'IMSS',
        name: 'Cuotas IMSS',
        description: 'Cuotas patronales IMSS',
        amount: imssEmployer,
        dueDate: 'Día 17 del mes siguiente',
        status: 'pending'
      },
      {
        id: 'ISR',
        name: 'ISR Retenido',
        description: 'Impuesto sobre la renta retenido a empleados',
        amount: isrWithheld,
        dueDate: 'Día 17 del mes siguiente',
        status: 'pending'
      },
      {
        id: 'INFONAVIT',
        name: 'Aportaciones Infonavit',
        description: 'Aportaciones al Infonavit',
        amount: infonavit,
        dueDate: 'Día 17 del mes siguiente',
        status: 'pending'
      },
      {
        id: 'SAR',
        name: 'Aportaciones SAR',
        description: 'Sistema de Ahorro para el Retiro',
        amount: sar,
        dueDate: 'Bimestral',
        status: 'pending'
      }
    ]

    // Summary by department
    const employeesByDept: Record<string, string[]> = {}
    employees.forEach(emp => {
      const dept = emp.department || 'Sin Departamento'
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
        totalTaxObligations: imssEmployer + isrWithheld + infonavit + sar
      },
      taxObligations,
      departmentSummary
    })

  } catch (error) {
    console.error('Error fetching payroll taxes:', error)
    return NextResponse.json({ error: 'Error fetching payroll taxes' }, { status: 500 })
  }
}

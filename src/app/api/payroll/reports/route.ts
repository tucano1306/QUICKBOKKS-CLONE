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
        // Estimate employer costs as ~13.7% of gross (Mexican IMSS + Infonavit average)
        const employerCost = (record.grossSalary || 0) * 0.137
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
        name: 'Resumen de Nómina',
        description: 'Reporte consolidado de percepciones, deducciones y pagos netos',
        color: 'blue'
      },
      {
        id: 'tax-report',
        type: 'tax',
        name: 'Reporte de Impuestos',
        description: 'ISR, IMSS e INFONAVIT - Retenciones y aportaciones',
        color: 'red'
      },
      {
        id: 'department-costs',
        type: 'costs',
        name: 'Costos por Departamento',
        description: 'Análisis de costo total de nómina por área',
        color: 'purple'
      },
      {
        id: 'deductions-report',
        type: 'deductions',
        name: 'Reporte de Deducciones',
        description: 'Detalle de todas las deducciones aplicadas',
        color: 'orange'
      },
      {
        id: 'overtime-report',
        type: 'overtime',
        name: 'Reporte de Horas Extra',
        description: 'Análisis de tiempo extra y tiempo doble',
        color: 'green'
      },
      {
        id: 'employee-cost',
        type: 'employee',
        name: 'Costo por Empleado',
        description: 'Detalle individual del costo total por empleado',
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
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Calcular nómina completa para un período
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { periodStart, periodEnd, payDate, periodType, employeeIds, includeOvertime } = data

    // Obtener empleados activos
    const employees = await (prisma as any).employee.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
        ...(employeeIds?.length > 0 ? { id: { in: employeeIds } } : {})
      },
      include: {
        timeEntries: {
          where: {
            date: {
              gte: new Date(periodStart),
              lte: new Date(periodEnd)
            },
            status: 'APPROVED'
          }
        }
      }
    })

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No hay empleados activos' }, { status: 400 })
    }

    // Tasas de impuestos y deducciones (configurables)
    const TAX_RATES = {
      FEDERAL: 0.12, // 12% federal
      STATE: 0.05,   // 5% estatal
      SOCIAL_SECURITY: 0.0620, // 6.20%
      MEDICARE: 0.0145 // 1.45%
    }

    // Calcular nómina para cada empleado
    const calculations = employees.map((emp: any) => {
      // Calcular salario bruto basado en tipo de salario
      let grossSalary = calculateGrossSalary(emp, periodType || 'MONTHLY')
      
      // Agregar horas extras si hay entradas de tiempo
      let overtimeHours = 0
      let regularHours = 0
      
      if (emp.timeEntries.length > 0 && includeOvertime) {
        regularHours = emp.timeEntries.reduce((sum: number, te: any) => sum + (te.hoursWorked || 0), 0)
        overtimeHours = emp.timeEntries.reduce((sum: number, te: any) => sum + (te.overtime || 0), 0)
        
        // Si es por hora, recalcular
        if (emp.salaryType === 'HOURLY') {
          grossSalary = (regularHours * emp.salary) + (overtimeHours * emp.salary * 1.5)
        } else if (overtimeHours > 0) {
          // Agregar pago de horas extras (1.5x tasa horaria estimada)
          const hourlyRate = grossSalary / (periodType === 'MONTHLY' ? 160 : periodType === 'BIWEEKLY' ? 80 : 40)
          grossSalary += overtimeHours * hourlyRate * 1.5
        }
      }

      // Calcular deducciones
      const federalTax = grossSalary * TAX_RATES.FEDERAL
      const stateTax = grossSalary * TAX_RATES.STATE
      const socialSecurity = grossSalary * TAX_RATES.SOCIAL_SECURITY
      const medicare = grossSalary * TAX_RATES.MEDICARE
      
      const totalDeductions = federalTax + stateTax + socialSecurity + medicare
      const netSalary = grossSalary - totalDeductions

      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        position: emp.position,
        salaryType: emp.salaryType,
        baseSalary: emp.salary,
        regularHours,
        overtimeHours,
        grossSalary: Math.round(grossSalary * 100) / 100,
        deductions: {
          federalTax: Math.round(federalTax * 100) / 100,
          stateTax: Math.round(stateTax * 100) / 100,
          socialSecurity: Math.round(socialSecurity * 100) / 100,
          medicare: Math.round(medicare * 100) / 100,
          total: Math.round(totalDeductions * 100) / 100
        },
        netSalary: Math.round(netSalary * 100) / 100
      }
    })

    // Totales
    const totals = {
      employeeCount: calculations.length,
      totalGross: calculations.reduce((sum, c) => sum + c.grossSalary, 0),
      totalDeductions: calculations.reduce((sum, c) => sum + c.deductions.total, 0),
      totalNet: calculations.reduce((sum, c) => sum + c.netSalary, 0),
      totalOvertime: calculations.reduce((sum, c) => sum + c.overtimeHours, 0)
    }

    return NextResponse.json({
      period: {
        start: periodStart,
        end: periodEnd,
        payDate,
        type: periodType || 'MONTHLY'
      },
      calculations,
      totals,
      calculatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error calculating payroll:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateGrossSalary(employee: any, periodType: string): number {
  const { salary, salaryType } = employee
  
  switch (salaryType) {
    case 'YEARLY':
      if (periodType === 'MONTHLY') return salary / 12
      if (periodType === 'BIWEEKLY') return salary / 26
      if (periodType === 'WEEKLY') return salary / 52
      return salary / 12
    case 'MONTHLY':
      if (periodType === 'MONTHLY') return salary
      if (periodType === 'BIWEEKLY') return (salary * 12) / 26
      if (periodType === 'WEEKLY') return (salary * 12) / 52
      return salary
    case 'BIWEEKLY':
      if (periodType === 'MONTHLY') return (salary * 26) / 12
      if (periodType === 'BIWEEKLY') return salary
      if (periodType === 'WEEKLY') return salary / 2
      return (salary * 26) / 12
    case 'WEEKLY':
      if (periodType === 'MONTHLY') return (salary * 52) / 12
      if (periodType === 'BIWEEKLY') return salary * 2
      if (periodType === 'WEEKLY') return salary
      return (salary * 52) / 12
    case 'HOURLY':
      const hours = periodType === 'MONTHLY' ? 160 : periodType === 'BIWEEKLY' ? 80 : 40
      return salary * hours
    default:
      return salary
  }
}

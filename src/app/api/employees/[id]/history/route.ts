import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET employee work history (payrolls, deductions, etc.)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // Get all payrolls for this employee
    const payrolls = await prisma.payroll.findMany({
      where: { employeeId: params.id },
      include: {
        deductionItems: true,
      },
      orderBy: { periodEnd: 'desc' },
    })

    // Calculate summary statistics
    const totalGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0)
    const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0)
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.deductions, 0)
    const totalBonuses = payrolls.reduce((sum, p) => sum + p.bonuses, 0)

    // Group by year for annual summary
    const byYear: Record<number, { gross: number; net: number; count: number }> = {}
    payrolls.forEach((p) => {
      const year = new Date(p.periodEnd).getFullYear()
      if (!byYear[year]) {
        byYear[year] = { gross: 0, net: 0, count: 0 }
      }
      byYear[year].gross += p.grossSalary
      byYear[year].net += p.netSalary
      byYear[year].count += 1
    })

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        department: employee.department,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        status: employee.status,
      },
      summary: {
        totalPayrolls: payrolls.length,
        totalGross,
        totalNet,
        totalDeductions,
        totalBonuses,
        averageGross: payrolls.length > 0 ? totalGross / payrolls.length : 0,
        averageNet: payrolls.length > 0 ? totalNet / payrolls.length : 0,
      },
      byYear: Object.entries(byYear)
        .map(([year, data]) => ({
          year: parseInt(year),
          ...data,
        }))
        .sort((a, b) => b.year - a.year),
      payrolls: payrolls.map((p) => ({
        id: p.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        grossSalary: p.grossSalary,
        deductions: p.deductions,
        bonuses: p.bonuses,
        netSalary: p.netSalary,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        checkNumber: p.checkNumber,
        status: p.status,
        deductionItems: p.deductionItems,
      })),
    })
  } catch (error) {
    console.error('Error fetching employee history:', error)
    return NextResponse.json(
      { error: 'Error al obtener historial' },
      { status: 500 }
    )
  }
}

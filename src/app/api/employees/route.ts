import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET all employees - filtrados por companyId
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

    // Si no hay companyId, requerir uno para asegurar aislamiento
    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere companyId para listar empleados' }, { status: 400 })
    }

    // Verificar acceso a la empresa
    const hasAccess = await prisma.companyUser.findFirst({
      where: {
        userId: session.user.id,
        companyId: companyId
      }
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(status && { status: status as any }),
      },
      include: {
        _count: {
          select: {
            payrolls: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    )
  }
}

// POST new employee
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      hireDate,
      salary,
      salaryType,
      taxId,
      bankAccount,
      address,
      companyId,
    } = body

    if (!employeeNumber || !firstName || !lastName || !email || !position || !salary) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Se requiere companyId para crear empleados' },
        { status: 400 }
      )
    }

    // Verificar acceso a la empresa
    const hasAccess = await prisma.companyUser.findFirst({
      where: {
        userId: session.user.id,
        companyId: companyId
      }
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const employee = await prisma.employee.create({
      data: {
        userId: session.user.id,
        companyId,
        employeeNumber,
        firstName,
        lastName,
        email,
        phone,
        position,
        department,
        hireDate: new Date(hireDate || Date.now()),
        salary: parseFloat(salary),
        salaryType: salaryType || 'MONTHLY',
        taxId,
        bankAccount,
        address,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET single employee
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
      include: {
        payrolls: {
          orderBy: { periodEnd: 'desc' },
          take: 10,
        },
        _count: {
          select: { payrolls: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Error al obtener empleado' },
      { status: 500 }
    )
  }
}

// PUT update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const existing = await prisma.employee.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
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
      terminationDate,
      salary,
      salaryType,
      taxId,
      bankAccount,
      address,
      status,
    } = body

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(employeeNumber && { employeeNumber }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(position && { position }),
        ...(department !== undefined && { department }),
        ...(hireDate && { hireDate: new Date(hireDate) }),
        ...(terminationDate !== undefined && {
          terminationDate: terminationDate ? new Date(terminationDate) : null,
        }),
        ...(salary !== undefined && { salary: parseFloat(salary) }),
        ...(salaryType && { salaryType }),
        ...(taxId !== undefined && { taxId }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
      },
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    )
  }
}

// DELETE employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const existing = await prisma.employee.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { payrolls: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // If employee has payrolls, soft delete (change status)
    if (existing._count.payrolls > 0) {
      await prisma.employee.update({
        where: { id: params.id },
        data: {
          status: 'TERMINATED',
          terminationDate: new Date(),
        },
      })
      return NextResponse.json({
        message: 'Empleado marcado como terminado (tiene historial de nóminas)',
      })
    }

    // Otherwise hard delete
    await prisma.employee.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Empleado eliminado' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    )
  }
}

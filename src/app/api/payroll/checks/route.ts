import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Listar cheques de nómina
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Obtener empleados del usuario
    const employees = await (prisma as any).employee.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })
    const employeeIds = employees.map((e: any) => e.id)

    const where: any = { employeeId: { in: employeeIds } }

    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId
    if (startDate && endDate) {
      where.checkDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const checks = await (prisma as any).payrollCheck.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            department: true
          }
        },
        payroll: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true
          }
        }
      },
      orderBy: { checkDate: 'desc' }
    })

    // Estadísticas
    const stats = {
      total: checks.length,
      totalAmount: checks.reduce((sum: number, c: any) => sum + c.amount, 0),
      pending: checks.filter((c: any) => c.status === 'PENDING').length,
      printed: checks.filter((c: any) => c.status === 'PRINTED').length,
      issued: checks.filter((c: any) => c.status === 'ISSUED').length,
      voided: checks.filter((c: any) => c.status === 'VOIDED').length
    }

    return NextResponse.json({ checks, stats })
  } catch (error: any) {
    console.error('Error getting checks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crear nuevo cheque
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { employeeId, payrollId, amount, checkDate, memo, bankAccount, checkNumber } = data

    // Verificar empleado
    const employee = await (prisma as any).employee.findFirst({
      where: { id: employeeId, userId: session.user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Generar número de cheque si no se proporciona
    let finalCheckNumber = checkNumber
    if (!finalCheckNumber) {
      const lastCheck = await (prisma as any).payrollCheck.findFirst({
        orderBy: { checkNumber: 'desc' }
      })
      const lastNum = lastCheck ? parseInt(lastCheck.checkNumber.replace(/\D/g, '')) || 0 : 1000
      finalCheckNumber = String(lastNum + 1).padStart(6, '0')
    }

    // Verificar que el número no exista
    const existing = await (prisma as any).payrollCheck.findUnique({
      where: { checkNumber: finalCheckNumber }
    })
    if (existing) {
      return NextResponse.json({ error: 'Número de cheque ya existe' }, { status: 400 })
    }

    const check = await (prisma as any).payrollCheck.create({
      data: {
        employeeId,
        payrollId,
        checkNumber: finalCheckNumber,
        amount,
        checkDate: new Date(checkDate),
        memo,
        bankAccount,
        status: 'PENDING'
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json(check, { status: 201 })
  } catch (error: any) {
    console.error('Error creating check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar cheque (imprimir, emitir, anular)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { id, action, voidReason, checkNumber } = data

    const check = await (prisma as any).payrollCheck.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!check || check.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Cheque no encontrado' }, { status: 404 })
    }

    const updateData: any = {}

    switch (action) {
      case 'print':
        updateData.status = 'PRINTED'
        updateData.printedAt = new Date()
        break
      case 'issue':
        updateData.status = 'ISSUED'
        break
      case 'void':
        updateData.status = 'VOIDED'
        updateData.voidedAt = new Date()
        updateData.voidReason = voidReason || 'Sin razón especificada'
        break
      case 'assign_number':
        if (checkNumber) {
          // Verificar disponibilidad
          const existing = await (prisma as any).payrollCheck.findFirst({
            where: { checkNumber, id: { not: id } }
          })
          if (existing) {
            return NextResponse.json({ error: 'Número ya asignado' }, { status: 400 })
          }
          updateData.checkNumber = checkNumber
        }
        break
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    const updated = await (prisma as any).payrollCheck.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Eliminar cheque (solo si está pendiente)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const check = await (prisma as any).payrollCheck.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!check || check.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Cheque no encontrado' }, { status: 404 })
    }

    if (check.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solo se pueden eliminar cheques pendientes' }, { status: 400 })
    }

    await (prisma as any).payrollCheck.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

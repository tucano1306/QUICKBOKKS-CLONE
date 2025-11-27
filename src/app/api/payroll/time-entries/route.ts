import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar entradas de tiempo
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    // Obtener empleados del usuario
    const employees = await (prisma as any).employee.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })
    const employeeIds = employees.map((e: any) => e.id)

    const where: any = { employeeId: { in: employeeIds } }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (status) {
      where.status = status
    }

    const entries = await (prisma as any).timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            department: true,
            position: true
          }
        }
      },
      orderBy: [{ date: 'desc' }, { clockIn: 'desc' }]
    })

    // Calcular estadísticas
    const stats = {
      totalEntries: entries.length,
      totalHours: entries.reduce((sum: number, e: any) => sum + (e.hoursWorked || 0), 0),
      totalOvertime: entries.reduce((sum: number, e: any) => sum + (e.overtime || 0), 0),
      pendingApproval: entries.filter((e: any) => e.status === 'PENDING').length
    }

    return NextResponse.json({ entries, stats })
  } catch (error: any) {
    console.error('Error getting time entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Registrar entrada/salida
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { employeeId, date, clockIn, clockOut, breakMinutes, notes, overtime } = data

    // Verificar que el empleado pertenece al usuario
    const employee = await (prisma as any).employee.findFirst({
      where: { id: employeeId, userId: session.user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Calcular horas trabajadas
    let hoursWorked = 0
    if (clockIn && clockOut) {
      const start = new Date(clockIn)
      const end = new Date(clockOut)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      hoursWorked = Math.max(0, diffHours - (breakMinutes || 0) / 60)
    }

    const entry = await (prisma as any).timeEntry.create({
      data: {
        employeeId,
        date: new Date(date),
        clockIn: new Date(clockIn),
        clockOut: clockOut ? new Date(clockOut) : null,
        breakMinutes: breakMinutes || 0,
        hoursWorked,
        overtime: overtime || 0,
        notes,
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

    return NextResponse.json(entry, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar entrada de tiempo
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { id, clockIn, clockOut, breakMinutes, notes, overtime, status } = data

    // Verificar propiedad
    const existing = await (prisma as any).timeEntry.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!existing || existing.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
    }

    // Recalcular horas si se modifican tiempos
    let hoursWorked = existing.hoursWorked
    if (clockIn && clockOut) {
      const start = new Date(clockIn)
      const end = new Date(clockOut)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      hoursWorked = Math.max(0, diffHours - (breakMinutes ?? existing.breakMinutes) / 60)
    }

    const updateData: any = { hoursWorked }
    if (clockIn) updateData.clockIn = new Date(clockIn)
    if (clockOut) updateData.clockOut = new Date(clockOut)
    if (breakMinutes !== undefined) updateData.breakMinutes = breakMinutes
    if (notes !== undefined) updateData.notes = notes
    if (overtime !== undefined) updateData.overtime = overtime
    if (status) {
      updateData.status = status
      if (status === 'APPROVED') {
        updateData.approvedBy = session.user.id
        updateData.approvedAt = new Date()
      }
    }

    const updated = await (prisma as any).timeEntry.update({
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
    console.error('Error updating time entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Eliminar entrada de tiempo
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

    // Verificar propiedad
    const existing = await (prisma as any).timeEntry.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!existing || existing.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
    }

    await (prisma as any).timeEntry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

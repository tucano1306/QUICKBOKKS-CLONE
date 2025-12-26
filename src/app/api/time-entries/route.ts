import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const employeeId = searchParams.get('employeeId')
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    
    if (companyId) {
      where.employee = { companyId }
    }
    if (employeeId) {
      where.employeeId = employeeId
    }
    if (projectId) {
      where.projectId = projectId
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate)
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { clockIn: 'desc' },
      take: 500
    })

    // Calculate hours worked for each entry
    const entriesWithHours = timeEntries.map(entry => {
      let hoursWorked = entry.hoursWorked
      if (!hoursWorked && entry.clockOut) {
        const clockIn = new Date(entry.clockIn)
        const clockOut = new Date(entry.clockOut)
        hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        hoursWorked -= entry.breakMinutes / 60
      }
      return {
        ...entry,
        hoursWorked: Math.round((hoursWorked || 0) * 100) / 100
      }
    })

    return NextResponse.json({ timeEntries: entriesWithHours })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json({ error: 'Error al obtener registros de tiempo' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      employeeId,
      projectId,
      date,
      clockIn,
      clockOut,
      breakMinutes = 0,
      notes,
      status = 'PENDING'
    } = body

    if (!employeeId) {
      return NextResponse.json({ error: 'El empleado es requerido' }, { status: 400 })
    }

    if (!clockIn) {
      return NextResponse.json({ error: 'La hora de entrada es requerida' }, { status: 400 })
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Calculate hours worked
    let hoursWorked = null
    if (clockOut) {
      const inTime = new Date(clockIn)
      const outTime = new Date(clockOut)
      hoursWorked = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
      hoursWorked -= breakMinutes / 60
      hoursWorked = Math.max(0, hoursWorked)
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId,
        projectId: projectId || null,
        date: new Date(date || clockIn),
        clockIn: new Date(clockIn),
        clockOut: clockOut ? new Date(clockOut) : null,
        breakMinutes: parseInt(breakMinutes) || 0,
        hoursWorked,
        notes,
        status
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json({ timeEntry }, { status: 201 })
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json({ error: 'Error al crear registro de tiempo' }, { status: 500 })
  }
}

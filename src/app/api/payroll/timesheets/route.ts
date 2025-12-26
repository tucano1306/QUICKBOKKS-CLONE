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
    const employeeId = searchParams.get('employeeId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    const where: Record<string, unknown> = {}
    
    // Filter by company through employee
    if (employeeId) {
      where.employeeId = employeeId
    }
    
    if (startDate) {
      where.date = { ...where.date as object, gte: new Date(startDate) }
    }
    if (endDate) {
      where.date = { ...where.date as object, lte: new Date(endDate) }
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
        }
      },
      orderBy: { date: 'desc' }
    })

    // Group by employee and week for timesheet view
    const groupedEntries = new Map<string, {
      employee: string
      employeeId: string
      department: string
      entries: typeof timeEntries
      weekStarting: string
      weekEnding: string
      regularHours: number
      overtimeHours: number
      totalHours: number
    }>()

    timeEntries.forEach(entry => {
      const date = new Date(entry.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const key = `${entry.employeeId}-${weekStart.toISOString().split('T')[0]}`
      
      if (!groupedEntries.has(key)) {
        groupedEntries.set(key, {
          employee: `${entry.employee.firstName} ${entry.employee.lastName}`,
          employeeId: entry.employeeId,
          department: entry.employee.department || 'General',
          entries: [],
          weekStarting: weekStart.toISOString().split('T')[0],
          weekEnding: weekEnd.toISOString().split('T')[0],
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0
        })
      }
      
      const group = groupedEntries.get(key)!
      group.entries.push(entry)
      const hours = entry.hoursWorked || 0
      if (group.regularHours < 40) {
        const regularToAdd = Math.min(hours, 40 - group.regularHours)
        group.regularHours += regularToAdd
        group.overtimeHours += hours - regularToAdd
      } else {
        group.overtimeHours += hours
      }
      group.totalHours = group.regularHours + group.overtimeHours
    })

    const timesheets = Array.from(groupedEntries.values()).map((g, idx) => ({
      id: `TS-${String(idx + 1).padStart(3, '0')}`,
      ...g,
      status: g.totalHours > 0 ? 'approved' : 'pending',
      submittedDate: g.weekEnding,
      approvedBy: null,
      approvedDate: null
    }))

    return NextResponse.json({ timesheets, entries: timeEntries })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, date, clockIn, clockOut, type, notes } = body

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employeeId y date son requeridos' },
        { status: 400 }
      )
    }

    // Calculate hours worked
    let hoursWorked = 0
    if (clockIn && clockOut) {
      const start = new Date(clockIn)
      const end = new Date(clockOut)
      hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }

    const entry = await prisma.timeEntry.create({
      data: {
        employeeId,
        date: new Date(date),
        clockIn: clockIn ? new Date(clockIn) : new Date(),
        clockOut: clockOut ? new Date(clockOut) : null,
        hoursWorked,
        notes,
        status: 'PENDING'
      }
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, approvedBy } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status,
        approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : null
      }
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error updating time entry:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

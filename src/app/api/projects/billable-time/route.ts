'use server'

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
    const projectId = searchParams.get('projectId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get time entries through employee relation
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employee: {
          companyId
        },
        ...(projectId ? { projectId } : {})
      },
      include: {
        employee: true,
        project: true
      },
      orderBy: { clockIn: 'desc' },
      take: 200
    })

    // Transform to billable time format
    const billableEntries = timeEntries.map((entry: any) => {
      const hours = entry.clockOut && entry.clockIn
        ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
        : 0

      // Default hourly rate or from employee
      const hourlyRate = 75 // Default rate
      const billableAmount = hours * hourlyRate

      return {
        id: entry.id,
        date: entry.clockIn.toISOString().split('T')[0],
        employeeName: entry.employee 
          ? `${entry.employee.firstName} ${entry.employee.lastName}`
          : 'Unknown',
        employeeId: entry.employeeId,
        projectName: entry.project?.name || 'Sin Proyecto',
        projectId: entry.projectId,
        description: entry.notes || 'Trabajo registrado',
        hours: Math.round(hours * 100) / 100,
        hourlyRate,
        billableAmount: Math.round(billableAmount * 100) / 100,
        status: entry.approvedBy ? 'approved' : 'pending',
        isBillable: entry.status === 'APPROVED'
      }
    })

    // Summary
    const totalHours = billableEntries.reduce((s, e) => s + e.hours, 0)
    const billableHours = billableEntries.filter(e => e.isBillable).reduce((s, e) => s + e.hours, 0)
    const totalBillable = billableEntries.filter(e => e.isBillable).reduce((s, e) => s + e.billableAmount, 0)

    const summary = {
      totalEntries: billableEntries.length,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round((totalHours - billableHours) * 100) / 100,
      totalBillableAmount: Math.round(totalBillable * 100) / 100,
      pendingApproval: billableEntries.filter(e => e.status === 'pending').length,
      approved: billableEntries.filter(e => e.status === 'approved').length,
      utilizationRate: totalHours > 0 ? (billableHours / totalHours) * 100 : 0
    }

    return NextResponse.json({ 
      entries: billableEntries,
      summary
    })

  } catch (error) {
    console.error('Error fetching billable time:', error)
    return NextResponse.json({ error: 'Error fetching billable time' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: status || undefined,
        approvedBy: status === 'APPROVED' ? session.user?.id : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined
      }
    })

    return NextResponse.json({ entry: updated })

  } catch (error) {
    console.error('Error updating billable time:', error)
    return NextResponse.json({ error: 'Error updating entry' }, { status: 500 })
  }
}

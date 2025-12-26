import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List report groups and saved reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // 'groups', 'reports', or both

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    if (type === 'groups') {
      const groups = await prisma.reportGroup.findMany({
        where: { companyId },
        include: { reports: true },
        orderBy: { name: 'asc' }
      })
      return NextResponse.json(groups)
    } else if (type === 'reports') {
      const reports = await prisma.savedReport.findMany({
        where: { companyId },
        include: { group: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(reports)
    } else {
      const [groups, reports] = await Promise.all([
        prisma.reportGroup.findMany({
          where: { companyId },
          include: { reports: true },
          orderBy: { name: 'asc' }
        }),
        prisma.savedReport.findMany({
          where: { companyId, groupId: null },
          orderBy: { createdAt: 'desc' }
        })
      ])
      return NextResponse.json({ groups, ungroupedReports: reports })
    }
  } catch (error) {
    console.error('Error fetching report groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create report group or saved report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, ...data } = body

    if (!companyId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'group') {
      const group = await prisma.reportGroup.create({
        data: {
          companyId,
          name: data.name,
          description: data.description || null,
          color: data.color || '#0077C5',
          icon: data.icon || 'folder'
        }
      })
      return NextResponse.json(group, { status: 201 })
    } else if (type === 'report') {
      // Calculate next run time if scheduled
      let nextRunAt = null
      if (data.isScheduled && data.scheduleFreq) {
        const now = new Date()
        switch (data.scheduleFreq) {
          case 'daily':
            nextRunAt = new Date(now.setDate(now.getDate() + 1))
            break
          case 'weekly':
            nextRunAt = new Date(now.setDate(now.getDate() + 7))
            break
          case 'monthly':
            nextRunAt = new Date(now.setMonth(now.getMonth() + 1))
            break
        }
      }

      const report = await prisma.savedReport.create({
        data: {
          companyId,
          groupId: data.groupId || null,
          name: data.name,
          description: data.description || null,
          reportType: data.reportType || 'custom',
          filters: data.filters || null,
          columns: data.columns || null,
          groupBy: data.groupBy || null,
          sortBy: data.sortBy || null,
          isScheduled: data.isScheduled || false,
          scheduleFreq: data.scheduleFreq || null,
          scheduleDay: data.scheduleDay || null,
          scheduleTime: data.scheduleTime || null,
          emailRecipients: data.emailRecipients || [],
          nextRunAt
        }
      })
      return NextResponse.json(report, { status: 201 })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error creating report group/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update report group or saved report
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, ...updateData } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 })
    }

    if (type === 'group') {
      const group = await prisma.reportGroup.update({
        where: { id },
        data: updateData
      })
      return NextResponse.json(group)
    } else if (type === 'report') {
      const report = await prisma.savedReport.update({
        where: { id },
        data: updateData
      })
      return NextResponse.json(report)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating report group/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete report group or saved report
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 })
    }

    if (type === 'group') {
      // First, ungroup all reports in this group
      await prisma.savedReport.updateMany({
        where: { groupId: id },
        data: { groupId: null }
      })
      await prisma.reportGroup.delete({ where: { id } })
    } else if (type === 'report') {
      await prisma.savedReport.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report group/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

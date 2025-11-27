import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (status) where.status = status
    if (customerId) where.customerId = customerId

    const projects = await prisma.project.findMany({
      where,
      include: {
        costCenter: true,
        tasks: true,
        _count: {
          select: {
            expenses: true,
            invoices: true,
            timeEntries: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate additional metrics for each project
    const projectsWithMetrics = projects.map(project => {
      const profit = project.revenue - project.actualCost
      const margin = project.revenue > 0 ? (profit / project.revenue) * 100 : 0
      const budgetUsed = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0
      
      return {
        ...project,
        profit,
        margin,
        budgetUsed,
        taskCount: project._count?.expenses || 0
      }
    })

    return NextResponse.json({ projects: projectsWithMetrics })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
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
      name,
      code,
      description,
      status = 'PLANNING',
      priority = 'MEDIUM',
      startDate,
      endDate,
      budget = 0,
      managerId,
      customerId,
      costCenterId,
      companyId
    } = body

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        status,
        priority,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: parseFloat(budget) || 0,
        managerId,
        customerId,
        costCenterId,
        companyId
      },
      include: {
        costCenter: true,
        tasks: true
      }
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}

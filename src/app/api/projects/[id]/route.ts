import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        costCenter: true,
        tasks: true,
        expenses: {
          include: {
            category: true
          },
          orderBy: { date: 'desc' },
          take: 10
        },
        invoices: {
          include: {
            customer: true
          },
          orderBy: { issueDate: 'desc' },
          take: 10
        },
        timeEntries: {
          include: {
            employee: true
          },
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Calculate metrics
    const profit = project.revenue - project.actualCost
    const margin = project.revenue > 0 ? (profit / project.revenue) * 100 : 0
    const budgetUsed = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0

    return NextResponse.json({
      project: {
        ...project,
        profit,
        margin,
        budgetUsed
      }
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      status,
      priority,
      startDate,
      endDate,
      budget,
      actualCost,
      revenue,
      progress,
      managerId,
      customerId,
      costCenterId
    } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (budget !== undefined) updateData.budget = parseFloat(budget) || 0
    if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost) || 0
    if (revenue !== undefined) updateData.revenue = parseFloat(revenue) || 0
    if (progress !== undefined) updateData.progress = parseInt(progress) || 0
    if (managerId !== undefined) updateData.managerId = managerId
    if (customerId !== undefined) updateData.customerId = customerId
    if (costCenterId !== undefined) updateData.costCenterId = costCenterId

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        costCenter: true,
        tasks: true
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // First delete related tasks
    await prisma.projectTask.deleteMany({
      where: { projectId: params.id }
    })

    // Then delete the project
    await prisma.project.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Proyecto eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 })
  }
}

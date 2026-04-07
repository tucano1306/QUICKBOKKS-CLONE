import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener un plan de presupuesto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const budgetPlan = await prisma.budgetPlan.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            costCenter: true,
            account: true
          },
          orderBy: [
            { type: 'asc' },
            { department: 'asc' },
            { category: 'asc' }
          ]
        }
      }
    })

    if (!budgetPlan) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ budgetPlan })
  } catch (error) {
    console.error('Error fetching budget plan:', error)
    return NextResponse.json({ error: 'Error al obtener presupuesto' }, { status: 500 })
  }
}

// PUT - Actualizar un plan de presupuesto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      fiscalYear, 
      startDate, 
      endDate, 
      items,
      status,
      notes 
    } = body

    // Verificar que existe
    const existing = await prisma.budgetPlan.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    // Calcular totales
    const revenueItems = items?.filter((i: any) => i.type === 'REVENUE') || []
    const expenseItems = items?.filter((i: any) => i.type === 'EXPENSE') || []
    
    const totalRevenue = revenueItems.reduce((sum: number, item: any) => 
      sum + (item.annualBudget || 0), 0)
    const totalExpense = expenseItems.reduce((sum: number, item: any) => 
      sum + (item.annualBudget || 0), 0)
    const netProfit = totalRevenue - totalExpense

    // Actualizar en una transacción
    const budgetPlan = await prisma.$transaction(async (tx) => {
      // Si hay items, eliminar los existentes y crear nuevos
      if (items && items.length > 0) {
        await tx.budgetItem.deleteMany({
          where: { budgetPlanId: params.id }
        })
      }

      // Actualizar el plan
      const updated = await tx.budgetPlan.update({
        where: { id: params.id },
        data: {
          name: name || existing.name,
          description: description !== undefined ? description : existing.description,
          fiscalYear: fiscalYear ? Number.parseInt(fiscalYear) : existing.fiscalYear,
          startDate: startDate ? new Date(startDate) : existing.startDate,
          endDate: endDate ? new Date(endDate) : existing.endDate,
          status: status || existing.status,
          totalRevenue,
          totalExpense,
          netProfit,
          notes: notes !== undefined ? notes : existing.notes,
          ...(status === 'APPROVED' ? {
            approvedBy: session.user?.email,
            approvedAt: new Date()
          } : {}),
          items: items && items.length > 0 ? {
            create: items.map((item: any) => ({
              category: item.category,
              subcategory: item.subcategory || null,
              type: item.type,
              department: item.department || null,
              costCenterId: item.costCenterId || null,
              accountId: item.accountId || null,
              q1Budget: item.q1Budget || 0,
              q2Budget: item.q2Budget || 0,
              q3Budget: item.q3Budget || 0,
              q4Budget: item.q4Budget || 0,
              annualBudget: item.annualBudget || 
                (item.q1Budget || 0) + (item.q2Budget || 0) + 
                (item.q3Budget || 0) + (item.q4Budget || 0),
              q1Actual: item.q1Actual || 0,
              q2Actual: item.q2Actual || 0,
              q3Actual: item.q3Actual || 0,
              q4Actual: item.q4Actual || 0,
              annualActual: item.annualActual || 0,
              variance: item.variance || 0,
              notes: item.notes || null,
              companyId: existing.companyId
            }))
          } : undefined
        },
        include: {
          items: {
            include: {
              costCenter: true,
              account: true
            }
          }
        }
      })

      return updated
    })

    return NextResponse.json({ budgetPlan })
  } catch (error) {
    console.error('Error updating budget plan:', error)
    return NextResponse.json({ error: 'Error al actualizar presupuesto' }, { status: 500 })
  }
}

// DELETE - Eliminar un plan de presupuesto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que existe
    const existing = await prisma.budgetPlan.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    // No permitir eliminar presupuestos aprobados o activos
    if (existing.status === 'APPROVED' || existing.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'No se puede eliminar un presupuesto aprobado o activo' }, 
        { status: 400 }
      )
    }

    // Eliminar (los items se eliminan en cascada)
    await prisma.budgetPlan.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Presupuesto eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting budget plan:', error)
    return NextResponse.json({ error: 'Error al eliminar presupuesto' }, { status: 500 })
  }
}

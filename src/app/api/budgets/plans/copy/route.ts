import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Copiar un presupuesto existente a un nuevo año
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sourceBudgetId, 
      targetYear,
      name,
      adjustmentPercent = 0, // Porcentaje de ajuste (ej: 5 para aumentar 5%)
      companyId 
    } = body

    if (!sourceBudgetId || !targetYear) {
      return NextResponse.json(
        { error: 'ID del presupuesto fuente y año destino son requeridos' }, 
        { status: 400 }
      )
    }

    // Obtener el presupuesto fuente
    const sourceBudget = await prisma.budgetPlan.findUnique({
      where: { id: sourceBudgetId },
      include: {
        items: true
      }
    })

    if (!sourceBudget) {
      return NextResponse.json({ error: 'Presupuesto fuente no encontrado' }, { status: 404 })
    }

    // Verificar que no existe un presupuesto para ese año
    const existingBudget = await prisma.budgetPlan.findFirst({
      where: {
        fiscalYear: Number.parseInt(targetYear),
        companyId: companyId || sourceBudget.companyId
      }
    })

    if (existingBudget) {
      return NextResponse.json(
        { error: `Ya existe un presupuesto para el año ${targetYear}` }, 
        { status: 400 }
      )
    }

    // Calcular el multiplicador de ajuste
    const multiplier = 1 + (adjustmentPercent / 100)

    // Calcular nuevos totales
    const newItems = sourceBudget.items.map(item => ({
      ...item,
      q1Budget: Math.round(item.q1Budget * multiplier),
      q2Budget: Math.round(item.q2Budget * multiplier),
      q3Budget: Math.round(item.q3Budget * multiplier),
      q4Budget: Math.round(item.q4Budget * multiplier),
      annualBudget: Math.round(item.annualBudget * multiplier)
    }))

    const revenueItems = newItems.filter(i => i.type === 'REVENUE')
    const expenseItems = newItems.filter(i => i.type === 'EXPENSE')
    
    const totalRevenue = revenueItems.reduce((sum, item) => sum + item.annualBudget, 0)
    const totalExpense = expenseItems.reduce((sum, item) => sum + item.annualBudget, 0)
    const netProfit = totalRevenue - totalExpense

    // Crear el nuevo presupuesto
    const newBudgetPlan = await prisma.budgetPlan.create({
      data: {
        name: name || `Presupuesto Anual ${targetYear}`,
        description: `Copiado de ${sourceBudget.name} con ajuste de ${adjustmentPercent}%`,
        fiscalYear: Number.parseInt(targetYear),
        startDate: new Date(`${targetYear}-01-01`),
        endDate: new Date(`${targetYear}-12-31`),
        status: 'DRAFT',
        totalRevenue,
        totalExpense,
        netProfit,
        notes: sourceBudget.notes,
        createdBy: session.user?.email || '',
        companyId: companyId || sourceBudget.companyId,
        items: {
          create: newItems.map(item => ({
            category: item.category,
            subcategory: item.subcategory,
            type: item.type,
            department: item.department,
            costCenterId: item.costCenterId,
            accountId: item.accountId,
            q1Budget: item.q1Budget,
            q2Budget: item.q2Budget,
            q3Budget: item.q3Budget,
            q4Budget: item.q4Budget,
            annualBudget: item.annualBudget,
            q1Actual: 0,
            q2Actual: 0,
            q3Actual: 0,
            q4Actual: 0,
            annualActual: 0,
            variance: 0,
            notes: item.notes,
            companyId: companyId || sourceBudget.companyId
          }))
        }
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

    return NextResponse.json({ 
      budgetPlan: newBudgetPlan,
      message: `Presupuesto copiado exitosamente con ajuste de ${adjustmentPercent}%`
    }, { status: 201 })
  } catch (error) {
    console.error('Error copying budget plan:', error)
    return NextResponse.json({ error: 'Error al copiar presupuesto' }, { status: 500 })
  }
}

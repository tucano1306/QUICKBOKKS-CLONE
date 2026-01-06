import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los planes de presupuesto
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const fiscalYear = searchParams.get('fiscalYear')
    const status = searchParams.get('status')

    const where: any = {}
    
    if (companyId) {
      where.companyId = companyId
    }
    
    if (fiscalYear) {
      where.fiscalYear = parseInt(fiscalYear)
    }
    
    if (status) {
      where.status = status
    }

    const budgetPlans = await prisma.budgetPlan.findMany({
      where,
      include: {
        items: {
          include: {
            costCenter: true,
            account: true
          }
        }
      },
      orderBy: { fiscalYear: 'desc' }
    })

    return NextResponse.json({ budgetPlans })
  } catch (error) {
    console.error('Error fetching budget plans:', error)
    return NextResponse.json({ error: 'Error al obtener presupuestos' }, { status: 500 })
  }
}

// POST - Crear un nuevo plan de presupuesto
export async function POST(request: NextRequest) {
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
      companyId,
      notes 
    } = body

    if (!name || !fiscalYear) {
      return NextResponse.json(
        { error: 'Nombre y año fiscal son requeridos' }, 
        { status: 400 }
      )
    }

    // Calcular totales
    const revenueItems = items?.filter((i: any) => i.type === 'REVENUE') || []
    const expenseItems = items?.filter((i: any) => i.type === 'EXPENSE') || []
    
    const totalRevenue = revenueItems.reduce((sum: number, item: any) => 
      sum + (item.annualBudget || 0), 0)
    const totalExpense = expenseItems.reduce((sum: number, item: any) => 
      sum + (item.annualBudget || 0), 0)
    const netProfit = totalRevenue - totalExpense

    // Crear el plan de presupuesto con sus items
    const budgetPlan = await prisma.budgetPlan.create({
      data: {
        name,
        description,
        fiscalYear: parseInt(fiscalYear),
        startDate: startDate ? new Date(startDate) : new Date(`${fiscalYear}-01-01`),
        endDate: endDate ? new Date(endDate) : new Date(`${fiscalYear}-12-31`),
        status: 'DRAFT',
        totalRevenue,
        totalExpense,
        netProfit,
        notes,
        createdBy: session.user?.email || '',
        companyId,
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
            notes: item.notes || null,
            companyId
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

    return NextResponse.json({ budgetPlan }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget plan:', error)
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 })
  }
}

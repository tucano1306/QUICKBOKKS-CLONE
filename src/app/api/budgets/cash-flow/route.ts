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
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31`)

    // Get cash flow projections for the year
    const projections = await prisma.cashFlowProjection.findMany({
      where: {
        companyId,
        period: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { period: 'asc' }
    })

    // Get actual income from invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: 'PAID',
        issueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        total: true,
        issueDate: true
      }
    })

    // Get actual expenses
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        amount: true,
        date: true,
        category: true
      }
    })

    // Build monthly data
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december']
    
    // Group by month
    const monthlyInflows: Record<string, number> = {}
    const monthlyOutflows: Record<string, number> = {}
    
    months.forEach(m => {
      monthlyInflows[m] = 0
      monthlyOutflows[m] = 0
    })

    paidInvoices.forEach(inv => {
      const monthIndex = new Date(inv.issueDate).getMonth()
      monthlyInflows[months[monthIndex]] += inv.total
    })

    expenses.forEach(exp => {
      const monthIndex = new Date(exp.date).getMonth()
      monthlyOutflows[months[monthIndex]] += exp.amount
    })

    // Build cash flow items
    const cashFlowItems = [
      {
        id: 'CF-IN-001',
        category: 'Cobros a Clientes',
        subcategory: 'Ingresos por Ventas',
        type: 'inflow' as const,
        ...monthlyInflows,
        total: Object.values(monthlyInflows).reduce((a, b) => a + b, 0)
      },
      {
        id: 'CF-OUT-001',
        category: 'Gastos Operativos',
        subcategory: 'Gastos Generales',
        type: 'outflow' as const,
        ...monthlyOutflows,
        total: Object.values(monthlyOutflows).reduce((a, b) => a + b, 0)
      }
    ]

    // Calculate summary
    const totalInflows = cashFlowItems.filter(i => i.type === 'inflow').reduce((s, i) => s + i.total, 0)
    const totalOutflows = cashFlowItems.filter(i => i.type === 'outflow').reduce((s, i) => s + i.total, 0)
    const netCashFlow = totalInflows - totalOutflows

    // Monthly balances
    const monthlyBalances = months.map(m => ({
      month: m,
      inflow: monthlyInflows[m],
      outflow: monthlyOutflows[m],
      net: monthlyInflows[m] - monthlyOutflows[m]
    }))

    // Calculate running balance
    let runningBalance = 0
    const runningBalances = monthlyBalances.map(mb => {
      runningBalance += mb.net
      return { ...mb, runningBalance }
    })

    const summary = {
      year,
      totalInflows,
      totalOutflows,
      netCashFlow,
      averageMonthlyInflow: totalInflows / 12,
      averageMonthlyOutflow: totalOutflows / 12,
      projectionCount: projections.length,
      monthlyBalances: runningBalances
    }

    return NextResponse.json({ 
      cashFlowItems,
      projections,
      summary
    })

  } catch (error) {
    console.error('Error fetching cash flow:', error)
    return NextResponse.json({ error: 'Error fetching cash flow' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { period, projectedIncome, projectedExpense, notes, companyId } = body

    if (!companyId || !period) {
      return NextResponse.json({ error: 'Company ID and period required' }, { status: 400 })
    }

    const projection = await prisma.cashFlowProjection.create({
      data: {
        period: new Date(period),
        projectedIncome: parseFloat(projectedIncome) || 0,
        projectedExpense: parseFloat(projectedExpense) || 0,
        projectedBalance: (parseFloat(projectedIncome) || 0) - (parseFloat(projectedExpense) || 0),
        notes,
        companyId
      }
    })

    return NextResponse.json({ projection }, { status: 201 })

  } catch (error) {
    console.error('Error creating cash flow projection:', error)
    return NextResponse.json({ error: 'Error creating projection' }, { status: 500 })
  }
}

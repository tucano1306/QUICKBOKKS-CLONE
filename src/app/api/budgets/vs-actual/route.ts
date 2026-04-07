export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const period = searchParams.get('period') || 'ytd-2025'
    const fiscalYear = Number.parseInt(searchParams.get('fiscalYear') || new Date().getFullYear().toString())

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID requerido' }, { status: 400 })
    }

    // Get active/approved budget plan for the year
    const budgetPlan = await prisma.budgetPlan.findFirst({
      where: {
        companyId,
        fiscalYear,
        status: {
          in: ['ACTIVE', 'APPROVED', 'DRAFT']
        }
      },
      include: {
        items: true
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { createdAt: 'desc' }
      ]
    })

    // Also check old Budget model for backwards compatibility
    const oldBudgets = await prisma.budget.findMany({
      where: { companyId },
      include: { account: true }
    })

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    // Parse period like "november-2025", "q4-2025", "ytd-2025", "fy-2025"
    const periodLower = period.toLowerCase()
    const yearMatch = periodLower.match(/(\d{4})/)
    const yearFromPeriod = yearMatch ? Number.parseInt(yearMatch[1]) : fiscalYear

    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december']

    if (periodLower.includes('ytd') || periodLower.includes('year-to-date')) {
      startDate = new Date(yearFromPeriod, 0, 1)
      endDate = new Date(yearFromPeriod, now.getMonth(), now.getDate())
    } else if (periodLower.includes('fy') || periodLower.includes('fiscal')) {
      startDate = new Date(yearFromPeriod, 0, 1)
      endDate = new Date(yearFromPeriod, 11, 31)
    } else if (periodLower.includes('q1')) {
      startDate = new Date(yearFromPeriod, 0, 1)
      endDate = new Date(yearFromPeriod, 2, 31)
    } else if (periodLower.includes('q2')) {
      startDate = new Date(yearFromPeriod, 3, 1)
      endDate = new Date(yearFromPeriod, 5, 30)
    } else if (periodLower.includes('q3')) {
      startDate = new Date(yearFromPeriod, 6, 1)
      endDate = new Date(yearFromPeriod, 8, 30)
    } else if (periodLower.includes('q4')) {
      startDate = new Date(yearFromPeriod, 9, 1)
      endDate = new Date(yearFromPeriod, 11, 31)
    } else {
      // Try to match a month name
      const monthIndex = monthNames.findIndex(m => periodLower.includes(m))
      if (monthIndex >= 0) {
        startDate = new Date(yearFromPeriod, monthIndex, 1)
        endDate = new Date(yearFromPeriod, monthIndex + 1, 0)
      } else {
        // Default to YTD
        startDate = new Date(yearFromPeriod, 0, 1)
        endDate = now
      }
    }

    // Get actual expenses
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      }
    })

    // Get actual income (paid invoices)
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: 'PAID',
        OR: [
          { paidDate: { gte: startDate, lte: endDate } },
          { 
            paidDate: null,
            issueDate: { gte: startDate, lte: endDate }
          }
        ]
      }
    })

    // Calculate total actual revenue
    const totalActualRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    
    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenses.forEach(exp => {
      const cat = exp.category?.name || 'Otros'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
    })

    // Build items from new BudgetPlan model
    let items: any[] = []
    
    if (budgetPlan && budgetPlan.items.length > 0) {
      // Determine which quarter budget to use
      let quarterKey: 'q1' | 'q2' | 'q3' | 'q4' | 'annual' = 'annual'
      if (periodLower.includes('q1') || monthNames.slice(0, 3).some(m => periodLower.includes(m))) {
        quarterKey = 'q1'
      } else if (periodLower.includes('q2') || monthNames.slice(3, 6).some(m => periodLower.includes(m))) {
        quarterKey = 'q2'
      } else if (periodLower.includes('q3') || monthNames.slice(6, 9).some(m => periodLower.includes(m))) {
        quarterKey = 'q3'
      } else if (periodLower.includes('q4') || monthNames.slice(9, 12).some(m => periodLower.includes(m))) {
        quarterKey = 'q4'
      }

      const totalRevenueBudget = budgetPlan.items
        .filter(i => i.type === 'REVENUE')
        .reduce((sum, i) => sum + i.annualBudget, 0)

      items = budgetPlan.items.map(budgetItem => {
        // Get budgeted amount for the period
        let budgeted: number
        if (quarterKey === 'annual' || periodLower.includes('ytd') || periodLower.includes('fy')) {
          if (periodLower.includes('ytd')) {
            // For YTD, prorate the annual budget
            const monthsElapsed = endDate.getMonth() + 1
            budgeted = (budgetItem.annualBudget / 12) * monthsElapsed
          } else {
            budgeted = budgetItem.annualBudget
          }
        } else if (quarterKey === 'q1') {
          budgeted = budgetItem.q1Budget
        } else if (quarterKey === 'q2') {
          budgeted = budgetItem.q2Budget
        } else if (quarterKey === 'q3') {
          budgeted = budgetItem.q3Budget
        } else {
          budgeted = budgetItem.q4Budget
        }
        
        // If monthly, divide quarter by 3
        if (monthNames.some(m => periodLower.includes(m)) && !periodLower.includes('q')) {
          budgeted = budgeted / 3
        }

        // Calculate actual based on type
        let actual = 0
        if (budgetItem.type === 'EXPENSE') {
          // Find matching expenses by category
          Object.entries(expensesByCategory).forEach(([cat, amount]) => {
            if (cat.toLowerCase().includes(budgetItem.category.toLowerCase()) ||
                budgetItem.category.toLowerCase().includes(cat.toLowerCase())) {
              actual += amount
            }
          })
          // If no match, try subcategory
          if (actual === 0 && budgetItem.subcategory) {
            Object.entries(expensesByCategory).forEach(([cat, amount]) => {
              if (cat.toLowerCase().includes(budgetItem.subcategory!.toLowerCase())) {
                actual += amount
              }
            })
          }
        } else {
          // For revenue, distribute total revenue by budget proportion
          if (totalRevenueBudget > 0) {
            const proportion = budgetItem.annualBudget / totalRevenueBudget
            actual = totalActualRevenue * proportion
          }
        }

        const variance = actual - budgeted
        const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0

        // YTD calculations  
        const monthsElapsed = Math.max(1, now.getMonth() + 1)
        const ytdBudget = (budgetItem.annualBudget / 12) * monthsElapsed
        const ytdActual = actual // Using the actual from the period
        const ytdVariance = ytdActual - ytdBudget
        const ytdVariancePercent = ytdBudget !== 0 ? (ytdVariance / ytdBudget) * 100 : 0

        return {
          id: budgetItem.id,
          category: budgetItem.category,
          subcategory: budgetItem.subcategory || '',
          type: budgetItem.type.toLowerCase() as 'revenue' | 'expense',
          department: budgetItem.department || 'General',
          budgeted: Math.round(budgeted * 100) / 100,
          actual: Math.round(actual * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round(variancePercent * 100) / 100,
          ytdBudget: Math.round(ytdBudget * 100) / 100,
          ytdActual: Math.round(ytdActual * 100) / 100,
          ytdVariance: Math.round(ytdVariance * 100) / 100,
          ytdVariancePercent: Math.round(ytdVariancePercent * 100) / 100
        }
      })
    } else if (oldBudgets.length > 0) {
      // Fall back to old Budget model
      items = oldBudgets.map(budget => {
        const accountName = budget.account?.name || 'Unknown'
        const budgetAmount = budget.amount
        const actualAmount = expensesByCategory[accountName] || 0
        const variance = actualAmount - budgetAmount
        const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0
        
        return {
          id: budget.id,
          category: accountName,
          subcategory: '',
          type: 'expense' as const,
          department: 'General',
          budgeted: budgetAmount,
          actual: actualAmount,
          variance,
          variancePercent,
          ytdBudget: budgetAmount,
          ytdActual: actualAmount,
          ytdVariance: variance,
          ytdVariancePercent: variancePercent
        }
      })
    }

    // Calculate summary
    const revenueItems = items.filter(i => i.type === 'revenue')
    const expenseItems = items.filter(i => i.type === 'expense')

    const totalRevenueBudget = revenueItems.reduce((sum, i) => sum + i.budgeted, 0)
    const totalRevenueActual = revenueItems.reduce((sum, i) => sum + i.actual, 0)
    const totalExpenseBudget = expenseItems.reduce((sum, i) => sum + i.budgeted, 0)
    const totalExpenseActual = expenseItems.reduce((sum, i) => sum + i.actual, 0)

    const revenueVariance = totalRevenueActual - totalRevenueBudget
    const revenueVariancePercent = totalRevenueBudget !== 0 ? (revenueVariance / totalRevenueBudget) * 100 : 0
    const expenseVariance = totalExpenseActual - totalExpenseBudget
    const expenseVariancePercent = totalExpenseBudget !== 0 ? (expenseVariance / totalExpenseBudget) * 100 : 0

    const budgetedProfit = totalRevenueBudget - totalExpenseBudget
    const actualProfit = totalRevenueActual - totalExpenseActual
    const profitVariance = actualProfit - budgetedProfit
    const profitVariancePercent = budgetedProfit !== 0 ? (profitVariance / budgetedProfit) * 100 : 0

    return NextResponse.json({
      budgetPlan: budgetPlan ? {
        id: budgetPlan.id,
        name: budgetPlan.name,
        fiscalYear: budgetPlan.fiscalYear,
        status: budgetPlan.status
      } : null,
      items,
      summary: {
        totalRevenueBudget: Math.round(totalRevenueBudget * 100) / 100,
        totalRevenueActual: Math.round(totalRevenueActual * 100) / 100,
        revenueVariance: Math.round(revenueVariance * 100) / 100,
        revenueVariancePercent: Math.round(revenueVariancePercent * 100) / 100,
        totalExpenseBudget: Math.round(totalExpenseBudget * 100) / 100,
        totalExpenseActual: Math.round(totalExpenseActual * 100) / 100,
        expenseVariance: Math.round(expenseVariance * 100) / 100,
        expenseVariancePercent: Math.round(expenseVariancePercent * 100) / 100,
        budgetedProfit: Math.round(budgetedProfit * 100) / 100,
        actualProfit: Math.round(actualProfit * 100) / 100,
        profitVariance: Math.round(profitVariance * 100) / 100,
        profitVariancePercent: Math.round(profitVariancePercent * 100) / 100
      },
      period,
      fiscalYear: yearFromPeriod,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching budget vs actual:', error)
    return NextResponse.json(
      { error: 'Error al obtener comparación presupuesto vs real' },
      { status: 500 }
    )
  }
}

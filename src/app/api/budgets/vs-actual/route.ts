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
    const period = searchParams.get('period') || 'monthly'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: { companyId },
      include: {
        account: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get actual expenses by account
    const currentYear = new Date().getFullYear()
    const startDate = new Date(`${currentYear}-01-01`)
    const endDate = new Date(`${currentYear}-12-31`)

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

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenses.forEach(exp => {
      const cat = exp.category?.name || 'Other'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
    })

    // Build budget vs actual comparison
    const comparison = budgets.map(budget => {
      const accountName = budget.account?.name || 'Unknown'
      const budgetAmount = budget.amount
      const actualAmount = expensesByCategory[accountName] || 0
      const variance = budgetAmount - actualAmount
      const percentUsed = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0
      
      return {
        id: budget.id,
        category: accountName,
        budgeted: budgetAmount,
        actual: actualAmount,
        variance,
        percentUsed,
        status: percentUsed > 100 ? 'over' : (percentUsed > 80 ? 'warning' : 'ok'),
        startDate: budget.startDate,
        endDate: budget.endDate
      }
    })

    // Summary stats
    const totalBudgeted = comparison.reduce((sum, c) => sum + c.budgeted, 0)
    const totalActual = comparison.reduce((sum, c) => sum + c.actual, 0)
    const totalVariance = totalBudgeted - totalActual
    const overBudgetCount = comparison.filter(c => c.status === 'over').length

    return NextResponse.json({ 
      comparison,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        overBudgetCount,
        warningCount: comparison.filter(c => c.status === 'warning').length,
        okCount: comparison.filter(c => c.status === 'ok').length,
        utilizationRate: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
      }
    })

  } catch (error) {
    console.error('Error fetching budget vs actual:', error)
    return NextResponse.json({ error: 'Error fetching comparison' }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'

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

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get all budgets with their current spending
    const budgets = await prisma.budget.findMany({
      where: { companyId },
      include: {
        account: true
      }
    })

    // Get current month's expenses
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    // Calculate spending by category
    const spendingByCategory: Record<string, number> = {}
    expenses.forEach(exp => {
      const cat = exp.categoryId || 'Other'
      spendingByCategory[cat] = (spendingByCategory[cat] || 0) + exp.amount
    })

    // Generate alerts
    const alerts = budgets.map(budget => {
      const accountName = budget.account?.name || 'Unknown'
      const spent = spendingByCategory[accountName] || 0
      const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      const remaining = budget.amount - spent
      
      let severity: 'critical' | 'warning' | 'info' = 'info'
      let message = ''
      
      if (percentUsed >= 100) {
        severity = 'critical'
        message = `Presupuesto de ${accountName} excedido en ${(percentUsed - 100).toFixed(1)}%`
      } else if (percentUsed >= 90) {
        severity = 'critical'
        message = `Presupuesto de ${accountName} al ${percentUsed.toFixed(1)}% - Quedan $${remaining.toLocaleString()}`
      } else if (percentUsed >= 75) {
        severity = 'warning'
        message = `Presupuesto de ${accountName} al ${percentUsed.toFixed(1)}%`
      } else if (percentUsed >= 50) {
        severity = 'info'
        message = `Presupuesto de ${accountName} al ${percentUsed.toFixed(1)}%`
      }

      return {
        id: budget.id,
        category: accountName,
        budgetAmount: budget.amount,
        spent,
        remaining,
        percentUsed,
        severity,
        message,
        createdAt: budget.createdAt.toISOString()
      }
    }).filter(a => a.percentUsed >= 50) // Only show alerts at 50%+ usage

    // Sort by severity and percentage
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.percentUsed - a.percentUsed
    })

    const summary = {
      totalAlerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      totalBudget: budgets.reduce((s, b) => s + b.amount, 0),
      totalSpent: Object.values(spendingByCategory).reduce((a, b) => a + b, 0)
    }

    return NextResponse.json({ alerts, summary })

  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return NextResponse.json({ error: 'Error fetching alerts' }, { status: 500 })
  }
}

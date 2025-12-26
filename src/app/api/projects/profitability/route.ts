
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

    // Get all projects with their costs and revenue
    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        expenses: true,
        invoices: {
          where: { status: 'PAID' }
        },
        timeEntries: true,
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate profitability for each project
    const profitabilityData = projects.map(project => {
      const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0)
      const laborCost = project.timeEntries.reduce((sum, t) => {
        const hours = t.clockOut && t.clockIn 
          ? (new Date(t.clockOut).getTime() - new Date(t.clockIn).getTime()) / (1000 * 60 * 60)
          : 0
        return sum + (hours * 50) // Assume $50/hour labor cost
      }, 0)
      
      const totalCost = totalExpenses + laborCost + (project.actualCost || 0)
      const revenue = project.invoices.reduce((sum, i) => sum + i.total, 0) + (project.revenue || 0)
      const profit = revenue - totalCost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      const budgetUsed = project.budget > 0 ? (totalCost / project.budget) * 100 : 0

      return {
        id: project.id,
        code: project.code || project.id.slice(0, 8).toUpperCase(),
        name: project.name,
        status: project.status,
        budget: project.budget,
        totalCost,
        laborCost,
        expensesCost: totalExpenses,
        revenue,
        profit,
        margin,
        budgetUsed,
        isOverBudget: budgetUsed > 100,
        progress: project.progress,
        startDate: project.startDate?.toISOString().split('T')[0],
        endDate: project.endDate?.toISOString().split('T')[0],
        tasksCompleted: project.tasks.filter(t => t.status === 'COMPLETED').length,
        totalTasks: project.tasks.length
      }
    })

    // Summary stats
    const summary = {
      totalProjects: profitabilityData.length,
      totalBudget: profitabilityData.reduce((s, p) => s + p.budget, 0),
      totalCosts: profitabilityData.reduce((s, p) => s + p.totalCost, 0),
      totalRevenue: profitabilityData.reduce((s, p) => s + p.revenue, 0),
      totalProfit: profitabilityData.reduce((s, p) => s + p.profit, 0),
      averageMargin: profitabilityData.length > 0 
        ? profitabilityData.reduce((s, p) => s + p.margin, 0) / profitabilityData.length 
        : 0,
      projectsOverBudget: profitabilityData.filter(p => p.isOverBudget).length,
      projectsProfitable: profitabilityData.filter(p => p.profit > 0).length
    }

    return NextResponse.json({ 
      projects: profitabilityData,
      summary
    })

  } catch (error) {
    console.error('Error fetching project profitability:', error)
    return NextResponse.json({ error: 'Error fetching profitability' }, { status: 500 })
  }
}


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
    const projectId = searchParams.get('projectId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get projects with detailed costing
    const whereClause: Record<string, unknown> = { companyId }
    if (projectId) {
      whereClause.id = projectId
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        expenses: {
          include: {
            category: true
          }
        },
        timeEntries: {
          include: {
            employee: true
          }
        },
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Build detailed costing for each project
    const costingData = projects.map((project: any) => {
      // Group expenses by category
      const expensesByCategory: Record<string, { amount: number; count: number }> = {}
      project.expenses.forEach((exp: any) => {
        const cat = exp.category?.name || 'Other'
        if (!expensesByCategory[cat]) {
          expensesByCategory[cat] = { amount: 0, count: 0 }
        }
        expensesByCategory[cat].amount += exp.amount
        expensesByCategory[cat].count++
      })

      // Calculate labor costs
      const laborByEmployee: Record<string, { hours: number; cost: number }> = {}
      project.timeEntries.forEach((entry: any) => {
        const empName = entry.employee 
          ? `${entry.employee.firstName} ${entry.employee.lastName}`
          : 'Unknown'
        const hours = entry.clockOut && entry.clockIn
          ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
          : 0
        const hourlyRate = 50 // Default
        
        if (!laborByEmployee[empName]) {
          laborByEmployee[empName] = { hours: 0, cost: 0 }
        }
        laborByEmployee[empName].hours += hours
        laborByEmployee[empName].cost += hours * hourlyRate
      })

      const totalExpenses = project.expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
      const totalLabor = Object.values(laborByEmployee).reduce((s, l) => s + l.cost, 0)
      const totalHours = Object.values(laborByEmployee).reduce((s, l) => s + l.hours, 0)
      const totalCost = totalExpenses + totalLabor

      // Cost breakdown
      const costBreakdown = [
        ...Object.entries(expensesByCategory).map(([category, data]) => ({
          category,
          type: 'expense' as const,
          amount: data.amount,
          count: data.count,
          percentage: totalCost > 0 ? (data.amount / totalCost) * 100 : 0
        })),
        ...Object.entries(laborByEmployee).map(([employee, data]) => ({
          category: `Labor: ${employee}`,
          type: 'labor' as const,
          amount: data.cost,
          hours: data.hours,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0
        }))
      ]

      return {
        id: project.id,
        code: project.code || project.id.slice(0, 8).toUpperCase(),
        name: project.name,
        status: project.status,
        budget: project.budget,
        totalCost,
        totalExpenses,
        totalLabor,
        totalHours: Math.round(totalHours * 100) / 100,
        budgetRemaining: project.budget - totalCost,
        budgetUsed: project.budget > 0 ? (totalCost / project.budget) * 100 : 0,
        costBreakdown,
        isOverBudget: totalCost > project.budget
      }
    })

    // Summary
    const summary = {
      totalProjects: costingData.length,
      totalBudget: costingData.reduce((s, p) => s + p.budget, 0),
      totalCost: costingData.reduce((s, p) => s + p.totalCost, 0),
      totalExpenses: costingData.reduce((s, p) => s + p.totalExpenses, 0),
      totalLabor: costingData.reduce((s, p) => s + p.totalLabor, 0),
      totalHours: costingData.reduce((s, p) => s + p.totalHours, 0),
      projectsOverBudget: costingData.filter(p => p.isOverBudget).length
    }

    return NextResponse.json({ 
      projects: costingData,
      summary
    })

  } catch (error) {
    console.error('Error fetching project costing:', error)
    return NextResponse.json({ error: 'Error fetching costing data' }, { status: 500 })
  }
}

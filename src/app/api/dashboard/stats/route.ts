import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener companyId de la URL o del usuario
    const { searchParams } = new URL(request.url)
    const companyIdParam = searchParams.get('companyId')

    // Si no viene companyId, buscar la compañía del usuario
    let companyId = companyIdParam
    if (!companyId) {
      const userCompany = await prisma.companyUser.findFirst({
        where: { userId: session.user.id },
        select: { companyId: true }
      })
      companyId = userCompany?.companyId || null
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // Current year date range
    const firstDayOfYear = new Date(currentYear, 0, 1)
    const lastDayOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

    // Previous year for comparison
    const firstDayOfLastYear = new Date(currentYear - 1, 0, 1)
    const lastDayOfLastYear = new Date(currentYear - 1, 11, 31, 23, 59, 59)

    // Construir filtro base
    const baseInvoiceFilter = companyId
      ? { companyId }
      : { userId: session.user.id }

    const baseExpenseFilter = companyId
      ? { companyId }
      : { userId: session.user.id }

    // Run all queries in parallel
    const [
      yearInvoices,
      yearExpenses,
      prevYearRevenueAgg,
      prevYearExpensesAgg,
      totalCustomers,
      pendingInvoices,
      overdueInvoices
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { ...baseInvoiceFilter, issueDate: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { issueDate: true, total: true }
      }),
      prisma.expense.findMany({
        where: { ...baseExpenseFilter, date: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { date: true, amount: true }
      }),
      prisma.invoice.aggregate({
        where: { ...baseInvoiceFilter, issueDate: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { total: true }
      }),
      prisma.expense.aggregate({
        where: { ...baseExpenseFilter, date: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { amount: true }
      }),
      prisma.customer.count({ where: { companyId: companyId || undefined, status: 'ACTIVE' } }),
      prisma.invoice.count({ where: { ...baseInvoiceFilter, status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL'] } } }),
      prisma.invoice.count({ where: { ...baseInvoiceFilter, status: 'OVERDUE' } })
    ])

    // Build monthly breakdown for current year
    const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthRevenue = yearInvoices
        .filter(inv => inv.issueDate && new Date(inv.issueDate).getMonth() === i)
        .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
      const monthExpenses = yearExpenses
        .filter(exp => exp.date && new Date(exp.date).getMonth() === i)
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
      return {
        month: MONTH_NAMES[i],
        monthIndex: i,
        revenue: monthRevenue,
        expenses: monthExpenses
      }
    })

    // Annual totals
    const totalRevenue = yearInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
    const totalExpenses = yearExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)

    // Year-over-year change
    const lastYearRevenue = Number(prevYearRevenueAgg._sum.total || 0)
    const lastYearExpenses = Number(prevYearExpensesAgg._sum.amount || 0)

    let revenueChange = 0
    if (lastYearRevenue > 0) {
      revenueChange = Math.round(((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100)
    } else if (totalRevenue > 0) {
      revenueChange = 100
    }

    let expensesChange = 0
    if (lastYearExpenses > 0) {
      expensesChange = Math.round(((totalExpenses - lastYearExpenses) / lastYearExpenses) * 100)
    } else if (totalExpenses > 0) {
      expensesChange = 100
    }

    const netProfit = totalRevenue - totalExpenses

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      totalCustomers,
      pendingInvoices,
      overdueInvoices,
      revenueChange,
      expensesChange,
      netProfit,
      currentYear,
      currentMonth,
      monthlyData,
      companyId
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}

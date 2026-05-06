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

    const baseTransactionFilter = companyId
      ? { companyId }
      : {}

    // Run all queries in parallel (3 sources: Invoice, Expense, Transaction)
    const [
      yearInvoices,
      yearExpenses,
      yearTxIncome,
      yearTxExpenses,
      prevYearInvoicesAgg,
      prevYearExpensesAgg,
      prevYearTxIncomeAgg,
      prevYearTxExpensesAgg,
      totalCustomers,
      pendingInvoices,
      overdueInvoices
    ] = await Promise.all([
      // Invoices (ingresos por facturación)
      prisma.invoice.findMany({
        where: { ...baseInvoiceFilter, issueDate: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { issueDate: true, total: true }
      }),
      // Expenses (gastos directos)
      prisma.expense.findMany({
        where: { ...baseExpenseFilter, date: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { date: true, amount: true }
      }),
      // Transactions tipo INCOME
      prisma.transaction.findMany({
        where: { ...baseTransactionFilter, type: 'INCOME', date: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { date: true, amount: true }
      }),
      // Transactions tipo EXPENSE
      prisma.transaction.findMany({
        where: { ...baseTransactionFilter, type: 'EXPENSE', date: { gte: firstDayOfYear, lte: lastDayOfYear } },
        select: { date: true, amount: true }
      }),
      // Año anterior: invoices
      prisma.invoice.aggregate({
        where: { ...baseInvoiceFilter, issueDate: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { total: true }
      }),
      // Año anterior: expenses
      prisma.expense.aggregate({
        where: { ...baseExpenseFilter, date: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { amount: true }
      }),
      // Año anterior: transactions INCOME
      prisma.transaction.aggregate({
        where: { ...baseTransactionFilter, type: 'INCOME', date: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { amount: true }
      }),
      // Año anterior: transactions EXPENSE
      prisma.transaction.aggregate({
        where: { ...baseTransactionFilter, type: 'EXPENSE', date: { gte: firstDayOfLastYear, lte: lastDayOfLastYear } },
        _sum: { amount: true }
      }),
      prisma.customer.count({ where: { companyId: companyId || undefined, status: 'ACTIVE' } }),
      prisma.invoice.count({ where: { ...baseInvoiceFilter, status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL'] } } }),
      prisma.invoice.count({ where: { ...baseInvoiceFilter, status: 'OVERDUE' } })
    ])

    // Build monthly breakdown combining all sources
    const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const invoiceRev = yearInvoices
        .filter(inv => inv.issueDate && new Date(inv.issueDate).getMonth() === i)
        .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
      const txRev = yearTxIncome
        .filter(tx => tx.date && new Date(tx.date).getMonth() === i)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      const directExp = yearExpenses
        .filter(exp => exp.date && new Date(exp.date).getMonth() === i)
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
      const txExp = yearTxExpenses
        .filter(tx => tx.date && new Date(tx.date).getMonth() === i)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      return {
        month: MONTH_NAMES[i],
        monthIndex: i,
        revenue: invoiceRev + txRev,
        expenses: directExp + txExp
      }
    })

    // Annual totals (combined from all sources)
    const invoiceRevenue = yearInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
    const txRevenue = yearTxIncome.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const totalRevenue = invoiceRevenue + txRevenue

    const directExpenses = yearExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
    const txExpenses = yearTxExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const totalExpenses = directExpenses + txExpenses

    // Year-over-year comparison (combined)
    const lastYearRevenue = Number(prevYearInvoicesAgg._sum.total || 0) + Number(prevYearTxIncomeAgg._sum.amount || 0)
    const lastYearExpenses = Number(prevYearExpensesAgg._sum.amount || 0) + Number(prevYearTxExpensesAgg._sum.amount || 0)

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

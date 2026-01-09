import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Revalidar cada 60 segundos - permite caché del lado del servidor
export const revalidate = 60

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

    // Get current month dates
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get previous month dates
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Construir filtro base
    const baseInvoiceFilter = companyId 
      ? { companyId } 
      : { userId: session.user.id }
    
    const baseExpenseFilter = companyId
      ? { companyId }
      : { userId: session.user.id }

    // Total revenue this month (facturas pagadas)
    const revenueThisMonth = await prisma.invoice.aggregate({
      where: {
        ...baseInvoiceFilter,
        status: 'PAID',
        paidDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _sum: {
        total: true,
      },
    })

    // También incluir facturas emitidas este mes (no solo pagadas) para mostrar ingresos
    const invoicesThisMonth = await prisma.invoice.aggregate({
      where: {
        ...baseInvoiceFilter,
        issueDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _sum: {
        total: true,
      },
    })

    // Total revenue last month
    const revenueLastMonth = await prisma.invoice.aggregate({
      where: {
        ...baseInvoiceFilter,
        issueDate: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
      _sum: {
        total: true,
      },
    })

    // Total expenses this month
    const expensesThisMonth = await prisma.expense.aggregate({
      where: {
        ...baseExpenseFilter,
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Total expenses last month
    const expensesLastMonth = await prisma.expense.aggregate({
      where: {
        ...baseExpenseFilter,
        date: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Total customers
    const totalCustomers = await prisma.customer.count({
      where: {
        companyId: companyId || undefined,
        status: 'ACTIVE',
      },
    })

    // Total invoices this month
    const totalInvoices = await prisma.invoice.count({
      where: {
        ...baseInvoiceFilter,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    })

    // Pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        ...baseInvoiceFilter,
        status: {
          in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL'],
        },
      },
    })

    // Overdue invoices
    const overdueInvoices = await prisma.invoice.count({
      where: {
        ...baseInvoiceFilter,
        status: 'OVERDUE',
      },
    })

    // Calculate totals - usar ingresos de facturas emitidas (no solo pagadas)
    const totalRevenue = Number(invoicesThisMonth._sum.total || 0)
    const lastMonthRevenue = Number(revenueLastMonth._sum.total || 0)
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0

    const totalExpenses = Number(expensesThisMonth._sum.amount || 0)
    const lastMonthExpenses = Number(expensesLastMonth._sum.amount || 0)
    const expensesChange = lastMonthExpenses > 0
      ? Math.round(((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
      : totalExpenses > 0 ? 100 : 0

    // Calcular balance
    const paidRevenue = Number(revenueThisMonth._sum.total || 0)
    const netProfit = totalRevenue - totalExpenses

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      totalCustomers,
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      revenueChange,
      expensesChange,
      paidRevenue,
      netProfit,
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

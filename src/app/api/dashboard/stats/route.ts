import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get current month dates
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get previous month dates
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Total revenue this month
    const revenueThisMonth = await prisma.invoice.aggregate({
      where: {
        userId: session.user.id,
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

    // Total revenue last month
    const revenueLastMonth = await prisma.invoice.aggregate({
      where: {
        userId: session.user.id,
        status: 'PAID',
        paidDate: {
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
        userId: session.user.id,
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
        userId: session.user.id,
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
        status: 'ACTIVE',
      },
    })

    // Total invoices this month
    const totalInvoices = await prisma.invoice.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    })

    // Pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        userId: session.user.id,
        status: {
          in: ['SENT', 'VIEWED', 'PARTIAL'],
        },
      },
    })

    // Overdue invoices
    const overdueInvoices = await prisma.invoice.count({
      where: {
        userId: session.user.id,
        status: 'OVERDUE',
      },
    })

    // Calculate changes
    const totalRevenue = revenueThisMonth._sum.total || 0
    const lastMonthRevenue = revenueLastMonth._sum.total || 0
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0

    const totalExpenses = expensesThisMonth._sum.amount || 0
    const lastMonthExpenses = expensesLastMonth._sum.amount || 0
    const expensesChange = lastMonthExpenses > 0
      ? Math.round(((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
      : 0

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      totalCustomers,
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      revenueChange,
      expensesChange,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}

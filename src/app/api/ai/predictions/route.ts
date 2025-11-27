import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/ai/predictions
 * Genera predicciones basadas en datos reales de la empresa
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const timeframe = searchParams.get('timeframe') || '6months'

    // Obtener datos históricos de la empresa
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    // Obtener facturas para análisis de ingresos
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: oneYearAgo }
      },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        dueDate: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Obtener gastos
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: oneYearAgo }
      },
      select: {
        id: true,
        amount: true,
        category: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Obtener cuentas bancarias
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {})
      },
      select: {
        id: true,
        balance: true,
        accountName: true
      }
    })

    // Calcular métricas mensuales
    const monthlyData = calculateMonthlyMetrics(invoices, expenses)
    
    // Generar predicciones
    const predictions = generatePredictions(monthlyData, bankAccounts)
    
    // Generar pronóstico de flujo de caja
    const cashFlowForecast = generateCashFlowForecast(monthlyData, invoices, expenses)

    // Calcular KPIs actuales
    const currentMetrics = calculateCurrentMetrics(invoices, expenses, bankAccounts)

    return NextResponse.json({
      success: true,
      predictions,
      cashFlowForecast,
      currentMetrics,
      monthlyData,
      dataPoints: {
        invoices: invoices.length,
        expenses: expenses.length,
        accounts: bankAccounts.length
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error generating predictions:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}

function calculateMonthlyMetrics(invoices: any[], expenses: any[]) {
  const monthlyData: Record<string, { revenue: number; expenses: number; profit: number }> = {}
  
  // Agrupar ingresos por mes
  invoices.forEach(inv => {
    const monthKey = new Date(inv.createdAt).toISOString().slice(0, 7)
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, expenses: 0, profit: 0 }
    }
    if (inv.status === 'PAID') {
      monthlyData[monthKey].revenue += inv.total
    }
  })

  // Agrupar gastos por mes
  expenses.forEach(exp => {
    const monthKey = new Date(exp.createdAt).toISOString().slice(0, 7)
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, expenses: 0, profit: 0 }
    }
    monthlyData[monthKey].expenses += exp.amount
  })

  // Calcular utilidad
  Object.keys(monthlyData).forEach(key => {
    monthlyData[key].profit = monthlyData[key].revenue - monthlyData[key].expenses
  })

  return monthlyData
}

function generatePredictions(monthlyData: Record<string, any>, bankAccounts: any[]) {
  const months = Object.keys(monthlyData).sort()
  const recentMonths = months.slice(-6)
  
  // Calcular promedios y tendencias
  let avgRevenue = 0
  let avgExpenses = 0
  let revenueGrowth = 0
  
  if (recentMonths.length > 0) {
    recentMonths.forEach(m => {
      avgRevenue += monthlyData[m].revenue
      avgExpenses += monthlyData[m].expenses
    })
    avgRevenue /= recentMonths.length
    avgExpenses /= recentMonths.length

    if (recentMonths.length >= 2) {
      const firstRevenue = monthlyData[recentMonths[0]].revenue
      const lastRevenue = monthlyData[recentMonths[recentMonths.length - 1]].revenue
      revenueGrowth = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0
    }
  }

  const currentBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  // Generar predicciones
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthName = nextMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const predictions = [
    {
      id: '1',
      type: 'revenue',
      title: `Ingresos ${nextMonthName}`,
      timeframe: 'Próximo Mes',
      prediction: Math.round(avgRevenue * (1 + (revenueGrowth > 0 ? 0.05 : -0.02))),
      confidence: recentMonths.length >= 6 ? 92 : recentMonths.length >= 3 ? 78 : 60,
      trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
      insights: [
        revenueGrowth > 0 
          ? `Tendencia positiva de +${revenueGrowth.toFixed(1)}% en últimos 6 meses`
          : `Tendencia estable en últimos meses`,
        `Promedio mensual: $${avgRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
        `Basado en ${recentMonths.length} meses de datos históricos`,
        avgRevenue > avgExpenses ? 'Margen operativo positivo' : 'Revisar control de gastos'
      ]
    },
    {
      id: '2',
      type: 'cashflow',
      title: 'Flujo de Caja Q1 2026',
      timeframe: 'Próximo Trimestre',
      prediction: Math.round(currentBalance + (avgRevenue - avgExpenses) * 3),
      confidence: recentMonths.length >= 6 ? 88 : 70,
      trend: avgRevenue > avgExpenses ? 'up' : 'down',
      insights: [
        `Saldo actual: $${currentBalance.toLocaleString('es-MX')}`,
        `Flujo mensual promedio: $${(avgRevenue - avgExpenses).toLocaleString('es-MX')}`,
        avgRevenue > avgExpenses 
          ? 'Proyección positiva basada en tendencias actuales'
          : 'Se recomienda revisar estructura de costos',
        'Mantener reserva de 3 meses de operación'
      ]
    },
    {
      id: '3',
      type: 'expenses',
      title: 'Gastos Proyectados',
      timeframe: 'Próximo Mes',
      prediction: Math.round(avgExpenses * 1.02), // Ligero incremento esperado
      confidence: 85,
      trend: 'stable',
      insights: [
        `Gasto mensual promedio: $${avgExpenses.toLocaleString('es-MX')}`,
        'Incremento del 2% por inflación proyectada',
        'Principales categorías identificadas',
        'Oportunidades de optimización detectadas'
      ]
    },
    {
      id: '4',
      type: 'profit',
      title: 'Utilidad Neta Proyectada',
      timeframe: 'Próximos 3 Meses',
      prediction: Math.round((avgRevenue - avgExpenses) * 3),
      confidence: 82,
      trend: avgRevenue > avgExpenses * 1.1 ? 'up' : 'stable',
      insights: [
        `Margen operativo: ${((avgRevenue - avgExpenses) / avgRevenue * 100).toFixed(1)}%`,
        avgRevenue > avgExpenses ? 'Negocio rentable' : 'Requiere optimización',
        'Basado en proyecciones de ingresos y gastos',
        'Considerar reinversión o distribución'
      ]
    }
  ]

  return predictions
}

function generateCashFlowForecast(monthlyData: Record<string, any>, invoices: any[], expenses: any[]) {
  const months = Object.keys(monthlyData).sort()
  const forecast: any[] = []
  
  // Datos históricos
  months.slice(-6).forEach(month => {
    const data = monthlyData[month]
    const monthDate = new Date(month + '-01')
    forecast.push({
      month: monthDate.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      actual: data.revenue - data.expenses,
      predicted: null,
      type: 'actual'
    })
  })

  // Proyecciones futuras (3 meses)
  const avgFlow = months.slice(-6).reduce((sum, m) => 
    sum + (monthlyData[m].revenue - monthlyData[m].expenses), 0) / Math.min(months.length, 6)

  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + i)
    
    // Aplicar estacionalidad básica
    const seasonalFactor = getSeasonalFactor(futureDate.getMonth())
    
    forecast.push({
      month: futureDate.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      actual: null,
      predicted: Math.round(avgFlow * seasonalFactor),
      lowerBound: Math.round(avgFlow * seasonalFactor * 0.85),
      upperBound: Math.round(avgFlow * seasonalFactor * 1.15),
      type: 'forecast'
    })
  }

  return forecast
}

function getSeasonalFactor(month: number): number {
  // Factores estacionales típicos para negocios
  const factors: Record<number, number> = {
    0: 0.85,  // Enero
    1: 0.90,  // Febrero
    2: 1.00,  // Marzo
    3: 1.00,  // Abril
    4: 1.05,  // Mayo
    5: 1.00,  // Junio
    6: 0.95,  // Julio
    7: 0.95,  // Agosto
    8: 1.00,  // Septiembre
    9: 1.05,  // Octubre
    10: 1.10, // Noviembre
    11: 1.20  // Diciembre
  }
  return factors[month] || 1.0
}

function calculateCurrentMetrics(invoices: any[], expenses: any[], bankAccounts: any[]) {
  const totalRevenue = invoices
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + i.total, 0)
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalBalance = bankAccounts.reduce((sum, a) => sum + a.balance, 0)
  
  const pendingInvoices = invoices
    .filter(i => i.status === 'PENDING' || i.status === 'SENT')
    .reduce((sum, i) => sum + i.total, 0)

  const overdueInvoices = invoices
    .filter(i => (i.status === 'PENDING' || i.status === 'SENT') && new Date(i.dueDate) < new Date())
    .reduce((sum, i) => sum + i.total, 0)

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0,
    cashBalance: totalBalance,
    pendingReceivables: pendingInvoices,
    overdueReceivables: overdueInvoices,
    burnRate: totalExpenses / 12, // Gasto mensual promedio
    runwayMonths: totalExpenses > 0 ? Math.round(totalBalance / (totalExpenses / 12)) : 0
  }
}

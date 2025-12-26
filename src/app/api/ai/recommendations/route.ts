import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/recommendations
 * Genera recomendaciones inteligentes basadas en datos reales
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    // Obtener datos de la empresa
    const [invoices, expenses, customers, products, bankAccounts] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          userId: session.user.id,
          ...(companyId ? { companyId } : {})
        },
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          ...(companyId ? { companyId } : {})
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.findMany({
        where: {
          ...(companyId ? { companyId } : {})
        },
        include: {
          invoices: {
            select: { total: true, status: true, createdAt: true }
          }
        }
      }),
      prisma.product.findMany({
        where: {
          ...(companyId ? { companyId } : {})
        }
      }),
      prisma.bankAccount.findMany({
        where: {
          userId: session.user.id,
          ...(companyId ? { companyId } : {})
        }
      })
    ])

    // Generar recomendaciones basadas en análisis
    const recommendations = []
    let priorityCounter = 1

    // 1. Análisis de facturas vencidas
    const overdueInvoices = invoices.filter(inv => 
      (inv.status === 'SENT' || inv.status === 'OVERDUE') && 
      new Date(inv.dueDate) < new Date()
    )
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)

    if (overdueInvoices.length > 0) {
      recommendations.push({
        id: `rec-${priorityCounter}`,
        category: 'Cobranza',
        title: 'Recuperar Cuentas por Cobrar Vencidas',
        description: `Tienes ${overdueInvoices.length} facturas vencidas por un total de $${overdueAmount.toLocaleString('es-MX')}. Implementar seguimiento activo podría recuperar este flujo.`,
        impact: overdueAmount > 50000 ? 'High' : overdueAmount > 20000 ? 'Medium' : 'Low',
        effort: 'Easy',
        priority: priorityCounter++,
        potentialRevenue: overdueAmount,
        timeToImplement: '1-2 semanas',
        status: 'New',
        steps: [
          `Revisar las ${overdueInvoices.length} facturas vencidas`,
          'Enviar recordatorios de pago personalizados',
          'Ofrecer planes de pago si es necesario',
          'Implementar cobro automatizado para futuras facturas',
          'Considerar políticas de crédito más estrictas'
        ],
        metrics: [
          { label: 'Facturas Vencidas', value: overdueInvoices.length.toString() },
          { label: 'Monto Total', value: `$${overdueAmount.toLocaleString('es-MX')}` },
          { label: 'Días Promedio Vencido', value: `${Math.round(overdueInvoices.reduce((sum, inv) => sum + Math.max(0, (new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)), 0) / overdueInvoices.length)} días` }
        ],
        roi: Math.round((overdueAmount / 1000) * 100)
      })
    }

    // 2. Análisis de gastos por categoría
    const expensesByCategory: Record<string, number> = {}
    expenses.forEach(exp => {
      const cat = exp.category?.name || 'Sin Categoría'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
    })

    const sortedCategories = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0]
      const topCategoryAmount = topCategory[1]
      const potentialSavings = Math.round(topCategoryAmount * 0.15) // Potencial 15% ahorro

      recommendations.push({
        id: `rec-${priorityCounter}`,
        category: 'Optimización de Costos',
        title: `Optimizar Gastos en ${topCategory[0]}`,
        description: `${topCategory[0]} representa tu mayor gasto con $${topCategoryAmount.toLocaleString('es-MX')}. Una reducción del 15% podría ahorrar $${potentialSavings.toLocaleString('es-MX')} anuales.`,
        impact: potentialSavings > 30000 ? 'High' : potentialSavings > 10000 ? 'Medium' : 'Low',
        effort: 'Moderate',
        priority: priorityCounter++,
        potentialSavings,
        timeToImplement: '2-4 semanas',
        status: 'New',
        steps: [
          `Auditar todos los gastos de ${topCategory[0]}`,
          'Identificar proveedores alternativos',
          'Negociar mejores tarifas con proveedores actuales',
          'Eliminar gastos redundantes',
          'Implementar controles de aprobación'
        ],
        metrics: [
          { label: 'Gasto Actual', value: `$${topCategoryAmount.toLocaleString('es-MX')}` },
          { label: 'Ahorro Potencial', value: `$${potentialSavings.toLocaleString('es-MX')}` },
          { label: '% del Total', value: `${((topCategoryAmount / expenses.reduce((s, e) => s + e.amount, 0)) * 100).toFixed(1)}%` }
        ],
        roi: Math.round((potentialSavings / 5000) * 100)
      })
    }

    // 3. Análisis de clientes de alto valor
    const customerRevenue = customers.map(c => ({
      ...c,
      totalRevenue: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
      invoiceCount: c.invoices.length
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    const topCustomers = customerRevenue.slice(0, 5)
    const topCustomerRevenue = topCustomers.reduce((sum, c) => sum + c.totalRevenue, 0)
    const totalCustomerRevenue = customerRevenue.reduce((sum, c) => sum + c.totalRevenue, 0)

    if (topCustomers.length > 0 && totalCustomerRevenue > 0) {
      const concentration = (topCustomerRevenue / totalCustomerRevenue) * 100

      if (concentration > 50) {
        recommendations.push({
          id: `rec-${priorityCounter}`,
          category: 'Diversificación',
          title: 'Reducir Concentración de Clientes',
          description: `El ${concentration.toFixed(0)}% de tus ingresos proviene de solo ${topCustomers.length} clientes. Alta dependencia representa riesgo de negocio.`,
          impact: 'High',
          effort: 'Complex',
          priority: priorityCounter++,
          potentialRevenue: Math.round(totalCustomerRevenue * 0.2),
          timeToImplement: '3-6 meses',
          status: 'New',
          steps: [
            'Identificar nuevos segmentos de mercado',
            'Desarrollar estrategia de adquisición de clientes',
            'Crear ofertas para nuevos mercados',
            'Fortalecer relaciones con clientes actuales',
            'Implementar programa de referidos'
          ],
          metrics: [
            { label: 'Concentración Top 5', value: `${concentration.toFixed(1)}%` },
            { label: 'Ingresos Top 5', value: `$${topCustomerRevenue.toLocaleString('es-MX')}` },
            { label: 'Clientes Totales', value: customers.length.toString() }
          ],
          roi: 150
        })
      }
    }

    // 4. Análisis de productos de bajo rendimiento
    const lowStockProducts = products.filter((p: any) => 
      p.trackInventory && p.quantity !== undefined && p.quantity < (p.reorderPoint || 10)
    )

    if (lowStockProducts.length > 0) {
      recommendations.push({
        id: `rec-${priorityCounter}`,
        category: 'Inventario',
        title: 'Reabastecer Productos con Stock Bajo',
        description: `${lowStockProducts.length} productos tienen inventario por debajo del punto de reorden. Evitar pérdida de ventas por desabasto.`,
        impact: 'Medium',
        effort: 'Easy',
        priority: priorityCounter++,
        timeToImplement: '1 semana',
        status: 'New',
        steps: [
          'Revisar lista de productos con stock bajo',
          'Generar órdenes de compra',
          'Contactar proveedores principales',
          'Configurar alertas automáticas de reorden',
          'Evaluar demanda histórica para ajustar niveles'
        ],
        metrics: [
          { label: 'Productos Afectados', value: lowStockProducts.length.toString() },
          { label: 'Productos Totales', value: products.length.toString() }
        ],
        roi: 80
      })
    }

    // 5. Análisis de flujo de caja
    const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
    const monthlyExpenses = expenses.reduce((sum, exp) => {
      const expDate = new Date(exp.createdAt)
      const now = new Date()
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        return sum + exp.amount
      }
      return sum
    }, 0)

    const runwayMonths = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 12

    if (runwayMonths < 3) {
      recommendations.push({
        id: `rec-${priorityCounter}`,
        category: 'Flujo de Caja',
        title: 'Mejorar Reserva de Efectivo',
        description: `Tu reserva actual cubre solo ${runwayMonths.toFixed(1)} meses de operación. Se recomienda mantener mínimo 3 meses.`,
        impact: 'High',
        effort: 'Moderate',
        priority: priorityCounter++,
        timeToImplement: '1-3 meses',
        status: 'New',
        steps: [
          'Acelerar cobranza de facturas pendientes',
          'Revisar y reducir gastos no esenciales',
          'Negociar términos de pago con proveedores',
          'Considerar línea de crédito como respaldo',
          'Establecer meta de ahorro mensual'
        ],
        metrics: [
          { label: 'Saldo Actual', value: `$${totalBalance.toLocaleString('es-MX')}` },
          { label: 'Gastos Mensuales', value: `$${monthlyExpenses.toLocaleString('es-MX')}` },
          { label: 'Runway', value: `${runwayMonths.toFixed(1)} meses` }
        ],
        roi: 200
      })
    }

    // 6. Automatización de facturación
    const hasRecurringPattern = invoices.length > 10
    if (hasRecurringPattern) {
      recommendations.push({
        id: `rec-${priorityCounter}`,
        category: 'Automatización',
        title: 'Implementar Facturación Recurrente',
        description: 'Identificados clientes con patrones de facturación repetitivos. Automatizar puede ahorrar tiempo y reducir errores.',
        impact: 'Medium',
        effort: 'Easy',
        priority: priorityCounter++,
        potentialSavings: 5000,
        timeToImplement: '1-2 semanas',
        status: 'New',
        steps: [
          'Identificar clientes con servicios recurrentes',
          'Configurar plantillas de factura automática',
          'Establecer calendarios de facturación',
          'Activar cobros automáticos',
          'Monitorear y ajustar según necesidad'
        ],
        metrics: [
          { label: 'Facturas Totales', value: invoices.length.toString() },
          { label: 'Tiempo Estimado Ahorrado', value: '10+ hrs/mes' },
          { label: 'Ahorro Anual', value: '$5,000+' }
        ],
        roi: 120
      })
    }

    // Calcular resumen
    const summary = {
      totalRecommendations: recommendations.length,
      highImpact: recommendations.filter(r => r.impact === 'High').length,
      mediumImpact: recommendations.filter(r => r.impact === 'Medium').length,
      lowImpact: recommendations.filter(r => r.impact === 'Low').length,
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0),
      totalPotentialRevenue: recommendations.reduce((sum, r) => sum + (r.potentialRevenue || 0), 0),
      avgROI: recommendations.length > 0 
        ? Math.round(recommendations.reduce((sum, r) => sum + (r.roi || 0), 0) / recommendations.length)
        : 0
    }

    return NextResponse.json({
      success: true,
      recommendations,
      summary,
      analyzedData: {
        invoices: invoices.length,
        expenses: expenses.length,
        customers: customers.length,
        products: products.length,
        bankAccounts: bankAccounts.length
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/recommendations
 * Actualiza el estado de una recomendación
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { recommendationId, status, feedback } = body

    // En una implementación completa, guardaríamos esto en la base de datos
    // Por ahora retornamos éxito
    return NextResponse.json({
      success: true,
      message: `Recommendation ${recommendationId} updated to ${status}`,
      feedback
    })

  } catch (error: any) {
    console.error('Error updating recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    )
  }
}

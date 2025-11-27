import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/ai/chat
 * Chat con el asistente IA usando datos reales
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, companyId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Obtener datos reales para contexto
    const [invoices, expenses, customers, products, bankAccounts, employees] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId: session.user.id, ...(companyId ? { companyId } : {}) },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.expense.findMany({
        where: { userId: session.user.id, ...(companyId ? { companyId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.customer.findMany({
        where: { ...(companyId ? { companyId } : {}) }
      }),
      prisma.product.findMany({
        where: { ...(companyId ? { companyId } : {}) }
      }),
      prisma.bankAccount.findMany({
        where: { userId: session.user.id, ...(companyId ? { companyId } : {}) }
      }),
      prisma.employee.findMany({
        where: { userId: session.user.id, ...(companyId ? { companyId } : {}) }
      })
    ])

    // Calcular métricas reales
    const metrics = calculateRealMetrics(invoices, expenses, customers, bankAccounts, employees, products)
    
    // Generar respuesta basada en datos reales
    const response = generateAIResponse(message.toLowerCase(), metrics)

    return NextResponse.json({
      success: true,
      response: response.content,
      suggestions: response.suggestions,
      metrics: response.showMetrics ? metrics : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

function calculateRealMetrics(invoices: any[], expenses: any[], customers: any[], bankAccounts: any[], employees: any[], products: any[]) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Facturas
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID')
  const pendingInvoices = invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE')
  const overdueInvoices = pendingInvoices.filter(inv => new Date(inv.dueDate) < now)
  
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)

  // Facturas del mes
  const monthInvoices = invoices.filter(inv => new Date(inv.createdAt) >= startOfMonth)
  const monthRevenue = monthInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0)

  // Gastos
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const monthExpenses = expenses
    .filter(exp => new Date(exp.createdAt) >= startOfMonth)
    .reduce((sum, exp) => sum + exp.amount, 0)

  // Gastos por categoría
  const expensesByCategory: Record<string, number> = {}
  expenses.forEach(exp => {
    const cat = exp.categoryId || 'Sin Categoría'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
  })

  // Banco
  const totalCash = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  // Clientes
  const topCustomers = customers.map(c => ({
    name: c.name,
    revenue: invoices.filter(inv => inv.customerId === c.id && inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.total, 0)
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Empleados
  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)

  return {
    // Resumen general
    totalRevenue: totalPaid,
    totalExpenses,
    netProfit: totalPaid - totalExpenses,
    profitMargin: totalPaid > 0 ? ((totalPaid - totalExpenses) / totalPaid * 100) : 0,
    
    // Facturas
    invoiceCount: invoices.length,
    pendingInvoices: pendingInvoices.length,
    pendingAmount: totalPending,
    overdueInvoices: overdueInvoices.length,
    overdueAmount: totalOverdue,
    monthRevenue,
    
    // Gastos
    monthExpenses,
    expensesByCategory,
    topExpenseCategories: Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5),
    
    // Efectivo
    cashBalance: totalCash,
    accountsCount: bankAccounts.length,
    
    // Clientes
    customerCount: customers.length,
    topCustomers,
    
    // Productos
    productCount: products.length,
    
    // Empleados
    employeeCount: employees.length,
    monthlyPayroll: totalPayroll,
    
    // Runway
    burnRate: monthExpenses,
    runwayMonths: monthExpenses > 0 ? Math.round(totalCash / monthExpenses) : 0
  }
}

function generateAIResponse(message: string, metrics: any) {
  // Balance / Finanzas generales
  if (message.includes('balance') || message.includes('saldo') || message.includes('finanz') || message.includes('resumen')) {
    return {
      showMetrics: true,
      content: `📊 **Resumen Financiero Actual:**

**💰 Efectivo Disponible:** $${metrics.cashBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- ${metrics.accountsCount} cuentas bancarias activas

**📈 Ingresos:**
- Total cobrado: $${metrics.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Este mes: $${metrics.monthRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

**📉 Gastos:**
- Total: $${metrics.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Este mes: $${metrics.monthExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

**📊 Utilidad Neta:** $${metrics.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
**📊 Margen:** ${metrics.profitMargin.toFixed(1)}%

${metrics.runwayMonths > 0 ? `💡 Tu reserva de efectivo cubre aproximadamente ${metrics.runwayMonths} meses de operación.` : ''}
${metrics.overdueInvoices > 0 ? `\n⚠️ **Alerta:** Tienes ${metrics.overdueInvoices} facturas vencidas por $${metrics.overdueAmount.toLocaleString('es-MX')}` : ''}`,
      suggestions: [
        '¿Cuáles son mis gastos principales?',
        '¿Qué clientes me deben dinero?',
        'Muestra el flujo de caja proyectado'
      ]
    }
  }

  // Facturas
  if (message.includes('factura') || message.includes('invoice') || message.includes('cobr')) {
    return {
      showMetrics: true,
      content: `📄 **Estado de Facturación:**

**Total Facturas:** ${metrics.invoiceCount}
- ✅ Pagadas: $${metrics.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- ⏳ Pendientes: ${metrics.pendingInvoices} facturas por $${metrics.pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
${metrics.overdueInvoices > 0 ? `- ⚠️ **Vencidas:** ${metrics.overdueInvoices} facturas por $${metrics.overdueAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}

**Este Mes:**
- Ingresos cobrados: $${metrics.monthRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

${metrics.overdueInvoices > 0 ? `
🎯 **Acción Recomendada:** 
Enviar recordatorios de pago a los ${metrics.overdueInvoices} clientes con facturas vencidas. Podrías recuperar $${metrics.overdueAmount.toLocaleString('es-MX')}.` : '✅ No tienes facturas vencidas. ¡Excelente gestión de cobranza!'}`,
      suggestions: [
        'Crear nueva factura',
        '¿Qué cliente me debe más?',
        'Ver historial de pagos'
      ]
    }
  }

  // Gastos
  if (message.includes('gasto') || message.includes('expense') || message.includes('egreso')) {
    const topCategories = metrics.topExpenseCategories
      .map(([cat, amount]: [string, number], i: number) => 
        `${i + 1}. ${cat}: $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${((amount / metrics.totalExpenses) * 100).toFixed(0)}%)`)
      .join('\n')

    return {
      showMetrics: true,
      content: `💰 **Análisis de Gastos:**

**Total Gastos:** $${metrics.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
**Este Mes:** $${metrics.monthExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

**Top Categorías:**
${topCategories || 'No hay gastos registrados aún'}

**Análisis:**
- Gasto mensual promedio: $${(metrics.totalExpenses / 12).toLocaleString('es-MX', { minimumFractionDigits: 0 })} (estimado)
- Runway con efectivo actual: ${metrics.runwayMonths} meses

💡 **Recomendación:** ${metrics.topExpenseCategories[0] ? `Revisa los gastos de "${metrics.topExpenseCategories[0][0]}" para identificar oportunidades de ahorro.` : 'Comienza a registrar tus gastos para obtener análisis detallados.'}`,
      suggestions: [
        'Registrar nuevo gasto',
        'Ver gastos deducibles',
        '¿Dónde puedo ahorrar?'
      ]
    }
  }

  // Clientes
  if (message.includes('cliente') || message.includes('customer')) {
    const topCustomersList = metrics.topCustomers
      .map((c: any, i: number) => `${i + 1}. ${c.name}: $${c.revenue.toLocaleString('es-MX')}`)
      .join('\n')

    return {
      showMetrics: true,
      content: `👥 **Análisis de Clientes:**

**Total Clientes:** ${metrics.customerCount}

**Top 5 Clientes por Ingresos:**
${topCustomersList || 'No hay datos de clientes aún'}

**Métricas:**
- Ingreso promedio por cliente: $${metrics.customerCount > 0 ? (metrics.totalRevenue / metrics.customerCount).toLocaleString('es-MX', { minimumFractionDigits: 0 }) : 0}
- Clientes con facturas pendientes: ${metrics.pendingInvoices}

💡 **Insight:** ${metrics.topCustomers[0] ? `"${metrics.topCustomers[0].name}" es tu cliente más valioso. Considera desarrollar más esta relación.` : 'Registra clientes para obtener análisis de rentabilidad.'}`,
      suggestions: [
        'Agregar nuevo cliente',
        '¿Quién tiene facturas vencidas?',
        'Segmentar clientes por industria'
      ]
    }
  }

  // Productos
  if (message.includes('producto') || message.includes('inventario') || message.includes('product')) {
    return {
      showMetrics: true,
      content: `📦 **Inventario y Productos:**

**Total Productos:** ${metrics.productCount}

💡 Para análisis más detallado de productos, visita la sección de Inventario donde puedes ver:
- Productos con stock bajo
- Más vendidos
- Margen por producto
- Historial de ventas`,
      suggestions: [
        'Ver productos con stock bajo',
        'Agregar nuevo producto',
        '¿Cuáles son mis productos más vendidos?'
      ]
    }
  }

  // Empleados / Nómina
  if (message.includes('empleado') || message.includes('nómina') || message.includes('nomina') || message.includes('payroll')) {
    return {
      showMetrics: true,
      content: `👥 **Resumen de Nómina:**

**Empleados Activos:** ${metrics.employeeCount}
**Nómina Mensual:** $${metrics.monthlyPayroll.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

${metrics.employeeCount > 0 ? `
**Análisis:**
- Costo promedio por empleado: $${(metrics.monthlyPayroll / metrics.employeeCount).toLocaleString('es-MX', { minimumFractionDigits: 0 })}/mes
- % de gastos en nómina: ${((metrics.monthlyPayroll / metrics.monthExpenses) * 100).toFixed(1)}%
` : 'Registra empleados para ver análisis de nómina.'}`,
      suggestions: [
        'Ver calendario de pagos',
        'Agregar nuevo empleado',
        'Calcular prestaciones'
      ]
    }
  }

  // Flujo de caja / Predicciones
  if (message.includes('flujo') || message.includes('cash') || message.includes('predic') || message.includes('pronost')) {
    return {
      showMetrics: true,
      content: `📊 **Proyección de Flujo de Caja:**

**Situación Actual:**
- 💰 Efectivo: $${metrics.cashBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- 📈 Por cobrar: $${metrics.pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- 🔥 Burn rate mensual: $${metrics.burnRate.toLocaleString('es-MX', { minimumFractionDigits: 0 })}

**Proyección 30 días:**
- Entradas esperadas: ~$${Math.round(metrics.pendingAmount * 0.7).toLocaleString('es-MX')} (70% de pendientes)
- Salidas proyectadas: ~$${metrics.burnRate.toLocaleString('es-MX')}
- Balance estimado: ${metrics.cashBalance + (metrics.pendingAmount * 0.7) - metrics.burnRate > 0 ? '✅ Positivo' : '⚠️ Revisar'}

**Runway:** ${metrics.runwayMonths} meses con reservas actuales

💡 **Recomendación:** ${metrics.runwayMonths < 3 ? 'Considera acelerar la cobranza o reducir gastos para aumentar tu runway.' : 'Tu posición de caja es saludable. Mantén al menos 3 meses de reserva.'}`,
      suggestions: [
        'Ver facturas por cobrar',
        '¿Cómo mejoro mi flujo de caja?',
        'Simular escenarios'
      ]
    }
  }

  // Impuestos
  if (message.includes('impuesto') || message.includes('tax') || message.includes('sat') || message.includes('fiscal')) {
    return {
      showMetrics: true,
      content: `🏛️ **Información Fiscal:**

**Datos para declaraciones:**
- Ingresos facturados: $${metrics.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Gastos deducibles: $${metrics.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Base gravable estimada: $${metrics.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

**Recordatorios:**
- IVA mensual: Día 17 del mes siguiente
- ISR provisional: Día 17 del mes siguiente
- Declaración anual: Marzo-Abril

💡 Consulta con tu contador para deducciones específicas y estrategias fiscales.`,
      suggestions: [
        'Ver gastos deducibles',
        'Calendario de obligaciones',
        'Generar reporte fiscal'
      ]
    }
  }

  // Ayuda general / Default
  return {
    showMetrics: false,
    content: `👋 **¡Hola! Soy tu asistente contable IA.**

Puedo ayudarte con información sobre:

📊 **Finanzas:** "¿Cuál es mi balance?", "Muestra mi resumen financiero"
📄 **Facturas:** "¿Cuántas facturas tengo pendientes?", "Facturas vencidas"
💰 **Gastos:** "¿Cuáles son mis principales gastos?", "Gastos del mes"
👥 **Clientes:** "¿Quiénes son mis mejores clientes?", "Clientes que me deben"
📈 **Predicciones:** "Pronóstico de flujo de caja", "Tendencias"
🏛️ **Impuestos:** "Información fiscal", "Deducciones"
👔 **Nómina:** "Resumen de empleados", "Costos de nómina"

**Datos actuales:**
- ${metrics.customerCount} clientes registrados
- ${metrics.invoiceCount} facturas
- ${metrics.productCount} productos
- ${metrics.employeeCount} empleados
- Efectivo: $${metrics.cashBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

¿En qué puedo ayudarte?`,
    suggestions: [
      '¿Cuál es mi situación financiera?',
      '¿Tengo facturas vencidas?',
      '¿Cuáles son mis mayores gastos?'
    ]
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Este endpoint maneja las conversaciones con el AI Assistant
// En producción, aquí integrarías OpenAI GPT-4, Anthropic Claude, o tu propio modelo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, message } = body

    if (!companyId || !message) {
      return NextResponse.json(
        { error: 'Missing companyId or message' },
        { status: 400 }
      )
    }

    // Obtener datos reales de la base de datos para generar respuestas
    const aiResponse = await generateAIResponse(message, companyId)

    return NextResponse.json({
      response: aiResponse.content,
      suggestions: aiResponse.suggestions,
      timestamp: new Date().toISOString(),
      companyId
    })
  } catch (error) {
    console.error('AI Assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

// AI response generator using real database data
// En producción, esto se reemplazaría con llamadas a OpenAI API:
// const response = await openai.chat.completions.create({
//   model: "gpt-4",
//   messages: [
//     { role: "system", content: "Eres un asistente contable experto..." },
//     ...conversationHistory,
//     { role: "user", content: message }
//   ]
// })
async function generateAIResponse(message: string, companyId: string) {
  const lowerMessage = message.toLowerCase()

  // Balance / Finanzas
  if (lowerMessage.includes('balance') || lowerMessage.includes('saldo')) {
    return await getBalanceResponse(companyId)
  }

  // Facturas
  if (lowerMessage.includes('factura') || lowerMessage.includes('invoice')) {
    return await getInvoicesResponse(companyId)
  }

  // Gastos
  if (lowerMessage.includes('gasto') || lowerMessage.includes('expense')) {
    return await getExpensesResponse(companyId)
  }

  // Flujo de caja
  if (lowerMessage.includes('flujo') || lowerMessage.includes('cash flow') || lowerMessage.includes('predic')) {
    return await getCashFlowResponse(companyId)
  }

  // Impuestos
  if (lowerMessage.includes('impuesto') || lowerMessage.includes('tax') || lowerMessage.includes('sat')) {
    return await getTaxResponse(companyId)
  }

  // Nómina
  if (lowerMessage.includes('nómi') || lowerMessage.includes('nomi') || lowerMessage.includes('payroll') || lowerMessage.includes('empleado')) {
    return await getPayrollResponse(companyId)
  }

  // Clientes
  if (lowerMessage.includes('cliente') || lowerMessage.includes('customer') || lowerMessage.includes('debe')) {
    return await getCustomersResponse(companyId)
  }

  // Categorización
  if (lowerMessage.includes('categoriz') || lowerMessage.includes('clasific') || lowerMessage.includes('transaction')) {
    return await getCategoriesResponse(companyId)
  }

  // Reportes
  if (lowerMessage.includes('reporte') || lowerMessage.includes('report') || lowerMessage.includes('estado')) {
    return getReportsResponse()
  }

  // Presupuesto
  if (lowerMessage.includes('presupuesto') || lowerMessage.includes('budget')) {
    return await getBudgetResponse(companyId)
  }

  // Ayuda general / no entendido
  return getHelpResponse()
}

async function getBalanceResponse(companyId: string) {
  try {
    // Get account balances from database
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { companyId },
      select: { balance: true, type: true, name: true }
    })

    let assets = 0
    let liabilities = 0
    let equity = 0

    accounts.forEach(account => {
      const balance = account.balance
      if (account.type === 'ASSET') {
        assets += balance
      } else if (account.type === 'LIABILITY') {
        liabilities += balance
      } else if (account.type === 'EQUITY') {
        equity += balance
      }
    })

    const cash = accounts
      .filter(a => a.type === 'ASSET' && a.name.toLowerCase().includes('efectivo'))
      .reduce((sum, a) => sum + a.balance, 0)

    const receivables = accounts
      .filter(a => a.type === 'ASSET' && (a.name.toLowerCase().includes('cobrar') || a.name.toLowerCase().includes('clientes')))
      .reduce((sum, a) => sum + a.balance, 0)

    const liquidityRatio = liabilities > 0 ? (assets / liabilities).toFixed(2) : 'N/A'

    return {
      content: `📊 **Balance General Actual:**

**Activos:** ${formatCurrency(assets)}
- Efectivo: ${formatCurrency(cash)}
- Cuentas por Cobrar: ${formatCurrency(receivables)}
- Otros Activos: ${formatCurrency(assets - cash - receivables)}

**Pasivos:** ${formatCurrency(liabilities)}

**Capital:** ${formatCurrency(equity)}

💡 Tu ratio de liquidez es ${liquidityRatio}. ${
        parseFloat(liquidityRatio) > 2 
          ? 'Excelente posición financiera.' 
          : parseFloat(liquidityRatio) > 1 
            ? 'Posición estable.' 
            : 'Considera mejorar tu liquidez.'
      }`,
      suggestions: [
        '¿Cómo puedo mejorar mi flujo de caja?',
        'Analiza mis cuentas por cobrar',
        'Muéstrame gastos del mes'
      ]
    }
  } catch (error) {
    console.error('Error getting balance:', error)
    return {
      content: '❌ Error obteniendo información del balance. Por favor intenta de nuevo.',
      suggestions: ['Ver resumen financiero', 'Analizar gastos']
    }
  }
}

async function getInvoicesResponse(companyId: string) {
  try {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [pending, overdue, paidThisMonth] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, status: { in: ['DRAFT', 'SENT', 'OVERDUE'] } },
        _sum: { total: true },
        _count: true
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: 'OVERDUE' },
        _sum: { total: true },
        _count: true
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: { in: ['PAID', 'PARTIAL'] }, paidDate: { gte: thisMonth } },
        _sum: { total: true },
        _count: true
      })
    ])

    const pendingTotal = Number(pending._sum.total || 0)
    const overdueTotal = Number(overdue._sum.total || 0)
    const paidThisMonthTotal = Number(paidThisMonth._sum.total || 0)

    return {
      content: `📄 **Resumen de Facturas:**

**Facturas Pendientes:** ${pending._count} facturas por ${formatCurrency(pendingTotal)}
- Vencidas: ${overdue._count} facturas (${formatCurrency(overdueTotal)})
- Por cobrar: ${pending._count - overdue._count} facturas

**Facturas Pagadas Este Mes:** ${paidThisMonth._count} facturas por ${formatCurrency(paidThisMonthTotal)}

${overdue._count > 0 
  ? `⚠️ **Alerta:** Tienes ${overdue._count} facturas vencidas. Te recomiendo enviar recordatorios de pago.`
  : '✅ **Excelente:** No tienes facturas vencidas.'
}

🎯 **Acción Recomendada:** 
${overdue._count > 0 
  ? '- Contactar clientes con facturas vencidas\n- Activar recordatorios automáticos'
  : '- Continúa con tu estrategia actual de facturación'
}`,
      suggestions: [
        'Crea una nueva factura',
        'Envía recordatorio a clientes',
        '¿Qué cliente me debe más?'
      ]
    }
  } catch (error) {
    console.error('Error getting invoices:', error)
    return {
      content: '❌ Error obteniendo información de facturas.',
      suggestions: ['Ver facturas pendientes', 'Crear factura']
    }
  }
}

async function getExpensesResponse(companyId: string) {
  try {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Run both fetches in parallel; only pull needed fields
    const [expenses, lastMonthTotal] = await Promise.all([
      prisma.expense.findMany({
        where: { companyId, date: { gte: thisMonth } },
        select: { amount: true, category: { select: { name: true } } }
      }),
      prisma.expense.aggregate({
        where: { companyId, date: { gte: lastMonth, lte: endLastMonth } },
        _sum: { amount: true }
      })
    ])

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const lastMonthTotalValue = Number(lastMonthTotal._sum.amount || 0)
    const changePercent = lastMonthTotalValue > 0
      ? (((total - lastMonthTotalValue) / lastMonthTotalValue) * 100).toFixed(1)
      : 'N/A'

    // Group by category
    const byCategory: Record<string, number> = {}
    expenses.forEach(e => {
      const cat = e.category?.name || 'Sin categoría'
      byCategory[cat] = (byCategory[cat] || 0) + e.amount
    })

    const sortedCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const categoriesList = sortedCategories
      .map(([name, amount], i) => {
        const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0
        return `${i + 1}. ${name}: ${formatCurrency(amount)} (${pct}%)`
      })
      .join('\n')

    const changeIcon = parseFloat(changePercent as string) > 0 ? '⬆️' : '⬇️'

    return {
      content: `💰 **Análisis de Gastos del Mes:**

**Total Gastos:** ${formatCurrency(total)}

**Top Categorías:**
${categoriesList || 'Sin gastos registrados'}

📈 **Comparación vs Mes Anterior:** ${changePercent}% ${changeIcon}

💡 **Insight:** ${
        parseFloat(changePercent as string) > 10 
          ? 'Los gastos aumentaron significativamente. Revisa las categorías principales.'
          : parseFloat(changePercent as string) < -10 
            ? 'Excelente control de gastos este mes.'
            : 'Los gastos están estables.'
      }`,
      suggestions: [
        'Registra un nuevo gasto',
        'Ver gastos deducibles',
        'Comparar con trimestre pasado'
      ]
    }
  } catch (error) {
    console.error('Error getting expenses:', error)
    return {
      content: '❌ Error obteniendo información de gastos.',
      suggestions: ['Ver gastos', 'Registrar gasto']
    }
  }
}

async function getCashFlowResponse(companyId: string) {
  try {
    const now = new Date()
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    // Get pending invoices (expected income)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['DRAFT', 'SENT', 'OVERDUE'] },
        dueDate: { lte: next30Days }
      }
    })

    // Get recurring expenses (expected expenses)
    const recentExpenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }
    })

    const expectedIncome = pendingInvoices.reduce((sum, i) => sum + i.total, 0)
    const expectedExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const projectedBalance = expectedIncome - expectedExpenses

    const overdueInvoices = pendingInvoices.filter(i => i.dueDate && new Date(i.dueDate) < now)
    const riskPercent = pendingInvoices.length > 0 
      ? ((overdueInvoices.length / pendingInvoices.length) * 100).toFixed(0)
      : 0

    return {
      content: `📊 **Proyección de Flujo de Caja:**

**Próximos 30 días:**
- Entradas esperadas: ${formatCurrency(expectedIncome)}
- Salidas proyectadas: ${formatCurrency(expectedExpenses)}
- Balance proyectado: ${formatCurrency(projectedBalance)} ${projectedBalance >= 0 ? '✅' : '⚠️'}

🤖 **Análisis:**
- Facturas pendientes de cobro: ${pendingInvoices.length}
- Facturas vencidas (riesgo): ${overdueInvoices.length}
- Probabilidad de déficit: ${riskPercent}%

💡 **Recomendación:** ${
        projectedBalance < 0 
          ? 'Acelera cobros o reduce gastos para evitar déficit.'
          : projectedBalance < expectedExpenses * 0.3
            ? 'Considera mantener un colchón de reserva mayor.'
            : 'Flujo de caja saludable. Mantén tu estrategia.'
      }`,
      suggestions: [
        '¿Cuándo recibiré mis próximos pagos?',
        'Ver tendencia histórica',
        'Analizar gastos fijos'
      ]
    }
  } catch (error) {
    console.error('Error getting cash flow:', error)
    return {
      content: '❌ Error obteniendo proyección de flujo de caja.',
      suggestions: ['Ver ingresos', 'Ver gastos']
    }
  }
}

async function getTaxResponse(companyId: string) {
  try {
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      include: { category: true }
    })

    const invoices = await prisma.invoice.findMany({
      where: { companyId, status: 'PAID' }
    })

    const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    
    // Estimate deductible expenses (assume 70% are deductible)
    const deductibleExpenses = expenses
      .filter(e => e.category?.name?.toLowerCase().includes('deducible') || !e.category)
    const deductibleTotal = deductibleExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Estimate tax (simplified - in production use actual tax rates)
    const taxableIncome = totalRevenue - deductibleTotal
    const estimatedISR = taxableIncome * 0.30 // Simplified 30% rate
    const estimatedIVA = totalRevenue * 0.16 // 16% IVA

    return {
      content: `🏛️ **Resumen Fiscal:**

**Ingresos YTD:** ${formatCurrency(totalRevenue)}
**Gastos YTD:** ${formatCurrency(totalExpenses)}

**Gastos Deducibles:** ${formatCurrency(deductibleTotal)}
**Base Gravable Estimada:** ${formatCurrency(taxableIncome)}

**Estimaciones de Impuestos:**
- ISR Estimado: ${formatCurrency(estimatedISR)}
- IVA Causado: ${formatCurrency(estimatedIVA)}

**Facturas Registradas:** ${invoices.length}
**Gastos Documentados:** ${expenses.length}

💡 **Tip:** ${
        deductibleTotal < totalExpenses * 0.5 
          ? 'Podrías tener más gastos deducibles. Revisa tu documentación.'
          : 'Buen nivel de deducciones registradas.'
      }`,
      suggestions: [
        'Ver calendario fiscal',
        'Gastos sin documentar',
        'Estima mi ISR anual'
      ]
    }
  } catch (error) {
    console.error('Error getting tax info:', error)
    return {
      content: '❌ Error obteniendo información fiscal.',
      suggestions: ['Ver gastos', 'Ver facturas']
    }
  }
}

async function getPayrollResponse(companyId: string) {
  try {
    // Get employees for this company
    const employees = await prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' }
    })

    // Get latest payroll run (global, not company-specific in current schema)
    const payrollRuns = await prisma.payrollRun.findMany({
      orderBy: { periodEnd: 'desc' },
      take: 1
    })

    const activeCount = employees.length
    const totalSalaries = employees.reduce((sum, e) => sum + (e.salary || 0), 0)
    
    const lastRun = payrollRuns[0]
    const nextPayDate = new Date()
    nextPayDate.setDate(nextPayDate.getDate() + 15) // Approximate next pay date

    return {
      content: `👥 **Resumen de Nómina:**

**Empleados Activos:** ${activeCount} personas

**Sueldos Mensuales:**
- Total Bruto: ${formatCurrency(totalSalaries)}
- Estimado Quincenal: ${formatCurrency(totalSalaries / 2)}

**Última Nómina:** ${lastRun ? new Date(lastRun.periodEnd).toLocaleDateString('es-MX') : 'Sin procesar'}
**Próximo Pago Estimado:** ${nextPayDate.toLocaleDateString('es-MX')}

📋 **Checklist:**
${lastRun ? '✅ Última nómina procesada' : '⏳ Nómina pendiente de procesar'}
${activeCount > 0 ? '✅ Empleados registrados' : '⏳ Sin empleados activos'}

💡 ${activeCount === 0 
  ? 'No tienes empleados registrados. Agrega empleados en Nómina > Empleados.'
  : 'Revisa tu próxima nómina antes de la fecha de pago.'
}`,
      suggestions: [
        'Ver lista de empleados',
        'Procesar nómina',
        'Ver deducciones'
      ]
    }
  } catch (error) {
    console.error('Error getting payroll:', error)
    return {
      content: '❌ Error obteniendo información de nómina.',
      suggestions: ['Ver empleados', 'Procesar nómina']
    }
  }
}

async function getCustomersResponse(companyId: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: { companyId },
      include: {
        invoices: true
      }
    })

    const now = new Date()
    
    // Calculate totals per customer
    const customerTotals = customers.map(c => {
      const paidTotal = c.invoices
        .filter(i => i.status === 'PAID' || i.status === 'PARTIAL')
        .reduce((sum, i) => sum + i.total, 0)
      const pendingTotal = c.invoices
        .filter(i => i.status === 'DRAFT' || i.status === 'SENT' || i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0)
      const overdueTotal = c.invoices
        .filter(i => i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0)
      
      return {
        name: c.name,
        paid: paidTotal,
        pending: pendingTotal,
        overdue: overdueTotal
      }
    }).sort((a, b) => b.paid - a.paid)

    const top5 = customerTotals.slice(0, 5)
    const withPending = customerTotals.filter(c => c.pending > 0)
    const withOverdue = customerTotals.filter(c => c.overdue > 0)

    const topList = top5.length > 0
      ? top5.map((c, i) => `${i + 1}. ${c.name} - ${formatCurrency(c.paid)} pagado`).join('\n')
      : 'Sin clientes con pagos'

    const pendingList = withPending.slice(0, 3)
      .map(c => `- ${c.name}: ${formatCurrency(c.pending)}${c.overdue > 0 ? ' (vencido)' : ''}`)
      .join('\n')

    return {
      content: `👥 **Análisis de Clientes:**

**Total Clientes:** ${customers.length}

**Top 5 Clientes por Ingresos:**
${topList}

**Clientes con Balance Pendiente:** ${withPending.length}
${pendingList || '- Ninguno con balance pendiente'}

📊 **Métricas:**
- Clientes con facturas vencidas: ${withOverdue.length}
- Total por cobrar: ${formatCurrency(withPending.reduce((sum, c) => sum + c.pending, 0))}

💡 ${withOverdue.length > 0 
  ? `Tienes ${withOverdue.length} clientes con pagos vencidos. Considera enviar recordatorios.`
  : 'Excelente - todos tus clientes están al día con sus pagos.'
}`,
      suggestions: [
        'Envía recordatorio a clientes morosos',
        'Crear reporte de aging',
        'Ver historial por cliente'
      ]
    }
  } catch (error) {
    console.error('Error getting customers:', error)
    return {
      content: '❌ Error obteniendo información de clientes.',
      suggestions: ['Ver clientes', 'Ver facturas']
    }
  }
}

async function getCategoriesResponse(companyId: string) {
  try {
    const transactions = await prisma.bankTransaction.findMany({
      where: { companyId }
    })

    const categorized = transactions.filter(t => t.categoryId)
    const uncategorized = transactions.filter(t => !t.categoryId)

    const total = transactions.length
    const categorizedCount = categorized.length
    const accuracy = total > 0 ? ((categorizedCount / total) * 100).toFixed(0) : 0

    return {
      content: `🤖 **Estado de Categorización:**

**Transacciones Totales:** ${total}
- Categorizadas: ${categorizedCount} (${accuracy}%)
- Pendientes de revisión: ${uncategorized.length}

🎯 **Precisión de Categorización:** ${accuracy}%

${uncategorized.length > 0 
  ? `⚠️ **Pendiente:** ${uncategorized.length} transacciones necesitan categorización.`
  : '✅ **Excelente:** Todas las transacciones están categorizadas.'
}

💡 **Sugerencia:** ${
        uncategorized.length > 10 
          ? 'Revisa las transacciones pendientes para mejorar el modelo de categorización.'
          : uncategorized.length > 0
            ? 'Tienes algunas transacciones pendientes de categorizar.'
            : 'Continúa registrando transacciones para mantener tu precisión.'
      }`,
      suggestions: [
        'Revisar transacciones pendientes',
        'Ver reglas de categorización',
        'Ver categorías de gastos'
      ]
    }
  } catch (error) {
    console.error('Error getting categories:', error)
    return {
      content: '❌ Error obteniendo información de categorización.',
      suggestions: ['Ver transacciones', 'Ver gastos']
    }
  }
}

function getReportsResponse() {
  return {
    content: `📊 **Reportes Disponibles:**

**Financieros:**
✅ Balance General
✅ Estado de Resultados
✅ Flujo de Efectivo
✅ Trial Balance

**Operacionales:**
✅ Ventas por Cliente
✅ Gastos por Categoría
✅ Aging de Cuentas por Cobrar
✅ Resumen de Nómina

**Fiscales:**
✅ Libro Mayor
✅ Libro Diario
✅ Cálculo de ISR/IVA

📥 **Formatos disponibles:** PDF, Excel, CSV

💡 **Tip:** Ve a Reportes para generar y descargar cualquier reporte.`,
    suggestions: [
      'Ver Balance General',
      'Ver Estado de Resultados',
      'Ver reportes de gastos'
    ]
  }
}

async function getBudgetResponse(companyId: string) {
  try {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get current month data
    const currentInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: 'PAID',
        paidDate: { gte: thisMonth }
      }
    })

    const currentExpenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: thisMonth }
      }
    })

    // Get last month data for comparison
    const lastMonthInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: 'PAID',
        paidDate: { gte: lastMonth, lte: endLastMonth }
      }
    })

    const lastMonthExpenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: lastMonth, lte: endLastMonth }
      }
    })

    const currentRevenue = currentInvoices.reduce((sum, i) => sum + i.total, 0)
    const currentExpenseTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const currentMargin = currentRevenue - currentExpenseTotal

    const lastRevenue = lastMonthInvoices.reduce((sum, i) => sum + i.total, 0)
    const lastExpenseTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

    const revenueChange = lastRevenue > 0 
      ? (((currentRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1) 
      : 'N/A'
    const expenseChange = lastExpenseTotal > 0 
      ? (((currentExpenseTotal - lastExpenseTotal) / lastExpenseTotal) * 100).toFixed(1) 
      : 'N/A'

    const marginPct = currentRevenue > 0 ? ((currentMargin / currentRevenue) * 100).toFixed(1) : 0

    return {
      content: `🎯 **Análisis de Desempeño:**

**Este Mes:**

**Ingresos:**
- Real: ${formatCurrency(currentRevenue)}
- vs Mes Anterior: ${revenueChange}% ${parseFloat(revenueChange as string) >= 0 ? '✅' : '⚠️'}

**Gastos:**
- Real: ${formatCurrency(currentExpenseTotal)}
- vs Mes Anterior: ${expenseChange}%

**Margen Neto:**
- Real: ${formatCurrency(currentMargin)} (${marginPct}%)

📈 **Performance:**
${parseFloat(revenueChange as string) > 0 
  ? '- Ingresos en crecimiento ✅' 
  : parseFloat(revenueChange as string) < 0 
    ? '- Ingresos en descenso ⚠️' 
    : '- Ingresos estables'
}
${parseFloat(expenseChange as string) > 10 
  ? '- Gastos aumentando ⚠️' 
  : parseFloat(expenseChange as string) < 0 
    ? '- Gastos controlados ✅' 
    : '- Gastos estables'
}

💡 **Insight:** ${
        currentMargin > 0 
          ? 'Mes rentable. Mantén tu estrategia.' 
          : 'Revisa tus gastos para mejorar el margen.'
      }`,
      suggestions: [
        'Crear presupuesto anual',
        'Ver variaciones por categoría',
        'Proyectar próximo trimestre'
      ]
    }
  } catch (error) {
    console.error('Error getting budget:', error)
    return {
      content: '❌ Error obteniendo análisis de presupuesto.',
      suggestions: ['Ver ingresos', 'Ver gastos']
    }
  }
}

function getHelpResponse() {
  return {
    content: `💡 **Puedo ayudarte con:**

**Análisis Financiero:**
• Balance general y posición financiera
• Estado de resultados y rentabilidad
• Flujo de caja y predicciones
• Presupuestos vs real

**Operaciones:**
• Facturas pendientes y cobros
• Gastos y optimización
• Categorización de transacciones
• Nómina y empleados

**Impuestos y Compliance:**
• Obligaciones fiscales
• Gastos deducibles
• Reportes fiscales

**Reportes:**
• Reportes financieros
• Reportes operacionales
• Exportación a PDF/Excel

🤔 **¿En qué puedo ayudarte?**`,
    suggestions: [
      '¿Cuál es mi balance actual?',
      'Analiza mis facturas pendientes',
      'Proyecta mi flujo de caja',
      'Resumen de gastos del mes'
    ]
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}

// Integración real con OpenAI (para cuando tengas API key):
/*
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function getAIResponse(message: string, companyId: string, history: any[], companyData: any) {
  const systemPrompt = `Eres un asistente contable experto especializado en ayudar a pequeñas y medianas empresas.
Tu nombre es "Asistente IA de QuickBooks".

Datos actuales de la empresa:
${JSON.stringify(companyData, null, 2)}

Responde de forma clara, concisa y profesional. Usa emojis ocasionalmente.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ],
    max_tokens: 500,
    temperature: 0.7
  })

  return completion.choices[0].message.content
}
*/

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'

// Inicializar cliente Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
let groq: Groq | null = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  console.log('[AI Chat] Groq inicializado correctamente');
}

/**
 * POST /api/ai/chat
 * Chat con el asistente IA usando Groq + datos reales
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

    console.log('[AI Chat] Mensaje recibido:', message, '| Groq disponible:', !!groq);

    // Detectar si quiere crear catálogo de cuentas
    const wantsChartOfAccounts = 
      (message.toLowerCase().includes('crear') || message.toLowerCase().includes('generar') || 
       message.toLowerCase().includes('crea') || message.toLowerCase().includes('créa') ||
       message.toLowerCase().includes('creame') || message.toLowerCase().includes('créame')) &&
      (message.toLowerCase().includes('catálogo') || message.toLowerCase().includes('catalogo') || 
       message.toLowerCase().includes('cuentas') || message.toLowerCase().includes('plan de cuentas'));

    if (wantsChartOfAccounts && groq) {
      console.log('[AI Chat] Detectada solicitud de catálogo de cuentas');
      const result = await generateChartOfAccountsForDealer(companyId || session.user.id);
      return NextResponse.json({
        success: true,
        response: result.message,
        suggestions: ['Ver catálogo de cuentas', 'Crear factura', 'Registrar gasto'],
        timestamp: new Date().toISOString()
      });
    }

    // Si hay Groq disponible, usar IA real
    if (groq) {
      const aiResponse = await chatWithGroqAI(message, session.user.id, companyId);
      return NextResponse.json({
        success: true,
        response: aiResponse,
        suggestions: ['¿Cuál es mi balance?', 'Facturas pendientes', 'Gastos del mes'],
        timestamp: new Date().toISOString()
      });
    }

    // Fallback: respuestas pre-programadas
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

    const metrics = calculateRealMetrics(invoices, expenses, customers, bankAccounts, employees, products)
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
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    )
  }
}

// Chat con Groq AI
async function chatWithGroqAI(message: string, userId: string, companyId?: string): Promise<string> {
  if (!groq) throw new Error('Groq no configurado');

  // Obtener datos de contexto
  let context = '';
  try {
    const [customerCount, invoiceCount, expenseCount, productCount] = await Promise.all([
      prisma.customer.count({ where: companyId ? { companyId } : {} }),
      prisma.invoice.count({ where: { userId, ...(companyId ? { companyId } : {}) } }),
      prisma.expense.count({ where: { userId, ...(companyId ? { companyId } : {}) } }),
      prisma.product.count({ where: companyId ? { companyId } : {} })
    ]);
    
    context = `
Datos actuales del negocio:
- Clientes: ${customerCount}
- Facturas: ${invoiceCount}
- Gastos: ${expenseCount}
- Productos: ${productCount}
`;
  } catch (e) {
    // Ignorar si no hay datos
  }

  const systemPrompt = `Eres un asistente contable profesional para un sistema tipo QuickBooks.
Responde en español de manera concisa y profesional.
Usa emojis cuando sea apropiado para hacer la respuesta más visual.
${context}

Puedes ayudar con:
- Análisis financiero
- Consultas sobre facturas, gastos, clientes
- Consejos de contabilidad
- Creación de catálogos de cuentas
- Recomendaciones fiscales`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 1500
  });

  return completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
}

// Generar catálogo de cuentas para dealer de carros
async function generateChartOfAccountsForDealer(companyId: string): Promise<{ message: string; created: number }> {
  const accounts = [
    // ACTIVOS
    { code: '1000', name: 'ACTIVOS', type: 'ASSET', category: 'CURRENT_ASSET', level: 1 },
    { code: '1100', name: 'Activos Corrientes', type: 'ASSET', category: 'CURRENT_ASSET', level: 2 },
    { code: '1110', name: 'Caja General', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1111', name: 'Caja Chica', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1120', name: 'Bancos', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1200', name: 'Cuentas por Cobrar', type: 'ASSET', category: 'CURRENT_ASSET', level: 2 },
    { code: '1210', name: 'Cuentas por Cobrar Clientes', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1220', name: 'Documentos por Cobrar', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1300', name: 'Inventarios', type: 'ASSET', category: 'CURRENT_ASSET', level: 2 },
    { code: '1310', name: 'Inventario de Vehículos Nuevos', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1320', name: 'Inventario de Vehículos Usados', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1330', name: 'Inventario de Repuestos y Accesorios', type: 'ASSET', category: 'CURRENT_ASSET', level: 3 },
    { code: '1500', name: 'Activos Fijos', type: 'ASSET', category: 'FIXED_ASSET', level: 2 },
    { code: '1510', name: 'Terrenos', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    { code: '1520', name: 'Edificios', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    { code: '1530', name: 'Mobiliario y Equipo', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    { code: '1540', name: 'Vehículos de la Empresa', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    { code: '1550', name: 'Equipo de Cómputo', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    { code: '1560', name: 'Herramientas de Taller', type: 'ASSET', category: 'FIXED_ASSET', level: 3 },
    // PASIVOS
    { code: '2000', name: 'PASIVOS', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 1 },
    { code: '2100', name: 'Pasivos Corrientes', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 2 },
    { code: '2110', name: 'Cuentas por Pagar Proveedores', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3 },
    { code: '2120', name: 'Floor Plan - Financiamiento Vehículos', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3 },
    { code: '2130', name: 'Impuestos por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3 },
    { code: '2140', name: 'Salarios por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3 },
    { code: '2150', name: 'Comisiones por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3 },
    { code: '2200', name: 'Pasivos a Largo Plazo', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY', level: 2 },
    { code: '2210', name: 'Préstamos Bancarios', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY', level: 3 },
    { code: '2220', name: 'Hipotecas por Pagar', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY', level: 3 },
    // PATRIMONIO
    { code: '3000', name: 'PATRIMONIO', type: 'EQUITY', category: 'EQUITY', level: 1 },
    { code: '3100', name: 'Capital Social', type: 'EQUITY', category: 'EQUITY', level: 2 },
    { code: '3200', name: 'Reserva Legal', type: 'EQUITY', category: 'EQUITY', level: 2 },
    { code: '3300', name: 'Utilidades Retenidas', type: 'EQUITY', category: 'EQUITY', level: 2 },
    { code: '3400', name: 'Utilidad del Ejercicio', type: 'EQUITY', category: 'EQUITY', level: 2 },
    // INGRESOS
    { code: '4000', name: 'INGRESOS', type: 'INCOME', category: 'OPERATING_INCOME', level: 1 },
    { code: '4100', name: 'Ingresos por Ventas', type: 'INCOME', category: 'OPERATING_INCOME', level: 2 },
    { code: '4110', name: 'Venta de Vehículos Nuevos', type: 'INCOME', category: 'OPERATING_INCOME', level: 3 },
    { code: '4120', name: 'Venta de Vehículos Usados', type: 'INCOME', category: 'OPERATING_INCOME', level: 3 },
    { code: '4130', name: 'Venta de Repuestos y Accesorios', type: 'INCOME', category: 'OPERATING_INCOME', level: 3 },
    { code: '4200', name: 'Ingresos por Servicios', type: 'INCOME', category: 'OPERATING_INCOME', level: 2 },
    { code: '4210', name: 'Servicios de Taller y Reparación', type: 'INCOME', category: 'OPERATING_INCOME', level: 3 },
    { code: '4220', name: 'Servicios de Garantía', type: 'INCOME', category: 'OPERATING_INCOME', level: 3 },
    { code: '4300', name: 'Otros Ingresos', type: 'INCOME', category: 'OTHER_INCOME', level: 2 },
    { code: '4310', name: 'Comisiones por Financiamiento', type: 'INCOME', category: 'OTHER_INCOME', level: 3 },
    { code: '4320', name: 'Comisiones por Seguros', type: 'INCOME', category: 'OTHER_INCOME', level: 3 },
    { code: '4330', name: 'Comisiones por Garantías Extendidas', type: 'INCOME', category: 'OTHER_INCOME', level: 3 },
    // COSTOS
    { code: '5000', name: 'COSTOS', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 1 },
    { code: '5100', name: 'Costo de Ventas', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 2 },
    { code: '5110', name: 'Costo de Vehículos Nuevos Vendidos', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 3 },
    { code: '5120', name: 'Costo de Vehículos Usados Vendidos', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 3 },
    { code: '5130', name: 'Costo de Repuestos Vendidos', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 3 },
    { code: '5140', name: 'Costo de Reconocimiento Vehículos Usados', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 3 },
    // GASTOS OPERATIVOS
    { code: '6000', name: 'GASTOS OPERATIVOS', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 1 },
    { code: '6100', name: 'Gastos de Personal', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6110', name: 'Salarios y Sueldos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6120', name: 'Comisiones de Vendedores', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6130', name: 'Bonificaciones', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6140', name: 'Prestaciones Sociales', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6200', name: 'Gastos de Instalaciones', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6210', name: 'Alquiler de Local', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6220', name: 'Servicios Públicos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6230', name: 'Mantenimiento de Instalaciones', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6300', name: 'Gastos de Vehículos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6310', name: 'Combustible', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6320', name: 'Mantenimiento de Flota', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6330', name: 'Seguros de Vehículos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6400', name: 'Gastos de Publicidad y Marketing', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6410', name: 'Publicidad Digital', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6420', name: 'Publicidad Tradicional', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6430', name: 'Eventos y Promociones', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6500', name: 'Gastos Financieros', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6510', name: 'Intereses Floor Plan', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6520', name: 'Intereses Bancarios', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6530', name: 'Comisiones Bancarias', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6600', name: 'Depreciación y Amortización', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2 },
    { code: '6610', name: 'Depreciación de Edificios', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6620', name: 'Depreciación de Mobiliario', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
    { code: '6630', name: 'Depreciación de Vehículos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3 },
  ];

  let created = 0;
  for (const account of accounts) {
    try {
      await prisma.chartOfAccounts.create({
        data: {
          code: account.code,
          name: account.name,
          type: account.type as any,
          category: account.category as any,
          level: account.level,
          companyId: companyId,
          isActive: true,
          balance: 0
        }
      });
      created++;
    } catch (e: any) {
      // Ignorar duplicados
      console.log(`Cuenta ${account.code} ya existe o error`);
    }
  }

  return {
    created,
    message: `✅ **¡Catálogo de Cuentas Creado Exitosamente!**

📊 Se han creado **${created}** cuentas contables de **${accounts.length}** para tu Dealer de Carros.

**Estructura del Catálogo:**

🏦 **ACTIVOS (1000-1999)**
- Caja y Bancos
- Cuentas por Cobrar
- Inventario de Vehículos (Nuevos y Usados)
- Repuestos y Accesorios
- Activos Fijos (Terrenos, Edificios, Equipos)

💳 **PASIVOS (2000-2999)**
- Cuentas por Pagar
- Floor Plan (Financiamiento de Inventario)
- Impuestos y Salarios por Pagar
- Préstamos Bancarios

💰 **PATRIMONIO (3000-3999)**
- Capital Social
- Utilidades Retenidas

📈 **INGRESOS (4000-4999)**
- Venta de Vehículos Nuevos y Usados
- Venta de Repuestos
- Servicios de Taller
- Comisiones (Financiamiento, Seguros, Garantías)

📉 **COSTOS Y GASTOS (5000-6999)**
- Costo de Vehículos Vendidos
- Gastos de Personal y Comisiones
- Gastos de Instalaciones
- Publicidad y Marketing
- Gastos Financieros

💡 **Próximos pasos sugeridos:**
1. Revisa el catálogo en Configuración → Plan de Cuentas
2. Ajusta las cuentas según tus necesidades específicas
3. Comienza a registrar tus transacciones

¿Necesitas algo más?`
  };
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

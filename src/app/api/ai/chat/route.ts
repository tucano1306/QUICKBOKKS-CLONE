import { AI_TOOLS, executeToolCall } from '@/lib/ai-tools'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Inicializar cliente OpenAI de forma lazy (dentro del request para leer env vars correctamente)
function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

// System prompt con conocimiento de la aplicación
const SYSTEM_PROMPT = `Eres "FinanceBot", el asistente contable inteligente de ComputoPlus — una aplicación de contabilidad y finanzas empresariales similar a QuickBooks.

═══════════════════════════════════════════════════════════════
🧠 TUS HERRAMIENTAS DISPONIBLES:
═══════════════════════════════════════════════════════════════

Tienes acceso a las siguientes HERRAMIENTAS para ejecutar acciones y consultar datos reales:

📦 CREACIÓN:
- crear_gasto: Registrar un gasto/pago/desembolso con asiento contable automático
- crear_ingreso: Registrar un ingreso/cobro/venta
- crear_cliente: Crear nuevo cliente
- crear_factura: Crear nueva factura para un cliente

📊 CONSULTAS FINANCIERAS:
- consultar_gastos: Gastos registrados (por período, categoría, mes, año)
- consultar_ingresos: Ingresos y ventas registrados
- consultar_facturas: Facturas (pendientes, vencidas, pagadas)
- consultar_clientes: Clientes (todos, con deuda, mejores, inactivos)
- resumen_financiero: Resumen P&L — ingresos, gastos, utilidad, cuentas por cobrar

👥 NÓMINA Y EMPLEADOS:
- consultar_empleados: Ver lista de empleados, sus puestos, salarios y departamentos
- consultar_nomina: Ver registros de nómina, salarios pagados y deducciones

🏢 PROVEEDORES Y CUENTAS POR PAGAR:
- consultar_proveedores: Ver proveedores, saldos adeudados y cuentas por pagar

📦 INVENTARIO Y PRODUCTOS:
- consultar_inventario: Ver productos, stock disponible, niveles de reorden

🏦 BANCA:
- consultar_cuentas_bancarias: Ver cuentas bancarias, saldos y movimientos recientes

📁 PROYECTOS:
- consultar_proyectos: Ver proyectos activos, progreso y rentabilidad

📋 IMPUESTOS:
- llenar_formularios_fiscales: Calcular y pre-llenar Form 1040 con los datos de la empresa

REGLAS DE USO DE HERRAMIENTAS:
1. Si el usuario quiere REGISTRAR algo → USA LA HERRAMIENTA correspondiente
2. Si el usuario pregunta sobre gastos/ingresos → USA consultar_gastos / consultar_ingresos
3. Si pregunta por facturas → USA consultar_facturas
4. Si pregunta sobre empleados o nómina → USA consultar_empleados / consultar_nomina
5. Si pregunta por proveedores o cuentas por pagar → USA consultar_proveedores
6. Si pregunta por inventario o stock → USA consultar_inventario
7. Si pregunta por cuentas bancarias o saldos → USA consultar_cuentas_bancarias
8. Si pregunta por proyectos → USA consultar_proyectos
9. Si pide resumen general del negocio → USA resumen_financiero
10. Si pide llenar/preparar/calcular impuestos o Form 1040 → USA llenar_formularios_fiscales
11. Si solo pregunta conceptos o cómo hacer algo → RESPONDE directamente sin herramientas

═══════════════════════════════════════════════════════════════
📱 TODOS LOS MÓDULOS DE LA APLICACIÓN:
═══════════════════════════════════════════════════════════════

🏠 PRINCIPAL:
- Dashboard: /company/dashboard — KPIs, resumen financiero, alertas

💸 GASTOS:
- Lista de gastos: /company/expenses/list
- Nuevo gasto: /company/expenses/new
- Categorías: /company/expenses/categories
- Recibos: /company/expenses/receipts
- Gastos deducibles: /company/expenses/tax-deductible
- Tarjetas corporativas: /company/expenses/corporate-cards

📄 FACTURACIÓN:
- Facturas: /company/invoicing/invoices
- Estimados/Cotizaciones: /company/invoicing/estimates
- Facturación recurrente: /company/invoicing/recurring
- Links de pago: /company/invoicing/payment-links
- Recordatorios: /company/invoicing/reminders
- Pagos recibidos: /company/invoicing/payments

👥 CLIENTES:
- Lista: /company/customers/list
- Nuevo cliente: /company/customers/new
- Transacciones por cliente: /company/customers/transactions
- Portal del cliente: /company/customers/portal
- Notas CRM: /company/customers/notes

🏢 PROVEEDORES:
- Lista: /company/vendors/list
- Cuentas por pagar: /company/vendors/payables
- Historial: /company/vendors/history
- Órdenes de compra: /company/vendors/purchase-orders

💼 NÓMINA Y EMPLEADOS:
- Empleados: /company/payroll/employees
- Calcular nómina: /company/payroll/calculate
- Cheques: /company/payroll/checks
- Hojas de tiempo: /company/payroll/timesheet
- Impuestos nómina: /company/payroll/taxes
- Formularios fiscales (W-2): /company/payroll/tax-forms
- Reportes nómina: /company/payroll/reports

🏦 BANCA:
- Cuentas: /company/banking/accounts
- Transacciones: /company/banking/transactions
- Reconciliación: /company/banking/reconciliation
- Reglas automáticas: /company/banking/rules
- Transferencias: /company/banking/transfers
- Importación masiva: /company/banking/batch

📊 CONTABILIDAD:
- Transacciones contables: /company/accounting/transactions
- Plan de cuentas: /company/accounting/chart-of-accounts
- Asientos (Journal Entries): /company/accounting/journal-entries
- Reconciliación: /company/accounting/reconciliation
- Categorización IA: /company/accounting/ai-categorization
- Depreciación: /company/accounting/depreciation

📈 REPORTES:
- P&L (Pérdidas y Ganancias): /company/reports/profit-loss
- Balance General: /company/reports/balance-sheet
- Flujo de Caja: /company/reports/cash-flow
- Comparativo anual: /company/reports/comparative
- Reporte personalizado: /company/reports/custom
- Reportes fiscales: /company/reports/tax-reports

📦 INVENTARIO:
- Productos: /company/inventory/products

📁 PROYECTOS:
- Lista proyectos: /company/projects/list
- Tiempo facturable: /company/projects/billable-time
- Costeo: /company/projects/costing
- Rentabilidad: /company/projects/profitability

💰 PRESUPUESTOS:
- Crear presupuesto: /company/budgets/create
- Presupuesto vs Real: /company/budgets/vs-actual
- Alertas: /company/budgets/alerts

🧾 IMPUESTOS:
- Form 1040: /company/taxes/form-1040
- Pagos estimados trimestrales: /company/taxes/estimates
- Deducciones: /company/taxes/deductions
- Formularios IRS: /company/taxes/irs-forms
- Exportar a TurboTax: /company/taxes/turbotax

📄 DOCUMENTOS:
- Inbox: /company/documents/inbox
- Subir: /company/documents/upload
- Procesamiento IA: /company/documents/ai

⚙️ CONFIGURACIÓN:
- Empresa: /company/settings/company
- Usuarios y permisos: /company/settings/users
- Seguridad: /company/settings/security
- Integraciones: /company/settings/integrations
- Monedas: /company/settings/currencies

═══════════════════════════════════════════════════════════════
🎯 CATEGORÍAS DE GASTOS DISPONIBLES:
═══════════════════════════════════════════════════════════════

Combustible, Seguro, Mantenimiento, Salarios, Alquiler, Servicios, Permisos, Peajes, Repuestos, Vehiculo, Oficina, Marketing, Viajes, Otros

═══════════════════════════════════════════════════════════════
💡 CÓMO RESPONDER:
═══════════════════════════════════════════════════════════════

1. SIEMPRE usa emojis para hacer visual: 📊 💰 📄 ✅ ⚠️ 💡 👥 🏦 📈
2. Responde SIEMPRE en español
3. Sé amigable y profesional
4. Usa las herramientas SIEMPRE que el usuario quiera hacer algo o pida datos
5. Si la herramienta devuelve un resultado, CONFIRMA la acción y explica el resultado
6. Si la acción requiere ir a un módulo, indica la ruta correspondiente

═══════════════════════════════════════════════════════════════
📋 EJEMPLOS DE USO:
═══════════════════════════════════════════════════════════════

"Pagué $500 del seguro" → crear_gasto(amount=500, category="Seguro")
"Cobré $2000 por transporte" → crear_ingreso(amount=2000)
"¿Cuánto gasté este mes?" → consultar_gastos(periodo="mes")
"¿Cuántos empleados tengo?" → consultar_empleados()
"¿Cuánto le debo a mis proveedores?" → consultar_proveedores()
"¿Cuánto hay en el banco?" → consultar_cuentas_bancarias()
"¿Cómo va mi inventario?" → consultar_inventario()
"¿Cómo van mis proyectos?" → consultar_proyectos()
"Llena mi Form 1040" → llenar_formularios_fiscales()
"¿Cómo registro una factura?" → RESPONDER directamente
`;

/**
 * POST /api/ai/chat - Asistente IA con Function Calling
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, companyId } = body
    const fileAttachment: { name: string; content: string; mimeType: string } | undefined = body.fileAttachment
    const userId = session.user.id
    const activeCompanyId = companyId || userId

    if (!message && !fileAttachment) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Validate attachment size and type
    if (fileAttachment) {
      const isImage = fileAttachment.mimeType.startsWith('image/')
      const maxLen = isImage ? 7 * 1024 * 1024 : 524288
      if (fileAttachment.content.length > maxLen) {
        return NextResponse.json({ error: 'Archivo demasiado grande' }, { status: 400 })
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/csv', 'application/json', 'text/markdown']
      if (!allowed.includes(fileAttachment.mimeType)) {
        return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[AI] 📩 Mensaje recibido:', message);
    console.log('[AI] 👤 Usuario:', userId, '| Compañía:', activeCompanyId);
    console.log('═══════════════════════════════════════════════════════════════');

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({
        success: true,
        response: '⚠️ IA no configurada. Configura OPENAI_API_KEY en .env.local',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener contexto del negocio
    const context = await getBusinessContext(activeCompanyId);

    // Llamar a GPT-4o con Function Calling
    const response = await callGroqWithTools(openai, message || '', context, userId, activeCompanyId, fileAttachment);

    return NextResponse.json({
      success: true,
      response: response.text,
      action: response.toolUsed,
      suggestions: getSuggestions(response.toolUsed),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI] Error completo:', error?.status, error?.message, error?.code);
    return NextResponse.json({
      success: false,
      response: `⚠️ Error: ${error?.message || 'Error desconocido'} (código: ${error?.status || error?.code || 'N/A'})`,
      error: error.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Llamar a Groq con Function Calling (Tool Use)
 */
async function callGroqWithTools(
  client: OpenAI,
  message: string,
  context: string,
  userId: string,
  companyId: string,
  fileAttachment?: { name: string; content: string; mimeType: string }
): Promise<{ text: string; toolUsed?: string }> {

  const systemWithContext = `${SYSTEM_PROMPT}

═══════════════════════════════════════════════════════════════
📋 DATOS ACTUALES DEL NEGOCIO:
═══════════════════════════════════════════════════════════════
${context}`;

  console.log('[AI] 🚀 Llamando a OpenAI GPT-4o con Function Calling...');

  // Construir contenido del usuario (texto + archivo opcional)
  let userContent: any // necesario para soportar text y image_url parts de OpenAI
  if (fileAttachment) {
    if (fileAttachment.mimeType.startsWith('image/')) {
      userContent = [
        { type: 'text', text: message || 'Analiza este archivo adjunto y dame informacion relevante para la contabilidad.' },
        { type: 'image_url', image_url: { url: fileAttachment.content, detail: 'auto' } }
      ]
    } else {
      const maxChars = 8000
      const snippet = fileAttachment.content.length > maxChars
        ? fileAttachment.content.substring(0, maxChars) + '\n... [truncado]'
        : fileAttachment.content
      userContent = `${message || 'Analiza el siguiente archivo:'}\n\n---\n📎 Archivo adjunto: ${fileAttachment.name}\n\`\`\`\n${snippet}\n\`\`\`\nResponde en espanol y extrae informacion relevante para la contabilidad.`
    }
  } else {
    userContent = message
  }

  // Primera llamada - el modelo decide si usar herramientas
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemWithContext },
      { role: 'user', content: userContent }
    ],
    tools: AI_TOOLS,
    tool_choice: 'auto', // El modelo decide cuándo usar herramientas
    temperature: 0.3,
    max_tokens: 2000
  });

  const responseMessage = completion.choices[0]?.message;

  // Verificar si el modelo quiere usar herramientas
  if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
    console.log('[AI] 🔧 Modelo decidió usar herramientas:', responseMessage.tool_calls.map(t => t.function.name));

    // Ejecutar cada herramienta que el modelo pidió
    const toolResults: Array<{ toolCallId: string; result: string }> = [];
    let mainToolUsed = '';

    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      console.log(`[AI] ⚡ Ejecutando: ${functionName}`, args);
      mainToolUsed = functionName;

      const result = await executeToolCall(functionName, args, userId, companyId);

      console.log(`[AI] ✅ Resultado:`, result.success ? 'Exitoso' : 'Error');

      toolResults.push({
        toolCallId: toolCall.id,
        result: result.result
      });
    }

    // Segunda llamada - darle los resultados al modelo para generar respuesta final
    const messages: any[] = [
      { role: 'system', content: systemWithContext },
      { role: 'user', content: userContent },
      {
        role: 'assistant',
        content: null,
        tool_calls: responseMessage.tool_calls
      }
    ];

    // Agregar resultados de cada herramienta
    for (const result of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: result.result
      });
    }

    const finalCompletion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.5,
      max_tokens: 1000
    });

    const finalText = finalCompletion.choices[0]?.message?.content || toolResults[0]?.result;

    return { text: finalText, toolUsed: mainToolUsed };
  }

  // Si no usó herramientas, devolver respuesta directa
  console.log('[AI] 💬 Respuesta directa sin herramientas');
  return { text: responseMessage?.content || 'Lo siento, no pude procesar tu solicitud.' };
}

/**
 * Obtener contexto del negocio para el AI
 */
async function getBusinessContext(companyId: string): Promise<string> {
  try {
    const [company, customers, invoices, expenses, products, employees, transactions] = await Promise.all([
      prisma.company.findFirst({ where: { id: companyId } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.invoice.findMany({ where: { companyId }, take: 30 }),
      prisma.expense.aggregate({ where: { companyId }, _sum: { amount: true }, _count: true }),
      prisma.product.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId } }),
      prisma.transaction.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 20 })
    ]);

    const invoiceRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total || 0), 0);
    const transactionIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0);
    const totalRevenue = invoiceRevenue + transactionIncome;

    const expenseTotal = expenses._sum.amount || 0;
    const transactionExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = expenseTotal + transactionExpense;

    const pending = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');

    return `
Empresa: ${company?.name || 'Mi Empresa'}
📊 Ingresos: $${totalRevenue.toLocaleString()} | Gastos: $${totalExpenses.toLocaleString()} | Utilidad: $${(totalRevenue - totalExpenses).toLocaleString()}
📄 Facturas pendientes: ${pending.length} por $${pending.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}
👥 Clientes: ${customers} | 📦 Productos: ${products} | 👔 Empleados: ${employees}
💸 Gastos registrados: ${expenses._count} | 💵 Transacciones: ${transactions.length}`;
  } catch (e) {
    console.error('[AI] Error en getBusinessContext:', e);
    return 'Sin datos disponibles.';
  }
}

/**
 * Sugerencias contextuales basadas en la acción realizada
 */
function getSuggestions(toolUsed?: string): string[] {
  const baseSuggestions = [
    '¿Cómo va mi negocio?',
    'Registrar un gasto',
    'Registrar un ingreso',
    '¿Cuánto gasté este mes?'
  ];

  switch (toolUsed) {
    case 'crear_gasto':
      return [
        '¿Cuánto gasté este mes?',
        'Registrar otro gasto',
        'Ver gastos por categoría',
        '¿Cómo va mi negocio?'
      ];

    case 'crear_ingreso':
      return [
        '¿Cuánto gané este mes?',
        'Registrar otro ingreso',
        'Crear factura',
        'Ver clientes con deuda'
      ];

    case 'consultar_gastos':
    case 'consultar_ingresos':
      return [
        'Ver resumen financiero',
        'Gastos del año',
        'Ingresos por cliente',
        'Comparar con mes anterior'
      ];

    case 'resumen_financiero':
      return [
        'Ver facturas pendientes',
        'Gastos por categoría',
        'Mejores clientes',
        'Exportar reporte'
      ];

    default:
      return baseSuggestions;
  }
}

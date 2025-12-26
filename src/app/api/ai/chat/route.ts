import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { AI_TOOLS, executeToolCall } from '@/lib/ai-tools'

export const dynamic = 'force-dynamic'

// Inicializar cliente Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
let groq: Groq | null = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
}

// System prompt con conocimiento de la aplicación
const SYSTEM_PROMPT = `Eres "FinanceBot", el asistente contable inteligente de una aplicación tipo QuickBooks.

═══════════════════════════════════════════════════════════════
🧠 TU INTELIGENCIA:
═══════════════════════════════════════════════════════════════

Tienes acceso a HERRAMIENTAS (tools) que puedes usar para ejecutar acciones:
- crear_gasto: Registrar un gasto/pago/desembolso
- crear_ingreso: Registrar un ingreso/cobro/venta
- consultar_gastos: Ver gastos registrados
- consultar_ingresos: Ver ingresos
- consultar_facturas: Ver facturas
- consultar_clientes: Ver clientes
- resumen_financiero: Resumen general del negocio
- crear_cliente: Crear nuevo cliente
- crear_factura: Crear nueva factura

REGLAS DE USO DE HERRAMIENTAS:
1. Si el usuario quiere REGISTRAR algo (gasto, ingreso, etc.) → USA LA HERRAMIENTA
2. Si el usuario pregunta CUÁNTO gastó/ganó → USA consultar_gastos o consultar_ingresos
3. Si pregunta por facturas o clientes → USA las herramientas correspondientes
4. Si pregunta cómo va el negocio → USA resumen_financiero
5. Si solo pregunta cómo hacer algo o conceptos contables → RESPONDE directamente sin herramientas

═══════════════════════════════════════════════════════════════
📱 MÓDULOS DE LA APLICACIÓN:
═══════════════════════════════════════════════════════════════

- Dashboard: /company/dashboard - Resumen general
- Gastos: /company/expenses - Registro de gastos CON CATEGORÍAS
- Transacciones: /company/transactions - Ingresos y gastos registrados por AI
- Facturación: /company/invoicing - Crear y gestionar facturas
- Clientes: /company/customers - Base de clientes
- Productos: /company/products - Catálogo
- Contabilidad: /company/accounting - Plan de cuentas, Journal Entries
- Reportes: /company/reports - P&L, Balance, etc.

═══════════════════════════════════════════════════════════════
🎯 IMPORTANTE SOBRE GASTOS:
═══════════════════════════════════════════════════════════════

- Cuando el usuario dice "gasto", "pagué", "gasté", "pago de" → SIEMPRE usar crear_gasto
- Los gastos se guardan en el módulo de GASTOS con:
  - Categorías (Seguro, Combustible, Salarios, Vehículo, etc.)
  - Asientos contables automáticos (Journal Entries)
  - Relación con el Plan de Cuentas

- Categorías disponibles: Combustible, Seguro, Mantenimiento, Salarios, Alquiler, 
  Servicios, Permisos, Peajes, Repuestos, Vehiculo, Oficina, Marketing, Viajes, Otros

═══════════════════════════════════════════════════════════════
💡 CÓMO RESPONDER:
═══════════════════════════════════════════════════════════════

1. SIEMPRE usa emojis para hacer visual: 📊 💰 📄 ✅ ⚠️ 💡 👥 🏦 📈
2. Responde en español
3. Sé amigable y profesional
4. Usa las herramientas SIEMPRE que el usuario quiera hacer algo
5. Si la herramienta devuelve un resultado, CONFIRMA la acción al usuario

═══════════════════════════════════════════════════════════════
📋 EJEMPLOS:
═══════════════════════════════════════════════════════════════

Usuario: "Pagué $500 del seguro del carro"
→ USAR crear_gasto con amount=500, description="Seguro del carro", category="Seguro"

Usuario: "Cobré $2000 por un servicio de transporte"
→ USAR crear_ingreso con amount=2000, description="Servicio de transporte"

Usuario: "¿Cuánto gasté en noviembre?"
→ USAR consultar_gastos con periodo="mes", mes=11

Usuario: "¿Cómo registro una factura?"
→ RESPONDER directamente explicando los pasos, NO usar herramienta
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

    const { message, companyId } = await req.json()
    const userId = session.user.id
    const activeCompanyId = companyId || userId

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[AI] 📩 Mensaje recibido:', message);
    console.log('[AI] 👤 Usuario:', userId, '| Compañía:', activeCompanyId);
    console.log('═══════════════════════════════════════════════════════════════');

    if (!groq) {
      return NextResponse.json({
        success: true,
        response: '⚠️ IA no configurada. Configura GROQ_API_KEY en .env.local',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener contexto del negocio
    const context = await getBusinessContext(activeCompanyId);
    
    // Llamar a Groq con Function Calling
    const response = await callGroqWithTools(message, context, userId, activeCompanyId);
    
    return NextResponse.json({
      success: true,
      response: response.text,
      action: response.toolUsed,
      suggestions: getSuggestions(response.toolUsed),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI] Error:', error);
    return NextResponse.json({
      success: false,
      response: `⚠️ Hubo un problema procesando tu solicitud. Por favor intenta de nuevo.`,
      error: error.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Llamar a Groq con Function Calling (Tool Use)
 */
async function callGroqWithTools(
  message: string, 
  context: string, 
  userId: string, 
  companyId: string
): Promise<{ text: string; toolUsed?: string }> {
  
  const systemWithContext = `${SYSTEM_PROMPT}

═══════════════════════════════════════════════════════════════
📋 DATOS ACTUALES DEL NEGOCIO:
═══════════════════════════════════════════════════════════════
${context}`;

  console.log('[AI] 🚀 Llamando a Groq con Function Calling...');

  // Primera llamada - el modelo decide si usar herramientas
  const completion = await groq!.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemWithContext },
      { role: 'user', content: message }
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
      { role: 'user', content: message },
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

    const finalCompletion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

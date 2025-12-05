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
}

// Tipos de acciones
type ActionType = 
  | 'create_invoice' | 'create_expense' | 'create_customer' 
  | 'create_product' | 'create_chart_of_accounts' | 'clear_chart_of_accounts' 
  | 'record_payment' | 'record_income' | 'get_report' | 'none';

interface AIAction {
  type: ActionType;
  params: Record<string, any>;
}

/**
 * POST /api/ai/chat - Asistente IA completo
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

    console.log('[AI] Mensaje:', message);

    if (!groq) {
      return NextResponse.json({
        success: true,
        response: '⚠️ IA no configurada. Configura GROQ_API_KEY en .env.local',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener contexto del negocio
    const context = await getBusinessContext(userId, activeCompanyId);
    
    // Detectar si es una acción
    const action = detectAction(message.toLowerCase());
    
    // Ejecutar acción si es necesario
    if (action.type !== 'none') {
      const result = await executeAction(action, message, userId, activeCompanyId);
      return NextResponse.json({
        success: true,
        response: result,
        action: action.type,
        suggestions: getSuggestions(action.type),
        timestamp: new Date().toISOString()
      });
    }

    // Chat normal con IA
    const response = await chatWithAI(message, context);
    
    return NextResponse.json({
      success: true,
      response,
      suggestions: getSuggestions('none'),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI] Error:', error);
    // SIEMPRE devolver JSON válido, incluso en errores
    const errorResponse = {
      success: false,
      response: `⚠️ Hubo un problema procesando tu solicitud. Por favor intenta de nuevo.`,
      error: error.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Usar 200 para que el cliente pueda leer el JSON
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Chat con Groq - SISTEMA MEJORADO
async function chatWithAI(message: string, context: string): Promise<string> {
  const systemPrompt = `Eres "FinanceBot", el asistente contable inteligente de esta aplicación tipo QuickBooks. Eres EXPERTO en contabilidad y conoces TODA la aplicación.

═══════════════════════════════════════════════════════════════
📱 MÓDULOS DE LA APLICACIÓN QUE CONOCES:
═══════════════════════════════════════════════════════════════

📊 DASHBOARD (/company/dashboard)
- Resumen financiero general
- Gráficos de ingresos vs gastos
- Facturas pendientes
- Alertas importantes

💰 GASTOS (/company/expenses)
- Registrar nuevos gastos
- Categorizar gastos (Seguro, Combustible, Salarios, Mantenimiento, etc.)
- Ver historial de gastos
- Aprobar/rechazar gastos pendientes
- Subir recibos y comprobantes

📄 FACTURACIÓN (/company/invoicing)
- Crear facturas (/company/invoicing/sales)
- Ver facturas enviadas
- Facturas pendientes de pago
- Facturas vencidas
- Enviar recordatorios de pago
- Crear notas de crédito

👥 CLIENTES (/company/customers)
- Agregar nuevos clientes
- Ver historial de transacciones por cliente
- Estados de cuenta
- Datos de contacto

📦 PRODUCTOS/SERVICIOS (/company/products)
- Catálogo de productos
- Precios y descripciones
- Inventario (si aplica)

🏦 CONTABILIDAD (/company/accounting)
- Plan de Cuentas (Chart of Accounts)
- Asientos contables (Journal Entries)
- Balance General
- Estado de Resultados
- Conciliación bancaria

📈 REPORTES (/company/reports)
- Reporte de ganancias y pérdidas
- Balance general
- Flujo de efectivo
- Reportes por período
- Reportes fiscales
- Exportar a Excel/PDF

💳 BANCOS (/company/banking)
- Conectar cuentas bancarias
- Transacciones automáticas
- Conciliación

👔 NÓMINA (/company/payroll)
- Empleados
- Pagos de nómina
- Deducciones
- Impuestos de nómina

🔧 HERRAMIENTAS (/company/tools)
- Importar desde Excel
- Exportar datos
- Calculadoras fiscales

⚙️ CONFIGURACIÓN (/settings)
- Datos de la empresa
- Usuarios y permisos
- Preferencias
- Integraciones

═══════════════════════════════════════════════════════════════
📚 CONOCIMIENTOS CONTABLES:
═══════════════════════════════════════════════════════════════

TIPOS DE CUENTAS:
- ACTIVOS (1xxx): Lo que tienes - Caja, Banco, Cuentas por Cobrar, Vehículos, Equipo
- PASIVOS (2xxx): Lo que debes - Préstamos, Cuentas por Pagar, Impuestos por Pagar
- PATRIMONIO (3xxx): Capital del negocio
- INGRESOS (4xxx): Dinero que entra - Ventas, Servicios
- GASTOS (5xxx-6xxx): Dinero que sale - Salarios, Renta, Servicios, Combustible

PRINCIPIOS CONTABLES:
- Partida doble: Cada transacción afecta al menos 2 cuentas
- Débitos = Créditos siempre
- Activos + Gastos = Pasivos + Capital + Ingresos

OPERACIONES COMUNES:
- Registrar venta: Aumenta Ingresos, Aumenta Banco/Cuentas por Cobrar
- Registrar gasto: Aumenta Gasto, Disminuye Banco
- Pagar deuda: Disminuye Pasivo, Disminuye Banco
- Cobrar factura: Aumenta Banco, Disminuye Cuentas por Cobrar

IMPUESTOS BÁSICOS:
- IVA/Sales Tax: Impuesto sobre ventas
- ISR/Income Tax: Impuesto sobre la renta
- Retenciones: Impuestos retenidos a empleados o proveedores

═══════════════════════════════════════════════════════════════
🎯 CÓMO RESPONDER:
═══════════════════════════════════════════════════════════════

1. Si preguntan CÓMO HACER algo:
   - Explica los pasos
   - Indica en qué módulo/sección encontrarlo
   - Ejemplo: "Para registrar un gasto, ve a **Gastos → Nuevo Gasto**"

2. Si preguntan sobre CONCEPTOS contables:
   - Explica de forma simple
   - Da ejemplos prácticos
   - Relaciona con su negocio

3. Si quieren REGISTRAR algo (gasto, ingreso, etc.):
   - Puedes hacerlo directamente si dan los datos
   - O guíalos al módulo correcto

4. Si piden REPORTES o CONSULTAS:
   - Usa los datos del contexto para responder
   - Indica dónde ver el reporte completo

5. SIEMPRE:
   - Usa emojis para hacer la respuesta visual: 📊 💰 📄 ✅ ⚠️ 💡 👥 🏦 📈
   - Responde en español
   - Sé amigable y profesional
   - Si no sabes algo, dilo honestamente

═══════════════════════════════════════════════════════════════
📋 DATOS ACTUALES DEL NEGOCIO:
═══════════════════════════════════════════════════════════════
${context}

═══════════════════════════════════════════════════════════════
💬 EJEMPLOS DE RESPUESTAS:
═══════════════════════════════════════════════════════════════

Usuario: "¿Cómo registro un gasto?"
Respuesta: "📝 Para registrar un gasto tienes 2 opciones:

**Opción 1 - Dímelo aquí:**
Solo escribe algo como: "Pagué $200 de seguro del mes de noviembre"
Y yo lo registro automáticamente ✅

**Opción 2 - Desde el menú:**
1. Ve a **Gastos** en el menú lateral
2. Clic en **Nuevo Gasto**
3. Llena el monto, descripción y categoría
4. Guarda

💡 ¿Tienes un gasto que registrar ahora?"

Usuario: "¿Qué es una cuenta por cobrar?"
Respuesta: "📚 **Cuentas por Cobrar** es el dinero que tus clientes te deben.

Por ejemplo:
- Hiciste un viaje por $500
- Le diste factura al cliente
- El cliente aún no te paga

Ese $500 es una **Cuenta por Cobrar** - es tu dinero, pero aún no lo tienes en mano.

📊 En tu app, puedes verlas en **Facturación → Facturas Pendientes**"
`;

  const completion = await groq!.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
}

// Obtener contexto del negocio
async function getBusinessContext(userId: string, companyId: string): Promise<string> {
  try {
    const [company, customers, invoices, expenses, products, employees, accounts] = await Promise.all([
      prisma.company.findFirst({ where: { id: companyId } }),
      prisma.customer.findMany({ where: { companyId }, take: 50 }),
      prisma.invoice.findMany({ where: { userId, companyId }, include: { customer: true }, take: 30 }),
      prisma.expense.findMany({ where: { userId, companyId }, take: 30 }),
      prisma.product.findMany({ where: { companyId }, take: 50 }),
      prisma.employee.findMany({ where: { userId, companyId } }),
      prisma.chartOfAccounts.findMany({ where: { companyId }, take: 100 })
    ]);

    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const pending = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');

    return `
Empresa: ${company?.name || 'Mi Empresa'}
📊 Ingresos: $${totalRevenue.toLocaleString()} | Gastos: $${totalExpenses.toLocaleString()} | Utilidad: $${(totalRevenue - totalExpenses).toLocaleString()}
📄 Facturas pendientes: ${pending.length} por $${pending.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}
👥 Clientes: ${customers.length} | 📦 Productos: ${products.length} | 👔 Empleados: ${employees.length}
🏛️ Cuentas contables: ${accounts.length}

Últimos clientes: ${customers.slice(0, 5).map(c => c.name).join(', ') || 'Ninguno'}
Últimas facturas: ${invoices.slice(0, 3).map(i => `#${i.invoiceNumber} $${i.total}`).join(', ') || 'Ninguna'}`;
  } catch (e) {
    return 'Sin datos disponibles.';
  }
}

// Detectar acción - MEJORADO para lenguaje natural
function detectAction(msg: string): AIAction {
  const msgLower = msg.toLowerCase();
  
  // Detectar si hay un monto (con o sin $, con puntos o comas)
  const hasMonto = msgLower.match(/\$?\s*[\d.,]+\s*(dolares|dólares|usd|pesos|\$)?/i) ||
                   msgLower.match(/[\d.,]+\s*(dolares|dólares|usd|pesos)/i);
  
  // === REGISTRAR GASTOS (lenguaje natural) ===
  // Palabras que indican un gasto
  const gastoPalabras = /(pagu[eé]|gast[eé]|pago de|pago del|pago al|compr[eé]|cost[oó]|invert[ií]|desembols)/i;
  const gastoConceptos = /(seguro|letra|chofer|gasolina|diesel|combustible|mantenimiento|permiso|sticker|peaje|llanta|repuesto|vehiculo|vehículo|suburban|camion|camión|trailer|auto|carro|reparacion|reparación)/i;
  const registroPalabras = /(registra|anota|apunta|guarda|pon|agrega)/i;
  
  // Si menciona una acción de gasto + monto, o concepto de gasto + monto + "registra"
  if ((gastoPalabras.test(msgLower) && hasMonto) ||
      (gastoConceptos.test(msgLower) && hasMonto && registroPalabras.test(msgLower)) ||
      (gastoConceptos.test(msgLower) && hasMonto && msgLower.includes('compra'))) {
    return { type: 'record_payment', params: { message: msg } };
  }
  
  // === REGISTRAR INGRESOS (lenguaje natural) ===
  // "cobré", "me pagaron", "recibí", "ingreso de", "viaje de"
  const ingresoPalabras = /(cobr[eé]|me pagaron|recib[ií]|ingreso de|entr[oó]|deposit|factur[eé]|vend[ií])/i;
  const ingresoConceptos = /(viaje|flete|servicio|trabajo|cliente|pago del cliente)/i;
  
  if ((ingresoPalabras.test(msgLower) && hasMonto) ||
      (ingresoConceptos.test(msgLower) && hasMonto && registroPalabras.test(msgLower))) {
    return { type: 'record_income', params: { message: msg } };
  }
  
  // === REPORTES Y CONSULTAS ===
  // "cuánto gané", "ganancias de", "dame las ganancias", "reporte de"
  if (msgLower.match(/(cuánto|cuanto|dame|ver|mostrar|cual|cuál).*(gan[eéa]|ingres|cobr|vend|factur)/i) ||
      msgLower.match(/(ganancia|ingreso|venta|reporte|resumen).*(mes|año|semana|hoy|ayer)/i) ||
      msgLower.match(/(mes|año|semana).*(ganancia|ingreso|venta|gast)/i)) {
    return { type: 'get_report', params: { query: msg } };
  }

  // === COMANDOS EXPLÍCITOS ===
  const createWords = ['crea', 'crear', 'genera', 'generar', 'hazme', 'haz', 'nuevo', 'nueva', 'agrega', 'agregar', 'registra', 'registrar', 'añade', 'añadir'];
  const hasCreate = createWords.some(w => msgLower.includes(w));

  // Limpiar catálogo
  if ((msgLower.includes('limpia') || msgLower.includes('elimina') || msgLower.includes('borra') || msgLower.includes('resetea')) && 
      (msgLower.includes('catálogo') || msgLower.includes('catalogo') || msgLower.includes('cuentas'))) {
    return { type: 'clear_chart_of_accounts', params: {} };
  }

  if (hasCreate) {
    if (msgLower.includes('catálogo') || msgLower.includes('catalogo') || msgLower.includes('plan de cuenta') || 
        (msgLower.includes('cuentas') && (msgLower.includes('contab') || msgLower.includes('para')))) {
      return { type: 'create_chart_of_accounts', params: { description: msg } };
    }
    if (msgLower.includes('factura') || msgLower.includes('invoice')) {
      return { type: 'create_invoice', params: {} };
    }
    if (msgLower.includes('gasto') || msgLower.includes('expense')) {
      return { type: 'create_expense', params: {} };
    }
    if (msgLower.includes('cliente') || msgLower.includes('customer')) {
      return { type: 'create_customer', params: {} };
    }
    if (msgLower.includes('producto') || msgLower.includes('servicio')) {
      return { type: 'create_product', params: {} };
    }
  }
  return { type: 'none', params: {} };
}

// Ejecutar acción
async function executeAction(action: AIAction, msg: string, userId: string, companyId: string): Promise<string> {
  switch (action.type) {
    case 'clear_chart_of_accounts':
      return await clearChartOfAccounts(companyId);
    case 'create_chart_of_accounts':
      return await createChartOfAccounts(msg, companyId);
    case 'create_invoice':
      return await createInvoice(msg, userId, companyId);
    case 'create_expense':
      return await createExpense(msg, userId, companyId);
    case 'create_customer':
      return await createCustomer(msg, companyId);
    case 'create_product':
      return await createProduct(msg, companyId);
    case 'record_payment':
      return await recordPaymentNatural(msg, userId, companyId);
    case 'record_income':
      return await recordIncomeNatural(msg, userId, companyId);
    case 'get_report':
      return await getFinancialReport(msg, userId, companyId);
    default:
      return 'Acción no reconocida';
  }
}

// ============================================
// NUEVAS FUNCIONES PARA LENGUAJE NATURAL
// ============================================

// REGISTRAR PAGO/GASTO en lenguaje natural
async function recordPaymentNatural(msg: string, userId: string, companyId: string): Promise<string> {
  try {
    // Usar IA para extraer información
    const prompt = `Extrae datos de este mensaje sobre un gasto/pago: "${msg}"
    
Responde SOLO con JSON válido (sin explicaciones):
{
  "amount": número (el monto en dólares, convierte 14.000 a 14000),
  "description": "descripción corta del gasto",
  "category": "una de estas: vehiculo|seguro|chofer|letra|combustible|mantenimiento|permiso|peaje|repuesto|otro",
  "month": "mes mencionado o null",
  "year": "año mencionado o null"
}

Ejemplos:
- "gasté 14.000 dolares en comprar una suburban" → amount: 14000, category: "vehiculo"
- "pagué $500 del seguro de noviembre" → amount: 500, category: "seguro", month: "noviembre"`;

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Buscar JSON en la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return `⚠️ No pude entender el gasto. Intenta así:\n"Gasté $14000 en comprar el vehículo en mayo 2023"`;
    }
    
    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      return `⚠️ No pude procesar la información. Intenta:\n"Gasté $14000 en comprar el vehículo en mayo 2023"`;
    }

    if (!data.amount || data.amount <= 0) {
      return `⚠️ No encontré el monto. ¿Cuánto fue? Ejemplo:\n"Gasté **$14000** en el vehículo"`;
    }

    // Mapear categoría a categoría de BD
    const categoryMap: Record<string, string> = {
      'vehiculo': 'Compra Vehiculo',
      'seguro': 'Seguro',
      'chofer': 'Salarios Choferes',
      'letra': 'Letra Vehiculo',
      'combustible': 'Combustible',
      'mantenimiento': 'Mantenimiento',
      'permiso': 'Permisos y Licencias',
      'peaje': 'Peajes',
      'repuesto': 'Repuestos',
      'otro': 'General'
    };

    // Mapear tipo de categoría - DEBE ser un valor válido del enum ExpenseType
    // Valores válidos: OPERATING, ADMINISTRATIVE, SALES, FINANCIAL, OTHER
    const categoryTypeMap: Record<string, string> = {
      'vehiculo': 'OTHER',
      'seguro': 'OPERATING',
      'chofer': 'OPERATING',
      'letra': 'FINANCIAL',
      'combustible': 'OPERATING',
      'mantenimiento': 'OPERATING',
      'permiso': 'ADMINISTRATIVE',
      'peaje': 'OPERATING',
      'repuesto': 'OPERATING',
      'otro': 'OTHER'
    };

    const categoryName = categoryMap[data.category] || data.category || 'General';
    const categoryType = categoryTypeMap[data.category] || 'OTHER';
    
    // Buscar categoría existente
    let category = await prisma.expenseCategory.findFirst({ 
      where: { companyId, name: { contains: categoryName, mode: 'insensitive' } } 
    });
    
    // Si no existe la categoría específica, CREARLA automáticamente
    if (!category) {
      console.log(`[AI] Categoría "${categoryName}" no existe, creándola...`);
      try {
        category = await prisma.expenseCategory.create({
          data: { 
            name: categoryName, 
            description: `Categoría para ${categoryName}`, 
            type: categoryType, 
            companyId 
          }
        });
        console.log(`[AI] Categoría "${categoryName}" creada con ID: ${category.id}`);
      } catch (catError) {
        // Si falla crear, usar General
        console.log(`[AI] Error creando categoría, buscando General...`);
        category = await prisma.expenseCategory.findFirst({ 
          where: { companyId, name: 'General' } 
        });
        if (!category) {
          category = await prisma.expenseCategory.create({
            data: { name: 'General', description: 'Gastos generales', type: 'OTHER', companyId }
          });
        }
      }
    }

    // Determinar fecha
    let expenseDate = new Date();
    let fechaTexto = 'hoy';
    
    if (data.month) {
      const months: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      const monthNum = months[data.month.toLowerCase()];
      if (monthNum !== undefined) {
        const year = data.year ? parseInt(data.year) : new Date().getFullYear();
        expenseDate = new Date(year, monthNum, 15);
        fechaTexto = `${data.month} ${year}`;
      }
    }

    // Crear el gasto
    const expense = await prisma.expense.create({
      data: {
        user: { connect: { id: userId } },
        category: { connect: { id: category.id } },
        companyId,
        amount: data.amount,
        description: data.description || `Pago de ${categoryName}`,
        date: expenseDate,
        status: 'APPROVED',
        paymentMethod: 'OTHER'
      }
    });

    const monthName = expenseDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    return `✅ **¡Gasto Registrado Exitosamente!**

💰 **Monto:** $${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
📝 **Concepto:** ${expense.description}
📁 **Categoría:** ${category.name}
📅 **Fecha:** ${monthName}

📊 El gasto ya está guardado en tu sistema. 
👉 Puedes verlo en **Menú → Gastos**

💡 ¿Tienes más gastos que registrar?`;

  } catch (e: any) {
    console.error('[AI] Error registrando gasto:', e);
    
    // Mensaje de error más descriptivo y amigable
    let errorMsg = '❌ **No pude registrar el gasto.**\n\n';
    
    if (e.message?.includes('Foreign key')) {
      errorMsg += '⚠️ Hay un problema con la configuración de tu empresa.\n';
      errorMsg += 'Por favor contacta al administrador.';
    } else if (e.message?.includes('category')) {
      errorMsg += '⚠️ No pude encontrar o crear la categoría.\n';
      errorMsg += 'Intenta con: "Gasté $14000 en vehículo en mayo 2023"';
    } else {
      errorMsg += `⚠️ Error técnico: ${e.message}\n\n`;
      errorMsg += '💡 Intenta de nuevo con este formato:\n';
      errorMsg += '"Gasté $14000 en comprar el vehículo en mayo 2023"';
    }
    
    return errorMsg;
  }
}

// REGISTRAR INGRESO en lenguaje natural
async function recordIncomeNatural(msg: string, userId: string, companyId: string): Promise<string> {
  try {
    const prompt = `Extrae datos de este mensaje sobre un ingreso/cobro: "${msg}"
    
Responde SOLO con JSON válido:
{
  "amount": número (el monto en dólares),
  "description": "descripción del ingreso/servicio",
  "source": "cliente o fuente del ingreso",
  "month": "mes mencionado o null",
  "year": "año mencionado o null"
}`;

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return `⚠️ No pude entender. Intenta:\n"Cobré $500 por un viaje a Miami"`;
    }
    
    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      return `⚠️ No pude procesar. Intenta:\n"Me pagaron $500 por un flete"`;
    }

    if (!data.amount || data.amount <= 0) {
      return `⚠️ No encontré el monto. Ejemplo:\n"Cobré **$500** por un viaje"`;
    }

    // Determinar fecha
    let incomeDate = new Date();
    if (data.month) {
      const months: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      const monthNum = months[data.month.toLowerCase()];
      if (monthNum !== undefined) {
        const year = data.year ? parseInt(data.year) : new Date().getFullYear();
        incomeDate = new Date(year, monthNum, 15);
      }
    }

    // Crear transacción de ingreso
    await prisma.transaction.create({
      data: {
        companyId,
        type: 'INCOME',
        category: 'Ingresos por Transporte',
        description: data.description || 'Ingreso por servicio',
        amount: data.amount,
        date: incomeDate,
        status: 'COMPLETED',
        notes: data.source ? `Cliente/Fuente: ${data.source}` : undefined
      }
    });

    const monthName = incomeDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    return `✅ **¡Ingreso Registrado!**

💵 **Monto:** $${data.amount.toFixed(2)}
📝 **Concepto:** ${data.description || 'Servicio de transporte'}
${data.source ? `👤 **Cliente:** ${data.source}` : ''}
📅 **Fecha:** ${monthName}

Ya está registrado en tu sistema.`;

  } catch (e: any) {
    console.error('[AI] Error registrando ingreso:', e);
    return `❌ Hubo un error: ${e.message}. Intenta de nuevo.`;
  }
}

// OBTENER REPORTE FINANCIERO
async function getFinancialReport(msg: string, userId: string, companyId: string): Promise<string> {
  try {
    // Determinar el período
    const msgLower = msg.toLowerCase();
    let startDate: Date, endDate: Date;
    const now = new Date();
    
    // Detectar mes específico
    const months: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();
    
    for (const [monthName, monthNum] of Object.entries(months)) {
      if (msgLower.includes(monthName)) {
        targetMonth = monthNum;
        break;
      }
    }
    
    // Detectar año
    const yearMatch = msgLower.match(/20\d{2}/);
    if (yearMatch) {
      targetYear = parseInt(yearMatch[0]);
    }
    
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    // Obtener datos
    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate }
        },
        include: { category: true }
      }),
      prisma.transaction.findMany({
        where: {
          companyId,
          type: 'INCOME',
          date: { gte: startDate, lte: endDate }
        }
      })
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const profit = totalIncome - totalExpenses;
    
    const monthName = startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // Agrupar gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      const catName = exp.category?.name || 'Sin categoría';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + exp.amount;
    }

    let categoryBreakdown = '';
    for (const [cat, amount] of Object.entries(expensesByCategory)) {
      categoryBreakdown += `   • ${cat}: $${amount.toFixed(2)}\n`;
    }

    const profitEmoji = profit >= 0 ? '✅' : '⚠️';
    const profitStatus = profit >= 0 ? 'Ganancia' : 'Pérdida';

    return `📊 **Reporte de ${monthName}**

💵 **Ingresos:** $${totalIncome.toFixed(2)}
💸 **Gastos:** $${totalExpenses.toFixed(2)}

${profitEmoji} **${profitStatus}:** $${Math.abs(profit).toFixed(2)}

📋 **Detalle de Gastos:**
${categoryBreakdown || '   No hay gastos registrados'}

📈 **Resumen:**
• ${incomes.length} ingresos registrados
• ${expenses.length} gastos registrados
${profit >= 0 ? `• ¡Buen mes! Ganaste $${profit.toFixed(2)}` : `• Gastaste más de lo que ingresaste`}`;

  } catch (e: any) {
    console.error('[AI] Error generando reporte:', e);
    return `❌ Error generando reporte: ${e.message}`;
  }
}

// LIMPIAR CATÁLOGO DE CUENTAS
async function clearChartOfAccounts(companyId: string): Promise<string> {
  try {
    const count = await prisma.chartOfAccounts.count({ where: { companyId } });
    
    if (count === 0) {
      return `ℹ️ El catálogo de cuentas ya está vacío. Puedes crear uno nuevo con:\n\n"Crea catálogo de cuentas para [tipo de negocio]"`;
    }

    await prisma.chartOfAccounts.deleteMany({ where: { companyId } });
    
    return `🗑️ **Catálogo Limpiado**

Se eliminaron **${count}** cuentas del catálogo.

Ahora puedes crear un catálogo nuevo con:
• "Crea catálogo para panadería"
• "Genera catálogo para compañía de transporte"
• "Hazme un catálogo para restaurante"`;
  } catch (error: any) {
    return `❌ Error al limpiar el catálogo: ${error.message}`;
  }
}

// CREAR CATÁLOGO DE CUENTAS
async function createChartOfAccounts(userMessage: string, companyId: string): Promise<string> {
  // Extraer el tipo de negocio del mensaje
  const businessMatch = userMessage.match(/(?:para|de)\s+(?:una?\s+)?(.+?)(?:\s*$)/i);
  const businessType = businessMatch ? businessMatch[1].trim() : 'negocio general';

  const prompt = `Eres un contador experto. Genera un catálogo de cuentas COMPLETO y ESPECÍFICO para: "${businessType}"

INSTRUCCIONES IMPORTANTES:
1. Las cuentas deben ser MUY ESPECÍFICAS para este tipo de negocio
2. Incluye cuentas que SOLO aplican a "${businessType}"
3. NO uses cuentas genéricas - sé muy específico

EJEMPLOS DE CUENTAS ESPECÍFICAS:
- Para PANADERÍA: "Inventario de Harina", "Inventario de Levadura", "Equipo de Hornos", "Ventas de Pan", "Costo de Ingredientes"
- Para TRANSPORTE/CAMIONES: "Flota de Camiones", "Combustible Diesel", "Mantenimiento de Vehículos", "Licencias DOT", "Ingresos por Flete"
- Para RESTAURANTE: "Inventario de Alimentos", "Equipo de Cocina", "Propinas por Pagar", "Ventas de Alimentos"

RESPONDE SOLO JSON VÁLIDO (sin markdown, sin texto adicional):
{"businessType":"${businessType}","accounts":[{"code":"1000","name":"ACTIVOS","type":"ASSET","category":"CURRENT_ASSET","level":1,"description":"Cuenta principal"},{"code":"1010","name":"Caja General","type":"ASSET","category":"CURRENT_ASSET","level":2,"description":"Efectivo en caja"}]}

ESTRUCTURA DE CÓDIGOS:
- 1000-1099: Efectivo y Bancos
- 1100-1199: Cuentas por Cobrar
- 1200-1299: Inventarios (específicos del negocio)
- 1300-1399: Otros Activos Circulantes
- 1500-1599: Activos Fijos (equipo específico del negocio)
- 1600-1699: Depreciación Acumulada
- 2000-2099: Cuentas por Pagar
- 2100-2199: Impuestos por Pagar
- 2200-2299: Nómina por Pagar
- 2500-2599: Préstamos
- 3000-3099: Capital
- 3100-3199: Utilidades
- 4000-4099: Ingresos Operativos (específicos del negocio)
- 4100-4199: Otros Ingresos
- 5000-5099: Costo de Ventas (específicos del negocio)
- 6000-6099: Gastos de Operación
- 6100-6199: Gastos de Nómina
- 6200-6299: Gastos Administrativos
- 6300-6399: Gastos específicos del negocio

Genera EXACTAMENTE 50 cuentas específicas para "${businessType}".`;

  try {
    console.log('[AI] Generando catálogo para:', businessType);
    
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 6000
    });

    let content = completion.choices[0]?.message?.content || '{}';
    console.log('[AI] Respuesta raw:', content.substring(0, 500));
    
    // Limpiar respuesta
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Encontrar el JSON válido
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.substring(jsonStart, jsonEnd + 1);
    }
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[AI] Error parsing JSON:', parseError);
      console.error('[AI] Content was:', content.substring(0, 500));
      
      // Intentar extraer JSON de la respuesta si viene con texto adicional
      const jsonMatch = content.match(/\{[\s\S]*"accounts"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return `⚠️ La IA no pudo generar el catálogo correctamente. Por favor intenta de nuevo con:\n\n"Crea catálogo de cuentas para ${businessType}"`;
        }
      } else {
        return `⚠️ La IA no pudo generar el catálogo correctamente. Por favor intenta de nuevo con:\n\n"Crea catálogo de cuentas para ${businessType}"`;
      }
    }

    const { accounts } = parsed || {};
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return `⚠️ No se generaron cuentas. Por favor intenta con:\n\n"Genera catálogo de cuentas contables para ${businessType}"`;
    }

    // Contar cuentas existentes
    const existingCount = await prisma.chartOfAccounts.count({ where: { companyId } });
    
    let created = 0, skipped = 0;
    const createdAccounts: string[] = [];

    for (const acc of accounts) {
      try {
        if (!acc.code || !acc.name || !acc.type) {
          skipped++;
          continue;
        }

        // Verificar si existe por código
        const exists = await prisma.chartOfAccounts.findFirst({ 
          where: { code: acc.code, companyId } 
        });
        
        if (exists) { 
          skipped++; 
          continue; 
        }

        // Validar tipo
        const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
        let accountType = acc.type.toUpperCase();
        if (accountType === 'INCOME') accountType = 'REVENUE';
        if (!validTypes.includes(accountType)) accountType = 'EXPENSE';

        await prisma.chartOfAccounts.create({
          data: {
            code: acc.code,
            name: acc.name,
            type: accountType as any,
            category: (acc.category || 'OTHER') as any,
            level: acc.level || 1,
            description: acc.description || '',
            companyId,
            isActive: true,
            balance: 0
          }
        });
        created++;
        if (created <= 10) {
          createdAccounts.push(`${acc.code} - ${acc.name}`);
        }
      } catch (e) { 
        skipped++; 
      }
    }

    // Mostrar algunas cuentas creadas como ejemplo
    const accountsList = createdAccounts.length > 0 
      ? `\n\n**Algunas cuentas creadas:**\n${createdAccounts.map(a => `• ${a}`).join('\n')}${created > 10 ? `\n• ... y ${created - 10} más` : ''}`
      : '';

    return `✅ **Catálogo para ${parsed.businessType || businessType} Creado**

📊 **${created}** cuentas nuevas creadas
${skipped > 0 ? `⏭️ ${skipped} cuentas omitidas (duplicadas o inválidas)\n` : ''}
📁 Total en catálogo: ${existingCount + created} cuentas
${accountsList}

**Estructura:**
🏦 Activos (1000-1999)
💳 Pasivos (2000-2999)  
💰 Patrimonio (3000-3999)
📈 Ingresos (4000-4999)
📉 Gastos (5000-6999)

💡 Ve a **Configuración → Plan de Cuentas** para revisar

⚠️ Si quieres un catálogo limpio, primero elimina las cuentas existentes desde Configuración.`;

  } catch (e: any) {
    return `❌ Error: ${e.message}`;
  }
}

// CREAR FACTURA
async function createInvoice(msg: string, userId: string, companyId: string): Promise<string> {
  const prompt = `Extrae datos: "${msg}". JSON: {"customerName":"nombre o null","amount":0,"description":"descripción"}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      // Si Groq no devuelve JSON válido, mostrar mensaje de ayuda
      return `💡 **Para crear una factura, especifica:**
- "Crea factura para [cliente] por $[monto]"
- Ejemplo: "Crea factura para ABC Corp por $1,500"

O ve a **Ventas → Nueva Factura**`;
    }

    if (!data.customerName && !data.amount) {
      return `💡 **Para crear una factura, especifica:**
- "Crea factura para [cliente] por $[monto]"
- Ejemplo: "Crea factura para ABC Corp por $1,500"

O ve a **Ventas → Nueva Factura**`;
    }

    // Buscar/crear cliente
    let customer = await prisma.customer.findFirst({ where: { name: { contains: data.customerName || '' }, companyId } });
    if (!customer && data.customerName) {
      customer = await prisma.customer.create({ data: { name: data.customerName, email: '', companyId, status: 'ACTIVE' } });
    }

    const total = data.amount || 0;
    const invoice = await prisma.invoice.create({
      data: {
        userId, companyId,
        customerId: customer?.id || null,
        invoiceNumber: `INV-${Date.now()}`,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: total, taxAmount: total * 0.07, total: total * 1.07,
        status: 'DRAFT',
        notes: data.description || ''
      }
    });

    return `✅ **Factura #${invoice.invoiceNumber} Creada**

👤 Cliente: ${data.customerName || 'Sin asignar'}
💰 Total: $${invoice.total.toFixed(2)}
📅 Vence: ${invoice.dueDate.toLocaleDateString()}

💡 Ve a **Ventas → Facturas** para editar y enviar`;

  } catch (e: any) {
    return `❌ Error: ${e.message}`;
  }
}

// CREAR GASTO
async function createExpense(msg: string, userId: string, companyId: string): Promise<string> {
  const prompt = `Extrae datos: "${msg}". JSON: {"amount":0,"description":"descripción","vendor":"proveedor o null"}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return `💡 **Para registrar un gasto, especifica:**
- "Registra gasto de $[monto] en [descripción]"
- Ejemplo: "Registra gasto de $200 en suministros de oficina"`;
    }

    if (!data.amount || data.amount <= 0) {
      return `💡 **Para registrar un gasto, especifica:**
- "Registra gasto de $[monto] en [descripción]"
- Ejemplo: "Registra gasto de $200 en suministros de oficina"`;
    }

    // Buscar o crear categoría por defecto
    let category = await prisma.expenseCategory.findFirst({ where: { name: 'General' } });
    if (!category) {
      category = await prisma.expenseCategory.create({ 
        data: { 
          name: 'General', 
          description: 'Gastos generales',
          type: 'OTHER'
        } 
      });
    }

    const expense = await prisma.expense.create({
      data: {
        user: { connect: { id: userId } },
        category: { connect: { id: category.id } },
        companyId,
        amount: data.amount,
        description: data.description || 'Gasto',
        vendor: data.vendor || '',
        date: new Date(),
        status: 'PENDING',
        paymentMethod: 'OTHER'
      }
    });

    return `✅ **Gasto Registrado**

💰 $${expense.amount.toFixed(2)}
📝 ${expense.description}
${data.vendor ? `🏪 ${data.vendor}` : ''}

💡 Ve a **Gastos** para más detalles`;

  } catch (e: any) {
    return `❌ Error: ${e.message}`;
  }
}

// CREAR CLIENTE
async function createCustomer(msg: string, companyId: string): Promise<string> {
  const prompt = `Extrae datos: "${msg}". JSON: {"name":"nombre","email":"email o null","phone":"tel o null"}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return `💡 **Para crear un cliente:**
- "Crea cliente [nombre]"
- "Agrega cliente Juan Pérez, email juan@email.com"`;
    }

    if (!data.name) {
      return `💡 **Para crear un cliente:**
- "Crea cliente [nombre]"
- "Agrega cliente Juan Pérez, email juan@email.com"`;
    }

    const customer = await prisma.customer.create({
      data: { name: data.name, email: data.email || '', phone: data.phone || '', companyId, status: 'ACTIVE' }
    });

    return `✅ **Cliente Creado**

👤 ${customer.name}
${customer.email ? `📧 ${customer.email}` : ''}
${customer.phone ? `📱 ${customer.phone}` : ''}`;

  } catch (e: any) {
    return `❌ Error: ${e.message}`;
  }
}

// CREAR PRODUCTO
async function createProduct(msg: string, companyId: string): Promise<string> {
  const prompt = `Extrae datos: "${msg}". JSON: {"name":"nombre","price":0,"description":"desc o null"}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return `💡 **Para crear un producto:**
- "Crea producto [nombre] a $[precio]"
- Ejemplo: "Crea producto Consultoría a $150"`;
    }

    if (!data.name) {
      return `💡 **Para crear un producto:**
- "Crea producto [nombre] a $[precio]"
- Ejemplo: "Crea producto Consultoría a $150"`;
    }

    const product = await prisma.product.create({
      data: { name: data.name, price: data.price || 0, description: data.description || '', sku: `SKU-${Date.now()}`, companyId, status: 'ACTIVE', stock: 0 }
    });

    return `✅ **Producto Creado**

📦 ${product.name}
💲 $${product.price.toFixed(2)}`;

  } catch (e: any) {
    return `❌ Error: ${e.message}`;
  }
}

// Sugerencias
function getSuggestions(type: ActionType): string[] {
  const base = ['📊 ¿Cuál es mi situación financiera?', '📄 Facturas pendientes', '💰 Gastos del mes'];
  switch (type) {
    case 'create_chart_of_accounts': return ['Ver catálogo', 'Crear factura', ...base];
    case 'create_invoice': return ['Ver facturas', 'Crear otra', ...base];
    case 'create_expense': return ['Ver gastos', 'Registrar otro', ...base];
    case 'create_customer': return ['Ver clientes', 'Crear factura', ...base];
    case 'create_product': return ['Ver productos', 'Crear factura', ...base];
    default: return base;
  }
}

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
  | 'create_product' | 'create_chart_of_accounts' | 'clear_chart_of_accounts' | 'none';

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
    return NextResponse.json({
      success: false,
      response: `❌ Error: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Chat con Groq
async function chatWithAI(message: string, context: string): Promise<string> {
  const systemPrompt = `Eres "FinanceBot", un asistente contable experto para un sistema tipo QuickBooks.

CAPACIDADES:
- Responder preguntas sobre finanzas, contabilidad, impuestos
- Analizar datos del negocio
- Dar recomendaciones financieras
- Ayudar con facturación y gastos

PERSONALIDAD:
- Profesional pero amigable
- Usa emojis: 📊 💰 📄 ✅ ⚠️ 💡 👥 🏦
- Responde en español
- Sé conciso pero completo

DATOS DEL NEGOCIO:
${context}

Si el usuario quiere CREAR algo, guíalo con ejemplos específicos.`;

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

// Detectar acción
function detectAction(msg: string): AIAction {
  const createWords = ['crea', 'crear', 'genera', 'generar', 'hazme', 'haz', 'nuevo', 'nueva', 'agrega', 'agregar', 'registra', 'registrar', 'añade', 'añadir'];
  const hasCreate = createWords.some(w => msg.includes(w));

  // Limpiar catálogo
  if ((msg.includes('limpia') || msg.includes('elimina') || msg.includes('borra') || msg.includes('resetea')) && 
      (msg.includes('catálogo') || msg.includes('catalogo') || msg.includes('cuentas'))) {
    return { type: 'clear_chart_of_accounts', params: {} };
  }

  if (hasCreate) {
    if (msg.includes('catálogo') || msg.includes('catalogo') || msg.includes('plan de cuenta') || 
        (msg.includes('cuentas') && (msg.includes('contab') || msg.includes('para')))) {
      return { type: 'create_chart_of_accounts', params: { description: msg } };
    }
    if (msg.includes('factura') || msg.includes('invoice')) {
      return { type: 'create_invoice', params: {} };
    }
    if (msg.includes('gasto') || msg.includes('expense')) {
      return { type: 'create_expense', params: {} };
    }
    if (msg.includes('cliente') || msg.includes('customer')) {
      return { type: 'create_customer', params: {} };
    }
    if (msg.includes('producto') || msg.includes('servicio')) {
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
    default:
      return 'Acción no reconocida';
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
      return `❌ Error procesando respuesta de IA. Intenta de nuevo con: "Genera catálogo para ${businessType}"`;
    }

    const { accounts } = parsed;
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return `❌ No se generaron cuentas. Intenta: "Crea catálogo de cuentas para ${businessType}"`;
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
    const data = JSON.parse(content);

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
    const data = JSON.parse(content);

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
    const data = JSON.parse(content);

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
    const data = JSON.parse(content);

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

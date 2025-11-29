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
  | 'create_product' | 'create_chart_of_accounts' | 'none';

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

  if (hasCreate) {
    if (msg.includes('catálogo') || msg.includes('catalogo') || msg.includes('plan de cuenta') || (msg.includes('cuentas') && msg.includes('contab'))) {
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

// CREAR CATÁLOGO DE CUENTAS
async function createChartOfAccounts(userMessage: string, companyId: string): Promise<string> {
  const prompt = `Genera catálogo de cuentas para: "${userMessage}"

RESPONDE SOLO JSON (sin markdown):
{"businessType":"tipo","accounts":[{"code":"1000","name":"ACTIVOS","type":"ASSET","category":"CURRENT_ASSET","level":1},...]}

TIPOS: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
CATEGORÍAS: CURRENT_ASSET, FIXED_ASSET, OTHER_ASSET, CURRENT_LIABILITY, LONG_TERM_LIABILITY, EQUITY, OPERATING_REVENUE, OTHER_REVENUE, COST_OF_GOODS_SOLD, OPERATING_EXPENSE, OTHER_EXPENSE
Incluye 40-60 cuentas específicas. Códigos: 1000-1999 Activos, 2000-2999 Pasivos, 3000-3999 Patrimonio, 4000-4999 Ingresos, 5000-6999 Gastos`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4000
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const { businessType, accounts } = JSON.parse(content);
    let created = 0, skipped = 0;

    for (const acc of accounts || []) {
      try {
        // Verificar si existe
        const exists = await prisma.chartOfAccounts.findFirst({ where: { code: acc.code, companyId } });
        if (exists) { skipped++; continue; }

        await prisma.chartOfAccounts.create({
          data: {
            code: acc.code,
            name: acc.name,
            type: (acc.type === 'INCOME' ? 'REVENUE' : acc.type) as any,
            category: (acc.category || 'OTHER') as any,
            level: acc.level || 1,
            companyId,
            isActive: true,
            balance: 0
          }
        });
        created++;
      } catch (e) { skipped++; }
    }

    return `✅ **Catálogo para ${businessType || 'Negocio'} Creado**

📊 **${created}** cuentas nuevas creadas
${skipped > 0 ? `⏭️ ${skipped} cuentas ya existían` : ''}

**Estructura:**
🏦 Activos (1000-1999)
💳 Pasivos (2000-2999)  
💰 Patrimonio (3000-3999)
📈 Ingresos (4000-4999)
📉 Gastos (5000-6999)

💡 Ve a **Configuración → Plan de Cuentas** para revisar`;

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

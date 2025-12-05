/**
 * AI AGENT SERVICE - Agente IA Autónomo
 * 
 * Agente inteligente que puede:
 * - Ejecutar acciones en la aplicación (crear facturas, gastos, clientes)
 * - Consultar datos en tiempo real
 * - Generar reportes y análisis
 * - Tomar decisiones autónomas
 * - Aprender de interacciones
 * 
 * Soporta:
 * - Groq (GRATIS - Llama 3.3 70B)
 * - OpenAI GPT-4 (cloud)
 * - Llama 3 (local)
 * - Mixtral (local)
 */

import { prisma } from './prisma';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createExpenseWithJE } from './accounting-service';

// ============== TIPOS ==============

export type AIProvider = 'groq' | 'openai' | 'llama' | 'mixtral';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  actions?: Array<{
    type: string;
    description: string;
    result: any;
  }>;
  suggestions?: string[];
  error?: string;
}

export interface AgentContext {
  conversationId: string;
  companyId: string;
  userId: string;
  history: AgentMessage[];
  preferences?: Record<string, any>;
}

// ============== CONFIGURACIÓN ==============

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || (GROQ_API_KEY ? 'groq' : 'openai');
const LLAMA_ENDPOINT = process.env.LLAMA_ENDPOINT || 'http://localhost:8000';
const MIXTRAL_ENDPOINT = process.env.MIXTRAL_ENDPOINT || 'http://localhost:8001';

// Debug: Log de configuración
console.log('[AI-Agent] Configuración:', {
  hasGroqKey: !!GROQ_API_KEY,
  groqKeyLength: GROQ_API_KEY?.length,
  provider: AI_PROVIDER
});

// Cliente Groq (GRATIS)
let groq: Groq | null = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  console.log('[AI-Agent] Cliente Groq inicializado');
}

// Cliente OpenAI
let openai: OpenAI | null = null;
if (OPENAI_API_KEY && AI_PROVIDER === 'openai') {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// ============== SYSTEM PROMPT ==============

const SYSTEM_PROMPT = `Eres un asistente financiero inteligente y autónomo para un sistema de contabilidad QuickBooks.

Tu nombre es "FinanceBot" y tienes las siguientes capacidades:

1. **Crear y gestionar facturas**: Puedes crear facturas para clientes, calcular impuestos, establecer fechas de vencimiento.
2. **Registrar gastos**: Puedes registrar gastos, categorizarlos automáticamente, asociarlos a proyectos.
3. **Gestionar clientes**: Crear, actualizar y consultar información de clientes.
4. **Generar reportes**: Balance general, estado de resultados, flujo de efectivo, reportes de impuestos.
5. **Análisis financiero**: Detectar anomalías, identificar oportunidades de ahorro, forecasting.
6. **Búsqueda inteligente**: Buscar transacciones, facturas, gastos por múltiples criterios.
7. **Automatizaciones**: Configurar reglas automáticas, recordatorios, alertas.

REGLAS IMPORTANTES:
- Siempre confirma antes de ejecutar acciones destructivas (eliminar, modificar datos importantes)
- Usa las funciones disponibles para ejecutar acciones reales en el sistema
- Proporciona explicaciones claras de lo que haces y por qué
- Si no estás seguro, pregunta al usuario antes de proceder
- Habla siempre en español de manera profesional pero amigable
- Cuando crees entidades (facturas, gastos), proporciona los IDs generados
- Si detectas errores o inconsistencias, alertar al usuario

FORMATO DE RESPUESTA:
- Sé conciso pero completo
- Usa emojis cuando sea apropiado (📊 💰 ✅ ⚠️ 🎯)
- Estructura respuestas largas con bullets o numeración
- Siempre ofrece sugerencias de próximos pasos

Estás integrado directamente en la aplicación y tienes acceso completo a la base de datos del usuario.`;

// ============== FUNCIONES DISPONIBLES ==============

const AGENT_FUNCTIONS = [
  {
    name: 'create_invoice',
    description: 'Crea una nueva factura para un cliente',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'ID del cliente',
        },
        customerName: {
          type: 'string',
          description: 'Nombre del cliente si no existe el ID',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
            },
          },
          description: 'Items de la factura',
        },
        dueDate: {
          type: 'string',
          description: 'Fecha de vencimiento (formato: YYYY-MM-DD)',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'create_expense',
    description: 'Registra un nuevo gasto',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Monto del gasto',
        },
        category: {
          type: 'string',
          description: 'Categoría del gasto (ej: office, travel, meals)',
        },
        description: {
          type: 'string',
          description: 'Descripción del gasto',
        },
        vendor: {
          type: 'string',
          description: 'Proveedor o vendedor',
        },
        date: {
          type: 'string',
          description: 'Fecha del gasto (formato: YYYY-MM-DD)',
        },
      },
      required: ['amount', 'description'],
    },
  },
  {
    name: 'create_customer',
    description: 'Crea un nuevo cliente',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre del cliente',
        },
        email: {
          type: 'string',
          description: 'Email del cliente',
        },
        phone: {
          type: 'string',
          description: 'Teléfono del cliente',
        },
        company: {
          type: 'string',
          description: 'Empresa del cliente',
        },
        address: {
          type: 'string',
          description: 'Dirección completa',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'generate_report',
    description: 'Genera un reporte financiero',
    parameters: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['balance_sheet', 'income_statement', 'cash_flow', 'tax_summary', 'sales_by_customer'],
          description: 'Tipo de reporte a generar',
        },
        startDate: {
          type: 'string',
          description: 'Fecha inicial (formato: YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Fecha final (formato: YYYY-MM-DD)',
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'search_transactions',
    description: 'Busca transacciones, facturas o gastos',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['invoice', 'expense', 'all'],
          description: 'Tipo de transacción a buscar',
        },
        query: {
          type: 'string',
          description: 'Texto a buscar',
        },
        minAmount: {
          type: 'number',
          description: 'Monto mínimo',
        },
        maxAmount: {
          type: 'number',
          description: 'Monto máximo',
        },
        startDate: {
          type: 'string',
          description: 'Fecha inicial',
        },
        endDate: {
          type: 'string',
          description: 'Fecha final',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Obtiene un resumen financiero del negocio',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          description: 'Período a analizar',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'analyze_expenses',
    description: 'Analiza patrones de gastos y encuentra oportunidades de ahorro',
    parameters: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Número de meses a analizar',
          default: 3,
        },
      },
    },
  },
  {
    name: 'categorize_expense',
    description: 'Categoriza automáticamente un gasto usando ML',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Descripción del gasto',
        },
        amount: {
          type: 'number',
          description: 'Monto del gasto',
        },
        vendor: {
          type: 'string',
          description: 'Vendedor o proveedor',
        },
      },
      required: ['description', 'amount'],
    },
  },
];

// ============== IMPLEMENTACIÓN DE FUNCIONES ==============

async function createInvoice(params: any, userId: string): Promise<any> {
  let customerId = params.customerId;

  // Si no hay customerId, buscar o crear cliente
  if (!customerId && params.customerName) {
    let customer = await prisma.customer.findFirst({
      where: { name: params.customerName },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: params.customerName,
          email: '',
          phone: '',
          status: 'ACTIVE',
        },
      });
    }

    customerId = customer.id;
  }

  if (!customerId) {
    throw new Error('Se requiere customerId o customerName');
  }

  // Calcular totales
  const items = params.items || [];
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  const tax = subtotal * 0.06; // 6% Florida sales tax
  const total = subtotal + tax;

  // Generar número de factura
  const invoiceNumber = `INV-${Date.now()}`;

  // Fecha de vencimiento (30 días por defecto)
  const issueDate = new Date();
  const dueDate = params.dueDate 
    ? new Date(params.dueDate) 
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Crear factura
  const invoice = await prisma.invoice.create({
    data: {
      userId,
      customerId,
      invoiceNumber,
      issueDate,
      dueDate,
      subtotal,
      discount: 0,
      taxAmount: tax,
      total,
      status: 'DRAFT',
      notes: params.notes || '',
    },
  });

  // Crear items
  for (const item of items) {
    await prisma.invoiceItem.create({
      data: {
        invoice: { connect: { id: invoice.id } },
        product: { connect: { id: item.productId || '' } }, // Required field
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0,
        taxAmount: 0,
        total: item.quantity * item.unitPrice,
      },
    });
  }

  return {
    success: true,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    dueDate: invoice.dueDate,
  };
}

async function createExpense(params: any, userId: string): Promise<any> {
  // Buscar companyId del usuario
  const userCompany = await prisma.companyUser.findFirst({
    where: { userId },
    select: { companyId: true }
  });

  if (!userCompany?.companyId) {
    return {
      success: false,
      error: 'Usuario no tiene compañía asignada'
    };
  }

  // Categorizar automáticamente si no se proporciona categoría
  let categoryId = params.categoryId;
  let categoryName = params.category;
  
  if (!categoryId && params.category) {
    // Buscar o crear categoría
    const category = await prisma.expenseCategory.findFirst({
      where: { name: params.category },
    });
    
    if (category) {
      categoryId = category.id;
      categoryName = category.name;
    }
  }

  // Crear gasto con JE de forma atómica
  const { expense } = await createExpenseWithJE({
    companyId: userCompany.companyId,
    userId,
    categoryId,
    categoryName,
    amount: params.amount,
    description: params.description,
    vendor: params.vendor || '',
    date: params.date ? new Date(params.date) : new Date(),
    paymentMethod: 'OTHER'
  });

  return {
    success: true,
    expenseId: expense.id,
    amount: expense.amount,
    category: params.category,
  };
}

async function createCustomer(params: any): Promise<any> {
  const customer = await prisma.customer.create({
    data: {
      name: params.name,
      email: params.email || '',
      phone: params.phone || '',
      company: params.company || '',
      address: params.address || '',
      status: 'ACTIVE',
    },
  });

  return {
    success: true,
    customerId: customer.id,
    name: customer.name,
  };
}

async function generateReport(params: any, userId: string): Promise<any> {
  const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  switch (params.reportType) {
    case 'balance_sheet':
      return await generateBalanceSheet(userId, endDate);
    case 'income_statement':
      return await generateIncomeStatement(userId, startDate, endDate);
    case 'cash_flow':
      return await generateCashFlow(userId, startDate, endDate);
    case 'tax_summary':
      return await generateTaxSummary(userId, startDate, endDate);
    case 'sales_by_customer':
      return await generateSalesByCustomer(userId, startDate, endDate);
    default:
      throw new Error(`Tipo de reporte desconocido: ${params.reportType}`);
  }
}

async function generateBalanceSheet(userId: string, asOfDate: Date): Promise<any> {
  // Simplificado - en producción usar report-service.ts
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { isActive: true },
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  accounts.forEach(account => {
    if (account.type === 'ASSET') totalAssets += account.balance;
    if (account.type === 'LIABILITY') totalLiabilities += account.balance;
    if (account.type === 'EQUITY') totalEquity += account.balance;
  });

  return {
    reportType: 'balance_sheet',
    asOfDate,
    assets: totalAssets,
    liabilities: totalLiabilities,
    equity: totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

async function generateIncomeStatement(userId: string, startDate: Date, endDate: Date): Promise<any> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PAID',
      issueDate: { gte: startDate, lte: endDate },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  const revenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const netIncome = revenue - totalExpenses;

  return {
    reportType: 'income_statement',
    period: { startDate, endDate },
    revenue,
    expenses: totalExpenses,
    netIncome,
    profitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
  };
}

async function generateCashFlow(userId: string, startDate: Date, endDate: Date): Promise<any> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PAID',
      issueDate: { gte: startDate, lte: endDate },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  const inflow = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const outflow = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const netCashFlow = inflow - outflow;

  return {
    reportType: 'cash_flow',
    period: { startDate, endDate },
    inflow,
    outflow,
    netCashFlow,
  };
}

async function generateTaxSummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PAID',
      issueDate: { gte: startDate, lte: endDate },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  const revenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const deductions = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const taxableIncome = revenue - deductions;
  const estimatedTax = taxableIncome * 0.25; // 25% simplified

  return {
    reportType: 'tax_summary',
    period: { startDate, endDate },
    revenue,
    deductions,
    taxableIncome,
    estimatedTax,
  };
}

async function generateSalesByCustomer(userId: string, startDate: Date, endDate: Date): Promise<any> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PAID',
      issueDate: { gte: startDate, lte: endDate },
    },
    include: {
      customer: true,
    },
  });

  const byCustomer: Record<string, any> = {};

  invoices.forEach(invoice => {
    const customerName = invoice.customer.name;
    if (!byCustomer[customerName]) {
      byCustomer[customerName] = {
        customer: customerName,
        totalSales: 0,
        invoiceCount: 0,
      };
    }
    byCustomer[customerName].totalSales += parseFloat(invoice.total.toString());
    byCustomer[customerName].invoiceCount += 1;
  });

  const topCustomers = Object.values(byCustomer)
    .sort((a: any, b: any) => b.totalSales - a.totalSales)
    .slice(0, 10);

  return {
    reportType: 'sales_by_customer',
    period: { startDate, endDate },
    topCustomers,
  };
}

async function searchTransactions(params: any, userId: string): Promise<any> {
  const results: any = { invoices: [], expenses: [] };

  if (params.type === 'invoice' || params.type === 'all') {
    const where: any = { userId };
    
    if (params.minAmount) where.total = { gte: params.minAmount };
    if (params.maxAmount) where.total = { ...where.total, lte: params.maxAmount };
    if (params.startDate) where.issueDate = { gte: new Date(params.startDate) };
    if (params.endDate) where.issueDate = { ...where.issueDate, lte: new Date(params.endDate) };

    results.invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true },
      take: 20,
    });
  }

  if (params.type === 'expense' || params.type === 'all') {
    const where: any = { userId };
    
    if (params.minAmount) where.amount = { gte: params.minAmount };
    if (params.maxAmount) where.amount = { ...where.amount, lte: params.maxAmount };
    if (params.startDate) where.date = { gte: new Date(params.startDate) };
    if (params.endDate) where.date = { ...where.date, lte: new Date(params.endDate) };

    results.expenses = await prisma.expense.findMany({
      where,
      take: 20,
    });
  }

  return {
    success: true,
    found: results.invoices.length + results.expenses.length,
    invoices: results.invoices,
    expenses: results.expenses,
  };
}

async function getFinancialSummary(params: any, userId: string): Promise<any> {
  let startDate: Date;
  const endDate = new Date();

  switch (params.period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      issueDate: { gte: startDate, lte: endDate },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'PAID');

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const outstandingAR = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);

  return {
    period: params.period,
    dateRange: { startDate, endDate },
    revenue: totalRevenue,
    expenses: totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    outstandingReceivables: outstandingAR,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
  };
}

async function analyzeExpenses(params: any, userId: string): Promise<any> {
  const months = params.months || 3;
  const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    include: {
      category: true,
    },
  });

  // Agrupar por categoría
  const byCategory: Record<string, { total: number; count: number; avg: number }> = {};

  expenses.forEach(exp => {
    const category = exp.category?.name || 'Sin categoría';
    if (!byCategory[category]) {
      byCategory[category] = { total: 0, count: 0, avg: 0 };
    }
    byCategory[category].total += parseFloat(exp.amount.toString());
    byCategory[category].count += 1;
  });

  // Calcular promedios
  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].avg = byCategory[cat].total / byCategory[cat].count;
  });

  // Top categorías
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([category, data]) => ({
      category,
      ...data,
    }));

  // Oportunidades de ahorro (categorías con alta varianza)
  const opportunities: string[] = [];
  if (topCategories[0] && topCategories[0].total > 5000) {
    opportunities.push(`💡 Tu categoría ${topCategories[0].category} representa $${topCategories[0].total.toFixed(2)}. Considera negociar mejores tarifas.`);
  }

  return {
    months,
    totalExpenses: Object.values(byCategory).reduce((sum, cat) => sum + cat.total, 0),
    topCategories,
    opportunities,
  };
}

async function categorizeExpense(params: any): Promise<any> {
  // Usar el servicio ML existente
  const { predictExpenseCategory } = await import('./ml-categorization-service');
  
  const prediction = await predictExpenseCategory(
    params.companyId || '',
    {
      description: params.description,
      amount: params.amount,
      vendor: params.vendor,
      date: new Date(),
    }
  );

  return {
    suggestedCategory: prediction.category,
    confidence: prediction.confidence,
    alternatives: prediction.alternatives,
  };
}

// ============== EJECUCIÓN DE FUNCIONES ==============

async function executeFunction(
  functionName: string,
  functionArgs: string,
  userId: string
): Promise<any> {
  const args = JSON.parse(functionArgs);

  switch (functionName) {
    case 'create_invoice':
      return await createInvoice(args, userId);
    case 'create_expense':
      return await createExpense(args, userId);
    case 'create_customer':
      return await createCustomer(args);
    case 'generate_report':
      return await generateReport(args, userId);
    case 'search_transactions':
      return await searchTransactions(args, userId);
    case 'get_financial_summary':
      return await getFinancialSummary(args, userId);
    case 'analyze_expenses':
      return await analyzeExpenses(args, userId);
    case 'categorize_expense':
      return await categorizeExpense(args);
    default:
      throw new Error(`Función desconocida: ${functionName}`);
  }
}

// ============== AGENTE PRINCIPAL ==============

export async function chatWithAgent(
  context: AgentContext,
  userMessage: string
): Promise<AgentResponse> {
  try {
    // Agregar mensaje del usuario al historial
    context.history.push({
      role: 'user',
      content: userMessage,
    });

    let response: AgentResponse;

    // Debug
    console.log('[AI-Agent] chatWithAgent llamado:', {
      message: userMessage,
      hasGroq: !!groq,
      provider: AI_PROVIDER
    });

    // Prioridad: Groq (gratis) > OpenAI > Llama > Mixtral
    if (groq) {
      console.log('[AI-Agent] Usando Groq...');
      response = await chatWithGroq(context);
    } else if (AI_PROVIDER === 'openai' && openai) {
      response = await chatWithOpenAI(context);
    } else if (AI_PROVIDER === 'llama') {
      response = await chatWithLlama(context);
    } else if (AI_PROVIDER === 'mixtral') {
      response = await chatWithMixtral(context);
    } else {
      // Fallback: respuesta básica sin IA
      console.log('[AI-Agent] Cayendo en fallback - sin IA disponible');
      response = await generateFallbackResponse(context, userMessage);
    }

    // Guardar conversación en DB
    await saveConversation(context, response);

    return response;
  } catch (error: any) {
    console.error('Error en AI Agent:', error);
    return {
      success: false,
      message: 'Lo siento, ocurrió un error procesando tu solicitud.',
      error: error.message,
    };
  }
}

// ============== INTEGRACIÓN OPENAI ==============

async function chatWithOpenAI(context: AgentContext): Promise<AgentResponse> {
  if (!openai) {
    throw new Error('OpenAI no está configurado. Establece OPENAI_API_KEY en .env');
  }

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...context.history,
  ];

  // Primera llamada - puede incluir function calling
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    functions: AGENT_FUNCTIONS,
    function_call: 'auto',
    temperature: 0.7,
    max_tokens: 1000,
  });

  const assistantMessage = completion.choices[0].message;
  const actions: any[] = [];

  // Si el asistente quiere llamar una función
  if (assistantMessage.function_call) {
    const functionName = assistantMessage.function_call.name;
    const functionArgs = assistantMessage.function_call.arguments;

    // Ejecutar la función
    const functionResult = await executeFunction(
      functionName,
      functionArgs,
      context.userId
    );

    actions.push({
      type: functionName,
      description: `Ejecutando: ${functionName}`,
      result: functionResult,
    });

    // Segunda llamada con el resultado de la función
    messages.push({
      role: 'assistant',
      content: null,
      function_call: assistantMessage.function_call,
    });

    messages.push({
      role: 'function',
      name: functionName,
      content: JSON.stringify(functionResult),
    });

    const secondCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const finalMessage = secondCompletion.choices[0].message;

    return {
      success: true,
      message: finalMessage.content || 'Acción completada',
      actions,
      data: functionResult,
      suggestions: generateSuggestions(functionName),
    };
  }

  // Si no hay function call, respuesta directa
  return {
    success: true,
    message: assistantMessage.content || 'Lo siento, no pude procesar tu solicitud.',
    suggestions: generateDefaultSuggestions(),
  };
}

// ============== INTEGRACIÓN GROQ (GRATIS) ==============

async function chatWithGroq(context: AgentContext): Promise<AgentResponse> {
  if (!groq) {
    throw new Error('Groq no está configurado. Establece GROQ_API_KEY en .env');
  }

  // Obtener datos del contexto para enriquecer la respuesta
  let companyData = '';
  try {
    const company = await prisma.company.findFirst({
      where: { id: context.companyId }
    });
    
    if (company) {
      // Contar entidades relacionadas por separado
      const [customerCount, invoiceCount, expenseCount] = await Promise.all([
        prisma.customer.count({ where: { companyId: context.companyId } }),
        prisma.invoice.count({ where: { companyId: context.companyId } }),
        prisma.expense.count({ where: { companyId: context.companyId } })
      ]);
      
      companyData = `
Datos de la empresa actual:
- Nombre: ${company.name}
- Clientes: ${customerCount}
- Facturas: ${invoiceCount}
- Gastos: ${expenseCount}
`;
    }
  } catch (e) {
    // Ignorar si no hay datos
  }

  const systemPromptWithContext = SYSTEM_PROMPT + '\n\n' + companyData;

  // Detectar si el usuario quiere crear un catálogo de cuentas
  const userMessage = context.history[context.history.length - 1]?.content || '';
  const wantsChartOfAccounts = 
    (userMessage.toLowerCase().includes('crear') || userMessage.toLowerCase().includes('generar') || userMessage.toLowerCase().includes('crea') || userMessage.toLowerCase().includes('créa')) &&
    (userMessage.toLowerCase().includes('catálogo') || userMessage.toLowerCase().includes('catalogo') || userMessage.toLowerCase().includes('cuentas') || userMessage.toLowerCase().includes('plan de cuentas'));

  if (wantsChartOfAccounts) {
    // Generar catálogo de cuentas directamente
    const catalogResult = await generateChartOfAccounts(context, userMessage);
    
    if (catalogResult && !catalogResult.error) {
      let responseMessage = `✅ **¡Catálogo de Cuentas Creado Exitosamente!**

📊 Se han creado **${catalogResult.created}** cuentas contables de **${catalogResult.total}** para tu Dealer de Carros.

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

¿Necesitas algo más?`;

      return {
        success: true,
        message: responseMessage,
        actions: [{
          type: 'create_chart_of_accounts',
          description: 'Catálogo de cuentas para dealer de carros',
          result: catalogResult
        }],
        data: catalogResult,
        suggestions: [
          'Ver catálogo de cuentas',
          'Crear una factura',
          'Registrar un gasto',
          'Agregar un cliente'
        ],
      };
    } else {
      return {
        success: false,
        message: `❌ Hubo un problema creando el catálogo: ${catalogResult?.error || 'Error desconocido'}. Por favor intenta nuevamente.`,
        suggestions: ['Intentar de nuevo', 'Crear catálogo manualmente'],
      };
    }
  }

  const messages: any[] = [
    { role: 'system', content: systemPromptWithContext },
    ...context.history.map(m => ({ role: m.role, content: m.content })),
  ];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const assistantMessage = completion.choices[0]?.message?.content || '';

  return {
    success: true,
    message: assistantMessage,
    suggestions: generateDefaultSuggestions(),
  };
}

// Función para generar catálogo de cuentas con IA
async function generateChartOfAccounts(context: AgentContext, userMessage: string): Promise<any> {
  if (!groq) return null;

  const prompt = `Genera un catálogo de cuentas contables completo para un DEALER DE CARROS / CONCESIONARIO DE VEHÍCULOS.

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown ni comentarios):
{
  "accounts": [
    {"code": "1000", "name": "ACTIVOS", "type": "ASSET", "category": "CURRENT_ASSET", "level": 1},
    {"code": "1100", "name": "Activos Corrientes", "type": "ASSET", "category": "CURRENT_ASSET", "level": 2},
    {"code": "1110", "name": "Caja General", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1111", "name": "Caja Chica", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1120", "name": "Bancos", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1200", "name": "Cuentas por Cobrar", "type": "ASSET", "category": "CURRENT_ASSET", "level": 2},
    {"code": "1210", "name": "Cuentas por Cobrar Clientes", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1220", "name": "Documentos por Cobrar", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1300", "name": "Inventarios", "type": "ASSET", "category": "CURRENT_ASSET", "level": 2},
    {"code": "1310", "name": "Inventario de Vehículos Nuevos", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1320", "name": "Inventario de Vehículos Usados", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1330", "name": "Inventario de Repuestos y Accesorios", "type": "ASSET", "category": "CURRENT_ASSET", "level": 3},
    {"code": "1500", "name": "Activos Fijos", "type": "ASSET", "category": "FIXED_ASSET", "level": 2},
    {"code": "1510", "name": "Terrenos", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "1520", "name": "Edificios", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "1530", "name": "Mobiliario y Equipo", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "1540", "name": "Vehículos de la Empresa", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "1550", "name": "Equipo de Cómputo", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "1560", "name": "Herramientas de Taller", "type": "ASSET", "category": "FIXED_ASSET", "level": 3},
    {"code": "2000", "name": "PASIVOS", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 1},
    {"code": "2100", "name": "Pasivos Corrientes", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 2},
    {"code": "2110", "name": "Cuentas por Pagar Proveedores", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 3},
    {"code": "2120", "name": "Floor Plan - Financiamiento Vehículos", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 3},
    {"code": "2130", "name": "Impuestos por Pagar", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 3},
    {"code": "2140", "name": "Salarios por Pagar", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 3},
    {"code": "2150", "name": "Comisiones por Pagar", "type": "LIABILITY", "category": "CURRENT_LIABILITY", "level": 3},
    {"code": "2200", "name": "Pasivos a Largo Plazo", "type": "LIABILITY", "category": "LONG_TERM_LIABILITY", "level": 2},
    {"code": "2210", "name": "Préstamos Bancarios", "type": "LIABILITY", "category": "LONG_TERM_LIABILITY", "level": 3},
    {"code": "2220", "name": "Hipotecas por Pagar", "type": "LIABILITY", "category": "LONG_TERM_LIABILITY", "level": 3},
    {"code": "3000", "name": "PATRIMONIO", "type": "EQUITY", "category": "EQUITY", "level": 1},
    {"code": "3100", "name": "Capital Social", "type": "EQUITY", "category": "EQUITY", "level": 2},
    {"code": "3200", "name": "Reserva Legal", "type": "EQUITY", "category": "EQUITY", "level": 2},
    {"code": "3300", "name": "Utilidades Retenidas", "type": "EQUITY", "category": "EQUITY", "level": 2},
    {"code": "3400", "name": "Utilidad del Ejercicio", "type": "EQUITY", "category": "EQUITY", "level": 2},
    {"code": "4000", "name": "INGRESOS", "type": "INCOME", "category": "OPERATING_INCOME", "level": 1},
    {"code": "4100", "name": "Ingresos por Ventas", "type": "INCOME", "category": "OPERATING_INCOME", "level": 2},
    {"code": "4110", "name": "Venta de Vehículos Nuevos", "type": "INCOME", "category": "OPERATING_INCOME", "level": 3},
    {"code": "4120", "name": "Venta de Vehículos Usados", "type": "INCOME", "category": "OPERATING_INCOME", "level": 3},
    {"code": "4130", "name": "Venta de Repuestos y Accesorios", "type": "INCOME", "category": "OPERATING_INCOME", "level": 3},
    {"code": "4200", "name": "Ingresos por Servicios", "type": "INCOME", "category": "OPERATING_INCOME", "level": 2},
    {"code": "4210", "name": "Servicios de Taller y Reparación", "type": "INCOME", "category": "OPERATING_INCOME", "level": 3},
    {"code": "4220", "name": "Servicios de Garantía", "type": "INCOME", "category": "OPERATING_INCOME", "level": 3},
    {"code": "4300", "name": "Otros Ingresos", "type": "INCOME", "category": "OTHER_INCOME", "level": 2},
    {"code": "4310", "name": "Comisiones por Financiamiento", "type": "INCOME", "category": "OTHER_INCOME", "level": 3},
    {"code": "4320", "name": "Comisiones por Seguros", "type": "INCOME", "category": "OTHER_INCOME", "level": 3},
    {"code": "4330", "name": "Comisiones por Garantías Extendidas", "type": "INCOME", "category": "OTHER_INCOME", "level": 3},
    {"code": "5000", "name": "COSTOS", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 1},
    {"code": "5100", "name": "Costo de Ventas", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 2},
    {"code": "5110", "name": "Costo de Vehículos Nuevos Vendidos", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 3},
    {"code": "5120", "name": "Costo de Vehículos Usados Vendidos", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 3},
    {"code": "5130", "name": "Costo de Repuestos Vendidos", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 3},
    {"code": "5140", "name": "Costo de Reconocimiento Vehículos Usados", "type": "EXPENSE", "category": "COST_OF_GOODS_SOLD", "level": 3},
    {"code": "6000", "name": "GASTOS OPERATIVOS", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 1},
    {"code": "6100", "name": "Gastos de Personal", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6110", "name": "Salarios y Sueldos", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6120", "name": "Comisiones de Vendedores", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6130", "name": "Bonificaciones", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6140", "name": "Prestaciones Sociales", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6200", "name": "Gastos de Instalaciones", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6210", "name": "Alquiler de Local", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6220", "name": "Servicios Públicos", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6230", "name": "Mantenimiento de Instalaciones", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6300", "name": "Gastos de Vehículos", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6310", "name": "Combustible", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6320", "name": "Mantenimiento de Flota", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6330", "name": "Seguros de Vehículos", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6400", "name": "Gastos de Publicidad y Marketing", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6410", "name": "Publicidad Digital", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6420", "name": "Publicidad Tradicional", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6430", "name": "Eventos y Promociones", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6500", "name": "Gastos Financieros", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6510", "name": "Intereses Floor Plan", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6520", "name": "Intereses Bancarios", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6530", "name": "Comisiones Bancarias", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6600", "name": "Depreciación y Amortización", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 2},
    {"code": "6610", "name": "Depreciación de Edificios", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6620", "name": "Depreciación de Mobiliario", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3},
    {"code": "6630", "name": "Depreciación de Vehículos", "type": "EXPENSE", "category": "OPERATING_EXPENSE", "level": 3}
  ]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Limpiar el contenido de posible markdown
    let cleanContent = content;
    if (content.includes('```json')) {
      cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      cleanContent = content.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(cleanContent.trim());
    
    // Crear las cuentas en ChartOfAccounts
    if (parsed.accounts && Array.isArray(parsed.accounts)) {
      let created = 0;
      const createdAccounts: any[] = [];
      
      for (const account of parsed.accounts) {
        try {
          // Mapear category string a enum válido
          let category = account.category || 'OTHER';
          const validCategories = [
            'CURRENT_ASSET', 'FIXED_ASSET', 'OTHER_ASSET',
            'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY',
            'EQUITY', 'OPERATING_INCOME', 'OTHER_INCOME',
            'COST_OF_GOODS_SOLD', 'OPERATING_EXPENSE', 'OTHER_EXPENSE', 'OTHER'
          ];
          if (!validCategories.includes(category)) {
            category = 'OTHER';
          }

          const newAccount = await prisma.chartOfAccounts.create({
            data: {
              code: account.code,
              name: account.name,
              type: account.type as any,
              category: category as any,
              level: account.level || 1,
              companyId: context.companyId,
              isActive: true,
              balance: 0,
              description: account.description || null
            }
          });
          created++;
          createdAccounts.push({
            code: newAccount.code,
            name: newAccount.name,
            type: newAccount.type
          });
        } catch (e: any) {
          // Ignorar duplicados (código único)
          console.log(`Cuenta ${account.code} ya existe o error:`, e.message);
        }
      }
      return { 
        created, 
        total: parsed.accounts.length, 
        accounts: createdAccounts,
        message: `Se crearon ${created} cuentas de ${parsed.accounts.length} en el catálogo.`
      };
    }
    
    return parsed;
  } catch (e: any) {
    console.error('Error generando catálogo:', e);
    return { error: e.message };
  }
}

// Respuesta de fallback sin IA
async function generateFallbackResponse(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  // Obtener estadísticas básicas
  let stats = { customers: 0, invoices: 0, products: 0, employees: 0 };
  try {
    const [customers, invoices, products, employees] = await Promise.all([
      prisma.customer.count({ where: { companyId: context.companyId } }),
      prisma.invoice.count({ where: { companyId: context.companyId } }),
      prisma.product.count({ where: { companyId: context.companyId } }),
      prisma.employee.count({ where: { companyId: context.companyId } })
    ]);
    stats = { customers, invoices, products, employees };
  } catch (e) {
    // Ignorar errores
  }

  return {
    success: true,
    message: `👋 **¡Hola! Soy tu asistente contable IA.**

Puedo ayudarte con información sobre:

📊 **Finanzas:** "¿Cuál es mi balance?", "Muestra mi resumen financiero"
📄 **Facturas:** "¿Cuántas facturas tengo pendientes?", "Facturas vencidas"
💰 **Gastos:** "¿Cuáles son mis principales gastos?", "Gastos del mes"
👥 **Clientes:** "¿Quiénes son mis mejores clientes?", "Clientes que me deben"
📈 **Predicciones:** "Pronóstico de flujo de caja", "Tendencias"
🏛️ **Impuestos:** "Información fiscal", "Deducciones"
👔 **Nómina:** "Resumen de empleados", "Costos de nómina"

**Datos actuales:**
- ${stats.customers} clientes registrados
- ${stats.invoices} facturas
- ${stats.products} productos
- ${stats.employees} empleados

¿En qué puedo ayudarte?`,
    suggestions: generateDefaultSuggestions(),
  };
}

// ============== INTEGRACIÓN LLAMA 3 ==============

async function chatWithLlama(context: AgentContext): Promise<AgentResponse> {
  // Llamada a Llama 3 local (ollama o llama.cpp server)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...context.history,
  ];

  const response = await fetch(`${LLAMA_ENDPOINT}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Llama API error: ${response.statusText}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message.content;

  // Parsear si el modelo intenta llamar funciones
  // (Llama 3 puede ser entrenado para esto, pero requiere prompting especial)
  
  return {
    success: true,
    message: assistantMessage,
    suggestions: generateDefaultSuggestions(),
  };
}

// ============== INTEGRACIÓN MIXTRAL ==============

async function chatWithMixtral(context: AgentContext): Promise<AgentResponse> {
  // Similar a Llama, pero con endpoint de Mixtral
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...context.history,
  ];

  const response = await fetch(`${MIXTRAL_ENDPOINT}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mixtral API error: ${response.statusText}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message.content;

  return {
    success: true,
    message: assistantMessage,
    suggestions: generateDefaultSuggestions(),
  };
}

// ============== HELPERS ==============

function generateSuggestions(functionName: string): string[] {
  const suggestionMap: Record<string, string[]> = {
    create_invoice: [
      'Enviar esta factura por email',
      'Ver todas las facturas pendientes',
      'Generar reporte de ventas',
    ],
    create_expense: [
      'Analizar mis gastos del mes',
      'Ver gastos por categoría',
      'Encontrar oportunidades de ahorro',
    ],
    create_customer: [
      'Crear una factura para este cliente',
      'Ver todos los clientes',
      'Analizar ventas por cliente',
    ],
    generate_report: [
      'Exportar este reporte a PDF',
      'Comparar con el mes anterior',
      'Configurar reporte automático',
    ],
  };

  return suggestionMap[functionName] || generateDefaultSuggestions();
}

function generateDefaultSuggestions(): string[] {
  return [
    '📊 ¿Cuál es mi resumen financiero de este mes?',
    '💰 Crear una nueva factura',
    '📝 Registrar un gasto',
    '📈 Generar reporte de estado de resultados',
    '🔍 Buscar transacciones',
  ];
}

async function saveConversation(context: AgentContext, response: AgentResponse): Promise<void> {
  try {
    // Guardar mensaje del asistente
    await prisma.$executeRaw`
      INSERT INTO chat_messages (id, "conversationId", role, content, "createdAt")
      VALUES (gen_random_uuid()::text, ${context.conversationId}, 'assistant', ${response.message}, NOW())
    `;

    // Actualizar última actividad de la conversación
    await prisma.$executeRaw`
      UPDATE chat_conversations
      SET "lastMessageAt" = NOW()
      WHERE id = ${context.conversationId}
    `;
  } catch (error) {
    console.error('Error guardando conversación:', error);
  }
}

// ============== GESTIÓN DE CONVERSACIONES ==============

export async function createAgentConversation(
  companyId: string,
  userId: string,
  title?: string
): Promise<string> {
  const conversation = await prisma.$queryRaw<any[]>`
    INSERT INTO chat_conversations (id, "companyId", "userId", title, "createdAt", "updatedAt", "lastMessageAt")
    VALUES (gen_random_uuid()::text, ${companyId}, ${userId}, ${title || 'Nueva conversación'}, NOW(), NOW(), NOW())
    RETURNING id
  `;

  return conversation[0].id;
}

export async function getAgentHistory(conversationId: string, limit = 50): Promise<AgentMessage[]> {
  const messages = await prisma.$queryRaw<any[]>`
    SELECT role, content, "createdAt"
    FROM chat_messages
    WHERE "conversationId" = ${conversationId}
    ORDER BY "createdAt" ASC
    LIMIT ${limit}
  `;

  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

export async function getUserConversations(companyId: string, userId: string): Promise<any[]> {
  return await prisma.$queryRaw`
    SELECT id, title, "createdAt", "lastMessageAt"
    FROM chat_conversations
    WHERE "companyId" = ${companyId} AND "userId" = ${userId}
    ORDER BY "lastMessageAt" DESC
    LIMIT 20
  `;
}

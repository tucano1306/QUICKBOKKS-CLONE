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

import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { createExpenseWithJE } from './accounting-service';
import { prisma } from './prisma';

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
8. **LLENAR FORM 1040 (IMPUESTOS)**: Puedes llenar el formulario IRS Form 1040 con datos que el usuario te proporcione.
   - SABES EXACTAMENTE dónde va cada tipo de ingreso y gasto en el formulario
   - Conoces todas las líneas del Form 1040 y Schedule C
   - Puedes explicar dónde poner cada tipo de gasto (seguros, salarios, licencias, vehículo, etc.)
   - Calculas deducciones y estimados de impuestos

GUÍA DE UBICACIÓN EN FORM 1040 (Memoriza esto):
- Salarios W-2 → Línea 1a
- Ingresos de negocio → Schedule C → Línea 8
- Gastos de negocio → Schedule C:
  * Publicidad → Línea 8
  * Vehículo → Línea 9
  * Seguros → Línea 15
  * Servicios profesionales → Línea 17
  * Alquiler → Línea 20b
  * Suministros → Línea 22
  * Licencias e impuestos → Línea 23
  * Viajes → Línea 24a
  * Comidas (50%) → Línea 24b
  * Servicios públicos → Línea 25
  * Salarios a empleados → Línea 26

REGLAS IMPORTANTES:
- DEBES usar las funciones disponibles para ejecutar acciones reales en el sistema
- Cuando el usuario te pida crear múltiples elementos (ej: "crea 10 gastos"), DEBES llamar la función correspondiente MÚLTIPLES VECES
- Puedes ejecutar MÚLTIPLES funciones en una sola respuesta (ej: crear 10 gastos llamando create_expense 10 veces)
- SIEMPRE ejecuta las acciones que el usuario te pide, no solo describas lo que harías
- Proporciona explicaciones claras de lo que haces y por qué
- Habla siempre en español de manera profesional pero amigable
- Cuando crees entidades (facturas, gastos), proporciona los IDs generados
- Si detectas errores o inconsistencias, alertar al usuario
- CUANDO EL USUARIO PREGUNTE SOBRE IMPUESTOS O FORM 1040:
  * Usa fill_form_1040 para guardar datos en el formulario
  * Usa get_form_1040_help para explicar dónde van los gastos
  * Usa calculate_tax_deductions para estimar deducciones

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
  // ============== FUNCIONES FORM 1040 ==============
  {
    name: 'fill_form_1040',
    description: 'Llena el formulario IRS Form 1040 con los datos proporcionados. Usa esta función cuando el usuario te proporcione información de ingresos, gastos de negocio, deducciones, etc. La IA sabe exactamente en qué línea del formulario va cada dato.',
    parameters: {
      type: 'object',
      properties: {
        taxYear: {
          type: 'number',
          description: 'Año fiscal (ej: 2025)',
        },
        personalInfo: {
          type: 'object',
          description: 'Información personal del contribuyente',
          properties: {
            firstName: { type: 'string', description: 'Nombre' },
            middleInitial: { type: 'string', description: 'Inicial del segundo nombre' },
            lastName: { type: 'string', description: 'Apellido' },
            ssn: { type: 'string', description: 'Número de Seguro Social (SSN)' },
            homeAddress: { type: 'string', description: 'Dirección' },
            city: { type: 'string', description: 'Ciudad' },
            state: { type: 'string', description: 'Estado (ej: FL)' },
            zipCode: { type: 'string', description: 'Código postal' },
          },
        },
        filingStatus: {
          type: 'string',
          enum: ['SINGLE', 'MARRIED_FILING_JOINTLY', 'MARRIED_FILING_SEPARATELY', 'HEAD_OF_HOUSEHOLD', 'QUALIFYING_SURVIVING_SPOUSE'],
          description: 'Estado civil para declarar',
        },
        income: {
          type: 'object',
          description: 'Ingresos del año',
          properties: {
            wages: { type: 'number', description: 'Salarios W-2 (Línea 1a)' },
            taxableInterest: { type: 'number', description: 'Intereses gravables (Línea 2b)' },
            ordinaryDividends: { type: 'number', description: 'Dividendos ordinarios (Línea 3b)' },
            qualifiedDividends: { type: 'number', description: 'Dividendos calificados (Línea 3a)' },
            iraDistributions: { type: 'number', description: 'Distribuciones IRA (Línea 4a)' },
            taxableIRA: { type: 'number', description: 'Distribuciones IRA gravables (Línea 4b)' },
            pensionsAnnuities: { type: 'number', description: 'Pensiones y anualidades (Línea 5a)' },
            taxablePensions: { type: 'number', description: 'Pensiones gravables (Línea 5b)' },
            socialSecurity: { type: 'number', description: 'Beneficios de Seguro Social (Línea 6a)' },
            taxableSocialSecurity: { type: 'number', description: 'Seguro Social gravable (Línea 6b)' },
            capitalGainLoss: { type: 'number', description: 'Ganancia/pérdida de capital (Línea 7)' },
            otherIncome: { type: 'number', description: 'Otros ingresos (Línea 8)' },
          },
        },
        scheduleC: {
          type: 'object',
          description: 'Negocio propio / Self-Employment (Schedule C)',
          properties: {
            grossReceipts: { type: 'number', description: 'Ingresos brutos del negocio' },
            expenses: { type: 'number', description: 'Total de gastos del negocio' },
            // Gastos detallados de Schedule C
            advertising: { type: 'number', description: 'Publicidad y marketing' },
            carAndTruck: { type: 'number', description: 'Gastos de vehículo (millas o gastos reales)' },
            commissions: { type: 'number', description: 'Comisiones y honorarios' },
            insurance: { type: 'number', description: 'Seguros del negocio (salud, responsabilidad, etc.)' },
            legalAndProfessional: { type: 'number', description: 'Servicios legales y profesionales (contadores, abogados)' },
            officeExpense: { type: 'number', description: 'Gastos de oficina' },
            rentOrLease: { type: 'number', description: 'Alquiler o arrendamiento de local/equipo' },
            repairs: { type: 'number', description: 'Reparaciones y mantenimiento' },
            supplies: { type: 'number', description: 'Suministros y materiales' },
            taxes: { type: 'number', description: 'Impuestos y licencias del negocio' },
            travel: { type: 'number', description: 'Viajes de negocio' },
            meals: { type: 'number', description: 'Comidas de negocio (50% deducible)' },
            utilities: { type: 'number', description: 'Servicios públicos (electricidad, agua, internet)' },
            wages: { type: 'number', description: 'Salarios pagados a empleados' },
            otherExpenses: { type: 'number', description: 'Otros gastos del negocio' },
          },
        },
        payments: {
          type: 'object',
          description: 'Pagos y retenciones de impuestos',
          properties: {
            withholding: { type: 'number', description: 'Retención federal de W-2 (Línea 25a)' },
            estimatedPayments: { type: 'number', description: 'Pagos estimados realizados (Línea 26)' },
          },
        },
        dependents: {
          type: 'array',
          description: 'Dependientes',
          items: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              ssn: { type: 'string' },
              relationship: { type: 'string', description: 'Relación (hijo, hija, padre, etc.)' },
              childTaxCredit: { type: 'boolean', description: '¿Califica para crédito tributario por hijos?' },
            },
          },
        },
      },
      required: ['taxYear'],
    },
  },
  {
    name: 'get_form_1040_help',
    description: 'Proporciona ayuda y explicación sobre dónde van los datos en el Form 1040. Explica las líneas específicas y qué información pertenece a cada sección.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Pregunta sobre el Form 1040 (ej: "¿Dónde pongo los gastos de seguro?")',
        },
        expenseType: {
          type: 'string',
          description: 'Tipo de gasto o ingreso sobre el que pregunta',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'calculate_tax_deductions',
    description: 'Calcula las deducciones fiscales óptimas para el contribuyente basándose en sus datos',
    parameters: {
      type: 'object',
      properties: {
        filingStatus: {
          type: 'string',
          enum: ['SINGLE', 'MARRIED_FILING_JOINTLY', 'MARRIED_FILING_SEPARATELY', 'HEAD_OF_HOUSEHOLD'],
          description: 'Estado civil',
        },
        totalIncome: { type: 'number', description: 'Ingreso total' },
        businessExpenses: { type: 'number', description: 'Gastos de negocio' },
        homeOffice: { type: 'boolean', description: '¿Usa oficina en casa?' },
        vehicleExpenses: { type: 'number', description: 'Gastos de vehículo' },
        healthInsurance: { type: 'number', description: 'Seguro de salud pagado' },
      },
      required: ['filingStatus', 'totalIncome'],
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

  // Verificar si existen las cuentas contables necesarias
  const cashAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      code: '1000',
      OR: [
        { companyId: userCompany.companyId },
        { companyId: null }
      ]
    }
  });

  if (!cashAccount) {
    // Crear cuentas básicas si no existen
    await ensureBasicAccounts(userCompany.companyId);
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

// Función para asegurar que existan las cuentas básicas
async function ensureBasicAccounts(companyId: string): Promise<void> {
  const basicAccounts = [
    { code: '1000', name: 'Caja', type: 'ASSET', category: 'CURRENT_ASSET', level: 1 },
    { code: '1100', name: 'Bancos', type: 'ASSET', category: 'CURRENT_ASSET', level: 1 },
    { code: '1200', name: 'Cuentas por Cobrar', type: 'ASSET', category: 'CURRENT_ASSET', level: 1 },
    { code: '2000', name: 'Cuentas por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 1 },
    { code: '4000', name: 'Ingresos por Ventas', type: 'INCOME', category: 'OPERATING_INCOME', level: 1 },
    { code: '4900', name: 'Otros Ingresos', type: 'INCOME', category: 'OTHER_INCOME', level: 1 },
    { code: '5000', name: 'Gastos Operativos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 1 },
    { code: '5100', name: 'Gastos de Salarios', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 1 },
    { code: '5200', name: 'Gastos de Alquiler', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 1 },
    { code: '5300', name: 'Gastos de Servicios', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 1 },
    { code: '5900', name: 'Otros Gastos', type: 'EXPENSE', category: 'OTHER_EXPENSE', level: 1 },
  ];

  for (const account of basicAccounts) {
    try {
      // Buscar primero si ya existe
      const existing = await prisma.chartOfAccounts.findFirst({
        where: {
          companyId,
          code: account.code
        }
      });

      if (!existing) {
        await prisma.chartOfAccounts.create({
          data: {
            code: account.code,
            name: account.name,
            type: account.type as any,
            category: account.category as any,
            level: account.level,
            companyId,
            isActive: true,
            balance: 0
          }
        });
      }
    } catch (e) {
      console.log(`[AI-Agent] Cuenta ${account.code} ya existe:`, e instanceof Error ? e.message : 'Error desconocido');
    }
  }
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

  const revenue = invoices.reduce((sum, inv) => sum + Number.parseFloat(inv.total.toString()), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number.parseFloat(exp.amount.toString()), 0);
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

  const inflow = invoices.reduce((sum, inv) => sum + Number.parseFloat(inv.total.toString()), 0);
  const outflow = expenses.reduce((sum, exp) => sum + Number.parseFloat(exp.amount.toString()), 0);
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

  const revenue = invoices.reduce((sum, inv) => sum + Number.parseFloat(inv.total.toString()), 0);
  const deductions = expenses.reduce((sum, exp) => sum + Number.parseFloat(exp.amount.toString()), 0);
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
    byCustomer[customerName].totalSales += Number.parseFloat(invoice.total.toString());
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

// Helper para construir filtro de monto
function buildAmountFilter(minAmount?: number, maxAmount?: number) {
  const filter: any = {};
  if (minAmount) filter.gte = minAmount;
  if (maxAmount) filter.lte = maxAmount;
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// Helper para construir filtro de fecha
function buildDateFilter(startDate?: string, endDate?: string) {
  const filter: any = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

async function searchTransactions(params: any, userId: string): Promise<any> {
  const results: any = { invoices: [], expenses: [] };
  const shouldSearchInvoices = params.type === 'invoice' || params.type === 'all';
  const shouldSearchExpenses = params.type === 'expense' || params.type === 'all';

  if (shouldSearchInvoices) {
    const where: any = { userId };
    const amountFilter = buildAmountFilter(params.minAmount, params.maxAmount);
    const dateFilter = buildDateFilter(params.startDate, params.endDate);

    if (amountFilter) where.total = amountFilter;
    if (dateFilter) where.issueDate = dateFilter;

    results.invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true },
      take: 20,
    });
  }

  if (shouldSearchExpenses) {
    const where: any = { userId };
    const amountFilter = buildAmountFilter(params.minAmount, params.maxAmount);
    const dateFilter = buildDateFilter(params.startDate, params.endDate);

    if (amountFilter) where.amount = amountFilter;
    if (dateFilter) where.date = dateFilter;

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

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number.parseFloat(inv.total.toString()), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number.parseFloat(exp.amount.toString()), 0);
  const outstandingAR = unpaidInvoices.reduce((sum, inv) => sum + Number.parseFloat(inv.total.toString()), 0);

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
    byCategory[category].total += Number.parseFloat(exp.amount.toString());
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

// ============== FUNCIONES FORM 1040 ==============

/**
 * Llena el Form 1040 con los datos proporcionados por el usuario
 * La IA mapea automáticamente cada dato a la línea correcta del formulario
 */
async function fillForm1040(params: any, userId: string): Promise<any> {
  const { saveForm1040 } = await import('./form-1040-service');

  const taxYear = params.taxYear || new Date().getFullYear() - 1;

  // Construir datos de income
  const income = params.income || {};
  const calculatedIncome = {
    wages: income.wages || 0,
    taxableInterest: income.taxableInterest || 0,
    ordinaryDividends: income.ordinaryDividends || 0,
    qualifiedDividends: income.qualifiedDividends || 0,
    iraDistributions: income.iraDistributions || 0,
    taxableIRA: income.taxableIRA || 0,
    pensionsAnnuities: income.pensionsAnnuities || 0,
    taxablePensions: income.taxablePensions || 0,
    socialSecurity: income.socialSecurity || 0,
    taxableSocialSecurity: income.taxableSocialSecurity || 0,
    capitalGainLoss: income.capitalGainLoss || 0,
    otherIncome: income.otherIncome || 0,
    totalIncome: (income.wages || 0) + (income.taxableInterest || 0) +
                 (income.ordinaryDividends || 0) + (income.taxableIRA || 0) +
                 (income.taxablePensions || 0) + (income.taxableSocialSecurity || 0) +
                 (income.capitalGainLoss || 0) + (income.otherIncome || 0),
  };

  // Construir Schedule C (negocio)
  const scheduleC = params.scheduleC || {};
  let totalScheduleCExpenses = scheduleC.expenses || 0;

  // Si hay gastos detallados, sumarlos
  if (!totalScheduleCExpenses && scheduleC) {
    totalScheduleCExpenses = (scheduleC.advertising || 0) +
      (scheduleC.carAndTruck || 0) +
      (scheduleC.commissions || 0) +
      (scheduleC.insurance || 0) +
      (scheduleC.legalAndProfessional || 0) +
      (scheduleC.officeExpense || 0) +
      (scheduleC.rentOrLease || 0) +
      (scheduleC.repairs || 0) +
      (scheduleC.supplies || 0) +
      (scheduleC.taxes || 0) +
      (scheduleC.travel || 0) +
      (Math.round((scheduleC.meals || 0) * 0.5)) + // 50% deducible
      (scheduleC.utilities || 0) +
      (scheduleC.wages || 0) +
      (scheduleC.otherExpenses || 0);
  }

  const calculatedScheduleC = {
    grossReceipts: scheduleC.grossReceipts || 0,
    expenses: totalScheduleCExpenses,
    netProfit: (scheduleC.grossReceipts || 0) - totalScheduleCExpenses,
    // Detalle de gastos
    advertising: scheduleC.advertising || 0,
    carAndTruck: scheduleC.carAndTruck || 0,
    commissions: scheduleC.commissions || 0,
    insurance: scheduleC.insurance || 0,
    legalAndProfessional: scheduleC.legalAndProfessional || 0,
    officeExpense: scheduleC.officeExpense || 0,
    rentOrLease: scheduleC.rentOrLease || 0,
    repairs: scheduleC.repairs || 0,
    supplies: scheduleC.supplies || 0,
    taxes: scheduleC.taxes || 0,
    travel: scheduleC.travel || 0,
    meals: scheduleC.meals || 0,
    utilities: scheduleC.utilities || 0,
    wages: scheduleC.wages || 0,
    otherExpenses: scheduleC.otherExpenses || 0,
  };

  // Pagos
  const payments = params.payments || {};
  const calculatedPayments = {
    withholding: payments.withholding || 0,
    estimatedPayments: payments.estimatedPayments || 0,
    earnedIncomeCredit: payments.earnedIncomeCredit || 0,
    additionalChildCredit: payments.additionalChildCredit || 0,
    otherPayments: payments.otherPayments || 0,
    totalPayments: (payments.withholding || 0) + (payments.estimatedPayments || 0) +
                   (payments.earnedIncomeCredit || 0) + (payments.additionalChildCredit || 0) +
                   (payments.otherPayments || 0),
  };

  // Buscar companyId del usuario
  const userCompany = await prisma.companyUser.findFirst({
    where: { userId },
    select: { companyId: true }
  });

  try {
    const form1040 = await saveForm1040(
      {
        userId,
        companyId: userCompany?.companyId,
        taxYear,
        filingStatus: params.filingStatus || 'SINGLE',
        personalInfo: params.personalInfo || {},
        additionalDeductions: {},
        dependents: params.dependents || [],
      },
      {
        income: calculatedIncome,
        scheduleC: calculatedScheduleC,
        payments: calculatedPayments,
      }
    );

    // Crear resumen de lo que se llenó
    const summary = [];
    if (calculatedIncome.totalIncome > 0) {
      summary.push(`📊 Ingresos Totales: $${calculatedIncome.totalIncome.toLocaleString()}`);
    }
    if (calculatedScheduleC.grossReceipts > 0) {
      summary.push(
        `💼 Schedule C - Ingresos del Negocio: $${calculatedScheduleC.grossReceipts.toLocaleString()}`,
        `📝 Schedule C - Gastos del Negocio: $${calculatedScheduleC.expenses.toLocaleString()}`,
        `✅ Schedule C - Ganancia Neta: $${calculatedScheduleC.netProfit.toLocaleString()}`
      );
    }
    if (calculatedPayments.totalPayments > 0) {
      summary.push(`💰 Pagos/Retenciones: $${calculatedPayments.totalPayments.toLocaleString()}`);
    }

    return {
      success: true,
      message: `✅ Form 1040 para ${taxYear} ha sido llenado correctamente`,
      formId: form1040.id,
      summary: summary.join('\n'),
      details: {
        taxYear,
        income: calculatedIncome,
        scheduleC: calculatedScheduleC,
        payments: calculatedPayments,
        filingStatus: params.filingStatus || 'SINGLE',
      },
      nextSteps: [
        'Revise los datos en la página del Form 1040',
        'Complete la información personal si no la proporcionó',
        'Guarde el formulario para ver los cálculos de impuestos',
      ],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Error al guardar el Form 1040. Por favor intente de nuevo.',
    };
  }
}

/**
 * Proporciona ayuda sobre dónde van los datos en el Form 1040
 */
async function getForm1040Help(params: any): Promise<any> {
  const question = params.question?.toLowerCase() || '';
  const expenseType = params.expenseType?.toLowerCase() || '';

  // Base de conocimiento sobre Form 1040
  const form1040Knowledge: Record<string, any> = {
    // Seguros
    seguro: {
      line: 'Schedule C, Línea 15 (Insurance)',
      explanation: '🏥 Los seguros del negocio (responsabilidad civil, salud para empleados, propiedad) van en Schedule C Línea 15. El seguro de salud del dueño puede ser deducible en la Línea 16 del Form 1040 como ajuste.',
      deductible: true,
    },
    insurance: {
      line: 'Schedule C, Línea 15',
      explanation: '🏥 Business insurance goes on Schedule C Line 15. Self-employed health insurance is an above-the-line deduction on Form 1040 Line 16.',
      deductible: true,
    },
    // Salarios
    salario: {
      line: 'Schedule C, Línea 26 (Wages)',
      explanation: '👥 Los salarios pagados a empleados van en Schedule C Línea 26. Incluye sueldos, bonos y comisiones. No incluya su propio "salario" como dueño - eso es ganancia del negocio.',
      deductible: true,
    },
    wages: {
      line: 'Schedule C, Línea 26',
      explanation: '👥 Wages paid to employees go on Schedule C Line 26. This includes salaries, bonuses, and commissions.',
      deductible: true,
    },
    // Licencias
    licencia: {
      line: 'Schedule C, Línea 23 (Taxes and Licenses)',
      explanation: '📜 Las licencias de negocio, permisos y registros van en Schedule C Línea 23 junto con impuestos del negocio (no impuestos federales sobre la renta).',
      deductible: true,
    },
    license: {
      line: 'Schedule C, Línea 23',
      explanation: '📜 Business licenses, permits, and registrations go on Schedule C Line 23 along with business taxes.',
      deductible: true,
    },
    // Vehículo
    vehiculo: {
      line: 'Schedule C, Línea 9 (Car and Truck Expenses)',
      explanation: '🚗 Gastos de vehículo para negocio van en Schedule C Línea 9. Puede usar el método estándar ($0.67/milla en 2024) o gastos reales (gasolina, seguro, mantenimiento).',
      deductible: true,
    },
    car: {
      line: 'Schedule C, Línea 9',
      explanation: '🚗 Vehicle expenses for business go on Schedule C Line 9. Use standard mileage rate or actual expenses.',
      deductible: true,
    },
    // Publicidad
    publicidad: {
      line: 'Schedule C, Línea 8 (Advertising)',
      explanation: '📢 Gastos de publicidad y marketing van en Schedule C Línea 8. Incluye anuncios online, tarjetas de presentación, letreros, etc.',
      deductible: true,
    },
    advertising: {
      line: 'Schedule C, Línea 8',
      explanation: '📢 Advertising and marketing expenses go on Schedule C Line 8.',
      deductible: true,
    },
    // Alquiler
    alquiler: {
      line: 'Schedule C, Línea 20b (Rent - Other)',
      explanation: '🏢 Alquiler de local comercial o equipo va en Schedule C Línea 20b. Si trabaja desde casa, puede usar la deducción de oficina en casa.',
      deductible: true,
    },
    rent: {
      line: 'Schedule C, Línea 20b',
      explanation: '🏢 Rent for business property or equipment goes on Schedule C Line 20b.',
      deductible: true,
    },
    // Servicios profesionales
    contador: {
      line: 'Schedule C, Línea 17 (Legal and Professional Services)',
      explanation: '⚖️ Honorarios de contadores, abogados y otros profesionales van en Schedule C Línea 17.',
      deductible: true,
    },
    legal: {
      line: 'Schedule C, Línea 17',
      explanation: '⚖️ Legal and professional fees go on Schedule C Line 17.',
      deductible: true,
    },
    // Suministros
    suministros: {
      line: 'Schedule C, Línea 22 (Supplies)',
      explanation: '📦 Suministros y materiales del negocio van en Schedule C Línea 22. Incluye materiales de oficina, herramientas pequeñas, etc.',
      deductible: true,
    },
    supplies: {
      line: 'Schedule C, Línea 22',
      explanation: '📦 Business supplies and materials go on Schedule C Line 22.',
      deductible: true,
    },
    // Comidas
    comida: {
      line: 'Schedule C, Línea 24b (Meals - 50%)',
      explanation: '🍽️ Comidas de negocio son 50% deducibles y van en Schedule C Línea 24b. Debe haber propósito de negocio claro.',
      deductible: true,
      percentage: 50,
    },
    meals: {
      line: 'Schedule C, Línea 24b',
      explanation: '🍽️ Business meals are 50% deductible on Schedule C Line 24b.',
      deductible: true,
      percentage: 50,
    },
    // Viajes
    viaje: {
      line: 'Schedule C, Línea 24a (Travel)',
      explanation: '✈️ Gastos de viaje de negocio (hotel, avión, etc.) van en Schedule C Línea 24a. Deben ser viajes lejos de su área de trabajo normal.',
      deductible: true,
    },
    travel: {
      line: 'Schedule C, Línea 24a',
      explanation: '✈️ Business travel expenses go on Schedule C Line 24a.',
      deductible: true,
    },
    // Utilidades
    utilidad: {
      line: 'Schedule C, Línea 25 (Utilities)',
      explanation: '💡 Servicios públicos del negocio (electricidad, agua, internet, teléfono) van en Schedule C Línea 25.',
      deductible: true,
    },
    utilities: {
      line: 'Schedule C, Línea 25',
      explanation: '💡 Business utilities go on Schedule C Line 25.',
      deductible: true,
    },
    // Ingresos
    ingreso: {
      line: 'Form 1040, Líneas 1-8 + Schedule C',
      explanation: '💵 Los ingresos dependen del tipo: Salarios W-2 → Línea 1a. Negocio propio → Schedule C → Línea 8. Intereses → Línea 2b. Dividendos → Línea 3b.',
      deductible: false,
    },
  };

  // Buscar respuesta
  let response = null;
  for (const [key, value] of Object.entries(form1040Knowledge)) {
    if (question.includes(key) || expenseType.includes(key)) {
      response = value;
      break;
    }
  }

  if (!response) {
    // Respuesta genérica con guía completa
    return {
      success: true,
      message: '📋 Guía Rápida del Form 1040 para Negocios:',
      guide: {
        scheduleC: {
          title: 'Schedule C - Ganancias/Pérdidas del Negocio',
          lines: {
            'Línea 1': 'Ingresos brutos del negocio',
            'Línea 8': 'Publicidad y marketing',
            'Línea 9': 'Gastos de vehículo',
            'Línea 15': 'Seguros del negocio',
            'Línea 17': 'Servicios legales y profesionales',
            'Línea 20b': 'Alquiler de local/equipo',
            'Línea 22': 'Suministros',
            'Línea 23': 'Impuestos y licencias',
            'Línea 24a': 'Viajes de negocio',
            'Línea 24b': 'Comidas (50% deducible)',
            'Línea 25': 'Servicios públicos',
            'Línea 26': 'Salarios a empleados',
            'Línea 27': 'Otros gastos',
          },
        },
        form1040: {
          title: 'Form 1040 Principal',
          lines: {
            'Línea 1a': 'Salarios W-2',
            'Línea 2b': 'Intereses gravables',
            'Línea 3b': 'Dividendos ordinarios',
            'Línea 8': 'Otros ingresos (incluye Schedule C)',
            'Línea 12': 'Deducción estándar',
            'Línea 25a': 'Retención federal W-2',
            'Línea 26': 'Pagos estimados',
          },
        },
      },
      tip: '💡 Si me dice qué tipo de gasto tiene, le digo exactamente dónde ponerlo.',
    };
  }

  return {
    success: true,
    ...response,
    tip: 'Si necesita ayuda con otro gasto, solo pregúnteme.',
  };
}

/**
 * Calcula las deducciones fiscales óptimas
 */
async function calculateTaxDeductions(params: any): Promise<any> {
  const { calculateStandardDeduction } = await import('./form-1040-service');

  const filingStatus = params.filingStatus || 'SINGLE';
  const totalIncome = params.totalIncome || 0;
  const businessExpenses = params.businessExpenses || 0;
  const vehicleExpenses = params.vehicleExpenses || 0;
  const healthInsurance = params.healthInsurance || 0;

  // Calcular deducción estándar
  const standardDeduction = calculateStandardDeduction(filingStatus);

  // Calcular deducciones itemizadas potenciales
  const itemizedDeductions = {
    stateAndLocalTaxes: Math.min(10000, totalIncome * 0.05), // SALT cap $10,000
    mortgageInterest: 0, // Usuario debe proporcionar
    charitableContributions: 0, // Usuario debe proporcionar
    medicalExpenses: 0, // Solo si excede 7.5% del AGI
  };

  const totalItemized = Object.values(itemizedDeductions).reduce((a, b) => a + b, 0);

  // Deducciones del negocio (Schedule C)
  const businessDeductions = {
    totalExpenses: businessExpenses,
    vehicleExpenses: vehicleExpenses,
    healthInsurance: healthInsurance, // Deducción above-the-line
    selfEmploymentTax: (totalIncome - businessExpenses) * 0.0765, // 7.65% deducción SE tax
    qbiDeduction: Math.min((totalIncome - businessExpenses) * 0.2, 0), // 20% QBI si califica
  };

  // Recomendación
  const recommendItemized = totalItemized > standardDeduction;

  return {
    success: true,
    analysis: {
      standardDeduction,
      itemizedDeductions: totalItemized,
      recommendation: recommendItemized ? 'ITEMIZAR' : 'DEDUCCIÓN ESTÁNDAR',
      savings: recommendItemized
        ? totalItemized - standardDeduction
        : standardDeduction - totalItemized,
    },
    businessDeductions,
    taxEstimate: {
      adjustedGrossIncome: totalIncome - businessExpenses - healthInsurance,
      taxableIncome: Math.max(0, totalIncome - businessExpenses - healthInsurance - standardDeduction),
      estimatedTax: calculateEstimatedTax(totalIncome - businessExpenses - healthInsurance - standardDeduction, filingStatus),
      selfEmploymentTax: (totalIncome - businessExpenses) * 0.153, // 15.3% SE tax
    },
    tips: [
      '💡 Maximice las deducciones del Schedule C documentando todos los gastos',
      '🚗 Use el método estándar de millas si sus gastos reales son menores',
      '🏥 El seguro de salud por cuenta propia es una deducción above-the-line',
      '📱 No olvide deducir el % de uso comercial de celular e internet',
    ],
  };
}

// Helper para calcular impuesto estimado
function calculateEstimatedTax(taxableIncome: number, filingStatus: string): number {
  if (taxableIncome <= 0) return 0;

  // Tax brackets 2024 simplificados
  const brackets = filingStatus === 'MARRIED_FILING_JOINTLY'
    ? [
        { limit: 23200, rate: 0.1 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ]
    : [
        { limit: 11600, rate: 0.1 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ];

  let tax = 0;
  let remainingIncome = taxableIncome;
  let previousLimit = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
    previousLimit = bracket.limit;
  }

  return Math.round(tax);
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
    // ========== FUNCIONES FORM 1040 ==========
    case 'fill_form_1040':
      return await fillForm1040(args, userId);
    case 'get_form_1040_help':
      return await getForm1040Help(args);
    case 'calculate_tax_deductions':
      return await calculateTaxDeductions(args);
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

  // Primera llamada - puede incluir tool calling
  const tools = AGENT_FUNCTIONS.map(fn => ({
    type: 'function' as const,
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    }
  }));

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 1000,
  });

  const assistantMessage = completion.choices[0].message;
  const actions: any[] = [];

  // Si el asistente quiere llamar una función
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = toolCall.function.arguments;

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
    const updatedMessages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      },
      {
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      }
    ];

    const secondCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: updatedMessages,
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

// Helper para obtener datos de la compañía
async function getCompanyData(companyId: string): Promise<string> {
  try {
    const company = await prisma.company.findFirst({
      where: { id: companyId }
    });

    if (company) {
      const [customerCount, invoiceCount, expenseCount] = await Promise.all([
        prisma.customer.count({ where: { companyId } }),
        prisma.invoice.count({ where: { companyId } }),
        prisma.expense.count({ where: { companyId } })
      ]);

      return `
Datos de la empresa actual:
- Nombre: ${company.name}
- Clientes: ${customerCount}
- Facturas: ${invoiceCount}
- Gastos: ${expenseCount}
`;
    }
  } catch (e) {
    console.log('[AI-Agent] No se pudieron cargar datos de la empresa:', e instanceof Error ? e.message : 'Error desconocido');
  }
  return '';
}

// Helper para detectar si el usuario quiere crear un catálogo de cuentas
function wantsToCreateChartOfAccounts(message: string): boolean {
  const createKeywords = ['crear', 'generar', 'crea', 'créa'];
  const chartKeywords = ['catálogo', 'catalogo', 'cuentas', 'plan de cuentas'];
  const msgLower = message.toLowerCase();

  return createKeywords.some(k => msgLower.includes(k)) &&
         chartKeywords.some(k => msgLower.includes(k));
}

// Helper para crear respuesta de catálogo de cuentas
function createChartOfAccountsResponse(catalogResult: any): AgentResponse {
  if (!catalogResult || catalogResult.error) {
    return {
      success: false,
      message: `❌ Hubo un problema creando el catálogo: ${catalogResult?.error || 'Error desconocido'}. Por favor intenta nuevamente.`,
      suggestions: ['Intentar de nuevo', 'Crear catálogo manualmente'],
    };
  }

  const responseMessage = `✅ **¡Catálogo de Cuentas Creado Exitosamente!**

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
}

// Helper para ejecutar tool calls
async function executeToolCalls(toolCalls: any[], userId: string): Promise<{actions: any[], toolResults: any[]}> {
  const actions: any[] = [];
  const toolResults: any[] = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionArgs = toolCall.function.arguments;

    console.log('[AI-Agent] Ejecutando función:', functionName, 'con args:', functionArgs);

    const functionResult = await executeFunction(functionName, functionArgs, userId);
    console.log('[AI-Agent] Resultado de función:', functionResult);

    actions.push({
      type: functionName,
      description: `Ejecutando: ${functionName}`,
      result: functionResult,
    });

    toolResults.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      name: functionName,
      content: JSON.stringify(functionResult),
    });
  }

  return { actions, toolResults };
}

async function chatWithGroq(context: AgentContext): Promise<AgentResponse> {
  if (!groq) {
    throw new Error('Groq no está configurado. Establece GROQ_API_KEY en .env');
  }

  const companyData = await getCompanyData(context.companyId);
  const systemPromptWithContext = SYSTEM_PROMPT + '\n\n' + companyData;

  // Detectar si el usuario quiere crear un catálogo de cuentas
  const userMessage = context.history.at(-1)?.content || '';

  if (wantsToCreateChartOfAccounts(userMessage)) {
    const catalogResult = await generateChartOfAccounts(context, userMessage);
    return createChartOfAccountsResponse(catalogResult);
  }

  // Convertir AGENT_FUNCTIONS a formato de tools para Groq
  const tools = AGENT_FUNCTIONS.map(fn => ({
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    }
  }));

  const messages: any[] = [
    { role: 'system', content: systemPromptWithContext },
    ...context.history.map(m => ({ role: m.role, content: m.content })),
  ];

  // Primera llamada - puede incluir tool calling
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 2000,
  });

  const assistantMessage = completion.choices[0]?.message;

  // Si el asistente quiere llamar una función (tool)
  if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
    console.log('[AI-Agent] Groq tool_calls detectados:', assistantMessage.tool_calls);

    const { actions, toolResults } = await executeToolCalls(assistantMessage.tool_calls, context.userId);

    // Segunda llamada con los resultados de las funciones
    const updatedMessages = [
      ...messages,
      {
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      },
      ...toolResults
    ];

    const secondCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: updatedMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const finalMessage = secondCompletion.choices[0]?.message;

    return {
      success: true,
      message: finalMessage?.content || 'Acción completada',
      actions,
      data: actions.length === 1 ? actions[0].result : actions.map(a => a.result),
      suggestions: generateSuggestions(actions[0]?.type),
    };
  }

  // Si no hay tool call, respuesta directa
  return {
    success: true,
    message: assistantMessage?.content || 'Lo siento, no pude procesar tu solicitud.',
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
      cleanContent = content.replaceAll('```json\n', '').replaceAll('```json', '').replaceAll('```\n', '').replaceAll('```', '');
    } else if (content.includes('```')) {
      cleanContent = content.replaceAll('```\n', '').replaceAll('```', '');
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
              type: account.type,
              category: category,
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
    console.log('[AI-Agent] No se pudieron cargar estadísticas:', e instanceof Error ? e.message : 'Error desconocido');
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

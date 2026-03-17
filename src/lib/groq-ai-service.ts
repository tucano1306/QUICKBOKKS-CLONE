/**
 * Groq AI Service - Procesamiento de Documentos con IA GRATIS
 * 
 * Usa Groq API con Llama 3 70B para:
 * - Extracción de datos de facturas/recibos
 * - Categorización contable automática
 * - Sugerencias de asientos contables
 * 
 * 🆓 14,400 requests/día GRATIS
 * ⚡ Ultra-rápido (~100 tokens/segundo)
 * 
 * Configuración:
 * 1. Crear cuenta en https://console.groq.com
 * 2. Obtener API Key
 * 3. Agregar a .env.local: GROQ_API_KEY=gsk_xxxxx
 */

import Groq from 'groq-sdk'

// Inicializar cliente Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
})

// Modelos disponibles en Groq (todos gratis)
export const GROQ_MODELS = {
  LLAMA_70B: 'llama-3.3-70b-versatile',      // Mejor calidad
  LLAMA_8B: 'llama-3.1-8b-instant',          // Más rápido
  MIXTRAL: 'mixtral-8x7b-32768',             // Buen balance
  GEMMA: 'gemma2-9b-it'                       // Alternativa
} as const

// Tipos
export interface DocumentExtractionResult {
  success: boolean
  documentType: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'EXPENSE' | 'OTHER'
  confidence: number
  data: {
    vendor: string | null
    invoiceNumber: string | null
    date: string | null
    dueDate: string | null
    subtotal: number | null
    taxAmount: number | null
    total: number | null
    currency: string
    description: string | null
    lineItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      amount: number
    }>
    taxId: string | null
    paymentMethod: string | null
  }
  suggestedCategory: string
  suggestedAccountCode: string
  reasoning: string
  processingTimeMs: number
}

export interface CategorizationResult {
  category: string
  accountCode: string
  accountName: string
  confidence: number
  reasoning: string
  isDeductible: boolean
  taxCategory: string | null
}

/**
 * Verificar si Groq está configurado
 */
export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY || ''
  return key.length > 10 && key !== 'tu-api-key-de-groq' && key.startsWith('gsk_')
}

/**
 * Extraer datos de un documento usando Llama 3
 */
export async function extractDocumentData(
  text: string,
  filename: string,
  mimeType: string
): Promise<DocumentExtractionResult> {
  const startTime = Date.now()
  
  if (!isGroqConfigured()) {
    return {
      success: false,
      documentType: 'OTHER',
      confidence: 0,
      data: {
        vendor: null,
        invoiceNumber: null,
        date: null,
        dueDate: null,
        subtotal: null,
        taxAmount: null,
        total: null,
        currency: 'USD',
        description: null,
        lineItems: [],
        taxId: null,
        paymentMethod: null
      },
      suggestedCategory: 'Sin categorizar',
      suggestedAccountCode: '6000',
      reasoning: 'Groq API no configurada. Agrega GROQ_API_KEY a .env.local',
      processingTimeMs: Date.now() - startTime
    }
  }

  try {
    const prompt = `Eres un experto contador en Florida, USA. Analiza el siguiente texto extraído de un documento y extrae toda la información relevante.

TEXTO DEL DOCUMENTO:
"""
${text.substring(0, 4000)}
"""

NOMBRE DEL ARCHIVO: ${filename}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`) con esta estructura exacta:
{
  "documentType": "INVOICE" | "RECEIPT" | "BANK_STATEMENT" | "EXPENSE" | "OTHER",
  "confidence": 0-100,
  "vendor": "nombre del proveedor o null",
  "invoiceNumber": "número de factura o null",
  "date": "YYYY-MM-DD o null",
  "dueDate": "YYYY-MM-DD o null",
  "subtotal": número o null,
  "taxAmount": número o null (Florida sales tax 7%),
  "total": número o null,
  "currency": "USD",
  "description": "descripción breve del documento",
  "lineItems": [{"description": "item", "quantity": 1, "unitPrice": 100, "amount": 100}],
  "taxId": "EIN/Tax ID del proveedor o null",
  "paymentMethod": "CASH|CHECK|CREDIT_CARD|TRANSFER|OTHER o null",
  "suggestedCategory": "categoría de gasto sugerida",
  "suggestedAccountCode": "código de cuenta contable (4 dígitos)",
  "reasoning": "explicación breve de la categorización"
}`

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_70B,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de contabilidad experto en Florida, USA. Respondes solo con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content || '{}'
    let parsed: any
    
    try {
      parsed = JSON.parse(content)
    } catch {
      // Si falla el parse, intentar limpiar el contenido
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    return {
      success: true,
      documentType: parsed.documentType || 'OTHER',
      confidence: parsed.confidence || 50,
      data: {
        vendor: parsed.vendor || null,
        invoiceNumber: parsed.invoiceNumber || null,
        date: parsed.date || null,
        dueDate: parsed.dueDate || null,
        subtotal: parsed.subtotal || null,
        taxAmount: parsed.taxAmount || null,
        total: parsed.total || null,
        currency: parsed.currency || 'USD',
        description: parsed.description || null,
        lineItems: parsed.lineItems || [],
        taxId: parsed.taxId || null,
        paymentMethod: parsed.paymentMethod || null
      },
      suggestedCategory: parsed.suggestedCategory || 'Gastos Generales',
      suggestedAccountCode: parsed.suggestedAccountCode || '6000',
      reasoning: parsed.reasoning || 'Categorizado automáticamente',
      processingTimeMs: Date.now() - startTime
    }

  } catch (error) {
    console.error('Error en Groq:', error)
    return {
      success: false,
      documentType: 'OTHER',
      confidence: 0,
      data: {
        vendor: null,
        invoiceNumber: null,
        date: null,
        dueDate: null,
        subtotal: null,
        taxAmount: null,
        total: null,
        currency: 'USD',
        description: null,
        lineItems: [],
        taxId: null,
        paymentMethod: null
      },
      suggestedCategory: 'Sin categorizar',
      suggestedAccountCode: '6000',
      reasoning: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      processingTimeMs: Date.now() - startTime
    }
  }
}

/**
 * Categorizar una transacción bancaria
 */
export async function categorizeTransaction(
  description: string,
  amount: number,
  merchantName?: string
): Promise<CategorizationResult> {
  if (!isGroqConfigured()) {
    return {
      category: 'Sin categorizar',
      accountCode: '6000',
      accountName: 'Gastos Generales',
      confidence: 0,
      reasoning: 'Groq API no configurada',
      isDeductible: false,
      taxCategory: null
    }
  }

  try {
    const prompt = `Eres un contador experto en Florida, USA. Categoriza esta transacción:

Descripción: ${description}
Monto: $${amount.toFixed(2)}
${merchantName ? `Comercio: ${merchantName}` : ''}

Responde SOLO con JSON válido:
{
  "category": "nombre de la categoría",
  "accountCode": "código de 4 dígitos",
  "accountName": "nombre de la cuenta contable",
  "confidence": 0-100,
  "reasoning": "explicación breve",
  "isDeductible": true/false,
  "taxCategory": "categoría para impuestos o null"
}

Usa estas categorías comunes:
- 5000 Costo de Ventas
- 6100 Salarios y Nómina
- 6200 Alquiler
- 6300 Servicios Públicos
- 6400 Seguros
- 6500 Suministros de Oficina
- 6600 Marketing y Publicidad
- 6700 Viajes y Transporte
- 6800 Comidas y Entretenimiento
- 6900 Servicios Profesionales
- 7000 Depreciación
- 7100 Intereses`

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_8B, // Más rápido para categorizaciones simples
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')

    return {
      category: parsed.category || 'Gastos Generales',
      accountCode: parsed.accountCode || '6000',
      accountName: parsed.accountName || 'Gastos Generales',
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'Categorizado automáticamente',
      isDeductible: parsed.isDeductible || false,
      taxCategory: parsed.taxCategory || null
    }

  } catch (error) {
    console.error('Error categorizando:', error)
    return {
      category: 'Sin categorizar',
      accountCode: '6000',
      accountName: 'Gastos Generales',
      confidence: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      isDeductible: false,
      taxCategory: null
    }
  }
}

/**
 * Generar sugerencia de asiento contable
 */
export async function suggestJournalEntry(
  documentData: DocumentExtractionResult['data'],
  documentType: string
): Promise<{
  description: string
  entries: Array<{
    accountCode: string
    accountName: string
    debit: number
    credit: number
  }>
}> {
  if (!isGroqConfigured() || !documentData.total) {
    return {
      description: 'Asiento pendiente de revisión',
      entries: []
    }
  }

  try {
    const prompt = `Genera un asiento contable para este documento:

Tipo: ${documentType}
Proveedor: ${documentData.vendor || 'Desconocido'}
Total: $${documentData.total}
Impuesto: $${documentData.taxAmount || 0}
Descripción: ${documentData.description || 'Sin descripción'}

Responde SOLO con JSON:
{
  "description": "descripción del asiento",
  "entries": [
    {"accountCode": "1000", "accountName": "Banco", "debit": 0, "credit": 100},
    {"accountCode": "6500", "accountName": "Gasto", "debit": 100, "credit": 0}
  ]
}

Asegúrate que débitos = créditos`

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_8B,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')

    return {
      description: parsed.description || 'Asiento generado por IA',
      entries: parsed.entries || []
    }

  } catch (error) {
    console.error('Error generando asiento:', error)
    return {
      description: 'Error generando asiento',
      entries: []
    }
  }
}

/**
 * Chat con el asistente contable
 */
export async function chatWithAccountant(
  message: string,
  context?: {
    companyName?: string
    recentTransactions?: string
    currentBalance?: number
  }
): Promise<string> {
  if (!isGroqConfigured()) {
    return 'El asistente IA no está configurado. Agrega GROQ_API_KEY a tu archivo .env.local para habilitarlo.'
  }

  try {
    const systemPrompt = `Eres un asistente contable experto especializado en pequeñas empresas en Florida, USA.

Conoces:
- Impuestos de Florida (7% sales tax, sin income tax estatal)
- Contabilidad GAAP para pequeñas empresas
- Facturación y cuentas por cobrar/pagar
- Nómina y obligaciones fiscales

${context?.companyName ? `Empresa del usuario: ${context.companyName}` : ''}
${context?.currentBalance ? `Balance actual: $${context.currentBalance.toFixed(2)}` : ''}

Responde de forma concisa y práctica en español.`

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_70B,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    return response.choices[0]?.message?.content || 'No pude procesar tu pregunta.'

  } catch (error) {
    console.error('Error en chat:', error)
    return `Error al procesar tu pregunta: ${error instanceof Error ? error.message : 'Error desconocido'}`
  }
}

/**
 * Analizar tendencias financieras
 */
export async function analyzeFinancialTrends(
  data: {
    income: number[]
    expenses: number[]
    months: string[]
  }
): Promise<{
  summary: string
  insights: string[]
  recommendations: string[]
}> {
  if (!isGroqConfigured()) {
    return {
      summary: 'IA no configurada',
      insights: [],
      recommendations: ['Configura GROQ_API_KEY para habilitar análisis con IA']
    }
  }

  try {
    const prompt = `Analiza estos datos financieros de una empresa en Florida:

Meses: ${data.months.join(', ')}
Ingresos: $${data.income.join(', $')}
Gastos: $${data.expenses.join(', $')}

Responde con JSON:
{
  "summary": "resumen en 2-3 oraciones",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendación 1", "recomendación 2"]
}`

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_70B,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')

    return {
      summary: parsed.summary || 'Análisis no disponible',
      insights: parsed.insights || [],
      recommendations: parsed.recommendations || []
    }

  } catch (error) {
    console.error('Error analizando tendencias:', error)
    return {
      summary: 'Error en el análisis',
      insights: [],
      recommendations: []
    }
  }
}

// Exportar instancia de Groq para uso directo si es necesario
export { groq }

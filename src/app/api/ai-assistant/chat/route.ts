import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Este endpoint maneja las conversaciones con el AI Assistant
// En producción, aquí integrarías OpenAI GPT-4, Anthropic Claude, o tu propio modelo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, message, conversationHistory } = body

    if (!companyId || !message) {
      return NextResponse.json(
        { error: 'Missing companyId or message' },
        { status: 400 }
      )
    }

    // Aquí es donde integrarías con OpenAI o tu servicio de IA
    // Por ahora, retornamos respuestas mock inteligentes basadas en el input

    const aiResponse = generateMockAIResponse(message, companyId)

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

// Mock AI response generator
// En producción, esto se reemplazaría con llamadas a OpenAI API:
// const response = await openai.chat.completions.create({
//   model: "gpt-4",
//   messages: [
//     { role: "system", content: "Eres un asistente contable experto..." },
//     ...conversationHistory,
//     { role: "user", content: message }
//   ]
// })
function generateMockAIResponse(message: string, companyId: string) {
  const lowerMessage = message.toLowerCase()

  // Balance / Finanzas
  if (lowerMessage.includes('balance') || lowerMessage.includes('saldo')) {
    return {
      content: `📊 **Balance General Actual:**

**Activos:** $485,250
- Efectivo: $125,000
- Cuentas por Cobrar: $180,500
- Inventario: $95,750
- Equipo: $84,000

**Pasivos:** $215,300
- Cuentas por Pagar: $98,200
- Préstamos: $117,100

**Capital:** $269,950

💡 Tu empresa está en buena posición financiera con un ratio de liquidez de 2.25. Recomiendo mantener al menos 3 meses de gastos operativos en efectivo.`,
      suggestions: [
        '¿Cómo puedo mejorar mi flujo de caja?',
        'Analiza mis cuentas por cobrar',
        'Muéstrame gastos del mes'
      ]
    }
  }

  // Facturas
  if (lowerMessage.includes('factura') || lowerMessage.includes('invoice')) {
    return {
      content: `📄 **Resumen de Facturas:**

**Facturas Pendientes:** 12 facturas por $45,680
- Vencidas: 3 facturas ($12,500)
- Por vencer (próximos 7 días): 5 facturas ($18,900)

**Facturas Pagadas Este Mes:** 23 facturas por $87,320

⚠️ **Alerta:** Tienes 3 facturas vencidas. Te recomiendo enviar recordatorios de pago automáticos.

🎯 **Acción Recomendada:** 
- Contactar clientes con facturas vencidas
- Activar recordatorios automáticos en Configuración > Facturación`,
      suggestions: [
        'Crea una nueva factura',
        'Envía recordatorio a clientes',
        '¿Qué cliente me debe más?'
      ]
    }
  }

  // Gastos
  if (lowerMessage.includes('gasto') || lowerMessage.includes('expense')) {
    return {
      content: `💰 **Análisis de Gastos del Mes:**

**Total Gastos Noviembre:** $34,580

**Top 5 Categorías:**
1. Nómina: $18,500 (53%)
2. Renta/Oficina: $6,200 (18%)
3. Suministros: $3,450 (10%)
4. Tecnología/Software: $2,890 (8%)
5. Marketing: $2,340 (7%)

📈 **Comparación:** 
- vs Mes Anterior: +12% ⬆️
- vs Presupuesto: +5% (dentro del rango)

💡 **Insight:** El aumento en gastos se debe principalmente a contrataciones. Los gastos operativos están bajo control.`,
      suggestions: [
        'Registra un nuevo gasto',
        'Ver gastos deducibles de impuestos',
        'Comparar con trimestre pasado'
      ]
    }
  }

  // Flujo de caja
  if (lowerMessage.includes('flujo') || lowerMessage.includes('cash flow') || lowerMessage.includes('predic')) {
    return {
      content: `📊 **Predicción de Flujo de Caja (ML Model):**

**Próximos 30 días:**
- Entradas esperadas: $92,500
- Salidas proyectadas: $78,300
- Balance final estimado: +$14,200 ✅

**Próximos 90 días:**
- Entradas: $287,600
- Salidas: $234,800
- Balance: +$52,800

🤖 **Análisis IA:**
- Probabilidad de déficit: 8% (Bajo riesgo)
- Meses para cubrir gastos operativos: 4.2 meses
- Recomendación: MANTENER estrategia actual

⚠️ **Atención:** Diciembre suele tener más gastos. Considera mantener un colchón extra.`,
      suggestions: [
        '¿Cuándo recibiré mis próximos pagos?',
        'Simula escenario con 20% menos ventas',
        'Ver tendencia histórica'
      ]
    }
  }

  // Impuestos
  if (lowerMessage.includes('impuesto') || lowerMessage.includes('tax') || lowerMessage.includes('sat')) {
    return {
      content: `🏛️ **Resumen Fiscal:**

**Obligaciones Próximas:**
- IVA Noviembre: Vence 17-Dic (23 días) - Estimado: $12,450
- ISR Provisional: Vence 17-Dic - Estimado: $8,920
- Retenciones: Vence 17-Dic - $3,240

**Gastos Deducibles YTD:**
- Total: $289,340
- Deducción estimada: $86,802 (30%)

**CFDI Emitidos:** 145 facturas este mes
**CFDI Recibidos:** 89 gastos documentados

✅ **Compliance:** Todos tus CFDI están timbrados correctamente.

💡 **Oportunidad:** Tienes $4,560 en gastos sin CFDI. Solicita facturas para maximizar deducciones.`,
      suggestions: [
        'Ver calendario fiscal completo',
        'Gastos sin factura electrónica',
        'Estima mi ISR anual'
      ]
    }
  }

  // Nómina
  if (lowerMessage.includes('nómi') || lowerMessage.includes('nomi') || lowerMessage.includes('payroll') || lowerMessage.includes('empleado')) {
    return {
      content: `👥 **Resumen de Nómina:**

**Empleados Activos:** 12 personas

**Nómina Quincenal Actual:**
- Sueldos Brutos: $89,450
- ISR Retenido: $12,340
- IMSS: $8,920
- Neto a Pagar: $68,190

**Próximo Pago:** 30-Nov-2025 (5 días)

**Pendientes:**
- 3 empleados sin firma de recibo
- 1 alta pendiente en IMSS

⚠️ **Alerta:** Recuerda hacer dispersión antes del 30-Nov para evitar multas.

📋 **Checklist:**
✅ Cálculos revisados
✅ Recibos generados
⏳ Firmas pendientes
⏳ Dispersión bancaria`,
      suggestions: [
        'Genera recibos de nómina',
        'Envía recibos por email',
        'Ver deducciones fiscales de nómina'
      ]
    }
  }

  // Clientes
  if (lowerMessage.includes('cliente') || lowerMessage.includes('customer') || lowerMessage.includes('debe')) {
    return {
      content: `👥 **Análisis de Clientes:**

**Top 5 Clientes por Revenue:**
1. Tech Solutions Inc. - $145,680 YTD
2. Global Marketing LLC - $98,450
3. E-Commerce Ventures - $87,200
4. Cloud Services Corp - $76,340
5. Startup Ventures - $54,890

**Clientes con Balance Pendiente:**
- Tech Solutions: $12,500 (vencido)
- Marketing Agency: $8,900 (7 días)
- Consulting Partners: $6,780 (corriente)

📊 **Métricas:**
- Días promedio de pago: 32 días
- Tasa de morosidad: 8%
- Cliente más puntual: Global Marketing LLC

💡 **Recomendación:** Ofrece descuento del 5% por pago anticipado para mejorar flujo de caja.`,
      suggestions: [
        'Envía recordatorio a clientes morosos',
        'Crear reporte de aging',
        'Ver historial de pagos por cliente'
      ]
    }
  }

  // Categorización
  if (lowerMessage.includes('categoriz') || lowerMessage.includes('clasific') || lowerMessage.includes('transaction')) {
    return {
      content: `🤖 **Motor de Auto-Categorización:**

**Última Ejecución:** Hace 2 horas

**Resultados:**
- Transacciones procesadas: 47
- Auto-categorizadas (>90% confianza): 42 (89%)
- Requieren revisión (<90%): 5 (11%)

**Transacciones Pendientes de Revisión:**
1. UBER $45.80 - Viaje o Comidas? (82% confianza)
2. STARBUCKS $28.50 - Comidas o Oficina? (75%)
3. AMAZON $127.90 - Múltiples categorías
4. BEST BUY $340.00 - Equipo o Suministros?
5. HP STORE $89.00 - Software o Hardware?

🎯 **Precisión del Modelo:** 94% (mejorando continuamente)

💡 **Sugerencia:** Revisa las 5 transacciones pendientes para que el modelo aprenda tus preferencias.`,
      suggestions: [
        'Revisar transacciones pendientes',
        'Ver reglas de categorización',
        'Entrenar modelo con más datos'
      ]
    }
  }

  // Reportes
  if (lowerMessage.includes('reporte') || lowerMessage.includes('report') || lowerMessage.includes('estado')) {
    return {
      content: `📊 **Reportes Disponibles:**

**Financieros:**
✅ Balance General (actualizado hoy)
✅ Estado de Resultados (Noviembre)
✅ Flujo de Efectivo (YTD)
✅ Trial Balance

**Operacionales:**
✅ Ventas por Cliente
✅ Gastos por Categoría
✅ Aging de Cuentas por Cobrar
✅ Resumen de Nómina

**Fiscales:**
✅ Libro Mayor
✅ Libro Diario
✅ DIOT (declaración informativa)
✅ Cálculo de ISR/IVA

📥 **Formatos disponibles:** PDF, Excel, CSV

💡 **Tip:** Puedes programar envío automático de reportes semanales en Configuración.`,
      suggestions: [
        'Descarga Balance General en PDF',
        'Ver Estado de Resultados',
        'Programa reportes automáticos'
      ]
    }
  }

  // Presupuesto
  if (lowerMessage.includes('presupuesto') || lowerMessage.includes('budget')) {
    return {
      content: `🎯 **Análisis de Presupuesto:**

**Noviembre 2025:**

**Ingresos:**
- Presupuestado: $95,000
- Real: $102,340 (+7.7%) ✅

**Gastos:**
- Presupuestado: $75,000
- Real: $78,680 (+4.9%) ⚠️

**Margen Neto:**
- Presupuestado: $20,000 (21%)
- Real: $23,660 (23.1%) ✅

📈 **Performance YTD:**
- Ingresos: 103% vs presupuesto
- Gastos: 105% vs presupuesto
- Margen: 101% vs objetivo

💡 **Insights:**
- Excelente desempeño en ventas
- Gastos ligeramente por encima (normal por crecimiento)
- Márgenes saludables y mejorando

🎯 **Q4 Projection:** Si continúa la tendencia, superarás el objetivo anual en 8%.`,
      suggestions: [
        'Ajusta presupuesto Q1 2026',
        'Ver variaciones por categoría',
        'Simula escenarios para 2026'
      ]
    }
  }

  // Ayuda general / no entendido
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
• Categorización automática de transacciones
• Nómina y empleados

**Impuestos y Compliance:**
• Obligaciones fiscales próximas
• Gastos deducibles
• CFDI y cumplimiento SAT
• Reportes fiscales

**Insights con IA:**
• Predicciones con Machine Learning
• Recomendaciones personalizadas
• Detección de anomalías
• Tendencias y patrones

🤔 **No entendí bien tu pregunta.** ¿Podrías reformularla o elegir una de las opciones sugeridas?`,
    suggestions: [
      '¿Cuál es mi balance actual?',
      'Analiza mis facturas pendientes',
      'Predice mi flujo de caja',
      'Ver obligaciones fiscales',
      'Resumen de gastos del mes'
    ]
  }
}

// Integración real con OpenAI (comentado, para cuando lo necesites):
/*
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function getAIResponse(message: string, companyId: string, history: any[]) {
  const systemPrompt = `Eres un asistente contable experto especializado en ayudar a pequeñas y medianas empresas.
Tu nombre es "Asistente IA de QuickBooks".
Estás ayudando a la empresa con ID: ${companyId}.

Tus capacidades incluyen:
- Análisis financiero y contable
- Interpretación de reportes
- Predicciones de flujo de caja
- Recomendaciones fiscales (México)
- Categorización de transacciones
- Insights sobre clientes y proveedores

Responde de forma clara, concisa y profesional. Usa emojis ocasionalmente para hacer tus respuestas más amigables.
Si necesitas datos específicos de la empresa, menciónalo y ofrece hacer una consulta a la base de datos.`

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

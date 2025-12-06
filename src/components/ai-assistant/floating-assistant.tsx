'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  Loader2,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Calendar,
  MessageSquare,
  Zap
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface FloatingAssistantProps {
  initiallyOpen?: boolean
}

export default function FloatingAssistant({ initiallyOpen = false }: FloatingAssistantProps) {
  const router = useRouter()
  const { activeCompany } = useCompany()
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Estado para pregunta pendiente
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)

  useEffect(() => {
    // Escuchar evento para abrir el chat
    const handleOpenChat = (event: CustomEvent) => {
      setIsOpen(true)
      setIsMinimized(false)
      
      // Si viene con una pregunta, guardarla para enviarla
      if (event.detail?.question) {
        setPendingQuestion(event.detail.question)
      }
    }
    
    window.addEventListener('openAIChat', handleOpenChat as EventListener)
    
    return () => {
      window.removeEventListener('openAIChat', handleOpenChat as EventListener)
    }
  }, [])

  // Enviar pregunta pendiente cuando el chat esté listo
  useEffect(() => {
    if (pendingQuestion && isOpen && activeCompany && messages.length > 0) {
      setInputValue(pendingQuestion)
      setPendingQuestion(null)
      // Pequeño delay para que el usuario vea la pregunta antes de enviarla
      setTimeout(() => {
        const submitButton = document.querySelector('[data-ai-submit]') as HTMLButtonElement
        if (submitButton) submitButton.click()
      }, 300)
    }
  }, [pendingQuestion, isOpen, activeCompany, messages.length])

  useEffect(() => {
    // Mensaje de bienvenida cuando se abre por primera vez o cambia de empresa
    if (isOpen && messages.length === 0 && activeCompany) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! 👋 Soy tu asistente IA inteligente para ${activeCompany.name}.\n\n🎯 **Puedo ayudarte con:**\n\n📊 **Análisis Financiero**\n• Estado de resultados (P&L)\n• Balance general detallado\n• Flujo de efectivo proyectado\n• Análisis de rentabilidad\n• Métricas clave (KPIs)\n\n💰 **Gestión Contable**\n• Categorización automática de transacciones\n• Conciliación bancaria inteligente\n• Recordatorios de pagos\n• Seguimiento de facturas pendientes\n• Registro de gastos deducibles\n\n📈 **Predicciones IA**\n• Pronóstico de ventas\n• Proyección de gastos\n• Alertas de flujo de caja\n• Identificación de anomalías\n• Recomendaciones de ahorro\n\n📝 **Impuestos y Cumplimiento**\n• Cálculo de impuestos estimados\n• Deducciones fiscales recomendadas\n• Fechas límite importantes\n• Preparación para declaraciones\n• Compliance automático\n\n🤖 **Automatización**\n• Crear workflows personalizados\n• Reglas de categorización\n• Recordatorios automáticos\n• Tareas programadas\n• Integración con apps\n\n💡 **Consultas Específicas**\n• "¿Cuánto gané este mes?"\n• "¿Cuáles son mis mayores gastos?"\n• "¿Cuándo vence la próxima factura?"\n• "¿Cuánto debo pagar de impuestos?"\n• "Dame un resumen ejecutivo"\n\n¿En qué te puedo ayudar hoy?`,
        timestamp: new Date(),
        suggestions: [
          '📊 Muéstrame mi estado financiero',
          '💵 ¿Cuánto dinero tengo disponible?',
          '📈 Analiza mis ingresos vs gastos',
          '🔍 ¿Qué facturas están vencidas?',
          '🎯 Dame recomendaciones para mejorar',
          '📅 ¿Cuándo son mis próximos pagos de impuestos?'
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, activeCompany])

  const sendMessage = async () => {
    if (!inputValue.trim() || !activeCompany) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Llamar al API endpoint del AI assistant con Groq
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          message: inputValue
        })
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      let data;
      try {
        const text = await response.text()
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        throw new Error('Error al procesar respuesta de IA')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu solicitud.',
        timestamp: new Date(),
        suggestions: data.suggestions || []
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('AI Assistant error:', error)
      
      // Mostrar mensaje de error más amigable
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${error.message || 'Error al conectar con el asistente. Por favor intenta de nuevo.'}`,
        timestamp: new Date(),
        suggestions: ['Intenta de nuevo', '¿Cuál es mi balance?', '¿Tengo facturas pendientes?']
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      return
    }
    setIsLoading(false)
  }

  // Manejar respuestas simuladas en caso de error adicional  
  const handleSimulatedResponse = (query: string) => {
      // Respuestas inteligentes simuladas basadas en palabras clave
      let simulatedResponse = ''
      let simulatedSuggestions: string[] = []
      
      if (query.includes('balance') || query.includes('estado financiero') || query.includes('situación')) {
        simulatedResponse = `📊 **Estado Financiero Actual de ${activeCompany?.name}**\n\n💰 **Balance General:**\n• Activos Totales: $2,450,000\n• Pasivos: $890,000\n• Capital: $1,560,000\n• Liquidez Inmediata: $450,000\n\n📈 **Estado de Resultados (Este Mes):**\n• Ingresos: $385,000\n• Gastos: $245,000\n• Utilidad Neta: $140,000 (+57%)\n\n✅ **Salud Financiera: EXCELENTE**\n• Ratio de liquidez: 2.8 (saludable)\n• Margen de utilidad: 36%\n• ROI: 24% anual\n\n💡 **Recomendaciones:**\n1. Considera invertir el excedente de liquidez\n2. Tus márgenes están por encima del promedio de la industria\n3. Mantén el control de gastos operativos`
        simulatedSuggestions = [
          '📊 Muéstrame el detalle de activos',
          '📉 ¿Cuáles son mis mayores gastos?',
          '💵 ¿Cuánto tengo en cuentas por cobrar?',
          '📈 Dame proyecciones para próximo trimestre'
        ]
      } else if (query.includes('factura') || query.includes('cobro') || query.includes('vencid')) {
        simulatedResponse = `📋 **Resumen de Facturas**\n\n⚠️ **Facturas Vencidas: 3**\n• Cliente A - $15,000 (vencido hace 15 días)\n• Cliente B - $8,500 (vencido hace 7 días)\n• Cliente C - $12,300 (vencido hace 3 días)\n**Total vencido: $35,800**\n\n⏰ **Por Vencer (Próximos 7 días): 5**\n• Total: $58,900\n\n✅ **Pagadas Este Mes: 18**\n• Total cobrado: $245,600\n\n📊 **Estadísticas:**\n• Tasa de cobro: 85% (buena)\n• Días promedio de cobro: 28 días\n• Clientes con retraso: 3 de 24\n\n💡 **Acciones Recomendadas:**\n1. 📧 Enviar recordatorio automático a 3 clientes\n2. 📞 Llamar a Cliente A (mayor monto vencido)\n3. 🎯 Aplicar descuento por pronto pago (próximas facturas)\n\n¿Quieres que envíe los recordatorios automáticamente?`
        simulatedSuggestions = [
          '📧 Sí, envía recordatorios a clientes vencidos',
          '📊 Muéstrame el detalle de cada factura',
          '💰 ¿Cuánto cobraré este mes?',
          '📈 Análisis de comportamiento de pagos'
        ]
      } else if (query.includes('gasto') || query.includes('egreso') || query.includes('gast')) {
        simulatedResponse = `💸 **Análisis de Gastos (Este Mes)**\n\n📊 **Total Gastado: $245,000**\n\n🏆 **Top 5 Categorías:**\n1. 👥 Nómina - $95,000 (39%)\n2. 🏢 Renta/Servicios - $45,000 (18%)\n3. 📦 Inventario - $38,000 (16%)\n4. 📱 Marketing - $28,000 (11%)\n5. 🚗 Transporte - $15,000 (6%)\n\n📈 **Comparación vs Mes Anterior:**\n• ⬇️ Nómina: -3% (ahorro $2,900)\n• ⬆️ Marketing: +15% (inversión adicional)\n• ➡️ Servicios: sin cambio\n\n⚠️ **Alertas:**\n• Marketing excedió presupuesto en $3,000\n• Transporte 5% bajo presupuesto ✅\n\n💡 **Oportunidades de Ahorro:**\n1. 🔍 Renegociar contrato de servicios ($3,000/mes)\n2. 📊 3 gastos sin categorizar - revisar\n3. 💳 5 gastos duplicados detectados - verificar\n\n🎯 **Gastos Deducibles Fiscales:**\n• Total elegible: $189,000 (77%)\n• Ahorro estimado en impuestos: $47,250`
        simulatedSuggestions = [
          '📋 Muéstrame los gastos sin categorizar',
          '🔍 Detalle de gastos duplicados',
          '💰 ¿Cómo puedo reducir gastos?',
          '📊 Comparar con trimestre anterior'
        ]
      } else if (query.includes('impuesto') || query.includes('fiscal') || query.includes('tax') || query.includes('irs')) {
        simulatedResponse = `🧮 **Tax Summary (Florida, USA)**\n\n💰 **Taxes This Month:**\n• Federal Income Tax: $42,000\n• Florida Sales Tax (7%): $28,500\n• Total obligations: $70,500\n\n📅 **Upcoming Deadlines:**\n• 📌 January 15 - Q4 Estimated Tax Payment\n• 📌 January 31 - W-2/1099 Filing\n• 📌 April 15 - Annual Tax Return\n\n✅ **Available Deductions:**\n• Operating expenses: $189,000\n• Equipment depreciation: $45,000\n• Charitable donations: $5,000\n• **Potential savings: $58,750**\n\n📊 **Compliance:**\n• ✅ Sales tax collected up to date\n• ✅ Quarterly payments on track\n• ⚠️ 3 expenses missing receipts\n• ✅ 1099 contractors documented\n\n💡 **Recommendations:**\n1. 📄 Collect 3 missing receipts\n2. 💰 Reserve $70,500 for Q4 payment\n3. 📋 Start annual return preparation\n4. 🎯 Maximize available deductions\n\n🔗 **Integrations:**\n• Export to TurboTax: Available\n• IRS Portal: Connected ✅\n• FL DOR: Sales tax current`
        simulatedSuggestions = [
          '📄 View missing receipts',
          '💰 Project next quarter taxes',
          '🎯 Optimize tax deductions',
          '📊 Generate report for CPA'
        ]
      } else if (query.includes('flujo') || query.includes('cash flow') || query.includes('liquidez')) {
        simulatedResponse = `💵 **Análisis de Flujo de Efectivo**\n\n📊 **Posición Actual:**\n• 💰 Efectivo disponible: $450,000\n• 📈 Cuentas por cobrar: $385,000\n• 📉 Cuentas por pagar: $125,000\n• **Liquidez neta: $710,000** ✅\n\n📈 **Proyección (Próximos 30 días):**\n• ⬆️ Entradas esperadas: $580,000\n• ⬇️ Salidas programadas: $395,000\n• **Flujo neto proyectado: +$185,000**\n\n🎯 **Movimientos Clave:**\n\n**Esta Semana:**\n• 💚 Cobro Cliente A: $45,000\n• 💚 Cobro Cliente B: $32,000\n• 🔴 Pago nómina: $95,000\n• 🔴 Pago proveedores: $38,000\n\n**Próximas 2 Semanas:**\n• 💚 Facturas por cobrar: $245,000\n• 🔴 Impuestos: $70,500\n• 🔴 Renta: $45,000\n\n⚠️ **Alertas:**\n• ✅ Sin riesgo de liquidez detectado\n• 💡 Excedente de $150k disponible para inversión\n• ⚠️ 3 facturas vencidas ($35k) - cobrar pronto\n\n💡 **Recomendaciones:**\n1. 💰 Invertir excedente en cuenta de ahorro (4.5% anual)\n2. 📧 Cobrar facturas vencidas = +$35k inmediato\n3. 🎯 Negociar términos de pago a 15 días (vs 30 actual)\n4. 📊 Tu ratio de liquidez es excelente: 2.8x`
        simulatedSuggestions = [
          '📅 Proyección a 90 días',
          '💡 Estrategias para mejorar flujo',
          '📊 Comparar con mes anterior',
          '🎯 ¿Cuándo tendré problemas de liquidez?'
        ]
      } else if (query.includes('recomendación') || query.includes('consejo') || query.includes('sugerencia') || query.includes('mejorar')) {
        simulatedResponse = `💡 **Recomendaciones Personalizadas para ${activeCompany?.name}**\n\n🎯 **Alta Prioridad:**\n\n1. 💰 **Cobrar Facturas Vencidas**\n   • 3 facturas vencidas ($35,800)\n   • Impacto: Mejora liquidez inmediata\n   • Acción: Enviar recordatorios automáticos\n   • Tiempo: 5 minutos\n\n2. 🔍 **Optimizar Deducciones Fiscales**\n   • $58,750 en ahorros potenciales\n   • Faltan 3 comprobantes fiscales\n   • Acción: Solicitar y categorizar\n   • Ahorro: $58,750 en impuestos\n\n3. 📊 **Automatizar Categorización**\n   • 12 transacciones sin categorizar\n   • Usar IA para clasificar automáticamente\n   • Tiempo ahorrado: 2 horas/semana\n\n📈 **Oportunidades de Crecimiento:**\n\n4. 💵 **Invertir Excedente de Liquidez**\n   • $150,000 disponibles\n   • Opción: Cuenta de ahorro 4.5% anual\n   • Ganancia proyectada: $6,750/año\n\n5. 🎯 **Mejorar Términos de Cobro**\n   • Actual: 28 días promedio\n   • Meta: 15 días\n   • Beneficio: +$200k disponible más rápido\n\n6. 📉 **Reducir Gastos Operativos**\n   • Renegociar servicios: ahorro $3,000/mes\n   • Eliminar suscripciones sin uso: $800/mes\n   • **Ahorro total: $45,600/año**\n\n⚙️ **Automatización:**\n\n7. 🤖 **Configurar Workflows**\n   • Recordatorios de pago automáticos\n   • Conciliación bancaria diaria\n   • Reportes semanales por email\n\n8. 📱 **Integrar Apps**\n   • Conectar con banco principal\n   • Sincronizar con CRM\n   • Link con plataforma de pagos\n\n💪 **Tu Negocio vs Industria:**\n• Márgenes: 36% (industria: 22%) 🏆\n• Liquidez: 2.8x (industria: 1.5x) 🏆\n• Crecimiento: +18% (industria: +8%) 🏆\n\n**¡Estás superando el promedio! Continúa así.** 🎉`
        simulatedSuggestions = [
          '🎯 Implementa las 3 prioridades principales',
          '💰 Ver detalle de ahorros fiscales',
          '📊 Benchmark completo vs industria',
          '⚙️ Configurar automatizaciones ahora'
        ]
      } else {
        // Respuesta general inteligente
        simulatedResponse = `🤖 He analizado tu consulta sobre "${inputValue}".\n\n📊 **Información Disponible:**\n\nPuedo ayudarte específicamente con:\n\n💰 **Finanzas:**\n• Estado de resultados y balance\n• Análisis de rentabilidad\n• Proyecciones financieras\n• Flujo de efectivo\n\n📋 **Operaciones:**\n• Facturas pendientes y vencidas\n• Gastos y categorización\n• Cuentas por cobrar/pagar\n• Gestión de proveedores\n\n🧮 **Impuestos:**\n• Cálculo de obligaciones fiscales\n• Deducciones disponibles\n• Fechas límite importantes\n• Compliance y cumplimiento\n\n📈 **Análisis IA:**\n• Predicciones de ventas\n• Detección de anomalías\n• Recomendaciones personalizadas\n• Optimización de procesos\n\n💡 **Intenta preguntas como:**\n• "¿Cuál es mi situación financiera?"\n• "¿Qué facturas están vencidas?"\n• "Analiza mis gastos del mes"\n• "Dame recomendaciones para mejorar"\n• "¿Cuándo vencen mis impuestos?"\n• "Proyecta mi flujo de efectivo"\n\n¿En qué aspecto específico te gustaría que te ayude?`
        simulatedSuggestions = [
          '📊 Muéstrame un resumen ejecutivo',
          '💰 Estado financiero completo',
          '🎯 Dame recomendaciones prioritarias',
          '📈 Análisis de rendimiento del mes'
        ]
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: simulatedResponse,
        timestamp: new Date(),
        suggestions: simulatedSuggestions
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const quickActions = [
    { 
      icon: TrendingUp, 
      label: 'Ver Dashboard', 
      color: 'blue',
      onClick: () => router.push('/company/dashboard')
    },
    { 
      icon: FileText, 
      label: 'Crear Factura', 
      color: 'purple',
      onClick: () => router.push('/company/invoicing/sales')
    },
    { 
      icon: DollarSign, 
      label: 'Registrar Gasto', 
      color: 'green',
      onClick: () => router.push('/company/expenses')
    },
    { 
      icon: Calendar, 
      label: 'Ver Reportes', 
      color: 'orange',
      onClick: () => router.push('/company/reports/financial')
    }
  ]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 group"
        title="Abrir Asistente IA"
      >
        <div className="relative">
          <Bot className="w-7 h-7" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <div className="absolute -top-12 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          <Sparkles className="w-4 h-4 inline mr-1" />
          Asistente IA
        </div>
      </button>
    )
  }

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized 
          ? 'bottom-6 right-6 w-80 h-20' 
          : 'bottom-6 right-6 w-96 h-[600px]'
      }`}
    >
      <Card className="h-full flex flex-col shadow-2xl border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-6 h-6" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Asistente IA</CardTitle>
                {activeCompany && (
                  <p className="text-xs opacity-90">{activeCompany.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <User className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Preguntas sugeridas:
                        </p>
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectSuggestion(suggestion)}
                            className="block w-full text-left text-xs p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <p className="text-sm text-gray-600">Pensando...</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 bg-white border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Acciones rápidas:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={action.onClick}
                      className="flex items-center gap-2 text-xs p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <action.icon className={`w-4 h-4 text-${action.color}-600`} />
                      <span className="text-gray-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu pregunta..."
                    disabled={isLoading}
                    className="resize-none"
                  />
                </div>
                <Button
                  data-ai-submit
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                🤖 Asistente IA personalizado para {activeCompany?.name}
              </p>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Asistente IA minimizado
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

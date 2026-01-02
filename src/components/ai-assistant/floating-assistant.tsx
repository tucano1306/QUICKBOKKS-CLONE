'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  FileText,
  DollarSign,
  Calendar,
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
  readonly initiallyOpen?: boolean
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
    
    globalThis.addEventListener('openAIChat', handleOpenChat as EventListener)
    
    return () => {
      globalThis.removeEventListener('openAIChat', handleOpenChat as EventListener)
    }
  }, [])

  // Enviar pregunta pendiente cuando el chat esté listo
  useEffect(() => {
    if (pendingQuestion && isOpen && activeCompany && messages.length > 0) {
      setInputValue(pendingQuestion)
      setPendingQuestion(null)
      // Pequeño delay para que el usuario vea la pregunta antes de enviarla
      setTimeout(() => {
        const submitButton = document.querySelector('[data-ai-submit]')
        if (submitButton) (submitButton as HTMLButtonElement).click()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
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
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
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
                    onKeyDown={handleKeyPress}
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

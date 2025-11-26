'use client'

import { useState, useEffect, useRef } from 'react'
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

  useEffect(() => {
    // Escuchar evento para abrir el chat
    const handleOpenChat = () => {
      setIsOpen(true)
      setIsMinimized(false)
    }
    
    window.addEventListener('openAIChat', handleOpenChat)
    
    return () => {
      window.removeEventListener('openAIChat', handleOpenChat)
    }
  }, [])

  useEffect(() => {
    // Mensaje de bienvenida cuando se abre por primera vez o cambia de empresa
    if (isOpen && messages.length === 0 && activeCompany) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! Soy el asistente IA de ${activeCompany.name}. Puedo ayudarte con:\n\n• Análisis financiero y reportes\n• Recomendaciones contables\n• Respuestas sobre impuestos\n• Categorización de transacciones\n• Predicciones de flujo de caja\n• Consultas sobre facturas y gastos\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        suggestions: [
          '¿Cuál es mi balance actual?',
          '¿Cuánto debo en facturas?',
          'Analiza mis gastos del mes',
          'Predice mi flujo de caja'
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
      // Llamar al API endpoint del AI assistant
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          message: inputValue,
          conversationHistory: messages.slice(-5) // últimos 5 mensajes para contexto
        })
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Assistant error:', error)
      
      // Respuesta de fallback
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
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
    { icon: TrendingUp, label: 'Ver Dashboard', color: 'blue' },
    { icon: FileText, label: 'Crear Factura', color: 'purple' },
    { icon: DollarSign, label: 'Registrar Gasto', color: 'green' },
    { icon: Calendar, label: 'Ver Reportes', color: 'orange' }
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

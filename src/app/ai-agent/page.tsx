'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Loader2, Sparkles, MessageSquare, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{
    type: string
    description: string
    result: any
  }>
  suggestions?: string[]
}

export default function AIAgentChat() {
  useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Mensaje de bienvenida
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `¡Hola! 👋 Soy **FinanceBot**, tu asistente financiero inteligente.

Puedo ayudarte con:

- 💰 **Crear facturas** para tus clientes
- 📝 **Registrar gastos** y categorizarlos automáticamente
- 👥 **Gestionar clientes** y proveedores
- 📊 **Generar reportes** financieros (balance, estado de resultados, etc.)
- 🔍 **Buscar transacciones** por múltiples criterios
- 📈 **Analizar gastos** y encontrar oportunidades de ahorro
- 💡 **Recomendaciones** inteligentes para tu negocio

¿En qué puedo ayudarte hoy?`,
          suggestions: [
            'Crea una factura para el cliente XYZ por $5,000',
            'Muéstrame mi resumen financiero del mes',
            'Registra un gasto de $250 en suministros de oficina',
            'Genera el estado de resultados de este trimestre',
          ],
        },
      ])
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al comunicarse con el agente')
      }

      const data = await response.json()

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        actions: data.actions,
        suggestions: data.suggestions,
      }

      setMessages(prev => [...prev, assistantMessage])

      // Mostrar notificación si se ejecutó una acción
      if (data.actions && data.actions.length > 0) {
        toast.success(`✅ ${data.actions.length} acción(es) ejecutada(s)`)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Error al procesar tu solicitud')
      
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Lo siento, ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.',
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Menú Principal</span>
            </button>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Agente IA Financiero
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Tu asistente inteligente que ejecuta acciones en tiempo real
            </p>
            {conversationId && (
              <Badge variant="outline" className="mt-2">
                <MessageSquare className="h-3 w-3 mr-1" />
                Conversación activa
              </Badge>
            )}
          </div>
        </div>

        {/* Chat Container */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Chat con FinanceBot
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-[600px] overflow-y-auto p-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.content.substring(0, 20)}`}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Actions ejecutadas */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                          ✅ Acciones ejecutadas:
                        </p>
                        {message.actions.map((action, idx) => (
                          <div
                            key={`${action.type}-${idx}`}
                            className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded mb-1"
                          >
                            <strong>{action.type}:</strong> {action.description}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sugerencias */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                          💡 Sugerencias:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={`${suggestion}-${idx}`}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 shadow-md">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Procesando...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-slate-50 dark:bg-slate-800 p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleKeyPress(e) }}
                  placeholder="Escribe tu mensaje... (Ej: 'Crea una factura para el cliente ABC por $5,000')"
                  disabled={isLoading}
                  className="flex-1 bg-white dark:bg-slate-700"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                💡 Presiona Enter para enviar. El agente puede crear facturas, gastos, reportes y más.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm">Agente Autónomo</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ejecuta acciones reales en tu aplicación
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-sm">IA Potente</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                GPT-4, Llama 3 o Mixtral a tu elección
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-sm">Contexto Persistente</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Recuerda toda la conversación
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

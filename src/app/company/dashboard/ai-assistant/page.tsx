'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Send,
  User,
  Sparkles,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  HelpCircle,
  Trash2,
  Copy,
  Check
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  metrics?: {
    label: string
    value: string
    trend?: 'up' | 'down'
  }[]
}

const quickPrompts = [
  { icon: TrendingUp, text: '¿Cómo van mis ventas este mes?', category: 'ventas' },
  { icon: DollarSign, text: '¿Cuál es mi flujo de efectivo?', category: 'finanzas' },
  { icon: Users, text: '¿Quiénes son mis mejores clientes?', category: 'clientes' },
  { icon: FileText, text: '¿Tengo facturas pendientes?', category: 'facturas' },
  { icon: Lightbulb, text: 'Dame recomendaciones para mejorar', category: 'insights' },
  { icon: HelpCircle, text: '¿Qué puedes hacer por mí?', category: 'ayuda' }
]

export default function AIAssistantPage() {
  const { status } = useSession()
  const router = useRouter()
  const { activeCompany } = useCompany()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (activeCompany && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! Soy tu asistente de IA para **${activeCompany.name}**. 

Puedo ayudarte con:
- 📊 Análisis de ventas e ingresos
- 💰 Estado de flujo de efectivo
- 👥 Información sobre clientes
- 📄 Estado de facturas y pagos
- 💡 Recomendaciones inteligentes

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        suggestions: [
          '¿Cómo van mis ventas?',
          'Resumen financiero',
          'Clientes con facturas pendientes'
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [activeCompany, messages.length])

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !activeCompany || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          companyId: activeCompany.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.message || 'Lo siento, no pude procesar tu solicitud.',
          timestamp: new Date(),
          suggestions: data.suggestions,
          metrics: data.metrics
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Error en la respuesta')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [activeCompany, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handleCopyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || !activeCompany) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 h-[calc(100vh-200px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Asistente IA
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Chatbot inteligente para {activeCompany.name}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Chat
          </Button>
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Preguntas rápidas:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {quickPrompts.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <button
                    key={prompt.text}
                    onClick={() => handleQuickPrompt(prompt.text)}
                    className="flex items-center gap-2 p-3 text-left text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all"
                  >
                    <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{prompt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={`${message.id}-bold-${i}`}>{part}</strong> : part
                      )}
                    </div>

                    {/* Metrics */}
                    {message.metrics && message.metrics.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                        {message.metrics.map((metric) => (
                          <div key={`${message.id}-${metric.label}`} className="bg-white dark:bg-gray-700 p-2 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                            <p className="font-bold text-gray-900 dark:text-white">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={`${message.id}-${suggestion}`}
                          onClick={() => handleQuickPrompt(suggestion)}
                          className="text-xs px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message meta */}
                  <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(message.content, message.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Analizando datos...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-2">
              El asistente usa datos reales de tu empresa para responder
            </p>
          </div>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

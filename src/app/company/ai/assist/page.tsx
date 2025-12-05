'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Bookmark,
  TrendingUp,
  DollarSign,
  FileText,
  Calculator,
  HelpCircle,
  Lightbulb,
  Info,
  Plus,
  Trash2,
  History,
  Paperclip,
  ArrowRight,
  BarChart3,
  Users,
  Receipt,
  PiggyBank
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  helpful?: boolean
  category?: string
}

interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  prompt: string
  icon: React.ReactNode
  color: string
}

const getWelcomeMessage = (): Message => ({
  id: '1',
  type: 'assistant',
  content: `¡Hola! 👋 Soy tu asistente contable con IA. Estoy conectado a tu base de datos en tiempo real.

📝 **Puedo registrar automáticamente:**

💰 **Gastos** → Se guardan en el módulo **Gastos**
   Ejemplo: "Gasté $500 en seguro de noviembre"

💵 **Gastos en Transacciones** → Se guardan en **Transacciones**
   Ejemplo: "**En transacciones** agrega gasto de $14000 compra de camioneta mayo 2023"

📈 **Ingresos** → Se guardan en **Transacciones**
   Ejemplo: "Cobré $1500 por un viaje a Miami"

📄 **Facturas, Clientes, Productos** → En sus módulos respectivos

💡 **También puedo responder preguntas sobre:**
• Tu situación financiera actual
• Facturas pendientes y vencidas  
• Análisis de gastos por categoría
• Conceptos contables

¿En qué puedo ayudarte hoy?`,
  timestamp: new Date().toISOString(),
  category: 'greeting'
})

export default function AIAssistPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()])
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string>(() => 
    `conv-${Date.now()}`
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Estado Financiero',
      description: 'Resumen de tu situación actual',
      prompt: '¿Cuál es mi situación financiera actual? Dame un resumen ejecutivo.',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: '2',
      title: 'Facturas Vencidas',
      description: 'Alertas de cobranza',
      prompt: '¿Tengo facturas vencidas? ¿Cuáles son y cuánto suman?',
      icon: <Receipt className="w-5 h-5" />,
      color: 'from-red-500 to-rose-600'
    },
    {
      id: '3',
      title: 'Análisis de Gastos',
      description: 'Top categorías y tendencias',
      prompt: '¿Cuáles son mis principales gastos? Muéstrame un análisis por categoría.',
      icon: <PiggyBank className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: '4',
      title: 'Flujo de Caja',
      description: 'Proyección y alertas',
      prompt: '¿Cómo está mi flujo de caja? ¿Hay alguna alerta que deba saber?',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: '5',
      title: 'Mejores Clientes',
      description: 'Ranking de facturación',
      prompt: '¿Quiénes son mis mejores clientes? Ordénalos por facturación.',
      icon: <Users className="w-5 h-5" />,
      color: 'from-purple-500 to-violet-600'
    },
    {
      id: '6',
      title: 'Optimizar Impuestos',
      description: 'Deducciones disponibles',
      prompt: '¿Qué deducciones fiscales tengo disponibles? ¿Cómo puedo optimizar mis impuestos?',
      icon: <Calculator className="w-5 h-5" />,
      color: 'from-cyan-500 to-teal-600'
    }
  ]

  // Load conversations from localStorage
  const loadConversationsFromStorage = useCallback(() => {
    if (!activeCompany?.id) return
    
    try {
      const storageKey = `ai-conversations-${activeCompany.id}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[]
        setRecentConversations(parsed.slice(0, 10))
      }
    } catch (error) {
      console.error('Error loading conversations from storage:', error)
    }
  }, [activeCompany?.id])

  // Save current conversation to localStorage
  const saveConversation = useCallback((msgs: Message[], convId: string) => {
    if (!activeCompany?.id || msgs.length <= 1) return
    
    try {
      const storageKey = `ai-conversations-${activeCompany.id}`
      const saved = localStorage.getItem(storageKey)
      const existing: Conversation[] = saved ? JSON.parse(saved) : []
      
      // Get first user message as title
      const firstUserMsg = msgs.find(m => m.type === 'user')
      const userMessages = msgs.filter(m => m.type === 'user')
      const lastUserMsg = userMessages[userMessages.length - 1]
      
      // Find or create conversation
      const existingIndex = existing.findIndex(c => c.id === convId)
      const conversation: Conversation = {
        id: convId,
        title: firstUserMsg?.content.substring(0, 50) || 'Nueva conversación',
        lastMessage: lastUserMsg?.content.substring(0, 100) || '',
        timestamp: new Date().toISOString(),
        messageCount: userMessages.length
      }
      
      if (existingIndex >= 0) {
        existing[existingIndex] = conversation
        // Move to top
        existing.splice(existingIndex, 1)
        existing.unshift(conversation)
      } else {
        existing.unshift(conversation)
      }
      
      // Keep only last 20 conversations
      const toSave = existing.slice(0, 20)
      localStorage.setItem(storageKey, JSON.stringify(toSave))
      
      // Also save messages for this conversation
      const messagesKey = `ai-messages-${activeCompany.id}-${convId}`
      localStorage.setItem(messagesKey, JSON.stringify(msgs))
      
      setRecentConversations(toSave.slice(0, 10))
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }, [activeCompany?.id])

  // Load a specific conversation
  const loadConversation = useCallback((conversationId: string) => {
    if (!activeCompany?.id) return
    
    try {
      const messagesKey = `ai-messages-${activeCompany.id}-${conversationId}`
      const saved = localStorage.getItem(messagesKey)
      if (saved) {
        const msgs = JSON.parse(saved) as Message[]
        setMessages(msgs)
        setCurrentConversationId(conversationId)
        setShowHistory(false)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }, [activeCompany?.id])

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeCompany?.id) return
    
    try {
      const storageKey = `ai-conversations-${activeCompany.id}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const existing: Conversation[] = JSON.parse(saved)
        const filtered = existing.filter(c => c.id !== conversationId)
        localStorage.setItem(storageKey, JSON.stringify(filtered))
        setRecentConversations(filtered.slice(0, 10))
      }
      
      const messagesKey = `ai-messages-${activeCompany.id}-${conversationId}`
      localStorage.removeItem(messagesKey)
      
      if (conversationId === currentConversationId) {
        handleNewChat()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }, [activeCompany?.id, currentConversationId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    loadConversationsFromStorage()
    setLoading(false)
  }, [loadConversationsFromStorage])

  const handleNewChat = () => {
    setMessages([getWelcomeMessage()])
    setInputMessage('')
    setShowHistory(false)
    setCurrentConversationId(`conv-${Date.now()}`)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputMessage('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setIsTyping(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          companyId: activeCompany?.id
        })
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      let data
      try {
        const text = await response.text()
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error('Error al procesar respuesta del servidor')
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu consulta. Intenta de nuevo.',
        timestamp: new Date().toISOString(),
        category: 'response'
      }
      const updatedMessages = [...newMessages, aiResponse]
      setMessages(updatedMessages)
      saveConversation(updatedMessages, currentConversationId)
    } catch (error) {
      console.error('Error calling AI API:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '❌ Hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
        timestamp: new Date().toISOString(),
        category: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInputMessage(prompt)
    inputRef.current?.focus()
  }

  const handleCopyMessage = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, helpful } : msg
    ))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" />
              <Bot className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-500 animate-pulse">Iniciando asistente IA...</p>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="h-[calc(100vh-140px)] flex">
        {/* Sidebar - History */}
        <div className={cn(
          "w-72 bg-gray-50 border-r flex flex-col transition-all duration-300 ease-in-out",
          showHistory ? "translate-x-0" : "-translate-x-full absolute lg:relative lg:translate-x-0"
        )}>
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-white">
            <Button 
              onClick={handleNewChat}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Conversación
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
              <History className="w-3 h-3" />
              Historial Reciente
            </div>
            
            {recentConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay conversaciones</p>
                <p className="text-xs text-gray-400 mt-1">Tus chats aparecerán aquí</p>
              </div>
            ) : (
              recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    "w-full p-3 text-left rounded-xl transition-all duration-200 group",
                    conv.id === currentConversationId
                      ? "bg-blue-100 border-2 border-blue-300"
                      : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {conv.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {conv.lastMessage}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{conv.messageCount} mensajes</span>
                    <span>•</span>
                    <span>{new Date(conv.timestamp).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">AI Assistant</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  En línea
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Asistente Contable IA</h1>
                <p className="text-xs text-gray-500">Conectado a {activeCompany?.name || 'tu empresa'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                Activo
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleNewChat}>
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {/* Show Quick Actions only at start */}
              {messages.length === 1 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-700 mb-1">
                      ¿Qué te gustaría saber?
                    </h2>
                    <p className="text-sm text-gray-500">
                      Selecciona una acción rápida o escribe tu pregunta
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="group p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 text-left"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 text-white shadow-md group-hover:scale-110 transition-transform",
                          action.color
                        )}>
                          {action.icon}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                        <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Preguntar</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.type === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md",
                    message.type === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-br from-purple-500 to-purple-600'
                  )}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={cn(
                    "flex-1 max-w-[85%]",
                    message.type === 'user' ? 'flex flex-col items-end' : ''
                  )}>
                    <div className={cn(
                      "px-5 py-4 rounded-2xl shadow-sm",
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    )}>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed m-0">
                          {message.content}
                        </p>
                      </div>
                    </div>

                    {/* Message Actions */}
                    <div className={cn(
                      "flex items-center gap-1 mt-2 px-1",
                      message.type === 'user' ? 'flex-row-reverse' : ''
                    )}>
                      <span className="text-xs text-gray-400 mx-2">
                        {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {message.type === 'assistant' && index > 0 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(message.id, true)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              message.helpful === true 
                                ? 'bg-green-100 text-green-600' 
                                : 'hover:bg-gray-200 text-gray-400'
                            )}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, false)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              message.helpful === false 
                                ? 'bg-red-100 text-red-600' 
                                : 'hover:bg-gray-200 text-gray-400'
                            )}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t bg-gradient-to-t from-gray-50 to-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-white border-2 border-gray-200 rounded-2xl shadow-lg focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu pregunta aquí... (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={1}
                  className="w-full px-5 py-4 pr-32 bg-transparent resize-none focus:outline-none text-gray-900 placeholder-gray-400"
                  style={{ maxHeight: '200px' }}
                />
                
                {/* Input Actions */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <button 
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Adjuntar archivo (próximamente)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className={cn(
                      "rounded-xl px-4 transition-all",
                      inputMessage.trim() && !isTyping
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        : "bg-gray-200 text-gray-400"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Quick Suggestions */}
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-gray-400">Sugerencias:</span>
                {['Balance actual', 'Facturas pendientes', 'Gastos del mes'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputMessage(suggestion)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

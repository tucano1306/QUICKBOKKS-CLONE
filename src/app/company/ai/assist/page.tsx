'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  RefreshCw,
  Bookmark,
  TrendingUp,
  DollarSign,
  FileText,
  Calculator,
  HelpCircle,
  Lightbulb,
  Info
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

interface QuickQuestion {
  id: string
  question: string
  category: string
  icon: React.ReactNode
}

export default function AIAssistPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `¡Hola! Soy tu asistente contable IA. Estoy conectado a tu base de datos y puedo darte información precisa sobre:

• 📊 Balance y situación financiera
• 📄 Facturas pendientes y vencidas
• 💰 Análisis de gastos
• 👥 Información de clientes
• 📈 Predicciones de flujo de caja
• 🏛️ Información fiscal

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date().toISOString(),
      category: 'greeting'
    }
  ])

  const recentConversations: Conversation[] = [
    {
      id: '1',
      title: 'Recording Equipment Purchase',
      lastMessage: 'How do I record the purchase of new office equipment?',
      timestamp: '2025-11-24T14:30:00',
      messageCount: 8
    },
    {
      id: '2',
      title: 'Tax Deductions for Home Office',
      lastMessage: 'What expenses can I deduct for my home office?',
      timestamp: '2025-11-23T10:15:00',
      messageCount: 12
    },
    {
      id: '3',
      title: 'Monthly Reconciliation Help',
      lastMessage: 'I need help reconciling my bank account',
      timestamp: '2025-11-22T16:45:00',
      messageCount: 6
    },
    {
      id: '4',
      title: 'Invoice Payment Terms',
      lastMessage: 'What are common payment terms for B2B invoices?',
      timestamp: '2025-11-20T11:20:00',
      messageCount: 5
    }
  ]

  const quickQuestions: QuickQuestion[] = [
    {
      id: '1',
      question: '¿Cuál es mi situación financiera actual?',
      category: 'Finanzas',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: '2',
      question: '¿Tengo facturas vencidas?',
      category: 'Cobranza',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: '3',
      question: '¿Cuáles son mis principales gastos?',
      category: 'Gastos',
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      id: '4',
      question: '¿Cómo va mi flujo de caja?',
      category: 'Cash Flow',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: '5',
      question: '¿Quiénes son mis mejores clientes?',
      category: 'Clientes',
      icon: <RefreshCw className="w-4 h-4" />
    },
    {
      id: '6',
      question: 'Información fiscal y deducciones',
      category: 'Impuestos',
      icon: <Calculator className="w-4 h-4" />
    }
  ]

  const stats = {
    totalQuestions: 847,
    avgResponseTime: '1.2s',
    helpfulRate: 94.5,
    conversationsSaved: 28
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages([...messages, userMessage])
    setInputMessage('')
    setIsTyping(true)

    try {
      // Llamar a la API real
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          companyId: activeCompany?.id
        })
      })

      const data = await response.json()

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu consulta. Intenta de nuevo.',
        timestamp: new Date().toISOString(),
        category: 'response'
      }
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error calling AI API:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
        timestamp: new Date().toISOString(),
        category: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question)
  }

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, helpful } : msg
    ))
  }

  if (status === 'loading' || loading) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              AI Assistant
            </h1>
            <p className="text-gray-600 mt-1">
              Get instant answers to your accounting questions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved Conversations
            </Button>
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalQuestions}
              </div>
              <div className="text-sm text-blue-700">Questions Answered</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.avgResponseTime}
              </div>
              <div className="text-sm text-green-700">Avg Response Time</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ThumbsUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.helpfulRate}%
              </div>
              <div className="text-sm text-purple-700">Helpful Rate</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bookmark className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.conversationsSaved}
              </div>
              <div className="text-sm text-orange-700">Saved Chats</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    Chat with AI Assistant
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-700">Online</Badge>
                </div>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      message.type === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-gray-700" />
                      )}
                    </div>
                    <div className={`flex-1 ${message.type === 'user' ? 'flex justify-end' : ''}`}>
                      <div className={`p-4 rounded-lg max-w-[80%] ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <div className="text-xs mt-2 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {message.type === 'assistant' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeedback(message.id, true)}
                            className={message.helpful === true ? 'text-green-600' : ''}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeedback(message.id, false)}
                            className={message.helpful === false ? 'text-red-600' : ''}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Bot className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything about accounting..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Quick Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuickQuestion(q.question)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {q.icon}
                      <Badge variant="outline" className="text-xs">{q.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-700">{q.question}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Conversations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentConversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">{conv.title}</h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{conv.lastMessage}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{conv.messageCount} messages</span>
                      <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About AI Assistant</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Your AI assistant is trained on accounting principles, tax regulations, and financial best practices. It can help with:
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Transaction Recording:</strong> How to properly categorize and record business transactions</li>
                  <li>• <strong>Tax Questions:</strong> Deductions, compliance, and tax planning guidance for Florida and federal taxes</li>
                  <li>• <strong>Financial Analysis:</strong> Understanding reports, ratios, and key performance indicators</li>
                  <li>• <strong>Process Help:</strong> Step-by-step guidance for reconciliation, closing, and other accounting tasks</li>
                  <li>• <strong>Best Practices:</strong> Industry-standard accounting methods and compliance requirements</li>
                  <li>• <strong>Data Privacy:</strong> Your conversations are encrypted and never used to train external models</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

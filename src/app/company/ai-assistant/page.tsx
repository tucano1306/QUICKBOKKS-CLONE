'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Target,
  Zap,
  Brain,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  LucideIcon
} from 'lucide-react'

interface AIInsight {
  icon: LucideIcon
  title: string
  message: string
  type: 'success' | 'warning' | 'info'
  date: string
}

interface AIStat {
  icon: LucideIcon
  label: string
  value: string
  color: string
}

export default function AIAssistantPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [recentInsights, setRecentInsights] = useState<AIInsight[]>([])
  const [stats, setStats] = useState<AIStat[]>([])

  const loadAIData = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/company/${activeCompany.id}/ai-assistant/stats`)
      if (response.ok) {
        const data = await response.json()
        
        // Map icons for insights from API data
        const iconMap: Record<string, LucideIcon> = {
          TrendingUp, AlertCircle, CheckCircle, DollarSign, FileText, Users
        }
        
        setRecentInsights(data.insights?.map((insight: { icon: string; title: string; message: string; type: 'success' | 'warning' | 'info'; date: string }) => ({
          ...insight,
          icon: iconMap[insight.icon] || TrendingUp
        })) || [])
        
        // Map icons for stats
        const statIconMap: Record<string, LucideIcon> = {
          MessageSquare, Zap, Target, Brain
        }
        
        setStats(data.stats?.map((stat: { icon: string; label: string; value: string; color: string }) => ({
          ...stat,
          icon: statIconMap[stat.icon] || Brain
        })) || [])
      }
    } catch (error) {
      console.error('Error loading AI data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadAIData()
  }, [loadAIData])

  // Función para abrir el chat de IA
  const openFloatingChat = (question?: string) => {
    // Navegar a la página de chat de IA
    if (question) {
      router.push(`/company/ai/assist?q=${encodeURIComponent(question)}`)
    } else {
      router.push('/company/ai/assist')
    }
  }

  // Función para ver tutorial
  const showTutorial = () => {
    setMessage({ type: 'info', text: 'Usa el botón flotante ↘️ para chatear. Pregunta sobre finanzas, facturas o gastos.' })
    setTimeout(() => setMessage(null), 5000)
  }

  const capabilities = [
    {
      icon: TrendingUp,
      title: 'Análisis Financiero',
      description: 'Balance, P&L, flujo de caja, ratios financieros y análisis de tendencias',
      color: 'blue',
      examples: [
        '¿Cuál es mi balance actual?',
        'Analiza mi rentabilidad',
        'Compara este mes vs anterior'
      ]
    },
    {
      icon: FileText,
      title: 'Gestión de Facturas',
      description: 'Estado de facturas, cobros pendientes, recordatorios y predicciones',
      color: 'purple',
      examples: [
        '¿Cuánto me deben en facturas?',
        '¿Qué cliente paga más tarde?',
        'Envía recordatorios automáticos'
      ]
    },
    {
      icon: DollarSign,
      title: 'Optimización de Gastos',
      description: 'Análisis de gastos, categorización, deducibles y recomendaciones de ahorro',
      color: 'green',
      examples: [
        'Analiza mis gastos del mes',
        'Encuentra gastos deducibles',
        '¿Dónde puedo ahorrar?'
      ]
    },
    {
      icon: Brain,
      title: 'Predicciones con ML',
      description: 'Flujo de caja futuro, ventas proyectadas, riesgos y oportunidades',
      color: 'orange',
      examples: [
        'Predice mi flujo de caja',
        'Proyecta ventas del trimestre',
        'Identifica riesgos financieros'
      ]
    },
    {
      icon: Target,
      title: 'Cumplimiento Fiscal',
      description: 'Obligaciones SAT, CFDI, deducciones, ISR/IVA y calendario fiscal',
      color: 'red',
      examples: [
        'Próximas obligaciones fiscales',
        'Calcula mi ISR anual',
        'Revisa mis CFDI'
      ]
    },
    {
      icon: Users,
      title: 'Análisis de Clientes',
      description: 'Patrones de pago, clientes VIP, riesgos de morosidad y oportunidades',
      color: 'cyan',
      examples: [
        '¿Quiénes son mis mejores clientes?',
        'Detecta clientes morosos',
        'Analiza patrones de compra'
      ]
    }
  ]

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
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              Asistente IA - {activeCompany?.name}
            </h1>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm">
              Tu asistente contable inteligente, personalizado para tu empresa
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700 w-fit">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Online
          </Badge>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {message.type === 'info' && <Bot className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Hero Card - Compacto */}
        <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white overflow-hidden relative">
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold">Asistente IA Personalizado</h2>
                  <p className="text-xs sm:text-sm text-blue-100">GPT-4 + Machine Learning</p>
                </div>
              </div>
              <Button 
                onClick={() => openFloatingChat()}
                className="bg-white text-blue-600 hover:bg-blue-50 flex-shrink-0"
                size="sm"
              >
                <MessageSquare className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Abrir Chat</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats - Grid compacto */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {stats.map((stat, idx) => (
            <Card key={idx} className="bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${stat.color}-600`} />
                  <div className="text-sm sm:text-lg font-bold text-gray-900">{stat.value}</div>
                </div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Insights - Compacto */}
        {recentInsights.length > 0 && (
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Brain className="w-5 h-5 text-purple-600" />
                Insights Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
              {recentInsights.slice(0, 3).map((insight, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    insight.type === 'success' ? 'bg-green-50 border-green-500' :
                    insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      insight.type === 'success' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                      <p className="text-xs text-gray-700 line-clamp-2">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Capabilities Grid - Compacto */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">¿Qué puedo hacer por ti?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {capabilities.map((capability, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 bg-${capability.color}-50 rounded-lg flex-shrink-0`}>
                      <capability.icon className={`w-5 h-5 text-${capability.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{capability.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{capability.description}</p>
                    </div>
                  </div>
                  <details className="group">
                    <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-blue-600 flex items-center gap-1">
                      Ver ejemplos
                      <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="space-y-1 mt-2">
                      {capability.examples.map((example, exIdx) => (
                        <button
                          key={exIdx}
                          onClick={() => openFloatingChat(example)}
                          className="block w-full text-left text-xs p-2 rounded bg-gray-50 hover:bg-blue-100 hover:text-blue-700 text-gray-700 transition-colors cursor-pointer"
                        >
                          • {example}
                        </button>
                      ))}
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tech Stack + Privacy - Combinado y Compacto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-purple-900 text-sm">🤖 Tecnología IA</h3>
              </div>
              <div className="space-y-2 text-xs text-purple-700">
                <p><strong>LLM:</strong> GPT-4 Turbo + Memoria contextual</p>
                <p><strong>ML:</strong> TensorFlow para predicciones</p>
                <p><strong>Datos:</strong> Tiempo real desde tu BD</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-blue-900 text-sm">🔒 Privacidad</h3>
              </div>
              <div className="space-y-2 text-xs text-blue-700">
                <p><strong>Aislamiento:</strong> Datos por empresa</p>
                <p><strong>Seguridad:</strong> Encriptación AES-256</p>
                <p><strong>Compliance:</strong> GDPR + LFPDPPP</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

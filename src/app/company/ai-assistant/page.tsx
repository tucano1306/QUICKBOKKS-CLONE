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

  // Función para abrir el chat flotante con una pregunta específica
  const openFloatingChat = (question?: string) => {
    // Disparar evento para abrir el FloatingAssistant con la pregunta
    const event = new CustomEvent('openAIChat', { detail: { question } })
    window.dispatchEvent(event)
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              Asistente IA - {activeCompany?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Tu asistente contable inteligente, personalizado para tu empresa
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Online
          </Badge>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {message.type === 'info' && <Bot className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Hero Card */}
        <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Asistente IA Personalizado</h2>
                    <p className="text-blue-100">Potenciado por GPT-4 + Machine Learning</p>
                  </div>
                </div>
                <p className="text-lg mb-6 text-blue-50">
                  Haz preguntas sobre tus finanzas, obtén insights automáticos y recibe recomendaciones
                  personalizadas. El asistente aprende de tu empresa y mejora continuamente.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => openFloatingChat()}
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Abrir Chat
                  </Button>
                  <Button 
                    onClick={showTutorial}
                    variant="outline" 
                    className="border-white text-white hover:bg-white/20"
                  >
                    Ver Tutorial
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <Bot className="w-32 h-32 text-white/80" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Insights Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentInsights.map((insight, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'success' ? 'bg-green-50 border-green-500' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <insight.icon className={`w-5 h-5 mt-0.5 ${
                    insight.type === 'success' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                    <p className="text-xs text-gray-500">{insight.date}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Capabilities Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Qué puedo hacer por ti?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((capability, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`p-3 bg-${capability.color}-50 rounded-lg w-fit mb-4`}>
                    <capability.icon className={`w-6 h-6 text-${capability.color}-600`} />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{capability.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{capability.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Ejemplos:</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tech Stack Info */}
        <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2 text-lg flex items-center gap-2">
                  🤖 Tecnología del Asistente IA
                </h3>
                <p className="text-purple-700 text-sm mb-3">
                  Nuestro asistente combina múltiples modelos de IA y Machine Learning para darte respuestas precisas y personalizadas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Procesamiento de Lenguaje:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• OpenAI GPT-4 Turbo</li>
                      <li>• Comprensión contextual</li>
                      <li>• Respuestas en español nativo</li>
                      <li>• Memoria de conversación</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Análisis Predictivo:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• TensorFlow + PyTorch</li>
                      <li>• Predicción de flujo de caja</li>
                      <li>• Detección de anomalías</li>
                      <li>• Forecasting de ventas</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Integración de Datos:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• Acceso en tiempo real a BD</li>
                      <li>• Análisis de históricos</li>
                      <li>• Benchmarking industria</li>
                      <li>• Aislamiento por empresa</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">🔒 Privacidad y Seguridad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <ul className="space-y-1">
                      <li>• <strong>Datos Aislados:</strong> Cada empresa tiene su propio contexto IA</li>
                      <li>• <strong>Sin Compartir:</strong> Tus datos NUNCA se usan para entrenar modelos públicos</li>
                      <li>• <strong>Encriptación:</strong> Todas las conversaciones están encriptadas (AES-256)</li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-1">
                      <li>• <strong>Compliance:</strong> GDPR + LFPDPPP (México) compliant</li>
                      <li>• <strong>Auditoría:</strong> Todas las consultas quedan registradas</li>
                      <li>• <strong>Control Total:</strong> Puedes borrar tu historial cuando quieras</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
  Brain,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'recommendation' | 'trend' | 'achievement'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  action?: string
  metric?: {
    value: string
    change: number
    trend: 'up' | 'down'
  }
  confidence: number
  category: string
}

interface Prediction {
  title: string
  value: string
  probability: number
  timeline: string
  factors: string[]
}

export default function AIInsightsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'insights' | 'predictions' | 'anomalies'>('insights')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    // Simular análisis de IA
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }, [])

  // Insights generados por IA
  const insights: Insight[] = [
    {
      id: '1',
      type: 'opportunity',
      priority: 'high',
      title: 'Oportunidad de Optimización de Flujo de Efectivo',
      description: 'Se detectó que el período de cobro promedio es 15 días mayor que el estándar de la industria.',
      impact: 'Potencial mejora de $45,000 en liquidez mensual',
      action: 'Implementar descuentos por pronto pago del 2% a 10 días',
      metric: {
        value: '45 días',
        change: 15,
        trend: 'down'
      },
      confidence: 87,
      category: 'Flujo de Efectivo'
    },
    {
      id: '2',
      type: 'warning',
      priority: 'high',
      title: 'Riesgo de Sobrecosto en Gastos Operativos',
      description: 'Los gastos operativos han aumentado un 23% en los últimos 3 meses, superando el crecimiento de ingresos.',
      impact: 'Reducción del margen operativo del 22.8% al 18.5%',
      action: 'Revisar contratos de servicios y renegociar con proveedores clave',
      metric: {
        value: '+23%',
        change: 23,
        trend: 'up'
      },
      confidence: 92,
      category: 'Gastos Operativos'
    },
    {
      id: '3',
      type: 'achievement',
      priority: 'medium',
      title: 'Superación de Meta de Rentabilidad',
      description: 'El margen de utilidad neta alcanzó 18.3%, superando el objetivo del 17% establecido.',
      impact: 'Utilidad adicional de $12,500 sobre proyección',
      metric: {
        value: '18.3%',
        change: 7.6,
        trend: 'up'
      },
      confidence: 95,
      category: 'Rentabilidad'
    },
    {
      id: '4',
      type: 'recommendation',
      priority: 'high',
      title: 'Optimizar Gestión de Inventario',
      description: 'El análisis predictivo sugiere que 3 productos tienen rotación subóptima, generando costos de almacenamiento innecesarios.',
      impact: 'Ahorro potencial de $8,200 mensuales en costos de almacenamiento',
      action: 'Aplicar promociones en productos de baja rotación',
      confidence: 84,
      category: 'Inventario'
    },
    {
      id: '5',
      type: 'trend',
      priority: 'medium',
      title: 'Patrón Estacional Detectado en Ventas',
      description: 'Se identificó un patrón cíclico con picos en marzo, junio y diciembre. Las ventas aumentan un 35% en estos períodos.',
      impact: 'Oportunidad de planificación estratégica de inventario',
      action: 'Incrementar stock 2 meses antes de períodos pico',
      confidence: 89,
      category: 'Ventas'
    },
    {
      id: '6',
      type: 'recommendation',
      priority: 'medium',
      title: 'Diversificación de Cartera de Clientes',
      description: 'El 65% de los ingresos provienen de 3 clientes principales, generando concentración de riesgo.',
      impact: 'Reducir riesgo comercial y volatilidad de ingresos',
      action: 'Implementar estrategia de adquisición de clientes medianos',
      confidence: 81,
      category: 'Clientes'
    }
  ]

  // Predicciones financieras
  const predictions: Prediction[] = [
    {
      title: 'Ingresos Próximo Trimestre',
      value: '$385,000 - $420,000',
      probability: 85,
      timeline: 'Q1 2026',
      factors: [
        'Tendencia histórica de crecimiento (+18.5%)',
        'Nuevos contratos cerrados recientemente',
        'Estacionalidad favorable del período',
        'Expansión del equipo de ventas'
      ]
    },
    {
      title: 'Punto de Equilibrio Operativo',
      value: 'Semana 3 de Enero 2026',
      probability: 78,
      timeline: '3 semanas',
      factors: [
        'Costos fijos actuales de $45,000/mes',
        'Margen de contribución del 42%',
        'Proyección de ventas de $125,000/mes',
        'Sin cambios significativos en estructura'
      ]
    },
    {
      title: 'Necesidad de Capital de Trabajo',
      value: '$75,000 adicionales',
      probability: 72,
      timeline: 'Febrero 2026',
      factors: [
        'Incremento proyectado de inventario',
        'Expansión de ciclo de cobro',
        'Inversión en nuevos equipos',
        'Contratación de 2 nuevos empleados'
      ]
    },
    {
      title: 'ROI de Inversión en Marketing',
      value: '3.8x en 6 meses',
      probability: 80,
      timeline: '6 meses',
      factors: [
        'Performance actual de campañas: 3.2x',
        'Optimización de canales digitales',
        'Reducción de CAC en 15%',
        'Aumento de LTV del cliente'
      ]
    }
  ]

  // Anomalías detectadas
  const anomalies = [
    {
      title: 'Pico Inusual en Gastos de Oficina',
      date: '15 Nov 2025',
      severity: 'medium',
      description: 'Gasto de $12,500 es 340% superior al promedio mensual de $2,800',
      possibleCauses: ['Compra de equipo nuevo', 'Error de registro', 'Pago acumulado de múltiples meses']
    },
    {
      title: 'Disminución Atípica de Ventas',
      date: '18-20 Nov 2025',
      severity: 'low',
      description: 'Caída del 45% en ventas durante 3 días consecutivos',
      possibleCauses: ['Fin de semana largo', 'Problema técnico en sistema de ventas', 'Falta de inventario']
    },
    {
      title: 'Cobro Duplicado Detectado',
      date: '22 Nov 2025',
      severity: 'high',
      description: 'Posible duplicación de cobro al cliente "Pérez y Asociados" por $15,000',
      possibleCauses: ['Error en facturación', 'Problema en integración de pagos', 'Registro manual duplicado']
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-red-600'
      case 'medium': return 'from-orange-500 to-orange-600'
      case 'low': return 'from-blue-500 to-blue-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Lightbulb className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'recommendation': return <Target className="w-5 h-5" />
      case 'trend': return <TrendingUp className="w-5 h-5" />
      case 'achievement': return <CheckCircle2 className="w-5 h-5" />
      default: return <Sparkles className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-green-100 text-green-700 border-green-200'
      case 'warning': return 'bg-red-100 text-red-700 border-red-200'
      case 'recommendation': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'trend': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'achievement': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
            <Brain className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-600 animate-pulse">Analizando datos con IA...</p>
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
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Insights Inteligentes con IA</h1>
                <p className="text-gray-600 mt-1">
                  Análisis predictivo y recomendaciones personalizadas
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Último análisis: Hoy
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
              <Zap className="w-4 h-4 mr-2" />
              Generar Nuevo Análisis
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8 text-purple-600" />
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full font-medium">
                  IA Activa
                </span>
              </div>
              <div className="text-3xl font-bold text-purple-900">{insights.length}</div>
              <div className="text-sm text-purple-700">Insights Generados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="w-8 h-8 text-green-600" />
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">
                {insights.filter(i => i.type === 'opportunity').length}
              </div>
              <div className="text-sm text-green-700">Oportunidades</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                  Atención
                </span>
              </div>
              <div className="text-3xl font-bold text-red-900">
                {insights.filter(i => i.priority === 'high').length}
              </div>
              <div className="text-sm text-red-700">Alta Prioridad</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-600" />
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Confianza
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-900">86%</div>
              <div className="text-sm text-blue-700">Precisión Promedio</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'insights'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Insights y Recomendaciones
            </div>
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'predictions'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Predicciones
            </div>
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'anomalies'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Anomalías Detectadas
            </div>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* High Priority Insights */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Alta Prioridad - Requiere Atención
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {insights.filter(i => i.priority === 'high').map(insight => (
                  <Card key={insight.id} className="border-l-4 border-l-red-500 hover:shadow-lg transition">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg border ${getTypeColor(insight.type)}`}>
                            {getTypeIcon(insight.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {insight.category}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-3">{insight.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2 text-purple-600 font-medium">
                                <DollarSign className="w-4 h-4" />
                                {insight.impact}
                              </div>
                              {insight.metric && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Métrica:</span>
                                  <span className="font-semibold">{insight.metric.value}</span>
                                  <span className={`flex items-center gap-1 ${
                                    insight.metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {insight.metric.trend === 'up' ? 
                                      <ArrowUpRight className="w-4 h-4" /> : 
                                      <ArrowDownRight className="w-4 h-4" />
                                    }
                                    {Math.abs(insight.metric.change)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            {insight.action && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 text-sm">
                                  <Lightbulb className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-blue-900">Acción Recomendada:</span>
                                  <span className="text-blue-700">{insight.action}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{insight.confidence}%</div>
                          <div className="text-xs text-gray-600">Confianza</div>
                          <div className="mt-2">
                            <Button size="sm">
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Medium Priority Insights */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Recomendaciones y Tendencias
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insights.filter(i => i.priority === 'medium').map(insight => (
                  <Card key={insight.id} className="hover:shadow-lg transition">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-lg border ${getTypeColor(insight.type)}`}>
                          {getTypeIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                            <span className="text-xs font-medium text-gray-600">{insight.confidence}%</span>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {insight.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                      <div className="text-sm text-purple-600 font-medium mb-3">
                        💡 {insight.impact}
                      </div>
                      {insight.action && (
                        <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          <strong>Acción:</strong> {insight.action}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Análisis Predictivo Avanzado</h3>
                  <p className="text-gray-700 text-sm">
                    Estas predicciones se basan en algoritmos de machine learning que analizan patrones históricos, 
                    tendencias del mercado y múltiples variables financieras para proyectar escenarios futuros.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {predictions.map((prediction, index) => (
                <Card key={index} className="hover:shadow-lg transition">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-gray-900">{prediction.title}</span>
                      <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full">
                        {prediction.probability}% probabilidad
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {prediction.value}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Timeline: {prediction.timeline}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Nivel de Confianza
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                          style={{ width: `${prediction.probability}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Factores Considerados:
                      </div>
                      <ul className="space-y-2">
                        {prediction.factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-600 rounded-lg">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Detección de Anomalías</h3>
                  <p className="text-gray-700 text-sm">
                    El sistema analiza continuamente tus transacciones para identificar patrones inusuales, 
                    errores potenciales y actividades fuera de lo normal que requieren tu atención.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {anomalies.map((anomaly, index) => {
                const severityColors = {
                  high: 'border-l-red-500 bg-red-50',
                  medium: 'border-l-orange-500 bg-orange-50',
                  low: 'border-l-yellow-500 bg-yellow-50'
                }
                const severityIcons = {
                  high: <AlertTriangle className="w-5 h-5 text-red-600" />,
                  medium: <AlertTriangle className="w-5 h-5 text-orange-600" />,
                  low: <AlertTriangle className="w-5 h-5 text-yellow-600" />
                }

                return (
                  <Card key={index} className={`border-l-4 ${severityColors[anomaly.severity as keyof typeof severityColors]}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            {severityIcons[anomaly.severity as keyof typeof severityIcons]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{anomaly.title}</h3>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                anomaly.severity === 'high' ? 'bg-red-200 text-red-700' :
                                anomaly.severity === 'medium' ? 'bg-orange-200 text-orange-700' :
                                'bg-yellow-200 text-yellow-700'
                              }`}>
                                {anomaly.severity === 'high' ? 'Alta' : 
                                 anomaly.severity === 'medium' ? 'Media' : 'Baja'} Severidad
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {anomaly.date}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-4">{anomaly.description}</p>
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Posibles Causas:
                              </div>
                              <ul className="space-y-1">
                                {anomaly.possibleCauses.map((cause, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                    <span className="text-gray-400">•</span>
                                    <span>{cause}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline">
                            Investigar
                          </Button>
                          <Button size="sm" variant="outline">
                            Marcar Revisado
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {anomalies.length === 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ¡Todo en Orden!
                  </h3>
                  <p className="text-gray-600">
                    No se detectaron anomalías en tus transacciones recientes.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI Model Info */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Motor de IA v2.1</h3>
                  <p className="text-sm text-gray-600">
                    Entrenado con 50,000+ transacciones | Actualizado continuamente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">94%</div>
                  <div className="text-gray-600">Precisión</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">2.5s</div>
                  <div className="text-gray-600">Tiempo Análisis</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">24/7</div>
                  <div className="text-gray-600">Monitoreo</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

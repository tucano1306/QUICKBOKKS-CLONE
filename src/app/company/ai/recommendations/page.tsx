'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lightbulb,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Star,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  X
} from 'lucide-react'

interface Recommendation {
  id: string
  category: string
  title: string
  description: string
  impact: 'High' | 'Medium' | 'Low'
  effort: 'Easy' | 'Moderate' | 'Complex'
  priority: number
  potentialSavings?: number
  potentialRevenue?: number
  timeToImplement: string
  status: 'New' | 'In Progress' | 'Completed' | 'Dismissed'
  steps: string[]
  metrics: {
    label: string
    value: string
  }[]
  roi?: number
}

export default function AIRecommendationsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    potentialSavings: 0,
    potentialRevenue: 0,
    avgROI: 0
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!activeCompany?.id) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/ai/recommendations?companyId=${activeCompany.id}`)
        
        if (!response.ok) throw new Error('Error')
        
        const data = await response.json()
        setRecommendations(data.recommendations || [])
        setStats({
          totalRecommendations: data.summary?.totalRecommendations || 0,
          potentialSavings: data.summary?.totalPotentialSavings || 0,
          potentialRevenue: data.summary?.totalPotentialRevenue || 0,
          avgROI: data.summary?.avgROI || 0
        })
      } catch {
        console.error('Error fetching recommendations')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated' && activeCompany) {
      fetchRecommendations()
    }
  }, [status, activeCompany])

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAction = (rec: Recommendation, action: 'start' | 'complete' | 'dismiss' | 'like' | 'dislike') => {
    switch (action) {
      case 'start':
        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'In Progress' as const } : r))
        showMessage('success', `Iniciado: "${rec.title}"`)
        break
      case 'complete':
        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'Completed' as const } : r))
        showMessage('success', '¡Completado!')
        break
      case 'dismiss':
        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'Dismissed' as const } : r))
        showMessage('info', 'Descartado')
        break
      case 'like':
        showMessage('info', '¡Gracias por tu feedback!')
        break
      case 'dislike':
        showMessage('info', 'Ajustaremos las recomendaciones')
        break
    }
  }

  const activeRecs = recommendations.filter(r => r.status !== 'Dismissed' && r.status !== 'Completed')

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
      <div className="space-y-4">
        {/* Header Compacto */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Recomendaciones IA</h1>
            <p className="text-xs sm:text-sm text-gray-500">Optimiza tu negocio</p>
          </div>
        </div>

        {/* Stats Grid - 2x2 en móvil */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 mb-1" />
              <div className="text-xl sm:text-2xl font-bold text-white">{activeRecs.length}</div>
              <div className="text-[10px] sm:text-xs text-white/80">Activas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 mb-1" />
              <div className="text-xl sm:text-2xl font-bold text-white">
                ${(stats.potentialSavings / 1000).toFixed(0)}K
              </div>
              <div className="text-[10px] sm:text-xs text-white/80">Ahorro</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 mb-1" />
              <div className="text-xl sm:text-2xl font-bold text-white">
                ${(stats.potentialRevenue / 1000).toFixed(0)}K
              </div>
              <div className="text-[10px] sm:text-xs text-white/80">Ingresos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 mb-1" />
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.avgROI.toFixed(0)}%</div>
              <div className="text-[10px] sm:text-xs text-white/80">ROI</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Recomendaciones */}
        {recommendations.length === 0 ? (
          <Card className="p-8 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin recomendaciones</h3>
            <p className="text-sm text-gray-500">Las recomendaciones de IA aparecerán aquí</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const isExpanded = expandedCard === rec.id
              const isDone = rec.status === 'Completed' || rec.status === 'Dismissed'
              
              return (
                <Card 
                  key={rec.id} 
                  className={`overflow-hidden transition-all ${
                    isDone ? 'opacity-60' : 'hover:shadow-md'
                  }`}
                >
                  {/* Header de la Card - Siempre visible */}
                  <div 
                    className="p-3 sm:p-4 cursor-pointer"
                    onClick={() => setExpandedCard(isExpanded ? null : rec.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono de prioridad */}
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        rec.priority === 1 ? 'bg-red-100' :
                        rec.priority <= 3 ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {rec.priority === 1 ? (
                          <Star className="w-4 h-4 text-red-600 fill-red-600" />
                        ) : (
                          <Lightbulb className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {rec.title}
                          </h3>
                          {rec.status !== 'New' && (
                            <Badge className={`text-[10px] ${
                              rec.status === 'In Progress' ? 'bg-purple-100 text-purple-700' :
                              rec.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {rec.status === 'In Progress' ? 'En Progreso' :
                               rec.status === 'Completed' ? 'Completado' : 'Descartado'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{rec.description}</p>
                        
                        {/* Badges compactos */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {rec.category.split(' ')[0]}
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            rec.impact === 'High' ? 'bg-red-100 text-red-700' :
                            rec.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.impact === 'High' ? 'Alto' : rec.impact === 'Medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                          {(rec.potentialSavings || rec.potentialRevenue) && (
                            <span className="text-[10px] font-semibold text-green-600">
                              ${((rec.potentialSavings || rec.potentialRevenue || 0) / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenido Expandido */}
                  {isExpanded && (
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {/* Métricas */}
                      <div className="grid grid-cols-3 gap-2">
                        {rec.potentialSavings && rec.potentialSavings > 0 && (
                          <div className="p-2 bg-green-50 rounded-lg text-center">
                            <TrendingDown className="w-4 h-4 text-green-600 mx-auto mb-1" />
                            <div className="text-sm font-bold text-green-700">
                              ${rec.potentialSavings.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-green-600">Ahorro</div>
                          </div>
                        )}
                        {rec.potentialRevenue && rec.potentialRevenue > 0 && (
                          <div className="p-2 bg-purple-50 rounded-lg text-center">
                            <DollarSign className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                            <div className="text-sm font-bold text-purple-700">
                              ${rec.potentialRevenue.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-purple-600">Ingresos</div>
                          </div>
                        )}
                        <div className="p-2 bg-blue-50 rounded-lg text-center">
                          <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                          <div className="text-sm font-bold text-blue-700">{rec.timeToImplement}</div>
                          <div className="text-[10px] text-blue-600">Tiempo</div>
                        </div>
                      </div>
                      
                      {/* Pasos */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Pasos de Implementación
                        </div>
                        <ol className="space-y-1.5">
                          {rec.steps.slice(0, 3).map((step, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="font-bold text-gray-400 min-w-[16px]">{idx + 1}.</span>
                              <span className="line-clamp-2">{step}</span>
                            </li>
                          ))}
                          {rec.steps.length > 3 && (
                            <li className="text-xs text-gray-400">+{rec.steps.length - 3} pasos más...</li>
                          )}
                        </ol>
                      </div>
                      
                      {/* Acciones */}
                      {!isDone && (
                        <div className="flex items-center justify-between pt-2">
                          {/* Feedback */}
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(rec, 'like') }}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Útil"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(rec, 'dislike') }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="No relevante"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Acciones principales */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleAction(rec, 'dismiss') }}
                              className="text-xs h-8 px-2"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Descartar
                            </Button>
                            
                            {rec.status === 'New' && (
                              <Button 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleAction(rec, 'start') }}
                                className="text-xs h-8 px-3 bg-blue-600 hover:bg-blue-700"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            
                            {rec.status === 'In Progress' && (
                              <Button 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleAction(rec, 'complete') }}
                                className="text-xs h-8 px-3 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Completar
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Toast Message */}
        {message && (
          <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto p-3 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-600 text-white' :
            message.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {message.type === 'error' && <XCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

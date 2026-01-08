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
  Lightbulb,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ThumbsUp,
  ThumbsDown,
  Filter,
  TrendingUp,
  Users,
  BarChart,
  Zap,
  Sparkles
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedImpact, setSelectedImpact] = useState<string>('All')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    potentialSavings: 0,
    potentialRevenue: 0,
    avgROI: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null)

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
        setError(null)
        
        const response = await fetch(`/api/ai/recommendations?companyId=${activeCompany.id}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar recomendaciones')
        }
        
        const data = await response.json()
        setRecommendations(data.recommendations || [])
        setStats({
          totalRecommendations: data.summary?.totalRecommendations || 0,
          potentialSavings: data.summary?.totalPotentialSavings || 0,
          potentialRevenue: data.summary?.totalPotentialRevenue || 0,
          avgROI: data.summary?.avgROI || 0
        })
      } catch (err) {
        console.error('Error fetching recommendations:', err)
        setError('Error al cargar las recomendaciones de IA')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated' && activeCompany) {
      fetchRecommendations()
    }
  }, [status, activeCompany])

  const handleStartImplementation = (rec: Recommendation) => {
    // Actualizar estado de la recomendación
    setRecommendations(prev => 
      prev.map(r => r.id === rec.id ? { ...r, status: 'In Progress' as const } : r)
    )
    setMessage({ type: 'success', text: `Implementación iniciada: "${rec.title}"` })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleViewProgress = (rec: Recommendation) => {
    setSelectedRec(rec)
  }

  const handleFeedback = (rec: Recommendation, isHelpful: boolean) => {
    setMessage({ 
      type: 'info', 
      text: isHelpful ? 'Gracias por tu feedback positivo!' : 'Gracias, ajustaremos las recomendaciones' 
    })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleDismiss = (recId: string) => {
    setRecommendations(prev => 
      prev.map(r => r.id === recId ? { ...r, status: 'Dismissed' as const } : r)
    )
    setMessage({ type: 'info', text: 'Recomendación descartada' })
    setTimeout(() => setMessage(null), 3000)
  }

  const categories = ['All', 'Cost Optimization', 'Tax Planning', 'Cash Flow', 'Revenue Growth', 'Process Improvement', 'Vendor Management', 'Collections', 'Pricing Strategy', 'Risk Management']
  const impactLevels = ['All', 'High', 'Medium', 'Low']

  const filteredRecommendations = recommendations
    .filter(rec => selectedCategory === 'All' || rec.category === selectedCategory)
    .filter(rec => selectedImpact === 'All' || rec.impact === selectedImpact)
    .sort((a, b) => a.priority - b.priority)

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'High':
        return <Badge className="bg-red-100 text-red-700">High Impact</Badge>
      case 'Medium':
        return <Badge className="bg-yellow-100 text-yellow-700">Medium Impact</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700">Low Impact</Badge>
    }
  }

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case 'Easy':
        return <Badge className="bg-green-100 text-green-700">Easy</Badge>
      case 'Moderate':
        return <Badge className="bg-yellow-100 text-yellow-700">Moderate</Badge>
      default:
        return <Badge className="bg-red-100 text-red-700">Complex</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <Badge className="bg-blue-100 text-blue-700">New</Badge>
      case 'In Progress':
        return <Badge className="bg-purple-100 text-purple-700">In Progress</Badge>
      case 'Completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700">Dismissed</Badge>
    }
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              <span>AI <span className="hidden sm:inline">Recommendations</span></span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              <span className="hidden sm:inline">Smart suggestions to optimize your business</span>
              <span className="sm:hidden">Optimize your business</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-900">
                {stats.totalRecommendations}
              </div>
              <div className="text-xs sm:text-sm text-blue-700">Active <span className="hidden sm:inline">Recommendations</span></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-900">
                ${(stats.potentialSavings / 1000).toFixed(0)}K
              </div>
              <div className="text-xs sm:text-sm text-green-700">Potential <span className="hidden sm:inline">Savings</span></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-900">
                ${(stats.potentialRevenue / 1000).toFixed(0)}K
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Revenue <span className="hidden sm:inline">Opportunity</span></div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-orange-900">
                {stats.avgROI.toFixed(0)}%
              </div>
              <div className="text-xs sm:text-sm text-orange-700">Average ROI</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Filters:</span>
              </div>
              
              <div className="w-full sm:flex-1 space-y-2 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Category:</span>
                  <div className="flex gap-1 flex-wrap">
                    {categories.slice(0, 4).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Impact:</span>
                  <div className="flex gap-1">
                    {impactLevels.map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedImpact(level)}
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedImpact === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <Card key={rec.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        rec.priority === 1 ? 'bg-red-100' :
                        rec.priority <= 3 ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {rec.priority === 1 ? (
                          <Star className="w-5 h-5 text-red-600 fill-red-600" />
                        ) : (
                          <Lightbulb className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{rec.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{rec.category}</Badge>
                      {getImpactBadge(rec.impact)}
                      {getEffortBadge(rec.effort)}
                      {getStatusBadge(rec.status)}
                      {rec.priority <= 2 && (
                        <Badge className="bg-orange-100 text-orange-700">Priority {rec.priority}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Financial Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rec.potentialSavings && rec.potentialSavings > 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-900">COST SAVINGS</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          ${rec.potentialSavings.toLocaleString('en-US')}
                        </div>
                      </div>
                    )}
                    {rec.potentialRevenue && rec.potentialRevenue > 0 && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-900">REVENUE OPPORTUNITY</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          ${rec.potentialRevenue.toLocaleString('en-US')}
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">TIME TO IMPLEMENT</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {rec.timeToImplement}
                      </div>
                      {rec.roi && (
                        <div className="text-xs text-blue-700 mt-1">
                          ROI: {rec.roi}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {rec.metrics.map((metric, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">{metric.label}</div>
                        <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Implementation Steps */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-900">IMPLEMENTATION STEPS</span>
                    </div>
                    <ol className="space-y-2">
                      {rec.steps.map((step, idx) => (
                        <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                          <span className="font-bold text-yellow-600 min-w-[20px]">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleFeedback(rec, true)}>
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Helpful
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleFeedback(rec, false)}>
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        Not Relevant
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDismiss(rec.id)} title="Descartar">
                        <XCircle className="w-4 h-4" />
                      </Button>
                      {rec.status === 'New' && (
                        <Button size="sm" onClick={() => handleStartImplementation(rec)}>
                          Start Implementation
                        </Button>
                      )}
                      {rec.status === 'In Progress' && (
                        <Button size="sm" onClick={() => handleViewProgress(rec)}>
                          View Progress
                        </Button>
                      )}
                      {rec.status === 'Completed' && (
                        <Badge className="bg-green-100 text-green-700">Completado</Badge>
                      )}
                      {rec.status === 'Dismissed' && (
                        <Badge className="bg-gray-100 text-gray-500">Descartado</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toast Message */}
        {message && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 border border-green-300 text-green-800' :
            message.type === 'error' ? 'bg-red-100 border border-red-300 text-red-800' :
            'bg-blue-100 border border-blue-300 text-blue-800'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'error' && <XCircle className="w-5 h-5" />}
            {message.type === 'info' && <Info className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Modal de Progreso */}
        {selectedRec && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedRec.title}</h3>
                    <Badge className="mt-2 bg-blue-100 text-blue-700">En Progreso</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRec(null)}>
                    ✕
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3">Progreso de Implementación</h4>
                    <div className="space-y-3">
                      {selectedRec.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {idx === 0 ? '✓' : idx + 1}
                          </div>
                          <span className={idx === 0 ? 'line-through text-gray-400' : 'text-gray-700'}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedRec.potentialSavings ? `$${selectedRec.potentialSavings.toLocaleString()}` : 
                         selectedRec.potentialRevenue ? `$${selectedRec.potentialRevenue.toLocaleString()}` : 'N/A'}
                      </div>
                      <div className="text-xs text-green-700">Impacto Esperado</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedRec.timeToImplement}</div>
                      <div className="text-xs text-blue-700">Tiempo Estimado</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedRec(null)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => {
                    setRecommendations(prev => 
                      prev.map(r => r.id === selectedRec.id ? { ...r, status: 'Completed' as const } : r)
                    )
                    setSelectedRec(null)
                    setMessage({ type: 'success', text: 'Recomendación marcada como completada!' })
                    setTimeout(() => setMessage(null), 3000)
                  }}>
                    Marcar Completado
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

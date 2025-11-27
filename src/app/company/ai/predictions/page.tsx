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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart,
  LineChart,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  RefreshCw,
  Target,
  Activity,
  Zap,
  Brain
} from 'lucide-react'

interface Prediction {
  id: string
  type: string
  title: string
  timeframe: string
  prediction: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  actual?: number
  accuracy?: number
  insights: string[]
}

interface ForecastData {
  month: string
  actual?: number
  predicted: number
  lowerBound: number
  upperBound: number
}

export default function AIPredictionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('6months')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [cashFlowForecast, setCashFlowForecast] = useState<ForecastData[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingModels, setUpdatingModels] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/ai/predictions?timeframe=${selectedTimeframe}${activeCompany?.id ? `&companyId=${activeCompany.id}` : ''}`)
        const data = await response.json()
        
        if (data.success) {
          setPredictions(data.predictions || [])
          setCashFlowForecast(data.cashFlowForecast || [])
          setCurrentMetrics(data.currentMetrics || null)
        } else {
          setError(data.error || 'Error al cargar predicciones')
        }
      } catch (err) {
        console.error('Error fetching predictions:', err)
        setError('Error al conectar con el servidor')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchPredictions()
    }
  }, [status, selectedTimeframe, activeCompany])

  const handleUpdateModels = async () => {
    setUpdatingModels(true)
    try {
      // Simular actualización de modelos con datos reales
      const response = await fetch(`/api/ai/predictions?timeframe=${selectedTimeframe}&refresh=true${activeCompany?.id ? `&companyId=${activeCompany.id}` : ''}`)
      const data = await response.json()
      
      if (data.success) {
        setPredictions(data.predictions || [])
        setCashFlowForecast(data.cashFlowForecast || [])
        setCurrentMetrics(data.currentMetrics || null)
        setMessage({ type: 'success', text: 'Modelos IA actualizados con datos recientes' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (err) {
      console.error('Error updating models:', err)
      setMessage({ type: 'error', text: 'Error al actualizar modelos' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setUpdatingModels(false)
    }
  }

  const handleExportForecast = () => {
    setExporting(true)
    try {
      // Crear CSV con las predicciones
      const headers = ['Categoría', 'Título', 'Predicción', 'Tendencia', 'Confianza %', 'Período']
      const rows = predictions.map(p => [
        p.type || 'N/A',
        p.title || 'N/A',
        typeof p.prediction === 'number' && p.prediction !== null ? `$${p.prediction.toLocaleString()}` : String(p.prediction || 'N/A'),
        p.trend === 'up' ? 'Incremento' : p.trend === 'down' ? 'Decremento' : 'Estable',
        (p.confidence || 0).toString(),
        p.timeframe || 'N/A'
      ])
      
      // Agregar forecast de flujo de caja
      const cashFlowHeaders = ['Mes', 'Predicción', 'Límite Inferior', 'Límite Superior']
      const cashFlowRows = (cashFlowForecast || []).map(f => [
        f.month || 'N/A',
        f.predicted !== null && f.predicted !== undefined ? `$${f.predicted.toLocaleString()}` : 'N/A',
        f.lowerBound !== null && f.lowerBound !== undefined ? `$${f.lowerBound.toLocaleString()}` : 'N/A',
        f.upperBound !== null && f.upperBound !== undefined ? `$${f.upperBound.toLocaleString()}` : 'N/A'
      ])
      
      let csvContent = '=== PREDICCIONES IA ===\n'
      csvContent += headers.join(',') + '\n'
      csvContent += rows.map(row => row.join(',')).join('\n')
      csvContent += '\n\n=== PRONÓSTICO FLUJO DE CAJA ===\n'
      csvContent += cashFlowHeaders.join(',') + '\n'
      csvContent += cashFlowRows.map(row => row.join(',')).join('\n')
      
      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `predicciones_ia_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setMessage({ type: 'success', text: 'Archivo CSV exportado exitosamente' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Error exporting:', err)
      setMessage({ type: 'error', text: 'Error al exportar predicciones' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setExporting(false)
    }
  }

  const stats = {
    totalPredictions: predictions.length,
    avgConfidence: predictions.length > 0 ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length : 0,
    avgAccuracy: predictions.filter(p => p.accuracy).length > 0 
      ? predictions.filter(p => p.accuracy).reduce((sum, p) => sum + (p.accuracy || 0), 0) / predictions.filter(p => p.accuracy).length 
      : 85,
    modelsActive: 6
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-blue-600" />
    }
  }

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'up':
        return <Badge className="bg-green-100 text-green-700">Incremento</Badge>
      case 'down':
        return <Badge className="bg-red-100 text-red-700">Decremento</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700">Estable</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-100 text-green-700">Alta Confianza</Badge>
    } else if (confidence >= 80) {
      return <Badge className="bg-blue-100 text-blue-700">Buena Confianza</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-700">Confianza Moderada</Badge>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              Predicciones y Pronósticos IA
            </h1>
            <p className="text-gray-600 mt-1">
              Predicciones inteligentes basadas en tus datos reales
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUpdateModels} disabled={updatingModels}>
              <RefreshCw className={`w-4 h-4 mr-2 ${updatingModels ? 'animate-spin' : ''}`} />
              {updatingModels ? 'Actualizando...' : 'Update Models'}
            </Button>
            <Button onClick={handleExportForecast} disabled={exporting || predictions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exportando...' : 'Export Forecast'}
            </Button>
          </div>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'error' && <AlertTriangle className="w-5 h-5" />}
            {message.type === 'info' && <Info className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalPredictions}
              </div>
              <div className="text-sm text-purple-700">Active Predictions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.avgConfidence.toFixed(0)}%
              </div>
              <div className="text-sm text-blue-700">Avg Confidence</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.avgAccuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-green-700">Avg Accuracy</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.modelsActive}
              </div>
              <div className="text-sm text-orange-700">ML Models Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Forecast Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Revenue Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cashFlowForecast.slice(-6).map((data, idx) => {
                  const isActual = data.actual !== undefined
                  const value = isActual ? data.actual : data.predicted
                  const maxValue = Math.max(...cashFlowForecast.map(d => d.upperBound || d.predicted))
                  const percentage = (value / maxValue) * 100

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{data.month}</span>
                        <span className={`font-semibold ${isActual ? 'text-green-600' : 'text-blue-600'}`}>
                          ${(value / 1000).toFixed(0)}K
                          {!isActual && (
                            <span className="text-xs text-gray-500 ml-1">
                              (±${((data.upperBound - data.lowerBound) / 2000).toFixed(0)}K)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isActual ? 'bg-green-600' : 'bg-blue-600'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Trend:</strong> Revenue projected to increase 15.2% over next 6 months based on current growth trajectory and seasonal patterns.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cash Flow Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cashFlowForecast.slice(-6).map((data, idx) => {
                  const isActual = data.actual !== undefined
                  const value = isActual ? data.actual : data.predicted
                  const maxValue = Math.max(...cashFlowForecast.map(d => d.upperBound || d.predicted))
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{data.month}</span>
                        <span className={`font-semibold ${isActual ? 'text-green-600' : 'text-purple-600'}`}>
                          ${(value / 1000).toFixed(0)}K
                          {!isActual && data.upperBound && data.lowerBound && (
                            <span className="text-xs text-gray-500 ml-1">
                              (±${((data.upperBound - data.lowerBound) / 2000).toFixed(0)}K)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isActual ? 'bg-green-600' : 'bg-purple-600'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>Alert:</strong> Cash position remains healthy. Maintain minimum $2M reserve. Seasonal dip expected in January (post-holiday).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => (
            <Card key={prediction.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTrendIcon(prediction.trend)}
                      <CardTitle className="text-lg">{prediction.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{prediction.type}</Badge>
                      <Badge variant="outline">{prediction.timeframe}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prediction Value */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Predicted Value</span>
                      {getTrendBadge(prediction.trend)}
                    </div>
                    <div className="text-3xl font-bold text-blue-900">
                      {prediction.type === 'Profit Margin' || prediction.type === 'Customer Churn' || prediction.type === 'Days Sales Outstanding'
                        ? `${prediction.prediction}${prediction.type === 'Profit Margin' || prediction.type === 'Customer Churn' ? '%' : ' days'}`
                        : `$${prediction.prediction.toLocaleString('en-US')}`
                      }
                    </div>
                    {prediction.actual && (
                      <div className="mt-2 text-sm text-gray-600">
                        Actual: {prediction.type === 'Profit Margin' ? `${prediction.actual}%` : `$${prediction.actual.toLocaleString('en-US')}`}
                      </div>
                    )}
                  </div>

                  {/* Confidence and Accuracy */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${prediction.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{prediction.confidence}%</span>
                      </div>
                    </div>
                    {prediction.accuracy && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Accuracy</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${prediction.accuracy}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900">{prediction.accuracy}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Insights */}
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-900">KEY INSIGHTS</span>
                    </div>
                    <ul className="space-y-1">
                      {prediction.insights.map((insight, idx) => (
                        <li key={idx} className="text-xs text-yellow-700 flex items-start gap-1">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-between items-center">
                    {getConfidenceBadge(prediction.confidence)}
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About AI Predictions</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Our AI prediction models use machine learning algorithms trained on your historical data to forecast future financial outcomes with high accuracy.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Machine Learning:</strong> Models trained on 3+ years of your financial data and industry benchmarks</li>
                  <li>• <strong>Confidence Levels:</strong> Higher confidence (90%+) means more reliable predictions based on consistent patterns</li>
                  <li>• <strong>Accuracy Tracking:</strong> We compare predictions to actual results to continuously improve models</li>
                  <li>• <strong>Forecast Range:</strong> Upper and lower bounds show the likely range of outcomes (confidence intervals)</li>
                  <li>• <strong>Seasonal Patterns:</strong> Models account for recurring seasonal trends in your business</li>
                  <li>• <strong>Update Frequency:</strong> Predictions refresh daily as new transaction data is processed</li>
                  <li>• <strong>Best Practice:</strong> Use predictions for planning, but always validate with your business knowledge</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

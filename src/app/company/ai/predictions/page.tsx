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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const predictions: Prediction[] = [
    {
      id: '1',
      type: 'Revenue',
      title: 'December 2025 Revenue',
      timeframe: 'Next Month',
      prediction: 1285000,
      confidence: 92,
      trend: 'up',
      insights: [
        'Seasonal increase expected (+8% vs Nov)',
        'Based on 3-year historical patterns',
        'Holiday sales boost anticipated',
        'New customer acquisitions trending up'
      ]
    },
    {
      id: '2',
      type: 'Cash Flow',
      title: 'Q1 2026 Cash Position',
      timeframe: 'Next Quarter',
      prediction: 2450000,
      confidence: 88,
      trend: 'up',
      insights: [
        'Strong collections expected in January',
        'Major client payments due Q1',
        'Operating expenses stable',
        'Recommend maintaining 15% cash reserve'
      ]
    },
    {
      id: '3',
      type: 'Expenses',
      title: 'December Operating Costs',
      timeframe: 'Next Month',
      prediction: 685000,
      confidence: 94,
      trend: 'stable',
      insights: [
        'Within normal range (+2% vs Nov)',
        'Payroll and rent remain consistent',
        'Marketing spend aligned with budget',
        'No unusual expense patterns detected'
      ]
    },
    {
      id: '4',
      type: 'Profit Margin',
      title: 'Q4 2025 Net Margin',
      timeframe: 'This Quarter',
      prediction: 18.5,
      confidence: 90,
      trend: 'up',
      actual: 17.2,
      accuracy: 92.7,
      insights: [
        'Margin improvement from cost optimization',
        'Revenue growth outpacing expense increases',
        'Gross margin stable at 42%',
        'Target of 20% achievable by Q2 2026'
      ]
    },
    {
      id: '5',
      type: 'Collections',
      title: 'Days Sales Outstanding',
      timeframe: 'Next 30 Days',
      prediction: 34,
      confidence: 87,
      trend: 'down',
      insights: [
        'DSO improvement from payment reminders',
        'Large invoices expected to clear',
        'Collection efficiency up 12%',
        'Target: Maintain below 35 days'
      ]
    },
    {
      id: '6',
      type: 'Customer Churn',
      title: 'Monthly Churn Rate',
      timeframe: 'December 2025',
      prediction: 2.8,
      confidence: 85,
      trend: 'stable',
      insights: [
        'Below industry average (3.5%)',
        'Retention programs showing results',
        'Focus on at-risk accounts identified',
        '15 customers flagged for attention'
      ]
    }
  ]

  const cashFlowForecast: ForecastData[] = [
    { month: 'Jul 2025', actual: 2150000, predicted: 2180000, lowerBound: 2080000, upperBound: 2280000 },
    { month: 'Aug 2025', actual: 2280000, predicted: 2250000, lowerBound: 2150000, upperBound: 2350000 },
    { month: 'Sep 2025', actual: 2420000, predicted: 2380000, lowerBound: 2280000, upperBound: 2480000 },
    { month: 'Oct 2025', actual: 2350000, predicted: 2400000, lowerBound: 2300000, upperBound: 2500000 },
    { month: 'Nov 2025', actual: 2480000, predicted: 2450000, lowerBound: 2350000, upperBound: 2550000 },
    { month: 'Dec 2025', predicted: 2620000, lowerBound: 2480000, upperBound: 2760000 },
    { month: 'Jan 2026', predicted: 2350000, lowerBound: 2200000, upperBound: 2500000 },
    { month: 'Feb 2026', predicted: 2450000, lowerBound: 2300000, upperBound: 2600000 },
    { month: 'Mar 2026', predicted: 2580000, lowerBound: 2420000, upperBound: 2740000 },
    { month: 'Apr 2026', predicted: 2720000, lowerBound: 2560000, upperBound: 2880000 },
    { month: 'May 2026', predicted: 2850000, lowerBound: 2680000, upperBound: 3020000 },
    { month: 'Jun 2026', predicted: 2950000, lowerBound: 2770000, upperBound: 3130000 }
  ]

  const revenueForecast: ForecastData[] = [
    { month: 'Jul 2025', actual: 1150000, predicted: 1120000, lowerBound: 1080000, upperBound: 1160000 },
    { month: 'Aug 2025', actual: 1180000, predicted: 1150000, lowerBound: 1110000, upperBound: 1190000 },
    { month: 'Sep 2025', actual: 1220000, predicted: 1200000, lowerBound: 1160000, upperBound: 1240000 },
    { month: 'Oct 2025', actual: 1190000, predicted: 1210000, lowerBound: 1170000, upperBound: 1250000 },
    { month: 'Nov 2025', actual: 1240000, predicted: 1220000, lowerBound: 1180000, upperBound: 1260000 },
    { month: 'Dec 2025', predicted: 1285000, lowerBound: 1240000, upperBound: 1330000 },
    { month: 'Jan 2026', predicted: 1180000, lowerBound: 1130000, upperBound: 1230000 },
    { month: 'Feb 2026', predicted: 1220000, lowerBound: 1170000, upperBound: 1270000 },
    { month: 'Mar 2026', predicted: 1280000, lowerBound: 1230000, upperBound: 1330000 },
    { month: 'Apr 2026', predicted: 1350000, lowerBound: 1290000, upperBound: 1410000 },
    { month: 'May 2026', predicted: 1420000, lowerBound: 1360000, upperBound: 1480000 },
    { month: 'Jun 2026', predicted: 1480000, lowerBound: 1410000, upperBound: 1550000 }
  ]

  const stats = {
    totalPredictions: predictions.length,
    avgConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
    avgAccuracy: predictions.filter(p => p.accuracy).reduce((sum, p) => sum + (p.accuracy || 0), 0) / predictions.filter(p => p.accuracy).length,
    modelsActive: 12
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
        return <Badge className="bg-green-100 text-green-700">Increasing</Badge>
      case 'down':
        return <Badge className="bg-red-100 text-red-700">Decreasing</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700">Stable</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-100 text-green-700">High Confidence</Badge>
    } else if (confidence >= 80) {
      return <Badge className="bg-blue-100 text-blue-700">Good Confidence</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-700">Moderate Confidence</Badge>
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
              AI Predictions & Forecasting
            </h1>
            <p className="text-gray-600 mt-1">
              Machine learning predictions for your financial future
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('🔄 Update Models\n\nActualizando modelos de IA con datos más recientes...')}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Models
            </Button>
            <Button onClick={() => alert('📥 Export Forecast\n\nExportando predicciones a CSV')}>
              <Download className="w-4 h-4 mr-2" />
              Export Forecast
            </Button>
          </div>
        </div>

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
                {revenueForecast.slice(-6).map((data, idx) => {
                  const isActual = data.actual !== undefined
                  const value = isActual ? data.actual : data.predicted
                  const maxValue = Math.max(...revenueForecast.map(d => d.upperBound))
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
                  const maxValue = Math.max(...cashFlowForecast.map(d => d.upperBound))
                  const percentage = (value / maxValue) * 100

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{data.month}</span>
                        <span className={`font-semibold ${isActual ? 'text-green-600' : 'text-purple-600'}`}>
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

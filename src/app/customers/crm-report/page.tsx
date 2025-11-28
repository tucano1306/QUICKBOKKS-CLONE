'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  PhoneCall,
  Video,
  Mail,
  MessageSquare,
  Calendar,
  Download,
  FileSpreadsheet,
  Target,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface CRMMetrics {
  totalCustomers: number
  activeCustomers: number
  newCustomersThisMonth: number
  churnRate: number
  averageLifetimeValue: number
  totalRevenue: number
  averageDealSize: number
  conversionRate: number
  averageSalesCycle: number
  totalInteractions: number
  callsCount: number
  meetingsCount: number
  emailsCount: number
  whatsappCount: number
  topPerformers: Array<{
    name: string
    customers: number
    revenue: number
    conversions: number
  }>
  pipelineByStage: Array<{
    stage: string
    count: number
    value: number
  }>
  monthlyTrend: Array<{
    month: string
    customers: number
    revenue: number
  }>
}

export default function CRMReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [metrics, setMetrics] = useState<CRMMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/customers/crm/metrics?dateRange=${dateRange}`)
      if (res.ok) {
        const data = await res.json()
        setMetrics(data.metrics || null)
      }
    } catch (error) {
      console.error('Error loading CRM metrics:', error)
      toast.error('Error al cargar métricas')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    if (status === 'authenticated') {
      loadMetrics()
    }
  }, [status, dateRange, loadMetrics])

  const exportReport = () => {
    if (!metrics) return

    const reportData = [
      ['Reporte CRM', ''],
      ['Fecha', new Date().toLocaleDateString('es-MX')],
      [''],
      ['MÉTRICAS GENERALES', ''],
      ['Total Clientes', metrics.totalCustomers],
      ['Clientes Activos', metrics.activeCustomers],
      ['Nuevos este mes', metrics.newCustomersThisMonth],
      ['Tasa de abandono', `${metrics.churnRate}%`],
      [''],
      ['MÉTRICAS FINANCIERAS', ''],
      ['Ingresos Totales', `$${metrics.totalRevenue.toLocaleString('es-MX')}`],
      ['Valor Promedio Cliente', `$${metrics.averageLifetimeValue.toLocaleString('es-MX')}`],
      ['Tamaño Promedio Venta', `$${metrics.averageDealSize.toLocaleString('es-MX')}`],
      [''],
      ['RENDIMIENTO', ''],
      ['Tasa de Conversión', `${metrics.conversionRate}%`],
      ['Ciclo Promedio Ventas', `${metrics.averageSalesCycle} días`],
      ['Total Interacciones', metrics.totalInteractions],
      [''],
      ['TOP PERFORMERS', 'Clientes', 'Revenue', 'Conversiones'],
      ...metrics.topPerformers.map(p => [p.name, p.customers, `$${p.revenue.toLocaleString('es-MX')}`, p.conversions])
    ]

    const csv = reportData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte-crm-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast.success('Reporte exportado')
  }

  if (status === 'loading' || isLoading || !metrics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reporte CRM</h1>
              <p className="text-gray-600 mt-1">
                Análisis y métricas de gestión de clientes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="quarter">Último trimestre</option>
              <option value="year">Último año</option>
            </select>
            <Button onClick={exportReport} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clientes</p>
                  <p className="text-3xl font-bold">{metrics.totalCustomers}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{metrics.newCustomersThisMonth} este mes</span>
                  </div>
                </div>
                <Users className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos Totales</p>
                  <p className="text-3xl font-bold">
                    ${(metrics.totalRevenue / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avg: ${(metrics.averageDealSize / 1000).toFixed(0)}K
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa Conversión</p>
                  <p className="text-3xl font-bold">{metrics.conversionRate}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Ciclo: {metrics.averageSalesCycle} días
                  </p>
                </div>
                <Target className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">LTV Promedio</p>
                  <p className="text-3xl font-bold">
                    ${(metrics.averageLifetimeValue / 1000).toFixed(0)}K
                  </p>
                  <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                    <TrendingDown className="h-3 w-3" />
                    <span>Churn: {metrics.churnRate}%</span>
                  </div>
                </div>
                <Award className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactions Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad e Interacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <MessageSquare className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{metrics.totalInteractions}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <PhoneCall className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{metrics.callsCount}</p>
                <p className="text-sm text-gray-600">Llamadas</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Video className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{metrics.meetingsCount}</p>
                <p className="text-sm text-gray-600">Reuniones</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{metrics.emailsCount}</p>
                <p className="text-sm text-gray-600">Emails</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <MessageSquare className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{metrics.whatsappCount}</p>
                <p className="text-sm text-gray-600">WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pipeline por Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.pipelineByStage.map((stage, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-gray-600">
                        {stage.count} | ${(stage.value / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(stage.value / 10880000) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topPerformers.map((performer, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{performer.name}</p>
                        <p className="text-xs text-gray-600">
                          {performer.customers} clientes · {performer.conversions} conversiones
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${(performer.revenue / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                {metrics.monthlyTrend.map((month, index) => (
                  <div key={index} className="text-center">
                    <div className="bg-blue-50 rounded-lg p-4 mb-2">
                      <div
                        className="bg-blue-600 rounded-t"
                        style={{
                          height: `${(month.revenue / 1100000) * 100}px`,
                          minHeight: '20px'
                        }}
                      ></div>
                    </div>
                    <p className="text-xs font-medium text-gray-900">{month.month}</p>
                    <p className="text-xs text-gray-600">{month.customers} clientes</p>
                    <p className="text-xs font-semibold text-green-600">
                      ${(month.revenue / 1000).toFixed(0)}K
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                <p className="text-3xl font-bold mb-1">{metrics.averageSalesCycle}</p>
                <p className="text-sm text-gray-600">Días promedio de ciclo de venta</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-3xl font-bold mb-1">{metrics.activeCustomers}</p>
                <p className="text-sm text-gray-600">Clientes activos actualmente</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Target className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <p className="text-3xl font-bold mb-1">{metrics.conversionRate}%</p>
                <p className="text-sm text-gray-600">Tasa de conversión promedio</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

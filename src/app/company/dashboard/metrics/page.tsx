'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Package,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PieChart,
  BarChart3,
  Activity
} from 'lucide-react'

interface MetricData {
  value: number
  previousValue: number
  target?: number
  format: 'currency' | 'percentage' | 'number' | 'days'
}

export default function MetricsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    // Simular carga de datos
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }, [period])

  // KPIs Financieros
  const metrics = {
    // Métricas de Rentabilidad
    grossProfitMargin: { value: 42.5, previousValue: 38.2, target: 45, format: 'percentage' as const },
    netProfitMargin: { value: 18.3, previousValue: 15.7, target: 20, format: 'percentage' as const },
    operatingMargin: { value: 22.8, previousValue: 20.1, target: 25, format: 'percentage' as const },
    returnOnAssets: { value: 12.4, previousValue: 10.8, target: 15, format: 'percentage' as const },
    returnOnEquity: { value: 24.7, previousValue: 21.3, target: 25, format: 'percentage' as const },

    // Métricas de Liquidez
    currentRatio: { value: 2.8, previousValue: 2.3, target: 2.5, format: 'number' as const },
    quickRatio: { value: 1.9, previousValue: 1.6, target: 1.5, format: 'number' as const },
    cashRatio: { value: 0.8, previousValue: 0.6, target: 0.7, format: 'number' as const },
    workingCapital: { value: 145000, previousValue: 132000, target: 150000, format: 'currency' as const },

    // Métricas de Eficiencia
    assetTurnover: { value: 1.4, previousValue: 1.2, target: 1.5, format: 'number' as const },
    inventoryTurnover: { value: 8.5, previousValue: 7.2, target: 9, format: 'number' as const },
    receivablesTurnover: { value: 12.3, previousValue: 10.5, target: 13, format: 'number' as const },
    payablesTurnover: { value: 9.8, previousValue: 8.9, target: 10, format: 'number' as const },

    // Métricas de Ciclo de Efectivo
    dso: { value: 29.7, previousValue: 34.8, target: 30, format: 'days' as const }, // Days Sales Outstanding
    dio: { value: 42.9, previousValue: 50.7, target: 40, format: 'days' as const }, // Days Inventory Outstanding
    dpo: { value: 37.2, previousValue: 41.1, target: 40, format: 'days' as const }, // Days Payable Outstanding
    ccc: { value: 35.4, previousValue: 44.4, target: 30, format: 'days' as const }, // Cash Conversion Cycle

    // Métricas de Crecimiento
    revenueGrowth: { value: 18.5, previousValue: 12.3, target: 20, format: 'percentage' as const },
    customerGrowth: { value: 15.2, previousValue: 10.8, target: 15, format: 'percentage' as const },
    
    // Métricas por Cliente
    averageOrderValue: { value: 1250, previousValue: 1180, target: 1300, format: 'currency' as const },
    customerLifetimeValue: { value: 8500, previousValue: 7800, target: 9000, format: 'currency' as const },
    customerAcquisitionCost: { value: 280, previousValue: 320, target: 250, format: 'currency' as const },
  }

  const formatValue = (value: number, format: MetricData['format']): string => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'days':
        return `${value.toFixed(0)} días`
      case 'number':
        return value.toFixed(2)
      default:
        return value.toString()
    }
  }

  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), isPositive: change >= 0 }
  }

  const isTargetMet = (current: number, target?: number, higherIsBetter: boolean = true): boolean => {
    if (!target) return false
    return higherIsBetter ? current >= target : current <= target
  }

  const MetricCard = ({ 
    title, 
    metric, 
    icon: Icon, 
    color,
    higherIsBetter = true,
    description 
  }: { 
    title: string
    metric: MetricData
    icon: any
    color: string
    higherIsBetter?: boolean
    description?: string
  }) => {
    const change = calculateChange(metric.value, metric.previousValue)
    const targetMet = isTargetMet(metric.value, metric.target, higherIsBetter)
    const isImproving = higherIsBetter ? change.isPositive : !change.isPositive

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              {isImproving ? (
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
                {change.value.toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatValue(metric.value, metric.format)}
              </span>
            </div>

            {description && (
              <p className="text-xs text-gray-500 mb-3">{description}</p>
            )}

            {metric.target && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Objetivo: {formatValue(metric.target, metric.format)}</span>
                  <span>{targetMet ? '✓ Alcanzado' : '◷ En progreso'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${targetMet ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">Métricas y KPIs Financieros</h1>
            <p className="text-gray-600 mt-1">
              Indicadores clave de rendimiento y análisis financiero
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-white border rounded-lg p-1">
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  period === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setPeriod('quarter')}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  period === 'quarter' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Trimestre
              </button>
              <button
                onClick={() => setPeriod('year')}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  period === 'year' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Año
              </button>
            </div>
            <Button onClick={() => {
              const csv = `Métrica,Valor,Período\n"Score Financiero",85%,${period}\n"Liquidez Actual",2.34,${period}\n"ROI Promedio",18.5%,${period}\n"Eficiencia Operativa",76%,${period}`
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `metricas-${period}-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              Exportar Reporte
            </Button>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded">Salud General</span>
              </div>
              <div className="text-3xl font-bold mb-1">85%</div>
              <div className="text-sm opacity-90">Score Financiero</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 opacity-80" />
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">12/15</div>
              <div className="text-sm opacity-90">Objetivos Alcanzados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded">Atención</span>
              </div>
              <div className="text-3xl font-bold mb-1">3</div>
              <div className="text-sm opacity-90">Métricas Críticas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 opacity-80" />
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">+18.5%</div>
              <div className="text-sm opacity-90">Crecimiento General</div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Rentabilidad */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Métricas de Rentabilidad</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Margen de Utilidad Bruta"
              metric={metrics.grossProfitMargin}
              icon={DollarSign}
              color="from-green-500 to-green-600"
              description="(Ventas - Costo de Ventas) / Ventas"
            />
            <MetricCard
              title="Margen de Utilidad Neta"
              metric={metrics.netProfitMargin}
              icon={TrendingUp}
              color="from-emerald-500 to-emerald-600"
              description="Utilidad Neta / Ventas Totales"
            />
            <MetricCard
              title="Margen Operativo"
              metric={metrics.operatingMargin}
              icon={Activity}
              color="from-teal-500 to-teal-600"
              description="Utilidad Operativa / Ventas"
            />
            <MetricCard
              title="Retorno sobre Activos (ROA)"
              metric={metrics.returnOnAssets}
              icon={BarChart3}
              color="from-cyan-500 to-cyan-600"
              description="Utilidad Neta / Activos Totales"
            />
            <MetricCard
              title="Retorno sobre Capital (ROE)"
              metric={metrics.returnOnEquity}
              icon={Target}
              color="from-blue-500 to-blue-600"
              description="Utilidad Neta / Capital Contable"
            />
          </div>
        </div>

        {/* Métricas de Liquidez */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Métricas de Liquidez</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Razón Circulante"
              metric={metrics.currentRatio}
              icon={Activity}
              color="from-blue-500 to-blue-600"
              description="Activos Circulantes / Pasivos Circulantes"
            />
            <MetricCard
              title="Prueba Ácida"
              metric={metrics.quickRatio}
              icon={TrendingUp}
              color="from-indigo-500 to-indigo-600"
              description="(Act. Circulantes - Inventario) / Pas. Circulantes"
            />
            <MetricCard
              title="Razón de Efectivo"
              metric={metrics.cashRatio}
              icon={DollarSign}
              color="from-purple-500 to-purple-600"
              description="Efectivo / Pasivos Circulantes"
            />
            <MetricCard
              title="Capital de Trabajo"
              metric={metrics.workingCapital}
              icon={BarChart3}
              color="from-violet-500 to-violet-600"
              description="Activos Circulantes - Pasivos Circulantes"
            />
          </div>
        </div>

        {/* Métricas de Eficiencia */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Métricas de Eficiencia Operativa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Rotación de Activos"
              metric={metrics.assetTurnover}
              icon={BarChart3}
              color="from-orange-500 to-orange-600"
              description="Ventas / Activos Totales"
            />
            <MetricCard
              title="Rotación de Inventario"
              metric={metrics.inventoryTurnover}
              icon={Package}
              color="from-amber-500 to-amber-600"
              description="Costo de Ventas / Inventario Promedio"
            />
            <MetricCard
              title="Rotación de Cuentas por Cobrar"
              metric={metrics.receivablesTurnover}
              icon={Users}
              color="from-yellow-500 to-yellow-600"
              description="Ventas a Crédito / Cuentas por Cobrar"
            />
            <MetricCard
              title="Rotación de Cuentas por Pagar"
              metric={metrics.payablesTurnover}
              icon={ShoppingCart}
              color="from-red-500 to-red-600"
              description="Compras / Cuentas por Pagar"
            />
          </div>
        </div>

        {/* Ciclo de Conversión de Efectivo */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Ciclo de Conversión de Efectivo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Días de Cobro (DSO)"
              metric={metrics.dso}
              icon={Calendar}
              color="from-purple-500 to-purple-600"
              higherIsBetter={false}
              description="Tiempo promedio para cobrar ventas"
            />
            <MetricCard
              title="Días de Inventario (DIO)"
              metric={metrics.dio}
              icon={Package}
              color="from-fuchsia-500 to-fuchsia-600"
              higherIsBetter={false}
              description="Tiempo promedio de inventario"
            />
            <MetricCard
              title="Días de Pago (DPO)"
              metric={metrics.dpo}
              icon={ShoppingCart}
              color="from-pink-500 to-pink-600"
              description="Tiempo promedio para pagar proveedores"
            />
            <MetricCard
              title="Ciclo de Efectivo (CCC)"
              metric={metrics.ccc}
              icon={Activity}
              color="from-rose-500 to-rose-600"
              higherIsBetter={false}
              description="DSO + DIO - DPO"
            />
          </div>
        </div>

        {/* Métricas de Crecimiento y Cliente */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Crecimiento y Valor del Cliente</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Crecimiento de Ingresos"
              metric={metrics.revenueGrowth}
              icon={TrendingUp}
              color="from-cyan-500 to-cyan-600"
              description="Variación de ingresos período actual vs anterior"
            />
            <MetricCard
              title="Crecimiento de Clientes"
              metric={metrics.customerGrowth}
              icon={Users}
              color="from-sky-500 to-sky-600"
              description="Incremento en base de clientes"
            />
            <MetricCard
              title="Ticket Promedio"
              metric={metrics.averageOrderValue}
              icon={ShoppingCart}
              color="from-blue-500 to-blue-600"
              description="Valor promedio por transacción"
            />
            <MetricCard
              title="Valor de Vida del Cliente (LTV)"
              metric={metrics.customerLifetimeValue}
              icon={Target}
              color="from-indigo-500 to-indigo-600"
              description="Ingresos totales esperados por cliente"
            />
            <MetricCard
              title="Costo de Adquisición (CAC)"
              metric={metrics.customerAcquisitionCost}
              icon={DollarSign}
              color="from-violet-500 to-violet-600"
              higherIsBetter={false}
              description="Costo para adquirir un nuevo cliente"
            />
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-600">Ratio LTV:CAC</h3>
                    <div className="text-3xl font-bold text-green-700">
                      {(metrics.customerLifetimeValue.value / metrics.customerAcquisitionCost.value).toFixed(1)}:1
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Ratio saludable: 3:1 o superior
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {(metrics.customerLifetimeValue.value / metrics.customerAcquisitionCost.value) >= 3 ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">Excelente</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-orange-700 font-medium">Mejorar</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alertas y Recomendaciones */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5" />
              Recomendaciones Estratégicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Optimizar Ciclo de Efectivo</h4>
                  <p className="text-sm text-gray-600">
                    El CCC de {metrics.ccc.value.toFixed(0)} días puede reducirse mejorando el DSO. 
                    Objetivo: alcanzar {metrics.ccc.target} días.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Rentabilidad en Buen Nivel</h4>
                  <p className="text-sm text-gray-600">
                    Los márgenes de rentabilidad están mejorando consistentemente. Continuar enfoque en eficiencia operativa.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">Liquidez Saludable</h4>
                  <p className="text-sm text-gray-600">
                    Las razones de liquidez superan los objetivos. Considerar inversiones estratégicas del excedente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

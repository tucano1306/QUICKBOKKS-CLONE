'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedBarChart, AnimatedDonutChart, AnimatedProgress, Sparkline, AnimatedCounter } from '@/components/ui/animated-charts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  PieChart,
  Receipt,
  Building2,
  Home,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Wallet
} from 'lucide-react'

interface DashboardStats {
  revenue: { current: number; previous: number; change: number }
  expenses: { current: number; previous: number; change: number }
  customers: { total: number; new: number }
  invoices: { pending: number; overdue: number }
  receivables: number
  payables: number
  cashBalance: number
  recentActivity: {
    type: string
    description: string
    amount: number
    date: string
    entityName: string
  }[]
}

export default function CompanyDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const fetchDashboardStats = useCallback(async () => {
    if (!activeCompany) return

    try {
      const response = await fetch(`/api/dashboard/stats?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        // Map API response to expected structure
        const mappedStats: DashboardStats = {
          revenue: { 
            current: data.totalRevenue || 0, 
            previous: 0, 
            change: data.revenueChange || 0 
          },
          expenses: { 
            current: data.totalExpenses || 0, 
            previous: 0, 
            change: data.expensesChange || 0 
          },
          customers: { 
            total: data.totalCustomers || 0, 
            new: 0 
          },
          invoices: { 
            pending: data.pendingInvoices || 0, 
            overdue: data.overdueInvoices || 0 
          },
          receivables: data.totalRevenue || 0,
          payables: data.totalExpenses || 0,
          cashBalance: (data.totalRevenue || 0) - (data.totalExpenses || 0),
          recentActivity: []
        }
        setStats(mappedStats)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany) {
      fetchDashboardStats()
    }
  }, [activeCompany, fetchDashboardStats])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboardStats()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    return 'Hace unos minutos'
  }

  if (status === 'loading' || isLoading || !activeCompany) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#2CA01C] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Cargando dashboard...</span>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const statCards = stats ? [
    {
      name: 'Ingresos del Mes',
      value: formatCurrency(stats.revenue.current),
      change: formatPercentage(stats.revenue.change),
      trend: stats.revenue.change >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'green'
    },
    {
      name: 'Gastos del Mes',
      value: formatCurrency(stats.expenses.current),
      change: formatPercentage(stats.expenses.change),
      trend: stats.expenses.change <= 0 ? 'up' : 'down',
      icon: TrendingDown,
      color: 'red'
    },
    {
      name: 'Clientes Activos',
      value: stats.customers.total.toString(),
      change: `+${stats.customers.new}`,
      trend: 'up',
      icon: Users,
      color: 'blue'
    },
    {
      name: 'Facturas Pendientes',
      value: stats.invoices.pending.toString(),
      change: stats.invoices.overdue > 0 ? `${stats.invoices.overdue} vencidas` : 'Al día',
      trend: stats.invoices.overdue > 0 ? 'down' : 'up',
      icon: FileText,
      color: 'orange'
    }
  ] : []

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2942] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#2CA01C]" />
              Dashboard - {activeCompany.name}
            </h1>
            <p className="text-gray-500 mt-1">
              Resumen general de tu negocio en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={() => router.push('/company')}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
          </div>
        </div>

        {/* Acceso Rápido */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-[#2CA01C]" />
              <h3 className="text-sm font-semibold text-[#0D2942]">Acceso Rápido</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => router.push('/company/accounting/chart-of-accounts')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 bg-white hover:bg-green-50 hover:border-[#2CA01C] hover:shadow-md transition-all"
              >
                <Calculator className="w-5 h-5 text-[#2CA01C]" />
                <span className="text-xs font-semibold">Contabilidad</span>
              </Button>
              <Button
                onClick={() => router.push('/company/reports/balance-sheet')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 bg-white hover:bg-blue-50 hover:border-[#0077C5] hover:shadow-md transition-all"
              >
                <PieChart className="w-5 h-5 text-[#0077C5]" />
                <span className="text-xs font-semibold">Reportes</span>
              </Button>
              <Button
                onClick={() => router.push('/company/expenses/list')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white dark:hover:bg-gray-800 hover:border-red-400 hover:shadow-md transition-all"
              >
                <Receipt className="w-5 h-5 text-red-600" />
                <span className="text-xs font-semibold">Gastos</span>
              </Button>
              <Button
                onClick={() => router.push('/company/banking/accounts')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-semibold">Banca</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas principales con animaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card 
                key={stat.name} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  stat.color === 'green' ? 'from-[#2CA01C] to-[#108000]' :
                  stat.color === 'red' ? 'from-red-400 to-rose-500' :
                  stat.color === 'blue' ? 'from-[#0077C5] to-blue-600' :
                  'from-amber-400 to-orange-500'
                }`} />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 ${
                      stat.color === 'green' ? 'bg-green-100' :
                      stat.color === 'red' ? 'bg-red-100' :
                      stat.color === 'blue' ? 'bg-blue-100' :
                      'bg-amber-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        stat.color === 'green' ? 'text-[#2CA01C]' :
                        stat.color === 'red' ? 'text-red-600' :
                        stat.color === 'blue' ? 'text-[#0077C5]' :
                        'text-amber-600'
                      }`} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${
                      stat.trend === 'up' ? 'text-[#108000] bg-green-100' : 'text-red-700 bg-red-100'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#0D2942] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {stat.name}
                  </div>
                  {/* Mini sparkline */}
                  <div className="absolute bottom-2 right-2 opacity-30">
                    <Sparkline 
                      data={[30, 45, 35, 50, 40, 60, 55]} 
                      color={stat.color === 'green' ? '#2CA01C' : stat.color === 'red' ? '#ef4444' : stat.color === 'blue' ? '#0077C5' : '#f59e0b'}
                      height={30}
                      width={60}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Gráficos principales mejorados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de barras animado */}
          <Card className="lg:col-span-2 overflow-hidden shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#0D2942]">
                  <BarChart3 className="w-5 h-5 text-[#2CA01C]" />
                  Rendimiento Mensual
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#2CA01C]" />
                    <span className="text-gray-600">Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-gray-600">Gastos</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {stats && (
                <div className="space-y-6">
                  {/* Resumen financiero real */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-[#2CA01C]">
                        <AnimatedCounter value={stats.revenue.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Ingresos Totales</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                      <div className="text-2xl font-bold text-red-600">
                        <AnimatedCounter value={stats.expenses.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Gastos Totales</div>
                    </div>
                    <div className={`text-center p-4 rounded-xl ${stats.revenue.current - stats.expenses.current >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                      <div className={`text-2xl font-bold ${stats.revenue.current - stats.expenses.current >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        <AnimatedCounter value={stats.revenue.current - stats.expenses.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Utilidad Neta</div>
                    </div>
                  </div>
                  
                  {/* Barra de comparación visual */}
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Ingresos</span>
                        <span className="font-medium text-[#2CA01C]">${stats.revenue.current.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#2CA01C] to-[#108000] rounded-full transition-all duration-1000"
                          style={{ width: stats.revenue.current > 0 ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Gastos</span>
                        <span className="font-medium text-red-600">${stats.expenses.current.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-1000"
                          style={{ width: stats.revenue.current > 0 ? `${Math.min((stats.expenses.current / stats.revenue.current) * 100, 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen de cuentas */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Resumen de Cuentas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Cuentas por Cobrar</p>
                        <p className="text-xs text-gray-500">{stats.invoices.pending} facturas pendientes</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-blue-600">${stats.receivables.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Cuentas por Pagar</p>
                        <p className="text-xs text-gray-500">Total de gastos registrados</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-red-600">${stats.payables.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Balance de Caja</p>
                        <p className="text-xs text-gray-500">Ingresos - Gastos</p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${stats.cashBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${stats.cashBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => router.push('/company/invoicing/invoices')}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium">Nueva Factura</span>
              </Button>
              <Button
                onClick={() => router.push('/company/expenses/list')}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-red-50 hover:border-red-300"
              >
                <Receipt className="w-6 h-6 text-red-600" />
                <span className="text-sm font-medium">Nuevo Gasto</span>
              </Button>
              <Button
                onClick={() => router.push('/company/customers')}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-green-50 hover:border-green-300"
              >
                <Users className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium">Nuevo Cliente</span>
              </Button>
              <Button
                onClick={() => router.push('/company/reports/profit-loss')}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 hover:border-purple-300"
              >
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium">Ver Reportes</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actividad reciente mejorada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad reciente */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y dark:divide-gray-700">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'invoice' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {activity.type === 'invoice' ? <FileText className="w-5 h-5" /> :
                         activity.type === 'payment' ? <DollarSign className="w-5 h-5" /> :
                         <Receipt className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.entityName} • {formatTimeAgo(activity.date)}
                        </p>
                      </div>
                      <div className={`text-sm font-bold ${
                        activity.type === 'payment' ? 'text-green-600' :
                        activity.type === 'expense' ? 'text-red-600' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {activity.type === 'payment' ? '+' : activity.type === 'expense' ? '-' : ''}
                        {formatCurrency(activity.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendario de vencimientos - Datos reales */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                Próximos Vencimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {stats && (stats.invoices.pending > 0 || stats.invoices.overdue > 0) ? (
                <div className="space-y-3">
                  {stats.invoices.overdue > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border-l-4 bg-red-50 border-red-500">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Facturas Vencidas</p>
                        <p className="text-xs text-gray-500">{stats.invoices.overdue} facturas requieren atención</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{stats.invoices.overdue}</p>
                        <p className="text-xs font-medium text-red-600">Vencidas</p>
                      </div>
                    </div>
                  )}
                  {stats.invoices.pending > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border-l-4 bg-amber-50 border-amber-500">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Facturas Pendientes</p>
                        <p className="text-xs text-gray-500">{stats.invoices.pending} facturas por cobrar</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600">{stats.invoices.pending}</p>
                        <p className="text-xs font-medium text-amber-600">Pendientes</p>
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => router.push('/company/invoicing/invoices')}
                  >
                    Ver todas las facturas
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay vencimientos próximos</p>
                  <p className="text-xs mt-1">¡Todo está al día!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen de cuentas mejorado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cuentas por Cobrar */}
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 animate-shimmer" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  Cuentas por Cobrar
                </span>
                <ArrowUpRight className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats ? (
                  <AnimatedCounter value={stats.receivables} prefix="$" duration={1500} />
                ) : '$0'}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-blue-600">{stats?.invoices.pending || 0}</span> facturas pendientes
                </p>
                <Sparkline 
                  data={[20, 35, 30, 45, 40, 55, 50, 60]} 
                  color="#3b82f6"
                  height={25}
                  width={50}
                />
              </div>
              <AnimatedProgress value={65} color="blue" height={4} showValue={false} className="mt-3" />
            </CardContent>
          </Card>

          {/* Cuentas por Pagar */}
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 animate-shimmer" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  Cuentas por Pagar
                </span>
                <ArrowUpRight className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats ? (
                  <AnimatedCounter value={stats.payables} prefix="$" duration={1500} />
                ) : '$0'}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Facturas de proveedores
                </p>
                <Sparkline 
                  data={[40, 35, 45, 30, 35, 25, 30, 20]} 
                  color="#ef4444"
                  height={25}
                  width={50}
                />
              </div>
              <AnimatedProgress value={45} color="red" height={4} showValue={false} className="mt-3" />
            </CardContent>
          </Card>

          {/* Balance de Caja */}
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="h-1.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 animate-shimmer" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="w-4 h-4 text-green-600" />
                  </div>
                  Balance de Caja
                </span>
                <ArrowUpRight className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats ? (
                  <AnimatedCounter value={stats.cashBalance} prefix="$" duration={1500} />
                ) : '$0'}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  En todas las cuentas
                </p>
                <Sparkline 
                  data={[30, 40, 35, 50, 45, 55, 60, 70]} 
                  color="#22c55e"
                  height={25}
                  width={50}
                />
              </div>
              <AnimatedProgress value={80} color="green" height={4} showValue={false} className="mt-3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

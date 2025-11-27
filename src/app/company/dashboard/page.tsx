'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  RefreshCw
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Dashboard - {activeCompany.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
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
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Acceso Rápido</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => router.push('/company/accounting/chart-of-accounts')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white dark:hover:bg-gray-800 hover:border-green-400 hover:shadow-md transition-all"
              >
                <Calculator className="w-5 h-5 text-green-600" />
                <span className="text-xs font-semibold">Contabilidad</span>
              </Button>
              <Button
                onClick={() => router.push('/company/reports/balance-sheet')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-400 hover:shadow-md transition-all"
              >
                <PieChart className="w-5 h-5 text-purple-600" />
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

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      stat.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                      stat.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                      stat.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        stat.color === 'green' ? 'text-green-600' :
                        stat.color === 'red' ? 'text-red-600' :
                        stat.color === 'blue' ? 'text-blue-600' :
                        'text-orange-600'
                      }`} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Gráficos y actividad reciente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de ingresos vs gastos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Ingresos vs Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {stats && (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos</span>
                      <span className="font-bold text-green-600">{formatCurrency(stats.revenue.current)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-green-500 h-4 rounded-full" 
                        style={{ width: `${Math.min((stats.revenue.current / (stats.revenue.current + stats.expenses.current)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Gastos</span>
                      <span className="font-bold text-red-600">{formatCurrency(stats.expenses.current)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-red-500 h-4 rounded-full" 
                        style={{ width: `${Math.min((stats.expenses.current / (stats.revenue.current + stats.expenses.current)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilidad Neta</span>
                        <span className={`font-bold text-lg ${stats.revenue.current - stats.expenses.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(stats.revenue.current - stats.expenses.current)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actividad reciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 pb-4 border-b dark:border-gray-700 last:border-0 last:pb-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'invoice' ? 'bg-blue-500' :
                        activity.type === 'payment' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.entityName}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(activity.date)}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold ${
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
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay actividad reciente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen de cuentas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats ? formatCurrency(stats.receivables) : '$0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats?.invoices.pending || 0} facturas pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats ? formatCurrency(stats.payables) : '$0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Facturas de proveedores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats ? formatCurrency(stats.cashBalance) : '$0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                En todas las cuentas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

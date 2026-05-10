'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { AnimatedCounter, Sparkline } from '@/components/ui/animated-charts'
import IncomeAnalytics from '@/components/taxes/income-analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    Building2,
    Calculator,
    DollarSign,
    FileText,
    Home,
    PieChart,
    Receipt,
    RefreshCw,
    Sparkles,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface DashboardStats {
  revenue: { current: number; previous: number; change: number }
  expenses: { current: number; previous: number; change: number }
  customers: { total: number; new: number }
  invoices: { pending: number; overdue: number }
  receivables: number
  payables: number
  cashBalance: number
  currentYear: number
  currentMonth: number
  monthlyData: { month: string; monthIndex: number; revenue: number; expenses: number }[]
  recentActivity: {
    type: string
    description: string
    amount: number
    date: string
    entityName: string
  }[]
}

interface StatCard {
  name: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  color: string
}

// Helper functions para evitar ternarios anidados
const getColorGradient = (color: string): string => {
  switch (color) {
    case 'green': return 'from-[#2CA01C] to-[#108000]'
    case 'red': return 'from-red-400 to-rose-500'
    case 'blue': return 'from-[#0077C5] to-blue-600'
    default: return 'from-amber-400 to-orange-500'
  }
}

const getBackgroundColor = (color: string): string => {
  switch (color) {
    case 'green': return 'bg-green-100'
    case 'red': return 'bg-red-100'
    case 'blue': return 'bg-blue-100'
    default: return 'bg-amber-100'
  }
}

const getTextColor = (color: string): string => {
  switch (color) {
    case 'green': return 'text-[#2CA01C]'
    case 'red': return 'text-red-600'
    case 'blue': return 'text-[#0077C5]'
    default: return 'text-amber-600'
  }
}

const getSparklineColor = (color: string): string => {
  switch (color) {
    case 'green': return '#2CA01C'
    case 'red': return '#ef4444'
    case 'blue': return '#0077C5'
    default: return '#f59e0b'
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'invoice': return <FileText className="w-5 h-5" />
    case 'payment': return <DollarSign className="w-5 h-5" />
    default: return <Receipt className="w-5 h-5" />
  }
}

const getActivityBgColor = (type: string): string => {
  switch (type) {
    case 'invoice': return 'bg-blue-100 text-blue-600'
    case 'payment': return 'bg-green-100 text-green-600'
    default: return 'bg-red-100 text-red-600'
  }
}

const getActivityTextColor = (type: string): string => {
  switch (type) {
    case 'payment': return 'text-green-600'
    case 'expense': return 'text-red-600'
    default: return 'text-gray-900 dark:text-white'
  }
}

const getActivitySign = (type: string): string => {
  if (type === 'payment') return '+'
  if (type === 'expense') return '-'
  return ''
}

// Props interfaces
interface StatCardProps {
  readonly stat: StatCard
  readonly index: number
}

interface ActivityItemProps {
  readonly activity: DashboardStats['recentActivity'][0]
  readonly formatCurrency: (amount: number) => string
  readonly formatTimeAgo: (dateStr: string) => string
}

// Componente para tarjetas de estadísticas
function StatCardComponent({ stat, index }: StatCardProps) {
  const Icon = stat.icon
  const colorGradient = getColorGradient(stat.color)
  const bgColor = getBackgroundColor(stat.color)
  const textColor = getTextColor(stat.color)
  const sparklineColor = getSparklineColor(stat.color)

  return (
    <Card
      key={stat.name}
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorGradient}`} />
      <CardContent className="p-3 sm:p-6 relative">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 ${bgColor}`}>
            <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${textColor}`} />
          </div>
          <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
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
        <div className="text-lg sm:text-3xl font-bold text-[#0D2942] mb-0.5 sm:mb-1 truncate">
          {stat.value}
        </div>
        <div className="text-xs sm:text-sm text-gray-500 font-medium truncate">
          {stat.name}
        </div>
        <div className="absolute bottom-2 right-2 opacity-30">
          <Sparkline
            data={[30, 45, 35, 50, 40, 60, 55]}
            color={sparklineColor}
            height={30}
            width={60}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para item de actividad reciente
function ActivityItem({
  activity,
  formatCurrency,
  formatTimeAgo
}: ActivityItemProps) {
  const activityBgColor = getActivityBgColor(activity.type)
  const activityIcon = getActivityIcon(activity.type)
  const activityTextColor = getActivityTextColor(activity.type)
  const activitySign = getActivitySign(activity.type)

  return (
    <div
      key={`${activity.type}-${activity.date}-${activity.entityName}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activityBgColor}`}>
        {activityIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {activity.entityName} • {formatTimeAgo(activity.date)}
        </p>
      </div>
      <div className={`text-sm font-bold ${activityTextColor}`}>
        {activitySign}
        {formatCurrency(activity.amount)}
      </div>
    </div>
  )
}

export default function CompanyDashboardPage() {
  const router = useRouter()
  const { status } = useSession()
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
          currentYear: data.currentYear || new Date().getFullYear(),
          currentMonth: data.currentMonth ?? new Date().getMonth(),
          monthlyData: data.monthlyData || [],
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

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0D2942] flex items-center gap-2">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-[#2CA01C]" />
              <span className="truncate">Dashboard - {activeCompany.name}</span>
            </h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">
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
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              onClick={() => router.push('/company')}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
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

        {/* Gráficos principales mejorados */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Rendimiento Anual */}
          <Card className="overflow-hidden shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-[#0D2942]">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#2CA01C]" />
                  Rendimiento Anual {stats?.currentYear}
                </CardTitle>
                <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
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
            <CardContent className="p-3 sm:p-6">
              {stats && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Totales anuales */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center p-2 sm:p-4 bg-green-50 rounded-lg sm:rounded-xl">
                      <div className="text-sm sm:text-2xl font-bold text-[#2CA01C] truncate">
                        <AnimatedCounter value={stats.revenue.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Ingresos {stats.currentYear}</div>
                    </div>
                    <div className="text-center p-2 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl">
                      <div className="text-sm sm:text-2xl font-bold text-red-600 truncate">
                        <AnimatedCounter value={stats.expenses.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Gastos {stats.currentYear}</div>
                    </div>
                    <div className={`text-center p-2 sm:p-4 rounded-lg sm:rounded-xl ${stats.revenue.current - stats.expenses.current >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                      <div className={`text-sm sm:text-2xl font-bold truncate ${stats.revenue.current - stats.expenses.current >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        <AnimatedCounter value={stats.revenue.current - stats.expenses.current} prefix="$" decimals={0} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Utilidad {stats.currentYear}</div>
                    </div>
                  </div>

                  {/* Gráfico de barras mensual */}
                  {stats.monthlyData.length > 0 && (() => {
                    const maxVal = Math.max(...stats.monthlyData.flatMap(m => [m.revenue, m.expenses]), 1)
                    return (
                      <div className="pt-4 border-t">
                        <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-48">
                          {stats.monthlyData.map((m) => {
                            const isCurrent = m.monthIndex === stats.currentMonth
                            const isFuture = m.monthIndex > stats.currentMonth
                            const revHeight = Math.round((m.revenue / maxVal) * 100)
                            const expHeight = Math.round((m.expenses / maxVal) * 100)
                            return (
                              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full flex gap-0.5 items-end h-28 sm:h-44">
                                  {/* Barra ingresos */}
                                  <div className="flex-1 flex items-end h-full">
                                    <div
                                      className={`w-full rounded-t transition-all duration-700 ${isFuture ? 'opacity-20' : ''} ${isCurrent ? 'bg-[#1a7a0f]' : 'bg-[#2CA01C]'}`}
                                      style={{ height: `${revHeight}%`, minHeight: m.revenue > 0 ? '2px' : '0' }}
                                      title={`Ingresos ${m.month}: $${m.revenue.toLocaleString()}`}
                                    />
                                  </div>
                                  {/* Barra gastos */}
                                  <div className="flex-1 flex items-end h-full">
                                    <div
                                      className={`w-full rounded-t transition-all duration-700 ${isFuture ? 'opacity-20' : ''} ${isCurrent ? 'bg-rose-700' : 'bg-red-500'}`}
                                      style={{ height: `${expHeight}%`, minHeight: m.expenses > 0 ? '2px' : '0' }}
                                      title={`Gastos ${m.month}: $${m.expenses.toLocaleString()}`}
                                    />
                                  </div>
                                </div>
                                <span className={`text-[9px] sm:text-xs font-medium ${isCurrent ? 'text-[#2CA01C]' : 'text-gray-400'}`}>
                                  {m.month}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">
                          Meses futuros en gris · Mes actual resaltado
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Income Analytics */}
        {stats && (
          <IncomeAnalytics
            taxYear={stats.currentYear}
            totalIncome={stats.revenue.current}
          />
        )}

      </div>
    </CompanyTabsLayout>
  )
}

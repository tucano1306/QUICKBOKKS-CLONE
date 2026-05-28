'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import IncomeAnalytics from '@/components/taxes/income-analytics'
import { AnimatedCounter, Sparkline } from '@/components/ui/animated-charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import {
    ArrowDownRight,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpRight,
    BarChart3,
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
                onClick={() => router.push('/company/transactions')}
                variant="outline"
                className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-400 hover:shadow-md transition-all"
              >
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-semibold">Transacciones</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos principales mejorados */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Rendimiento Anual — dark card */}
          {stats && (() => {
            const maxVal = Math.max(...stats.monthlyData.flatMap(m => [m.revenue, m.expenses]), 1)
            const profit = stats.revenue.current - stats.expenses.current
            const profitPct = stats.revenue.current > 0
              ? Math.round((profit / stats.revenue.current) * 100)
              : 0

            return (
              <div
                className="rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#0f172a 0%,#0d2542 100%)' }}
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800/70">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        Rendimiento Anual {stats.currentYear}
                      </h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Ingresos vs Gastos · Meses futuros en gris · Mes actual resaltado
                      </p>
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}></span>
                        {' '}Ingresos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#f87171,#dc2626)' }}></span>
                        {' '}Gastos
                      </span>
                    </div>
                  </div>

                  {/* KPI pills */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-emerald-950/60 border border-emerald-800/40 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest">Ingresos</p>
                      <p className="text-emerald-300 font-bold text-base mt-0.5">
                        <AnimatedCounter value={stats.revenue.current} prefix="$" decimals={0} />
                      </p>
                    </div>
                    <div className="bg-red-950/60 border border-red-800/40 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-red-400/70 uppercase tracking-widest">Gastos</p>
                      <p className="text-red-300 font-bold text-base mt-0.5">
                        <AnimatedCounter value={stats.expenses.current} prefix="$" decimals={0} />
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${profit >= 0 ? 'bg-indigo-950/60 border-indigo-800/40' : 'bg-red-950/60 border-red-800/40'}`}>
                      <p className={`text-[10px] uppercase tracking-widest ${profit >= 0 ? 'text-indigo-400/70' : 'text-red-400/70'}`}>
                        Utilidad {profitPct >= 0 ? `+${profitPct}%` : `${profitPct}%`}
                      </p>
                      <p className={`font-bold text-base mt-0.5 ${profit >= 0 ? 'text-indigo-300' : 'text-red-300'}`}>
                        <AnimatedCounter value={profit} prefix="$" decimals={0} />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="px-6 py-6">
                  {stats.monthlyData.length > 0 ? (
                    <>
                      <div className="flex items-end gap-1.5 sm:gap-2 w-full" style={{ height: '180px' }}>
                        {stats.monthlyData.map((m) => {
                          const isCurrent = m.monthIndex === stats.currentMonth
                          const isFuture = m.monthIndex > stats.currentMonth
                          const revH = Math.max(isFuture ? 6 : 4, Math.round((m.revenue / maxVal) * 140))
                          const expH = Math.max(isFuture ? 6 : 4, Math.round((m.expenses / maxVal) * 140))
                          let revBg: string
                          if (isFuture) { revBg = 'rgba(52,211,153,0.12)' }
                          else if (isCurrent) { revBg = 'linear-gradient(180deg,#6ee7b7 0%,#10b981 55%,#047857 100%)' }
                          else { revBg = 'linear-gradient(180deg,#34d399 0%,#10b981 60%,#059669 100%)' }
                          let expBg: string
                          if (isFuture) { expBg = 'rgba(248,113,113,0.12)' }
                          else if (isCurrent) { expBg = 'linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#b91c1c 100%)' }
                          else { expBg = 'linear-gradient(180deg,#f87171 0%,#ef4444 60%,#dc2626 100%)' }
                          let monthLabelClass: string
                          if (isCurrent) { monthLabelClass = 'text-emerald-400 font-bold' }
                          else if (isFuture) { monthLabelClass = 'text-slate-700' }
                          else { monthLabelClass = 'text-slate-500' }

                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                              {/* Value tooltip on hover */}
                              {!isFuture && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[8px] text-slate-400 text-center mb-1 leading-tight">
                                  <span className="text-emerald-400">${Math.round(m.revenue / 1000)}k</span>
                                  {' / '}
                                  <span className="text-red-400">${Math.round(m.expenses / 1000)}k</span>
                                </div>
                              )}

                              <div className="w-full flex gap-0.5 items-end" style={{ height: '155px' }}>
                                {/* Revenue bar */}
                                <div className="flex-1 flex items-end h-full">
                                  <div
                                    className="w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110"
                                    style={{
                                      height: `${revH}px`,
                                      background: revBg,
                                      boxShadow: isCurrent && !isFuture ? '0 0 14px 4px rgba(16,185,129,0.4)' : undefined,
                                    }}
                                  >
                                    {!isFuture && <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-md bg-white/10 pointer-events-none" />}
                                    {isCurrent && (
                                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Expense bar */}
                                <div className="flex-1 flex items-end h-full">
                                  <div
                                    className="w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110"
                                    style={{
                                      height: `${expH}px`,
                                      background: expBg,
                                      boxShadow: isCurrent && !isFuture ? '0 0 14px 4px rgba(239,68,68,0.35)' : undefined,
                                    }}
                                  >
                                    {!isFuture && <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-md bg-white/10 pointer-events-none" />}
                                  </div>
                                </div>
                              </div>

                              {/* Month label */}
                              <p className={`text-[9px] sm:text-[10px] mt-2 font-medium ${monthLabelClass}`}>
                                {m.month}
                              </p>
                            </div>
                          )
                        })}
                      </div>

                      {/* Axis */}
                      <div className="h-px w-full mt-1" style={{ background: 'rgba(148,163,184,0.12)' }} />
                      <p className="text-[10px] text-slate-600 mt-2 text-right">
                        Hover sobre cada mes para ver detalle
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-600 text-sm text-center py-10">Sin datos mensuales</p>
                  )}
                </div>
              </div>
            )
          })()}
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Target,
  BarChart3
} from 'lucide-react'

interface BudgetActual {
  id: string
  category: string
  subcategory: string
  type: 'revenue' | 'expense'
  department: string
  budgeted: number
  actual: number
  variance: number
  variancePercent: number
  ytdBudget: number
  ytdActual: number
  ytdVariance: number
  ytdVariancePercent: number
}

export default function BudgetVsActualPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [budgetActuals, setBudgetActuals] = useState<BudgetActual[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('november-2025')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  const loadBudgetActuals = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/budgets/vs-actual?companyId=${activeCompany.id}&period=${selectedPeriod}`)
      if (res.ok) {
        const data = await res.json()
        setBudgetActuals(data.items || [])
      }
    } catch (error) {
      console.error('Error loading budget vs actual:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedPeriod])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany?.id) {
      loadBudgetActuals()
    }
  }, [status, activeCompany?.id, loadBudgetActuals])

  const getVarianceBadge = (variancePercent: number, type: 'revenue' | 'expense') => {
    const isGood = type === 'revenue' ? variancePercent > 0 : variancePercent < 0
    const isBad = type === 'revenue' ? variancePercent < -5 : variancePercent > 5
    
    if (Math.abs(variancePercent) < 2) {
      return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> En Meta
      </Badge>
    } else if (isGood) {
      return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Favorable
      </Badge>
    } else if (isBad) {
      return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Desfavorable
      </Badge>
    } else {
      return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
        <TrendingDown className="w-3 h-3" /> Alerta
      </Badge>
    }
  }

  const filteredData = budgetActuals.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false
    if (filterDepartment !== 'all' && item.department !== filterDepartment) return false
    return true
  })

  const totalRevenueBudget = budgetActuals.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.budgeted, 0)
  const totalRevenueActual = budgetActuals.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.actual, 0)
  const totalExpenseBudget = budgetActuals.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.budgeted, 0)
  const totalExpenseActual = budgetActuals.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.actual, 0)
  
  const revenueVariance = totalRevenueActual - totalRevenueBudget
  const revenueVariancePercent = (revenueVariance / totalRevenueBudget) * 100
  const expenseVariance = totalExpenseActual - totalExpenseBudget
  const expenseVariancePercent = (expenseVariance / totalExpenseBudget) * 100
  
  const budgetedProfit = totalRevenueBudget - totalExpenseBudget
  const actualProfit = totalRevenueActual - totalExpenseActual
  const profitVariance = actualProfit - budgetedProfit
  const profitVariancePercent = (profitVariance / budgetedProfit) * 100

  const departments = Array.from(new Set(budgetActuals.map(i => i.department)))

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
            <h1 className="text-2xl font-bold text-gray-900">Presupuesto vs Real</h1>
            <p className="text-gray-600 mt-1">
              Análisis de varianza y desempeño financiero
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const csv = 'Categoría,Presupuestado,Real,Variación,% Uso\nEjemplo de datos...'
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `presupuesto-vs-real-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button onClick={() => window.location.href = '/company/dashboard'}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Período de Análisis:
              </label>
              <select 
                className="flex-1 px-4 py-2 border rounded-lg bg-white"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="november-2025">Noviembre 2025</option>
                <option value="q4-2025">Q4 2025</option>
                <option value="ytd-2025">YTD 2025</option>
                <option value="fy-2025">Año Fiscal 2025</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="revenue">Ingresos</option>
                <option value="expense">Gastos</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">Todos los Departamentos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-green-700">Ingresos</div>
                {revenueVariance >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-green-600">Presupuestado</div>
                  <div className="text-lg font-bold text-green-900">
                    ${(totalRevenueBudget / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-600">Real</div>
                  <div className="text-xl font-bold text-green-900">
                    ${(totalRevenueActual / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div className="border-t border-green-200 pt-2">
                  <div className="text-xs text-green-600">Varianza</div>
                  <div className={`text-lg font-bold ${
                    revenueVariance >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {revenueVariance >= 0 ? '+' : ''}${(revenueVariance / 1000).toLocaleString('es-MX')}K
                    <span className="text-sm ml-2">
                      ({revenueVariancePercent >= 0 ? '+' : ''}{revenueVariancePercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-red-700">Gastos</div>
                {expenseVariance <= 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-red-600">Presupuestado</div>
                  <div className="text-lg font-bold text-red-900">
                    ${(totalExpenseBudget / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-red-600">Real</div>
                  <div className="text-xl font-bold text-red-900">
                    ${(totalExpenseActual / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div className="border-t border-red-200 pt-2">
                  <div className="text-xs text-red-600">Varianza</div>
                  <div className={`text-lg font-bold ${
                    expenseVariance <= 0 ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {expenseVariance >= 0 ? '+' : ''}${(expenseVariance / 1000).toLocaleString('es-MX')}K
                    <span className="text-sm ml-2">
                      ({expenseVariancePercent >= 0 ? '+' : ''}{expenseVariancePercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-700">Utilidad Neta</div>
                {profitVariance >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-blue-600">Presupuestado</div>
                  <div className="text-lg font-bold text-blue-900">
                    ${(budgetedProfit / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">Real</div>
                  <div className="text-xl font-bold text-blue-900">
                    ${(actualProfit / 1000).toLocaleString('es-MX')}K
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <div className="text-xs text-blue-600">Varianza</div>
                  <div className={`text-lg font-bold ${
                    profitVariance >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {profitVariance >= 0 ? '+' : ''}${(profitVariance / 1000).toLocaleString('es-MX')}K
                    <span className="text-sm ml-2">
                      ({profitVariancePercent >= 0 ? '+' : ''}{profitVariancePercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Variance Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis Detallado de Varianza ({filteredData.length} partidas)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Presupuestado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Real</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Varianza $</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Varianza %</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Gráfico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item) => {
                    const utilizationPercent = (item.actual / item.budgeted) * 100
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {item.type === 'revenue' ? (
                            <Badge className="bg-green-100 text-green-700">Ingreso</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">Gasto</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.department}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.subcategory}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${item.budgeted.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            item.type === 'revenue' 
                              ? (item.actual >= item.budgeted ? 'text-green-600' : 'text-orange-600')
                              : (item.actual <= item.budgeted ? 'text-green-600' : 'text-red-600')
                          }`}>
                            ${item.actual.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            item.type === 'revenue'
                              ? (item.variance >= 0 ? 'text-green-600' : 'text-red-600')
                              : (item.variance <= 0 ? 'text-green-600' : 'text-red-600')
                          }`}>
                            {item.variance >= 0 ? '+' : ''}${item.variance.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-bold ${
                            Math.abs(item.variancePercent) < 2 ? 'text-gray-700' :
                            item.type === 'revenue'
                              ? (item.variancePercent >= 0 ? 'text-green-600' : 'text-red-600')
                              : (item.variancePercent <= 0 ? 'text-green-600' : 'text-red-600')
                          }`}>
                            {item.variancePercent >= 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getVarianceBadge(item.variancePercent, item.type)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[80px]">
                              <div 
                                className={`h-3 rounded-full ${
                                  item.type === 'revenue'
                                    ? (utilizationPercent >= 100 ? 'bg-green-500' : 
                                       utilizationPercent >= 95 ? 'bg-blue-500' : 'bg-orange-500')
                                    : (utilizationPercent <= 100 ? 'bg-green-500' : 
                                       utilizationPercent <= 105 ? 'bg-orange-500' : 'bg-red-500')
                                }`}
                                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-12">
                              {utilizationPercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* YTD Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Acumulado Año (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Top 5 Varianzas Favorables</h4>
                <div className="space-y-2">
                  {budgetActuals
                    .sort((a, b) => {
                      const aScore = a.type === 'revenue' ? a.ytdVariance : -a.ytdVariance
                      const bScore = b.type === 'revenue' ? b.ytdVariance : -b.ytdVariance
                      return bScore - aScore
                    })
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{item.subcategory}</div>
                          <div className="text-xs text-gray-500">{item.department}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">
                            +${Math.abs(item.ytdVariance).toLocaleString('es-MX')}
                          </div>
                          <div className="text-xs text-green-600">
                            +{Math.abs(item.ytdVariancePercent).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Top 5 Varianzas Desfavorables</h4>
                <div className="space-y-2">
                  {budgetActuals
                    .sort((a, b) => {
                      const aScore = a.type === 'revenue' ? a.ytdVariance : -a.ytdVariance
                      const bScore = b.type === 'revenue' ? b.ytdVariance : -b.ytdVariance
                      return aScore - bScore
                    })
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{item.subcategory}</div>
                          <div className="text-xs text-gray-500">{item.department}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">
                            ${Math.abs(item.ytdVariance).toLocaleString('es-MX')}
                          </div>
                          <div className="text-xs text-red-600">
                            {Math.abs(item.ytdVariancePercent).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Análisis de Varianza Presupuestal</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema de control presupuestal que compara cifras reales contra presupuesto para detectar desviaciones.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Varianza Favorable (Ingresos):</strong> Real mayor que presupuesto = más ingresos de lo planeado</li>
                  <li>• <strong>Varianza Favorable (Gastos):</strong> Real menor que presupuesto = ahorro en costos</li>
                  <li>• <strong>Varianza Desfavorable:</strong> Desviación negativa que requiere acción correctiva inmediata</li>
                  <li>• <strong>En Meta:</strong> Varianza menor al 2% indica ejecución precisa del presupuesto</li>
                  <li>• <strong>YTD (Year-to-Date):</strong> Acumulado del año para evaluar tendencias de largo plazo</li>
                  <li>• <strong>Umbral de Alerta:</strong> Varianzas mayores al 5% requieren análisis de causa raíz</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

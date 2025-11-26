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
  const [selectedPeriod, setSelectedPeriod] = useState('november-2025')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const budgetActuals: BudgetActual[] = [
    // Revenue Items
    {
      id: 'BVA-001',
      category: 'Ingresos por Servicios',
      subcategory: 'Consultoría',
      type: 'revenue',
      department: 'Ventas',
      budgeted: 2500000,
      actual: 2680000,
      variance: 180000,
      variancePercent: 7.2,
      ytdBudget: 22500000,
      ytdActual: 23750000,
      ytdVariance: 1250000,
      ytdVariancePercent: 5.6
    },
    {
      id: 'BVA-002',
      category: 'Ingresos por Servicios',
      subcategory: 'Desarrollo de Software',
      type: 'revenue',
      department: 'Ventas',
      budgeted: 1800000,
      actual: 1650000,
      variance: -150000,
      variancePercent: -8.3,
      ytdBudget: 16200000,
      ytdActual: 15800000,
      ytdVariance: -400000,
      ytdVariancePercent: -2.5
    },
    {
      id: 'BVA-003',
      category: 'Ingresos por Productos',
      subcategory: 'Licencias de Software',
      type: 'revenue',
      department: 'Ventas',
      budgeted: 1200000,
      actual: 1280000,
      variance: 80000,
      variancePercent: 6.7,
      ytdBudget: 10800000,
      ytdActual: 11200000,
      ytdVariance: 400000,
      ytdVariancePercent: 3.7
    },
    {
      id: 'BVA-004',
      category: 'Ingresos por Servicios',
      subcategory: 'Soporte y Mantenimiento',
      type: 'revenue',
      department: 'Ventas',
      budgeted: 800000,
      actual: 820000,
      variance: 20000,
      variancePercent: 2.5,
      ytdBudget: 7200000,
      ytdActual: 7450000,
      ytdVariance: 250000,
      ytdVariancePercent: 3.5
    },
    // Expense Items - Ventas
    {
      id: 'BVA-005',
      category: 'Nómina',
      subcategory: 'Salarios Ventas',
      type: 'expense',
      department: 'Ventas',
      budgeted: 650000,
      actual: 645000,
      variance: -5000,
      variancePercent: -0.8,
      ytdBudget: 5850000,
      ytdActual: 5820000,
      ytdVariance: -30000,
      ytdVariancePercent: -0.5
    },
    {
      id: 'BVA-006',
      category: 'Comisiones',
      subcategory: 'Comisiones Ventas',
      type: 'expense',
      department: 'Ventas',
      budgeted: 180000,
      actual: 195000,
      variance: 15000,
      variancePercent: 8.3,
      ytdBudget: 1620000,
      ytdActual: 1680000,
      ytdVariance: 60000,
      ytdVariancePercent: 3.7
    },
    // Expense Items - Marketing
    {
      id: 'BVA-007',
      category: 'Nómina',
      subcategory: 'Salarios Marketing',
      type: 'expense',
      department: 'Marketing',
      budgeted: 420000,
      actual: 418000,
      variance: -2000,
      variancePercent: -0.5,
      ytdBudget: 3780000,
      ytdActual: 3760000,
      ytdVariance: -20000,
      ytdVariancePercent: -0.5
    },
    {
      id: 'BVA-008',
      category: 'Publicidad',
      subcategory: 'Marketing Digital',
      type: 'expense',
      department: 'Marketing',
      budgeted: 250000,
      actual: 285000,
      variance: 35000,
      variancePercent: 14.0,
      ytdBudget: 2250000,
      ytdActual: 2480000,
      ytdVariance: 230000,
      ytdVariancePercent: 10.2
    },
    {
      id: 'BVA-009',
      category: 'Eventos',
      subcategory: 'Ferias y Conferencias',
      type: 'expense',
      department: 'Marketing',
      budgeted: 150000,
      actual: 165000,
      variance: 15000,
      variancePercent: 10.0,
      ytdBudget: 1350000,
      ytdActual: 1420000,
      ytdVariance: 70000,
      ytdVariancePercent: 5.2
    },
    // Expense Items - Operaciones
    {
      id: 'BVA-010',
      category: 'Nómina',
      subcategory: 'Salarios Operaciones',
      type: 'expense',
      department: 'Operaciones',
      budgeted: 850000,
      actual: 842000,
      variance: -8000,
      variancePercent: -0.9,
      ytdBudget: 7650000,
      ytdActual: 7590000,
      ytdVariance: -60000,
      ytdVariancePercent: -0.8
    },
    {
      id: 'BVA-011',
      category: 'Infraestructura',
      subcategory: 'Servidores y Cloud',
      type: 'expense',
      department: 'Operaciones',
      budgeted: 120000,
      actual: 138000,
      variance: 18000,
      variancePercent: 15.0,
      ytdBudget: 1080000,
      ytdActual: 1180000,
      ytdVariance: 100000,
      ytdVariancePercent: 9.3
    },
    // Expense Items - Tecnología
    {
      id: 'BVA-012',
      category: 'Nómina',
      subcategory: 'Salarios Desarrollo',
      type: 'expense',
      department: 'Tecnología',
      budgeted: 1200000,
      actual: 1195000,
      variance: -5000,
      variancePercent: -0.4,
      ytdBudget: 10800000,
      ytdActual: 10750000,
      ytdVariance: -50000,
      ytdVariancePercent: -0.5
    },
    {
      id: 'BVA-013',
      category: 'Software',
      subcategory: 'Licencias y Herramientas',
      type: 'expense',
      department: 'Tecnología',
      budgeted: 180000,
      actual: 185000,
      variance: 5000,
      variancePercent: 2.8,
      ytdBudget: 1620000,
      ytdActual: 1650000,
      ytdVariance: 30000,
      ytdVariancePercent: 1.9
    },
    // Expense Items - RRHH
    {
      id: 'BVA-014',
      category: 'Nómina',
      subcategory: 'Salarios RRHH',
      type: 'expense',
      department: 'Recursos Humanos',
      budgeted: 380000,
      actual: 378000,
      variance: -2000,
      variancePercent: -0.5,
      ytdBudget: 3420000,
      ytdActual: 3400000,
      ytdVariance: -20000,
      ytdVariancePercent: -0.6
    },
    {
      id: 'BVA-015',
      category: 'Capacitación',
      subcategory: 'Formación y Desarrollo',
      type: 'expense',
      department: 'Recursos Humanos',
      budgeted: 200000,
      actual: 175000,
      variance: -25000,
      variancePercent: -12.5,
      ytdBudget: 1800000,
      ytdActual: 1650000,
      ytdVariance: -150000,
      ytdVariancePercent: -8.3
    },
    // Expense Items - Administración
    {
      id: 'BVA-016',
      category: 'Nómina',
      subcategory: 'Salarios Administración',
      type: 'expense',
      department: 'Administración',
      budgeted: 520000,
      actual: 518000,
      variance: -2000,
      variancePercent: -0.4,
      ytdBudget: 4680000,
      ytdActual: 4660000,
      ytdVariance: -20000,
      ytdVariancePercent: -0.4
    },
    {
      id: 'BVA-017',
      category: 'Instalaciones',
      subcategory: 'Renta de Oficina',
      type: 'expense',
      department: 'Administración',
      budgeted: 300000,
      actual: 300000,
      variance: 0,
      variancePercent: 0,
      ytdBudget: 2700000,
      ytdActual: 2700000,
      ytdVariance: 0,
      ytdVariancePercent: 0
    },
    {
      id: 'BVA-018',
      category: 'Servicios',
      subcategory: 'Servicios Generales',
      type: 'expense',
      department: 'Administración',
      budgeted: 80000,
      actual: 92000,
      variance: 12000,
      variancePercent: 15.0,
      ytdBudget: 720000,
      ytdActual: 795000,
      ytdVariance: 75000,
      ytdVariancePercent: 10.4
    }
  ]

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

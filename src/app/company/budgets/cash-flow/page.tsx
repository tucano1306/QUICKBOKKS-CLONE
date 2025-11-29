'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Droplet,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Plus,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CashFlowItem {
  id: string
  category: string
  subcategory: string
  type: 'inflow' | 'outflow'
  january: number
  february: number
  march: number
  april: number
  may: number
  june: number
  july: number
  august: number
  september: number
  october: number
  november: number
  december: number
  total: number
}

export default function BudgetCashFlowPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [cashFlowItems, setCashFlowItems] = useState<CashFlowItem[]>([])
  const [selectedYear, setSelectedYear] = useState('2026')
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false)
  const [newPeriodData, setNewPeriodData] = useState({
    category: '',
    subcategory: '',
    type: 'inflow' as 'inflow' | 'outflow',
    amounts: {
      january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
      july: 0, august: 0, september: 0, october: 0, november: 0, december: 0
    }
  })

  const loadCashFlow = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/budgets/cash-flow?companyId=${activeCompany.id}&year=${selectedYear}`)
      if (res.ok) {
        const data = await res.json()
        setCashFlowItems(data.items || [])
      }
    } catch (error) {
      console.error('Error loading cash flow:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany?.id) {
      loadCashFlow()
    }
  }, [status, activeCompany?.id, selectedYear, loadCashFlow])
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']

  // Calculate monthly totals
  const monthlyInflows = months.map(month => 
    cashFlowItems.filter(i => i.type === 'inflow').reduce((sum, i) => sum + (Number(i[month as keyof CashFlowItem]) || 0), 0)
  )
  
  const monthlyOutflows = months.map(month => 
    cashFlowItems.filter(i => i.type === 'outflow').reduce((sum, i) => sum + (Number(i[month as keyof CashFlowItem]) || 0), 0)
  )
  
  const monthlyNetCashFlow = monthlyInflows.map((inflow, idx) => inflow - monthlyOutflows[idx])

  // Calculate cumulative cash position (starting with 5M opening balance)
  const openingBalance = 5000000
  const cumulativeCashPosition = monthlyNetCashFlow.reduce((acc, netFlow, idx) => {
    const previousBalance = idx === 0 ? openingBalance : acc[idx - 1]
    acc.push(previousBalance + netFlow)
    return acc
  }, [] as number[])

  const totalInflows = cashFlowItems.filter(i => i.type === 'inflow').reduce((sum, i) => sum + i.total, 0)
  const totalOutflows = cashFlowItems.filter(i => i.type === 'outflow').reduce((sum, i) => sum + i.total, 0)
  const netCashFlow = totalInflows - totalOutflows
  const endingBalance = openingBalance + netCashFlow

  // Find months with negative cash flow
  const negativeMonths = monthlyNetCashFlow.filter(flow => flow < 0).length
  const minCashPosition = Math.min(...cumulativeCashPosition)
  const maxCashPosition = Math.max(...cumulativeCashPosition)

  // Quarterly totals
  const quarterlyInflows = [
    monthlyInflows.slice(0, 3).reduce((a, b) => a + b, 0),
    monthlyInflows.slice(3, 6).reduce((a, b) => a + b, 0),
    monthlyInflows.slice(6, 9).reduce((a, b) => a + b, 0),
    monthlyInflows.slice(9, 12).reduce((a, b) => a + b, 0)
  ]
  const quarterlyOutflows = [
    monthlyOutflows.slice(0, 3).reduce((a, b) => a + b, 0),
    monthlyOutflows.slice(3, 6).reduce((a, b) => a + b, 0),
    monthlyOutflows.slice(6, 9).reduce((a, b) => a + b, 0),
    monthlyOutflows.slice(9, 12).reduce((a, b) => a + b, 0)
  ]
  const quarterlyNetCashFlow = quarterlyInflows.map((inf, i) => inf - quarterlyOutflows[i])
  const quarterlyCashPosition = [
    cumulativeCashPosition[2], // End of Q1 (March)
    cumulativeCashPosition[5], // End of Q2 (June)
    cumulativeCashPosition[8], // End of Q3 (September)
    cumulativeCashPosition[11] // End of Q4 (December)
  ]

  // Función para exportar a CSV
  const handleExport = () => {
    const headers = viewMode === 'monthly' 
      ? ['Tipo', 'Categoría', 'Subcategoría', ...monthNames, 'Total']
      : ['Tipo', 'Categoría', 'Subcategoría', 'Q1', 'Q2', 'Q3', 'Q4', 'Total']

    const rows = cashFlowItems.map(item => {
      if (viewMode === 'monthly') {
        return [
          item.type === 'inflow' ? 'Entrada' : 'Salida',
          item.category,
          item.subcategory,
          ...months.map(m => item[m as keyof CashFlowItem]),
          item.total
        ]
      } else {
        const q1 = item.january + item.february + item.march
        const q2 = item.april + item.may + item.june
        const q3 = item.july + item.august + item.september
        const q4 = item.october + item.november + item.december
        return [
          item.type === 'inflow' ? 'Entrada' : 'Salida',
          item.category,
          item.subcategory,
          q1, q2, q3, q4,
          item.total
        ]
      }
    })

    // Agregar filas de resumen
    if (viewMode === 'monthly') {
      rows.push(['', '', 'TOTAL ENTRADAS', ...monthlyInflows, totalInflows])
      rows.push(['', '', 'TOTAL SALIDAS', ...monthlyOutflows, totalOutflows])
      rows.push(['', '', 'FLUJO NETO', ...monthlyNetCashFlow, netCashFlow])
      rows.push(['', '', 'POSICIÓN EFECTIVO', ...cumulativeCashPosition, endingBalance])
    } else {
      rows.push(['', '', 'TOTAL ENTRADAS', ...quarterlyInflows, totalInflows])
      rows.push(['', '', 'TOTAL SALIDAS', ...quarterlyOutflows, totalOutflows])
      rows.push(['', '', 'FLUJO NETO', ...quarterlyNetCashFlow, netCashFlow])
    }

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `flujo_efectivo_${selectedYear}_${viewMode}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`✅ Exportado: flujo_efectivo_${selectedYear}_${viewMode}.csv`)
  }

  // Función para agregar nuevo período
  const handleAddPeriod = () => {
    if (!newPeriodData.category || !newPeriodData.subcategory) {
      toast.error('Por favor complete categoría y subcategoría')
      return
    }

    const total = Object.values(newPeriodData.amounts).reduce((a, b) => a + b, 0)
    const newItem: CashFlowItem = {
      id: `cf-${Date.now()}`,
      category: newPeriodData.category,
      subcategory: newPeriodData.subcategory,
      type: newPeriodData.type,
      ...newPeriodData.amounts,
      total
    }

    setCashFlowItems([...cashFlowItems, newItem])
    setShowNewPeriodModal(false)
    setNewPeriodData({
      category: '',
      subcategory: '',
      type: 'inflow',
      amounts: {
        january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
        july: 0, august: 0, september: 0, october: 0, november: 0, december: 0
      }
    })
    toast.success('✅ Nuevo período agregado exitosamente')
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
            <h1 className="text-2xl font-bold text-gray-900">Presupuesto de Flujo de Efectivo</h1>
            <p className="text-gray-600 mt-1">
              Proyección de entradas y salidas de efectivo mensual
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewPeriodModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Período
            </Button>
          </div>
        </div>

        {/* Configuration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Año Fiscal:
              </label>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
              <div className="flex-1"></div>
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Vista:
              </label>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('monthly')}
                >
                  Mensual
                </Button>
                <Button 
                  variant={viewMode === 'quarterly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('quarterly')}
                >
                  Trimestral
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(openingBalance / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-blue-700">Saldo Inicial</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(totalInflows / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-green-700">Entradas Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${(totalOutflows / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-red-700">Salidas Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Droplet className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${(netCashFlow / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-purple-700">Flujo Neto</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900">
                ${(endingBalance / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-indigo-700">Saldo Final</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly/Quarterly Cash Flow Summary */}
        <Card>
          <CardHeader>
            <CardTitle>
              Flujo de Efectivo {viewMode === 'monthly' ? 'Mensual' : 'Trimestral'} - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Concepto</th>
                    {viewMode === 'monthly' ? (
                      monthNames.map((month, idx) => (
                        <th key={idx} className="px-3 py-3 text-right text-xs font-semibold text-gray-600">{month}</th>
                      ))
                    ) : (
                      quarterNames.map((q, idx) => (
                        <th key={idx} className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{q}</th>
                      ))
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-semibold text-sm text-green-900">Entradas de Efectivo</td>
                    {(viewMode === 'monthly' ? monthlyInflows : quarterlyInflows).map((amount, idx) => (
                      <td key={idx} className="px-3 py-3 text-right text-sm font-semibold text-green-700">
                        ${(amount / 1000).toLocaleString('es-MX')}K
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-900">
                      ${(totalInflows / 1000).toLocaleString('es-MX')}K
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 font-semibold text-sm text-red-900">Salidas de Efectivo</td>
                    {(viewMode === 'monthly' ? monthlyOutflows : quarterlyOutflows).map((amount, idx) => (
                      <td key={idx} className="px-3 py-3 text-right text-sm font-semibold text-red-700">
                        ${(amount / 1000).toLocaleString('es-MX')}K
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-900">
                      ${(totalOutflows / 1000).toLocaleString('es-MX')}K
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 font-semibold text-sm text-blue-900">Flujo Neto del Período</td>
                    {(viewMode === 'monthly' ? monthlyNetCashFlow : quarterlyNetCashFlow).map((amount, idx) => (
                      <td key={idx} className={`px-3 py-3 text-right text-sm font-bold ${
                        amount >= 0 ? 'text-blue-700' : 'text-red-600'
                      }`}>
                        {amount >= 0 ? '+' : ''}${(amount / 1000).toLocaleString('es-MX')}K
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-900">
                      {netCashFlow >= 0 ? '+' : ''}${(netCashFlow / 1000).toLocaleString('es-MX')}K
                    </td>
                  </tr>
                  <tr className="bg-indigo-50">
                    <td className="px-4 py-3 font-semibold text-sm text-indigo-900">Posición de Efectivo</td>
                    {(viewMode === 'monthly' ? cumulativeCashPosition : quarterlyCashPosition).map((amount, idx) => (
                      <td key={idx} className={`px-3 py-3 text-right text-sm font-bold ${
                        amount >= 3000000 ? 'text-green-700' : 
                        amount >= 1000000 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        ${(amount / 1000).toLocaleString('es-MX')}K
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-indigo-900">
                      ${(endingBalance / 1000).toLocaleString('es-MX')}K
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Cash Flow by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q1</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q2</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q3</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q4</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Anual</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashFlowItems.map((item) => {
                    const q1 = item.january + item.february + item.march
                    const q2 = item.april + item.may + item.june
                    const q3 = item.july + item.august + item.september
                    const q4 = item.october + item.november + item.december
                    const percentOfTotal = item.type === 'inflow' 
                      ? (item.total / totalInflows) * 100
                      : (item.total / totalOutflows) * 100
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {item.type === 'inflow' ? (
                            <Badge className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                              <ArrowDownRight className="w-3 h-3" /> Entrada
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                              <ArrowUpRight className="w-3 h-3" /> Salida
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{item.category}</div>
                          <div className="text-xs text-gray-500">{item.subcategory}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${(q1 / 1000).toLocaleString('es-MX')}K
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${(q2 / 1000).toLocaleString('es-MX')}K
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${(q3 / 1000).toLocaleString('es-MX')}K
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${(q4 / 1000).toLocaleString('es-MX')}K
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-bold ${
                            item.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${(item.total / 1000).toLocaleString('es-MX')}K
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {percentOfTotal.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Liquidity Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Liquidez</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Saldo Mínimo Proyectado</div>
                    <div className="text-2xl font-bold text-blue-900">
                      ${(minCashPosition / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  {minCashPosition >= 1000000 ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Saldo Máximo Proyectado</div>
                    <div className="text-2xl font-bold text-green-900">
                      ${(maxCashPosition / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Promedio Mensual</div>
                    <div className="text-2xl font-bold text-purple-900">
                      ${(cumulativeCashPosition.reduce((a, b) => a + b, 0) / 12 / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <Droplet className="w-10 h-10 text-purple-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Meses con Flujo Negativo</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {negativeMonths} / 12
                    </div>
                  </div>
                  {negativeMonths <= 2 ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-orange-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas de Flujo de Efectivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyNetCashFlow.map((flow, idx) => {
                  if (flow < 0) {
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-red-900">
                            Flujo Negativo en {monthNames[idx]}
                          </div>
                          <div className="text-xs text-red-700 mt-1">
                            Déficit: ${Math.abs(flow).toLocaleString('es-MX')}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            Posición de efectivo: ${cumulativeCashPosition[idx].toLocaleString('es-MX')}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }).filter(Boolean)}

                {cumulativeCashPosition.some(pos => pos < 1000000) && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-orange-900">
                        Alerta de Liquidez Baja
                      </div>
                      <div className="text-xs text-orange-700 mt-1">
                        El saldo de efectivo cae por debajo del umbral recomendado de $1M en algunos meses.
                      </div>
                    </div>
                  </div>
                )}

                {negativeMonths === 0 && minCashPosition >= 1000000 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-900">
                        Flujo de Efectivo Saludable
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Proyección positiva en todos los meses con liquidez adecuada mantenida.
                      </div>
                    </div>
                  </div>
                )}

                {endingBalance > openingBalance * 1.5 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-blue-900">
                        Crecimiento Excelente
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        El saldo final supera el inicial en más del 50%. Considere oportunidades de inversión.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Droplet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Presupuesto de Flujo de Efectivo</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Herramienta de planificación financiera que proyecta entradas y salidas de efectivo para garantizar liquidez.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Entradas de Efectivo:</strong> Cobros a clientes, ingresos por servicios, intereses ganados</li>
                  <li>• <strong>Salidas de Efectivo:</strong> Nómina, proveedores, gastos operativos, impuestos, inversiones</li>
                  <li>• <strong>Flujo Neto:</strong> Diferencia entre entradas y salidas por período (positivo = superávit, negativo = déficit)</li>
                  <li>• <strong>Posición de Efectivo:</strong> Saldo acumulado mes a mes partiendo del saldo inicial</li>
                  <li>• <strong>Umbral de Liquidez:</strong> Mínimo recomendado $1M para operaciones normales y contingencias</li>
                  <li>• <strong>Objetivo:</strong> Evitar problemas de liquidez, optimizar capital de trabajo, planificar financiamiento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nuevo Período */}
        {showNewPeriodModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewPeriodModal(false)}>
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nuevo Período de Flujo de Efectivo</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewPeriodModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={newPeriodData.type}
                      onChange={(e) => setNewPeriodData({...newPeriodData, type: e.target.value as 'inflow' | 'outflow'})}
                    >
                      <option value="inflow">Entrada de Efectivo</option>
                      <option value="outflow">Salida de Efectivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <Input 
                      placeholder="Ej: Ventas, Nómina, Servicios"
                      value={newPeriodData.category}
                      onChange={(e) => setNewPeriodData({...newPeriodData, category: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subcategoría</label>
                    <Input 
                      placeholder="Ej: Cobro clientes, Sueldos"
                      value={newPeriodData.subcategory}
                      onChange={(e) => setNewPeriodData({...newPeriodData, subcategory: e.target.value})}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Montos por Mes (en USD)</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {monthNames.map((month, idx) => (
                      <div key={months[idx]}>
                        <label className="text-xs font-medium text-gray-600">{month}</label>
                        <Input 
                          type="number"
                          placeholder="0"
                          value={newPeriodData.amounts[months[idx] as keyof typeof newPeriodData.amounts] || ''}
                          onChange={(e) => setNewPeriodData({
                            ...newPeriodData,
                            amounts: {
                              ...newPeriodData.amounts,
                              [months[idx]]: Number(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Anual Proyectado:</span>
                    <span className={`text-xl font-bold ${newPeriodData.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                      ${Object.values(newPeriodData.amounts).reduce((a, b) => a + b, 0).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowNewPeriodModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPeriod}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Período
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

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
  DollarSign,
  Droplet,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react'

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
  const [selectedYear, setSelectedYear] = useState('2026')
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const cashFlowItems: CashFlowItem[] = [
    // Inflows
    {
      id: 'CF-IN-001',
      category: 'Cobros a Clientes',
      subcategory: 'Servicios de Consultoría',
      type: 'inflow',
      january: 2300000,
      february: 2400000,
      march: 2500000,
      april: 2600000,
      may: 2700000,
      june: 2800000,
      july: 2900000,
      august: 3000000,
      september: 3100000,
      october: 3200000,
      november: 3300000,
      december: 3400000,
      total: 34200000
    },
    {
      id: 'CF-IN-002',
      category: 'Cobros a Clientes',
      subcategory: 'Desarrollo de Software',
      type: 'inflow',
      january: 1600000,
      february: 1650000,
      march: 1700000,
      april: 1750000,
      may: 1800000,
      june: 1850000,
      july: 1900000,
      august: 1950000,
      september: 2000000,
      october: 2050000,
      november: 2100000,
      december: 2150000,
      total: 22500000
    },
    {
      id: 'CF-IN-003',
      category: 'Cobros a Clientes',
      subcategory: 'Licencias SaaS',
      type: 'inflow',
      january: 1150000,
      february: 1180000,
      march: 1200000,
      april: 1230000,
      may: 1250000,
      june: 1280000,
      july: 1300000,
      august: 1330000,
      september: 1350000,
      october: 1380000,
      november: 1400000,
      december: 1450000,
      total: 15500000
    },
    {
      id: 'CF-IN-004',
      category: 'Otras Entradas',
      subcategory: 'Intereses Bancarios',
      type: 'inflow',
      january: 25000,
      february: 26000,
      march: 27000,
      april: 28000,
      may: 29000,
      june: 30000,
      july: 31000,
      august: 32000,
      september: 33000,
      october: 34000,
      november: 35000,
      december: 36000,
      total: 366000
    },
    // Outflows
    {
      id: 'CF-OUT-001',
      category: 'Pagos de Nómina',
      subcategory: 'Salarios y Prestaciones',
      type: 'outflow',
      january: 3200000,
      february: 3250000,
      march: 3300000,
      april: 3350000,
      may: 3400000,
      june: 3450000,
      july: 3500000,
      august: 3550000,
      september: 3600000,
      october: 3650000,
      november: 3700000,
      december: 3750000,
      total: 41700000
    },
    {
      id: 'CF-OUT-002',
      category: 'Proveedores',
      subcategory: 'Infraestructura Cloud',
      type: 'outflow',
      january: 110000,
      february: 115000,
      march: 120000,
      april: 125000,
      may: 130000,
      june: 135000,
      july: 140000,
      august: 145000,
      september: 150000,
      october: 155000,
      november: 160000,
      december: 165000,
      total: 1650000
    },
    {
      id: 'CF-OUT-003',
      category: 'Gastos Operativos',
      subcategory: 'Renta de Oficina',
      type: 'outflow',
      january: 300000,
      february: 300000,
      march: 300000,
      april: 300000,
      may: 300000,
      june: 300000,
      july: 300000,
      august: 300000,
      september: 300000,
      october: 300000,
      november: 300000,
      december: 300000,
      total: 3600000
    },
    {
      id: 'CF-OUT-004',
      category: 'Marketing',
      subcategory: 'Publicidad Digital',
      type: 'outflow',
      january: 220000,
      february: 230000,
      march: 240000,
      april: 250000,
      may: 260000,
      june: 270000,
      july: 280000,
      august: 290000,
      september: 300000,
      october: 310000,
      november: 320000,
      december: 330000,
      total: 3300000
    },
    {
      id: 'CF-OUT-005',
      category: 'Impuestos',
      subcategory: 'ISR e IVA',
      type: 'outflow',
      january: 450000,
      february: 0,
      march: 0,
      april: 480000,
      may: 0,
      june: 0,
      july: 510000,
      august: 0,
      september: 0,
      october: 540000,
      november: 0,
      december: 0,
      total: 1980000
    },
    {
      id: 'CF-OUT-006',
      category: 'Servicios',
      subcategory: 'Servicios Públicos',
      type: 'outflow',
      january: 75000,
      february: 78000,
      march: 80000,
      april: 82000,
      may: 85000,
      june: 88000,
      july: 90000,
      august: 92000,
      september: 95000,
      october: 97000,
      november: 100000,
      december: 103000,
      total: 1065000
    },
    {
      id: 'CF-OUT-007',
      category: 'Capacitación',
      subcategory: 'Formación Personal',
      type: 'outflow',
      january: 150000,
      february: 160000,
      march: 170000,
      april: 180000,
      may: 190000,
      june: 200000,
      july: 210000,
      august: 220000,
      september: 230000,
      october: 240000,
      november: 250000,
      december: 260000,
      total: 2460000
    },
    {
      id: 'CF-OUT-008',
      category: 'Inversiones',
      subcategory: 'Equipamiento',
      type: 'outflow',
      january: 500000,
      february: 0,
      march: 0,
      april: 0,
      may: 600000,
      june: 0,
      july: 0,
      august: 0,
      september: 700000,
      october: 0,
      november: 0,
      december: 800000,
      total: 2600000
    }
  ]

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
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

        {/* Monthly Cash Flow Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Flujo de Efectivo Mensual - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Concepto</th>
                    {monthNames.map((month, idx) => (
                      <th key={idx} className="px-3 py-3 text-right text-xs font-semibold text-gray-600">{month}</th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-semibold text-sm text-green-900">Entradas de Efectivo</td>
                    {monthlyInflows.map((amount, idx) => (
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
                    {monthlyOutflows.map((amount, idx) => (
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
                    {monthlyNetCashFlow.map((amount, idx) => (
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
                    {cumulativeCashPosition.map((amount, idx) => (
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
      </div>
    </CompanyTabsLayout>
  )
}

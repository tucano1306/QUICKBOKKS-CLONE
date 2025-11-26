'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download, 
  Printer,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface PeriodData {
  period: string
  ingresos: number
  gastos: number
  utilidad: number
  margen: number
  activos: number
  pasivos: number
  capital: number
}

export default function ComparativeReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Este Año'
  })
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Datos de ejemplo para comparación mensual
  const monthlyData: PeriodData[] = [
    { period: 'Enero 2025', ingresos: 150000, gastos: 95000, utilidad: 55000, margen: 36.7, activos: 2100000, pasivos: 850000, capital: 1250000 },
    { period: 'Febrero 2025', ingresos: 165000, gastos: 98000, utilidad: 67000, margen: 40.6, activos: 2167000, pasivos: 840000, capital: 1327000 },
    { period: 'Marzo 2025', ingresos: 172000, gastos: 102000, utilidad: 70000, margen: 40.7, activos: 2237000, pasivos: 835000, capital: 1402000 },
    { period: 'Abril 2025', ingresos: 158000, gastos: 96000, utilidad: 62000, margen: 39.2, activos: 2299000, pasivos: 830000, capital: 1469000 },
    { period: 'Mayo 2025', ingresos: 178000, gastos: 105000, utilidad: 73000, margen: 41.0, activos: 2372000, pasivos: 825000, capital: 1547000 },
    { period: 'Junio 2025', ingresos: 185000, gastos: 108000, utilidad: 77000, margen: 41.6, activos: 2449000, pasivos: 820000, capital: 1629000 },
    { period: 'Julio 2025', ingresos: 192000, gastos: 112000, utilidad: 80000, margen: 41.7, activos: 2529000, pasivos: 815000, capital: 1714000 },
    { period: 'Agosto 2025', ingresos: 188000, gastos: 110000, utilidad: 78000, margen: 41.5, activos: 2607000, pasivos: 810000, capital: 1797000 },
    { period: 'Septiembre 2025', ingresos: 195000, gastos: 115000, utilidad: 80000, margen: 41.0, activos: 2687000, pasivos: 805000, capital: 1882000 },
    { period: 'Octubre 2025', ingresos: 198000, gastos: 117000, utilidad: 81000, margen: 40.9, activos: 2768000, pasivos: 800000, capital: 1968000 },
    { period: 'Noviembre 2025', ingresos: 175000, gastos: 105000, utilidad: 70000, margen: 40.0, activos: 2838000, pasivos: 795000, capital: 2043000 },
  ]

  // Datos trimestrales
  const quarterlyData: PeriodData[] = [
    { period: 'Q1 2025', ingresos: 487000, gastos: 295000, utilidad: 192000, margen: 39.4, activos: 2237000, pasivos: 835000, capital: 1402000 },
    { period: 'Q2 2025', ingresos: 521000, gastos: 309000, utilidad: 212000, margen: 40.7, activos: 2449000, pasivos: 820000, capital: 1629000 },
    { period: 'Q3 2025', ingresos: 575000, gastos: 337000, utilidad: 238000, margen: 41.4, activos: 2687000, pasivos: 805000, capital: 1882000 },
    { period: 'Q4 2025', ingresos: 373000, gastos: 222000, utilidad: 151000, margen: 40.5, activos: 2838000, pasivos: 795000, capital: 2043000 },
  ]

  // Datos anuales
  const yearlyData: PeriodData[] = [
    { period: '2023', ingresos: 1450000, gastos: 920000, utilidad: 530000, margen: 36.6, activos: 1850000, pasivos: 920000, capital: 930000 },
    { period: '2024', ingresos: 1820000, gastos: 1100000, utilidad: 720000, margen: 39.6, activos: 2350000, pasivos: 875000, capital: 1475000 },
    { period: '2025', ingresos: 1956000, gastos: 1163000, utilidad: 793000, margen: 40.5, activos: 2838000, pasivos: 795000, capital: 2043000 },
  ]

  const currentData = viewMode === 'monthly' ? monthlyData : viewMode === 'quarterly' ? quarterlyData : yearlyData

  const recalculate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`✅ Reportes Comparativos Recalculados\n\nPeriodo: ${dateRange.startDate} al ${dateRange.endDate}\nVista: ${viewMode === 'monthly' ? 'Mensual' : viewMode === 'quarterly' ? 'Trimestral' : 'Anual'}\n\nEn producción, esto consultaría todas las transacciones del periodo.`)
    }, 1000)
  }

  const exportCSV = () => {
    let csv = `REPORTE COMPARATIVO - ${viewMode === 'monthly' ? 'MENSUAL' : viewMode === 'quarterly' ? 'TRIMESTRAL' : 'ANUAL'}\n`
    csv += `Empresa: ${activeCompany?.name}\n`
    csv += `Periodo: ${dateRange.startDate} al ${dateRange.endDate}\n\n`
    csv += 'Periodo,Ingresos,Gastos,Utilidad,Margen %,Activos,Pasivos,Capital\n'
    currentData.forEach(row => {
      csv += `"${row.period}",${row.ingresos},${row.gastos},${row.utilidad},${row.margen},${row.activos},${row.pasivos},${row.capital}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-comparativo-${viewMode}-${dateRange.endDate}.csv`
    a.click()
    alert('✅ CSV exportado exitosamente')
  }

  const totalIngresos = currentData.reduce((sum, d) => sum + d.ingresos, 0)
  const totalGastos = currentData.reduce((sum, d) => sum + d.gastos, 0)
  const totalUtilidad = currentData.reduce((sum, d) => sum + d.utilidad, 0)
  const promedioMargen = currentData.reduce((sum, d) => sum + d.margen, 0) / currentData.length

  if (status === 'loading') {
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
            <h1 className="text-2xl font-bold text-gray-900">Reportes Comparativos</h1>
            <p className="text-gray-600 mt-1">
              Análisis financiero por periodo - Mensual, Trimestral y Anual
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Periodo: {dateRange.label || `${dateRange.startDate} al ${dateRange.endDate}`}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="w-72">
              <DateRangeSelector
                value={dateRange}
                onSelect={(range: DateRange) => {
                  setDateRange(range)
                  recalculate()
                }}
              />
            </div>
            <Button variant="outline" onClick={recalculate} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* View Mode Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Vista:</span>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('monthly')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Mensual
                </Button>
                <Button
                  variant={viewMode === 'quarterly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('quarterly')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Trimestral
                </Button>
                <Button
                  variant={viewMode === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('yearly')}
                >
                  <LineChart className="w-4 h-4 mr-2" />
                  Anual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-green-700">Total Ingresos</div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalIngresos.toLocaleString()}
              </div>
              <p className="text-xs text-green-700 mt-1">
                {currentData.length} periodos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-red-700">Total Gastos</div>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${totalGastos.toLocaleString()}
              </div>
              <p className="text-xs text-red-700 mt-1">
                {((totalGastos / totalIngresos) * 100).toFixed(1)}% de ingresos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700">Utilidad Neta</div>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${totalUtilidad.toLocaleString()}
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Acumulado del periodo
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-700">Margen Promedio</div>
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {promedioMargen.toFixed(1)}%
              </div>
              <p className="text-xs text-purple-700 mt-1">
                Promedio de {currentData.length} periodos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparative Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Análisis Comparativo {viewMode === 'monthly' ? 'Mensual' : viewMode === 'quarterly' ? 'Trimestral' : 'Anual'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Periodo</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Ingresos</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Gastos</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Utilidad</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Margen %</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Activos</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Pasivos</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.period}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-700 font-semibold">
                        ${row.ingresos.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-700 font-semibold">
                        ${row.gastos.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700 font-semibold">
                        ${row.utilidad.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Badge variant={row.margen >= 40 ? 'default' : row.margen >= 30 ? 'secondary' : 'destructive'}>
                          {row.margen.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        ${row.activos.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        ${row.pasivos.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700 font-semibold">
                        ${row.capital.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm text-gray-900">TOTALES</td>
                    <td className="px-4 py-3 text-sm text-right text-green-800">
                      ${totalIngresos.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-800">
                      ${totalGastos.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-blue-800">
                      ${totalUtilidad.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Badge>{promedioMargen.toFixed(1)}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">
                      ${currentData[currentData.length - 1].activos.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">
                      ${currentData[currentData.length - 1].pasivos.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-blue-800">
                      ${currentData[currentData.length - 1].capital.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Análisis Comparativo de Periodos</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Este reporte muestra la evolución de tus métricas financieras clave a través del tiempo, permitiendo identificar tendencias y tomar decisiones informadas.
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Vista Mensual:</strong> Detalle mes a mes para análisis de corto plazo</li>
                  <li>• <strong>Vista Trimestral:</strong> Tendencias por trimestre para planificación media</li>
                  <li>• <strong>Vista Anual:</strong> Comparación año contra año para estrategia a largo plazo</li>
                  <li>• <strong>Métricas Clave:</strong> Ingresos, Gastos, Utilidad, Margen, Balance General completo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

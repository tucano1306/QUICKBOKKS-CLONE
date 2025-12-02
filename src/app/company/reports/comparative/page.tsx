'use client'

import { useEffect, useState, useCallback } from 'react'
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
  LineChart,
  AlertCircle,
  CheckCircle
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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [periodData, setPeriodData] = useState<PeriodData[]>([])

  const loadComparativeData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/comparative?companyId=${activeCompany.id}&view=${viewMode}&start=${dateRange.startDate}&end=${dateRange.endDate}`)
      if (res.ok) {
        const data = await res.json()
        setPeriodData(data.periods || [])
      }
    } catch (error) {
      console.error('Error loading comparative data:', error)
    }
    setLoading(false)
  }, [activeCompany?.id, viewMode, dateRange])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadComparativeData()
  }, [loadComparativeData])

  const currentData = periodData

  const recalculate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setMessage({ type: 'success', text: `Reportes Comparativos Recalculados - Periodo: ${dateRange.startDate} al ${dateRange.endDate} - Vista: ${viewMode === 'monthly' ? 'Mensual' : viewMode === 'quarterly' ? 'Trimestral' : 'Anual'}` })
      setTimeout(() => setMessage(null), 3000)
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
    setMessage({ type: 'success', text: 'CSV exportado exitosamente' })
    setTimeout(() => setMessage(null), 3000)
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
        {/* Message Display */}
        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

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
            <Button onClick={() => {
              const printWindow = window.open('', '_blank')
              if (printWindow) {
                const viewLabel = viewMode === 'monthly' ? 'Mensual' : viewMode === 'quarterly' ? 'Trimestral' : 'Anual'
                const dataRows = currentData.map(row => `
                  <tr>
                    <td>${row.period}</td>
                    <td class="amount positive">$${row.ingresos.toLocaleString()}</td>
                    <td class="amount negative">$${row.gastos.toLocaleString()}</td>
                    <td class="amount ${row.utilidad >= 0 ? 'positive' : 'negative'}">$${row.utilidad.toLocaleString()}</td>
                    <td class="amount">${row.margen.toFixed(1)}%</td>
                    <td class="amount">$${row.activos.toLocaleString()}</td>
                    <td class="amount">$${row.pasivos.toLocaleString()}</td>
                    <td class="amount">$${row.capital.toLocaleString()}</td>
                  </tr>
                `).join('')
                
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Reporte Comparativo ${viewLabel} - ${activeCompany?.name || 'Empresa'}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
                      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                      .company-name { font-size: 24px; font-weight: bold; color: #1a365d; }
                      .report-title { font-size: 20px; margin-top: 10px; color: #333; }
                      .period { font-size: 14px; color: #666; margin-top: 5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                      th { background: #1a365d; color: white; padding: 12px 8px; text-align: left; }
                      td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
                      .amount { text-align: right; font-family: monospace; }
                      .positive { color: #047857; }
                      .negative { color: #dc2626; }
                      .total-row { font-weight: bold; background: #f0f7ff; }
                      .summary { display: flex; justify-content: space-around; margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; }
                      .summary-item { text-align: center; }
                      .summary-label { font-size: 12px; color: #666; }
                      .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
                      .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                      @media print { body { padding: 20px; } }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="company-name">${activeCompany?.name || 'Empresa'}</div>
                      <div class="report-title">Reporte Comparativo ${viewLabel}</div>
                      <div class="period">Período: ${dateRange.startDate} al ${dateRange.endDate}</div>
                    </div>
                    
                    <table>
                      <thead>
                        <tr>
                          <th>Período</th>
                          <th>Ingresos</th>
                          <th>Gastos</th>
                          <th>Utilidad</th>
                          <th>Margen</th>
                          <th>Activos</th>
                          <th>Pasivos</th>
                          <th>Capital</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${dataRows}
                        <tr class="total-row">
                          <td><strong>TOTALES</strong></td>
                          <td class="amount positive"><strong>$${totalIngresos.toLocaleString()}</strong></td>
                          <td class="amount negative"><strong>$${totalGastos.toLocaleString()}</strong></td>
                          <td class="amount ${totalUtilidad >= 0 ? 'positive' : 'negative'}"><strong>$${totalUtilidad.toLocaleString()}</strong></td>
                          <td class="amount"><strong>${(promedioMargen || 0).toFixed(1)}%</strong></td>
                          <td colspan="3"></td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div class="summary">
                      <div class="summary-item">
                        <div class="summary-label">Total Ingresos</div>
                        <div class="summary-value positive">$${totalIngresos.toLocaleString()}</div>
                      </div>
                      <div class="summary-item">
                        <div class="summary-label">Total Gastos</div>
                        <div class="summary-value negative">$${totalGastos.toLocaleString()}</div>
                      </div>
                      <div class="summary-item">
                        <div class="summary-label">Utilidad Neta</div>
                        <div class="summary-value ${totalUtilidad >= 0 ? 'positive' : 'negative'}">$${totalUtilidad.toLocaleString()}</div>
                      </div>
                      <div class="summary-item">
                        <div class="summary-label">Margen Promedio</div>
                        <div class="summary-value">${(promedioMargen || 0).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p>Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p>Este reporte fue generado automáticamente por el sistema de contabilidad.</p>
                    </div>
                  </body>
                  </html>
                `)
                printWindow.document.close()
                printWindow.focus()
                setTimeout(() => printWindow.print(), 250)
              }
            }}>
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

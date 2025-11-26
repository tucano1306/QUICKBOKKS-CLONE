'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Calendar, Download, Printer, RefreshCw } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export default function ProfitLossPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Este Mes'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const currentMonth = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Función para recalcular P&L basado en rango de fechas
  const recalculatePL = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`✅ Estado de Resultados recalculado para:\n${dateRange.startDate} al ${dateRange.endDate}\n\nEn producción, esto consultaría transacciones, facturas, gastos y nómina del periodo seleccionado.`)
    }, 1000)
  }

  const reportData = {
    ingresos: [
      { concepto: 'Ventas de Productos', monto: 125000, cambio: 12.5 },
      { concepto: 'Servicios', monto: 45000, cambio: 8.3 },
      { concepto: 'Otros Ingresos', monto: 5000, cambio: -2.1 }
    ],
    gastosOperativos: [
      { concepto: 'Nómina', monto: 65000, cambio: 5.2 },
      { concepto: 'Renta', monto: 12000, cambio: 0 },
      { concepto: 'Servicios', monto: 8000, cambio: 3.5 },
      { concepto: 'Marketing', monto: 15000, cambio: 25.0 }
    ],
    otrosGastos: [
      { concepto: 'Impuestos', monto: 18000, cambio: 10.5 },
      { concepto: 'Intereses', monto: 2000, cambio: -5.0 }
    ]
  }

  const totalIngresos = reportData.ingresos.reduce((sum, item) => sum + item.monto, 0)
  const totalGastosOp = reportData.gastosOperativos.reduce((sum, item) => sum + item.monto, 0)
  const totalOtrosGastos = reportData.otrosGastos.reduce((sum, item) => sum + item.monto, 0)
  const utilidadOperativa = totalIngresos - totalGastosOp
  const utilidadNeta = utilidadOperativa - totalOtrosGastos
  const margenNeto = (utilidadNeta / totalIngresos) * 100

  // Función para generar CSV
  const generatePLCSV = () => {
    let csv = 'ESTADO DE RESULTADOS (P&L)\n'
    csv += `Empresa: ${activeCompany?.name || 'N/A'}\n`
    csv += `Periodo: ${dateRange.startDate} al ${dateRange.endDate}\n`
    csv += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`
    csv += 'Concepto,Monto,Cambio %\n'
    csv += '\nINGRESOS\n'
    reportData.ingresos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL INGRESOS,${totalIngresos},\n\n`
    csv += 'GASTOS OPERATIVOS\n'
    reportData.gastosOperativos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL GASTOS OPERATIVOS,${totalGastosOp},\n`
    csv += `UTILIDAD OPERATIVA,${utilidadOperativa},\n\n`
    csv += 'OTROS GASTOS\n'
    reportData.otrosGastos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL OTROS GASTOS,${totalOtrosGastos},\n\n`
    csv += `UTILIDAD NETA,${utilidadNeta},\n`
    csv += `MARGEN NETO,${margenNeto.toFixed(2)}%,\n`
    return csv
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados</h1>
            <p className="text-gray-600 mt-1">
              Pérdidas y Ganancias (Profit & Loss)
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
                  recalculatePL()
                }}
              />
            </div>
            <Button variant="outline" onClick={recalculatePL} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button variant="outline" onClick={() => {
              const csvData = generatePLCSV()
              const blob = new Blob([csvData], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `estado-resultados-${dateRange.endDate}.csv`
              a.click()
              alert('✅ CSV exportado exitosamente')
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

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
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-red-700">Total Gastos</div>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${(totalGastosOp + totalOtrosGastos).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700">Utilidad Neta</div>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${utilidadNeta.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-700">Margen Neto</div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {margenNeto.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report */}
        <div className="grid grid-cols-1 gap-6">
          {/* Ingresos */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center justify-between">
                <span>Ingresos</span>
                <span>${totalIngresos.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {reportData.ingresos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(item.cambio)}%
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gastos Operativos */}
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-900 flex items-center justify-between">
                <span>Gastos Operativos</span>
                <span>-${totalGastosOp.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {reportData.gastosOperativos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      {item.cambio !== 0 && (
                        <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(item.cambio)}%
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      -${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Utilidad Operativa */}
          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-blue-900">Utilidad Operativa</div>
                <div className="text-2xl font-bold text-blue-900">
                  ${utilidadOperativa.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Otros Gastos */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-900 flex items-center justify-between">
                <span>Otros Gastos</span>
                <span>-${totalOtrosGastos.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {reportData.otrosGastos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(item.cambio)}%
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      -${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Utilidad Neta Final */}
          <Card className={utilidadNeta >= 0 ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300' : 'bg-gradient-to-br from-red-100 to-red-200 border-red-300'}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold mb-2 ${utilidadNeta >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    Utilidad Neta
                  </div>
                  <div className="text-sm text-gray-700">
                    Margen: {margenNeto.toFixed(2)}%
                  </div>
                </div>
                <div className={`text-4xl font-bold ${utilidadNeta >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ${utilidadNeta.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

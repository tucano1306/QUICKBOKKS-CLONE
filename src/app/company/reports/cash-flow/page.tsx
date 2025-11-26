'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { Calendar, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Download, Printer, RefreshCw } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export default function CashFlowPage() {
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

  const recalculateCashFlow = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`✅ Flujo de Efectivo recalculado\n\nPeriodo: ${dateRange.startDate} al ${dateRange.endDate}\n\nEn producción, esto consultaría todas las transacciones de efectivo del periodo.`)
    }, 1000)
  }

  const cashFlowData = {
    operaciones: [
      { concepto: 'Cobros de Clientes', monto: 125000, tipo: 'entrada' },
      { concepto: 'Pago a Proveedores', monto: -45000, tipo: 'salida' },
      { concepto: 'Pago de Nómina', monto: -28000, tipo: 'salida' },
      { concepto: 'Pago de Renta', monto: -8000, tipo: 'salida' },
      { concepto: 'Servicios e Impuestos', monto: -12500, tipo: 'salida' }
    ],
    inversion: [
      { concepto: 'Compra de Equipo', monto: -15000, tipo: 'salida' },
      { concepto: 'Venta de Activos', monto: 5000, tipo: 'entrada' }
    ],
    financiamiento: [
      { concepto: 'Préstamo Bancario', monto: 30000, tipo: 'entrada' },
      { concepto: 'Pago de Préstamos', monto: -8000, tipo: 'salida' },
      { concepto: 'Aportación de Capital', monto: 20000, tipo: 'entrada' }
    ]
  }

  const flujoOperaciones = cashFlowData.operaciones.reduce((sum, item) => sum + item.monto, 0)
  const flujoInversion = cashFlowData.inversion.reduce((sum, item) => sum + item.monto, 0)
  const flujoFinanciamiento = cashFlowData.financiamiento.reduce((sum, item) => sum + item.monto, 0)
  const flujoNetoTotal = flujoOperaciones + flujoInversion + flujoFinanciamiento

  const efectivoInicial = 45000
  const efectivoFinal = efectivoInicial + flujoNetoTotal

  const cambioPercentage = ((flujoNetoTotal / efectivoInicial) * 100).toFixed(1)

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
            <h1 className="text-2xl font-bold text-gray-900">Estado de Flujo de Efectivo</h1>
            <p className="text-gray-600 mt-1">
              Movimientos de efectivo del período
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
                  recalculateCashFlow()
                }}
              />
            </div>
            <Button variant="outline" onClick={recalculateCashFlow} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button variant="outline" onClick={() => {
              const csv = `Estado de Flujo de Efectivo\nEmpresa: ${activeCompany?.name}\nPeriodo: ${dateRange.startDate} al ${dateRange.endDate}\n\nActividades de Operación\n`
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `flujo-efectivo-${dateRange.endDate}.csv`
              a.click()
              alert('✅ CSV exportado')
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
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700">Efectivo Inicial</div>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                ${efectivoInicial.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${flujoNetoTotal >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm ${flujoNetoTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Flujo Neto Total
                </div>
                {flujoNetoTotal >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className={`text-3xl font-bold ${flujoNetoTotal >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${flujoNetoTotal.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {flujoNetoTotal >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ${flujoNetoTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {Math.abs(parseFloat(cambioPercentage))}% vs inicial
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-700">Efectivo Final</div>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                ${efectivoFinal.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-orange-700">Días de Efectivo</div>
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                45
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Días de operación cubiertos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Details */}
        <div className="space-y-6">
          {/* Actividades de Operación */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-blue-900">Flujo de Efectivo de Actividades de Operación</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {cashFlowData.operaciones.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      {item.tipo === 'entrada' ? (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      )}
                      <span className="text-gray-700">{item.concepto}</span>
                    </div>
                    <span className={`font-semibold ${item.monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${item.monto.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 px-4 bg-blue-100 rounded font-semibold mt-4">
                  <span className="text-blue-900">Flujo Neto de Operación</span>
                  <span className={`text-xl ${flujoOperaciones >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${flujoOperaciones.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actividades de Inversión */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-purple-900">Flujo de Efectivo de Actividades de Inversión</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {cashFlowData.inversion.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      {item.tipo === 'entrada' ? (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      )}
                      <span className="text-gray-700">{item.concepto}</span>
                    </div>
                    <span className={`font-semibold ${item.monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${item.monto.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 px-4 bg-purple-100 rounded font-semibold mt-4">
                  <span className="text-purple-900">Flujo Neto de Inversión</span>
                  <span className={`text-xl ${flujoInversion >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${flujoInversion.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actividades de Financiamiento */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-green-900">Flujo de Efectivo de Actividades de Financiamiento</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {cashFlowData.financiamiento.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      {item.tipo === 'entrada' ? (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      )}
                      <span className="text-gray-700">{item.concepto}</span>
                    </div>
                    <span className={`font-semibold ${item.monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${item.monto.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 px-4 bg-green-100 rounded font-semibold mt-4">
                  <span className="text-green-900">Flujo Neto de Financiamiento</span>
                  <span className={`text-xl ${flujoFinanciamiento >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${flujoFinanciamiento.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Final */}
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700">
            <CardContent className="p-8">
              <div className="space-y-4 text-white">
                <div className="flex justify-between items-center pb-3 border-b border-blue-400">
                  <span className="text-lg">Efectivo al Inicio del Período</span>
                  <span className="text-2xl font-bold">${efectivoInicial.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-blue-400">
                  <span className="text-lg">Aumento (Disminución) Neto</span>
                  <span className={`text-2xl font-bold ${flujoNetoTotal >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    ${flujoNetoTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-bold">Efectivo al Final del Período</span>
                  <span className="text-3xl font-bold">${efectivoFinal.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

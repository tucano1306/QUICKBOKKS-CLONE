'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { Calendar, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Download, Printer, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface CashFlowData {
  operating: { inflow: number; outflow: number; net: number }
  investing: { inflow: number; outflow: number; net: number }
  financing: { inflow: number; outflow: number; net: number }
  netCashFlow: number
  beginningBalance: number
  endingBalance: number
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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [cashFlowData, setCashFlowData] = useState<CashFlowData>({
    operating: { inflow: 0, outflow: 0, net: 0 },
    investing: { inflow: 0, outflow: 0, net: 0 },
    financing: { inflow: 0, outflow: 0, net: 0 },
    netCashFlow: 0,
    beginningBalance: 0,
    endingBalance: 0
  })

  // Fetch cash flow data from API
  const fetchCashFlow = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      const response = await fetch(`/api/accounting/reports/cash-flow?${params}`)
      if (!response.ok) throw new Error('Error al cargar flujo de efectivo')
      const data = await response.json()
      if (data.cashFlow) {
        setCashFlowData(data.cashFlow)
      }
      setMessage({ type: 'success', text: 'Flujo de efectivo actualizado' })
    } catch (error) {
      console.error('Error fetching cash flow:', error)
      setMessage({ type: 'error', text: 'Error al cargar flujo de efectivo' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }, [dateRange.startDate, dateRange.endDate])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCashFlow()
    }
  }, [status, fetchCashFlow])

  const recalculateCashFlow = () => {
    fetchCashFlow()
  }

  // Convertir datos de API al formato para mostrar
  const cashFlowDataDisplay = {
    operaciones: [
      { concepto: 'Cobros de Clientes', monto: cashFlowData?.operating?.inflow || 0, tipo: 'entrada' },
      { concepto: 'Pagos Operativos', monto: -(cashFlowData?.operating?.outflow || 0), tipo: 'salida' }
    ],
    inversion: [
      { concepto: 'Venta de Activos', monto: cashFlowData?.investing?.inflow || 0, tipo: 'entrada' },
      { concepto: 'Compra de Activos', monto: -(cashFlowData?.investing?.outflow || 0), tipo: 'salida' }
    ],
    financiamiento: [
      { concepto: 'Préstamos Recibidos', monto: cashFlowData?.financing?.inflow || 0, tipo: 'entrada' },
      { concepto: 'Pago de Préstamos', monto: -(cashFlowData?.financing?.outflow || 0), tipo: 'salida' }
    ]
  }

  const flujoOperaciones = cashFlowData?.operating?.net || 0
  const flujoInversion = cashFlowData?.investing?.net || 0
  const flujoFinanciamiento = cashFlowData?.financing?.net || 0
  const flujoNetoTotal = cashFlowData?.netCashFlow || 0

  const efectivoInicial = cashFlowData?.beginningBalance || 0
  const efectivoFinal = cashFlowData?.endingBalance || 0

  const cambioPercentage = efectivoInicial > 0 ? ((flujoNetoTotal / efectivoInicial) * 100).toFixed(1) : '0.0'

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
              setMessage({ type: 'success', text: 'CSV exportado exitosamente' })
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => {
              const printWindow = window.open('', '_blank')
              if (printWindow) {
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Estado de Flujo de Efectivo - ${activeCompany?.name || 'Empresa'}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                      .company-name { font-size: 24px; font-weight: bold; color: #1a365d; }
                      .report-title { font-size: 20px; margin-top: 10px; color: #333; }
                      .period { font-size: 14px; color: #666; margin-top: 5px; }
                      .section { margin-bottom: 25px; }
                      .section-title { font-size: 16px; font-weight: bold; background: #f0f0f0; padding: 8px 12px; margin-bottom: 10px; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; }
                      th { background: #f8f8f8; font-weight: bold; }
                      .amount { text-align: right; font-family: monospace; }
                      .positive { color: #047857; }
                      .negative { color: #dc2626; }
                      .total-row { font-weight: bold; background: #f0f7ff; }
                      .grand-total { font-size: 18px; font-weight: bold; margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px; }
                      .summary-box { display: flex; justify-content: space-between; margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; }
                      .summary-item { text-align: center; }
                      .summary-label { font-size: 12px; color: #666; }
                      .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
                      .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                      @media print { body { padding: 20px; } }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="company-name">${activeCompany?.name || 'Empresa'}</div>
                      <div class="report-title">Estado de Flujo de Efectivo</div>
                      <div class="period">Período: ${dateRange.startDate} al ${dateRange.endDate}</div>
                    </div>
                    
                    <div class="section">
                      <div class="section-title">Actividades de Operación</div>
                      <table>
                        <tr><td>Cobros de Clientes</td><td class="amount positive">$${(cashFlowData?.operating?.inflow || 0).toLocaleString()}</td></tr>
                        <tr><td>Pagos Operativos</td><td class="amount negative">($${(cashFlowData?.operating?.outflow || 0).toLocaleString()})</td></tr>
                        <tr class="total-row"><td>Flujo Neto de Operaciones</td><td class="amount ${(cashFlowData?.operating?.net || 0) >= 0 ? 'positive' : 'negative'}">$${(cashFlowData?.operating?.net || 0).toLocaleString()}</td></tr>
                      </table>
                    </div>
                    
                    <div class="section">
                      <div class="section-title">Actividades de Inversión</div>
                      <table>
                        <tr><td>Venta de Activos</td><td class="amount positive">$${(cashFlowData?.investing?.inflow || 0).toLocaleString()}</td></tr>
                        <tr><td>Compra de Activos</td><td class="amount negative">($${(cashFlowData?.investing?.outflow || 0).toLocaleString()})</td></tr>
                        <tr class="total-row"><td>Flujo Neto de Inversión</td><td class="amount ${(cashFlowData?.investing?.net || 0) >= 0 ? 'positive' : 'negative'}">$${(cashFlowData?.investing?.net || 0).toLocaleString()}</td></tr>
                      </table>
                    </div>
                    
                    <div class="section">
                      <div class="section-title">Actividades de Financiamiento</div>
                      <table>
                        <tr><td>Préstamos Recibidos</td><td class="amount positive">$${(cashFlowData?.financing?.inflow || 0).toLocaleString()}</td></tr>
                        <tr><td>Pago de Préstamos</td><td class="amount negative">($${(cashFlowData?.financing?.outflow || 0).toLocaleString()})</td></tr>
                        <tr class="total-row"><td>Flujo Neto de Financiamiento</td><td class="amount ${(cashFlowData?.financing?.net || 0) >= 0 ? 'positive' : 'negative'}">$${(cashFlowData?.financing?.net || 0).toLocaleString()}</td></tr>
                      </table>
                    </div>
                    
                    <div class="grand-total">
                      <table>
                        <tr><td>Efectivo al Inicio del Período</td><td class="amount">$${efectivoInicial.toLocaleString()}</td></tr>
                        <tr><td><strong>Flujo Neto Total</strong></td><td class="amount ${flujoNetoTotal >= 0 ? 'positive' : 'negative'}"><strong>$${flujoNetoTotal.toLocaleString()}</strong></td></tr>
                        <tr><td><strong>Efectivo al Final del Período</strong></td><td class="amount"><strong>$${efectivoFinal.toLocaleString()}</strong></td></tr>
                      </table>
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
                {cashFlowDataDisplay.operaciones.filter(item => item.monto !== 0).map((item, index) => (
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
                {cashFlowDataDisplay.operaciones.filter(item => item.monto !== 0).length === 0 && (
                  <div className="text-gray-500 text-sm py-2">No hay actividades de operación en este periodo</div>
                )}
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
                {cashFlowDataDisplay.inversion.filter(item => item.monto !== 0).map((item, index) => (
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
                {cashFlowDataDisplay.inversion.filter(item => item.monto !== 0).length === 0 && (
                  <div className="text-gray-500 text-sm py-2">No hay actividades de inversión en este periodo</div>
                )}
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
                {cashFlowDataDisplay.financiamiento.filter(item => item.monto !== 0).map((item, index) => (
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
                {cashFlowDataDisplay.financiamiento.filter(item => item.monto !== 0).length === 0 && (
                  <div className="text-gray-500 text-sm py-2">No hay actividades de financiamiento en este periodo</div>
                )}
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

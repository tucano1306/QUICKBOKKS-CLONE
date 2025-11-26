'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { Calendar, TrendingUp, Building2, Wallet, CreditCard, Package, Download, Printer, RefreshCw } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export default function BalanceSheetPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Este Año'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const currentDate = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  // Función para recalcular balance basado en rango de fechas
  const recalculateBalance = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`✅ Balance recalculado para el periodo:\n${dateRange.startDate} al ${dateRange.endDate}\n\nEn producción, esto consultaría la base de datos y recalcularía todos los montos basándose en las transacciones del periodo seleccionado.`)
    }, 1000)
  }

  const balanceData = {
    activos: {
      circulantes: [
        { concepto: 'Efectivo y Bancos', monto: 89450 },
        { concepto: 'Cuentas por Cobrar', monto: 45200 },
        { concepto: 'Inventario', monto: 32000 },
        { concepto: 'Otros Activos Circulantes', monto: 8500 }
      ],
      fijos: [
        { concepto: 'Mobiliario y Equipo', monto: 45000 },
        { concepto: 'Equipo de Cómputo', monto: 25000 },
        { concepto: 'Vehículos', monto: 80000 },
        { concepto: 'Menos: Depreciación', monto: -25000 }
      ]
    },
    pasivos: {
      corto: [
        { concepto: 'Cuentas por Pagar', monto: 12800 },
        { concepto: 'Impuestos por Pagar', monto: 8500 },
        { concepto: 'Préstamos a Corto Plazo', monto: 15000 }
      ],
      largo: [
        { concepto: 'Préstamos Bancarios', monto: 50000 },
        { concepto: 'Hipotecas', monto: 120000 }
      ]
    },
    capital: [
      { concepto: 'Capital Social', monto: 100000 },
      { concepto: 'Utilidades Retenidas', monto: 45850 },
      { concepto: 'Utilidad del Ejercicio', monto: 79000 }
    ]
  }

  const totalActivosCirc = balanceData.activos.circulantes.reduce((sum, item) => sum + item.monto, 0)
  const totalActivosFijos = balanceData.activos.fijos.reduce((sum, item) => sum + item.monto, 0)
  const totalActivos = totalActivosCirc + totalActivosFijos

  const totalPasivosCorto = balanceData.pasivos.corto.reduce((sum, item) => sum + item.monto, 0)
  const totalPasivosLargo = balanceData.pasivos.largo.reduce((sum, item) => sum + item.monto, 0)
  const totalPasivos = totalPasivosCorto + totalPasivosLargo

  const totalCapital = balanceData.capital.reduce((sum, item) => sum + item.monto, 0)
  const totalPasivosCapital = totalPasivos + totalCapital

  // Función para generar CSV
  const generateBalanceCSV = () => {
    let csv = 'BALANCE GENERAL\n'
    csv += `Empresa: ${activeCompany?.name || 'N/A'}\n`
    csv += `Periodo: ${dateRange.startDate} al ${dateRange.endDate}\n`
    csv += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`
    csv += 'Concepto,Monto\n'
    csv += '\nACTIVOS\n'
    csv += 'Activos Circulantes\n'
    balanceData.activos.circulantes.forEach(item => {
      csv += `"${item.concepto}",${item.monto}\n`
    })
    csv += `TOTAL ACTIVOS CIRCULANTES,${totalActivosCirc}\n\n`
    csv += 'Activos Fijos\n'
    balanceData.activos.fijos.forEach(item => {
      csv += `"${item.concepto}",${item.monto}\n`
    })
    csv += `TOTAL ACTIVOS FIJOS,${totalActivosFijos}\n`
    csv += `TOTAL ACTIVOS,${totalActivos}\n\n`
    csv += 'PASIVOS\n'
    csv += 'Pasivos a Corto Plazo\n'
    balanceData.pasivos.corto.forEach(item => {
      csv += `"${item.concepto}",${item.monto}\n`
    })
    csv += `TOTAL PASIVOS CORTO PLAZO,${totalPasivosCorto}\n\n`
    csv += 'Pasivos a Largo Plazo\n'
    balanceData.pasivos.largo.forEach(item => {
      csv += `"${item.concepto}",${item.monto}\n`
    })
    csv += `TOTAL PASIVOS LARGO PLAZO,${totalPasivosLargo}\n`
    csv += `TOTAL PASIVOS,${totalPasivos}\n\n`
    csv += 'CAPITAL\n'
    balanceData.capital.forEach(item => {
      csv += `"${item.concepto}",${item.monto}\n`
    })
    csv += `TOTAL CAPITAL,${totalCapital}\n\n`
    csv += `TOTAL PASIVOS + CAPITAL,${totalPasivosCapital}\n`
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
            <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
            <p className="text-gray-600 mt-1">
              Estado de Situación Financiera al {new Date(dateRange.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                  recalculateBalance()
                }}
              />
            </div>
            <Button variant="outline" onClick={recalculateBalance} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button variant="outline" onClick={() => {
              const csvData = generateBalanceCSV()
              const blob = new Blob([csvData], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `balance-general-${dateRange.endDate}.csv`
              a.click()
              alert('✅ CSV exportado exitosamente')
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => {
              window.print()
            }}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700">Total Activos</div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                ${totalActivos.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-orange-700">Total Pasivos</div>
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                ${totalPasivos.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-green-700">Capital Contable</div>
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">
                ${totalCapital.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Sheet Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ACTIVOS */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  ACTIVOS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Activos Circulantes */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Activos Circulantes</h3>
                  <div className="space-y-2">
                    {balanceData.activos.circulantes.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span className="text-gray-700">{item.concepto}</span>
                        <span className="font-semibold">${item.monto.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 px-3 bg-blue-100 rounded font-semibold">
                      <span>Subtotal Activos Circulantes</span>
                      <span className="text-blue-900">${totalActivosCirc.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Activos Fijos */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Activos Fijos</h3>
                  <div className="space-y-2">
                    {balanceData.activos.fijos.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span className={item.monto < 0 ? 'text-gray-700 italic' : 'text-gray-700'}>
                          {item.concepto}
                        </span>
                        <span className={`font-semibold ${item.monto < 0 ? 'text-red-600' : ''}`}>
                          ${item.monto.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 px-3 bg-blue-100 rounded font-semibold">
                      <span>Subtotal Activos Fijos</span>
                      <span className="text-blue-900">${totalActivosFijos.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Total Activos */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                  <div className="flex justify-between items-center text-white">
                    <span className="text-lg font-bold">TOTAL ACTIVOS</span>
                    <span className="text-2xl font-bold">${totalActivos.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PASIVOS Y CAPITAL */}
          <div className="space-y-6">
            {/* PASIVOS */}
            <Card>
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  PASIVOS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Pasivos a Corto Plazo */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Pasivos a Corto Plazo</h3>
                  <div className="space-y-2">
                    {balanceData.pasivos.corto.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span className="text-gray-700">{item.concepto}</span>
                        <span className="font-semibold">${item.monto.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 px-3 bg-orange-100 rounded font-semibold">
                      <span>Subtotal Pasivos Corto Plazo</span>
                      <span className="text-orange-900">${totalPasivosCorto.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Pasivos a Largo Plazo */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Pasivos a Largo Plazo</h3>
                  <div className="space-y-2">
                    {balanceData.pasivos.largo.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span className="text-gray-700">{item.concepto}</span>
                        <span className="font-semibold">${item.monto.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 px-3 bg-orange-100 rounded font-semibold">
                      <span>Subtotal Pasivos Largo Plazo</span>
                      <span className="text-orange-900">${totalPasivosLargo.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Total Pasivos */}
                <div className="mt-6 p-3 bg-orange-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-orange-900">TOTAL PASIVOS</span>
                    <span className="text-xl font-bold text-orange-900">${totalPasivos.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CAPITAL CONTABLE */}
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  CAPITAL CONTABLE
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {balanceData.capital.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-gray-700">{item.concepto}</span>
                      <span className="font-semibold">${item.monto.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Total Capital */}
                <div className="mt-4 p-3 bg-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900">TOTAL CAPITAL</span>
                    <span className="text-xl font-bold text-green-900">${totalCapital.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Pasivos + Capital */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-center text-white">
                  <span className="text-lg font-bold">PASIVOS + CAPITAL</span>
                  <span className="text-2xl font-bold">${totalPasivosCapital.toLocaleString()}</span>
                </div>
                {totalActivos === totalPasivosCapital && (
                  <div className="mt-3 text-center text-green-100 text-sm font-medium">
                    ✓ Balance cuadrado correctamente
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

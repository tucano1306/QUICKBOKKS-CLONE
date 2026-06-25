'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Wallet,
  RefreshCw,
  Info,
  Car
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface YearRow {
  year: number
  income: number
  expenses: number
  salary: number
  expensesExclSalary: number
  netProfit: number
  profitExclSalary: number
  isPartial: boolean
}

interface Projection {
  year: number
  income: number
  expenses: number
  salary: number
  netProfit: number
  profitExclSalary: number
  factor: number
}

interface ProfitabilityData {
  currentYear: number
  years: YearRow[]
  projection: Projection | null
}

const fmt = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const profitColor = (n: number): string => (n >= 0 ? 'text-[#108000]' : 'text-red-600')

export default function ProfitabilityPage() {
  const { activeCompany } = useCompany()
  const [data, setData] = useState<ProfitabilityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/profitability?companyId=${activeCompany.id}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const e = await res.json().catch(() => ({}))
        setError(e.error || 'No se pudieron cargar los datos')
      }
    } catch (e) {
      console.error('Error loading profitability:', e)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    setData(null)
    load()
  }, [load])

  const years = data?.years ?? []
  const hasData = years.length > 0

  // Totales acumulados (todos los años con datos)
  const totals = years.reduce(
    (acc, y) => ({
      income: acc.income + y.income,
      expenses: acc.expenses + y.expenses,
      salary: acc.salary + y.salary,
      netProfit: acc.netProfit + y.netProfit,
      profitExclSalary: acc.profitExclSalary + y.profitExclSalary,
    }),
    { income: 0, expenses: 0, salary: 0, netProfit: 0, profitExclSalary: 0 }
  )

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2942] flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-[#2CA01C]" />
              Rentabilidad
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Ganancias por año y escenario sin el gasto de salarios
              {activeCompany && (
                <span className="ml-2 text-[#0077C5] font-medium">• {activeCompany.name}</span>
              )}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 w-fit"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Explicación */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#0077C5]" />
          <p>
            <strong>Ganancia neta</strong> = ingresos − gastos. La{' '}
            <strong>Ganancia sin salarios</strong> excluye los gastos de la categoría de salarios
            (<Car className="inline h-3.5 w-3.5 -mt-0.5" /> el chófer), para que veas cuánto habrías
            ganado sin ese pago. La diferencia entre ambas es exactamente lo que pagaste en salarios.
          </p>
        </div>

        {loading && <div className="text-center py-12 text-gray-500">Cargando…</div>}

        {!loading && error && (
          <div className="text-center py-12 text-red-600 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
            No hay datos de ingresos ni gastos registrados para esta empresa.
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Tarjetas resumen acumulado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                title="Ingresos totales"
                value={fmt(totals.income)}
                icon={<TrendingUp className="h-5 w-5 text-white" />}
                bg="bg-[#2CA01C]"
                valueClass="text-[#108000]"
              />
              <SummaryCard
                title="Gastos totales"
                value={fmt(totals.expenses)}
                icon={<TrendingDown className="h-5 w-5 text-white" />}
                bg="bg-red-500"
                valueClass="text-red-700"
              />
              <SummaryCard
                title="Ganancia neta total"
                value={fmt(totals.netProfit)}
                icon={<Wallet className="h-5 w-5 text-white" />}
                bg="bg-[#0077C5]"
                valueClass={profitColor(totals.netProfit)}
              />
              <SummaryCard
                title="Ganancia total sin salarios"
                value={fmt(totals.profitExclSalary)}
                icon={<Sparkles className="h-5 w-5 text-white" />}
                bg="bg-purple-600"
                valueClass={profitColor(totals.profitExclSalary)}
                subtitle={`Pagado en salarios: ${fmt(totals.salary)}`}
              />
            </div>

            {/* Detalle por año */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Ganancias por año</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tabla en desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4 font-medium">Año</th>
                        <th className="py-2 px-4 font-medium text-right">Ingresos</th>
                        <th className="py-2 px-4 font-medium text-right">Gastos</th>
                        <th className="py-2 px-4 font-medium text-right">Salarios</th>
                        <th className="py-2 px-4 font-medium text-right">Ganancia neta</th>
                        <th className="py-2 px-4 font-medium text-right">Ganancia sin salarios</th>
                        <th className="py-2 pl-4 font-medium text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {years.map((y) => (
                        <tr key={y.year} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 pr-4 font-semibold text-[#0D2942]">
                            {y.year}
                            {y.isPartial && (
                              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">
                                en curso
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-[#108000]">{fmt(y.income)}</td>
                          <td className="py-3 px-4 text-right text-red-700">{fmt(y.expenses)}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{fmt(y.salary)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${profitColor(y.netProfit)}`}>
                            {fmt(y.netProfit)}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${profitColor(y.profitExclSalary)}`}>
                            {fmt(y.profitExclSalary)}
                          </td>
                          <td className="py-3 pl-4 text-right text-purple-700">+{fmt(y.salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-3 pr-4 text-[#0D2942]">Total</td>
                        <td className="py-3 px-4 text-right text-[#108000]">{fmt(totals.income)}</td>
                        <td className="py-3 px-4 text-right text-red-700">{fmt(totals.expenses)}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{fmt(totals.salary)}</td>
                        <td className={`py-3 px-4 text-right ${profitColor(totals.netProfit)}`}>{fmt(totals.netProfit)}</td>
                        <td className={`py-3 px-4 text-right ${profitColor(totals.profitExclSalary)}`}>{fmt(totals.profitExclSalary)}</td>
                        <td className="py-3 pl-4 text-right text-purple-700">+{fmt(totals.salary)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tarjetas en móvil */}
                <div className="md:hidden space-y-3">
                  {years.map((y) => (
                    <div key={y.year} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#0D2942]">
                          {y.year}
                          {y.isPartial && (
                            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              en curso
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                        <span className="text-gray-500">Ingresos</span>
                        <span className="text-right text-[#108000]">{fmt(y.income)}</span>
                        <span className="text-gray-500">Gastos</span>
                        <span className="text-right text-red-700">{fmt(y.expenses)}</span>
                        <span className="text-gray-500">Salarios</span>
                        <span className="text-right text-gray-600">{fmt(y.salary)}</span>
                        <span className="text-gray-500 font-medium">Ganancia neta</span>
                        <span className={`text-right font-semibold ${profitColor(y.netProfit)}`}>{fmt(y.netProfit)}</span>
                        <span className="text-gray-500 font-medium">Sin salarios</span>
                        <span className={`text-right font-semibold ${profitColor(y.profitExclSalary)}`}>{fmt(y.profitExclSalary)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Proyección año en curso */}
            {data?.projection && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Proyección {data.projection.year} (fin de año)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-4">
                    Estimación anualizando lo acumulado del año en curso (factor ×{data.projection.factor}).
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <ProjItem label="Ingresos proyectados" value={fmt(data.projection.income)} className="text-[#108000]" />
                    <ProjItem label="Gastos proyectados" value={fmt(data.projection.expenses)} className="text-red-700" />
                    <ProjItem label="Ganancia neta proyectada" value={fmt(data.projection.netProfit)} className={profitColor(data.projection.netProfit)} />
                    <ProjItem label="Ganancia proyectada sin salarios" value={fmt(data.projection.profitExclSalary)} className={profitColor(data.projection.profitExclSalary)} />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  bg,
  valueClass,
  subtitle,
}: Readonly<{
  title: string
  value: string
  icon: React.ReactNode
  bg: string
  valueClass: string
  subtitle?: string
}>) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
          <span className="text-xs sm:text-sm text-gray-600 font-medium">{title}</span>
        </div>
        <div className={`text-lg sm:text-2xl font-bold truncate ${valueClass}`}>{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1 truncate">{subtitle}</div>}
      </CardContent>
    </Card>
  )
}

function ProjItem({ label, value, className }: Readonly<{ label: string; value: string; className: string }>) {
  return (
    <div className="rounded-lg bg-white border border-gray-100 p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-base sm:text-xl font-bold truncate ${className}`}>{value}</div>
    </div>
  )
}

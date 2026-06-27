'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Info,
  Car,
  ArrowRight,
  Wallet
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

// Frase en lenguaje sencillo: cuánto ganaste y cuánto habrías ganado sin pagar salarios
const profitWord = (n: number): string =>
  n >= 0 ? `ganaste ${fmt(n)}` : `tuviste una pérdida de ${fmt(-n)}`

const profitWordWould = (n: number): string =>
  n >= 0 ? `habrías ganado ${fmt(n)}` : `habrías tenido una pérdida de ${fmt(-n)}`

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

  // Auto-refrescar al volver a la pestaña o ventana
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && activeCompany?.id) {
        load()
      }
    }
    document.addEventListener('visibilitychange', refresh)
    globalThis.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      globalThis.removeEventListener('focus', refresh)
    }
  }, [activeCompany?.id, load])

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
              Tus ganancias por año y cuánto habrías ganado sin pagar salarios
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

        {/* Explicación sencilla */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#0077C5]" />
          <p>
            Aquí ves dos escenarios lado a lado: lo que <strong>ganaste de verdad</strong> (con salarios)
            y lo que <strong>habrías ganado sin pagar salarios</strong>
            {' '}(<Car className="inline h-3.5 w-3.5 -mt-0.5" /> sin el chófer). La diferencia entre
            ambos escenarios es exactamente lo que pagaste en salarios.
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
            {/* Comparación global (todos los años) */}
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Comparación general (todos los años con datos)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScenarioCompare
                  real={totals.netProfit}
                  withoutSalary={totals.profitExclSalary}
                  salary={totals.salary}
                />
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  En total {profitWord(totals.netProfit)}. Pagaste{' '}
                  <strong className="text-amber-700">{fmt(totals.salary)}</strong> en salarios;
                  sin ese gasto {profitWordWould(totals.profitExclSalary)}.
                </p>
              </CardContent>
            </Card>

            {/* Detalle por año */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-[#0D2942]">Año por año</h2>
              {years.map((y) => (
                <Card key={y.year}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-[#0D2942]">
                        {y.year}
                        {y.isPartial && (
                          <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">
                            en curso
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        Ingresos {fmt(y.income)} · Gastos {fmt(y.expenses)}
                      </span>
                    </div>

                    <ScenarioCompare
                      real={y.netProfit}
                      withoutSalary={y.profitExclSalary}
                      salary={y.salary}
                    />

                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                      En {y.year} {profitWord(y.netProfit)}. Pagaste{' '}
                      <strong className="text-amber-700">{fmt(y.salary)}</strong> en salarios;
                      sin ese gasto {profitWordWould(y.profitExclSalary)}.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Proyección año en curso */}
            {data?.projection && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Proyección a fin de {data.projection.year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-4">
                    Estimación de cómo cerraría el año si el ritmo actual se mantiene
                    (anualizando lo acumulado, factor ×{data.projection.factor}).
                  </p>
                  <ScenarioCompare
                    real={data.projection.netProfit}
                    withoutSalary={data.projection.profitExclSalary}
                    salary={data.projection.salary}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

// Dos escenarios lado a lado: ganancia real (con salarios) vs. sin salarios,
// con la diferencia (lo pagado en salarios) en el centro.
function ScenarioCompare({
  real,
  withoutSalary,
  salary,
}: Readonly<{ real: number; withoutSalary: number; salary: number }>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
      {/* Escenario real */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
          <Wallet className="h-4 w-4" />
          Ganancia real (con salarios)
        </div>
        <div className={`text-2xl sm:text-3xl font-bold ${profitColor(real)}`}>{fmt(real)}</div>
        <div className="text-xs text-gray-500 mt-1">Lo que realmente quedó</div>
      </div>

      {/* Diferencia = salarios */}
      <div className="flex md:flex-col items-center justify-center gap-1 px-2">
        <ArrowRight className="h-5 w-5 text-amber-500 rotate-90 md:rotate-0" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-700">
            <Car className="h-3.5 w-3.5" />
            salarios
          </div>
          <div className="text-sm font-bold text-amber-700 whitespace-nowrap">+{fmt(salary)}</div>
        </div>
      </div>

      {/* Escenario sin salarios */}
      <div className="rounded-xl border-2 border-purple-300 bg-purple-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
          <Sparkles className="h-4 w-4" />
          Ganancia sin salarios
        </div>
        <div className={`text-2xl sm:text-3xl font-bold ${profitColor(withoutSalary)}`}>{fmt(withoutSalary)}</div>
        <div className="text-xs text-gray-500 mt-1">Lo que habrías ganado sin el chófer</div>
      </div>
    </div>
  )
}

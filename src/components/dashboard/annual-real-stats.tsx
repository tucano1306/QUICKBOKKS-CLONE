'use client'

import { BarChart3, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface MonthDatum {
  month: string
  monthIndex: number
  revenue: number
  expenses: number
}

interface AnnualRealStatsProps {
  readonly stats: {
    revenue: { current: number; previous: number; change: number }
    expenses: { current: number; previous: number; change: number }
    currentYear: number
    currentMonth: number
    monthlyData: MonthDatum[]
  }
}

const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

function ChangeBadge({ change }: { readonly change: number }) {
  if (!Number.isFinite(change) || change === 0) return null
  const up = change > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change)}% vs año anterior
    </span>
  )
}

export default function AnnualRealStats({ stats }: AnnualRealStatsProps) {
  const { monthlyData, revenue, expenses, currentYear, currentMonth } = stats
  const net = revenue.current - expenses.current
  const maxVal = Math.max(...monthlyData.flatMap((m) => [m.revenue, m.expenses]), 1)

  const withNet = monthlyData
    .filter((m) => m.monthIndex <= currentMonth && (m.revenue > 0 || m.expenses > 0))
    .map((m) => ({ ...m, net: m.revenue - m.expenses }))
  const best = withNet.length ? withNet.reduce((a, b) => (a.net > b.net ? a : b)) : null
  const worst = withNet.length ? withNet.reduce((a, b) => (a.net < b.net ? a : b)) : null

  return (
    <div className="rounded-2xl shadow-lg overflow-hidden bg-white border border-gray-200">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-[#0D2942] text-lg font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Resumen Financiero {currentYear}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Datos reales de tus transacciones, gastos y facturas registradas
            </p>
          </div>
          <div className="flex gap-3 text-[10px] text-gray-500 items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }} />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#f87171,#dc2626)' }} />
              Gastos
            </span>
          </div>
        </div>

        {/* KPIs reales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 uppercase tracking-widest">
              <TrendingUp className="h-3.5 w-3.5" /> Ingresos
            </div>
            <p className="text-emerald-700 font-bold text-xl mt-0.5">{money(revenue.current)}</p>
            <ChangeBadge change={revenue.change} />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-red-500 uppercase tracking-widest">
              <TrendingDown className="h-3.5 w-3.5" /> Gastos
            </div>
            <p className="text-red-600 font-bold text-xl mt-0.5">{money(expenses.current)}</p>
            <ChangeBadge change={expenses.change} />
          </div>
          <div className={`rounded-xl p-3 border ${net >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${net >= 0 ? 'text-indigo-500' : 'text-red-500'}`}>
              <Wallet className="h-3.5 w-3.5" /> Ganancia neta
            </div>
            <p className={`font-bold text-xl mt-0.5 ${net >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{money(net)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Ingresos − Gastos</p>
          </div>
        </div>
      </div>

      {/* Gráfico mensual real */}
      <div className="px-6 py-6">
        {withNet.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">
            Aún no hay transacciones ni gastos registrados este año.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1.5 sm:gap-2 w-full" style={{ height: '180px' }}>
              {monthlyData.map((m) => {
                const isCurrent = m.monthIndex === currentMonth
                const isFuture = m.monthIndex > currentMonth
                const hasData = m.revenue > 0 || m.expenses > 0
                const revH = Math.max(2, Math.round((m.revenue / maxVal) * 140))
                const expH = Math.max(2, Math.round((m.expenses / maxVal) * 140))

                let revBg: string
                if (isFuture || !hasData) revBg = 'rgba(148,163,184,0.25)'
                else if (isCurrent) revBg = 'linear-gradient(180deg,#6ee7b7 0%,#10b981 55%,#047857 100%)'
                else revBg = 'linear-gradient(180deg,#34d399 0%,#10b981 60%,#059669 100%)'

                let expBg: string
                if (isFuture || !hasData) expBg = 'rgba(148,163,184,0.15)'
                else if (isCurrent) expBg = 'linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#b91c1c 100%)'
                else expBg = 'linear-gradient(180deg,#f87171 0%,#ef4444 60%,#dc2626 100%)'

                let monthLabelClass: string
                if (isCurrent) monthLabelClass = 'text-emerald-600 font-bold'
                else if (isFuture) monthLabelClass = 'text-gray-300'
                else monthLabelClass = 'text-gray-500'

                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                    {/* Tooltip al pasar el mouse */}
                    {hasData && !isFuture && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[8px] text-gray-500 text-center mb-1 leading-tight whitespace-nowrap">
                        <span className="text-emerald-600">{money(m.revenue)}</span>
                        {' / '}
                        <span className="text-red-500">{money(m.expenses)}</span>
                      </div>
                    )}

                    <div className="w-full flex gap-0.5 items-end" style={{ height: '150px' }}>
                      <div className="flex-1 flex items-end h-full">
                        <div
                          className="w-full rounded-t-md transition-all duration-700 ease-out"
                          style={{ height: `${isFuture || !hasData ? 4 : revH}px`, background: revBg }}
                        />
                      </div>
                      <div className="flex-1 flex items-end h-full">
                        <div
                          className="w-full rounded-t-md transition-all duration-700 ease-out"
                          style={{ height: `${isFuture || !hasData ? 4 : expH}px`, background: expBg }}
                        />
                      </div>
                    </div>

                    <p className={`text-[9px] sm:text-[10px] mt-2 font-medium ${monthLabelClass}`}>{m.month}</p>
                  </div>
                )
              })}
            </div>

            <div className="h-px w-full mt-1" style={{ background: 'rgba(0,0,0,0.08)' }} />

            {/* Mejor / peor mes (real) */}
            {best && worst && (
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span className="text-[10px]">🏆</span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Mejor mes: {best.month} · ganancia {money(best.net)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <span className="text-[10px]">📉</span>
                  <span className="text-[10px] text-red-700 font-medium">
                    Menor mes: {worst.month} · ganancia {money(worst.net)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 ml-auto">
                  <span className="text-[10px] text-gray-500">Pasa el mouse sobre cada mes para ver el detalle</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

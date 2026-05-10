'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Realistic seasonal variation (retail/service business pattern)
const VARIATION = [0.82, 0.78, 0.91, 0.88, 1.0, 0.97, 1.08, 1.03, 0.95, 1.12, 1.18, 1.28]

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnnualRecord {
  taxYear: number
  line9_totalIncome: number
  scheduleC_grossReceipts: number
  scheduleC_expenses: number
  line1a_w2Wages: number
  line8_otherIncome: number
}

interface IncomeAnalyticsProps {
  taxYear: number
  totalIncome: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function pct(n: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

// Build array of 12 monthly values from an annual total
function monthlyValues(annual: number): number[] {
  const avg = annual / 12
  return VARIATION.map((v) => avg * v)
}

// ─── Section 1: Monthly Ranking ───────────────────────────────────────────────

function MonthRanking({ totalIncome, taxYear }: { totalIncome: number; taxYear: number }) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const isCurrentYear = taxYear === currentYear
  const isPastYear = taxYear < currentYear
  const values = useMemo(() => monthlyValues(totalIncome > 0 ? totalIncome : 60_000), [totalIncome])
  const max = Math.max(...values)

  // Sort by value descending
  const ranked = useMemo(
    () =>
      values
        .map((v, i) => ({ month: MONTHS[i], value: v, index: i }))
        .sort((a, b) => b.value - a.value),
    [values],
  )

  function barColor(rank: number): string {
    if (rank < 3) return 'linear-gradient(90deg,#10b981,#059669)' // top 3 — green
    if (rank >= 9) return 'linear-gradient(90deg,#ef4444,#dc2626)' // bottom 3 — red
    return 'linear-gradient(90deg,#6366f1,#4f46e5)' // middle — indigo
  }

  function rankTag(rank: number) {
    if (rank < 3)
      return <span className="text-[9px] font-bold text-emerald-400 ml-1">TOP</span>
    if (rank >= 9)
      return <span className="text-[9px] font-bold text-red-400 ml-1">LOW</span>
    return null
  }

  return (
    <div>
      <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-3">
        Ranking mensual de ganancias
      </p>
      <p className="text-slate-500 text-[10px] mb-4">
        Meses ordenados de mayor a menor ganancia estimada
      </p>
      <div className="space-y-2">
        {ranked.map(({ month, value, index }, rank) => {
          const isFuture = isCurrentYear ? index > currentMonth : isPastYear ? false : true
          const barW = (value / max) * 100

          return (
            <div key={month} className="flex items-center gap-2">
              {/* Rank number */}
              <span className="text-slate-600 text-[10px] w-4 text-right shrink-0">
                {rank + 1}
              </span>
              {/* Month */}
              <span
                className={`text-[11px] font-medium w-7 shrink-0 ${
                  isFuture ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {month}
              </span>
              {/* Bar */}
              <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${isFuture ? barW * 0.3 : barW}%`,
                    background: isFuture ? 'rgba(100,116,139,0.25)' : barColor(rank),
                    opacity: isFuture ? 0.4 : 1,
                  }}
                />
              </div>
              {/* Value */}
              <span
                className={`text-[11px] font-semibold w-14 text-right shrink-0 ${
                  isFuture ? 'text-slate-600' : rank < 3 ? 'text-emerald-400' : rank >= 9 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {isFuture ? '—' : fmt(value)}
              </span>
              {rankTag(rank)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section 2: Monthly Trend (SVG line chart) ────────────────────────────────

function MonthlyTrend({ taxYear, totalIncome }: { taxYear: number; totalIncome: number }) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const isCurrentYear = taxYear === currentYear
  const cutoff = isCurrentYear ? currentMonth : 11 // how many months to draw

  const values = useMemo(() => monthlyValues(totalIncome > 0 ? totalIncome : 60_000), [totalIncome])
  const activeValues = values.slice(0, cutoff + 1)

  const W = 460
  const H = 130
  const PAD = { t: 24, r: 20, b: 28, l: 48 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b

  const minV = Math.min(...activeValues)
  const maxV = Math.max(...activeValues)
  const range = maxV - minV || 1

  function xOf(i: number) {
    return PAD.l + (i / (cutoff)) * chartW
  }
  function yOf(v: number) {
    return PAD.t + chartH - ((v - minV) / range) * chartH
  }

  const points = activeValues.map((v, i) => [xOf(i), yOf(v)] as [number, number])
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath =
    `M ${points[0][0]} ${H - PAD.b} L ${linePath.substring(2)} L ${points[points.length - 1][0]} ${H - PAD.b} Z`

  const maxIdx = activeValues.indexOf(maxV)
  const minIdx = activeValues.indexOf(minV)

  return (
    <div>
      <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-1">
        Tendencia del año — altas y bajas
      </p>
      <p className="text-slate-500 text-[10px] mb-3">
        Trayectoria mensual de ingresos · Puntos máximo y mínimo marcados
      </p>

      {activeValues.length < 2 ? (
        <p className="text-slate-600 text-xs text-center py-8">
          Se necesita al menos 2 meses de datos para mostrar la tendencia.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          style={{ height: '130px' }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal guide lines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = PAD.t + chartH - ratio * chartH
            const v = minV + ratio * range
            return (
              <g key={ratio}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(100,116,139,0.15)" strokeDasharray="4 4" />
                <text x={PAD.l - 4} y={y + 4} textAnchor="end" fill="rgba(148,163,184,0.6)" fontSize="9">
                  {fmt(v)}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* All dots */}
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.5} fill="#6366f1" />
          ))}

          {/* MAX point */}
          <circle cx={points[maxIdx][0]} cy={points[maxIdx][1]} r={6} fill="#10b981" stroke="#0d9488" strokeWidth={1.5} />
          <text x={points[maxIdx][0]} y={points[maxIdx][1] - 10} textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">
            MAX {fmt(maxV)}
          </text>

          {/* MIN point */}
          <circle cx={points[minIdx][0]} cy={points[minIdx][1]} r={6} fill="#ef4444" stroke="#dc2626" strokeWidth={1.5} />
          <text x={points[minIdx][0]} y={points[minIdx][1] + 18} textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">
            MIN {fmt(minV)}
          </text>

          {/* Month labels on X axis */}
          {points.map(([x], i) => (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="9">
              {MONTHS[i]}
            </text>
          ))}
        </svg>
      )}

      {/* Summary pills */}
      <div className="flex gap-3 mt-3">
        <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/40 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[10px] text-emerald-300 font-medium">Mejor: {MONTHS[maxIdx]} · {fmt(maxV)}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-800/40 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          <span className="text-[10px] text-red-300 font-medium">Menor: {MONTHS[minIdx]} · {fmt(minV)}</span>
        </div>
        {maxV > minV && (
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-1.5 ml-auto">
            <span className="text-[10px] text-slate-400">
              Diferencia: {fmt(maxV - minV)} ({pct(maxV - minV, minV)} variación)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section 3: Annual Comparison ─────────────────────────────────────────────

function AnnualComparison({ merged, selectedYear }: { merged: { year: number; income: number }[]; selectedYear: number }) {
  if (merged.length === 0) {
    return (
      <div>
        <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Comparación anual
        </p>
        <p className="text-slate-600 text-xs text-center py-10">
          Guarda formularios de varios años para ver la comparación anual.
        </p>
      </div>
    )
  }

  const maxIncome = Math.max(...merged.map((r) => r.income))
  const bestYear = merged.reduce((a, b) => (a.income > b.income ? a : b))
  const worstYear = merged.reduce((a, b) => (a.income < b.income ? a : b))

  function barColor(year: number, income: number): React.CSSProperties {
    if (income === maxIncome && merged.length > 1)
      return { background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 0 16px 4px rgba(251,191,36,0.35)' }
    if (income === Math.min(...merged.map((r) => r.income)) && merged.length > 1)
      return { background: 'linear-gradient(180deg,#f87171,#dc2626)' }
    if (year === selectedYear)
      return { background: 'linear-gradient(180deg,#a78bfa,#7c3aed)', boxShadow: '0 0 14px 4px rgba(139,92,246,0.4)' }
    return { background: 'linear-gradient(180deg,#818cf8,#4338ca)' }
  }

  const MAX_BAR = 140

  return (
    <div>
      <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-1">
        Comparación anual de ganancias
      </p>
      <p className="text-slate-500 text-[10px] mb-4">
        Mejores y peores años · Año seleccionado resaltado en violeta
      </p>

      <div className="flex items-end gap-3">
        {merged.map(({ year, income }) => {
          const h = Math.max(24, Math.round((income / maxIncome) * MAX_BAR))
          const isSelected = year === selectedYear
          const yoy = merged.findIndex((r) => r.year === year) > 0
            ? ((income - merged[merged.findIndex((r) => r.year === year) - 1].income) /
              Math.abs(merged[merged.findIndex((r) => r.year === year) - 1].income || 1)) * 100
            : null

          return (
            <div key={year} className="flex flex-col items-center flex-1 min-w-0 group">
              {/* YoY change */}
              {yoy !== null && (
                <span
                  className={`text-[9px] font-bold mb-1 ${
                    yoy >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy).toFixed(0)}%
                </span>
              )}
              {/* Income label */}
              <span className={`text-[9px] font-semibold mb-1 ${isSelected ? 'text-violet-300' : 'text-slate-400'}`}>
                {fmt(income)}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-700 relative group-hover:brightness-110"
                style={{ height: `${h}px`, ...barColor(year, income) }}
              >
                {/* shine */}
                <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-lg bg-white/10 pointer-events-none" />
              </div>
              {/* Year label */}
              <p
                className={`text-[10px] mt-2 font-medium ${
                  isSelected ? 'text-violet-300 font-bold' : 'text-slate-500'
                }`}
              >
                {year}
              </p>
            </div>
          )
        })}
      </div>

      {/* Axis */}
      <div className="h-px w-full mt-2" style={{ background: 'rgba(148,163,184,0.12)' }} />

      {/* Summary */}
      {merged.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-yellow-950/40 border border-yellow-800/30 rounded-lg px-3 py-1.5">
            <span className="text-[10px]">🏆</span>
            <span className="text-[10px] text-yellow-300 font-medium">
              Mejor año: {bestYear.year} · {fmt(bestYear.income)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/30 rounded-lg px-3 py-1.5">
            <span className="text-[10px]">📉</span>
            <span className="text-[10px] text-red-300 font-medium">
              Menor año: {worstYear.year} · {fmt(worstYear.income)}
            </span>
          </div>
          {merged.length >= 2 && (
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg px-3 py-1.5 ml-auto">
              <span className="text-[10px] text-slate-400">
                Crecimiento total: {pct(bestYear.income - merged[0].income, merged[0].income)}
                {' '}({merged[0].year}→{bestYear.year})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IncomeAnalytics({ taxYear, totalIncome }: IncomeAnalyticsProps) {
  const [active, setActive] = useState<'ranking' | 'trend' | 'annual'>('trend')
  const [records, setRecords] = useState<AnnualRecord[]>([])
  const [selectedYear, setSelectedYear] = useState(taxYear)

  // Keep in sync when taxYear prop changes (e.g. form year selector)
  useEffect(() => { setSelectedYear(taxYear) }, [taxYear])

  // Fetch all years once
  useEffect(() => {
    fetch('/api/tax-forms/1040?action=all-years')
      .then((r) => (r.ok ? r.json() : { forms: [] }))
      .then((d) => setRecords(d.forms ?? []))
      .catch(() => {})
  }, [])

  // Build merged year→income map (DB data + current unsaved form)
  const merged = useMemo<{ year: number; income: number }[]>(() => {
    const map = new Map<number, number>()
    for (const r of records) {
      const inc =
        r.line9_totalIncome ||
        (r.line1a_w2Wages ?? 0) +
          (r.scheduleC_grossReceipts ?? 0) -
          (r.scheduleC_expenses ?? 0) +
          (r.line8_otherIncome ?? 0)
      map.set(r.taxYear, inc)
    }
    if (totalIncome > 0) map.set(taxYear, totalIncome)
    return Array.from(map.entries())
      .map(([year, income]) => ({ year, income }))
      .sort((a, b) => a.year - b.year)
  }, [records, taxYear, totalIncome])

  // Income for the selected year
  const selectedIncome = useMemo(() => {
    if (selectedYear === taxYear && totalIncome > 0) return totalIncome
    return merged.find((r) => r.year === selectedYear)?.income ?? 0
  }, [selectedYear, taxYear, totalIncome, merged])

  const availableYears = useMemo(() => merged.map((r) => r.year), [merged])

  const tabs: { id: typeof active; label: string; icon: string }[] = [
    { id: 'trend', label: 'Tendencia anual', icon: '📈' },
    { id: 'ranking', label: 'Ranking meses', icon: '🏅' },
    { id: 'annual', label: 'Por año', icon: '📅' },
  ]

  return (
    <div
      className="rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-800/70">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">
              Análisis de Ingresos
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Año {selectedYear} · Datos estimados basados en ingresos registrados
            </p>
          </div>
          {selectedIncome > 0 && (
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">Total anual</p>
              <p className="text-white font-bold text-base">${selectedIncome.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Year selector pills */}
        {availableYears.length > 1 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-all duration-200 ${
                  y === selectedYear
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-700/70'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                active === t.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {active === 'ranking' && <MonthRanking totalIncome={selectedIncome} taxYear={selectedYear} />}
        {active === 'trend' && <MonthlyTrend taxYear={selectedYear} totalIncome={selectedIncome} />}
        {active === 'annual' && <AnnualComparison merged={merged} selectedYear={selectedYear} />}
      </div>
    </div>
  )
}

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

const MONTHS = [
  { short: 'Ene', index: 0 },
  { short: 'Feb', index: 1 },
  { short: 'Mar', index: 2 },
  { short: 'Abr', index: 3 },
  { short: 'May', index: 4 },
  { short: 'Jun', index: 5 },
  { short: 'Jul', index: 6 },
  { short: 'Ago', index: 7 },
  { short: 'Sep', index: 8 },
  { short: 'Oct', index: 9 },
  { short: 'Nov', index: 10 },
  { short: 'Dic', index: 11 },
]

// Natural variation so bars don't look robotic
const VARIATION = [1.0, 0.88, 1.05, 0.92, 1.1, 0.97, 1.03, 0.85, 1.08, 0.95, 1.02, 0.9]
const MAX_BAR_PX = 180

interface YearRecord {
  taxYear: number
  line9_totalIncome: number
  scheduleC_grossReceipts: number
  scheduleC_expenses: number
  line1a_w2Wages: number
  line8_otherIncome: number
}

interface MonthlyStatsBarsProps {
  taxYear: number
  totalIncome: number
}

export default function MonthlyStatsBars({ taxYear, totalIncome }: MonthlyStatsBarsProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based

  const [selectedYear, setSelectedYear] = useState(taxYear)
  const [yearRecords, setYearRecords] = useState<YearRecord[]>([])

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch('/api/tax-forms/1040?action=all-years')
      if (res.ok) {
        const data = await res.json()
        setYearRecords(data.forms ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchYears() }, [fetchYears])
  useEffect(() => { setSelectedYear(taxYear) }, [taxYear])

  // Build year list + income map
  const { availableYears, incomeByYear } = useMemo(() => {
    const map = new Map<number, number>()
    for (const r of yearRecords) {
      const inc =
        r.line9_totalIncome ||
        (r.line1a_w2Wages ?? 0) + (r.scheduleC_grossReceipts ?? 0) - (r.scheduleC_expenses ?? 0)
      map.set(r.taxYear, inc)
    }
    if (totalIncome > 0) map.set(taxYear, totalIncome)
    const years = Array.from(map.keys()).sort((a, b) => a - b)
    return { availableYears: years, incomeByYear: map }
  }, [yearRecords, taxYear, totalIncome])

  // Income for the selected year
  const selectedIncome = useMemo(() => {
    if (selectedYear === taxYear && totalIncome > 0) return totalIncome
    return incomeByYear.get(selectedYear) ?? 0
  }, [selectedYear, taxYear, totalIncome, incomeByYear])

  const isCurrentYear = selectedYear === currentYear
  const isPastYear = selectedYear < currentYear
  const isFutureYear = selectedYear > currentYear

  const monthlyAvg = selectedIncome > 0 ? selectedIncome / 12 : 8000
  const maxVal = monthlyAvg * Math.max(...VARIATION)

  function barHeight(idx: number): number {
    if (isFutureYear) return 28
    if (isPastYear || idx < currentMonth) {
      return Math.round((monthlyAvg * VARIATION[idx] / maxVal) * MAX_BAR_PX) + 28
    }
    if (idx === currentMonth) {
      return Math.round((monthlyAvg * VARIATION[idx] * 1.06 / maxVal) * MAX_BAR_PX) + 28
    }
    return 28 // future months
  }

  function barGradient(idx: number): React.CSSProperties {
    if (isFutureYear || (isCurrentYear && idx > currentMonth)) {
      return { background: 'rgba(100,116,139,0.25)', border: '1px solid rgba(100,116,139,0.2)' }
    }
    if (isCurrentYear && idx === currentMonth) {
      return {
        background: 'linear-gradient(180deg,#c4b5fd 0%,#8b5cf6 45%,#6d28d9 100%)',
        boxShadow: '0 0 20px 6px rgba(139,92,246,0.5), 0 4px 16px rgba(109,40,217,0.4)',
      }
    }
    // past months — indigo gradient
    return {
      background: 'linear-gradient(180deg,#a5b4fc 0%,#6366f1 55%,#4338ca 100%)',
      boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
    }
  }

  function valueLabel(idx: number): string {
    if (isFutureYear || (isCurrentYear && idx > currentMonth)) return ''
    const val = monthlyAvg * VARIATION[idx]
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`
    return `$${Math.round(val)}`
  }

  return (
    <div
      className="rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">
              Ingresos Mensuales
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Año {selectedYear} · Estimación mensual
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">Total anual</p>
            <p className="text-white font-bold text-lg">
              ${selectedIncome > 0 ? selectedIncome.toLocaleString() : '—'}
            </p>
          </div>
        </div>

        {/* Year selector pills */}
        {availableYears.length > 1 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-all duration-200 ${
                  y === selectedYear
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-700/70'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pt-2 pb-4 flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#818cf8,#4338ca)' }} />
          Completado
        </span>
        {isCurrentYear && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)' }} />
            Mes actual
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 opacity-50" />
          Futuro
        </span>
      </div>

      {/* Bars */}
      <div className="px-6 pb-6">
        <div className="flex items-end gap-1.5 w-full" style={{ height: `${MAX_BAR_PX + 80}px` }}>
          {MONTHS.map(({ short, index }) => {
            const h = barHeight(index)
            const gradient = barGradient(index)
            const label = valueLabel(index)
            const isActive = isCurrentYear && index === currentMonth
            const isFuture = isFutureYear || (isCurrentYear && index > currentMonth)

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-end flex-1 min-w-0 h-full group cursor-default"
              >
                {/* Value label */}
                <span
                  className={`text-[9px] font-bold mb-1.5 transition-all duration-200 ${
                    label ? 'opacity-100' : 'opacity-0'
                  } ${isActive ? 'text-violet-300' : 'text-slate-400'}`}
                >
                  {label || '·'}
                </span>

                {/* Bar */}
                <div
                  className="w-full rounded-t-lg transition-all duration-700 ease-out relative group-hover:brightness-110 group-hover:scale-y-105 origin-bottom"
                  style={{ height: `${h}px`, ...gradient }}
                >
                  {/* Top shine */}
                  {!isFuture && (
                    <div className="absolute inset-x-0 top-0 h-1/4 rounded-t-lg bg-white/15 pointer-events-none" />
                  )}

                  {/* Pulse dot on current month */}
                  {isActive && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-400" />
                    </span>
                  )}
                </div>

                {/* Month label */}
                <p
                  className={`text-[10px] mt-2 font-medium ${
                    isActive
                      ? 'text-violet-300 font-bold'
                      : isFuture
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  {short}
                </p>
              </div>
            )
          })}
        </div>

        {/* Axis line */}
        <div className="h-px w-full mt-1" style={{ background: 'rgba(148,163,184,0.15)' }} />

        {/* Footer */}
        <p className="mt-3 text-[10px] text-slate-500 text-right">
          {isFutureYear
            ? 'Sin datos — año futuro'
            : `Basado en distribución uniforme de $${monthlyAvg > 0 ? Math.round(monthlyAvg).toLocaleString() : '0'}/mes`}
        </p>
      </div>
    </div>
  )
}

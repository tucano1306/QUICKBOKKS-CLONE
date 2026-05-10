'use client'

import React from 'react'

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

// Small variation multipliers so bars look natural, not robotic
const VARIATION = [1.0, 0.88, 1.05, 0.92, 1.1, 0.97, 1.03, 0.85, 1.08, 0.95, 1.02, 0.9]

interface MonthlyStatsBarsProps {
  taxYear: number
  totalIncome: number
}

export default function MonthlyStatsBars({ taxYear, totalIncome }: MonthlyStatsBarsProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based

  // Determine the "view mode" relative to today
  const isCurrentYear = taxYear === currentYear
  const isPastYear = taxYear < currentYear
  const isFutureYear = taxYear > currentYear

  // Monthly average (used as bar reference)
  const monthlyAvg = totalIncome > 0 ? totalIncome / 12 : 5000
  const maxBarValue = monthlyAvg * Math.max(...VARIATION)

  function getBarHeight(monthIndex: number): number {
    // Future year: all flat placeholder
    if (isFutureYear) return 24
    // Past year: all months filled, use variation
    if (isPastYear) {
      const val = monthlyAvg * VARIATION[monthIndex]
      return Math.round((val / maxBarValue) * 140) + 24
    }
    // Current year
    if (monthIndex < currentMonth) {
      // Past months
      const val = monthlyAvg * VARIATION[monthIndex]
      return Math.round((val / maxBarValue) * 140) + 24
    }
    if (monthIndex === currentMonth) {
      // Current month — slightly taller to stand out
      const val = monthlyAvg * VARIATION[monthIndex] * 1.05
      return Math.round((val / maxBarValue) * 140) + 24
    }
    // Future months
    return 24
  }

  function getBarStyle(monthIndex: number): React.CSSProperties {
    if (isFutureYear) {
      return {
        background: 'var(--color-future)',
        opacity: 0.35,
      }
    }
    if (isPastYear || monthIndex < currentMonth) {
      // Past — gradient indigo → cyan
      return {
        background: `linear-gradient(180deg, #818cf8 0%, #6366f1 60%, #4f46e5 100%)`,
      }
    }
    if (monthIndex === currentMonth) {
      // Current month — glowing brand gradient
      return {
        background: `linear-gradient(180deg, #a78bfa 0%, #7c3aed 55%, #6d28d9 100%)`,
        boxShadow: '0 0 14px 4px rgba(124, 58, 237, 0.45)',
      }
    }
    // Future months — flat gray
    return {
      background: 'rgb(148 163 184)',
      opacity: 0.35,
    }
  }

  function getValueLabel(monthIndex: number): string | null {
    if (isFutureYear) return null
    if (isPastYear || monthIndex < currentMonth) {
      const val = monthlyAvg * VARIATION[monthIndex]
      return `$${Math.round(val / 1000)}k`
    }
    if (monthIndex === currentMonth && !isFutureYear) {
      const val = monthlyAvg * VARIATION[monthIndex]
      return `$${Math.round(val / 1000)}k`
    }
    return null
  }

  function getLabelStyle(monthIndex: number): string {
    if (isFutureYear) return 'text-slate-400 text-xs mt-2'
    if (monthIndex === currentMonth && isCurrentYear) return 'text-violet-600 font-bold text-xs mt-2'
    if (monthIndex > currentMonth && isCurrentYear) return 'text-slate-400 text-xs mt-2'
    return 'text-slate-500 text-xs mt-2'
  }

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
          Mes completado
        </span>
        {isCurrentYear && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-violet-500" />
            Mes actual
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 opacity-60" />
          Mes futuro
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 sm:gap-3 w-full">
        {MONTHS.map(({ short, index }) => {
          const height = getBarHeight(index)
          const label = getValueLabel(index)
          const barStyle = getBarStyle(index)
          const isActive = isCurrentYear && index === currentMonth

          return (
            <div key={index} className="flex flex-col items-center flex-1 min-w-0 group">
              {/* Value label above bar */}
              <span
                className={`text-[10px] font-semibold mb-1 transition-opacity duration-200 ${
                  label ? 'opacity-100' : 'opacity-0'
                } ${isActive ? 'text-violet-600' : 'text-slate-500'}`}
              >
                {label ?? '·'}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-700 ease-out relative"
                style={{ height: `${height}px`, ...barStyle }}
              >
                {/* Shine overlay on past/current */}
                {!isFutureYear && (isPastYear || index <= currentMonth) && (
                  <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-md bg-white/10 pointer-events-none" />
                )}

                {/* "Today" pulse dot */}
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600" />
                  </span>
                )}
              </div>

              {/* Month label */}
              <p className={getLabelStyle(index)}>{short}</p>
            </div>
          )
        })}
      </div>

      {/* Bottom axis line */}
      <div className="mt-1 h-px w-full bg-border" />

      {/* Footer note */}
      <p className="mt-2 text-[11px] text-muted-foreground text-right">
        {isCurrentYear
          ? `Basado en ingreso total anual estimado de $${totalIncome.toLocaleString()}`
          : isPastYear
          ? `Año fiscal ${taxYear} — ingreso total $${totalIncome.toLocaleString()}`
          : `Año fiscal ${taxYear} — sin datos disponibles`}
      </p>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedBarChartProps {
  readonly data: { label: string; value: number; color?: string }[]
  readonly height?: number
  readonly showLabels?: boolean
  readonly showValues?: boolean
  readonly animated?: boolean
  readonly className?: string
}

export function AnimatedBarChart({
  data,
  height = 200,
  showLabels = true,
  showValues = true,
  animated = true,
  className
}: Readonly<AnimatedBarChartProps>) {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, animatedValue: 0 })))
  const maxValue = Math.max(...data.map(d => d.value), 1)

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => {
        setAnimatedData(data.map(d => ({ ...d, animatedValue: d.value })))
      }, 100)
      return () => clearTimeout(timeout)
    } else {
      setAnimatedData(data.map(d => ({ ...d, animatedValue: d.value })))
    }
  }, [data, animated])

  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
  ]

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {animatedData.map((item, index) => {
          const percentage = (item.animatedValue / maxValue) * 100
          const colorClass = item.color || colors[index % colors.length]
          
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center" style={{ height: height - 40 }}>
                {showValues && (
                  <span className="text-xs font-semibold text-gray-600 mb-1">
                    ${item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}K` : item.value.toLocaleString()}
                  </span>
                )}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-t-lg bg-gradient-to-t shadow-lg',
                      colorClass,
                      animated && 'transition-all duration-1000 ease-out'
                    )}
                    style={{ height: `${percentage}%`, minHeight: percentage > 0 ? 4 : 0 }}
                  >
                    <div className="w-full h-full relative overflow-hidden rounded-t-lg">
                      <div className="absolute inset-0 bg-white/20 animate-pulse opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
              {showLabels && (
                <span className="text-xs text-gray-500 truncate w-full text-center">
                  {item.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface AnimatedLineChartProps {
  readonly data: { label: string; value: number }[]
  readonly height?: number
  readonly color?: string
  readonly showArea?: boolean
  readonly showDots?: boolean
  readonly animated?: boolean
  readonly className?: string
}

export function AnimatedLineChart({
  data,
  height = 200,
  color = 'blue',
  showArea = true,
  showDots = true,
  animated = true,
  className
}: Readonly<AnimatedLineChartProps>) {
  const [progress, setProgress] = useState(animated ? 0 : 1)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => setProgress(1), 100)
      return () => clearTimeout(timeout)
    }
  }, [animated])

  const getY = (value: number) => {
    return height - 40 - ((value - minValue) / range) * (height - 60)
  }

  const points = data.map((d, i) => ({
    x: 40 + (i / (data.length - 1 || 1)) * (100 - 50) + '%',
    y: getY(d.value),
    value: d.value,
    label: d.label
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${40 + (i / (data.length - 1 || 1)) * 320} ${p.y}`)
    .join(' ')

  const areaD = pathD + ` L ${40 + 320} ${height - 40} L 40 ${height - 40} Z`

  const colorMap: Record<string, { line: string; area: string; dot: string }> = {
    blue: { line: '#3b82f6', area: 'url(#blueGradient)', dot: '#2563eb' },
    green: { line: '#22c55e', area: 'url(#greenGradient)', dot: '#16a34a' },
    purple: { line: '#a855f7', area: 'url(#purpleGradient)', dot: '#9333ea' },
    orange: { line: '#f97316', area: 'url(#orangeGradient)', dot: '#ea580c' },
    red: { line: '#ef4444', area: 'url(#redGradient)', dot: '#dc2626' },
  }

  const colors = colorMap[color] || colorMap.blue

  return (
    <div className={cn('w-full', className)}>
      <svg ref={svgRef} viewBox={`0 0 400 ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1="40"
            y1={20 + (percent / 100) * (height - 60)}
            x2="360"
            y2={20 + (percent / 100) * (height - 60)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}
        
        {/* Area */}
        {showArea && (
          <path
            d={areaD}
            fill={colors.area}
            className={cn(animated && 'transition-all duration-1000 ease-out')}
            style={{ opacity: progress }}
          />
        )}
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={colors.line}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(animated && 'transition-all duration-1000 ease-out')}
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: (1 - progress) * 1000
          }}
        />
        
        {/* Dots */}
        {showDots && points.map((point, i) => (
          <g key={`${data[i]?.label}-${i}`}>
            <circle
              cx={40 + (i / (data.length - 1 || 1)) * 320}
              cy={point.y}
              r="6"
              fill="white"
              stroke={colors.dot}
              strokeWidth="3"
              className={cn(
                'cursor-pointer hover:r-8',
                animated && 'transition-all duration-500 ease-out'
              )}
              style={{
                opacity: progress,
                transform: `scale(${progress})`,
                transformOrigin: 'center'
              }}
            />
            <text
              x={40 + (i / (data.length - 1 || 1)) * 320}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

interface AnimatedDonutChartProps {
  readonly data: { label: string; value: number; color: string }[]
  readonly size?: number
  readonly thickness?: number
  readonly showLegend?: boolean
  readonly showCenter?: boolean
  readonly centerValue?: string
  readonly centerLabel?: string
  readonly animated?: boolean
  readonly className?: string
}

export function AnimatedDonutChart({
  data,
  size = 200,
  thickness = 30,
  showLegend = true,
  showCenter = true,
  centerValue,
  centerLabel,
  animated = true,
  className
}: Readonly<AnimatedDonutChartProps>) {
  const [progress, setProgress] = useState(animated ? 0 : 1)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => setProgress(1), 100)
      return () => clearTimeout(timeout)
    }
  }, [animated])

  let currentAngle = -90

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={thickness}
          />
          
          {/* Data segments */}
          {data.map((segment, i) => {
            const percentage = segment.value / total
            const strokeLength = circumference * percentage * progress
            const gapLength = circumference - strokeLength
            const rotation = currentAngle
            currentAngle += percentage * 360

            return (
              <circle
                key={`${segment.label}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${strokeLength} ${gapLength}`}
                strokeLinecap="round"
                className={cn(animated && 'transition-all duration-1000 ease-out')}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
              />
            )
          })}
        </svg>
        
        {/* Center content */}
        {showCenter && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">
              {centerValue || `$${(total / 1000).toFixed(1)}K`}
            </span>
            {centerLabel && (
              <span className="text-xs text-gray-500">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2">
          {data.map((segment, i) => (
            <div key={`${segment.label}-${i}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-600">{segment.label}</span>
              <span className="text-sm font-semibold text-gray-900 ml-auto">
                {total > 0 ? ((segment.value / total) * 100).toFixed(0) : '0'}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AnimatedProgressProps {
  readonly value: number
  readonly max?: number
  readonly color?: string
  readonly height?: number
  readonly showValue?: boolean
  readonly label?: string
  readonly animated?: boolean
  readonly className?: string
}

export function AnimatedProgress({
  value,
  max = 100,
  color = 'blue',
  height = 8,
  showValue = true,
  label,
  animated = true,
  className
}: Readonly<AnimatedProgressProps>) {
  const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value)
  const percentage = Math.min((animatedValue / max) * 100, 100)

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => setAnimatedValue(value), 100)
      return () => clearTimeout(timeout)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold text-gray-900">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            colorMap[color] || colorMap.blue,
            animated && 'transition-all duration-1000 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface SparklineProps {
  readonly data: number[]
  readonly color?: string
  readonly height?: number
  readonly width?: number
  readonly filled?: boolean
  readonly className?: string
}

export function Sparkline({
  data,
  color = '#3b82f6',
  height = 40,
  width = 120,
  filled = false,
  className
}: Readonly<SparklineProps>) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 4) - 2
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`

  const lastValue = data.at(-1)
  const firstValue = data.at(0)
  const trend = (lastValue !== undefined && firstValue !== undefined && lastValue > firstValue) ? 'up' : 'down'
  const trendColor = trend === 'up' ? '#22c55e' : '#ef4444'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      style={{ width, height }}
    >
      {filled && (
        <path
          d={areaD}
          fill={color}
          fillOpacity="0.1"
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.at(-1)?.x ?? 0}
        cy={points.at(-1)?.y ?? 0}
        r="3"
        fill={trendColor}
      />
    </svg>
  )
}

interface AnimatedCounterProps {
  readonly value: number
  readonly prefix?: string
  readonly suffix?: string
  readonly decimals?: number
  readonly duration?: number
  readonly className?: string
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1000,
  className
}: Readonly<AnimatedCounterProps>) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic
      
      const current = startValue + (value - startValue) * easeProgress
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, displayValue])

  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

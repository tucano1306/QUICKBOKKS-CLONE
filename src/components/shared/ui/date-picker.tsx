'use client'

import * as React from 'react'
import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: string | Date
  onChange?: any // Function type - using any to avoid Next.js serialization false positive
  placeholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
  minDate?: Date
  maxDate?: Date
  format?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  className,
  clearable = true,
  minDate,
  maxDate,
  format: dateFormat = 'yyyy-MM-dd',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Convertir el value a Date si es string
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    const parsed = parse(value, dateFormat, new Date())
    return isValid(parsed) ? parsed : undefined
  }, [value, dateFormat])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(format(date, dateFormat))
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal group',
            'hover:bg-primary/5 hover:border-primary/50 transition-all duration-200',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary',
            !dateValue && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
          {dateValue ? (
            <span className="flex-1">
              {format(dateValue, 'PPP', { locale: es })}
            </span>
          ) : (
            <span className="flex-1 text-gray-400">{placeholder}</span>
          )}
          {clearable && dateValue && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-xl border-0 rounded-xl overflow-hidden" 
        align="start"
        sideOffset={8}
      >
        <div className="bg-gradient-to-b from-primary/5 to-transparent p-2">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
            className="rounded-lg"
          />
        </div>
        
        {/* Quick actions */}
        <div className="border-t bg-gray-50 dark:bg-gray-900 p-2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs hover:bg-primary/10 hover:text-primary"
            onClick={() => handleSelect(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              handleSelect(yesterday)
            }}
          >
            Ayer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              const tomorrow = new Date()
              tomorrow.setDate(tomorrow.getDate() + 1)
              handleSelect(tomorrow)
            }}
          >
            Mañana
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onStartDateChange?: any // Function type - using any to avoid Next.js serialization false positive
  onEndDateChange?: any // Function type - using any to avoid Next.js serialization false positive
  onRangeChange?: any // Function type - using any to avoid Next.js serialization false positive
  placeholder?: string
  disabled?: boolean
  className?: string
  showPresets?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  placeholder = 'Seleccionar rango',
  disabled = false,
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const startDateValue = React.useMemo(() => {
    if (!startDate) return undefined
    const parsed = parse(startDate, 'yyyy-MM-dd', new Date())
    return isValid(parsed) ? parsed : undefined
  }, [startDate])

  const endDateValue = React.useMemo(() => {
    if (!endDate) return undefined
    const parsed = parse(endDate, 'yyyy-MM-dd', new Date())
    return isValid(parsed) ? parsed : undefined
  }, [endDate])

  const handleStartSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd')
      onStartDateChange?.(formatted)
      if (endDate) {
        onRangeChange?.(formatted, endDate)
      }
    }
  }

  const handleEndSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd')
      onEndDateChange?.(formatted)
      if (startDate) {
        onRangeChange?.(startDate, formatted)
      }
    }
  }

  const formatDisplayDate = () => {
    if (startDateValue && endDateValue) {
      return `${format(startDateValue, 'dd MMM', { locale: es })} - ${format(endDateValue, 'dd MMM yyyy', { locale: es })}`
    }
    if (startDateValue) {
      return `Desde ${format(startDateValue, 'dd MMM yyyy', { locale: es })}`
    }
    if (endDateValue) {
      return `Hasta ${format(endDateValue, 'dd MMM yyyy', { locale: es })}`
    }
    return placeholder
  }

  const presets = [
    {
      label: 'Hoy',
      getValue: () => {
        const today = new Date()
        return { start: today, end: today }
      }
    },
    {
      label: 'Esta semana',
      getValue: () => {
        const today = new Date()
        const start = new Date(today)
        start.setDate(today.getDate() - today.getDay())
        return { start, end: today }
      }
    },
    {
      label: 'Este mes',
      getValue: () => {
        const today = new Date()
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return { start, end }
      }
    },
    {
      label: 'Último mes',
      getValue: () => {
        const today = new Date()
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const end = new Date(today.getFullYear(), today.getMonth(), 0)
        return { start, end }
      }
    },
    {
      label: 'Este trimestre',
      getValue: () => {
        const today = new Date()
        const quarter = Math.floor(today.getMonth() / 3)
        const start = new Date(today.getFullYear(), quarter * 3, 1)
        const end = new Date(today.getFullYear(), quarter * 3 + 3, 0)
        return { start, end }
      }
    },
    {
      label: 'Este año',
      getValue: () => {
        const today = new Date()
        const start = new Date(today.getFullYear(), 0, 1)
        const end = new Date(today.getFullYear(), 11, 31)
        return { start, end }
      }
    },
    {
      label: 'Últimos 30 días',
      getValue: () => {
        const today = new Date()
        const start = new Date()
        start.setDate(today.getDate() - 30)
        return { start, end: today }
      }
    },
    {
      label: 'Últimos 90 días',
      getValue: () => {
        const today = new Date()
        const start = new Date()
        start.setDate(today.getDate() - 90)
        return { start, end: today }
      }
    },
  ]

  const handlePresetSelect = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue()
    const startFormatted = format(start, 'yyyy-MM-dd')
    const endFormatted = format(end, 'yyyy-MM-dd')
    onStartDateChange?.(startFormatted)
    onEndDateChange?.(endFormatted)
    onRangeChange?.(startFormatted, endFormatted)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStartDateChange?.('')
    onEndDateChange?.('')
    onRangeChange?.('', '')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal group',
            'hover:bg-primary/5 hover:border-primary/50 transition-all duration-200',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary',
            !(startDateValue || endDateValue) && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
          <span className="flex-1">{formatDisplayDate()}</span>
          {(startDateValue || endDateValue) && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-xl border-0 rounded-xl overflow-hidden" 
        align="start"
        sideOffset={8}
      >
        <div className="flex">
          {/* Presets sidebar */}
          {showPresets && (
            <div className="border-r bg-gray-50 dark:bg-gray-900 p-2 space-y-1 min-w-[140px]">
              <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                Rangos rápidos
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-primary/10 hover:text-primary"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          
          {/* Calendars */}
          <div className="p-2">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 text-center mb-2">
                  Fecha inicio
                </p>
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={handleStartSelect}
                  disabled={(date) => endDateValue ? date > endDateValue : false}
                  className="rounded-lg"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 text-center mb-2">
                  Fecha fin
                </p>
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={handleEndSelect}
                  disabled={(date) => startDateValue ? date < startDateValue : false}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t bg-gray-50 dark:bg-gray-900 p-3 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {startDateValue && endDateValue && (
              <>
                <span className="font-medium text-primary">
                  {Math.ceil((endDateValue.getTime() - startDateValue.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                </span> días seleccionados
              </>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={() => setOpen(false)}
            className="bg-primary hover:bg-primary/90"
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronDown, X, Clock, Sparkles } from 'lucide-react'
import { format, parse, isValid, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface DateRangeSelectorProps {
  value?: DateRange
  onSelect?: any // Function type - using any to avoid Next.js serialization false positive
  showPresets?: boolean
  className?: string
}

const createPresets = (): DateRange[] => {
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  
  return [
    {
      label: 'Hoy',
      startDate: formatDate(today),
      endDate: formatDate(today)
    },
    {
      label: 'Ayer',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))
    },
    {
      label: 'Esta Semana',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())),
      endDate: formatDate(today)
    },
    {
      label: 'Semana Pasada',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 1))
    },
    {
      label: 'Este Mes',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    },
    {
      label: 'Mes Pasado',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 0))
    },
    {
      label: 'Este Trimestre',
      startDate: formatDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)),
      endDate: formatDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0))
    },
    {
      label: 'Este Año',
      startDate: formatDate(new Date(today.getFullYear(), 0, 1)),
      endDate: formatDate(new Date(today.getFullYear(), 11, 31))
    },
    {
      label: 'Año Pasado',
      startDate: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
      endDate: formatDate(new Date(today.getFullYear() - 1, 11, 31))
    },
    {
      label: 'Últimos 7 Días',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      endDate: formatDate(today)
    },
    {
      label: 'Últimos 30 Días',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)),
      endDate: formatDate(today)
    },
    {
      label: 'Últimos 90 Días',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)),
      endDate: formatDate(today)
    }
  ]
}

export default function DateRangeSelector({ value, onSelect, showPresets = true, className }: DateRangeSelectorProps) {
  const onChange = onSelect as ((range: DateRange) => void) | undefined
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  
  const presets = useMemo(() => createPresets(), [])

  const startDateValue = useMemo(() => {
    if (!value?.startDate) return undefined
    const parsed = parse(value.startDate, 'yyyy-MM-dd', new Date())
    return isValid(parsed) ? parsed : undefined
  }, [value?.startDate])

  const endDateValue = useMemo(() => {
    if (!value?.endDate) return undefined
    const parsed = parse(value.endDate, 'yyyy-MM-dd', new Date())
    return isValid(parsed) ? parsed : undefined
  }, [value?.endDate])

  const daysCount = useMemo(() => {
    if (startDateValue && endDateValue) {
      return differenceInDays(endDateValue, startDateValue) + 1
    }
    return 0
  }, [startDateValue, endDateValue])

  const selectPreset = (preset: DateRange) => {
    onChange?.(preset)
    setIsOpen(false)
  }

  const handleStartSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd')
      onChange?.({ 
        startDate: formatted, 
        endDate: value?.endDate || formatted, 
        label: 'Personalizado' 
      })
    }
  }

  const handleEndSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd')
      onChange?.({ 
        startDate: value?.startDate || formatted, 
        endDate: formatted, 
        label: 'Personalizado' 
      })
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.({ startDate: '', endDate: '', label: '' })
  }

  const formatDisplayValue = () => {
    if (!startDateValue && !endDateValue) {
      return 'Seleccionar rango de fechas'
    }
    
    if (value?.label && value.label !== 'Personalizado') {
      return value.label
    }
    
    if (startDateValue && endDateValue) {
      const sameYear = startDateValue.getFullYear() === endDateValue.getFullYear()
      const sameMonth = sameYear && startDateValue.getMonth() === endDateValue.getMonth()
      
      if (sameMonth) {
        return `${format(startDateValue, 'd', { locale: es })} - ${format(endDateValue, 'd MMM yyyy', { locale: es })}`
      }
      if (sameYear) {
        return `${format(startDateValue, 'd MMM', { locale: es })} - ${format(endDateValue, 'd MMM yyyy', { locale: es })}`
      }
      return `${format(startDateValue, 'd MMM yyyy', { locale: es })} - ${format(endDateValue, 'd MMM yyyy', { locale: es })}`
    }
    
    if (startDateValue) {
      return `Desde ${format(startDateValue, 'd MMM yyyy', { locale: es })}`
    }
    
    return `Hasta ${format(endDateValue!, 'd MMM yyyy', { locale: es })}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between group',
            'hover:bg-primary/5 hover:border-primary/50 transition-all duration-200',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary',
            !(startDateValue || endDateValue) && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="font-medium">{formatDisplayValue()}</span>
            {daysCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {daysCount} día{daysCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(startDateValue || endDateValue) && (
              <X 
                className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" 
                onClick={handleClear}
              />
            )}
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-auto p-0 shadow-2xl border-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-950" 
        align="start"
        sideOffset={8}
      >
        {/* Tabs */}
        <div className="flex border-b bg-gray-50 dark:bg-gray-900">
          <button
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
              activeTab === 'presets' 
                ? "bg-white dark:bg-gray-950 text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setActiveTab('presets')}
          >
            <Sparkles className="w-4 h-4" />
            Rangos Rápidos
          </button>
          <button
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
              activeTab === 'custom' 
                ? "bg-white dark:bg-gray-950 text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setActiveTab('custom')}
          >
            <Clock className="w-4 h-4" />
            Personalizado
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'presets' && showPresets && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-[320px]">
              {presets.map((preset) => {
                const isSelected = value?.label === preset.label || 
                  (value?.startDate === preset.startDate && value?.endDate === preset.endDate)
                
                return (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => selectPreset(preset)}
                    className={cn(
                      "justify-start text-left h-auto py-2.5 px-3",
                      "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                      "transition-all duration-200",
                      isSelected && "bg-primary text-primary-foreground shadow-md"
                    )}
                  >
                    <span className="truncate">{preset.label}</span>
                  </Button>
                )
              })}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block text-center">
                    Fecha Inicio
                  </label>
                  <Calendar
                    mode="single"
                    selected={startDateValue}
                    onSelect={handleStartSelect}
                    disabled={(date) => endDateValue ? date > endDateValue : false}
                    className="rounded-xl border shadow-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block text-center">
                    Fecha Fin
                  </label>
                  <Calendar
                    mode="single"
                    selected={endDateValue}
                    onSelect={handleEndSelect}
                    disabled={(date) => startDateValue ? date < startDateValue : false}
                    className="rounded-xl border shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 dark:bg-gray-900 p-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {startDateValue && endDateValue && (
              <span>
                <span className="font-semibold text-primary">{daysCount}</span> día{daysCount !== 1 ? 's' : ''} seleccionado{daysCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                onChange?.({ startDate: '', endDate: '', label: '' })
              }}
            >
              Limpiar
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="bg-primary hover:bg-primary/90 shadow-md"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Export named para compatibilidad
export { DateRangeSelector }

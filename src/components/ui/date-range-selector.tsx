'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface DateRangeSelectorProps {
  value?: DateRange
  onSelect?: any // Function type - using any to avoid Next.js serialization false positive
  showPresets?: boolean
}

export default function DateRangeSelector({ value, onSelect, showPresets = true }: DateRangeSelectorProps) {
  const onChange = onSelect as ((range: DateRange) => void) | undefined
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  const presets: DateRange[] = [
    {
      label: 'Hoy',
      startDate: formatDate(today),
      endDate: formatDate(today)
    },
    {
      label: 'Esta Semana',
      startDate: formatDate(new Date(today.setDate(today.getDate() - today.getDay()))),
      endDate: formatDate(new Date())
    },
    {
      label: 'Este Mes',
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
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
      label: 'Últimos 30 Días',
      startDate: formatDate(new Date(today.setDate(today.getDate() - 30))),
      endDate: formatDate(new Date())
    },
    {
      label: 'Últimos 90 Días',
      startDate: formatDate(new Date(today.setDate(today.getDate() - 90))),
      endDate: formatDate(new Date())
    },
    {
      label: 'Año Pasado',
      startDate: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
      endDate: formatDate(new Date(today.getFullYear() - 1, 11, 31))
    }
  ]

  const selectPreset = (preset: DateRange) => {
    setSelectedPreset(preset.label)
    onChange?.(preset)
    setIsOpen(false)
  }

  const displayValue = value 
    ? `${value.startDate} → ${value.endDate}` 
    : selectedPreset || 'Seleccionar rango de fechas'

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{displayValue}</span>
        </div>
        {value && (
          <X 
            className="w-4 h-4 ml-2 hover:text-red-600" 
            onClick={(e) => {
              e.stopPropagation()
              onChange?.({ startDate: '', endDate: '', label: '' })
              setSelectedPreset('')
            }}
          />
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
          <CardContent className="p-4 space-y-4">
            {showPresets && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Rangos Predefinidos:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant={selectedPreset === preset.label ? 'default' : 'outline'}
                      onClick={() => selectPreset(preset)}
                      className="justify-start"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Rango Personalizado:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Fecha Inicio:</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={value?.startDate || ''}
                    onChange={(e) => onChange?.({ ...value as DateRange, startDate: e.target.value, label: 'Personalizado' })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Fecha Fin:</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={value?.endDate || ''}
                    onChange={(e) => onChange?.({ ...value as DateRange, endDate: e.target.value, label: 'Personalizado' })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setIsOpen(false)}>
                Aplicar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

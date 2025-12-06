'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number
  onChange: (value: string) => void
  allowNegative?: boolean
}

/**
 * MoneyInput - Input especializado para montos monetarios
 * 
 * Características:
 * - Acepta puntos y comas como separadores decimales
 * - Sin flechas de incremento/decremento
 * - Convierte automáticamente comas a puntos para procesamiento
 * - Permite entrada libre del usuario
 */
const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, allowNegative = false, placeholder = "0.00", ...props }, ref) => {
    
    // Manejar el cambio de valor
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value
      
      // Permitir vacío
      if (inputValue === '') {
        onChange('')
        return
      }
      
      // Reemplazar comas por puntos para normalizar
      inputValue = inputValue.replace(/,/g, '.')
      
      // Regex para validar formato de número
      // Permite: números, un punto decimal, y opcionalmente signo negativo al inicio
      const regex = allowNegative 
        ? /^-?\d*\.?\d*$/ 
        : /^\d*\.?\d*$/
      
      if (regex.test(inputValue)) {
        onChange(inputValue)
      }
    }
    
    // Formatear el valor para mostrar (mostrar como está)
    const displayValue = typeof value === 'number' ? value.toString() : value
    
    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm amount-input",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        {...props}
      />
    )
  }
)
MoneyInput.displayName = "MoneyInput"

export { MoneyInput }

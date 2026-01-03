'use client'

import { useCallback, useRef, useMemo, useState } from 'react'

/**
 * Debounce para funciones - evita llamadas repetitivas
 * Útil para: búsquedas, filtros, validaciones
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  
  // Actualizar referencia del callback
  callbackRef.current = callback

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )
}

/**
 * Throttle para funciones - limita la frecuencia de llamadas
 * Útil para: scroll handlers, resize, mouse move
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 100
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  
  callbackRef.current = callback

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      } else {
        // Programar para ejecutar al final del período
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callbackRef.current(...args)
        }, delay - timeSinceLastCall)
      }
    }) as T,
    [delay]
  )
}

/**
 * Hook para paginación con datos locales
 * Evita re-fetch para paginación cliente
 */
export function useLocalPagination<T>(
  items: T[],
  pageSize: number = 25
) {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const getPage = useCallback((page: number) => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return items.slice(start, end)
  }, [items, pageSize])

  return {
    totalItems,
    totalPages,
    pageSize,
    getPage
  }
}

/**
 * Hook para filtrado eficiente con memoización
 */
export function useFilteredData<T>(
  data: T[],
  filters: Record<string, unknown>,
  filterFn: (item: T, filters: Record<string, unknown>) => boolean
): T[] {
  return useMemo(() => {
    if (!data.length) return []
    return data.filter(item => filterFn(item, filters))
  }, [data, filters, filterFn])
}

/**
 * Hook para búsqueda con debounce integrado
 */
export function useSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  delay: number = 300
) {
  const searchTermRef = useRef('')
  const [filteredData, setFilteredData] = useState<T[]>(data)

  const search = useDebouncedCallback((term: string) => {
    searchTermRef.current = term
    
    if (!term.trim()) {
      setFilteredData(data)
      return
    }

    const lowerTerm = term.toLowerCase()
    const results = data.filter(item => 
      searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerTerm)
        }
        if (typeof value === 'number') {
          return value.toString().includes(term)
        }
        return false
      })
    )
    
    setFilteredData(results)
  }, delay)

  // Re-filtrar cuando cambia data
  useMemo(() => {
    if (searchTermRef.current) {
      search(searchTermRef.current)
    } else {
      setFilteredData(data)
    }
  }, [data, search])

  return { filteredData, search }
}

/**
 * Hook para detectar cambios y evitar renders innecesarios
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value)
  
  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value
  }
  
  return ref.current
}

/**
 * Batch de operaciones para evitar múltiples renders
 */
export function useBatchUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([])
  const rafId = useRef<number | null>(null)

  const batchUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update)

    rafId.current ??= requestAnimationFrame(() => {
      const updates = pendingUpdates.current
      pendingUpdates.current = []
      rafId.current = null
      
      // Ejecutar todas las actualizaciones juntas
      updates.forEach(fn => fn())
    })
  }, [])

  return batchUpdate
}

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * Hook para detectar si un elemento está en el viewport
 * Útil para lazy loading de componentes
 */
export function useInView(options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false)
  const [hasBeenInView, setHasBeenInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting)
      if (entry.isIntersecting) {
        setHasBeenInView(true)
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [options])

  return { ref, isInView, hasBeenInView }
}

/**
 * Hook para debounce de valores
 * Útil para búsquedas y filtros
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook para throttle de funciones
 * Útil para scroll y resize handlers
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 100
): T {
  const lastCall = useRef<number>(0)
  const lastCallTimer = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastCall.current >= delay) {
        lastCall.current = now
        callbackRef.current(...args)
      } else {
        clearTimeout(lastCallTimer.current)
        lastCallTimer.current = setTimeout(() => {
          lastCall.current = Date.now()
          callbackRef.current(...args)
        }, delay - (now - lastCall.current))
      }
    }) as T,
    [delay]
  )
}

/**
 * Hook para memoizar datos pesados
 * Con persistencia en sessionStorage
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutos por defecto
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Intentar obtener del cache
      const cached = sessionStorage.getItem(key)
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < ttl) {
            setData(cachedData)
            setLoading(false)
            return
          }
        } catch {
          // Cache inválido, continuar con fetch
        }
      }

      // Fetch fresh data
      try {
        setLoading(true)
        const freshData = await fetcher()
        setData(freshData)
        
        // Guardar en cache
        sessionStorage.setItem(key, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }))
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [key, fetcher, ttl])

  const invalidate = useCallback(() => {
    sessionStorage.removeItem(key)
    setLoading(true)
    fetcher().then(setData).finally(() => setLoading(false))
  }, [key, fetcher])

  return { data, loading, error, invalidate }
}

/**
 * Hook para virtualización básica de listas
 * Para listas muy largas
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
    item,
    index: startIndex + index,
    style: {
      position: 'absolute' as const,
      top: (startIndex + index) * itemHeight,
      height: itemHeight,
      width: '100%'
    }
  }))

  const totalHeight = items.length * itemHeight

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    onScroll,
    containerStyle: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const
    }
  }
}

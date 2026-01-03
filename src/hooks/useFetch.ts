'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

interface FetchOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Skip cache and force fresh fetch */
  skipCache?: boolean
  /** Dependencies that trigger a refetch */
  deps?: unknown[]
  /** Enable this fetch (useful for conditional fetching) */
  enabled?: boolean
  /** Initial data */
  initialData?: unknown
}

// Cache global para compartir entre componentes
const globalCache = new Map<string, { data: unknown; timestamp: number }>()

// Requests en vuelo para deduplicación
const inflightRequests = new Map<string, Promise<unknown>>()

/** Verificar si hay datos válidos en cache */
function getCachedData<T>(url: string, ttl: number, skipCache: boolean): T | null {
  if (skipCache) return null
  const cached = globalCache.get(url)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }
  return null
}

/** Ejecutar fetch con deduplicación */
async function executeRequest<T>(url: string): Promise<T> {
  const existing = inflightRequests.get(url)
  if (existing !== undefined) {
    return existing as Promise<T>
  }

  const fetchPromise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      return res.json()
    })
    .finally(() => {
      inflightRequests.delete(url)
    })

  inflightRequests.set(url, fetchPromise)
  return fetchPromise
}

/**
 * Hook optimizado para fetch con caché y deduplicación
 * - Evita llamadas duplicadas a la misma URL
 * - Cache en memoria con TTL configurable
 * - Deduplicación de requests en vuelo
 */
export function useFetch<T>(
  url: string | null,
  options: FetchOptions = {}
): FetchState<T> & { refetch: () => Promise<void>; invalidate: () => void } {
  const {
    ttl = 5 * 60 * 1000,
    skipCache = false,
    deps = [],
    enabled = true,
    initialData = null
  } = options

  const [state, setState] = useState<FetchState<T>>(() => ({
    data: (initialData as T) || null,
    loading: !initialData && enabled && !!url,
    error: null
  }))

  const mountedRef = useRef(true)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!url || !enabled) return

    // Verificar cache
    const cached = getCachedData<T>(url, ttl, forceRefresh || skipCache)
    if (cached !== null) {
      if (mountedRef.current) {
        setState({ data: cached, loading: false, error: null })
      }
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const data = await executeRequest<T>(url)
      globalCache.set(url, { data, timestamp: Date.now() })
      
      if (mountedRef.current) {
        setState({ data, loading: false, error: null })
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: error as Error })
      }
    }
  }, [url, enabled, skipCache, ttl])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, ...deps])

  const refetch = useCallback(() => fetchData(true), [fetchData])
  
  const invalidate = useCallback(() => {
    if (url) {
      globalCache.delete(url)
    }
  }, [url])

  return { ...state, refetch, invalidate }
}

/**
 * Hook para mutaciones (POST, PUT, DELETE)
 * - Automáticamente invalida el cache relacionado
 * - Estado de loading durante la mutación
 */
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void
    onError?: (error: Error) => void
    invalidateUrls?: string[]
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | null>(null)

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)
      setData(result)
      
      // Invalidar URLs relacionadas
      if (options?.invalidateUrls) {
        options.invalidateUrls.forEach(url => globalCache.delete(url))
      }
      
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, options])

  return { mutate, loading, error, data }
}

/** Limpiar cache completo */
export function clearFetchCache() {
  globalCache.clear()
}

/** Invalidar cache por patrón */
export function invalidateCacheByPattern(pattern: string | RegExp) {
  const keys = Array.from(globalCache.keys())
  keys.forEach(key => {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      globalCache.delete(key)
    }
  })
}

// Exportar todos los hooks de optimización
export { useFetch, useMutation, clearFetchCache, invalidateCacheByPattern } from './useFetch'
export { 
  useDebouncedCallback, 
  useThrottledCallback, 
  useLocalPagination, 
  useFilteredData,
  useSearch,
  useStableValue,
  useBatchUpdates 
} from './useOptimization'
export { 
  useInView, 
  useDebounce, 
  useThrottle, 
  useCachedData, 
  useVirtualList 
} from './usePerformance'

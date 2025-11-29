'use client'

import { ReactNode, Suspense } from 'react'
import { useInView } from '@/hooks/usePerformance'
import { Loader2 } from 'lucide-react'

interface LazyLoadProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  minHeight?: string
}

/**
 * Componente que solo renderiza su contenido cuando está visible en el viewport
 * Mejora el rendimiento en páginas con muchos componentes
 */
export function LazyLoad({ 
  children, 
  fallback,
  className = '',
  minHeight = '200px' 
}: LazyLoadProps) {
  const { ref, hasBeenInView } = useInView()

  return (
    <div ref={ref} className={className} style={{ minHeight: hasBeenInView ? 'auto' : minHeight }}>
      {hasBeenInView ? (
        <Suspense fallback={fallback || <DefaultLoader />}>
          {children}
        </Suspense>
      ) : (
        fallback || <DefaultLoader />
      )}
    </div>
  )
}

function DefaultLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
}

export { DefaultLoader }

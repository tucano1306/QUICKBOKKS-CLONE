'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Componente de carga genérico
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
)

// Lazy load de gráficos y reportes (pesados)
export const LazyChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load del editor de texto enriquecido (placeholder - component not yet implemented)
export const LazyRichTextEditor = dynamic(
  () => Promise.resolve({ default: () => null }),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load de tablas grandes con virtualización (placeholder - component not yet implemented)
export const LazyDataTable = dynamic(
  () => Promise.resolve({ default: () => null }),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load del calendario
export const LazyCalendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  { loading: LoadingSpinner, ssr: false }
)

'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Componente de carga genérico
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
)

// Lazy load del componente de documentos AI (pesado)
export const LazyDocumentAIProcessor = dynamic(
  () => import('@/components/documents/DocumentAIProcessor'),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load del asistente flotante
export const LazyFloatingAssistant = dynamic(
  () => import('@/components/ai-assistant/floating-assistant'),
  { loading: () => null, ssr: false }
)

// Lazy load de gráficos y reportes (pesados)
export const LazyChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load del editor de texto enriquecido
export const LazyRichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').catch(() => ({ default: () => null })),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load de tablas grandes con virtualización
export const LazyDataTable = dynamic(
  () => import('@/components/ui/data-table').catch(() => ({ default: () => null })),
  { loading: LoadingSpinner, ssr: false }
)

// Lazy load del calendario
export const LazyCalendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  { loading: LoadingSpinner, ssr: false }
)

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

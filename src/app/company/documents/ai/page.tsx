'use client'

import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import DocumentAIProcessor from '@/components/documents/DocumentAIProcessor'

export default function DocumentsAIPage() {
  const { status } = useSession()
  // El middleware ya protege esta ruta — no redirigir aquí para evitar
  // falsos positivos cuando iOS restaura la página tras abrir la cámara

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  return (
    <CompanyTabsLayout>
      <DocumentAIProcessor />
    </CompanyTabsLayout>
  )
}

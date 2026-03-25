'use client'

import DocumentAIProcessor from '@/components/documents/DocumentAIProcessor'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { useSession } from 'next-auth/react'

export default function DocumentsAIPage() {
  const { status } = useSession()

  // Solo spinner en la carga inicial — el middleware protege la ruta server-side.
  // NO interrumpir en 'unauthenticated': después de la cámara en Android/iOS,
  // useSession puede marcar la sesión como inválida (falso positivo). Si
  // renderizamos null/spinner, el <input capture> se desmonta y se pierde la foto.
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <CompanyTabsLayout>
      <DocumentAIProcessor />
    </CompanyTabsLayout>
  )
}

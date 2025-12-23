'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewJournalEntryPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirigir a la página principal con el parámetro para abrir el modal
    router.replace('/company/accounting/journal-entries?openModal=add')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )
}

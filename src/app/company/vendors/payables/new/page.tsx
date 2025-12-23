'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewBillPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirigir a la página principal con el parámetro para abrir el modal
    router.replace('/company/vendors/payables?openModal=add')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
    </div>
  )
}

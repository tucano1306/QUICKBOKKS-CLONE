'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import DocumentAIProcessor from '@/components/documents/DocumentAIProcessor'

export default function DocumentsAIPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!session) return null
  
  return (
    <CompanyTabsLayout>
      <DocumentAIProcessor />
    </CompanyTabsLayout>
  )
}

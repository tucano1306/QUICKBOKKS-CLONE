'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CompanyProvider>
        {children}
      </CompanyProvider>
    </SessionProvider>
  )
}

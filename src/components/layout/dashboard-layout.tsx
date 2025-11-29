'use client'

import { ReactNode } from 'react'
import Sidebar from './sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

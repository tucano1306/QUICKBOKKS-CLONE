'use client'

import { ReactNode } from 'react'
import Sidebar from './sidebar'
import MobileBreadcrumbs from './mobile-breadcrumbs'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <Sidebar />
      
      {/* Mobile Header with Breadcrumbs */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-14 px-4 pl-16">
          <MobileBreadcrumbs />
        </div>
      </div>
      
      {/* Main content - responsive padding for sidebar */}
      <main className="min-h-screen transition-all duration-300 lg:pl-20 xl:pl-64">
        <div className="pt-16 lg:pt-0 py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6 lg:px-8 xl:px-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

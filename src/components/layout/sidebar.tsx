'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import CompanySelector from '@/components/CompanySelector'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Empresas', href: '/companies', icon: Building2 },
  { name: 'Agente IA', href: '/ai-agent', icon: TrendingUp },
  { name: 'Configuración', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Detectar tamaño de pantalla para colapsar automáticamente en tablets
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setIsCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-[#0D2942] text-white transform transition-all duration-300 ease-in-out shadow-2xl',
          sidebarWidth,
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center h-16 bg-[#0D2942] border-b border-white/10 hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            {isCollapsed ? (
              <span className="text-2xl font-extrabold text-[#2CA01C]">CP</span>
            ) : (
              <h1 className="text-lg sm:text-xl font-extrabold tracking-wide">
                <span className="text-white">COMPUTO</span>
                <span className="text-[#2CA01C]">PLUS</span>
              </h1>
            )}
          </Link>

          {/* Collapse toggle button - only on desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#0D2942] border border-white/20 rounded-full items-center justify-center text-white/60 hover:text-white hover:bg-[#1a3a5c] transition-all z-50"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* User info */}
          <div className={cn(
            "bg-white/5 backdrop-blur-sm border-b border-white/10 transition-all duration-300",
            isCollapsed ? "p-2" : "p-4"
          )}>
            <Link 
              href="/dashboard"
              className={cn(
                "flex items-center rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer group",
                isCollapsed ? "justify-center p-2" : "space-x-3 p-3 -m-1 mb-3"
              )}
              title={isCollapsed ? session?.user?.name || 'Usuario' : undefined}
            >
              <div className={cn(
                "rounded-full bg-gradient-to-br from-[#2CA01C] to-[#108000] flex items-center justify-center shadow-lg ring-2 ring-green-400/30 group-hover:ring-green-400/50 transition-all flex-shrink-0",
                isCollapsed ? "w-10 h-10" : "w-11 h-11"
              )}>
                <span className={cn("font-bold", isCollapsed ? "text-base" : "text-lg")}>
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">
                    {session?.user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              )}
            </Link>
            {/* Company Selector - hidden when collapsed */}
            {!isCollapsed && (
              <div className="mt-3">
                <CompanySelector />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden",
            isCollapsed ? "px-2" : "px-3"
          )}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center text-sm font-medium rounded-lg transition-all duration-200 group',
                    isCollapsed ? 'justify-center p-3' : 'px-4 py-3',
                    isActive
                      ? 'bg-[#2CA01C] text-white shadow-lg shadow-green-500/25'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200 flex-shrink-0",
                    isCollapsed ? "" : "mr-3",
                    isActive ? "" : "group-hover:scale-110"
                  )} />
                  {!isCollapsed && <span className="tracking-wide truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className={cn(
            "border-t border-white/10",
            isCollapsed ? "p-2" : "p-4"
          )}>
            <button
              onClick={handleSignOut}
              title={isCollapsed ? 'Cerrar Sesión' : undefined}
              className={cn(
                "flex items-center w-full text-sm font-medium text-white/70 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 group",
                isCollapsed ? "justify-center p-3" : "px-4 py-3"
              )}
            >
              <LogOut className={cn(
                "h-5 w-5 group-hover:scale-110 transition-transform flex-shrink-0",
                isCollapsed ? "" : "mr-3"
              )} />
              {!isCollapsed && <span className="tracking-wide">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

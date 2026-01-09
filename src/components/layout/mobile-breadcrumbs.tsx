'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Home, Building2, Bot, Settings, LayoutDashboard } from 'lucide-react'

interface BreadcrumbSection {
  id: string
  name: string
  icon: any
  basePath: string
  items: { name: string; href: string }[]
}

// Definición de secciones para el menú principal (fuera de company)
const mainSections: BreadcrumbSection[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    basePath: '/dashboard',
    items: [
      { name: 'Resumen', href: '/dashboard' }
    ]
  },
  {
    id: 'companies',
    name: 'Empresas',
    icon: Building2,
    basePath: '/companies',
    items: [
      { name: 'Lista de Empresas', href: '/companies' }
    ]
  },
  {
    id: 'ai-agent',
    name: 'Agente IA',
    icon: Bot,
    basePath: '/ai-agent',
    items: [
      { name: 'Asistente', href: '/ai-agent' }
    ]
  },
  {
    id: 'settings',
    name: 'Configuración',
    icon: Settings,
    basePath: '/settings',
    items: [
      { name: 'General', href: '/settings' },
      { name: 'Perfil', href: '/settings/profile' },
      { name: 'Seguridad', href: '/settings/security' }
    ]
  }
]

interface MobileBreadcrumbsProps {
  sections?: BreadcrumbSection[]
  className?: string
}

export default function MobileBreadcrumbs({ sections = mainSections, className = '' }: MobileBreadcrumbsProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Encontrar la sección y el item actual
  const findCurrentBreadcrumb = () => {
    for (const section of sections) {
      if (pathname?.startsWith(section.basePath)) {
        // Encontrar el item específico
        const item = section.items.find(i => 
          pathname === i.href || pathname?.startsWith(i.href + '/')
        )
        return { 
          section, 
          item: item || section.items[0]
        }
      }
    }
    return null
  }

  const breadcrumb = findCurrentBreadcrumb()

  if (!breadcrumb) return null

  const Icon = breadcrumb.section.icon

  return (
    <div className={`flex items-center gap-1.5 lg:hidden min-w-0 flex-1 overflow-hidden ${className}`}>
      {/* Sección clickeable */}
      <button
        onClick={() => router.push(breadcrumb.section.items[0].href)}
        className="flex items-center gap-1.5 text-sm font-medium text-[#2CA01C] hover:text-[#108000] active:scale-95 transition-all flex-shrink-0"
      >
        <Icon className="w-4 h-4" />
        <span>{breadcrumb.section.name}</span>
      </button>
      
      {/* Separador y página actual */}
      {breadcrumb.item && breadcrumb.item.href !== breadcrumb.section.items[0].href && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">
            {breadcrumb.item.name}
          </span>
        </>
      )}
    </div>
  )
}

// Exportar las secciones para que puedan ser extendidas
export { mainSections }
export type { BreadcrumbSection }

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  PlusCircle,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  CheckSquare,
  Brain,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Repeat,
  Building2,
  Link as LinkIcon,
  CheckCircle,
  Eye,
  Activity,
  Receipt,
  History,
  FileSpreadsheet,
  Settings,
  Sliders,
  Database,
  BarChart3,
  HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  name: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger'
}

interface SubMenu {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: MenuItem[]
  href?: string
}

const accountingMenuItems: SubMenu[] = [
  {
    title: 'Plan de Cuentas',
    icon: BookOpen,
    href: '/company/accounting/chart-of-accounts',
    items: [
      {
        name: 'Ver catálogo de cuentas',
        icon: BookOpen,
        href: '/company/accounting/chart-of-accounts',
      },
      {
        name: 'Crear nueva cuenta',
        icon: PlusCircle,
        href: '/company/accounting/chart-of-accounts?action=create',
        variant: 'primary',
      },
      {
        name: 'Editar cuenta',
        icon: Edit,
        href: '/company/accounting/chart-of-accounts?action=edit',
      },
      {
        name: 'Eliminar cuenta',
        icon: Trash2,
        href: '/company/accounting/chart-of-accounts?action=delete',
        variant: 'danger',
      },
      {
        name: 'Exportar catálogo',
        icon: Download,
        href: '/company/accounting/chart-of-accounts?action=export',
      },
    ],
  },
  {
    title: 'Transacciones',
    icon: FileText,
    href: '/company/accounting/transactions',
    items: [
      {
        name: 'Registrar nueva transacción',
        icon: PlusCircle,
        href: '/company/accounting/transactions?action=create',
        variant: 'primary',
      },
      {
        name: 'Importar transacciones',
        icon: Upload,
        href: '/company/accounting/bank-sync',
      },
      {
        name: 'Clasificar transacciones',
        icon: CheckSquare,
        href: '/company/accounting/ai-categorization',
      },
      {
        name: 'Buscar/Filtrar',
        icon: Search,
        href: '/company/accounting/transactions?action=search',
      },
      {
        name: 'Editar transacción',
        icon: Edit,
        href: '/company/accounting/transactions?action=edit',
      },
      {
        name: 'Eliminar transacción',
        icon: Trash2,
        href: '/company/accounting/transactions?action=delete',
        variant: 'danger',
      },
    ],
  },
  {
    title: 'Clasificación Inteligente',
    icon: Brain,
    href: '/company/accounting/ai-categorization',
    items: [
      {
        name: 'Activar AI Auto-Categorización',
        icon: Brain,
        href: '/company/accounting/ai-categorization?action=activate',
        variant: 'primary',
      },
      {
        name: 'Revisar sugerencias',
        icon: Eye,
        href: '/company/accounting/ai-categorization?action=review',
      },
      {
        name: 'Aceptar clasificación',
        icon: ThumbsUp,
        href: '/company/accounting/ai-categorization?action=accept',
      },
      {
        name: 'Rechazar clasificación',
        icon: ThumbsDown,
        href: '/company/accounting/ai-categorization?action=reject',
      },
      {
        name: 'Reclasificación masiva',
        icon: RefreshCw,
        href: '/company/accounting/mass-reclassification',
      },
      {
        name: 'Cambio de cuentas en lote',
        icon: Repeat,
        href: '/company/accounting/mass-reclassification?action=batch',
      },
    ],
  },
  {
    title: 'Conciliación Bancaria',
    icon: Building2,
    href: '/company/accounting/reconciliation',
    items: [
      {
        name: 'Conectar bancos y tarjetas',
        icon: LinkIcon,
        href: '/company/accounting/bank-sync',
        variant: 'primary',
      },
      {
        name: 'Sincronizar cuentas',
        icon: RefreshCw,
        href: '/company/accounting/bank-sync?action=sync',
      },
      {
        name: 'Conciliar transacciones',
        icon: CheckCircle,
        href: '/company/accounting/reconciliation',
      },
      {
        name: 'Cuadrar cuentas bancarias',
        icon: CheckSquare,
        href: '/company/accounting/reconciliation?action=balance',
      },
      {
        name: 'Ver estado de conciliación',
        icon: Activity,
        href: '/company/accounting/reconciliation?action=status',
      },
    ],
  },
  {
    title: 'Asientos Contables',
    icon: Receipt,
    href: '/company/accounting/journal-entries',
    items: [
      {
        name: 'Crear asiento manual',
        icon: PlusCircle,
        href: '/company/accounting/journal-entries?action=create',
        variant: 'primary',
      },
      {
        name: 'Editar asiento contable',
        icon: Edit,
        href: '/company/accounting/journal-entries?action=edit',
      },
      {
        name: 'Eliminar asiento',
        icon: Trash2,
        href: '/company/accounting/journal-entries?action=delete',
        variant: 'danger',
      },
      {
        name: 'Ver historial de asientos',
        icon: History,
        href: '/company/accounting/journal-entries?action=history',
      },
      {
        name: 'Exportar asientos',
        icon: Download,
        href: '/company/accounting/journal-entries?action=export',
      },
    ],
  },
  {
    title: 'Configuración / Extras',
    icon: Settings,
    href: '/company/accounting/settings',
    items: [
      {
        name: 'Configurar reglas de clasificación',
        icon: Sliders,
        href: '/company/accounting/ai-categorization?action=rules',
      },
      {
        name: 'Administrar conexiones bancarias',
        icon: Database,
        href: '/company/accounting/bank-sync?action=manage',
      },
      {
        name: 'Ver reportes contables',
        icon: BarChart3,
        href: '/company/reports',
      },
      {
        name: 'Descargar respaldo de datos',
        icon: HardDrive,
        href: '/company/accounting/settings?action=backup',
      },
    ],
  },
]

interface AccountingMenuProps {
  onItemClick?: (() => void) | (() => Promise<void>)
}

export default function AccountingMenu({ onItemClick }: AccountingMenuProps) {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const toggleMenu = (title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    )
  }

  const isMenuActive = (menu: SubMenu) => {
    if (menu.href && pathname?.startsWith(menu.href)) return true
    return menu.items.some((item) => item.href && pathname?.startsWith(item.href))
  }

  const isItemActive = (href?: string) => {
    if (!href) return false
    const cleanHref = href.split('?')[0]
    return pathname === cleanHref || pathname?.startsWith(cleanHref + '/')
  }

  const getVariantClasses = (variant?: string, isActive?: boolean) => {
    if (isActive) {
      return 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
    }
    
    switch (variant) {
      case 'primary':
        return 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-700'
      default:
        return 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
    }
  }

  return (
    <div className="space-y-1">
      {accountingMenuItems.map((menu) => {
        const isExpanded = expandedMenus.includes(menu.title)
        const isActive = isMenuActive(menu)

        return (
          <div key={menu.title} className="space-y-1">
            {/* Menu Header */}
            <button
              onClick={() => toggleMenu(menu.title)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <div className="flex items-center">
                <menu.icon className="mr-3 h-5 w-5" />
                <span>{menu.title}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Submenu Items */}
            {isExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-gray-700 pl-3">
                {menu.items.map((item) => {
                  const itemIsActive = isItemActive(item.href)
                  const IconComponent = item.icon

                  if (item.href) {
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onItemClick}
                        className={cn(
                          'flex items-center px-3 py-2 text-xs rounded-md transition-colors',
                          itemIsActive
                            ? 'bg-gray-700 text-white font-medium'
                            : getVariantClasses(item.variant)
                        )}
                      >
                        <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        item.onClick?.()
                        onItemClick?.()
                      }}
                      className={cn(
                        'w-full flex items-center px-3 py-2 text-xs rounded-md transition-colors',
                        getVariantClasses(item.variant)
                      )}
                    >
                      <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

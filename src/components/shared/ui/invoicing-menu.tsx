'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  PlusCircle,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
  Eye,
  Send,
  Link as LinkIcon,
  Copy,
  Calendar,
  RefreshCw,
  Mail,
  CheckCircle,
  DollarSign,
  Clock,
  FileSpreadsheet,
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

const invoicingMenuItems: SubMenu[] = [
  {
    title: 'Facturas',
    icon: FileText,
    href: '/company/invoices',
    items: [
      {
        name: 'Ver todas las facturas',
        icon: FileText,
        href: '/company/invoices',
      },
      {
        name: 'Crear nueva factura',
        icon: PlusCircle,
        href: '/company/invoices?action=create',
        variant: 'primary',
      },
      {
        name: 'Editar factura',
        icon: Edit,
        href: '/company/invoices?action=edit',
      },
      {
        name: 'Enviar factura',
        icon: Send,
        href: '/company/invoices?action=send',
      },
      {
        name: 'Eliminar factura',
        icon: Trash2,
        href: '/company/invoices?action=delete',
        variant: 'danger',
      },
      {
        name: 'Exportar facturas',
        icon: Download,
        href: '/company/invoices?action=export',
      },
    ],
  },
  {
    title: 'Links de Pago',
    icon: LinkIcon,
    href: '/company/invoicing/payment-links',
    items: [
      {
        name: 'Ver links activos',
        icon: Eye,
        href: '/company/invoicing/payment-links',
      },
      {
        name: 'Crear link de pago',
        icon: PlusCircle,
        href: '/company/invoicing/payment-links?action=create',
        variant: 'primary',
      },
      {
        name: 'Copiar URL',
        icon: Copy,
        href: '/company/invoicing/payment-links?action=copy',
      },
      {
        name: 'Compartir por email',
        icon: Mail,
        href: '/company/invoicing/payment-links?action=email',
      },
      {
        name: 'Desactivar link',
        icon: Trash2,
        href: '/company/invoicing/payment-links?action=deactivate',
        variant: 'danger',
      },
    ],
  },
  {
    title: 'Facturas Recurrentes',
    icon: RefreshCw,
    href: '/company/invoicing/recurring',
    items: [
      {
        name: 'Ver facturas recurrentes',
        icon: RefreshCw,
        href: '/company/invoicing/recurring',
      },
      {
        name: 'Crear facturación automática',
        icon: PlusCircle,
        href: '/company/invoicing/recurring?action=create',
        variant: 'primary',
      },
      {
        name: 'Editar programación',
        icon: Calendar,
        href: '/company/invoicing/recurring?action=edit',
      },
      {
        name: 'Pausar facturación',
        icon: Clock,
        href: '/company/invoicing/recurring?action=pause',
      },
      {
        name: 'Eliminar recurrencia',
        icon: Trash2,
        href: '/company/invoicing/recurring?action=delete',
        variant: 'danger',
      },
    ],
  },
  {
    title: 'Cotizaciones',
    icon: FileSpreadsheet,
    href: '/company/invoicing/quotes',
    items: [
      {
        name: 'Ver cotizaciones',
        icon: FileSpreadsheet,
        href: '/company/invoicing/quotes',
      },
      {
        name: 'Crear cotización',
        icon: PlusCircle,
        href: '/company/invoicing/quotes?action=create',
        variant: 'primary',
      },
      {
        name: 'Convertir a factura',
        icon: FileText,
        href: '/company/invoicing/quotes?action=convert',
      },
      {
        name: 'Enviar cotización',
        icon: Send,
        href: '/company/invoicing/quotes?action=send',
      },
      {
        name: 'Editar cotización',
        icon: Edit,
        href: '/company/invoicing/quotes?action=edit',
      },
      {
        name: 'Eliminar cotización',
        icon: Trash2,
        href: '/company/invoicing/quotes?action=delete',
        variant: 'danger',
      },
    ],
  },
  {
    title: 'Recordatorios',
    icon: Mail,
    href: '/company/invoicing/reminders',
    items: [
      {
        name: 'Ver recordatorios',
        icon: Mail,
        href: '/company/invoicing/reminders',
      },
      {
        name: 'Crear recordatorio',
        icon: PlusCircle,
        href: '/company/invoicing/reminders?action=create',
        variant: 'primary',
      },
      {
        name: 'Enviar recordatorio manual',
        icon: Send,
        href: '/company/invoicing/reminders?action=send',
      },
      {
        name: 'Configurar automáticos',
        icon: Calendar,
        href: '/company/invoicing/reminders?action=config',
      },
      {
        name: 'Historial de recordatorios',
        icon: Clock,
        href: '/company/invoicing/reminders?action=history',
      },
    ],
  },
  {
    title: 'Pagos Recibidos',
    icon: DollarSign,
    href: '/company/invoicing/payments',
    items: [
      {
        name: 'Ver pagos recibidos',
        icon: CheckCircle,
        href: '/company/invoicing/payments',
      },
      {
        name: 'Registrar pago',
        icon: PlusCircle,
        href: '/company/invoicing/payments?action=create',
        variant: 'primary',
      },
      {
        name: 'Aplicar a factura',
        icon: FileText,
        href: '/company/invoicing/payments?action=apply',
      },
      {
        name: 'Buscar pagos',
        icon: Search,
        href: '/company/invoicing/payments?action=search',
      },
      {
        name: 'Exportar pagos',
        icon: Download,
        href: '/company/invoicing/payments?action=export',
      },
    ],
  },
]

interface InvoicingMenuProps {
  onItemClick?: (() => void) | (() => Promise<void>)
}

export default function InvoicingMenu({ onItemClick }: InvoicingMenuProps) {
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
      {invoicingMenuItems.map((menu) => {
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

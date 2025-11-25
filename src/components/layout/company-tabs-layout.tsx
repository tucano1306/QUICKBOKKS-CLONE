'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  Settings,
  Building2,
  Receipt,
  Wallet,
  CreditCard,
  ChevronDown,
  Calculator,
  PieChart,
  FolderKanban,
  UserCheck,
  ShoppingCart,
  Briefcase,
  FileCheck,
  Activity,
  Target,
  Zap,
  Brain,
  Shield,
  Smartphone,
  Globe,
  Cloud,
  BarChart3
} from 'lucide-react'

interface SubMenuItem {
  name: string
  href: string
  description?: string
}

interface TabSection {
  id: string
  name: string
  icon: any
  color: string
  submenus: SubMenuItem[]
}

const tabSections: TabSection[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: 'blue',
    submenus: [
      { name: 'Resumen General', href: '/company/dashboard', description: 'Vista general del negocio' },
      { name: 'Métricas Clave', href: '/company/dashboard/metrics', description: 'KPIs y estadísticas' },
      { name: 'Insights IA', href: '/company/dashboard/ai-insights', description: 'Recomendaciones inteligentes' }
    ]
  },
  {
    id: 'accounting',
    name: 'Contabilidad',
    icon: Calculator,
    color: 'green',
    submenus: [
      { name: 'Plan de Cuentas', href: '/company/accounting/chart-of-accounts', description: 'Catálogo de cuentas contables' },
      { name: 'Transacciones', href: '/company/accounting/transactions', description: 'Importar y clasificar transacciones' },
      { name: 'Conciliación Bancaria', href: '/company/accounting/reconciliation', description: 'Cuadrar cuentas bancarias' },
      { name: 'Asientos Contables', href: '/company/accounting/journal-entries', description: 'Registros manuales' },
      { name: 'Sincronización Bancaria', href: '/company/accounting/bank-sync', description: 'Conectar bancos y tarjetas' }
    ]
  },
  {
    id: 'invoicing',
    name: 'Facturación',
    icon: FileText,
    color: 'purple',
    submenus: [
      { name: 'Facturas', href: '/company/invoicing/invoices', description: 'Crear y gestionar facturas' },
      { name: 'Facturas Recurrentes', href: '/company/invoicing/recurring', description: 'Facturación automática periódica' },
      { name: 'Cotizaciones', href: '/company/invoicing/estimates', description: 'Presupuestos y cotizaciones' },
      { name: 'Recordatorios', href: '/company/invoicing/reminders', description: 'Pagos pendientes automáticos' },
      { name: 'Pagos Recibidos', href: '/company/invoicing/payments', description: 'Registro de cobros' }
    ]
  },
  {
    id: 'expenses',
    name: 'Gastos',
    icon: Receipt,
    color: 'red',
    submenus: [
      { name: 'Gastos', href: '/company/expenses/list', description: 'Registro y seguimiento' },
      { name: 'Captura de Recibos', href: '/company/expenses/receipts', description: 'Subir y digitalizar recibos' },
      { name: 'Categorías', href: '/company/expenses/categories', description: 'Clasificación de gastos' },
      { name: 'Gastos Deducibles', href: '/company/expenses/tax-deductible', description: 'Para declaración fiscal' },
      { name: 'Tarjetas Corporativas', href: '/company/expenses/corporate-cards', description: 'Sincronizar tarjetas empresa' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventario',
    icon: Package,
    color: 'orange',
    submenus: [
      { name: 'Productos', href: '/company/inventory/products', description: 'Catálogo de productos/servicios' },
      { name: 'Seguimiento en Tiempo Real', href: '/company/inventory/tracking', description: 'Stock disponible' },
      { name: 'Ajustes de Inventario', href: '/company/inventory/adjustments', description: 'Correcciones y ajustes' },
      { name: 'Órdenes de Compra', href: '/company/inventory/purchase-orders', description: 'Compras a proveedores' },
      { name: 'Reportes de Inventario', href: '/company/inventory/reports', description: 'Análisis de stock' }
    ]
  },
  {
    id: 'customers',
    name: 'Clientes',
    icon: Users,
    color: 'cyan',
    submenus: [
      { name: 'Lista de Clientes', href: '/company/customers/list', description: 'Directorio completo' },
      { name: 'Portal del Cliente', href: '/company/customers/portal', description: 'Acceso para clientes' },
      { name: 'Historial de Transacciones', href: '/company/customers/transactions', description: 'Facturas y pagos' },
      { name: 'Notas y Seguimiento', href: '/company/customers/notes', description: 'CRM básico' }
    ]
  },
  {
    id: 'vendors',
    name: 'Proveedores',
    icon: ShoppingCart,
    color: 'indigo',
    submenus: [
      { name: 'Lista de Proveedores', href: '/company/vendors/list', description: 'Directorio de proveedores' },
      { name: 'Cuentas por Pagar', href: '/company/vendors/payables', description: 'Facturas pendientes' },
      { name: 'Órdenes de Compra', href: '/company/vendors/purchase-orders', description: 'Órdenes a proveedores' },
      { name: 'Historial de Compras', href: '/company/vendors/history', description: 'Registro de compras' }
    ]
  },
  {
    id: 'payroll',
    name: 'Nómina',
    icon: DollarSign,
    color: 'emerald',
    submenus: [
      { name: 'Empleados', href: '/company/payroll/employees', description: 'Registro de personal' },
      { name: 'Control de Horas', href: '/company/payroll/timesheet', description: 'Horas trabajadas' },
      { name: 'Cálculo de Nómina', href: '/company/payroll/calculate', description: 'Procesar pagos' },
      { name: 'Impuestos de Nómina', href: '/company/payroll/taxes', description: 'Retenciones y contribuciones' },
      { name: 'Reportes de Nómina', href: '/company/payroll/reports', description: 'Análisis de costos laborales' }
    ]
  },
  {
    id: 'banking',
    name: 'Banca',
    icon: Building2,
    color: 'blue',
    submenus: [
      { name: 'Cuentas Bancarias', href: '/company/banking/accounts', description: 'Gestión de cuentas' },
      { name: 'Transacciones', href: '/company/banking/transactions', description: 'Movimientos bancarios' },
      { name: 'Transferencias', href: '/company/banking/transfers', description: 'Entre cuentas' },
      { name: 'Conciliación', href: '/company/banking/reconciliation', description: 'Cuadrar saldos' }
    ]
  },
  {
    id: 'projects',
    name: 'Proyectos',
    icon: FolderKanban,
    color: 'violet',
    submenus: [
      { name: 'Lista de Proyectos', href: '/company/projects/list', description: 'Gestión de proyectos' },
      { name: 'Job Costing', href: '/company/projects/costing', description: 'Costos por proyecto' },
      { name: 'Tiempo Facturable', href: '/company/projects/billable-time', description: 'Horas a cobrar' },
      { name: 'Rentabilidad', href: '/company/projects/profitability', description: 'Análisis por proyecto' }
    ]
  },
  {
    id: 'budgets',
    name: 'Presupuestos',
    icon: Target,
    color: 'pink',
    submenus: [
      { name: 'Crear Presupuesto', href: '/company/budgets/create', description: 'Proyectar ingresos y gastos' },
      { name: 'Presupuesto vs Real', href: '/company/budgets/vs-actual', description: 'Comparar proyecciones' },
      { name: 'Flujo de Efectivo', href: '/company/budgets/cash-flow', description: 'Pronóstico de liquidez' },
      { name: 'Alertas de Presupuesto', href: '/company/budgets/alerts', description: 'Notificaciones automáticas' }
    ]
  },
  {
    id: 'reports',
    name: 'Reportes',
    icon: TrendingUp,
    color: 'teal',
    submenus: [
      { name: 'Pérdidas y Ganancias', href: '/company/reports/profit-loss', description: 'Estado de resultados' },
      { name: 'Balance General', href: '/company/reports/balance-sheet', description: 'Activos, pasivos y capital' },
      { name: 'Flujo de Caja', href: '/company/reports/cash-flow', description: 'Entradas y salidas' },
      { name: 'Reportes por Impuestos', href: '/company/reports/tax-reports', description: 'Para declaraciones' },
      { name: 'Reportes Personalizados', href: '/company/reports/custom', description: 'Crear reportes a medida' },
      { name: 'Envío Automático', href: '/company/reports/scheduled', description: 'Programar reportes' }
    ]
  },
  {
    id: 'taxes',
    name: 'Impuestos',
    icon: FileCheck,
    color: 'yellow',
    submenus: [
      { name: 'Información Fiscal', href: '/company/taxes/info', description: 'Configuración tributaria' },
      { name: 'Gastos Deducibles', href: '/company/taxes/deductions', description: 'Deducciones fiscales' },
      { name: 'Estimación de Impuestos', href: '/company/taxes/estimates', description: 'Calcular impuestos' },
      { name: 'Exportar para Contador', href: '/company/taxes/export', description: 'Datos para declaración' },
      { name: 'Integración TurboTax', href: '/company/taxes/turbotax', description: 'Conectar con TurboTax' }
    ]
  },
  {
    id: 'automation',
    name: 'Automatización',
    icon: Zap,
    color: 'amber',
    submenus: [
      { name: 'Workflows', href: '/company/automation/workflows', description: 'Flujos automatizados' },
      { name: 'Reglas Contables', href: '/company/automation/rules', description: 'Clasificación automática' },
      { name: 'Recordatorios', href: '/company/automation/reminders', description: 'Notificaciones automáticas' },
      { name: 'Tareas Programadas', href: '/company/automation/scheduled', description: 'Ejecución periódica' }
    ]
  },
  {
    id: 'ai',
    name: 'IA & Insights',
    icon: Brain,
    color: 'fuchsia',
    submenus: [
      { name: 'Intuit Assist', href: '/company/ai/assist', description: 'Asistente de negocios IA' },
      { name: 'Predicciones', href: '/company/ai/predictions', description: 'Pronósticos inteligentes' },
      { name: 'Recomendaciones', href: '/company/ai/recommendations', description: 'Sugerencias de IA' },
      { name: 'Agente IA', href: '/company/ai/agent', description: 'Automatización agéntica' }
    ]
  },
  {
    id: 'settings',
    name: 'Configuración',
    icon: Settings,
    color: 'gray',
    submenus: [
      { name: 'Empresa', href: '/company/settings/company', description: 'Información de la empresa' },
      { name: 'Usuarios y Permisos', href: '/company/settings/users', description: 'Control de accesos' },
      { name: 'Integraciones', href: '/company/settings/integrations', description: 'Apps conectadas' },
      { name: 'Multimoneda', href: '/company/settings/currency', description: 'Tipos de cambio' },
      { name: 'Facturación', href: '/company/settings/invoicing', description: 'Configurar facturas' },
      { name: 'Seguridad', href: '/company/settings/security', description: 'Protección de datos' }
    ]
  }
]

export default function CompanyTabsLayout({ children }: { children: React.ReactNode }) {
  const { activeCompany } = useCompany()
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [showSubmenu, setShowSubmenu] = useState(false)

  if (!activeCompany) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Selecciona una empresa
          </h2>
          <p className="text-gray-600">
            Usa el selector en la barra lateral para elegir una empresa
          </p>
        </div>
      </div>
    )
  }

  // Detectar la pestaña activa según la URL
  const currentTab = tabSections.find(tab => 
    pathname?.startsWith(`/company/${tab.id}`)
  ) || tabSections[0]

  const activeSection = tabSections.find(tab => tab.id === activeTab) || currentTab

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior con información de la empresa */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeCompany.logo ? (
                <img
                  src={activeCompany.logo}
                  alt={activeCompany.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  {activeCompany.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeCompany.name}
                </h2>
                <p className="text-xs text-gray-500">
                  {activeCompany.legalName || 'Empresa activa'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de pestañas horizontal */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="overflow-x-auto">
            <nav className="flex space-x-1 px-4" aria-label="Tabs">
              {tabSections.map((tab) => {
                const Icon = tab.icon
                const isActive = currentTab.id === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setShowSubmenu(!showSubmenu || activeTab !== tab.id)
                    }}
                    className={cn(
                      'group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                      isActive
                        ? `border-${tab.color}-600 text-${tab.color}-600 bg-white`
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive ? `text-${tab.color}-600` : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span>{tab.name}</span>
                    {isActive && (
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform',
                        showSubmenu && activeTab === tab.id ? 'rotate-180' : ''
                      )} />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Submenú desplegable */}
        {showSubmenu && (
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeSection.submenus.map((submenu) => (
                  <Link
                    key={submenu.href}
                    href={submenu.href}
                    onClick={() => setShowSubmenu(false)}
                    className="group p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn(
                      'text-sm font-medium mb-1 group-hover:text-${activeSection.color}-600',
                      pathname === submenu.href ? `text-${activeSection.color}-600` : 'text-gray-900'
                    )}>
                      {submenu.name}
                    </div>
                    {submenu.description && (
                      <div className="text-xs text-gray-500">
                        {submenu.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="max-w-full">
        {children}
      </main>
    </div>
  )
}

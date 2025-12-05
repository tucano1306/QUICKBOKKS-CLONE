'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import FloatingAssistant from '@/components/ai-assistant/floating-assistant'
import RealTimeUpdates from '@/components/ui/real-time-updates'
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
  BarChart3,
  Home,
  LogOut,
  Wrench,
  FileSpreadsheet
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
      { name: 'Asistente IA', href: '/company/ai-assistant', description: 'Chatbot inteligente personalizado' },
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
      { name: 'AI Auto-Categorización', href: '/company/accounting/ai-categorization', description: 'Clasificación inteligente' },
      { name: 'Reclasificación Masiva', href: '/company/accounting/mass-reclassification', description: 'Cambio de cuentas en lote' },
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
      { name: 'Links de Pago', href: '/company/invoicing/payment-links', description: 'URLs únicas para cobros' },
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
  // {
  //   id: 'inventory',
  //   name: 'Inventario',
  //   icon: Package,
  //   color: 'orange',
  //   submenus: [
  //     { name: 'Productos', href: '/company/inventory/products', description: 'Catálogo de productos/servicios' },
  //     { name: 'Seguimiento en Tiempo Real', href: '/company/inventory/tracking', description: 'Stock disponible' },
  //     { name: 'Ajustes de Inventario', href: '/company/inventory/adjustments', description: 'Correcciones y ajustes' },
  //     { name: 'Órdenes de Compra', href: '/company/inventory/purchase-orders', description: 'Compras a proveedores' },
  //     { name: 'Reportes de Inventario', href: '/company/inventory/reports', description: 'Análisis de stock' }
  //   ]
  // },
  {
    id: 'customers',
    name: 'Clientes',
    icon: Users,
    color: 'cyan',
    submenus: [
      { name: 'Lista de Clientes', href: '/company/customers', description: 'Directorio completo' },
      { name: 'Portal del Cliente', href: '/company/customers/portal', description: 'Acceso para clientes' },
      { name: '📧 Bandeja de Email', href: '/company/documents/inbox', description: 'Recibir docs por email' },
      { name: 'Upload Documentos', href: '/company/documents/upload', description: 'Subir docs con IA' },
      { name: '🤖 AI Doc Processor', href: '/company/documents/ai', description: 'Procesar con IA' },
      { name: '🤖 Revisión IA Docs', href: '/company/documents/review', description: 'Aprobar y reclasificar' },
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
      { name: '🇺🇸 Nómina Florida', href: '/company/payroll/florida', description: 'Sistema completo Florida con RT-6, 941, 940, W-2, 1099' },
      { name: 'Empleados', href: '/company/payroll/employees', description: 'Registro de personal' },
      { name: 'Control de Horas', href: '/company/payroll/timesheet', description: 'Horas trabajadas' },
      { name: 'Cálculo de Nómina', href: '/company/payroll/calculate', description: 'Procesar pagos' },
      { name: 'Cheques de Pago', href: '/company/payroll/checks', description: 'Emisión de cheques con número' },
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
      { name: '📖 Mayor Analítico', href: '/company/reports/advanced?type=analytical-ledger', description: 'Detalle de cuenta contable' },
      { name: '⚖️ Balance de Comprobación', href: '/company/reports/advanced?type=trial-balance', description: 'Verificación de saldos' },
      { name: '📒 Libro Diario Legal', href: '/company/reports/advanced?type=legal-journal', description: 'Asientos contables oficiales' },
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
    id: 'tools',
    name: 'Herramientas',
    icon: Wrench,
    color: 'slate',
    submenus: [
      { name: '📊 Gestor de Excel', href: '/company/tools/excel-manager', description: 'Cargar, analizar y gestionar archivos Excel' },
      { name: 'Importar Datos', href: '/company/tools/import', description: 'Importar desde otros sistemas' },
      { name: 'Exportar Datos', href: '/company/tools/export', description: 'Exportar información' }
    ]
  },
  {
    id: 'settings',
    name: 'Configuración',
    icon: Settings,
    color: 'gray',
    submenus: [
      { name: 'Empresa', href: '/company/settings/company', description: 'Información de la empresa' },
      { name: 'Multi-Empresa', href: '/company/settings/multi-company', description: 'Gestionar varias empresas' },
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
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Construir la URL completa con query params para comparar
  const currentUrl = searchParams.toString() 
    ? `${pathname}?${searchParams.toString()}` 
    : pathname
  
  // Mapa de rutas especiales que no coinciden con el patrón /company/{tabId}
  // pero pertenecen a un tab específico
  const specialRouteMappings: { [key: string]: string } = {
    '/company/documents': 'customers',  // Bandeja email, AI docs, etc. pertenecen a Clientes
    '/company/ai-assistant': 'dashboard' // Asistente IA pertenece a Dashboard
  }
  
  // Detectar la pestaña activa según la URL (ANTES del return condicional)
  const findCurrentTab = () => {
    // Primero verificar rutas especiales
    for (const [routePrefix, tabId] of Object.entries(specialRouteMappings)) {
      if (pathname?.startsWith(routePrefix)) {
        return tabSections.find(tab => tab.id === tabId)
      }
    }
    // Luego buscar por el patrón estándar /company/{tabId}
    return tabSections.find(tab => pathname?.startsWith(`/company/${tab.id}`))
  }
  
  const currentTab = findCurrentTab() || tabSections[0]

  const currentTabId = currentTab?.id || 'dashboard'
  
  const [activeTab, setActiveTab] = useState<string>(currentTabId)
  const [showSubmenu, setShowSubmenu] = useState<{[key: string]: boolean}>({ [currentTabId]: true })

  const activeSection = tabSections.find(tab => tab.id === activeTab) || currentTab || tabSections[0]

  // Sincronizar activeTab con la URL actual
  useEffect(() => {
    if (currentTabId) {
      setActiveTab(currentTabId)
      setShowSubmenu({ [currentTabId]: true })
    }
  }, [currentTabId])

  // Función para cambiar de categoría y navegar al primer submenú
  const handleTabChange = (tab: TabSection) => {
    // Si es la misma pestaña, solo toggle el submenú
    if (activeTab === tab.id) {
      setShowSubmenu(prev => ({ [tab.id]: !prev[tab.id] }))
      return
    }
    
    // Cambiar a la nueva pestaña y navegar al primer submenú
    setActiveTab(tab.id)
    setShowSubmenu({ [tab.id]: true })
    
    // Navegar automáticamente al primer submenú de esa categoría
    if (tab.submenus.length > 0) {
      router.push(tab.submenus[0].href)
    }
  }

  // Return condicional DESPUÉS de todos los hooks
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
            
            {/* Botón para salir al menú principal */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Menú Principal</span>
            </button>
          </div>
        </div>

        {/* Barra de pestañas horizontal */}
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            <nav className="flex space-x-1 px-4 py-1" aria-label="Tabs">
              {tabSections.map((tab) => {
                const Icon = tab.icon
                const isActive = currentTab.id === tab.id
                const isSubmenuOpen = showSubmenu[tab.id] || false
                
                // Colores específicos por categoría
                const colorClasses: Record<string, { active: string; hover: string; icon: string; bg: string }> = {
                  blue: { active: 'border-blue-500 text-blue-700 bg-blue-50', hover: 'hover:bg-blue-50 hover:text-blue-600', icon: 'text-blue-500', bg: 'bg-blue-500' },
                  green: { active: 'border-green-500 text-green-700 bg-green-50', hover: 'hover:bg-green-50 hover:text-green-600', icon: 'text-green-500', bg: 'bg-green-500' },
                  purple: { active: 'border-purple-500 text-purple-700 bg-purple-50', hover: 'hover:bg-purple-50 hover:text-purple-600', icon: 'text-purple-500', bg: 'bg-purple-500' },
                  red: { active: 'border-red-500 text-red-700 bg-red-50', hover: 'hover:bg-red-50 hover:text-red-600', icon: 'text-red-500', bg: 'bg-red-500' },
                  orange: { active: 'border-orange-500 text-orange-700 bg-orange-50', hover: 'hover:bg-orange-50 hover:text-orange-600', icon: 'text-orange-500', bg: 'bg-orange-500' },
                  cyan: { active: 'border-cyan-500 text-cyan-700 bg-cyan-50', hover: 'hover:bg-cyan-50 hover:text-cyan-600', icon: 'text-cyan-500', bg: 'bg-cyan-500' },
                  indigo: { active: 'border-indigo-500 text-indigo-700 bg-indigo-50', hover: 'hover:bg-indigo-50 hover:text-indigo-600', icon: 'text-indigo-500', bg: 'bg-indigo-500' },
                  emerald: { active: 'border-emerald-500 text-emerald-700 bg-emerald-50', hover: 'hover:bg-emerald-50 hover:text-emerald-600', icon: 'text-emerald-500', bg: 'bg-emerald-500' },
                  violet: { active: 'border-violet-500 text-violet-700 bg-violet-50', hover: 'hover:bg-violet-50 hover:text-violet-600', icon: 'text-violet-500', bg: 'bg-violet-500' },
                  pink: { active: 'border-pink-500 text-pink-700 bg-pink-50', hover: 'hover:bg-pink-50 hover:text-pink-600', icon: 'text-pink-500', bg: 'bg-pink-500' },
                  teal: { active: 'border-teal-500 text-teal-700 bg-teal-50', hover: 'hover:bg-teal-50 hover:text-teal-600', icon: 'text-teal-500', bg: 'bg-teal-500' },
                  yellow: { active: 'border-yellow-500 text-yellow-700 bg-yellow-50', hover: 'hover:bg-yellow-50 hover:text-yellow-600', icon: 'text-yellow-600', bg: 'bg-yellow-500' },
                  amber: { active: 'border-amber-500 text-amber-700 bg-amber-50', hover: 'hover:bg-amber-50 hover:text-amber-600', icon: 'text-amber-500', bg: 'bg-amber-500' },
                  fuchsia: { active: 'border-fuchsia-500 text-fuchsia-700 bg-fuchsia-50', hover: 'hover:bg-fuchsia-50 hover:text-fuchsia-600', icon: 'text-fuchsia-500', bg: 'bg-fuchsia-500' },
                  gray: { active: 'border-gray-500 text-gray-700 bg-gray-100', hover: 'hover:bg-gray-100 hover:text-gray-600', icon: 'text-gray-500', bg: 'bg-gray-500' },
                }
                
                const colors = colorClasses[tab.color] || colorClasses.blue
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab)}
                    className={cn(
                      'group relative flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap border-b-3',
                      isActive
                        ? `${colors.active} border-b-4 shadow-sm`
                        : `border-transparent text-gray-500 ${colors.hover}`
                    )}
                  >
                    {/* Indicador de pestaña activa */}
                    {isActive && (
                      <span className={`absolute -bottom-0.5 left-0 right-0 h-1 ${colors.bg} rounded-t-full`} />
                    )}
                    
                    <Icon className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      isActive ? colors.icon : 'text-gray-400 group-hover:scale-110'
                    )} />
                    <span className="font-semibold">{tab.name}</span>
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isSubmenuOpen ? 'rotate-180' : '',
                      isActive ? colors.icon : 'text-gray-400'
                    )} />
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Submenú desplegable con diseño mejorado */}
        {showSubmenu[activeTab] && (
          <div className={cn(
            'border-t-2 shadow-lg transition-all duration-300',
            activeSection.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200' :
            activeSection.color === 'green' ? 'bg-gradient-to-r from-green-50 to-white border-green-200' :
            activeSection.color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200' :
            activeSection.color === 'red' ? 'bg-gradient-to-r from-red-50 to-white border-red-200' :
            activeSection.color === 'cyan' ? 'bg-gradient-to-r from-cyan-50 to-white border-cyan-200' :
            activeSection.color === 'indigo' ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-200' :
            activeSection.color === 'emerald' ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200' :
            activeSection.color === 'violet' ? 'bg-gradient-to-r from-violet-50 to-white border-violet-200' :
            activeSection.color === 'pink' ? 'bg-gradient-to-r from-pink-50 to-white border-pink-200' :
            activeSection.color === 'teal' ? 'bg-gradient-to-r from-teal-50 to-white border-teal-200' :
            activeSection.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' :
            activeSection.color === 'amber' ? 'bg-gradient-to-r from-amber-50 to-white border-amber-200' :
            activeSection.color === 'fuchsia' ? 'bg-gradient-to-r from-fuchsia-50 to-white border-fuchsia-200' :
            activeSection.color === 'gray' ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200' :
            'bg-gradient-to-r from-blue-50 to-white border-blue-200'
          )}>
            {/* Título de la sección actual */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <activeSection.icon className={cn(
                  'w-5 h-5',
                  activeSection.color === 'blue' ? 'text-blue-600' :
                  activeSection.color === 'green' ? 'text-green-600' :
                  activeSection.color === 'purple' ? 'text-purple-600' :
                  activeSection.color === 'red' ? 'text-red-600' :
                  activeSection.color === 'cyan' ? 'text-cyan-600' :
                  activeSection.color === 'indigo' ? 'text-indigo-600' :
                  activeSection.color === 'emerald' ? 'text-emerald-600' :
                  activeSection.color === 'violet' ? 'text-violet-600' :
                  activeSection.color === 'pink' ? 'text-pink-600' :
                  activeSection.color === 'teal' ? 'text-teal-600' :
                  activeSection.color === 'yellow' ? 'text-yellow-600' :
                  activeSection.color === 'amber' ? 'text-amber-600' :
                  activeSection.color === 'fuchsia' ? 'text-fuchsia-600' :
                  'text-gray-600'
                )} />
                <span className="text-sm font-bold text-gray-700">{activeSection.name}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{activeSection.submenus.length} opciones</span>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeSection.submenus.map((submenu, index) => {
                  const isCurrentPage = currentUrl === submenu.href || pathname === submenu.href
                  
                  // Colores para el submenú activo
                  const submenuActiveClasses: Record<string, string> = {
                    blue: 'bg-blue-100 border-blue-400 ring-2 ring-blue-200',
                    green: 'bg-green-100 border-green-400 ring-2 ring-green-200',
                    purple: 'bg-purple-100 border-purple-400 ring-2 ring-purple-200',
                    red: 'bg-red-100 border-red-400 ring-2 ring-red-200',
                    cyan: 'bg-cyan-100 border-cyan-400 ring-2 ring-cyan-200',
                    indigo: 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-200',
                    emerald: 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-200',
                    violet: 'bg-violet-100 border-violet-400 ring-2 ring-violet-200',
                    pink: 'bg-pink-100 border-pink-400 ring-2 ring-pink-200',
                    teal: 'bg-teal-100 border-teal-400 ring-2 ring-teal-200',
                    yellow: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200',
                    amber: 'bg-amber-100 border-amber-400 ring-2 ring-amber-200',
                    fuchsia: 'bg-fuchsia-100 border-fuchsia-400 ring-2 ring-fuchsia-200',
                    gray: 'bg-gray-100 border-gray-400 ring-2 ring-gray-200',
                  }

                  const submenuTextClasses: Record<string, string> = {
                    blue: 'text-blue-700',
                    green: 'text-green-700',
                    purple: 'text-purple-700',
                    red: 'text-red-700',
                    cyan: 'text-cyan-700',
                    indigo: 'text-indigo-700',
                    emerald: 'text-emerald-700',
                    violet: 'text-violet-700',
                    pink: 'text-pink-700',
                    teal: 'text-teal-700',
                    yellow: 'text-yellow-700',
                    amber: 'text-amber-700',
                    fuchsia: 'text-fuchsia-700',
                    gray: 'text-gray-700',
                  }
                  
                  return (
                    <Link
                      key={submenu.href}
                      href={submenu.href}
                      className={cn(
                        'group relative p-3 rounded-xl border-2 transition-all duration-200',
                        isCurrentPage
                          ? `${submenuActiveClasses[activeSection.color] || submenuActiveClasses.blue} shadow-md transform scale-[1.02]`
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
                      )}
                    >
                      {/* Indicador de página actual */}
                      {isCurrentPage && (
                        <div className={cn(
                          'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center',
                          activeSection.color === 'blue' ? 'bg-blue-500' :
                          activeSection.color === 'green' ? 'bg-green-500' :
                          activeSection.color === 'purple' ? 'bg-purple-500' :
                          activeSection.color === 'red' ? 'bg-red-500' :
                          activeSection.color === 'cyan' ? 'bg-cyan-500' :
                          activeSection.color === 'indigo' ? 'bg-indigo-500' :
                          activeSection.color === 'emerald' ? 'bg-emerald-500' :
                          activeSection.color === 'violet' ? 'bg-violet-500' :
                          activeSection.color === 'pink' ? 'bg-pink-500' :
                          activeSection.color === 'teal' ? 'bg-teal-500' :
                          activeSection.color === 'yellow' ? 'bg-yellow-500' :
                          activeSection.color === 'amber' ? 'bg-amber-500' :
                          activeSection.color === 'fuchsia' ? 'bg-fuchsia-500' :
                          'bg-gray-500'
                        )}>
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                      
                      {/* Número de orden */}
                      <span className={cn(
                        'absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        isCurrentPage 
                          ? `${submenuTextClasses[activeSection.color] || 'text-blue-700'} bg-white/60`
                          : 'text-gray-400 bg-gray-100'
                      )}>
                        {index + 1}
                      </span>
                      
                      <div className={cn(
                        'text-sm font-semibold mb-1 mt-3',
                        isCurrentPage 
                          ? submenuTextClasses[activeSection.color] || 'text-blue-700'
                          : 'text-gray-800 group-hover:text-gray-900'
                      )}>
                        {submenu.name}
                      </div>
                      {submenu.description && (
                        <div className={cn(
                          'text-xs leading-tight',
                          isCurrentPage ? 'text-gray-600' : 'text-gray-500'
                        )}>
                          {submenu.description}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="max-w-full">
        {children}
      </main>

      {/* AI Assistant flotante disponible en todas las páginas de company */}
      {/* <FloatingAssistant /> */}
      
      {/* Actualizaciones en tiempo real */}
      {/* Temporalmente desactivado para evitar rebuilds constantes */}
      {/* <RealTimeUpdates /> */}
    </div>
  )
}

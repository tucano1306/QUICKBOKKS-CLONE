'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Building2,
  Receipt,
  ChevronDown,
  Calculator,
  FolderKanban,
  ShoppingCart,
  FileCheck,
  Activity,
  Target,
  Zap,
  Brain,
  Home,
  Wrench,
  ArrowLeftRight,
  ArrowLeft,
  Plus,
  Search,
  Bell,
  HelpCircle,
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Menu,
  ChevronRight,
  Server,
  Terminal
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
      { name: '🚗 Depreciación de Activos', href: '/company/accounting/depreciation', description: 'Calcular depreciación de vehículos y activos' },
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
  {
    id: 'transactions',
    name: 'Transacciones',
    icon: ArrowLeftRight,
    color: 'emerald',
    submenus: [
      { name: 'Todas las Transacciones', href: '/company/transactions', description: 'Ingresos y gastos registrados por AI' },
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
      { name: 'Conciliación', href: '/company/banking/reconciliation', description: 'Cuadrar saldos' },
      { name: '🔄 Reglas Bancarias', href: '/company/banking/rules', description: 'Auto-categorizar transacciones' },
      { name: '📦 Operaciones en Lote', href: '/company/banking/batch', description: 'Procesar múltiples transacciones' }
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
      { name: '📊 TPARS', href: '/company/reports/tpars', description: 'Reporte anual de pagos gravables' },
      { name: '📁 Grupos de Reportes', href: '/company/reports/groups', description: 'Organizar reportes' },
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
    id: 'devops',
    name: 'DevOps',
    icon: Server,
    color: 'cyan',
    submenus: [
      { name: '🖥️ Terminal', href: '/company/devops', description: 'Terminal de comandos' },
      { name: '🔍 SonarQube', href: '/company/devops?tab=sonarqube', description: 'Análisis de código' },
      { name: '📊 Prometheus', href: '/company/devops?tab=prometheus', description: 'Métricas en tiempo real' }
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
      { name: '📋 Plantillas de Facturas', href: '/company/settings/invoicing/templates', description: 'Personalizar plantillas' },
      { name: '🏷️ Seguimiento (Clases)', href: '/company/settings/tracking', description: 'Clases y ubicaciones' },
      { name: 'Seguridad', href: '/company/settings/security', description: 'Protección de datos' },
      { name: 'Backups', href: '/company/settings/backups', description: 'Respaldos automáticos' }
    ]
  }
]

export default function CompanyTabsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { activeCompany } = useCompany()
  const { data: session } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Filtrar las secciones de tabs basado en el rol del usuario
  const filteredTabSections = tabSections.filter(tab => {
    // Mostrar DevOps solo si el usuario es DEVELOPER
    if (tab.id === 'devops') {
      return session?.user?.role === 'DEVELOPER'
    }
    return true
  })
  
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
        return filteredTabSections.find(tab => tab.id === tabId)
      }
    }
    // Luego buscar por el patrón estándar /company/{tabId}
    return filteredTabSections.find(tab => pathname?.startsWith(`/company/${tab.id}`))
  }
  
  const currentTab = findCurrentTab() || filteredTabSections[0]

  const currentTabId = currentTab?.id || 'dashboard'
  
  const [activeTab, setActiveTab] = useState<string>(currentTabId)
  const [showSubmenu, setShowSubmenu] = useState<{[key: string]: boolean}>({ [currentTabId]: true })
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mobileExpandedTab, setMobileExpandedTab] = useState<string | null>(currentTabId)

  // Quick Create menu items (como QuickBooks + New)
  const quickCreateItems = [
    { name: 'Invoice', href: '/company/invoicing/invoices/new', icon: FileText, color: 'text-blue-600' },
    { name: 'Expense', href: '/company/expenses/new', icon: Receipt, color: 'text-red-600' },
    { name: 'Customer', href: '/company/customers/new', icon: Users, color: 'text-green-600' },
    { name: 'Vendor', href: '/company/vendors/new', icon: ShoppingCart, color: 'text-purple-600' },
    { name: 'Bill', href: '/company/vendors/payables/new', icon: FileCheck, color: 'text-orange-600' },
    { name: 'Journal Entry', href: '/company/accounting/journal-entries/new', icon: Calculator, color: 'text-indigo-600' },
  ]

  // Notifications data - Mensaje informativo (sin datos mock)
  const notifications: { id: number; title: string; description: string; time: string; type: 'warning' | 'success' | 'info'; read: boolean }[] = []

  // Help menu items
  const helpItems = [
    { name: 'Help Center', description: 'Browse help articles', href: '#', icon: HelpCircle },
    { name: 'Video Tutorials', description: 'Watch how-to videos', href: '#', icon: Activity },
    { name: 'Keyboard Shortcuts', description: 'Work faster with shortcuts', href: '#', icon: Zap },
    { name: 'Contact Support', description: 'Get help from our team', href: '#', icon: Users },
    { name: 'What\'s New', description: 'See latest features', href: '#', icon: Sparkles },
  ]


  const activeSection = filteredTabSections.find(tab => tab.id === activeTab) || currentTab || filteredTabSections[0]

  // Sincronizar activeTab con la URL actual - SIEMPRE que cambie la URL
  useEffect(() => {
    if (currentTabId && currentTabId !== activeTab) {
      setActiveTab(currentTabId)
      setShowSubmenu({ [currentTabId]: true })
      setMobileExpandedTab(currentTabId)
    }
  }, [currentTabId, activeTab])

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
      <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center">
        <div className="text-center qb-animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-[#0D2942] flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0D2942] mb-2">
            Select a Company
          </h2>
          <p className="text-gray-500">
            Use the selector in the sidebar to choose a company
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F8]">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#0D2942] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {activeCompany.logo ? (
                  <Image
                    src={activeCompany.logo}
                    alt={activeCompany.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2CA01C] to-[#108000] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {activeCompany.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-sm truncate">{activeCompany.name}</h3>
                  <p className="text-white/60 text-xs">Menu</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Acciones Rápidas</p>
              <div className="grid grid-cols-3 gap-1.5">
                {quickCreateItems.slice(0, 3).map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href)
                      setShowMobileMenu(false)
                    }}
                    className="flex flex-col items-center gap-0.5 p-2 bg-white rounded-lg border border-gray-200 hover:border-[#2CA01C] hover:shadow-sm transition-all"
                  >
                    <item.icon className={cn('w-4 h-4', item.color)} />
                    <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Navigation - Scrollable */}
            <nav className="flex-1 overflow-y-auto p-2">
              {filteredTabSections.map((tab) => {
                const Icon = tab.icon
                const isExpanded = mobileExpandedTab === tab.id
                const isActiveTab = currentTab.id === tab.id
                
                return (
                  <div key={tab.id} className="mb-1">
                    <button
                      onClick={() => setMobileExpandedTab(isExpanded ? null : tab.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg transition-all',
                        isActiveTab 
                          ? 'bg-green-50 text-[#2CA01C]' 
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-5 h-5', isActiveTab ? 'text-[#2CA01C]' : 'text-gray-500')} />
                        <span className="font-medium text-sm">{tab.name}</span>
                      </div>
                      <ChevronRight className={cn(
                        'w-4 h-4 text-gray-400 transition-transform',
                        isExpanded && 'rotate-90'
                      )} />
                    </button>
                    
                    {/* Submenus */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-4">
                        {tab.submenus.map((submenu) => {
                          const isCurrentPage = currentUrl === submenu.href || pathname === submenu.href
                          return (
                            <Link
                              key={submenu.href}
                              href={submenu.href}
                              onClick={() => setShowMobileMenu(false)}
                              className={cn(
                                'block py-2.5 px-3 rounded-lg text-sm transition-all',
                                isCurrentPage
                                  ? 'bg-[#2CA01C] text-white font-medium'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              )}
                            >
                              {submenu.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
            
            {/* Bottom Actions - Fixed */}
            <div className="flex-shrink-0 p-2 bg-white border-t border-gray-200">
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    router.push('/company/settings/company')
                    setShowMobileMenu(false)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-200 transition-colors"
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Settings</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/dashboard')
                    setShowMobileMenu(false)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-[#0D2942] text-white rounded-lg font-medium text-xs hover:bg-[#1a3a5c] transition-colors"
                >
                  <Home className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Main Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra superior estilo QuickBooks */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile: Back Button + Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
            
            {/* Left: Company info */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {activeCompany.logo ? (
                <Image
                  src={activeCompany.logo}
                  alt={activeCompany.name}
                  width={40}
                  height={40}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-[#2CA01C] to-[#108000] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-lg flex-shrink-0">
                  {activeCompany.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm md:text-lg font-bold text-[#0D2942] truncate">
                  {activeCompany.name}
                </h2>
              </div>
            </div>

            {/* Center: + New Button (QuickBooks style) - Hidden on mobile */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-[#2CA01C] hover:bg-[#108000] text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline">New</span>
                <ChevronDown className={cn('w-3 h-3 md:w-4 md:h-4 transition-transform', showCreateMenu && 'rotate-180')} />
              </button>
              
              {/* Quick Create Dropdown */}
              {showCreateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} aria-hidden="true" />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Create New</p>
                    </div>
                    {quickCreateItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          router.push(item.href)
                          setShowCreateMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <item.icon className={cn('w-5 h-5', item.color)} />
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: Search, Help, Notifications, Settings, Main Menu */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Search Bar - Hidden on mobile */}
              <div className="relative hidden md:block">
                {showSearch ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions, reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C] focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => { setShowSearch(false); setSearchQuery('') }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
                    title="Search"
                  >
                    <Search className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              {/* Help - Hidden on small mobile */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setShowHelp(!showHelp); setShowNotifications(false) }}
                  className={cn(
                    "p-2.5 rounded-full transition-colors",
                    showHelp ? "bg-gray-200" : "hover:bg-gray-100"
                  )}
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                </button>

                {/* Help Dropdown */}
                {showHelp && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowHelp(false)} aria-hidden="true" />
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-[#0D2942]">Help & Support</p>
                        <p className="text-xs text-gray-500">Get help using COMPUTOPLUS</p>
                      </div>
                      {helpItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setShowHelp(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <item.icon className="w-4 h-4 text-[#0077C5]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-2 pt-2 px-4 pb-2">
                        <a 
                          href="https://quickbooks.intuit.com/learn-support/" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-[#0077C5] hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit QuickBooks Community
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Notifications - Hidden on small mobile */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowHelp(false) }}
                  className={cn(
                    "p-2.5 rounded-full transition-colors relative",
                    showNotifications ? "bg-gray-200" : "hover:bg-gray-100"
                  )}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden="true" />
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#0D2942]">Notifications</p>
                          <p className="text-xs text-gray-500">{notifications.length} notifications</p>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => setShowNotifications(false)}
                              className={cn(
                                "w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50",
                                !notif.read && "bg-blue-50/50"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                notif.type === 'warning' && "bg-amber-100",
                                notif.type === 'success' && "bg-green-100",
                                notif.type === 'info' && "bg-blue-100"
                              )}>
                                {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                                {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                {notif.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm text-gray-800 truncate",
                                  !notif.read && "font-medium"
                                )}>{notif.title}</p>
                                <p className="text-xs text-gray-500 truncate">{notif.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-[#0077C5] rounded-full mt-2"></div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="py-8 text-center">
                            <Bell className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No notifications</p>
                            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>


              {/* Settings - Hidden on small mobile */}
              <button
                onClick={() => router.push('/company/settings/company')}
                className="p-2.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:block"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* Divider - Hidden on mobile */}
              <div className="w-px h-8 bg-gray-200 mx-1 hidden md:block"></div>

              {/* Main Menu Button */}
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-[#0D2942] hover:bg-[#1a3a5c] text-white rounded-lg transition-all duration-200 font-medium text-xs md:text-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Main Menu</span>
              </button>

              {/* Mobile + New Button - Only visible on mobile */}
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="sm:hidden flex items-center justify-center p-2 bg-[#2CA01C] hover:bg-[#108000] text-white rounded-lg transition-all duration-200 active:scale-[0.98]"
                title="Create New"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de pestañas horizontal - Hidden on mobile */}
      <div className="bg-gradient-to-r from-[#0D2942] to-[#1a3a5c] hidden lg:block shadow-lg">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-500/30 scrollbar-track-transparent">
          <nav className="flex space-x-0.5 px-4 py-1.5" aria-label="Tabs">
              {filteredTabSections.map((tab) => {
                const Icon = tab.icon
                const isActive = currentTab.id === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab)}
                    className={cn(
                      'group relative flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap',
                      isActive
                        ? 'bg-white text-[#0D2942] shadow-md'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {/* Indicador activo superior */}
                    {isActive && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#2CA01C] rounded-full" />
                    )}
                    
                    <Icon className={cn(
                      'w-4 h-4 transition-all duration-200',
                      isActive ? 'text-[#2CA01C]' : 'text-white/70 group-hover:text-white'
                    )} />
                    <span className="hidden xl:inline">{tab.name}</span>
                    
                    {/* Badge de submenús */}
                    <span className={cn(
                      'hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                      isActive 
                        ? 'bg-[#2CA01C]/10 text-[#2CA01C]' 
                        : 'bg-white/10 text-white/60'
                    )}>
                      {tab.submenus.length}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Submenú desplegable con diseño mejorado - Hidden on mobile */}
        {showSubmenu[activeTab] && (
          <div className="border-t-2 border-[#2CA01C] bg-white shadow-xl hidden lg:block">
            {/* Título de la sección actual - Más destacado */}
            <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-white border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#2CA01C]/10">
                    <activeSection.icon className="w-5 h-5 text-[#2CA01C]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0D2942]">{activeSection.name}</h3>
                    <p className="text-xs text-gray-500">{activeSection.submenus.length} opciones disponibles</p>
                  </div>
                </div>
                {/* Breadcrumb actual */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Estás en:</span>
                  <span className="font-semibold text-[#2CA01C] bg-green-50 px-3 py-1 rounded-full">
                    {activeSection.submenus.find(s => currentUrl === s.href || pathname === s.href)?.name || 'Seleccionar opción'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3">
                {activeSection.submenus.map((submenu, index) => {
                  const isCurrentPage = currentUrl === submenu.href || pathname === submenu.href
                  
                  return (
                    <Link
                      key={submenu.href}
                      href={submenu.href}
                      className={cn(
                        'group relative p-2 lg:p-3 rounded-xl border-2 transition-all duration-200',
                        isCurrentPage
                          ? 'bg-[#2CA01C] border-[#2CA01C] text-white shadow-lg shadow-green-500/30 transform scale-[1.02]'
                          : 'bg-white border-gray-200 hover:border-[#2CA01C] hover:shadow-md hover:scale-[1.01]'
                      )}
                    >
                      {/* Indicador de página actual */}
                      {isCurrentPage && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-md">
                          <CheckCircle className="w-4 h-4 text-[#2CA01C]" />
                        </div>
                      )}
                      
                      {/* Número de orden */}
                      <span className={cn(
                        'absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        isCurrentPage 
                          ? 'text-white bg-white/20'
                          : 'text-gray-400 bg-gray-100 group-hover:bg-[#2CA01C]/10 group-hover:text-[#2CA01C]'
                      )}>
                        {index + 1}
                      </span>
                      
                      <div className={cn(
                        'text-xs lg:text-sm font-semibold mb-1 mt-3',
                        isCurrentPage 
                          ? 'text-white'
                          : 'text-gray-800 group-hover:text-[#2CA01C]'
                      )}>
                        {submenu.name}
                      </div>
                      {submenu.description && (
                        <div className={cn(
                          'text-xs leading-tight',
                          isCurrentPage ? 'text-white/80' : 'text-gray-500'
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

      {/* Mobile: Current page indicator - Mejorado */}
      <div className="lg:hidden bg-gradient-to-r from-[#0D2942] to-[#1a3a5c] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <currentTab.icon className="w-4 h-4 text-[#2CA01C]" />
            <span className="text-white/80 text-sm font-medium">{currentTab.name}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
          <span className="font-semibold text-white text-sm truncate flex-1 bg-[#2CA01C] px-3 py-1.5 rounded-lg">
            {activeSection.submenus.find(s => currentUrl === s.href || pathname === s.href)?.name || 'Menú'}
          </span>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-full bg-gray-50 min-h-[calc(100vh-200px)]">
        <div className="p-3 md:p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* AI Assistant flotante disponible en todas las páginas de company */}
      {/* <FloatingAssistant /> */}
      
      {/* Actualizaciones en tiempo real */}
      {/* Temporalmente desactivado para evitar rebuilds constantes */}
      {/* <RealTimeUpdates /> */}
    </div>
  )
}

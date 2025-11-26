'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard,
  Calculator,
  Receipt,
  Users,
  Building2,
  DollarSign,
  PieChart,
  FileText,
  TrendingUp,
  Zap,
  Target,
  Settings,
  ArrowRight,
  Sparkles,
  BarChart3,
  Wallet,
  ShoppingCart,
  FolderKanban,
  Brain,
  Bot
} from 'lucide-react'

interface QuickAccessCard {
  title: string
  description: string
  icon: any
  href: string
  color: string
  gradient: string
  featured?: boolean
}

export default function CompanyHomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const quickAccessCards: QuickAccessCard[] = [
    {
      title: 'Dashboard',
      description: 'Vista general de tu negocio con métricas y KPIs en tiempo real',
      icon: LayoutDashboard,
      href: '/company/dashboard',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      featured: true
    },
    {
      title: 'Contabilidad',
      description: 'Plan de cuentas, asientos contables y conciliaciones bancarias',
      icon: Calculator,
      href: '/company/accounting/chart-of-accounts',
      color: 'green',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Reportes',
      description: 'Balance General, Estado de Resultados y Flujo de Efectivo',
      icon: PieChart,
      href: '/company/reports/balance-sheet',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      featured: true
    },
    {
      title: 'Gastos',
      description: 'Registro y seguimiento de gastos con captura de recibos',
      icon: Receipt,
      href: '/company/expenses/list',
      color: 'red',
      gradient: 'from-red-500 to-rose-600'
    },
    {
      title: 'Clientes',
      description: 'Gestión de clientes y portal con upload de documentos IA',
      icon: Users,
      href: '/company/customers/list',
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      title: 'Nómina',
      description: 'Procesamiento de nómina Florida con RT-6, 941, 940, W-2',
      icon: DollarSign,
      href: '/company/payroll/florida',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Banca',
      description: 'Cuentas bancarias, transferencias y conciliaciones',
      icon: Building2,
      href: '/company/banking/accounts',
      color: 'indigo',
      gradient: 'from-indigo-500 to-blue-600'
    },
    {
      title: 'Facturación',
      description: 'Crear facturas, estimados y gestionar pagos recurrentes',
      icon: FileText,
      href: '/company/invoicing/invoices',
      color: 'orange',
      gradient: 'from-orange-500 to-amber-600'
    },
    {
      title: 'Proveedores',
      description: 'Cuentas por pagar y órdenes de compra a proveedores',
      icon: ShoppingCart,
      href: '/company/vendors/list',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      title: 'Proyectos',
      description: 'Job costing, tiempo facturable y análisis de rentabilidad',
      icon: FolderKanban,
      href: '/company/projects/list',
      color: 'pink',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      title: 'Presupuestos',
      description: 'Crear presupuestos y comparar con datos reales',
      icon: Target,
      href: '/company/budgets/vs-actual',
      color: 'fuchsia',
      gradient: 'from-fuchsia-500 to-pink-600'
    },
    {
      title: 'Impuestos',
      description: 'Información fiscal, deducciones y exportación TurboTax',
      icon: TrendingUp,
      href: '/company/taxes/info',
      color: 'teal',
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      title: 'IA & Automatización',
      description: 'Agente IA, predicciones y workflows automáticos',
      icon: Brain,
      href: '/company/ai-assistant',
      color: 'purple',
      gradient: 'from-purple-600 to-pink-600',
      featured: true
    },
    {
      title: 'Documentos IA',
      description: 'Revisión inteligente y reclasificación de documentos',
      icon: Bot,
      href: '/company/documents/review',
      color: 'blue',
      gradient: 'from-blue-600 to-indigo-600'
    }
  ]

  const featuredCards = quickAccessCards.filter(card => card.featured)
  const regularCards = quickAccessCards.filter(card => !card.featured)

  return (
    <CompanyTabsLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              Gestión Empresarial Inteligente
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Bienvenido a {activeCompany?.name || 'tu Empresa'}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecciona una sección para comenzar a gestionar tu negocio de manera eficiente
          </p>
        </div>

        {/* Featured Cards - Destacados */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900">Acceso Rápido</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCards.map((card) => {
              const Icon = card.icon
              return (
                <Card 
                  key={card.href}
                  className="group relative overflow-hidden border-2 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(card.href)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-xl mt-4">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Regular Cards - Todas las Secciones */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Todas las Secciones</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regularCards.map((card) => {
              const Icon = card.icon
              return (
                <Card 
                  key={card.href}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-gray-300"
                  onClick={() => router.push(card.href)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.gradient} shadow-md`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {card.title}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">14</div>
                <div className="text-sm text-gray-600 mt-1">Módulos Activos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">100%</div>
                <div className="text-sm text-gray-600 mt-1">Funcional</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">IA</div>
                <div className="text-sm text-gray-600 mt-1">Asistente Activo</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">24/7</div>
                <div className="text-sm text-gray-600 mt-1">Disponible</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Link */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => router.push('/company/settings/company')}
            className="gap-2"
          >
            <Settings className="w-5 h-5" />
            Configuración de Empresa
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

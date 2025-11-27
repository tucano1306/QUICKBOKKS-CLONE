'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Package,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  PieChart,
  Receipt,
  Building2,
  Home,
  ArrowRight,
  Sparkles
} from 'lucide-react'

export default function CompanyDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading' || !activeCompany) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const stats = [
    {
      name: 'Ingresos del Mes',
      value: '$124,500',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      name: 'Gastos del Mes',
      value: '$45,230',
      change: '+8.2%',
      trend: 'up',
      icon: TrendingDown,
      color: 'red'
    },
    {
      name: 'Clientes Activos',
      value: '156',
      change: '+5',
      trend: 'up',
      icon: Users,
      color: 'blue'
    },
    {
      name: 'Facturas Pendientes',
      value: '23',
      change: '-3',
      trend: 'down',
      icon: FileText,
      color: 'orange'
    }
  ]

  const recentActivity = [
    {
      type: 'invoice',
      description: 'Factura #1234 creada',
      amount: '$2,500',
      time: 'Hace 2 horas',
      customer: 'Juan Pérez'
    },
    {
      type: 'payment',
      description: 'Pago recibido',
      amount: '$5,000',
      time: 'Hace 4 horas',
      customer: 'María García'
    },
    {
      type: 'expense',
      description: 'Gasto registrado',
      amount: '$350',
      time: 'Hace 5 horas',
      customer: 'Office Supplies Inc.'
    }
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* ✨ NUEVA INTERFAZ MEJORADA ✨ */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <p className="font-semibold">¡Interfaz actualizada! Ahora con navegación rápida y diseño moderno</p>
          </div>
        </div>

        {/* Header con Acceso Rápido */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Dashboard - {activeCompany.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Resumen general de tu negocio en tiempo real
              </p>
            </div>
            <Button
              onClick={() => router.push('/company')}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
          </div>

          {/* Botones de Acceso Rápido */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Acceso Rápido a Secciones</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => router.push('/company/accounting/chart-of-accounts')}
                  variant="outline"
                  className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white hover:border-green-400 hover:shadow-md transition-all"
                >
                  <Calculator className="w-5 h-5 text-green-600" />
                  <div className="text-center">
                    <div className="text-xs font-semibold">Contabilidad</div>
                  </div>
                </Button>
                <Button
                  onClick={() => router.push('/company/reports/balance-sheet')}
                  variant="outline"
                  className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <PieChart className="w-5 h-5 text-purple-600" />
                  <div className="text-center">
                    <div className="text-xs font-semibold">Reportes</div>
                  </div>
                </Button>
                <Button
                  onClick={() => router.push('/company/expenses/list')}
                  variant="outline"
                  className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white hover:border-red-400 hover:shadow-md transition-all"
                >
                  <Receipt className="w-5 h-5 text-red-600" />
                  <div className="text-center">
                    <div className="text-xs font-semibold">Gastos</div>
                  </div>
                </Button>
                <Button
                  onClick={() => router.push('/company/banking/accounts')}
                  variant="outline"
                  className="h-auto py-3 px-4 flex-col gap-2 hover:bg-white hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div className="text-center">
                    <div className="text-xs font-semibold">Banca</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-full bg-${stat.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.name}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Gráficos y actividad reciente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de ingresos vs gastos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Ingresos vs Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Gráfico de líneas (próximamente)</p>
              </div>
            </CardContent>
          </Card>

          {/* Actividad reciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.customer}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {activity.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen de cuentas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                $45,200
              </div>
              <p className="text-sm text-gray-600">
                23 facturas pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                $12,800
              </div>
              <p className="text-sm text-gray-600">
                8 facturas pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                $89,450
              </div>
              <p className="text-sm text-gray-600">
                En todas las cuentas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

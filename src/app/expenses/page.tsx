'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PlusCircle,
  Receipt,
  CreditCard,
  TrendingUp,
  FileText,
  FolderOpen,
  DollarSign,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react'

export default function ExpensesPage() {
  const router = useRouter()

  const quickActions = [
    {
      title: 'Registrar Gasto',
      description: 'Crear un nuevo registro de gasto',
      icon: PlusCircle,
      color: 'bg-blue-500',
      action: () => router.push('/expenses/new')
    },
    {
      title: 'Subir Recibo',
      description: 'Cargar imagen de recibo',
      icon: Receipt,
      color: 'bg-green-500',
      action: () => router.push('/expenses/receipts/upload')
    },
    {
      title: 'Escanear OCR',
      description: 'Extraer datos automáticamente',
      icon: FileText,
      color: 'bg-purple-500',
      action: () => router.push('/expenses/receipts/scan')
    },
    {
      title: 'Tarjetas Corporativas',
      description: 'Sincronizar gastos de tarjetas',
      icon: CreditCard,
      color: 'bg-orange-500',
      action: () => router.push('/expenses/corporate-cards')
    }
  ]

  const managementActions = [
    {
      title: 'Lista de Gastos',
      description: 'Ver todos los gastos registrados',
      icon: FolderOpen,
      action: () => router.push('/expenses/list')
    },
    {
      title: 'Categorías',
      description: 'Administrar categorías de gastos',
      icon: Settings,
      action: () => router.push('/expenses/categories')
    },
    {
      title: 'Gastos Deducibles',
      description: 'Ver gastos deducibles de impuestos',
      icon: DollarSign,
      action: () => router.push('/expenses/deductible')
    },
    {
      title: 'Historial de Recibos',
      description: 'Ver recibos procesados',
      icon: Calendar,
      action: () => router.push('/expenses/receipts/history')
    },
    {
      title: 'Reportes',
      description: 'Análisis y estadísticas',
      icon: BarChart3,
      action: () => router.push('/expenses/reports')
    },
    {
      title: 'Por Clasificar',
      description: 'Gastos pendientes de clasificar',
      icon: TrendingUp,
      action: () => router.push('/expenses/classification')
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Gastos</h1>
          <p className="text-gray-600 mt-1">Administra todos tus gastos y recibos empresariales</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
              onClick={action.action}
            >
              <div className="flex items-start space-x-4">
                <div className={`${action.color} p-3 rounded-lg text-white`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Management Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Administración</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementActions.map((action, index) => (
            <Card
              key={index}
              className="p-5 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
              onClick={action.action}
            >
              <div className="flex items-center space-x-3">
                <action.icon className="h-5 w-5 text-gray-700" />
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-blue-600 font-medium">Este Mes</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">$0.00</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-green-600 font-medium">Deducibles</p>
              <p className="text-2xl font-bold text-green-900 mt-1">$0.00</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-purple-600 font-medium">Recibos</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">0</p>
            </div>
            <Receipt className="h-8 w-8 text-purple-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-orange-600 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">0</p>
            </div>
            <FileText className="h-8 w-8 text-orange-600 opacity-50" />
          </div>
        </Card>
      </div>
    </div>
  )
}

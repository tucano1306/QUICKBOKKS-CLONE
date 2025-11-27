'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, RefreshCw, Settings, List, TrendingUp } from 'lucide-react'

export default function CorporateCardsPage() {
  const router = useRouter()

  const cardActions = [
    {
      title: 'Sincronizar Tarjetas',
      description: 'Conectar con instituciones bancarias',
      icon: RefreshCw,
      color: 'bg-blue-500',
      action: () => alert('Funcionalidad en desarrollo')
    },
    {
      title: 'Ver Transacciones',
      description: 'Listado de gastos de tarjetas',
      icon: List,
      color: 'bg-green-500',
      action: () => alert('Funcionalidad en desarrollo')
    },
    {
      title: 'Reglas de Clasificación',
      description: 'Automatizar categorización',
      icon: Settings,
      color: 'bg-purple-500',
      action: () => alert('Funcionalidad en desarrollo')
    },
    {
      title: 'Asignar a Empleados',
      description: 'Gestionar tarjetas corporativas',
      icon: CreditCard,
      color: 'bg-orange-500',
      action: () => alert('Funcionalidad en desarrollo')
    }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarjetas Corporativas</h1>
          <p className="text-gray-600 text-sm">Sincroniza y gestiona gastos de tarjetas empresariales</p>
        </div>
      </div>

      {/* Card Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {cardActions.map((action, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
            onClick={action.action}
          >
            <div className="flex items-start space-x-4">
              <div className={`${action.color} p-3 rounded-lg text-white`}>
                <action.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-blue-600 font-medium">Tarjetas Activas</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">0</p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-green-600 font-medium">Transacciones Este Mes</p>
              <p className="text-2xl font-bold text-green-900 mt-1">0</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Gastado</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">$0.00</p>
            </div>
            <List className="h-8 w-8 text-purple-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="p-6 bg-orange-50 border-orange-200">
        <div className="flex items-start space-x-4">
          <CreditCard className="h-6 w-6 text-orange-600 mt-1" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-2">Beneficios de Tarjetas Corporativas</h3>
            <ul className="space-y-2 text-sm text-orange-800">
              <li>• <strong>Sincronización Automática:</strong> Importa transacciones directamente de tu banco</li>
              <li>• <strong>Clasificación Inteligente:</strong> Reglas automáticas para categorizar gastos</li>
              <li>• <strong>Control de Empleados:</strong> Asigna límites y monitorea uso de tarjetas</li>
              <li>• <strong>Conciliación Fácil:</strong> Reconcilia gastos con estados de cuenta bancarios</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

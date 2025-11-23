'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Package,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

interface StockAlert {
  id: string
  alertType: string
  threshold: number
  isActive: boolean
  isResolved: boolean
  notified: boolean
  createdAt: string
  resolvedAt?: string
  inventoryItem: {
    sku: string
    name: string
    quantity: number
    minStock: number
    maxStock: number
    unit: string
    warehouse: {
      name: string
    }
  }
}

const ALERT_CONFIGS = {
  LOW_STOCK: {
    icon: TrendingDown,
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    title: 'Stock Bajo',
  },
  OUT_OF_STOCK: {
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    title: 'Sin Stock',
  },
  OVERSTOCK: {
    icon: TrendingUp,
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    title: 'Exceso de Stock',
  },
  EXPIRING: {
    icon: Calendar,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    title: 'Por Vencer',
  },
  EXPIRED: {
    icon: AlertCircle,
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    title: 'Vencido',
  },
}

export default function AlertsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAlerts()
    }
  }, [status, filter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const url = filter === 'all'
        ? '/api/inventory/alerts'
        : `/api/inventory/alerts?type=${filter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (alertId: string) => {
    setResolving(alertId)
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/resolve`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchAlerts()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al resolver alerta')
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
      alert('Error al resolver alerta')
    } finally {
      setResolving(null)
    }
  }

  const activeAlerts = alerts.filter(a => !a.isResolved)
  const resolvedAlerts = alerts.filter(a => a.isResolved)

  const alertStats = {
    total: activeAlerts.length,
    LOW_STOCK: activeAlerts.filter(a => a.alertType === 'LOW_STOCK').length,
    OUT_OF_STOCK: activeAlerts.filter(a => a.alertType === 'OUT_OF_STOCK').length,
    OVERSTOCK: activeAlerts.filter(a => a.alertType === 'OVERSTOCK').length,
    EXPIRING: activeAlerts.filter(a => a.alertType === 'EXPIRING').length,
    EXPIRED: activeAlerts.filter(a => a.alertType === 'EXPIRED').length,
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Alertas de Inventario</h1>
          <p className="text-gray-600 mt-1">Monitoreo y gestión de alertas de stock</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card
            className={`p-4 cursor-pointer transition-all ${
              filter === 'all' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setFilter('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{alertStats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          {Object.entries(ALERT_CONFIGS).map(([type, config]) => {
            const Icon = config.icon
            const count = alertStats[type as keyof typeof alertStats]
            return (
              <Card
                key={type}
                className={`p-4 cursor-pointer transition-all ${
                  filter === type ? `ring-2 ring-${config.color}-500` : ''
                }`}
                onClick={() => setFilter(filter === type ? 'all' : type)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{config.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <Icon className={`h-8 w-8 text-${config.color}-500`} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Active Alerts */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Activas</h2>
          {activeAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay alertas activas
              </h3>
              <p className="text-gray-600">
                Todos los niveles de inventario están dentro de los parámetros normales
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => {
                const config = ALERT_CONFIGS[alert.alertType as keyof typeof ALERT_CONFIGS]
                const Icon = config.icon

                return (
                  <Card
                    key={alert.id}
                    className={`p-6 border-l-4 ${config.borderColor}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className={`p-3 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-6 w-6 ${config.textColor}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {alert.inventoryItem.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${config.bgColor} ${config.textColor}`}>
                              {config.title}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                SKU: {alert.inventoryItem.sku}
                              </span>
                              <span>
                                Almacén: {alert.inventoryItem.warehouse.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <span>
                                Stock Actual: {alert.inventoryItem.quantity} {alert.inventoryItem.unit}
                              </span>
                              {alert.alertType === 'LOW_STOCK' && (
                                <span>
                                  Mínimo: {alert.inventoryItem.minStock} {alert.inventoryItem.unit}
                                </span>
                              )}
                              {alert.alertType === 'OVERSTOCK' && (
                                <span>
                                  Máximo: {alert.inventoryItem.maxStock} {alert.inventoryItem.unit}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              Detectado: {new Date(alert.createdAt).toLocaleString('es-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolving === alert.id}
                      >
                        {resolving === alert.id ? 'Resolviendo...' : 'Resolver'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Resueltas</h2>
            <div className="space-y-4">
              {resolvedAlerts.slice(0, 10).map((alert) => {
                const config = ALERT_CONFIGS[alert.alertType as keyof typeof ALERT_CONFIGS]
                const Icon = config.icon

                return (
                  <Card key={alert.id} className="p-6 bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gray-200">
                        <Icon className="h-6 w-6 text-gray-500" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {alert.inventoryItem.name}
                          </h3>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            {config.title}
                          </span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div>SKU: {alert.inventoryItem.sku}</div>
                          <div className="text-xs text-gray-500">
                            Resuelto: {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleString('es-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

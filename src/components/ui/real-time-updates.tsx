'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card } from './card'
import { Badge } from './badge'
import { 
  CheckCircle, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  RefreshCw,
  X,
  Bell,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info
} from 'lucide-react'

interface FinancialUpdate {
  timestamp: string
  companyId: string
  companyName: string
  balance: {
    cash: number
    receivables: number
    payables: number
    netWorth: number
  }
  recentActivity: {
    newTransactions: number
    pendingInvoices: number
    unreconciledItems: number
  }
  alerts: Array<{
    type: 'info' | 'warning' | 'error'
    message: string
  }>
}

export default function RealTimeUpdates({ enabled = false }: { enabled?: boolean }) {
  const { activeCompany } = useCompany()
  const [financialData, setFinancialData] = useState<FinancialUpdate | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  useEffect(() => {
    // Solo conectar si está habilitado
    if (!enabled || !activeCompany?.id) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout

    const connect = () => {
      try {
        // Crear conexión SSE
        eventSource = new EventSource(`/api/realtime/financial-updates?companyId=${activeCompany.id}`)

        eventSource.onopen = () => {
          console.log('✅ Conexión SSE establecida')
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const data: FinancialUpdate = JSON.parse(event.data)
            setFinancialData(data)
            
            // Contar alertas nuevas
            if (data.alerts && data.alerts.length > 0) {
              setUnreadAlerts(prev => prev + data.alerts.length)
              
              // Mostrar notificación si está permitido
              if (Notification.permission === 'granted') {
                data.alerts.forEach(alert => {
                  new Notification(`${activeCompany.name} - ${alert.type.toUpperCase()}`, {
                    body: alert.message,
                    icon: '/favicon.ico',
                    tag: `alert-${Date.now()}`
                  })
                })
              }
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ Error en conexión SSE:', error)
          setIsConnected(false)
          eventSource?.close()
          
          // Intentar reconectar después de 5 segundos
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Intentando reconectar SSE...')
            connect()
          }, 5000)
        }
      } catch (error) {
        console.error('Error creating SSE connection:', error)
        setIsConnected(false)
      }
    }

    // Pedir permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Iniciar conexión
    connect()

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [activeCompany?.id])

  const clearAlerts = () => {
    setUnreadAlerts(0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return AlertTriangle
      case 'error':
        return X
      default:
        return Info
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      >
        <Sparkles className="w-6 h-6" />
        {unreadAlerts > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {unreadAlerts}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[500px] max-h-[700px] z-50">
      <Card className="shadow-2xl border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <div>
                <h3 className="font-bold">Dashboard Financiero</h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
                  {financialData && (
                    <>
                      <span className="mx-1">•</span>
                      <span>Actualizado hace {
                        Math.floor((new Date().getTime() - new Date(financialData.timestamp).getTime()) / 1000)
                      }s</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="hover:bg-white/20 p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto bg-gray-50 p-4 space-y-4">
          {!financialData ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-spin" />
              <p className="text-sm">Cargando datos financieros...</p>
            </div>
          ) : (
            <>
              {/* Balance Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Efectivo</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(financialData.balance.cash)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Por Cobrar</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(financialData.balance.receivables)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-medium">Por Pagar</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(financialData.balance.payables)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-medium">Patrimonio</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(financialData.balance.netWorth)}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Actividad Reciente (últimas 24h)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Nuevas Transacciones</span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      {financialData.recentActivity.newTransactions}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Facturas Pendientes</span>
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      {financialData.recentActivity.pendingInvoices}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sin Conciliar</span>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      {financialData.recentActivity.unreconciledItems}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {financialData.alerts && financialData.alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Alertas ({financialData.alerts.length})
                    </h4>
                    {unreadAlerts > 0 && (
                      <button
                        onClick={clearAlerts}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Marcar como leídas
                      </button>
                    )}
                  </div>
                  {financialData.alerts.map((alert, index) => {
                    const Icon = getAlertIcon(alert.type)
                    const colorClass = getAlertColor(alert.type)
                    
                    return (
                      <div key={index} className={`rounded-lg p-3 ${colorClass} border`}>
                        <div className="flex items-start gap-2">
                          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{alert.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Company Info */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                <p>{financialData.companyName}</p>
                <p className="mt-1">
                  Última actualización: {new Date(financialData.timestamp).toLocaleString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

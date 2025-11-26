'use client'

import { useState, useEffect } from 'react'
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
  ArrowRight
} from 'lucide-react'

interface Update {
  id: string
  type: 'document_approved' | 'account_reclassified' | 'balance_updated' | 'report_generated'
  title: string
  description: string
  timestamp: string
  metadata?: {
    documentName?: string
    amount?: number
    accountCode?: string
    reportType?: string
  }
  icon: 'check' | 'reclassify' | 'dollar' | 'chart'
  color: 'green' | 'purple' | 'blue' | 'orange'
}

export default function RealTimeUpdates() {
  const [updates, setUpdates] = useState<Update[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Simular actualizaciones en tiempo real
    const simulateUpdates = () => {
      const newUpdate: Update = {
        id: `update-${Date.now()}`,
        type: 'document_approved',
        title: 'Documento Aprobado',
        description: 'Factura_Amazon_Suministros_Nov25.pdf procesado',
        timestamp: new Date().toISOString(),
        metadata: {
          documentName: 'Factura_Amazon_Suministros_Nov25.pdf',
          amount: 986.00,
          accountCode: '5240'
        },
        icon: 'check',
        color: 'green'
      }

      setUpdates(prev => [newUpdate, ...prev].slice(0, 10)) // Máximo 10 actualizaciones
      setUnreadCount(prev => prev + 1)

      // Notificación del navegador (si está permitido)
      if (Notification.permission === 'granted') {
        new Notification('📄 Documento Procesado', {
          body: `${newUpdate.metadata?.documentName} ha sido aprobado y reflejado en el sistema`,
          icon: '/favicon.ico'
        })
      }
    }

    // Pedir permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Simular actualizaciones cada 15 segundos
    const interval = setInterval(simulateUpdates, 15000)

    // Primera actualización inmediata para demo
    setTimeout(simulateUpdates, 2000)

    return () => clearInterval(interval)
  }, [])

  const clearUpdate = (id: string) => {
    setUpdates(prev => prev.filter(u => u.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAll = () => {
    setUpdates([])
    setUnreadCount(0)
  }

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'check':
        return CheckCircle
      case 'reclassify':
        return RefreshCw
      case 'dollar':
        return DollarSign
      case 'chart':
        return TrendingUp
      default:
        return FileText
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] z-50">
      <Card className="shadow-2xl border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <h3 className="font-bold">Actualizaciones en Tiempo Real</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount} nuevas
                </Badge>
              )}
              <button
                onClick={() => setIsVisible(false)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Updates List */}
        <div className="max-h-[500px] overflow-y-auto bg-gray-50">
          {updates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay actualizaciones recientes</p>
              <p className="text-xs mt-1">Las nuevas actualizaciones aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {updates.map((update) => {
                const Icon = getIcon(update.icon)
                const colorClasses = getColorClasses(update.color)

                return (
                  <div key={update.id} className="p-4 hover:bg-white transition-colors relative group">
                    <button
                      onClick={() => clearUpdate(update.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>

                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {update.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {update.description}
                        </p>
                        
                        {update.metadata && (
                          <div className="space-y-1 text-xs text-gray-500">
                            {update.metadata.documentName && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span className="truncate">{update.metadata.documentName}</span>
                              </div>
                            )}
                            {update.metadata.amount && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="font-semibold text-green-600">
                                  ${update.metadata.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            {update.metadata.accountCode && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Cuenta: {update.metadata.accountCode}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(update.timestamp).toLocaleString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Impact Badge */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Balance Actualizado
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Reportes Actualizados
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {updates.length > 0 && (
          <div className="bg-white border-t border-gray-200 p-3">
            <button
              onClick={clearAll}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
            >
              Limpiar todas las notificaciones
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Card>

      {/* Indicador de sincronización */}
      <div className="mt-2 bg-white rounded-lg shadow-md p-2 flex items-center justify-center gap-2 text-xs text-gray-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Sincronización activa</span>
      </div>
    </div>
  )
}

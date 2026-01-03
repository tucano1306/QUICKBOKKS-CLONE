'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  ArrowLeft,
  Eye,
  Download,
  Clock,
  FileText,
  DollarSign,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ActivityLog {
  id: string
  action: string
  description: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

export default function CustomerActivityPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [customer, setCustomer] = useState<any>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated') {
      loadCustomerActivity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, params.id])

  const loadCustomerActivity = async () => {
    try {
      // Cargar datos del cliente
      const customerRes = await fetch(`/api/customers/${params.id}`)
      if (customerRes.ok) {
        const customerData = await customerRes.json()
        setCustomer(customerData)
      }

      // Cargar actividades del cliente desde API
      const activityRes = await fetch(`/api/customers/${params.id}/activity`)
      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivities(activityData.activities || [])
      }
    } catch (error) {
      console.error('Error loading activity:', error)
      toast.error('Error al cargar actividad')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <User className="h-4 w-4 text-blue-600" />
      case 'VIEW_INVOICE':
      case 'VIEW_STATEMENT':
        return <Eye className="h-4 w-4 text-purple-600" />
      case 'DOWNLOAD_PDF':
        return <Download className="h-4 w-4 text-green-600" />
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4 text-orange-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionBadge = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      LOGIN: 'default',
      VIEW_INVOICE: 'secondary',
      VIEW_STATEMENT: 'secondary',
      DOWNLOAD_PDF: 'default',
      PAYMENT: 'default'
    }
    return variants[action] || 'default'
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Actividad en Portal
            </h1>
            {customer && (
              <p className="text-gray-600 mt-1">
                {customer.name} - {customer.email}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Actividades</p>
                  <p className="text-2xl font-bold">{activities.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Último Acceso</p>
                  <p className="text-sm font-semibold mt-1">
                    {customer?.portalLastLogin
                      ? new Date(customer.portalLastLogin).toLocaleDateString('es-MX')
                      : 'Nunca'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Facturas Vistas</p>
                  <p className="text-2xl font-bold">
                    {activities.filter(a => a.action === 'VIEW_INVOICE').length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Descargas</p>
                  <p className="text-2xl font-bold">
                    {activities.filter(a => a.action === 'DOWNLOAD_PDF').length}
                  </p>
                </div>
                <Download className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Registro de Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>No hay actividad registrada</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="mt-1">{getActionIcon(activity.action)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionBadge(activity.action)}>
                          {activity.action.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(activity.timestamp).toLocaleString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      {activity.ipAddress && (
                        <p className="text-xs text-gray-500 mt-1">
                          IP: {activity.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

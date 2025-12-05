'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Download, 
  Upload, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Shield,
  HardDrive,
  Cloud,
  Settings,
  Play,
  Pause
} from 'lucide-react'

interface Backup {
  id: string
  type: string
  status: string
  size?: number
  createdAt: string
  completedAt?: string
  filePath?: string
  metadata?: any
  error?: string
}

interface BackupStats {
  total: number
  byStatus: { [key: string]: number }
  lastBackup?: string
  totalSize: number
}

interface BackupHealth {
  status: 'healthy' | 'warning' | 'critical'
  lastBackup: string | null
  lastBackupAgeHours: number | null
  totalBackups: number
  totalSize: number
  issues: string[]
}

interface BackupConfig {
  enabled: boolean
  schedule: {
    daily: { enabled: boolean; time: string; retention: number }
    weekly: { enabled: boolean; day: string; time: string; retention: number }
    monthly: { enabled: boolean; day: number; time: string; retention: number }
  }
  storage: {
    local: { enabled: boolean; path: string }
    s3: { enabled: boolean; bucket?: string }
  }
  compression: boolean
  encryption: boolean
  notifications: {
    email?: string
    onSuccess: boolean
    onFailure: boolean
  }
}

export default function BackupsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [loading, setLoading] = useState(true)
  const [backups, setBackups] = useState<Backup[]>([])
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [health, setHealth] = useState<BackupHealth | null>(null)
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [backupsRes, statsRes, healthRes, configRes] = await Promise.all([
        fetch('/api/backups?action=list'),
        fetch('/api/backups?action=stats'),
        fetch('/api/backups?action=health'),
        fetch('/api/backups?action=config')
      ])

      if (backupsRes.ok) {
        const data = await backupsRes.json()
        setBackups(data.backups || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (healthRes.ok) {
        const data = await healthRes.json()
        setHealth(data.health)
      }

      if (configRes.ok) {
        const data = await configRes.json()
        setConfig(data.config)
      }

    } catch (error) {
      console.error('Error fetching backup data:', error)
      setMessage({ type: 'error', text: 'Error al cargar datos de backups' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router, fetchData])

  const createBackup = async () => {
    try {
      setActionLoading('create')
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', type: 'FULL' })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Backup creado exitosamente' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al crear backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (!confirm('¿Está seguro de restaurar este backup? Esto sobrescribirá los datos actuales.')) {
      return
    }

    try {
      setActionLoading(backupId)
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupId })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Backup restaurado exitosamente' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al restaurar backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  const verifyBackup = async (backupId: string) => {
    try {
      setActionLoading(`verify-${backupId}`)
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', backupId })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ 
          type: data.valid ? 'success' : 'error', 
          text: data.valid ? '✅ Backup verificado correctamente' : '❌ El backup está corrupto' 
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al verificar backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm('¿Está seguro de eliminar este backup?')) {
      return
    }

    try {
      setActionLoading(`delete-${backupId}`)
      const response = await fetch(`/api/backups?id=${backupId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Backup eliminado' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  const runCleanup = async () => {
    try {
      setActionLoading('cleanup')
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', retentionDays: 30 })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: `✅ ${data.deletedCount} backups antiguos eliminados` })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error en limpieza' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completado</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Fallido</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> En progreso</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1" /> Saludable</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-4 h-4 mr-1" /> Advertencia</Badge>
      case 'critical':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1" /> Crítico</Badge>
      default:
        return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-7 h-7 text-blue-600" />
              Backups de Base de Datos
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión de respaldos automáticos y restauración
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={runCleanup} disabled={actionLoading === 'cleanup'}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Antiguos
            </Button>
            <Button onClick={createBackup} disabled={actionLoading === 'create'} className="bg-blue-600 hover:bg-blue-700">
              {actionLoading === 'create' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Crear Backup
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Health & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Health Status */}
          <Card className={`${health?.status === 'healthy' ? 'border-green-200 bg-green-50' : health?.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Estado del Sistema</span>
                <Shield className="w-5 h-5" />
              </div>
              {health && getHealthBadge(health.status)}
              {health?.issues && health.issues.length > 0 && (
                <ul className="mt-2 text-xs text-gray-600">
                  {health.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Total Backups */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Backups</span>
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500">
                {stats?.byStatus?.COMPLETED || 0} exitosos
              </div>
            </CardContent>
          </Card>

          {/* Storage Used */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Almacenamiento</span>
                <HardDrive className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</div>
              <div className="text-xs text-gray-500">
                en backups locales
              </div>
            </CardContent>
          </Card>

          {/* Last Backup */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Último Backup</span>
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-lg font-bold">
                {health?.lastBackup ? formatDate(health.lastBackup) : 'Nunca'}
              </div>
              {health?.lastBackupAgeHours && (
                <div className="text-xs text-gray-500">
                  Hace {health.lastBackupAgeHours} horas
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schedule Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Programación de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Diario</span>
                  <Badge className={config?.schedule.daily.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {config?.schedule.daily.enabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>⏰ {config?.schedule.daily.time || '02:00'}</p>
                  <p>📦 Retención: {config?.schedule.daily.retention || 7} días</p>
                </div>
              </div>

              {/* Weekly */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Semanal</span>
                  <Badge className={config?.schedule.weekly.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {config?.schedule.weekly.enabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>📅 {config?.schedule.weekly.day || 'Domingo'}</p>
                  <p>⏰ {config?.schedule.weekly.time || '03:00'}</p>
                  <p>📦 Retención: {config?.schedule.weekly.retention || 4} semanas</p>
                </div>
              </div>

              {/* Monthly */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Mensual</span>
                  <Badge className={config?.schedule.monthly.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {config?.schedule.monthly.enabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>📅 Día {config?.schedule.monthly.day || 1} del mes</p>
                  <p>⏰ {config?.schedule.monthly.time || '04:00'}</p>
                  <p>📦 Retención: {config?.schedule.monthly.retention || 12} meses</p>
                </div>
              </div>
            </div>

            {/* Storage & Security Info */}
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Local: {config?.storage.local.enabled ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">S3: {config?.storage.s3.enabled ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Encriptación: {config?.encryption ? '✅' : '❌'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Historial de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Fecha</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Estado</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Tamaño</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Duración</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        No hay backups registrados
                      </td>
                    </tr>
                  ) : (
                    backups.map((backup) => (
                      <tr key={backup.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="text-sm font-medium">{formatDate(backup.createdAt)}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{backup.type}</Badge>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(backup.status)}
                        </td>
                        <td className="p-3 text-sm">
                          {backup.size ? formatBytes(backup.size) : '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {backup.completedAt && backup.createdAt
                            ? `${Math.round((new Date(backup.completedAt).getTime() - new Date(backup.createdAt).getTime()) / 1000)}s`
                            : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {backup.status === 'COMPLETED' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => verifyBackup(backup.id)}
                                  disabled={actionLoading === `verify-${backup.id}`}
                                >
                                  <Shield className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => restoreBackup(backup.id)}
                                  disabled={actionLoading === backup.id}
                                >
                                  <Upload className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteBackup(backup.id)}
                              disabled={actionLoading === `delete-${backup.id}`}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

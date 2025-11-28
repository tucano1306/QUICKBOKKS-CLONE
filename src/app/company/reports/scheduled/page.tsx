'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  Calendar,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Plus,
  Eye,
  Trash2,
  FileText,
  Send,
  AlertCircle,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Bell,
  History
} from 'lucide-react'

interface ScheduledReport {
  id: string
  name: string
  reportType: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  schedule: string
  recipients: string[]
  format: 'PDF' | 'Excel' | 'CSV'
  status: 'active' | 'paused' | 'failed'
  lastRun?: string
  nextRun: string
  lastStatus?: 'success' | 'failed'
  createdBy: string
  createdDate: string
  runsCount: number
}

interface ReportHistory {
  id: string
  scheduledReportId: string
  reportName: string
  executionDate: string
  status: 'success' | 'failed' | 'pending'
  fileSize?: string
  recipients: number
  duration: string
  errorMessage?: string
}

export default function ScheduledReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'schedules' | 'history'>('schedules')
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all')
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([])

  const loadScheduledReports = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/scheduled?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setScheduledReports(data.schedules || [])
        setReportHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadScheduledReports()
  }, [loadScheduledReports])

  const filteredSchedules = scheduledReports.filter(report => {
    if (selectedFrequency !== 'all' && report.frequency !== selectedFrequency) return false
    return true
  })

  const stats = {
    total: scheduledReports.length,
    active: scheduledReports.filter(r => r.status === 'active').length,
    paused: scheduledReports.filter(r => r.status === 'paused').length,
    failed: scheduledReports.filter(r => r.status === 'failed').length,
    successRate: (reportHistory.filter(h => h.status === 'success').length / reportHistory.length * 100).toFixed(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Activo</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1"><Pause className="w-3 h-3" /> Pausado</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      'daily': 'Diario',
      'weekly': 'Semanal',
      'monthly': 'Mensual',
      'quarterly': 'Trimestral',
      'yearly': 'Anual'
    }
    return labels[frequency] || frequency
  }

  const getReportTypeIcon = (type: string) => {
    if (type.includes('Sales')) return <DollarSign className="w-5 h-5 text-green-600" />
    if (type.includes('Statement') || type.includes('Balance')) return <BarChart3 className="w-5 h-5 text-blue-600" />
    if (type.includes('Payroll')) return <Users className="w-5 h-5 text-purple-600" />
    if (type.includes('Cash')) return <TrendingUp className="w-5 h-5 text-teal-600" />
    if (type.includes('Tax')) return <FileText className="w-5 h-5 text-red-600" />
    return <FileText className="w-5 h-5 text-gray-600" />
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Reportes Programados</h1>
            <p className="text-gray-600 mt-1">
              Automatización y entrega programada de reportes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              Ver Historial
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Programado
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {stats.total}
              </div>
              <div className="text-sm text-blue-700">Total Programados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">
                {stats.active}
              </div>
              <div className="text-sm text-green-700">Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Pause className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {stats.paused}
              </div>
              <div className="text-sm text-yellow-700">Pausados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                {stats.failed}
              </div>
              <div className="text-sm text-red-700">Con Errores</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {stats.successRate}%
              </div>
              <div className="text-sm text-purple-700">Tasa de Éxito</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 font-semibold ${
              selectedTab === 'schedules'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setSelectedTab('schedules')}
          >
            Programaciones
          </button>
          <button
            className={`px-4 py-2 font-semibold ${
              selectedTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setSelectedTab('history')}
          >
            Historial de Ejecuciones
          </button>
        </div>

        {/* Schedules View */}
        {selectedTab === 'schedules' && (
          <>
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Frecuencia:
                  </label>
                  <select 
                    className="px-4 py-2 border rounded-lg"
                    value={selectedFrequency}
                    onChange={(e) => setSelectedFrequency(e.target.value)}
                  >
                    <option value="all">Todas</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Reports List */}
            <div className="space-y-4">
              {filteredSchedules.map((report) => {
                const nextRunDate = new Date(report.nextRun)
                const now = new Date()
                const hoursUntilNext = Math.floor((nextRunDate.getTime() - now.getTime()) / (1000 * 60 * 60))

                return (
                  <Card key={report.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {getReportTypeIcon(report.reportType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {report.schedule}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {report.recipients.length} destinatarios
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {report.format}
                              </span>
                              <span className="flex items-center gap-1">
                                <History className="w-3 h-3" /> {report.runsCount} ejecuciones
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getFrequencyLabel(report.frequency)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Última Ejecución</div>
                          {report.lastRun ? (
                            <>
                              <div className="text-sm font-semibold text-gray-900">
                                {new Date(report.lastRun).toLocaleString('es-MX')}
                              </div>
                              <div className="text-xs">
                                {report.lastStatus === 'success' ? (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Exitosa
                                  </span>
                                ) : (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Fallida
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500">Sin ejecuciones</div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Próxima Ejecución</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(report.nextRun).toLocaleString('es-MX')}
                          </div>
                          <div className={`text-xs ${
                            hoursUntilNext <= 24 ? 'text-orange-600 font-semibold' : 'text-gray-500'
                          }`}>
                            {hoursUntilNext < 0 
                              ? 'Vencida'
                              : hoursUntilNext === 0 
                              ? 'En menos de 1 hora'
                              : hoursUntilNext < 24
                              ? `En ${hoursUntilNext} horas`
                              : `En ${Math.floor(hoursUntilNext / 24)} días`
                            }
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Destinatarios</div>
                          <div className="text-xs text-gray-700 space-y-1">
                            {report.recipients.slice(0, 2).map((email, idx) => (
                              <div key={idx}>{email}</div>
                            ))}
                            {report.recipients.length > 2 && (
                              <div className="text-blue-600">
                                +{report.recipients.length - 2} más
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4 mr-1" /> Ejecutar Ahora
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" /> Vista Previa
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-1" /> Configurar
                        </Button>
                        {report.status === 'active' ? (
                          <Button size="sm" variant="outline">
                            <Pause className="w-4 h-4 mr-1" /> Pausar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4 mr-1" /> Activar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* History View */}
        {selectedTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ejecuciones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reporte</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha Ejecución</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tamaño</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Destinatarios</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Duración</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportHistory.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{history.reportName}</div>
                          <div className="text-xs text-gray-500">ID: {history.scheduledReportId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {new Date(history.executionDate).toLocaleDateString('es-MX')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(history.executionDate).toLocaleTimeString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {history.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> Exitosa
                            </Badge>
                          ) : history.status === 'failed' ? (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" /> Fallida
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <Clock className="w-3 h-3 mr-1" /> Pendiente
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-900">{history.fileSize || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{history.recipients}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm text-gray-700">{history.duration}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {history.status === 'success' && (
                              <>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Send className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {history.status === 'failed' && (
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Reportes Programados</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema de automatización de reportes con entrega programada y distribución por correo electrónico.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Frecuencias:</strong> Diaria, semanal, quincenal, mensual, trimestral, anual</li>
                  <li>• <strong>Horarios:</strong> Configuración precisa de día, hora y zona horaria</li>
                  <li>• <strong>Formatos:</strong> PDF (presentación), Excel (análisis), CSV (datos)</li>
                  <li>• <strong>Distribución:</strong> Envío automático por email a múltiples destinatarios</li>
                  <li>• <strong>Monitoreo:</strong> Registro de ejecuciones, tasa de éxito, alertas de fallos</li>
                  <li>• <strong>Beneficios:</strong> Ahorro de tiempo, consistencia, cumplimiento de entrega</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

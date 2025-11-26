'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const scheduledReports: ScheduledReport[] = [
    {
      id: 'SCH-001',
      name: 'Estado de Resultados Mensual',
      reportType: 'Income Statement',
      description: 'Estado de resultados consolidado enviado mensualmente a dirección',
      frequency: 'monthly',
      schedule: 'Día 5 de cada mes a las 08:00',
      recipients: ['ceo@company.com', 'cfo@company.com', 'controller@company.com'],
      format: 'PDF',
      status: 'active',
      lastRun: '2025-11-05T08:00:00',
      nextRun: '2025-12-05T08:00:00',
      lastStatus: 'success',
      createdBy: 'Patricia Ruiz',
      createdDate: '2025-01-15',
      runsCount: 11
    },
    {
      id: 'SCH-002',
      name: 'Balance General Trimestral',
      reportType: 'Balance Sheet',
      description: 'Balance general para cierre de trimestre con análisis de ratios',
      frequency: 'quarterly',
      schedule: 'Primer día del mes siguiente al cierre',
      recipients: ['cfo@company.com', 'board@company.com'],
      format: 'Excel',
      status: 'active',
      lastRun: '2025-10-01T09:00:00',
      nextRun: '2026-01-01T09:00:00',
      lastStatus: 'success',
      createdBy: 'Patricia Ruiz',
      createdDate: '2025-01-20',
      runsCount: 4
    },
    {
      id: 'SCH-003',
      name: 'Ventas Diarias',
      reportType: 'Sales Report',
      description: 'Reporte de ventas e ingresos del día anterior',
      frequency: 'daily',
      schedule: 'Todos los días a las 07:00',
      recipients: ['sales@company.com', 'ceo@company.com'],
      format: 'PDF',
      status: 'active',
      lastRun: '2025-11-25T07:00:00',
      nextRun: '2025-11-26T07:00:00',
      lastStatus: 'success',
      createdBy: 'Luis Rodríguez',
      createdDate: '2025-02-01',
      runsCount: 298
    },
    {
      id: 'SCH-004',
      name: 'Cuentas por Cobrar Semanal',
      reportType: 'AR Aging',
      description: 'Antigüedad de saldos y análisis de cobranza',
      frequency: 'weekly',
      schedule: 'Todos los lunes a las 08:30',
      recipients: ['collections@company.com', 'cfo@company.com'],
      format: 'Excel',
      status: 'active',
      lastRun: '2025-11-25T08:30:00',
      nextRun: '2025-12-02T08:30:00',
      lastStatus: 'success',
      createdBy: 'Ana García',
      createdDate: '2025-02-15',
      runsCount: 42
    },
    {
      id: 'SCH-005',
      name: 'Nómina Quincenal',
      reportType: 'Payroll Report',
      description: 'Reporte detallado de nómina con deducciones e impuestos',
      frequency: 'monthly',
      schedule: 'Días 15 y último del mes a las 10:00',
      recipients: ['hr@company.com', 'payroll@company.com', 'cfo@company.com'],
      format: 'PDF',
      status: 'active',
      lastRun: '2025-11-15T10:00:00',
      nextRun: '2025-11-30T10:00:00',
      lastStatus: 'success',
      createdBy: 'María López',
      createdDate: '2025-03-01',
      runsCount: 18
    },
    {
      id: 'SCH-006',
      name: 'Presupuesto vs Real Mensual',
      reportType: 'Budget vs Actual',
      description: 'Análisis de variaciones presupuestarias por departamento',
      frequency: 'monthly',
      schedule: 'Día 10 de cada mes a las 09:00',
      recipients: ['managers@company.com', 'cfo@company.com'],
      format: 'Excel',
      status: 'active',
      lastRun: '2025-11-10T09:00:00',
      nextRun: '2025-12-10T09:00:00',
      lastStatus: 'success',
      createdBy: 'Patricia Ruiz',
      createdDate: '2025-04-01',
      runsCount: 8
    },
    {
      id: 'SCH-007',
      name: 'Flujo de Efectivo Semanal',
      reportType: 'Cash Flow',
      description: 'Proyección de flujo de efectivo a 4 semanas',
      frequency: 'weekly',
      schedule: 'Todos los viernes a las 16:00',
      recipients: ['treasury@company.com', 'cfo@company.com'],
      format: 'PDF',
      status: 'active',
      lastRun: '2025-11-22T16:00:00',
      nextRun: '2025-11-29T16:00:00',
      lastStatus: 'success',
      createdBy: 'Patricia Ruiz',
      createdDate: '2025-05-01',
      runsCount: 28
    },
    {
      id: 'SCH-008',
      name: 'Rentabilidad por Proyecto',
      reportType: 'Project Profitability',
      description: 'Análisis de margen y ROI por proyecto activo',
      frequency: 'weekly',
      schedule: 'Todos los miércoles a las 11:00',
      recipients: ['projects@company.com', 'ceo@company.com'],
      format: 'Excel',
      status: 'paused',
      lastRun: '2025-11-13T11:00:00',
      nextRun: '2025-11-27T11:00:00',
      lastStatus: 'success',
      createdBy: 'Carlos Méndez',
      createdDate: '2025-06-15',
      runsCount: 22
    },
    {
      id: 'SCH-009',
      name: 'Indicadores Clave (KPIs)',
      reportType: 'KPI Dashboard',
      description: 'Dashboard ejecutivo con métricas principales del negocio',
      frequency: 'daily',
      schedule: 'Todos los días a las 06:30',
      recipients: ['executives@company.com'],
      format: 'PDF',
      status: 'active',
      lastRun: '2025-11-25T06:30:00',
      nextRun: '2025-11-26T06:30:00',
      lastStatus: 'success',
      createdBy: 'Sistema',
      createdDate: '2025-07-01',
      runsCount: 148
    },
    {
      id: 'SCH-010',
      name: 'Declaraciones Fiscales',
      reportType: 'Tax Reports',
      description: 'Recordatorio y resumen de obligaciones fiscales del mes',
      frequency: 'monthly',
      schedule: 'Día 1 de cada mes a las 08:00',
      recipients: ['accounting@company.com', 'tax@company.com'],
      format: 'PDF',
      status: 'failed',
      lastRun: '2025-11-01T08:00:00',
      nextRun: '2025-12-01T08:00:00',
      lastStatus: 'failed',
      createdBy: 'Patricia Ruiz',
      createdDate: '2025-08-01',
      runsCount: 4
    }
  ]

  const reportHistory: ReportHistory[] = [
    {
      id: 'HIST-001',
      scheduledReportId: 'SCH-003',
      reportName: 'Ventas Diarias',
      executionDate: '2025-11-25T07:00:00',
      status: 'success',
      fileSize: '2.4 MB',
      recipients: 2,
      duration: '12s'
    },
    {
      id: 'HIST-002',
      scheduledReportId: 'SCH-009',
      reportName: 'Indicadores Clave (KPIs)',
      executionDate: '2025-11-25T06:30:00',
      status: 'success',
      fileSize: '1.8 MB',
      recipients: 1,
      duration: '8s'
    },
    {
      id: 'HIST-003',
      scheduledReportId: 'SCH-004',
      reportName: 'Cuentas por Cobrar Semanal',
      executionDate: '2025-11-25T08:30:00',
      status: 'success',
      fileSize: '3.2 MB',
      recipients: 2,
      duration: '18s'
    },
    {
      id: 'HIST-004',
      scheduledReportId: 'SCH-007',
      reportName: 'Flujo de Efectivo Semanal',
      executionDate: '2025-11-22T16:00:00',
      status: 'success',
      fileSize: '1.5 MB',
      recipients: 2,
      duration: '10s'
    },
    {
      id: 'HIST-005',
      scheduledReportId: 'SCH-005',
      reportName: 'Nómina Quincenal',
      executionDate: '2025-11-15T10:00:00',
      status: 'success',
      fileSize: '4.8 MB',
      recipients: 3,
      duration: '25s'
    },
    {
      id: 'HIST-006',
      scheduledReportId: 'SCH-006',
      reportName: 'Presupuesto vs Real Mensual',
      executionDate: '2025-11-10T09:00:00',
      status: 'success',
      fileSize: '2.9 MB',
      recipients: 2,
      duration: '15s'
    },
    {
      id: 'HIST-007',
      scheduledReportId: 'SCH-001',
      reportName: 'Estado de Resultados Mensual',
      executionDate: '2025-11-05T08:00:00',
      status: 'success',
      fileSize: '3.5 MB',
      recipients: 3,
      duration: '20s'
    },
    {
      id: 'HIST-008',
      scheduledReportId: 'SCH-010',
      reportName: 'Declaraciones Fiscales',
      executionDate: '2025-11-01T08:00:00',
      status: 'failed',
      recipients: 2,
      duration: '5s',
      errorMessage: 'Error al conectar con el servidor de datos fiscales. Tiempo de espera agotado.'
    },
    {
      id: 'HIST-009',
      scheduledReportId: 'SCH-002',
      reportName: 'Balance General Trimestral',
      executionDate: '2025-10-01T09:00:00',
      status: 'success',
      fileSize: '5.2 MB',
      recipients: 2,
      duration: '28s'
    }
  ]

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

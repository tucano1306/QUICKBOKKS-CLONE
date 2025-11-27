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
  Bell,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  MessageSquare
} from 'lucide-react'

interface BudgetAlert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
  category: string
  department: string
  budgetAmount: number
  actualAmount: number
  variance: number
  variancePercent: number
  threshold: number
  triggeredDate: string
  acknowledgedBy?: string
  acknowledgedDate?: string
  resolvedBy?: string
  resolvedDate?: string
  actionTaken?: string
  responsibleManager: string
  dueDate: string
}

export default function BudgetAlertsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const alerts: BudgetAlert[] = [
    {
      id: 'ALT-001',
      title: 'Marketing Digital - Exceso Crítico',
      description: 'El gasto en marketing digital ha superado el 115% del presupuesto mensual. Se requiere aprobación para continuar.',
      severity: 'critical',
      status: 'active',
      category: 'Marketing Digital',
      department: 'Marketing',
      budgetAmount: 250000,
      actualAmount: 285000,
      variance: 35000,
      variancePercent: 14.0,
      threshold: 110,
      triggeredDate: '2025-11-28',
      responsibleManager: 'Ana García',
      dueDate: '2025-12-05'
    },
    {
      id: 'ALT-002',
      title: 'Servidores Cloud - Sobrecosto Alto',
      description: 'Los costos de infraestructura cloud están 15% sobre presupuesto debido a incremento en uso de servicios.',
      severity: 'high',
      status: 'acknowledged',
      category: 'Servidores y Cloud',
      department: 'Tecnología',
      budgetAmount: 120000,
      actualAmount: 138000,
      variance: 18000,
      variancePercent: 15.0,
      threshold: 110,
      triggeredDate: '2025-11-25',
      acknowledgedBy: 'Carlos Méndez',
      acknowledgedDate: '2025-11-26',
      responsibleManager: 'Carlos Méndez',
      dueDate: '2025-12-10'
    },
    {
      id: 'ALT-003',
      title: 'Desarrollo Software - Ingresos Bajos',
      description: 'Los ingresos por desarrollo de software están 8.3% por debajo del objetivo mensual.',
      severity: 'high',
      status: 'active',
      category: 'Desarrollo de Software',
      department: 'Ventas',
      budgetAmount: 1800000,
      actualAmount: 1650000,
      variance: -150000,
      variancePercent: -8.3,
      threshold: 95,
      triggeredDate: '2025-11-27',
      responsibleManager: 'Luis Rodríguez',
      dueDate: '2025-12-03'
    },
    {
      id: 'ALT-004',
      title: 'Capacitación - Presupuesto al 95%',
      description: 'El presupuesto de capacitación ha alcanzado el 95% de su límite mensual con 5 días restantes.',
      severity: 'medium',
      status: 'active',
      category: 'Capacitación',
      department: 'RRHH',
      budgetAmount: 200000,
      actualAmount: 190000,
      variance: 10000,
      variancePercent: 95.0,
      threshold: 95,
      triggeredDate: '2025-11-26',
      responsibleManager: 'María López',
      dueDate: '2025-12-01'
    },
    {
      id: 'ALT-005',
      title: 'Nómina Operaciones - Aumento Imprevisto',
      description: 'Pago de horas extras ha incrementado la nómina en 6.2% sobre lo presupuestado.',
      severity: 'medium',
      status: 'acknowledged',
      category: 'Nómina Operaciones',
      department: 'Operaciones',
      budgetAmount: 2800000,
      actualAmount: 2974000,
      variance: 174000,
      variancePercent: 6.2,
      threshold: 105,
      triggeredDate: '2025-11-24',
      acknowledgedBy: 'Roberto Sánchez',
      acknowledgedDate: '2025-11-25',
      responsibleManager: 'Roberto Sánchez',
      dueDate: '2025-12-08'
    },
    {
      id: 'ALT-006',
      title: 'Consultoría - Meta Superada',
      description: 'Los ingresos por consultoría superaron el presupuesto en 7.2%. ¡Excelente desempeño!',
      severity: 'low',
      status: 'resolved',
      category: 'Consultoría',
      department: 'Ventas',
      budgetAmount: 2500000,
      actualAmount: 2680000,
      variance: 180000,
      variancePercent: 7.2,
      threshold: 100,
      triggeredDate: '2025-11-20',
      acknowledgedBy: 'Luis Rodríguez',
      acknowledgedDate: '2025-11-20',
      resolvedBy: 'Luis Rodríguez',
      resolvedDate: '2025-11-21',
      actionTaken: 'Se actualizó la proyección de ingresos Q4. Se asignaron recursos adicionales para mantener el momentum.',
      responsibleManager: 'Luis Rodríguez',
      dueDate: '2025-11-25'
    },
    {
      id: 'ALT-007',
      title: 'Licencias Software - Próximo a Límite',
      description: 'El gasto en licencias y herramientas está al 92% del presupuesto mensual.',
      severity: 'low',
      status: 'active',
      category: 'Licencias y Herramientas',
      department: 'Tecnología',
      budgetAmount: 60000,
      actualAmount: 55200,
      variance: 4800,
      variancePercent: 92.0,
      threshold: 90,
      triggeredDate: '2025-11-28',
      responsibleManager: 'Carlos Méndez',
      dueDate: '2025-12-02'
    },
    {
      id: 'ALT-008',
      title: 'Renta Oficina - Incremento Anual',
      description: 'Se ha notificado un incremento del 5% en la renta de oficina para el próximo año.',
      severity: 'medium',
      status: 'acknowledged',
      category: 'Renta de Oficina',
      department: 'Administración',
      budgetAmount: 300000,
      actualAmount: 315000,
      variance: 15000,
      variancePercent: 5.0,
      threshold: 100,
      triggeredDate: '2025-11-22',
      acknowledgedBy: 'Patricia Ruiz',
      acknowledgedDate: '2025-11-23',
      responsibleManager: 'Patricia Ruiz',
      dueDate: '2025-12-15'
    },
    {
      id: 'ALT-009',
      title: 'Soporte - Ingresos por Debajo',
      description: 'Los ingresos por soporte y mantenimiento están 3.4% por debajo del objetivo.',
      severity: 'low',
      status: 'dismissed',
      category: 'Soporte y Mantenimiento',
      department: 'Ventas',
      budgetAmount: 290000,
      actualAmount: 280000,
      variance: -10000,
      variancePercent: -3.4,
      threshold: 95,
      triggeredDate: '2025-11-23',
      acknowledgedBy: 'Luis Rodríguez',
      acknowledgedDate: '2025-11-24',
      actionTaken: 'Variación dentro de límites aceptables para este mes. Se monitoreará en diciembre.',
      responsibleManager: 'Luis Rodríguez',
      dueDate: '2025-11-30'
    },
    {
      id: 'ALT-010',
      title: 'Servicios Generales - Gasto Elevado',
      description: 'Los gastos en servicios públicos aumentaron 10% debido a incremento en tarifas eléctricas.',
      severity: 'medium',
      status: 'resolved',
      category: 'Servicios Generales',
      department: 'Administración',
      budgetAmount: 100000,
      actualAmount: 110000,
      variance: 10000,
      variancePercent: 10.0,
      threshold: 105,
      triggeredDate: '2025-11-21',
      acknowledgedBy: 'Patricia Ruiz',
      acknowledgedDate: '2025-11-21',
      resolvedBy: 'Patricia Ruiz',
      resolvedDate: '2025-11-23',
      actionTaken: 'Se ajustó el presupuesto para reflejar nuevas tarifas. Se implementaron medidas de ahorro energético.',
      responsibleManager: 'Patricia Ruiz',
      dueDate: '2025-11-28'
    },
    {
      id: 'ALT-011',
      title: 'Nómina Tecnología - Bonos Trimestrales',
      description: 'Pago de bonos de desempeño Q4 incrementó temporalmente la nómina en 4.8%.',
      severity: 'low',
      status: 'resolved',
      category: 'Nómina Tecnología',
      department: 'Tecnología',
      budgetAmount: 3500000,
      actualAmount: 3668000,
      variance: 168000,
      variancePercent: 4.8,
      threshold: 105,
      triggeredDate: '2025-11-20',
      acknowledgedBy: 'Carlos Méndez',
      acknowledgedDate: '2025-11-20',
      resolvedBy: 'María López',
      resolvedDate: '2025-11-22',
      actionTaken: 'Bonos planeados y aprobados. Se registraron correctamente en contabilidad.',
      responsibleManager: 'María López',
      dueDate: '2025-11-25'
    },
    {
      id: 'ALT-012',
      title: 'Licencias SaaS - Renovación Anticipada',
      description: 'Oportunidad de ahorro: renovación anticipada anual con 12% de descuento disponible.',
      severity: 'low',
      status: 'active',
      category: 'Licencias de Software',
      department: 'Ventas',
      budgetAmount: 1200000,
      actualAmount: 1056000,
      variance: -144000,
      variancePercent: -12.0,
      threshold: 100,
      triggeredDate: '2025-11-29',
      responsibleManager: 'Luis Rodríguez',
      dueDate: '2025-12-10'
    }
  ]

  const filteredAlerts = alerts.filter(alert => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false
    if (selectedStatus !== 'all' && alert.status !== selectedStatus) return false
    if (selectedDepartment !== 'all' && alert.department !== selectedDepartment) return false
    return true
  })

  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    high: alerts.filter(a => a.severity === 'high' && a.status === 'active').length,
    medium: alerts.filter(a => a.severity === 'medium' && a.status === 'active').length,
    low: alerts.filter(a => a.severity === 'low' && a.status === 'active').length,
    total: alerts.filter(a => a.status === 'active').length
  }

  const statusCounts = {
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5" />
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <AlertCircle className="w-5 h-5" />
      case 'low':
        return <CheckCircle className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-red-100 text-red-700">Activa</Badge>
      case 'acknowledged':
        return <Badge className="bg-yellow-100 text-yellow-700">Reconocida</Badge>
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700">Resuelta</Badge>
      case 'dismissed':
        return <Badge className="bg-gray-100 text-gray-700">Descartada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
            <h1 className="text-2xl font-bold text-gray-900">Alertas de Presupuesto</h1>
            <p className="text-gray-600 mt-1">
              Monitoreo de variaciones y umbrales presupuestarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setMessage({ type: 'success', text: 'Exportando alertas a CSV' }); setTimeout(() => setMessage(null), 3000); }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setMessage({ type: 'success', text: 'Configurando alertas y notificaciones' }); setTimeout(() => setMessage(null), 3000); }}>
              <Bell className="w-4 h-4 mr-2" />
              Configurar Alertas
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                {alertCounts.critical}
              </div>
              <div className="text-sm text-red-700">Críticas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {alertCounts.high}
              </div>
              <div className="text-sm text-orange-700">Alta Prioridad</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {alertCounts.medium}
              </div>
              <div className="text-sm text-yellow-700">Media Prioridad</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {alertCounts.low}
              </div>
              <div className="text-sm text-blue-700">Baja Prioridad</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bell className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {alertCounts.total}
              </div>
              <div className="text-sm text-purple-700">Total Activas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Severidad:
                </label>
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Estado:
                </label>
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activas ({statusCounts.active})</option>
                  <option value="acknowledged">Reconocidas ({statusCounts.acknowledged})</option>
                  <option value="resolved">Resueltas ({statusCounts.resolved})</option>
                  <option value="dismissed">Descartadas ({statusCounts.dismissed})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Departamento:
                </label>
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="Ventas">Ventas</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="RRHH">RRHH</option>
                  <option value="Administración">Administración</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const daysRemaining = getDaysRemaining(alert.dueDate)
            const isOverdue = daysRemaining < 0
            const isUrgent = daysRemaining >= 0 && daysRemaining <= 3

            return (
              <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                            {getStatusBadge(alert.status)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{alert.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {alert.responsibleManager}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> 
                              Activada: {new Date(alert.triggeredDate).toLocaleDateString('es-MX')}
                            </span>
                            <span className={`flex items-center gap-1 font-semibold ${
                              isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-500'
                            }`}>
                              <Clock className="w-3 h-3" /> 
                              {isOverdue 
                                ? `Vencida hace ${Math.abs(daysRemaining)} días`
                                : `Vence en ${daysRemaining} días`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alert.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" /> Ver
                            </Button>
                            <Button size="sm">
                              <CheckCircle className="w-4 h-4 mr-1" /> Reconocer
                            </Button>
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="w-4 h-4 mr-1" /> Comentar
                            </Button>
                            <Button size="sm">
                              <CheckCircle className="w-4 h-4 mr-1" /> Resolver
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Categoría</div>
                        <div className="text-sm font-semibold text-gray-900">{alert.category}</div>
                        <div className="text-xs text-gray-500">{alert.department}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Presupuesto</div>
                        <div className="text-sm font-semibold text-gray-900">
                          ${alert.budgetAmount.toLocaleString('es-MX')}
                        </div>
                        <div className="text-xs text-gray-500">Límite: {alert.threshold}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Monto Real</div>
                        <div className="text-sm font-semibold text-gray-900">
                          ${alert.actualAmount.toLocaleString('es-MX')}
                        </div>
                        <div className={`text-xs font-semibold ${
                          alert.variance > 0 && alert.category.includes('Nómina') || alert.category.includes('Marketing') || alert.category.includes('Servicios') || alert.category.includes('Cloud')
                            ? 'text-red-600' 
                            : alert.variance > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {alert.variance >= 0 ? '+' : ''}{alert.variancePercent.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Variación</div>
                        <div className={`text-sm font-bold ${
                          alert.variance > 0 && alert.category.includes('Nómina') || alert.category.includes('Marketing') || alert.category.includes('Servicios') || alert.category.includes('Cloud')
                            ? 'text-red-600' 
                            : alert.variance > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {alert.variance >= 0 ? '+' : ''}${Math.abs(alert.variance).toLocaleString('es-MX')}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {alert.variance > 0 && (alert.category.includes('Nómina') || alert.category.includes('Marketing') || alert.category.includes('Servicios') || alert.category.includes('Cloud')) ? (
                            <TrendingUp className="w-3 h-3 text-red-600" />
                          ) : alert.variance > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className="text-gray-500">
                            {Math.abs(alert.variance) > alert.budgetAmount * 0.1 ? 'Significativo' : 'Moderado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    {(alert.acknowledgedDate || alert.resolvedDate) && (
                      <div className="border-t pt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Historial de Acciones</div>
                        <div className="space-y-2">
                          {alert.acknowledgedDate && (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                              <div>
                                <span className="font-semibold">{alert.acknowledgedBy}</span> reconoció la alerta el{' '}
                                {new Date(alert.acknowledgedDate).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          )}
                          {alert.resolvedDate && (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                                <span className="font-semibold">{alert.resolvedBy}</span> resolvió la alerta el{' '}
                                {new Date(alert.resolvedDate).toLocaleDateString('es-MX')}
                                {alert.actionTaken && (
                                  <div className="mt-1 p-2 bg-green-50 rounded text-green-800">
                                    <strong>Acción tomada:</strong> {alert.actionTaken}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredAlerts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay alertas con estos filtros</h3>
              <p className="text-gray-600">
                Todos los presupuestos están dentro de los límites establecidos.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sistema de Alertas Presupuestarias</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Monitoreo automático de umbrales presupuestarios para gestión proactiva de variaciones.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Crítica:</strong> Variación mayor al 15% o superación del 110% del presupuesto - Requiere acción inmediata</li>
                  <li>• <strong>Alta:</strong> Variación 10-15% o entre 105-110% del presupuesto - Atención prioritaria</li>
                  <li>• <strong>Media:</strong> Variación 5-10% o entre 95-105% del presupuesto - Monitoreo cercano</li>
                  <li>• <strong>Baja:</strong> Variación menor al 5% o menor al 95% - Informativa, revisión rutinaria</li>
                  <li>• <strong>Estados:</strong> Activa (nueva) → Reconocida (en revisión) → Resuelta (acción tomada) / Descartada</li>
                  <li>• <strong>Objetivo:</strong> Prevenir sobrecostos, identificar oportunidades, mejorar control presupuestario</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

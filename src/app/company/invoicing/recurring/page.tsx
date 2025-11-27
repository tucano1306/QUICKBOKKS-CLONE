'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Repeat,
  Plus,
  Search,
  Calendar,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface RecurringInvoice {
  id: string
  templateName: string
  customer: string
  amount: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: string
  nextInvoice: string
  endDate?: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  totalGenerated: number
  lastGenerated?: string
  autoSend: boolean
}

export default function RecurringInvoicesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const recurringInvoices: RecurringInvoice[] = [
    {
      id: 'REC-001',
      templateName: 'Servicio de Hosting Mensual',
      customer: 'Juan Pérez García',
      amount: 1500,
      frequency: 'monthly',
      startDate: '2025-01-01',
      nextInvoice: '2025-12-01',
      status: 'active',
      totalGenerated: 11,
      lastGenerated: '2025-11-01',
      autoSend: true
    },
    {
      id: 'REC-002',
      templateName: 'Consultoría Trimestral',
      customer: 'María López Hernández',
      amount: 15000,
      frequency: 'quarterly',
      startDate: '2025-01-15',
      nextInvoice: '2026-01-15',
      status: 'active',
      totalGenerated: 4,
      lastGenerated: '2025-10-15',
      autoSend: true
    },
    {
      id: 'REC-003',
      templateName: 'Mantenimiento Semanal',
      customer: 'Carlos Ramírez Sánchez',
      amount: 800,
      frequency: 'weekly',
      startDate: '2025-09-01',
      nextInvoice: '2025-12-02',
      status: 'active',
      totalGenerated: 12,
      lastGenerated: '2025-11-25',
      autoSend: false
    },
    {
      id: 'REC-004',
      templateName: 'Licencia de Software Anual',
      customer: 'Empresa ABC Corp',
      amount: 25000,
      frequency: 'yearly',
      startDate: '2024-01-01',
      nextInvoice: '2026-01-01',
      status: 'active',
      totalGenerated: 2,
      lastGenerated: '2025-01-01',
      autoSend: true
    },
    {
      id: 'REC-005',
      templateName: 'Soporte Técnico Quincenal',
      customer: 'TechStart S.A.',
      amount: 2500,
      frequency: 'biweekly',
      startDate: '2025-10-01',
      nextInvoice: '2025-12-01',
      status: 'paused',
      totalGenerated: 3,
      lastGenerated: '2025-11-15',
      autoSend: true
    },
    {
      id: 'REC-006',
      templateName: 'Auditoría Mensual',
      customer: 'Contadores Asociados',
      amount: 5000,
      frequency: 'monthly',
      startDate: '2025-06-01',
      nextInvoice: '2025-11-30',
      endDate: '2025-12-01',
      status: 'completed',
      totalGenerated: 6,
      lastGenerated: '2025-11-01',
      autoSend: false
    }
  ]

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diario'
      case 'weekly': return 'Semanal'
      case 'biweekly': return 'Quincenal'
      case 'monthly': return 'Mensual'
      case 'quarterly': return 'Trimestral'
      case 'yearly': return 'Anual'
      default: return frequency
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <Play className="w-3 h-3" /> Activa
        </Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Pause className="w-3 h-3" /> Pausada
        </Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completada
        </Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Cancelada
        </Badge>
      default:
        return null
    }
  }

  const getDaysUntilNext = (nextDate: string) => {
    const next = new Date(nextDate)
    const today = new Date()
    const diffTime = next.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Vencida'
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Mañana'
    return `En ${diffDays} días`
  }

  const filteredInvoices = recurringInvoices.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false
    if (searchTerm && !inv.templateName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !inv.customer.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalActive = recurringInvoices.filter(i => i.status === 'active').length
  const totalRevenue = recurringInvoices
    .filter(i => i.status === 'active')
    .reduce((sum, i) => {
      const multiplier = i.frequency === 'monthly' ? 12 : 
                        i.frequency === 'quarterly' ? 4 :
                        i.frequency === 'weekly' ? 52 :
                        i.frequency === 'biweekly' ? 26 :
                        i.frequency === 'yearly' ? 1 : 12
      return sum + (i.amount * multiplier)
    }, 0)
  const totalGenerated = recurringInvoices.reduce((sum, i) => sum + i.totalGenerated, 0)

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const recurringActions = [
    {
      label: 'Ver todas',
      icon: Eye,
      onClick: () => {
        setFilterStatus('all')
        setSearchTerm('')
        toast.success('📋 Mostrando todas las facturas recurrentes')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Crear nueva',
      icon: PlusCircle,
      onClick: () => {
        router.push('/company/invoicing/recurring/new')
      },
      variant: 'primary' as const,
    },
    {
      label: 'Editar',
      icon: Edit,
      onClick: () => {
        toast('Selecciona una factura recurrente para editar')
      },
      variant: 'default' as const,
    },
    {
      label: 'Pausar/Reanudar',
      icon: Pause,
      onClick: () => {
        toast('⏸️ Selecciona una factura para pausar/reanudar')
      },
      variant: 'default' as const,
    },
    {
      label: 'Eliminar',
      icon: Trash2,
      onClick: () => {
        toast('🗑️ Selecciona una factura recurrente para eliminar')
      },
      variant: 'danger' as const,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Facturas Recurrentes
            </h1>
            <p className="text-gray-600 mt-1">
              Automatiza la facturación periódica a tus clientes
            </p>
          </div>
          <Button onClick={() => router.push('/company/invoicing/recurring/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Factura Recurrente
          </Button>
        </div>

        {/* Action Buttons */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Acciones de Facturas Recurrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={recurringActions} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Repeat className="w-8 h-8 text-green-600" />
                <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full font-medium">
                  Activas
                </span>
              </div>
              <div className="text-3xl font-bold text-green-900">{totalActive}</div>
              <div className="text-sm text-green-700">Plantillas Activas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Ingresos Anuales Proyectados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{totalGenerated}</div>
              <div className="text-sm text-purple-700">Facturas Generadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {recurringInvoices.filter(i => 
                  i.status === 'active' && 
                  new Date(i.nextInvoice) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <div className="text-sm text-orange-700">Próximas 7 Días</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por plantilla o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activas</option>
                <option value="paused">Pausadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Invoices List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Repeat className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {invoice.templateName}
                      </h3>
                      {getStatusBadge(invoice.status)}
                      {invoice.autoSend && (
                        <Badge className="bg-blue-100 text-blue-700">
                          Envío Automático
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className="text-xs text-gray-600">Cliente</label>
                        <p className="text-sm font-medium text-gray-900">{invoice.customer}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Monto</label>
                        <p className="text-sm font-semibold text-green-600">
                          ${invoice.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Frecuencia</label>
                        <p className="text-sm font-medium text-gray-900">
                          {getFrequencyLabel(invoice.frequency)}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Facturas Generadas</label>
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.totalGenerated}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                      <div>
                        <label className="text-xs text-gray-600">Fecha Inicio</label>
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar className="w-3 h-3" />
                          {new Date(invoice.startDate).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Próxima Factura</label>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-orange-600" />
                          <span className="text-sm font-medium text-orange-600">
                            {new Date(invoice.nextInvoice).toLocaleDateString('es-MX')}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({getDaysUntilNext(invoice.nextInvoice)})
                          </span>
                        </div>
                      </div>
                      {invoice.lastGenerated && (
                        <div>
                          <label className="text-xs text-gray-600">Última Generada</label>
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Clock className="w-3 h-3" />
                            {new Date(invoice.lastGenerated).toLocaleDateString('es-MX')}
                          </div>
                        </div>
                      )}
                      {invoice.endDate && (
                        <div>
                          <label className="text-xs text-gray-600">Fecha Fin</label>
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Calendar className="w-3 h-3" />
                            {new Date(invoice.endDate).toLocaleDateString('es-MX')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {invoice.status === 'active' && (
                      <Button size="sm" variant="outline">
                        <Pause className="w-4 h-4 mr-1" />
                        Pausar
                      </Button>
                    )}
                    {invoice.status === 'paused' && (
                      <Button size="sm" variant="outline">
                        <Play className="w-4 h-4 mr-1" />
                        Reanudar
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Repeat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay facturas recurrentes
              </h3>
              <p className="text-gray-600 mb-4">
                Crea tu primera factura recurrente para automatizar la facturación
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Factura Recurrente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Repeat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Automatiza tu Facturación</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Las facturas recurrentes te permiten configurar una vez y olvidarte. El sistema generará y 
                  enviará automáticamente las facturas según la frecuencia configurada.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Configura la frecuencia: diaria, semanal, mensual, trimestral o anual</li>
                  <li>• Envío automático por correo electrónico</li>
                  <li>• Establece fechas de inicio y fin opcionales</li>
                  <li>• Pausa o cancela en cualquier momento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

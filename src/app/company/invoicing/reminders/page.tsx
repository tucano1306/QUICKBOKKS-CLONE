'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bell,
  Plus,
  Search,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Send,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Settings
} from 'lucide-react'

interface Reminder {
  id: string
  name: string
  type: 'overdue' | 'upcoming' | 'thank-you'
  schedule: string
  days: number
  status: 'active' | 'paused'
  channel: 'email' | 'sms' | 'both'
  sent: number
  lastSent?: string
  template: string
}

interface ScheduledReminder {
  id: string
  invoice: string
  customer: string
  amount: number
  dueDate: string
  reminderType: string
  scheduledFor: string
  status: 'pending' | 'sent' | 'failed'
}

export default function RemindersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'templates' | 'scheduled'>('templates')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const reminders: Reminder[] = [
    {
      id: 'REM-001',
      name: 'Recordatorio de Vencimiento',
      type: 'upcoming',
      schedule: 'before_due',
      days: 3,
      status: 'active',
      channel: 'email',
      sent: 156,
      lastSent: '2025-11-24',
      template: 'Su factura {invoice_number} vencerá en {days} días'
    },
    {
      id: 'REM-002',
      name: 'Primera Notificación de Mora',
      type: 'overdue',
      schedule: 'after_due',
      days: 1,
      status: 'active',
      channel: 'both',
      sent: 43,
      lastSent: '2025-11-23',
      template: 'Su factura {invoice_number} está vencida desde hace {days} día'
    },
    {
      id: 'REM-003',
      name: 'Segunda Notificación de Mora',
      type: 'overdue',
      schedule: 'after_due',
      days: 7,
      status: 'active',
      channel: 'email',
      sent: 28,
      lastSent: '2025-11-22',
      template: 'Recordatorio: Su factura {invoice_number} lleva {days} días vencida'
    },
    {
      id: 'REM-004',
      name: 'Notificación de Mora Final',
      type: 'overdue',
      schedule: 'after_due',
      days: 15,
      status: 'active',
      channel: 'both',
      sent: 12,
      lastSent: '2025-11-20',
      template: 'URGENTE: Su factura {invoice_number} está vencida desde hace {days} días'
    },
    {
      id: 'REM-005',
      name: 'Recordatorio 7 días antes',
      type: 'upcoming',
      schedule: 'before_due',
      days: 7,
      status: 'paused',
      channel: 'email',
      sent: 89,
      lastSent: '2025-11-15',
      template: 'Recordatorio amistoso: Su factura {invoice_number} vence el {due_date}'
    },
    {
      id: 'REM-006',
      name: 'Agradecimiento por Pago',
      type: 'thank-you',
      schedule: 'on_payment',
      days: 0,
      status: 'active',
      channel: 'email',
      sent: 234,
      lastSent: '2025-11-25',
      template: 'Gracias por su pago de ${amount}. Su factura {invoice_number} está liquidada'
    }
  ]

  const scheduledReminders: ScheduledReminder[] = [
    {
      id: 'SCH-001',
      invoice: 'FAC-2025-001',
      customer: 'Juan Pérez García',
      amount: 15000,
      dueDate: '2025-11-28',
      reminderType: 'Recordatorio de Vencimiento',
      scheduledFor: '2025-11-25',
      status: 'sent'
    },
    {
      id: 'SCH-002',
      invoice: 'FAC-2025-015',
      customer: 'María López Hernández',
      amount: 8500,
      dueDate: '2025-11-27',
      reminderType: 'Recordatorio de Vencimiento',
      scheduledFor: '2025-11-24',
      status: 'sent'
    },
    {
      id: 'SCH-003',
      invoice: 'FAC-2025-022',
      customer: 'Carlos Ramírez Sánchez',
      amount: 12000,
      dueDate: '2025-12-02',
      reminderType: 'Recordatorio 7 días antes',
      scheduledFor: '2025-11-25',
      status: 'pending'
    },
    {
      id: 'SCH-004',
      invoice: 'FAC-2025-008',
      customer: 'Empresa ABC Corp',
      amount: 25000,
      dueDate: '2025-11-20',
      reminderType: 'Segunda Notificación de Mora',
      scheduledFor: '2025-11-27',
      status: 'pending'
    },
    {
      id: 'SCH-005',
      invoice: 'FAC-2025-003',
      customer: 'TechStart S.A.',
      amount: 5000,
      dueDate: '2025-11-15',
      reminderType: 'Notificación de Mora Final',
      scheduledFor: '2025-11-30',
      status: 'pending'
    }
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700">Próximo Vencimiento</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700">Mora</Badge>
      case 'thank-you':
        return <Badge className="bg-green-100 text-green-700">Agradecimiento</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <Play className="w-3 h-3" /> Activo
        </Badge>
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Pause className="w-3 h-3" /> Pausado
        </Badge>
      default:
        return null
    }
  }

  const getScheduledStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'sent':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Enviado
        </Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Fallido
        </Badge>
      default:
        return null
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-green-600" />
      case 'both':
        return <div className="flex gap-1">
          <Mail className="w-4 h-4 text-blue-600" />
          <MessageSquare className="w-4 h-4 text-green-600" />
        </div>
      default:
        return null
    }
  }

  const totalActive = reminders.filter(r => r.status === 'active').length
  const totalSent = reminders.reduce((sum, r) => sum + r.sent, 0)
  const pendingToday = scheduledReminders.filter(s => s.status === 'pending').length

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
            <h1 className="text-2xl font-bold text-gray-900">Recordatorios de Pago</h1>
            <p className="text-gray-600 mt-1">
              Automatiza el envío de recordatorios y notificaciones
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('⚙️ Configuración de Recordatorios\n\nConfigura plantillas, horarios y canales')}>
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </Button>
            <Button onClick={() => alert('⏰ Nuevo Recordatorio\n\nCrea recordatorio automático')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Recordatorio
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bell className="w-8 h-8 text-blue-600" />
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Activos
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalActive}</div>
              <div className="text-sm text-blue-700">Recordatorios Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalSent}</div>
              <div className="text-sm text-green-700">Enviados Este Mes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{pendingToday}</div>
              <div className="text-sm text-orange-700">Programados Hoy</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">94%</div>
              <div className="text-sm text-purple-700">Tasa de Entrega</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setSelectedTab('templates')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              selectedTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Plantillas de Recordatorios
          </button>
          <button
            onClick={() => setSelectedTab('scheduled')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              selectedTab === 'scheduled'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Recordatorios Programados
          </button>
        </div>

        {/* Templates Tab */}
        {selectedTab === 'templates' && (
          <>
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar plantillas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminder Templates */}
            <div className="grid grid-cols-1 gap-4">
              {reminders.map((reminder) => (
                <Card key={reminder.id} className="hover:shadow-lg transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Bell className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {reminder.name}
                          </h3>
                          {getTypeBadge(reminder.type)}
                          {getStatusBadge(reminder.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="text-xs text-gray-600">Programación</label>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <p className="text-sm font-medium text-gray-900">
                                {reminder.schedule === 'before_due' && `${reminder.days} días antes`}
                                {reminder.schedule === 'after_due' && `${reminder.days} días después`}
                                {reminder.schedule === 'on_payment' && 'Al recibir pago'}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Canal</label>
                            <div className="flex items-center gap-2">
                              {getChannelIcon(reminder.channel)}
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {reminder.channel === 'both' ? 'Email + SMS' : reminder.channel}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Enviados</label>
                            <p className="text-sm font-semibold text-green-600">
                              {reminder.sent} este mes
                            </p>
                          </div>
                          {reminder.lastSent && (
                            <div>
                              <label className="text-xs text-gray-600">Último Envío</label>
                              <p className="text-sm text-gray-700">
                                {new Date(reminder.lastSent).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-600 mb-1 block">Plantilla de Mensaje</label>
                          <p className="text-sm text-gray-700 font-mono">
                            {reminder.template}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {reminder.status === 'active' && (
                          <Button size="sm" variant="outline">
                            <Pause className="w-4 h-4 mr-1" />
                            Pausar
                          </Button>
                        )}
                        {reminder.status === 'paused' && (
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4 mr-1" />
                            Activar
                          </Button>
                        )}
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
          </>
        )}

        {/* Scheduled Tab */}
        {selectedTab === 'scheduled' && (
          <Card>
            <CardHeader>
              <CardTitle>Recordatorios Programados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Factura</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Programado Para</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scheduledReminders.map((scheduled) => (
                      <tr key={scheduled.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm font-semibold text-blue-600">
                            {scheduled.invoice}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {scheduled.customer}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          ${scheduled.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(scheduled.dueDate).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {scheduled.reminderType}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {new Date(scheduled.scheduledFor).toLocaleDateString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getScheduledStatusBadge(scheduled.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {scheduled.status === 'pending' && (
                              <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Automatiza el Cobro</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Los recordatorios automáticos ayudan a reducir los días de cobro y mejorar el flujo de efectivo.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Envía recordatorios antes del vencimiento para pagos puntuales</li>
                  <li>• Escalamiento automático de notificaciones de mora</li>
                  <li>• Agradecimientos automáticos al recibir pagos</li>
                  <li>• Personaliza mensajes con variables dinámicas</li>
                  <li>• Elige entre Email, SMS o ambos canales</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

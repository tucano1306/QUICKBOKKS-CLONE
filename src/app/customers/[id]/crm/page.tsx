'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  UserCircle,
  ArrowLeft,
  PhoneCall,
  Video,
  Mail as MailIcon,
  MessageSquare,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  Clock,
  Plus,
  User,
  Building,
  MapPin,
  Globe,
  Phone,
  Save,
  Edit
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  website: string
  accountManager: string
  status: string
  lifetime_value: number
  total_invoices: number
  paid_invoices: number
  pending_amount: number
  last_interaction: string
  next_followup: string
}

interface Interaction {
  id: string
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP' | 'OTHER'
  date: string
  duration: number // minutes
  subject: string
  notes: string
  outcome: string
  createdBy: string
}

export default function CustomerCRMPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, customerId])

  const loadData = async () => {
    try {
      // Load customer data
      const customerRes = await fetch(`/api/customers/${customerId}`)
      if (customerRes.ok) {
        const customerData = await customerRes.json()
        setCustomer(customerData.customer || customerData)
      }

      // Load interactions
      const interactionsRes = await fetch(`/api/customers/${customerId}/interactions`)
      if (interactionsRes.ok) {
        const interactionsData = await interactionsRes.json()
        setInteractions(interactionsData.interactions || [])
      }
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveInteraction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const newInteraction: Interaction = {
      id: Date.now().toString(),
      type: formData.get('type') as any,
      date: new Date().toISOString(),
      duration: parseInt(formData.get('duration') as string) || 0,
      subject: formData.get('subject') as string,
      notes: formData.get('notes') as string,
      outcome: formData.get('outcome') as string,
      createdBy: session?.user?.name || 'Usuario'
    }

    setInteractions(prev => [newInteraction, ...prev])
    setShowInteractionModal(false)
    toast.success('Interacción registrada')
  }

  const handleUpdateAccountManager = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const manager = formData.get('accountManager') as string

    if (customer) {
      setCustomer({ ...customer, accountManager: manager })
      toast.success('Responsable actualizado')
      setShowEditModal(false)
    }
  }

  const getInteractionIcon = (type: string) => {
    const icons = {
      CALL: <PhoneCall className="h-5 w-5" />,
      MEETING: <Video className="h-5 w-5" />,
      EMAIL: <MailIcon className="h-5 w-5" />,
      WHATSAPP: <MessageSquare className="h-5 w-5" />,
      OTHER: <MessageSquare className="h-5 w-5" />
    }
    return icons[type as keyof typeof icons] || icons.OTHER
  }

  const getInteractionColor = (type: string) => {
    const colors = {
      CALL: 'bg-blue-100 text-blue-800',
      MEETING: 'bg-purple-100 text-purple-800',
      EMAIL: 'bg-green-100 text-green-800',
      WHATSAPP: 'bg-emerald-100 text-emerald-800',
      OTHER: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || colors.OTHER
  }

  const getInteractionLabel = (type: string) => {
    const labels = {
      CALL: 'Llamada',
      MEETING: 'Reunión',
      EMAIL: 'Email',
      WHATSAPP: 'WhatsApp',
      OTHER: 'Otro'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (status === 'loading' || isLoading || !customer) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Perfil CRM 360°</h1>
              <p className="text-gray-600 mt-1">
                Vista completa del cliente
              </p>
            </div>
          </div>
          <Button onClick={() => setShowInteractionModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Interacción
          </Button>
        </div>

        {/* Customer Profile Card */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                    <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {customer.status === 'ACTIVE' ? 'Cliente Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span>{customer.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MailIcon className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{customer.address}, {customer.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a href={`https://${customer.website}`} target="_blank" className="text-blue-600 hover:underline">
                      {customer.website}
                    </a>
                  </div>
                </div>
              </div>

              {/* Center: Financial Stats */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Información Financiera</h3>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valor del Cliente (LTV)</span>
                    <span className="text-lg font-bold text-green-600">
                      ${(customer.lifetime_value || 0).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Facturas</span>
                    <span className="text-lg font-bold">{customer.total_invoices || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Facturas Pagadas</span>
                    <span className="text-lg font-bold text-green-600">{customer.paid_invoices || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monto Pendiente</span>
                    <span className="text-lg font-bold text-orange-600">
                      ${(customer.pending_amount || 0).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Account Manager & Timeline */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Gestión de Cuenta</h3>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Responsable</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{customer.accountManager}</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <span className="text-sm text-gray-600 block mb-2">Última Interacción</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {customer.last_interaction 
                        ? format(new Date(customer.last_interaction), "dd MMM yyyy 'a las' HH:mm", { locale: es })
                        : 'Sin interacciones'}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <span className="text-sm text-gray-600 block mb-2">Próximo Seguimiento</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">
                      {customer.next_followup
                        ? format(new Date(customer.next_followup), "dd MMM yyyy 'a las' HH:mm", { locale: es })
                        : 'No programado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Interacciones</p>
                  <p className="text-2xl font-bold">{interactions.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Llamadas</p>
                  <p className="text-2xl font-bold">
                    {interactions.filter(i => i.type === 'CALL').length}
                  </p>
                </div>
                <PhoneCall className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reuniones</p>
                  <p className="text-2xl font-bold">
                    {interactions.filter(i => i.type === 'MEETING').length}
                  </p>
                </div>
                <Video className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails</p>
                  <p className="text-2xl font-bold">
                    {interactions.filter(i => i.type === 'EMAIL').length}
                  </p>
                </div>
                <MailIcon className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactions Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historial de Interacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!Array.isArray(interactions) || interactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay interacciones registradas
                </p>
              ) : (
                interactions.map((interaction, index) => (
                  <div
                    key={interaction.id}
                    className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-0"
                  >
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getInteractionColor(interaction.type)}`}>
                            {getInteractionIcon(interaction.type)}
                            {getInteractionLabel(interaction.type)}
                          </span>
                          {interaction.duration > 0 && (
                            <span className="text-xs text-gray-500">
                              {interaction.duration} min
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(interaction.date), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{interaction.subject}</h4>
                      <p className="text-sm text-gray-700 mb-2">{interaction.notes}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{interaction.outcome}</Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {interaction.createdBy}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Registrar Interacción</h3>
            <form onSubmit={handleSaveInteraction}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo *</label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CALL">Llamada</option>
                      <option value="MEETING">Reunión</option>
                      <option value="EMAIL">Email</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
                    <Input
                      name="duration"
                      type="number"
                      min="0"
                      defaultValue="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Asunto *</label>
                  <Input
                    name="subject"
                    required
                    placeholder="Tema de la interacción"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notas *</label>
                  <textarea
                    name="notes"
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Detalles de la interacción..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Resultado *</label>
                  <Input
                    name="outcome"
                    required
                    placeholder="ej: Positivo, Pendiente respuesta, Cerrado"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Interacción
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInteractionModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Manager Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Asignar Responsable de Cuenta</h3>
            <form onSubmit={handleUpdateAccountManager}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Responsable *</label>
                  <Input
                    name="accountManager"
                    defaultValue={customer.accountManager}
                    required
                    placeholder="Nombre del responsable"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

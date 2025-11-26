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
  StickyNote,
  Plus,
  Search,
  Edit,
  Trash2,
  Pin,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Bell,
  Phone,
  Mail,
  FileText
} from 'lucide-react'

interface CustomerNote {
  id: string
  customerId: string
  customerName: string
  title: string
  content: string
  category: 'general' | 'payment' | 'support' | 'sales' | 'complaint' | 'meeting'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  isPinned: boolean
  createdBy: string
  createdDate: string
  lastModified: string
  tags: string[]
  relatedDocuments?: string[]
}

export default function CustomerNotesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [selectedNote, setSelectedNote] = useState<CustomerNote | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const notes: CustomerNote[] = [
    {
      id: 'NOTE-001',
      customerId: 'CUST-001',
      customerName: 'Juan Pérez García',
      title: 'Cliente VIP - Atención Prioritaria',
      content: 'Cliente de alto valor. Ha sido muy puntual en sus pagos durante todo el año. Solicita facturación el primer día de cada mes. Prefiere comunicación por email.',
      category: 'general',
      priority: 'high',
      isPinned: true,
      createdBy: 'Ana Martínez',
      createdDate: '2025-01-15',
      lastModified: '2025-11-20',
      tags: ['VIP', 'Puntual', 'Email'],
      relatedDocuments: ['FAC-2025-001']
    },
    {
      id: 'NOTE-002',
      customerId: 'CUST-002',
      customerName: 'María López Hernández',
      title: 'Reunión Trimestral - Q4 2025',
      content: 'Reunión programada para revisar estado de cuenta y discutir nuevos proyectos para 2026. Cliente interesado en expandir servicios. Enviar propuesta antes del 30 de noviembre.',
      category: 'meeting',
      priority: 'high',
      isPinned: true,
      createdBy: 'Carlos Torres',
      createdDate: '2025-11-22',
      lastModified: '2025-11-24',
      tags: ['Reunión', 'Propuesta', 'Expansión'],
      relatedDocuments: ['COT-2025-015']
    },
    {
      id: 'NOTE-003',
      customerId: 'CUST-003',
      customerName: 'Carlos Ramírez Sánchez',
      title: 'Pago Parcial Acordado',
      content: 'Cliente solicitó división de pago en dos partes debido a flujo de efectivo. Primera mitad pagada el 23/11. Segunda mitad acordada para el 10/12. Confirmación por email adjunta.',
      category: 'payment',
      priority: 'medium',
      isPinned: false,
      createdBy: 'Luis Fernández',
      createdDate: '2025-11-23',
      lastModified: '2025-11-23',
      tags: ['Pago Parcial', 'Acuerdo', 'Flujo'],
      relatedDocuments: ['FAC-2025-005', 'PAG-2025-003']
    },
    {
      id: 'NOTE-004',
      customerId: 'CUST-004',
      customerName: 'Empresa ABC Corp',
      title: 'Solicitud de Descuento - Volumen Alto',
      content: 'Cliente solicita 10% de descuento por volumen en próximas facturas. Revisar con dirección. Volumen anual: $500k+. Cliente clave para retención.',
      category: 'sales',
      priority: 'high',
      isPinned: true,
      createdBy: 'Ana Martínez',
      createdDate: '2025-11-18',
      lastModified: '2025-11-18',
      tags: ['Descuento', 'Volumen', 'Retención'],
      relatedDocuments: []
    },
    {
      id: 'NOTE-005',
      customerId: 'CUST-005',
      customerName: 'TechStart S.A.',
      title: 'Factura Vencida - Seguimiento',
      content: 'FAC-2025-012 vencida desde el 20/11. Se realizaron 2 llamadas (21/11 y 24/11). Cliente menciona problemas internos de aprobación. Comprometido a pagar esta semana. Seguimiento el 27/11.',
      category: 'payment',
      priority: 'urgent',
      isPinned: true,
      createdBy: 'Laura González',
      createdDate: '2025-11-24',
      lastModified: '2025-11-25',
      tags: ['Vencida', 'Seguimiento', 'Urgente'],
      relatedDocuments: ['FAC-2025-012']
    },
    {
      id: 'NOTE-006',
      customerId: 'CUST-006',
      customerName: 'Contadores Asociados',
      title: 'Cliente Satisfecho - Testimonial',
      content: 'Cliente muy satisfecho con el servicio. Ha ofrecido dar testimonial para sitio web. Excelente comunicación y pagos puntuales. Posible referencia a otros contadores.',
      category: 'general',
      priority: 'low',
      isPinned: false,
      createdBy: 'Carlos Torres',
      createdDate: '2025-11-24',
      lastModified: '2025-11-24',
      tags: ['Satisfecho', 'Testimonial', 'Referencias'],
      relatedDocuments: []
    },
    {
      id: 'NOTE-007',
      customerId: 'CUST-007',
      customerName: 'Servicios Pro',
      title: 'Queja sobre Facturación',
      content: 'Cliente reportó error en factura del mes pasado. Se emitió nota de crédito NC-2025-001 por $2,000. Situación resuelta. Cliente agradeció la rapidez en la respuesta.',
      category: 'complaint',
      priority: 'medium',
      isPinned: false,
      createdBy: 'Luis Fernández',
      createdDate: '2025-10-28',
      lastModified: '2025-10-30',
      tags: ['Queja', 'Resuelta', 'Nota Crédito'],
      relatedDocuments: ['FAC-2025-010', 'NC-2025-001']
    },
    {
      id: 'NOTE-008',
      customerId: 'CUST-001',
      customerName: 'Juan Pérez García',
      title: 'Actualización Datos Fiscales',
      content: 'Cliente cambió de domicilio fiscal. Actualizar RFC y dirección en sistema. Nuevo RFC: PEGJ800101ABC. Nueva dirección: Av. Reforma 123, Col. Centro.',
      category: 'support',
      priority: 'medium',
      isPinned: false,
      createdBy: 'Ana Martínez',
      createdDate: '2025-11-20',
      lastModified: '2025-11-20',
      tags: ['RFC', 'Actualización', 'Fiscal'],
      relatedDocuments: []
    },
    {
      id: 'NOTE-009',
      customerId: 'CUST-002',
      customerName: 'María López Hernández',
      title: 'Llamada de Seguimiento - Nuevo Proyecto',
      content: 'Llamada el 25/11 a las 10:00 AM. Cliente interesado en desarrollo de app móvil adicional al proyecto web. Solicita cotización formal. Enviar antes del viernes.',
      category: 'sales',
      priority: 'high',
      isPinned: false,
      createdBy: 'Carlos Torres',
      createdDate: '2025-11-25',
      lastModified: '2025-11-25',
      tags: ['Llamada', 'App Móvil', 'Cotización'],
      relatedDocuments: []
    }
  ]

  const getCategoryBadge = (category: string) => {
    const configs = {
      general: { color: 'blue', label: 'General', icon: StickyNote },
      payment: { color: 'green', label: 'Pagos', icon: MessageSquare },
      support: { color: 'purple', label: 'Soporte', icon: Bell },
      sales: { color: 'orange', label: 'Ventas', icon: Phone },
      complaint: { color: 'red', label: 'Queja', icon: AlertCircle },
      meeting: { color: 'indigo', label: 'Reunión', icon: Calendar }
    }
    
    const config = configs[category as keyof typeof configs]
    if (!config) return null
    
    const Icon = config.icon
    return (
      <Badge className={`bg-${config.color}-100 text-${config.color}-700 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge className="bg-gray-100 text-gray-700">Baja</Badge>
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-700">Media</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-700">Alta</Badge>
      case 'urgent':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Urgente
        </Badge>
      default:
        return null
    }
  }

  const filteredNotes = notes.filter(note => {
    if (filterCustomer !== 'all' && note.customerId !== filterCustomer) return false
    if (filterCategory !== 'all' && note.category !== filterCategory) return false
    if (filterPriority !== 'all' && note.priority !== filterPriority) return false
    if (showPinnedOnly && !note.isPinned) return false
    if (searchTerm && !note.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !note.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !note.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Get unique customers
  const uniqueCustomers = Array.from(new Set(notes.map(n => n.customerName)))
    .map(name => notes.find(n => n.customerName === name)!)

  const totalNotes = notes.length
  const pinnedNotes = notes.filter(n => n.isPinned).length
  const urgentNotes = notes.filter(n => n.priority === 'urgent').length
  const thisWeekNotes = notes.filter(n => {
    const noteDate = new Date(n.createdDate)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return noteDate >= weekAgo
  }).length

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
            <h1 className="text-2xl font-bold text-gray-900">Notas y Seguimiento</h1>
            <p className="text-gray-600 mt-1">
              CRM básico para gestión de relaciones con clientes
            </p>
          </div>
          <Button onClick={() => alert('📝 Nueva Nota\n\nAñadir nota a cliente')}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Nota
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <StickyNote className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalNotes}</div>
              <div className="text-sm text-blue-700">Total de Notas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Pin className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{pinnedNotes}</div>
              <div className="text-sm text-purple-700">Notas Fijadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">{urgentNotes}</div>
              <div className="text-sm text-red-700">Notas Urgentes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{thisWeekNotes}</div>
              <div className="text-sm text-green-700">Esta Semana</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
              >
                <option value="all">Todos los Clientes</option>
                {uniqueCustomers.map(customer => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {customer.customerName}
                  </option>
                ))}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Todas las Categorías</option>
                <option value="general">General</option>
                <option value="payment">Pagos</option>
                <option value="support">Soporte</option>
                <option value="sales">Ventas</option>
                <option value="complaint">Quejas</option>
                <option value="meeting">Reuniones</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinnedOnly"
                  checked={showPinnedOnly}
                  onChange={(e) => setShowPinnedOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="pinnedOnly" className="text-sm text-gray-700">
                  Solo fijadas
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card 
              key={note.id} 
              className={`hover:shadow-lg transition cursor-pointer ${
                note.isPinned ? 'border-2 border-purple-300 bg-purple-50/30' : ''
              }`}
              onClick={() => setSelectedNote(note)}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {note.isPinned && <Pin className="w-4 h-4 text-purple-600" />}
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {note.title}
                      </h3>
                    </div>
                    <p className="text-sm text-blue-600 font-medium mb-1">
                      {note.customerName}
                    </p>
                  </div>
                  {getPriorityBadge(note.priority)}
                </div>

                {/* Content */}
                <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                  {note.content}
                </p>

                {/* Category */}
                <div className="mb-3">
                  {getCategoryBadge(note.category)}
                </div>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {note.createdBy}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.createdDate).toLocaleDateString('es-MX', { 
                      day: '2-digit', 
                      month: 'short' 
                    })}
                  </div>
                </div>

                {/* Related Documents */}
                {note.relatedDocuments && note.relatedDocuments.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <FileText className="w-3 h-3" />
                      <span>{note.relatedDocuments.length} documento(s) relacionado(s)</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Edit logic
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Pin logic
                    }}
                  >
                    <Pin className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Delete logic
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay notas
              </h3>
              <p className="text-gray-600 mb-4">
                Crea tu primera nota para comenzar a dar seguimiento a tus clientes
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Nota
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <StickyNote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">CRM Básico Integrado</h3>
                <p className="text-blue-700 text-sm mb-2">
                  El módulo de notas te permite llevar un seguimiento detallado de todas tus interacciones con clientes.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Organización</strong> por categorías: General, Pagos, Soporte, Ventas, Quejas, Reuniones</li>
                  <li>• <strong>Priorización</strong> con niveles de urgencia para seguimiento efectivo</li>
                  <li>• <strong>Etiquetas</strong> personalizadas para búsqueda rápida</li>
                  <li>• <strong>Vinculación</strong> con facturas, pagos y otros documentos</li>
                  <li>• <strong>Notas fijadas</strong> para información crítica siempre visible</li>
                  <li>• <strong>Historial completo</strong> de interacciones con cada cliente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

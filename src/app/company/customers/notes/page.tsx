'use client'

import { useEffect, useState, useCallback } from 'react'
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
  CheckCircle,
  Clock,
  MessageSquare,
  Bell,
  Phone,
  Mail,
  FileText,
  Info
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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  const [notes, setNotes] = useState<CustomerNote[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadNotes = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/notes?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

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
          <Button onClick={() => {
            setMessage({ type: 'info', text: 'Función Nueva Nota próximamente' });
            setTimeout(() => setMessage(null), 3000);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Nota
          </Button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
             message.type === 'info' ? <Info className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

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

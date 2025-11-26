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
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react'

interface Estimate {
  id: string
  estimateNumber: string
  customer: string
  date: string
  expiryDate: string
  items: number
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
  notes?: string
}

export default function EstimatesPage() {
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

  const estimates: Estimate[] = [
    {
      id: 'EST-001',
      estimateNumber: 'COT-2025-001',
      customer: 'Juan Pérez García',
      date: '2025-11-20',
      expiryDate: '2025-12-20',
      items: 3,
      subtotal: 15000,
      tax: 2400,
      total: 17400,
      status: 'sent',
      notes: 'Incluye 3 meses de soporte gratuito'
    },
    {
      id: 'EST-002',
      estimateNumber: 'COT-2025-002',
      customer: 'María López Hernández',
      date: '2025-11-18',
      expiryDate: '2025-12-18',
      items: 5,
      subtotal: 45000,
      tax: 7200,
      total: 52200,
      status: 'accepted',
      notes: 'Cliente aceptó propuesta'
    },
    {
      id: 'EST-003',
      estimateNumber: 'COT-2025-003',
      customer: 'Carlos Ramírez Sánchez',
      date: '2025-11-15',
      expiryDate: '2025-11-30',
      items: 2,
      subtotal: 8000,
      tax: 1280,
      total: 9280,
      status: 'declined',
      notes: 'Cliente rechazó por presupuesto'
    },
    {
      id: 'EST-004',
      estimateNumber: 'COT-2025-004',
      customer: 'Empresa ABC Corp',
      date: '2025-11-25',
      expiryDate: '2025-12-25',
      items: 8,
      subtotal: 120000,
      tax: 19200,
      total: 139200,
      status: 'draft',
      notes: 'Pendiente de revisión interna'
    },
    {
      id: 'EST-005',
      estimateNumber: 'COT-2025-005',
      customer: 'TechStart S.A.',
      date: '2025-10-15',
      expiryDate: '2025-11-15',
      items: 4,
      subtotal: 25000,
      tax: 4000,
      total: 29000,
      status: 'expired',
      notes: 'Cotización expirada sin respuesta'
    },
    {
      id: 'EST-006',
      estimateNumber: 'COT-2025-006',
      customer: 'Contadores Asociados',
      date: '2025-11-22',
      expiryDate: '2025-12-22',
      items: 6,
      subtotal: 35000,
      tax: 5600,
      total: 40600,
      status: 'sent',
      notes: 'Incluye descuento del 10%'
    },
    {
      id: 'EST-007',
      estimateNumber: 'COT-2025-007',
      customer: 'Servicios Pro',
      date: '2025-11-19',
      expiryDate: '2025-12-19',
      items: 3,
      subtotal: 18000,
      tax: 2880,
      total: 20880,
      status: 'accepted',
      notes: 'Convertir a factura'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Borrador
        </Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Send className="w-3 h-3" /> Enviada
        </Badge>
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Aceptada
        </Badge>
      case 'declined':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rechazada
        </Badge>
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Expirada
        </Badge>
      default:
        return null
    }
  }

  const getDaysRemaining = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expirada'
    if (diffDays === 0) return 'Expira hoy'
    if (diffDays === 1) return 'Expira mañana'
    return `${diffDays} días restantes`
  }

  const filteredEstimates = estimates.filter(est => {
    if (filterStatus !== 'all' && est.status !== filterStatus) return false
    if (searchTerm && !est.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !est.customer.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalEstimates = estimates.length
  const totalValue = estimates.reduce((sum, e) => sum + e.total, 0)
  const acceptedCount = estimates.filter(e => e.status === 'accepted').length
  const acceptanceRate = ((acceptedCount / totalEstimates) * 100).toFixed(0)
  const pendingValue = estimates
    .filter(e => e.status === 'sent')
    .reduce((sum, e) => sum + e.total, 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones y Presupuestos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona propuestas y cotizaciones para tus clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const csv = 'Número,Cliente,Fecha,Monto,Estado\nDatos cotizaciones...'
              const blob = new Blob([csv], { type: 'text/csv' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `cotizaciones-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => alert('📋 Nueva Cotización\n\nCreando cotización...\nPOST /api/estimates')}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cotización
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalEstimates}</div>
              <div className="text-sm text-blue-700">Total Cotizaciones</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Valor Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{acceptanceRate}%</div>
              <div className="text-sm text-purple-700">Tasa de Aceptación</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${pendingValue.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Pendiente Respuesta</div>
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
                  placeholder="Buscar por número o cliente..."
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
                <option value="draft">Borradores</option>
                <option value="sent">Enviadas</option>
                <option value="accepted">Aceptadas</option>
                <option value="declined">Rechazadas</option>
                <option value="expired">Expiradas</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estimates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEstimates.map((estimate) => (
                    <tr key={estimate.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {estimate.estimateNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {estimate.customer}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(estimate.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {new Date(estimate.expiryDate).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                        {estimate.status === 'sent' && (
                          <div className="text-xs text-orange-600">
                            {getDaysRemaining(estimate.expiryDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {estimate.items}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ${estimate.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          +${estimate.tax.toLocaleString()} IVA
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(estimate.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {estimate.status === 'accepted' && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              Convertir a Factura
                            </Button>
                          )}
                          {estimate.status === 'draft' && (
                            <Button size="sm" variant="outline">
                              <Send className="w-4 h-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          {(estimate.status === 'draft' || estimate.status === 'sent') && (
                            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
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

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Flujo de Trabajo de Cotizaciones</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Borrador:</strong> Crea y edita la cotización antes de enviarla</li>
                  <li>• <strong>Enviada:</strong> Cotización enviada al cliente, esperando respuesta</li>
                  <li>• <strong>Aceptada:</strong> Cliente aceptó, lista para convertir en factura</li>
                  <li>• <strong>Rechazada:</strong> Cliente declinó la propuesta</li>
                  <li>• <strong>Expirada:</strong> Venció el plazo sin respuesta del cliente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

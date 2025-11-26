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
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Truck,
  Calendar,
  DollarSign,
  Package,
  AlertCircle
} from 'lucide-react'

interface PurchaseOrder {
  id: string
  poNumber: string
  vendor: string
  vendorId: string
  date: string
  expectedDate: string
  items: number
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'confirmed' | 'partially-received' | 'received' | 'cancelled'
  description: string
  requestedBy: string
  approvedBy?: string
  receivedDate?: string
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVendor, setFilterVendor] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: 'PO-001',
      poNumber: 'PO-2025-001',
      vendor: 'Distribuidora Tech Solutions',
      vendorId: 'VEND-001',
      date: '2025-11-20',
      expectedDate: '2025-12-05',
      items: 15,
      subtotal: 125000,
      tax: 20000,
      total: 145000,
      status: 'sent',
      description: 'Equipos de cómputo para nueva oficina',
      requestedBy: 'Carlos Torres',
      approvedBy: 'Ana Martínez'
    },
    {
      id: 'PO-002',
      poNumber: 'PO-2025-002',
      vendor: 'Papelería Moderna S.A.',
      vendorId: 'VEND-002',
      date: '2025-11-22',
      expectedDate: '2025-11-28',
      items: 45,
      subtotal: 18500,
      tax: 2960,
      total: 21460,
      status: 'confirmed',
      description: 'Suministros de oficina - Q4 2025',
      requestedBy: 'Luis Fernández',
      approvedBy: 'Ana Martínez'
    },
    {
      id: 'PO-003',
      poNumber: 'PO-2025-003',
      vendor: 'Distribuidora Tech Solutions',
      vendorId: 'VEND-001',
      date: '2025-11-15',
      expectedDate: '2025-11-25',
      items: 8,
      subtotal: 45000,
      tax: 7200,
      total: 52200,
      status: 'received',
      description: 'Licencias de software corporativas',
      requestedBy: 'Pedro Sánchez',
      approvedBy: 'Ana Martínez',
      receivedDate: '2025-11-24'
    },
    {
      id: 'PO-004',
      poNumber: 'PO-2025-004',
      vendor: 'Servicios de Limpieza ProClean',
      vendorId: 'VEND-003',
      date: '2025-11-10',
      expectedDate: '2025-12-01',
      items: 25,
      subtotal: 12500,
      tax: 2000,
      total: 14500,
      status: 'partially-received',
      description: 'Productos de limpieza y mantenimiento',
      requestedBy: 'María González',
      approvedBy: 'Carlos Torres',
      receivedDate: '2025-11-23'
    },
    {
      id: 'PO-005',
      poNumber: 'PO-2025-005',
      vendor: 'Papelería Moderna S.A.',
      vendorId: 'VEND-002',
      date: '2025-11-25',
      expectedDate: '2025-12-10',
      items: 12,
      subtotal: 8900,
      tax: 1424,
      total: 10324,
      status: 'draft',
      description: 'Mobiliario para sala de juntas',
      requestedBy: 'Ana Martínez'
    },
    {
      id: 'PO-006',
      poNumber: 'PO-2025-006',
      vendor: 'Transportes Express México',
      vendorId: 'VEND-005',
      date: '2025-11-18',
      expectedDate: '2025-11-30',
      items: 1,
      subtotal: 25000,
      tax: 4000,
      total: 29000,
      status: 'confirmed',
      description: 'Contrato de servicios de logística - Diciembre',
      requestedBy: 'Luis Fernández',
      approvedBy: 'Carlos Torres'
    },
    {
      id: 'PO-007',
      poNumber: 'PO-2025-007',
      vendor: 'Distribuidora Tech Solutions',
      vendorId: 'VEND-001',
      date: '2025-10-25',
      expectedDate: '2025-11-10',
      items: 20,
      subtotal: 85000,
      tax: 13600,
      total: 98600,
      status: 'received',
      description: 'Equipamiento de red y servidores',
      requestedBy: 'Pedro Sánchez',
      approvedBy: 'Ana Martínez',
      receivedDate: '2025-11-08'
    },
    {
      id: 'PO-008',
      poNumber: 'PO-2025-008',
      vendor: 'Internet y Telefonía Global',
      vendorId: 'VEND-008',
      date: '2025-11-05',
      expectedDate: '2025-11-15',
      items: 3,
      subtotal: 15000,
      tax: 2400,
      total: 17400,
      status: 'cancelled',
      description: 'Actualización de líneas telefónicas (CANCELADO)',
      requestedBy: 'Carlos Torres'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Edit className="w-3 h-3" /> Borrador
        </Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Send className="w-3 h-3" /> Enviada
        </Badge>
      case 'confirmed':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Confirmada
        </Badge>
      case 'partially-received':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Package className="w-3 h-3" /> Parcialmente Recibida
        </Badge>
      case 'received':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Recibida
        </Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Cancelada
        </Badge>
      default:
        return null
    }
  }

  const getDaysUntilExpected = (expectedDate: string) => {
    const expected = new Date(expectedDate)
    const today = new Date()
    const diffTime = expected.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Atrasada ${Math.abs(diffDays)} días`
    if (diffDays === 0) return 'Llega hoy'
    if (diffDays === 1) return 'Llega mañana'
    return `Llega en ${diffDays} días`
  }

  const filteredOrders = purchaseOrders.filter(po => {
    if (filterStatus !== 'all' && po.status !== filterStatus) return false
    if (filterVendor !== 'all' && po.vendorId !== filterVendor) return false
    if (searchTerm && !po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !po.vendor.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !po.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const uniqueVendors = Array.from(new Set(purchaseOrders.map(po => po.vendor)))
    .map(name => purchaseOrders.find(po => po.vendor === name)!)

  const totalOrders = purchaseOrders.length
  const totalValue = purchaseOrders
    .filter(po => po.status !== 'cancelled')
    .reduce((sum, po) => sum + po.total, 0)
  const pendingOrders = purchaseOrders.filter(po => 
    po.status === 'sent' || po.status === 'confirmed'
  ).length
  const receivedThisMonth = purchaseOrders.filter(po => 
    po.status === 'received' && po.receivedDate &&
    new Date(po.receivedDate).getMonth() === new Date().getMonth()
  ).length

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
            <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-gray-600 mt-1">
              Gestiona tus pedidos a proveedores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalOrders}</div>
              <div className="text-sm text-blue-700">Total Órdenes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{pendingOrders}</div>
              <div className="text-sm text-purple-700">En Proceso</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{receivedThisMonth}</div>
              <div className="text-sm text-green-700">Recibidas Este Mes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Valor Total</div>
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
                  placeholder="Buscar órdenes..."
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
                <option value="confirmed">Confirmadas</option>
                <option value="partially-received">Parcialmente Recibidas</option>
                <option value="received">Recibidas</option>
                <option value="cancelled">Canceladas</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="all">Todos los Proveedores</option>
                {uniqueVendors.map(vendor => (
                  <option key={vendor.vendorId} value={vendor.vendorId}>
                    {vendor.vendor}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Órdenes ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Entrega Esperada</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {po.poNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          Por: {po.requestedBy}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {po.vendor}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {po.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(po.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(po.expectedDate).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                        {(po.status === 'sent' || po.status === 'confirmed') && (
                          <div className="text-xs text-orange-600">
                            {getDaysUntilExpected(po.expectedDate)}
                          </div>
                        )}
                        {po.receivedDate && (
                          <div className="text-xs text-green-600">
                            Recibida: {new Date(po.receivedDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {po.items}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ${po.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          +${po.tax.toLocaleString()} IVA
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {po.status === 'draft' && (
                            <Button size="sm" variant="outline">
                              <Send className="w-4 h-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                          {(po.status === 'confirmed' || po.status === 'partially-received') && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              <Truck className="w-4 h-4 mr-1" />
                              Recibir
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          {po.status === 'draft' && (
                            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4" />
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
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Órdenes de Compra</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Las órdenes de compra formalizan tus pedidos a proveedores y facilitan el control de inventario y gastos.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Flujo de aprobación:</strong> Borrador → Enviada → Confirmada → Recibida</li>
                  <li>• <strong>Control de entregas:</strong> Seguimiento de fechas esperadas vs reales</li>
                  <li>• <strong>Recepción parcial:</strong> Registra entregas por partes</li>
                  <li>• <strong>Vinculación automática:</strong> Genera facturas por pagar al recibir</li>
                  <li>• <strong>Historial completo:</strong> Auditoría de compras por proveedor</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

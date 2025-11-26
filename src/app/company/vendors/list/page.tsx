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
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Building2,
  Download
} from 'lucide-react'

interface Vendor {
  id: string
  vendorNumber: string
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  taxId: string
  paymentTerms: string
  category: string
  status: 'active' | 'inactive' | 'blocked'
  totalPurchases: number
  currentBalance: number
  lastPurchase?: string
  createdDate: string
}

export default function VendorsListPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showNewVendorModal, setShowNewVendorModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const vendors: Vendor[] = [
    {
      id: 'VEND-001',
      vendorNumber: 'PROV-001',
      name: 'Distribuidora Tech Solutions',
      contactName: 'Roberto Gómez',
      email: 'compras@techsolutions.com',
      phone: '+52 55 1234-5678',
      address: 'Av. Insurgentes Sur 1234',
      city: 'Ciudad de México',
      country: 'México',
      taxId: 'DTS950615ABC',
      paymentTerms: 'Net 30',
      category: 'Tecnología',
      status: 'active',
      totalPurchases: 450000,
      currentBalance: 25000,
      lastPurchase: '2025-11-20',
      createdDate: '2024-01-15'
    },
    {
      id: 'VEND-002',
      vendorNumber: 'PROV-002',
      name: 'Papelería Moderna S.A.',
      contactName: 'Ana Patricia Ruiz',
      email: 'ventas@papeleriamoderna.com',
      phone: '+52 55 2345-6789',
      address: 'Calle Reforma 567',
      city: 'Guadalajara',
      country: 'México',
      taxId: 'PMO880420XYZ',
      paymentTerms: 'Net 15',
      category: 'Suministros',
      status: 'active',
      totalPurchases: 125000,
      currentBalance: 8500,
      lastPurchase: '2025-11-24',
      createdDate: '2024-03-10'
    },
    {
      id: 'VEND-003',
      vendorNumber: 'PROV-003',
      name: 'Servicios de Limpieza ProClean',
      contactName: 'Jorge Martínez',
      email: 'contacto@proclean.mx',
      phone: '+52 55 3456-7890',
      address: 'Blvd. Manuel Ávila Camacho 890',
      city: 'Ciudad de México',
      country: 'México',
      taxId: 'SLP920315DEF',
      paymentTerms: 'Net 7',
      category: 'Servicios',
      status: 'active',
      totalPurchases: 85000,
      currentBalance: 0,
      lastPurchase: '2025-11-15',
      createdDate: '2024-05-20'
    },
    {
      id: 'VEND-004',
      vendorNumber: 'PROV-004',
      name: 'Inmobiliaria del Centro',
      contactName: 'Mariana Torres',
      email: 'arrendamiento@inmobiliariacentro.com',
      phone: '+52 55 4567-8901',
      address: 'Paseo de la Reforma 1500',
      city: 'Ciudad de México',
      country: 'México',
      taxId: 'IDC850710GHI',
      paymentTerms: 'Net 5',
      category: 'Arrendamiento',
      status: 'active',
      totalPurchases: 720000,
      currentBalance: 60000,
      lastPurchase: '2025-11-01',
      createdDate: '2023-11-01'
    },
    {
      id: 'VEND-005',
      vendorNumber: 'PROV-005',
      name: 'Transportes Express México',
      contactName: 'Luis Fernando Castro',
      email: 'logistica@transportesexpress.com',
      phone: '+52 55 5678-9012',
      address: 'Carretera México-Querétaro Km 45',
      city: 'Querétaro',
      country: 'México',
      taxId: 'TEM930525JKL',
      paymentTerms: 'Net 15',
      category: 'Logística',
      status: 'active',
      totalPurchases: 180000,
      currentBalance: 12000,
      lastPurchase: '2025-11-22',
      createdDate: '2024-02-28'
    },
    {
      id: 'VEND-006',
      vendorNumber: 'PROV-006',
      name: 'Consultoría Legal Pérez & Asociados',
      contactName: 'Lic. Alberto Pérez',
      email: 'atencion@perezasociados.com',
      phone: '+52 55 6789-0123',
      address: 'Av. Constituyentes 234',
      city: 'Ciudad de México',
      country: 'México',
      taxId: 'CLP870820MNO',
      paymentTerms: 'Net 30',
      category: 'Servicios Profesionales',
      status: 'active',
      totalPurchases: 250000,
      currentBalance: 35000,
      lastPurchase: '2025-11-18',
      createdDate: '2024-06-15'
    },
    {
      id: 'VEND-007',
      vendorNumber: 'PROV-007',
      name: 'Café y Snacks del Pacífico',
      contactName: 'Elena Rojas',
      email: 'pedidos@cafedelpacifico.com',
      phone: '+52 55 7890-1234',
      address: 'Av. Revolución 456',
      city: 'Ciudad de México',
      country: 'México',
      taxId: 'CSP910612PQR',
      paymentTerms: 'Net 7',
      category: 'Alimentos',
      status: 'inactive',
      totalPurchases: 45000,
      currentBalance: 0,
      lastPurchase: '2025-08-30',
      createdDate: '2024-04-10'
    },
    {
      id: 'VEND-008',
      vendorNumber: 'PROV-008',
      name: 'Internet y Telefonía Global',
      contactName: 'Carlos Mendoza',
      email: 'empresas@telecomglobal.com',
      phone: '+52 55 8901-2345',
      address: 'Torre Corporativa, Piso 15',
      city: 'Monterrey',
      country: 'México',
      taxId: 'ITG860405STU',
      paymentTerms: 'Net 15',
      category: 'Telecomunicaciones',
      status: 'active',
      totalPurchases: 95000,
      currentBalance: 7800,
      lastPurchase: '2025-11-25',
      createdDate: '2023-12-01'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Activo
        </Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700">
          Inactivo
        </Badge>
      case 'blocked':
        return <Badge className="bg-red-100 text-red-700">
          Bloqueado
        </Badge>
      default:
        return null
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    if (filterStatus !== 'all' && vendor.status !== filterStatus) return false
    if (filterCategory !== 'all' && vendor.category !== filterCategory) return false
    if (searchTerm && !vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !vendor.vendorNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !vendor.email.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const categories = Array.from(new Set(vendors.map(v => v.category)))
  const totalVendors = vendors.length
  const activeVendors = vendors.filter(v => v.status === 'active').length
  const totalPayables = vendors.reduce((sum, v) => sum + v.currentBalance, 0)
  const totalSpent = vendors.reduce((sum, v) => sum + v.totalPurchases, 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Lista de Proveedores</h1>
            <p className="text-gray-600 mt-1">
              Directorio completo de proveedores y vendedores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const csv = 'Código,Nombre,Email,Teléfono,Ciudad,Balance\n' + 
                filteredVendors.map(v => 
                  `${v.vendorNumber},"${v.name}",${v.email},${v.phone},${v.city},$${v.currentBalance}`
                ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `proveedores-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewVendorModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalVendors}</div>
              <div className="text-sm text-blue-700">Total Proveedores</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{activeVendors}</div>
              <div className="text-sm text-green-700">Proveedores Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalPayables.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Cuentas por Pagar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalSpent.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Total Comprado</div>
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
                  placeholder="Buscar proveedores..."
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
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="blocked">Bloqueados</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Todas las Categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Vendors List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {vendor.name}
                          </h3>
                          {getStatusBadge(vendor.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-mono font-semibold text-blue-600">{vendor.vendorNumber}</span>
                          {' • '}RFC: {vendor.taxId}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-600">Contacto</label>
                        <p className="text-sm font-medium text-gray-900">{vendor.contactName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Mail className="w-3 h-3" />
                          {vendor.email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Phone className="w-3 h-3" />
                          {vendor.phone}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Ubicación</label>
                        <div className="flex items-start gap-1 text-sm text-gray-900">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{vendor.address}</p>
                            <p>{vendor.city}, {vendor.country}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Categoría</label>
                        <Badge className="bg-purple-100 text-purple-700 mt-1">
                          {vendor.category}
                        </Badge>
                        <p className="text-xs text-gray-600 mt-2">Términos de Pago</p>
                        <p className="text-sm font-medium text-gray-900">{vendor.paymentTerms}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Financiero</label>
                        <p className="text-sm text-gray-700 mb-1">
                          Total Comprado: <span className="font-semibold text-gray-900">${vendor.totalPurchases.toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-gray-700 mb-1">
                          Saldo Actual: <span className="font-semibold text-orange-600">${vendor.currentBalance.toLocaleString()}</span>
                        </p>
                        {vendor.lastPurchase && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                            <Calendar className="w-3 h-3" />
                            Última compra: {new Date(vendor.lastPurchase).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-1" />
                      Estado Cuenta
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

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Gestión de Proveedores</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Administra tu directorio de proveedores y mantén actualizada toda la información necesaria 
                  para tus procesos de compra y cuentas por pagar.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Información completa:</strong> Datos de contacto, fiscales y comerciales</li>
                  <li>• <strong>Términos de pago:</strong> Controla condiciones comerciales con cada proveedor</li>
                  <li>• <strong>Categorización:</strong> Organiza por tipo de producto o servicio</li>
                  <li>• <strong>Seguimiento financiero:</strong> Historial de compras y saldos pendientes</li>
                  <li>• <strong>Estados de cuenta:</strong> Genera reportes por proveedor</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nuevo Proveedor */}
        {showNewVendorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewVendorModal(false)}>
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Nuevo Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre del Proveedor</label>
                    <Input placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre de Contacto</label>
                    <Input placeholder="Juan Pérez" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="contacto@proveedor.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input placeholder="+52 55 1234-5678" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Dirección</label>
                  <Input placeholder="Calle Principal 123" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Ciudad</label>
                    <Input placeholder="Ciudad de México" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">País</label>
                    <Input placeholder="México" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">RFC / Tax ID</label>
                    <Input placeholder="ABC123456XYZ" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Suministros</option>
                      <option>Servicios</option>
                      <option>Arrendamiento</option>
                      <option>Tecnología</option>
                      <option>Profesionales</option>
                      <option>Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Términos de Pago</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Net 30</option>
                      <option>Net 15</option>
                      <option>Net 7</option>
                      <option>Due on Receipt</option>
                      <option>Net 45</option>
                      <option>Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Activo</option>
                      <option>Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowNewVendorModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    alert('✅ Proveedor creado exitosamente\n\nEn producción, esto enviaría:\nPOST /api/vendors')
                    setShowNewVendorModal(false)
                  }}>
                    Crear Proveedor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

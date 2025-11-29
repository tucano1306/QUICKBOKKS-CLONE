'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Building, 
  Users,
  Download,
  Eye,
  Send,
  FileSpreadsheet,
  FileDown,
  Settings,
  StickyNote,
  UserCircle,
  Upload,
  FileText,
  Receipt,
  DollarSign,
  Activity,
  TrendingUp,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCompany } from '@/contexts/CompanyContext'
import { format } from 'date-fns'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  taxId: string | null
  status: string
  portalActive: boolean
  portalLastLogin: string | null
  createdAt: string
  _count?: {
    invoices: number
  }
}

interface CustomerFormData {
  name: string
  email: string
  phone: string
  company: string
  address: string
  taxId: string
  status: string
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const router = useRouter()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [portalFilter, setPortalFilter] = useState<string>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    taxId: '',
    status: 'ACTIVE'
  })

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'ACTIVE').length,
    portal: customers.filter(c => c.portalActive).length,
    inactive: customers.filter(c => c.status === 'INACTIVE').length
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchCustomers()
    }
  }, [status, activeCompany])

  useEffect(() => {
    let filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    if (portalFilter === 'ACTIVE') {
      filtered = filtered.filter(c => c.portalActive === true)
    } else if (portalFilter === 'INACTIVE') {
      filtered = filtered.filter(c => c.portalActive === false)
    }

    setFilteredCustomers(filtered)
  }, [searchTerm, statusFilter, portalFilter, customers])

  const fetchCustomers = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/customers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setCustomers(Array.isArray(data) ? data : [])
        setFilteredCustomers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return

    console.log('🟢 AGREGAR CLIENTE - Datos:', formData)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId: activeCompany.id
        })
      })

      if (response.ok) {
        console.log('✅ Cliente agregado exitosamente')
        toast.success('Cliente agregado exitosamente')
        setShowAddModal(false)
        resetForm()
        fetchCustomers()
      } else {
        const errorData = await response.json()
        console.error('❌ Error al agregar:', errorData)
        throw new Error('Error al agregar cliente')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al agregar cliente')
    }
  }

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return

    console.log('🟡 EDITAR CLIENTE - ID:', selectedCustomer.id, 'Datos:', formData)

    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        console.log('✅ Cliente actualizado exitosamente')
        toast.success('Cliente actualizado exitosamente')
        setShowEditModal(false)
        setSelectedCustomer(null)
        resetForm()
        fetchCustomers()
      } else {
        const errorData = await response.json()
        console.error('❌ Error al actualizar:', errorData)
        throw new Error('Error al actualizar cliente')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al actualizar cliente')
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    console.log('🔴 ELIMINAR CLIENTE - ID:', customerId)
    
    if (!confirm('¿Estás seguro de eliminar este cliente?')) {
      console.log('❌ Eliminación cancelada')
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('✅ Cliente eliminado exitosamente')
        toast.success('Cliente eliminado exitosamente')
        fetchCustomers()
      } else {
        const errorData = await response.json()
        console.error('❌ Error al eliminar:', errorData)
        throw new Error('Error al eliminar cliente')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al eliminar cliente')
    }
  }

  const handleInviteToPortal = async (customer: Customer) => {
    console.log('📧 INVITAR AL PORTAL - Cliente:', customer.name, 'Email:', customer.email)
    
    if (!customer.email) {
      console.log('❌ El cliente no tiene email')
      toast.error('El cliente no tiene email registrado')
      return
    }

    try {
      const response = await fetch('/api/customers/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      })

      if (response.ok) {
        console.log('✅ Invitación enviada exitosamente')
        toast.success(`Invitación enviada a ${customer.email}`)
        fetchCustomers()
      } else {
        const errorData = await response.json()
        console.error('❌ Error al invitar:', errorData)
        throw new Error('Error al enviar invitación')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al enviar invitación')
    }
  }

  const openEditModal = (customer: Customer) => {
    console.log('✏️ ABRIR MODAL EDITAR - Cliente:', customer.name)
    
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      taxId: customer.taxId || '',
      status: customer.status
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      taxId: '',
      status: 'ACTIVE'
    })
  }

  const exportToExcel = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Empresa', 'RFC', 'Estado', 'Portal']
    const rows = filteredCustomers.map(c => [
      c.name,
      c.email || '',
      c.phone || '',
      c.company || '',
      c.taxId || '',
      c.status,
      c.portalActive ? 'Activo' : 'Inactivo'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Exportado a Excel')
  }

  const exportToPDF = () => {
    toast.success('Exportando a PDF...')
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-1">Gestiona tu directorio de clientes</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Portal</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.portal}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactivos</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, email o empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inactivos</option>
                </select>
              </div>

              <div>
                <select
                  value={portalFilter}
                  onChange={(e) => setPortalFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Todos (Portal)</option>
                  <option value="ACTIVE">Con portal activo</option>
                  <option value="INACTIVE">Sin portal</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/customers/pipeline">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Pipeline
            </Button>
          </Link>
          <Link href="/customers/crm-report">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Reporte CRM
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Directorio de Clientes ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.taxId || 'Sin RFC'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.company && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Building className="h-3 w-3" />
                              {customer.company}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.portalActive ? (
                            <Badge variant="default" className="bg-green-600">
                              <Activity className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Sin acceso</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {/* BOTÓN: Ver Detalles */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/customers/${customer.id}`; }}
                              className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                            >
                              <Eye className="h-4 w-4 mr-1 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-700">Ver</span>
                            </Button>

                            {/* BOTÓN: Editar */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(customer); }}
                              className="bg-green-50 hover:bg-green-100 border-green-300"
                            >
                              <Edit className="h-4 w-4 mr-1 text-green-600" />
                              <span className="text-xs font-semibold text-green-700">Editar</span>
                            </Button>

                            {/* BOTÓN: Invitar al Portal */}
                            {customer.email && !customer.portalActive && (
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInviteToPortal(customer); }}
                                className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                              >
                                <Send className="h-4 w-4 mr-1 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">Invitar</span>
                              </Button>
                            )}

                            {/* BOTÓN: Configurar Permisos */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedCustomer(customer); 
                                setShowPermissionsModal(true); 
                              }}
                              className="bg-purple-50 hover:bg-purple-100 border-purple-300"
                            >
                              <Settings className="h-4 w-4 mr-1 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700">Config</span>
                            </Button>

                            {/* BOTÓN: Ver Actividad Portal */}
                            {customer.portalActive && (
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/customers/${customer.id}/activity`; }}
                                className="bg-green-50 hover:bg-green-100 border-green-300"
                              >
                                <Activity className="h-4 w-4 mr-1 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">Actividad</span>
                              </Button>
                            )}

                            {/* BOTÓN: Subir Documentos */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/company/documents/upload?customerId=${customer.id}`; }}
                              className="bg-orange-50 hover:bg-orange-100 border-orange-300"
                            >
                              <Upload className="h-4 w-4 mr-1 text-orange-600" />
                              <span className="text-xs font-semibold text-orange-700">Docs</span>
                            </Button>

                            {/* BOTÓN: Ver Transacciones */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/company/customers/transactions?customerId=${customer.id}`; }}
                              className="bg-indigo-50 hover:bg-indigo-100 border-indigo-300"
                            >
                              <DollarSign className="h-4 w-4 mr-1 text-indigo-600" />
                              <span className="text-xs font-semibold text-indigo-700">Trans</span>
                            </Button>

                            {/* BOTÓN: Ver Facturas */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/invoices?customerId=${customer.id}`; }}
                              className="bg-teal-50 hover:bg-teal-100 border-teal-300"
                            >
                              <Receipt className="h-4 w-4 mr-1 text-teal-600" />
                              <span className="text-xs font-semibold text-teal-700">Facturas</span>
                            </Button>

                            {/* BOTÓN: Notas y Seguimiento */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/customers/${customer.id}/notes`; }}
                              className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
                            >
                              <StickyNote className="h-4 w-4 mr-1 text-yellow-600" />
                              <span className="text-xs font-semibold text-yellow-700">Notas</span>
                            </Button>

                            {/* BOTÓN: CRM 360° */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/customers/${customer.id}/crm`; }}
                              className="bg-pink-50 hover:bg-pink-100 border-pink-300"
                            >
                              <UserCircle className="h-4 w-4 mr-1 text-pink-600" />
                              <span className="text-xs font-semibold text-pink-700">CRM</span>
                            </Button>

                            {/* BOTÓN: Eliminar */}
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                              className="bg-red-50 hover:bg-red-100 border-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                              <span className="text-xs font-semibold text-red-700">Borrar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Agregar Nuevo Cliente</h3>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Juan Pérez" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan@empresa.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+52 123 456 7890" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RFC / Tax ID</label>
                    <Input value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} placeholder="XAXX010101000" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Empresa SA de CV" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Calle, Número, Colonia, Ciudad, CP" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Cliente
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Editar Cliente</h3>
                <button onClick={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RFC / Tax ID</label>
                    <Input value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Actualizar Cliente
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPermissionsModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Configurar Permisos - {selectedCustomer.name}</h3>
                <button onClick={() => { setShowPermissionsModal(false); setSelectedCustomer(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const permissions = {
                  viewInvoices: formData.get('viewInvoices') === 'on',
                  downloadDocs: formData.get('downloadDocs') === 'on',
                  viewStatement: formData.get('viewStatement') === 'on',
                  makePayments: formData.get('makePayments') === 'on',
                  requestInvoices: formData.get('requestInvoices') === 'on'
                }
                toast.success('Permisos actualizados correctamente')
                console.log('Permisos guardados:', permissions)
                setShowPermissionsModal(false)
                setSelectedCustomer(null)
              }}>
                <div className="space-y-4 mb-6">
                  {[
                    { name: 'viewInvoices', label: 'Ver Facturas', desc: 'Permite ver todas sus facturas', checked: true },
                    { name: 'downloadDocs', label: 'Descargar Documentos', desc: 'Descargar PDFs y XMLs', checked: true },
                    { name: 'viewStatement', label: 'Ver Estado de Cuenta', desc: 'Ver saldos y movimientos', checked: true },
                    { name: 'makePayments', label: 'Realizar Pagos', desc: 'Pagar facturas en línea', checked: false },
                    { name: 'requestInvoices', label: 'Solicitar Facturas', desc: 'Pedir nuevas facturas', checked: false }
                  ].map((perm) => (
                    <div key={perm.name} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{perm.label}</p>
                        <p className="text-xs text-gray-500">{perm.desc}</p>
                      </div>
                      <input type="checkbox" name={perm.name} defaultChecked={perm.checked} className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowPermissionsModal(false); setSelectedCustomer(null); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Settings className="h-4 w-4 mr-2" />
                    Guardar Permisos
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShoppingCart,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

const DEFAULT_COMPANY_ID = 'default-company-001'

const CATEGORY_OPTIONS = [
  'Suministros',
  'Servicios',
  'Arrendamiento',
  'Tecnología',
  'Profesionales',
  'Logística',
  'Telecomunicaciones',
  'Alimentos',
  'Otro',
]

const PAYMENT_TERMS = ['Net 30', 'Net 15', 'Net 7', 'Net 45', 'Net 60', 'Due on Receipt']

const STATUS_LABELS: Record<'ACTIVE' | 'INACTIVE' | 'BLOCKED', string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BLOCKED: 'Bloqueado',
}

interface Vendor {
  id: string
  vendorNumber: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  taxId?: string
  paymentTerms?: string
  category?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  totalPurchases: number
  currentBalance: number
  lastPurchase?: string
  createdAt: string
  notes?: string
  _count?: {
    payables: number
  }
}

interface VendorPayable {
  id: string
  billNumber: string
  dueDate: string
  total: number
  balance: number
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  description?: string
  reference?: string
}

interface VendorDetail extends Vendor {
  payables?: VendorPayable[]
}

interface VendorForm {
  id?: string
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  taxId: string
  category: string
  paymentTerms: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  notes: string
}

const emptyForm: VendorForm = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'México',
  taxId: '',
  category: CATEGORY_OPTIONS[0],
  paymentTerms: PAYMENT_TERMS[0],
  status: 'ACTIVE',
  notes: '',
}

const statusBadgeClass: Record<'ACTIVE' | 'INACTIVE' | 'BLOCKED', string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLOCKED: 'bg-red-100 text-red-700',
}

const payableBadgeClass: Record<VendorPayable['status'], string> = {
  UNPAID: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
}

export default function VendorsListPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany, isLoading: companyLoading } = useCompany()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<VendorForm>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailVendor, setDetailVendor] = useState<VendorDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statementLoadingId, setStatementLoadingId] = useState<string | null>(null)

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const userId = session?.user?.id
  const companyId = activeCompany?.id || DEFAULT_COMPANY_ID

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchVendors = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/vendors?companyId=${companyId}&limit=200`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al obtener proveedores')
      }
      const payload = await response.json()
      const data = Array.isArray(payload) ? payload : payload.data || []
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error('No pudimos cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }, [companyId, userId])

  useEffect(() => {
    if (status === 'authenticated' && !companyLoading) {
      fetchVendors()
    }
  }, [status, companyLoading, fetchVendors])

  const filteredVendors = useMemo(() => {
    const statusFilter = filterStatus !== 'all' ? filterStatus.toUpperCase() : null
    const categoryFilter = filterCategory !== 'all' ? filterCategory : null
    const term = searchTerm.toLowerCase()

    return vendors.filter((vendor) => {
      if (statusFilter && vendor.status !== statusFilter) return false
      if (categoryFilter && vendor.category !== categoryFilter) return false
      if (!term) return true
      return (
        vendor.name?.toLowerCase().includes(term) ||
        vendor.vendorNumber?.toLowerCase().includes(term) ||
        vendor.email?.toLowerCase().includes(term) ||
        vendor.contactName?.toLowerCase().includes(term)
      )
    })
  }, [vendors, searchTerm, filterStatus, filterCategory])

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterCategory])

  // Datos paginados
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVendors.slice(start, start + pageSize)
  }, [filteredVendors, currentPage, pageSize])

  const totalPages = Math.ceil(filteredVendors.length / pageSize)

  const categories = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.category).filter(Boolean))) as string[],
    [vendors]
  )

  const totalVendors = vendors.length
  const activeVendors = vendors.filter((v) => v.status === 'ACTIVE').length
  const totalPayables = vendors.reduce((sum, v) => sum + (v.currentBalance || 0), 0)
  const totalSpent = vendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0)

  const isBusy = status === 'loading' || loading || companyLoading

  const getStatusBadge = (status: Vendor['status']) => (
    <Badge className={`${statusBadgeClass[status]} flex items-center gap-1`}>
      <CheckCircle2 className="w-3 h-3" /> {STATUS_LABELS[status]}
    </Badge>
  )

  const getPayableBadge = (status: VendorPayable['status']) => (
    <Badge className={`${payableBadgeClass[status]} text-xs font-semibold`}>
      {status === 'UNPAID' && 'Por pagar'}
      {status === 'PARTIAL' && 'Pago parcial'}
      {status === 'PAID' && 'Pagado'}
      {status === 'OVERDUE' && 'Vencido'}
    </Badge>
  )

  const openCreateModal = () => {
    setModalMode('create')
    setFormData(emptyForm)
    setShowVendorModal(true)
  }

  const openEditModal = (vendor: Vendor) => {
    setModalMode('edit')
    setFormData({
      id: vendor.id,
      name: vendor.name || '',
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      country: vendor.country || 'México',
      taxId: vendor.taxId || '',
      category: vendor.category || CATEGORY_OPTIONS[0],
      paymentTerms: vendor.paymentTerms || PAYMENT_TERMS[0],
      status: vendor.status,
      notes: vendor.notes || '',
    })
    setShowVendorModal(true)
  }

  const handleFormChange = (field: keyof VendorForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitVendor = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        companyId,
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country || 'México',
        taxId: formData.taxId.trim() || undefined,
        category: formData.category,
        paymentTerms: formData.paymentTerms,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      }

      const url =
        modalMode === 'create'
          ? '/api/vendors'
          : `/api/vendors/${formData.id}?companyId=${companyId}`

      const response = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'No pudimos guardar el proveedor')
      }

      toast.success(
        modalMode === 'create' ? 'Proveedor creado correctamente' : 'Proveedor actualizado'
      )
      setShowVendorModal(false)
      setFormData(emptyForm)
      await fetchVendors()
    } catch (error) {
      console.error('Error saving vendor:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar el proveedor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(
        `/api/vendors/${vendorToDelete.id}?companyId=${companyId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'No pudimos eliminar al proveedor')
      }

      toast.success('Proveedor eliminado')
      setVendorToDelete(null)
      await fetchVendors()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar proveedor')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleViewVendor = async (vendor: Vendor) => {
    setShowDetailModal(true)
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/vendors/${vendor.id}?companyId=${companyId}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'No pudimos cargar el proveedor')
      }
      const payload = await response.json()
      setDetailVendor(payload)
    } catch (error) {
      console.error('Error loading vendor detail:', error)
      toast.error('No pudimos mostrar la información del proveedor')
      setShowDetailModal(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownloadStatement = async (vendor: Vendor) => {
    setStatementLoadingId(vendor.id)
    try {
      const response = await fetch(
        `/api/vendors/payables?vendorId=${vendor.id}&companyId=${companyId}&limit=500`
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al generar el estado de cuenta')
      }
      const payload = await response.json()
      const payables: VendorPayable[] = payload.data || []
      const header = 'Factura,Descripción,Vencimiento,Monto,Saldo,Estado\n'
      const rows = payables
        .map((p) =>
          [
            p.billNumber,
            p.description || '',
            new Date(p.dueDate).toLocaleDateString('es-MX'),
            `$${p.total.toLocaleString()}`,
            `$${p.balance.toLocaleString()}`,
            p.status,
          ].join(',')
        )
        .join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `estado-cuenta-${vendor.vendorNumber}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Estado de cuenta generado')
    } catch (error) {
      console.error('Error exporting statement:', error)
      toast.error('No pudimos exportar el estado de cuenta')
    } finally {
      setStatementLoadingId(null)
    }
  }

  const handleExportVendors = (format: 'csv' | 'excel') => {
    const header = 'Código,Nombre,Email,Teléfono,Ciudad,Saldo,Estado\n'
    const rows = filteredVendors
      .map((vendor) =>
        [
          vendor.vendorNumber,
          `"${vendor.name}"`,
          vendor.email || '',
          vendor.phone || '',
          vendor.city || '',
          `$${vendor.currentBalance.toLocaleString()}`,
          STATUS_LABELS[vendor.status],
        ].join(',')
      )
      .join('\n')

    const blob = new Blob([header + rows], {
      type:
        format === 'excel'
          ? 'application/vnd.ms-excel;charset=utf-8;'
          : 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = format === 'excel' ? 'proveedores.xlsx' : 'proveedores.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Directorio exportado a ${format === 'excel' ? 'Excel' : 'CSV'}`)
  }

  const handlePrintDirectory = () => {
    if (typeof window === 'undefined') return
    const rows = filteredVendors
      .map(
        (vendor) =>
          `<tr>
            <td>${vendor.vendorNumber}</td>
            <td>${vendor.name}</td>
            <td>${vendor.email || ''}</td>
            <td>${vendor.phone || ''}</td>
            <td>${vendor.city || ''}</td>
            <td>${STATUS_LABELS[vendor.status]}</td>
          </tr>`
      )
      .join('')

    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Directorio de Proveedores</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f3f4f6; }
      </style>
    </head>
    <body>
      <h1>Directorio de Proveedores</h1>
      <p>Generado el ${new Date().toLocaleString('es-MX')}</p>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Proveedor</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Ciudad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (isBusy) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Proveedores</h1>
            <p className="text-gray-600 mt-1">
              Directorio completo de proveedores y vendedores
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleExportVendors('csv')}>
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExportVendors('excel')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" onClick={handlePrintDirectory}>
              <Printer className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" onClick={fetchVendors}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
            </Button>
          </div>
        </div>

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

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 relative min-w-[200px]">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                {categories.map((category) => (
                  <option key={category} value={category ?? ''}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {paginatedVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                          {getStatusBadge(vendor.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-mono font-semibold text-blue-600">
                            {vendor.vendorNumber}
                          </span>
                          {' • '}RFC: {vendor.taxId || 'No registrado'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-gray-600">Contacto</label>
                        <p className="text-sm font-medium text-gray-900">
                          {vendor.contactName || 'Sin asignar'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Mail className="w-3 h-3" />
                          {vendor.email || '—'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Phone className="w-3 h-3" />
                          {vendor.phone || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Ubicación</label>
                        <div className="flex items-start gap-1 text-sm text-gray-900">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{vendor.address || 'Sin dirección'}</p>
                            <p>
                              {vendor.city || 'Ciudad'}, {vendor.country || 'País'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Categoría</label>
                        <Badge className="bg-purple-100 text-purple-700 mt-1">
                          {vendor.category || 'Por definir'}
                        </Badge>
                        <p className="text-xs text-gray-600 mt-2">Términos de Pago</p>
                        <p className="text-sm font-medium text-gray-900">
                          {vendor.paymentTerms || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Financiero</label>
                        <p className="text-sm text-gray-700 mb-1">
                          Total Comprado:
                          <span className="font-semibold text-gray-900">
                            ${vendor.totalPurchases.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-sm text-gray-700 mb-1">
                          Saldo Actual:
                          <span className="font-semibold text-orange-600">
                            ${vendor.currentBalance.toLocaleString()}
                          </span>
                        </p>
                        {vendor.lastPurchase && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                            <Calendar className="w-3 h-3" /> Última compra:{' '}
                            {new Date(vendor.lastPurchase).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <Button size="sm" variant="outline" onClick={() => handleViewVendor(vendor)}>
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditModal(vendor)}>
                      <Edit className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadStatement(vendor)}
                      disabled={statementLoadingId === vendor.id}
                    >
                      {statementLoadingId === vendor.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-1" />
                      )}
                      Estado Cuenta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/company/vendors/purchase-orders?vendorId=${vendor.id}`)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" /> Órdenes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => setVendorToDelete(vendor)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paginación */}
        {filteredVendors.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredVendors.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
          />
        )}

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Gestión de Proveedores</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Administra tu directorio y mantén actualizada toda la información necesaria para tus
                  procesos de compra y cuentas por pagar.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Información completa:</strong> Datos de contacto y fiscales</li>
                  <li>• <strong>Términos de pago:</strong> Controla condiciones por proveedor</li>
                  <li>• <strong>Historial:</strong> Seguimiento financiero y últimas compras</li>
                  <li>• <strong>Estados de cuenta:</strong> Exporta reportes en segundos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {showVendorModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowVendorModal(false)}
          >
            <Card
              className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>
                  {modalMode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre del Proveedor</label>
                    <Input
                      placeholder="Acme Corp"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre de Contacto</label>
                    <Input
                      placeholder="Juan Pérez"
                      value={formData.contactName}
                      onChange={(e) => handleFormChange('contactName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="contacto@proveedor.com"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      placeholder="+52 55 1234-5678"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Dirección</label>
                  <Input
                    placeholder="Calle Principal 123"
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Ciudad</label>
                    <Input
                      placeholder="Ciudad de México"
                      value={formData.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">País</label>
                    <Input
                      placeholder="México"
                      value={formData.country}
                      onChange={(e) => handleFormChange('country', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">RFC / Tax ID</label>
                    <Input
                      placeholder="ABC123456XYZ"
                      value={formData.taxId}
                      onChange={(e) => handleFormChange('taxId', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Términos de Pago</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={formData.paymentTerms}
                      onChange={(e) => handleFormChange('paymentTerms', e.target.value)}
                    >
                      {PAYMENT_TERMS.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={formData.status}
                      onChange={(e) =>
                        handleFormChange('status', e.target.value as VendorForm['status'])
                      }
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                      <option value="BLOCKED">Bloqueado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notas Internas</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    placeholder="Condiciones especiales, observaciones, etc."
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowVendorModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitVendor} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {modalMode === 'create' ? 'Crear Proveedor' : 'Guardar Cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showDetailModal && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <Card
              className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Detalle del Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : detailVendor ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Proveedor</p>
                        <p className="font-semibold text-gray-900">{detailVendor.name}</p>
                        <p className="text-sm text-gray-600">{detailVendor.vendorNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Contacto</p>
                        <p className="font-semibold text-gray-900">
                          {detailVendor.contactName || 'Sin asignar'}
                        </p>
                        <p className="text-sm text-gray-600">{detailVendor.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Finanzas</p>
                        <p className="font-semibold text-green-700">
                          Total Comprado: ${detailVendor.totalPurchases.toLocaleString()}
                        </p>
                        <p className="font-semibold text-orange-600">
                          Saldo: ${detailVendor.currentBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-2">Facturas recientes</p>
                      {detailVendor.payables?.length ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="py-2">Factura</th>
                                <th>Descripción</th>
                                <th>Vencimiento</th>
                                <th>Monto</th>
                                <th>Saldo</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailVendor.payables.slice(0, 5).map((payable) => (
                                <tr key={payable.id} className="border-b last:border-0">
                                  <td className="py-2 font-mono text-blue-600">
                                    {payable.billNumber}
                                  </td>
                                  <td>{payable.description || '—'}</td>
                                  <td>{new Date(payable.dueDate).toLocaleDateString('es-MX')}</td>
                                  <td>${payable.total.toLocaleString()}</td>
                                  <td>${payable.balance.toLocaleString()}</td>
                                  <td>{getPayableBadge(payable.status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin facturas registradas</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500">No se encontró información</p>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {vendorToDelete && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setVendorToDelete(null)}
          >
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Eliminar Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  ¿Seguro que deseas eliminar a{' '}
                  <span className="font-semibold">{vendorToDelete.name}</span>? Esta acción se
                  realizará sólo si no tiene facturas vinculadas.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setVendorToDelete(null)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteVendor} disabled={deleteLoading}>
                    {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Eliminar
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

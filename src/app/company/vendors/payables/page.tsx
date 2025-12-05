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
import { DatePicker } from '@/components/ui/date-picker'
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Edit,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
} from 'lucide-react'

const DEFAULT_COMPANY_ID = 'default-company-001'

type PayableStatus = 'UNPAID' | 'PARTIAL' | 'OVERDUE' | 'PAID'

const STATUS_LABELS: Record<PayableStatus, string> = {
  UNPAID: 'Por pagar',
  PARTIAL: 'Pago parcial',
  OVERDUE: 'Vencido',
  PAID: 'Pagado',
}

const STATUS_BADGE_STYLES: Record<PayableStatus, string> = {
  UNPAID: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
}

type MetricsState = {
  unpaid: number
  partial: number
  overdue: number
  paid: number
}

interface VendorOption {
  id: string
  name: string
  vendorNumber: string
}

interface Payable {
  id: string
  billNumber: string
  vendorId: string
  vendor?: {
    id: string
    name: string
    vendorNumber: string
    category?: string
  }
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  total: number
  paidAmount: number
  balance: number
  status: PayableStatus
  description?: string
  category?: string
  reference?: string
  terms?: string
}

interface PayableForm {
  id?: string
  vendorId: string
  billNumber: string
  issueDate: string
  dueDate: string
  description: string
  category: string
  terms: string
  reference: string
  subtotal: string
  taxAmount: string
  total: string
  paidAmount: string
}

const todayInput = () => new Date().toISOString().split('T')[0]

const emptyForm: PayableForm = {
  vendorId: '',
  billNumber: '',
  issueDate: todayInput(),
  dueDate: todayInput(),
  description: '',
  category: '',
  terms: 'Net 30',
  reference: '',
  subtotal: '',
  taxAmount: '',
  total: '',
  paidAmount: '0',
}

export default function VendorPayablesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany, isLoading: companyLoading } = useCompany()
  const [payables, setPayables] = useState<Payable[]>([])
  const [metrics, setMetrics] = useState<MetricsState>({ unpaid: 0, partial: 0, overdue: 0, paid: 0 })
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVendor, setFilterVendor] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<PayableForm>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailPayable, setDetailPayable] = useState<Payable | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Payable | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const companyId = activeCompany?.id || DEFAULT_COMPANY_ID
  const userId = session?.user?.id

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchPayables = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/vendors/payables?companyId=${companyId}&limit=500`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al obtener cuentas por pagar')
      }
      const payload = await response.json()
      setPayables(payload.data || [])
      setMetrics(payload.metrics || { unpaid: 0, partial: 0, overdue: 0, paid: 0 })
    } catch (error) {
      console.error('Error fetching payables:', error)
      toast.error('No pudimos cargar las cuentas por pagar')
    } finally {
      setLoading(false)
    }
  }, [companyId, userId])

  const fetchVendors = useCallback(async () => {
    if (!userId) return
    try {
      const response = await fetch(`/api/vendors?companyId=${companyId}&limit=200`)
      if (!response.ok) return
      const payload = await response.json()
      const data = Array.isArray(payload) ? payload : payload.data || []
      setVendors(
        data.map((vendor: VendorOption & { name: string }) => ({
          id: vendor.id,
          name: vendor.name,
          vendorNumber: vendor.vendorNumber,
        }))
      )
    } catch (error) {
      console.error('Error loading vendors:', error)
    }
  }, [companyId, userId])

  useEffect(() => {
    if (status === 'authenticated' && !companyLoading) {
      fetchPayables()
      fetchVendors()
    }
  }, [status, companyLoading, fetchPayables, fetchVendors])

  const filteredPayables = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const vendorFilter = filterVendor === 'all' ? null : filterVendor
    const statusFilter = filterStatus === 'all' ? null : filterStatus.toUpperCase()

    return payables.filter((payable) => {
      if (statusFilter && payable.status !== statusFilter) return false
      if (vendorFilter && payable.vendorId !== vendorFilter) return false
      if (dateRange !== 'all') {
        const due = new Date(payable.dueDate)
        const now = new Date()
        if (dateRange === 'overdue' && due >= now) return false
        if (dateRange === 'week') {
          const weekAhead = new Date()
          weekAhead.setDate(weekAhead.getDate() + 7)
          if (!(due >= now && due <= weekAhead)) return false
        }
        if (dateRange === 'month') {
          const monthAhead = new Date()
          monthAhead.setMonth(monthAhead.getMonth() + 1)
          if (!(due >= now && due <= monthAhead)) return false
        }
      }
      if (!term) return true
      return (
        payable.billNumber.toLowerCase().includes(term) ||
        payable.description?.toLowerCase().includes(term) ||
        payable.vendor?.name.toLowerCase().includes(term)
      )
    })
  }, [payables, searchTerm, filterStatus, filterVendor, dateRange])

  const totalOpen = useMemo(
    () => payables.filter((p) => p.status !== 'PAID').reduce((sum, p) => sum + p.balance, 0),
    [payables]
  )
  const totalPaid = useMemo(
    () => payables.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.total, 0),
    [payables]
  )
  const dueThisWeek = useMemo(() => {
    const now = new Date()
    const week = new Date()
    week.setDate(week.getDate() + 7)
    return payables
      .filter((p) => p.status !== 'PAID' && new Date(p.dueDate) >= now && new Date(p.dueDate) <= week)
      .reduce((sum, p) => sum + p.balance, 0)
  }, [payables])

  const getStatusBadge = (status: PayableStatus) => (
    <Badge className={`${STATUS_BADGE_STYLES[status]} flex items-center gap-1`}>
      {status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'OVERDUE' && <AlertCircle className="w-3 h-3" />}
      {status === 'PARTIAL' && <CreditCard className="w-3 h-3" />}
      {status === 'UNPAID' && <Clock className="w-3 h-3" />}
      {STATUS_LABELS[status]}
    </Badge>
  )

  const openCreateModal = () => {
    setModalMode('create')
    setFormData({ ...emptyForm, vendorId: vendors[0]?.id || '' })
    setShowModal(true)
  }

  const openEditModal = (payable: Payable) => {
    setModalMode('edit')
    setFormData({
      id: payable.id,
      vendorId: payable.vendorId,
      billNumber: payable.billNumber,
      issueDate: payable.issueDate.split('T')[0],
      dueDate: payable.dueDate.split('T')[0],
      description: payable.description || '',
      category: payable.category || '',
      terms: payable.terms || 'Net 30',
      reference: payable.reference || '',
      subtotal: String(payable.subtotal ?? ''),
      taxAmount: String(payable.taxAmount ?? ''),
      total: String(payable.total ?? ''),
      paidAmount: String(payable.paidAmount ?? ''),
    })
    setShowModal(true)
  }

  const handleFormChange = (field: keyof PayableForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitPayable = async () => {
    if (!formData.vendorId || !formData.billNumber) {
      toast.error('Proveedor y factura son obligatorios')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        companyId,
        vendorId: formData.vendorId,
        billNumber: formData.billNumber,
        description: formData.description || undefined,
        category: formData.category || undefined,
        terms: formData.terms || undefined,
        reference: formData.reference || undefined,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        subtotal: formData.subtotal ? Number(formData.subtotal) : 0,
        taxAmount: formData.taxAmount ? Number(formData.taxAmount) : 0,
        total: Number(formData.total || 0),
        paidAmount: formData.paidAmount ? Number(formData.paidAmount) : 0,
      }

      const url =
        modalMode === 'create'
          ? '/api/vendors/payables'
          : `/api/vendors/payables/${formData.id}?companyId=${companyId}`

      const response = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al guardar la factura')
      }

      toast.success(
        modalMode === 'create' ? 'Factura registrada correctamente' : 'Factura actualizada'
      )
      setShowModal(false)
      setFormData(emptyForm)
      await fetchPayables()
    } catch (error) {
      console.error('Error saving payable:', error)
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar la factura')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayable = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const response = await fetch(
        `/api/vendors/payables/${deleteTarget.id}?companyId=${companyId}`,
        {
          method: 'DELETE',
        }
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'No pudimos eliminar la factura')
      }
      toast.success('Factura eliminada')
      setDeleteTarget(null)
      await fetchPayables()
    } catch (error) {
      console.error('Error deleting payable:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la factura')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleMarkAsPaid = async (payable: Payable) => {
    try {
      const response = await fetch(
        `/api/vendors/payables/${payable.id}?companyId=${companyId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: payable.vendorId,
            billNumber: payable.billNumber,
            issueDate: payable.issueDate,
            dueDate: payable.dueDate,
            total: payable.total,
            paidAmount: payable.total,
          }),
        }
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'No pudimos registrar el pago')
      }
      toast.success('Factura marcada como pagada')
      await fetchPayables()
    } catch (error) {
      console.error('Error marking payable:', error)
      toast.error(error instanceof Error ? error.message : 'Error al marcar pago')
    }
  }

  const handleExport = () => {
    const header = 'Factura,Proveedor,Vencimiento,Monto,Pagado,Saldo,Estado\n'
    const rows = filteredPayables
      .map((payable) =>
        [
          payable.billNumber,
          `"${payable.vendor?.name || ''}"`,
          new Date(payable.dueDate).toLocaleDateString('es-MX'),
          `$${payable.total.toLocaleString()}`,
          `$${payable.paidAmount.toLocaleString()}`,
          `$${payable.balance.toLocaleString()}`,
          STATUS_LABELS[payable.status],
        ].join(',')
      )
      .join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cuentas-por-pagar-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Cuentas exportadas')
  }

  const handleDownloadPayable = (payable: Payable) => {
    const data = {
      factura: payable.billNumber,
      proveedor: payable.vendor?.name,
      monto: payable.total,
      saldo: payable.balance,
      descripcion: payable.description,
      vencimiento: payable.dueDate,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${payable.billNumber}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading || companyLoading || status === 'loading') {
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
            <h1 className="text-2xl font-bold text-gray-900">Cuentas por Pagar</h1>
            <p className="text-gray-600 mt-1">Facturas pendientes de proveedores</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" /> Registrar Factura
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalOpen.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Total por pagar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${metrics.overdue.toLocaleString()}
              </div>
              <div className="text-sm text-red-700">Facturas vencidas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${dueThisWeek.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Vence esta semana</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Pagado este mes</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar facturas..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="UNPAID">Por pagar</option>
              <option value="PARTIAL">Pago parcial</option>
              <option value="OVERDUE">Vencidos</option>
              <option value="PAID">Pagados</option>
            </select>
            <select
              className="px-4 py-2 border rounded-lg"
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
            >
              <option value="all">Todos los proveedores</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border rounded-lg"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">Todos los vencimientos</option>
              <option value="overdue">Vencidas</option>
              <option value="week">Vencen esta semana</option>
              <option value="month">Vencen este mes</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturas por Pagar ({filteredPayables.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Emisión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayables.map((payable) => (
                    <tr key={payable.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-semibold text-blue-600">
                          {payable.billNumber}
                        </p>
                        {payable.reference && (
                          <p className="text-xs text-gray-500">Ref: {payable.reference}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {payable.vendor?.name || 'Proveedor'}</p>
                        <p className="text-xs text-gray-500">
                          {payable.vendor?.vendorNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {payable.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(payable.issueDate).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(payable.dueDate).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        ${payable.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-orange-600">
                        {payable.balance > 0 ? `$${payable.balance.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(payable.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {payable.status !== 'PAID' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(payable)}>
                              <CreditCard className="w-4 h-4 mr-1" /> Pagar
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDetailPayable(payable)
                              setShowDetailModal(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditModal(payable)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDownloadPayable(payable)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(payable)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>
                  {modalMode === 'create' ? 'Registrar factura de proveedor' : 'Editar factura'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Proveedor</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={formData.vendorId}
                      onChange={(e) => handleFormChange('vendorId', e.target.value)}
                    >
                      <option value="">Seleccione un proveedor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Número de Factura</label>
                    <Input
                      placeholder="BILL-001"
                      value={formData.billNumber}
                      onChange={(e) => handleFormChange('billNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Fecha de Factura</label>
                    <DatePicker
                      value={formData.issueDate}
                      onChange={(date: string) => handleFormChange('issueDate', date)}
                      placeholder="Fecha factura"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Vencimiento</label>
                    <DatePicker
                      value={formData.dueDate}
                      onChange={(date: string) => handleFormChange('dueDate', date)}
                      placeholder="Fecha vencimiento"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input
                    placeholder="Suministros de oficina - Noviembre"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <Input
                      placeholder="Servicios"
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Términos</label>
                    <Input
                      placeholder="Net 30"
                      value={formData.terms}
                      onChange={(e) => handleFormChange('terms', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Referencia</label>
                    <Input
                      placeholder="PO-12345"
                      value={formData.reference}
                      onChange={(e) => handleFormChange('reference', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Subtotal</label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={formData.subtotal}
                      onChange={(e) => handleFormChange('subtotal', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">IVA</label>
                    <Input
                      type="number"
                      placeholder="1600"
                      value={formData.taxAmount}
                      onChange={(e) => handleFormChange('taxAmount', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    <Input
                      type="number"
                      placeholder="11600"
                      value={formData.total}
                      onChange={(e) => handleFormChange('total', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pagado</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.paidAmount}
                      onChange={(e) => handleFormChange('paidAmount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitPayable} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {modalMode === 'create' ? 'Registrar Factura' : 'Guardar Cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showDetailModal && detailPayable && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Detalle de {detailPayable.billNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Proveedor</p>
                    <p className="font-semibold text-gray-900">{detailPayable.vendor?.name}</p>
                    <p className="text-sm text-gray-600">{detailPayable.vendor?.vendorNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    {getStatusBadge(detailPayable.status)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Emisión</p>
                    <p>{new Date(detailPayable.issueDate).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vencimiento</p>
                    <p>{new Date(detailPayable.dueDate).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saldo</p>
                    <p className="font-semibold text-orange-600">
                      ${detailPayable.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Descripción</p>
                  <p className="text-sm text-gray-700">{detailPayable.description || 'Sin descripción'}</p>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteTarget(null)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Eliminar Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  ¿Seguro que deseas eliminar la factura {deleteTarget.billNumber}? Esta acción es
                  irreversible.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDeletePayable} disabled={deleteLoading}>
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

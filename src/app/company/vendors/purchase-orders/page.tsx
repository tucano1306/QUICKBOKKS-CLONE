'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  LucideIcon,
  Package,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Truck,
  Users,
  XCircle,
  CheckCircle,
  Info,
} from 'lucide-react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_VALUES = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const

const statusMeta: Record<(typeof STATUS_VALUES)[number], { label: string; color: string; icon: LucideIcon }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Edit },
  SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-700', icon: Send },
  CONFIRMED: { label: 'Confirmada', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  PARTIAL: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-700', icon: Package },
  RECEIVED: { label: 'Recibida', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
}

type PurchaseOrderStatus = (typeof STATUS_VALUES)[number]

type PurchaseOrderItem = {
  id?: string
  inventoryItemId?: string | null
  description: string
  quantity: number
  unitCost: number
  receivedQty?: number
  totalCost?: number
}

type PurchaseOrder = {
  id: string
  poNumber: string
  vendorId?: string | null
  vendorName: string
  vendorEmail?: string | null
  vendorPhone?: string | null
  vendor?: {
    id: string
    name: string
    vendorNumber?: string | null
  }
  orderDate: string
  expectedDate?: string | null
  receivedDate?: string | null
  status: PurchaseOrderStatus
  subtotal: number
  tax: number
  shipping: number
  total: number
  description?: string | null
  notes?: string | null
  requestedBy?: string | null
  approvedBy?: string | null
  assignedTo?: string | null
  terms?: string | null
  items: PurchaseOrderItem[]
}

type PurchaseOrderMetrics = {
  draft: number
  pending: number
  received: number
}

type VendorOption = {
  id: string
  name: string
  vendorNumber?: string
  email?: string | null
  phone?: string | null
}

type PurchaseOrderFormState = {
  vendorId: string
  vendorName: string
  vendorEmail: string
  vendorPhone: string
  orderDate: string
  expectedDate: string
  status: PurchaseOrderStatus
  description: string
  notes: string
  requestedBy: string
  approvedBy: string
  assignedTo: string
  tax: number
  shipping: number
  items: Array<{ description: string; quantity: number; unitCost: number }>
}

const createDefaultFormState = (): PurchaseOrderFormState => {
  const today = new Date()
  const expected = new Date(today)
  expected.setDate(expected.getDate() + 7)
  const format = (date: Date) => date.toISOString().split('T')[0]

  return {
    vendorId: '',
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    orderDate: format(today),
    expectedDate: format(expected),
    status: 'DRAFT',
    description: '',
    notes: '',
    requestedBy: '',
    approvedBy: '',
    assignedTo: '',
    tax: 0,
    shipping: 0,
    items: [{ description: '', quantity: 1, unitCost: 0 }],
  }
}

const formatCurrency = (value: number) =>
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const toDateInputValue = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const StatusBadge = ({ status }: { status: PurchaseOrderStatus }) => {
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${meta.color}`}>
      <Icon className="mr-1 h-3 w-3" /> {meta.label}
    </span>
  )
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [metrics, setMetrics] = useState<PurchaseOrderMetrics>({ draft: 0, pending: 0, received: 0 })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | PurchaseOrderStatus>('all')
  const [filterVendor, setFilterVendor] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formState, setFormState] = useState<PurchaseOrderFormState>(createDefaultFormState())
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [assignPanelOpen, setAssignPanelOpen] = useState(false)
  const [assignState, setAssignState] = useState({ requestedBy: '', approvedBy: '', assignedTo: '' })
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(debounce)
  }, [searchTerm])

  const loadVendors = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' })
      if (activeCompany?.id) params.set('companyId', activeCompany.id)
      const res = await fetch(`/api/vendors?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setVendors(json.data || [])
    } catch (error) {
      console.error('Load vendors error', error)
    }
  }, [activeCompany?.id])

  const loadOrders = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (activeCompany?.id) params.set('companyId', activeCompany.id)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterVendor !== 'all') params.set('vendorId', filterVendor)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/inventory/purchase-orders?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorBody.error || 'No fue posible obtener las órdenes')
      }
      const json = await res.json()
      setOrders(json.orders || [])
      setMetrics(json.metrics || { draft: 0, pending: 0, received: 0 })
    } catch (error: any) {
      console.error('Load purchase orders error', error)
      setErrorMessage(error.message || 'No fue posible cargar las órdenes de compra')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, activeCompany?.id, filterStatus, filterVendor, debouncedSearch, startDate, endDate])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadVendors()
    loadOrders()
  }, [status, loadOrders, loadVendors])

  const vendorOptions = useMemo(() => {
    if (vendors.length) return vendors
    const inferred = orders
      .filter((order) => order.vendorId && order.vendorName)
      .map((order) => ({ id: order.vendorId as string, name: order.vendorName }))
    const map = new Map<string, VendorOption>()
    inferred.forEach((vendor) => map.set(vendor.id, vendor))
    return Array.from(map.values())
  }, [vendors, orders])

  const totalValue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  )

  const pendingCount = useMemo(
    () => orders.filter((order) => ['SENT', 'CONFIRMED'].includes(order.status)).length,
    [orders]
  )

  const receivedThisMonth = useMemo(() => {
    const now = new Date()
    return orders.filter((order) => {
      if (order.status !== 'RECEIVED' || !order.receivedDate) return false
      const received = new Date(order.receivedDate)
      return received.getMonth() === now.getMonth() && received.getFullYear() === now.getFullYear()
    }).length
  }, [orders])

  const subtotalFromForm = useMemo(
    () =>
      formState.items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0
        const unitCost = Number(item.unitCost) || 0
        return sum + quantity * unitCost
      }, 0),
    [formState.items]
  )

  const formTotal = useMemo(
    () => subtotalFromForm + Number(formState.tax || 0) + Number(formState.shipping || 0),
    [subtotalFromForm, formState.tax, formState.shipping]
  )

  const openCreateForm = () => {
    setSelectedOrder(null)
    setFormMode('create')
    setShowForm(true)
    setFormState(createDefaultFormState())
    setFormError(null)
  }

  const openEditForm = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setFormMode('edit')
    setShowForm(true)
    setFormError(null)
    setFormState({
      vendorId: order.vendorId || '',
      vendorName: order.vendorName || '',
      vendorEmail: order.vendorEmail || '',
      vendorPhone: order.vendorPhone || '',
      orderDate: toDateInputValue(order.orderDate) || createDefaultFormState().orderDate,
      expectedDate: toDateInputValue(order.expectedDate) || createDefaultFormState().expectedDate,
      status: order.status,
      description: order.description || '',
      notes: order.notes || '',
      requestedBy: order.requestedBy || '',
      approvedBy: order.approvedBy || '',
      assignedTo: order.assignedTo || '',
      tax: order.tax || 0,
      shipping: order.shipping || 0,
      items:
        order.items?.length
          ? order.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
            }))
          : [{ description: '', quantity: 1, unitCost: 0 }],
    })
  }

  const handleFormFieldChange = (field: keyof PurchaseOrderFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: 'description' | 'quantity' | 'unitCost', value: string | number) => {
    setFormState((prev) => {
      const items = [...prev.items]
      items[index] = {
        ...items[index],
        [field]: field === 'description' ? String(value) : Number(value) || 0,
      }
      return { ...prev, items }
    })
  }

  const addItem = () => {
    setFormState((prev) => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, unitCost: 0 }] }))
  }

  const removeItem = (index: number) => {
    setFormState((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))
  }

  const closeForm = () => {
    setShowForm(false)
    setFormError(null)
  }

  const saveForm = async () => {
    try {
      setFormSubmitting(true)
      setFormError(null)
      const items = formState.items.filter((item) => item.description.trim())
      if (!items.length) {
        setFormError('Agrega al menos un artículo con descripción')
        return
      }

      const payload = {
        ...formState,
        vendorId: formState.vendorId || undefined,
        vendorName:
          formState.vendorName ||
          vendorOptions.find((vendor) => vendor.id === formState.vendorId)?.name ||
          'Proveedor',
        companyId: activeCompany?.id,
        subtotal: Number(subtotalFromForm.toFixed(2)),
        tax: Number(Number(formState.tax || 0).toFixed(2)),
        shipping: Number(Number(formState.shipping || 0).toFixed(2)),
        total: Number(formTotal.toFixed(2)),
        items,
      }

      const url =
        formMode === 'create'
          ? '/api/inventory/purchase-orders'
          : `/api/inventory/purchase-orders/${selectedOrder?.id}`
      const method = formMode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible guardar la orden')
      }

      closeForm()
      await loadOrders()
    } catch (error: any) {
      console.error('Save PO error', error)
      setFormError(error.message || 'No fue posible guardar la orden')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`¿Eliminar la orden ${order.poNumber}?`)) return
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible eliminar la orden')
      }
      await loadOrders()
    } catch (error) {
      console.error('Delete PO error', error)
      setMessage({ type: 'error', text: 'No fue posible eliminar la orden de compra' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSendOrder = async (order: PurchaseOrder) => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${order.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipients: [], message: '' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible enviar la orden')
      }
      await loadOrders()
    } catch (error) {
      console.error('Send PO error', error)
      setMessage({ type: 'error', text: 'No fue posible enviar la orden' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleStatusChange = async (orderId: string, statusValue: PurchaseOrderStatus) => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: statusValue }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible actualizar el estado')
      }
      await loadOrders()
    } catch (error) {
      console.error('Status update error', error)
      setMessage({ type: 'error', text: 'No fue posible actualizar el estado' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const openAssignPanel = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setAssignPanelOpen(true)
    setAssignState({
      requestedBy: order.requestedBy || '',
      approvedBy: order.approvedBy || '',
      assignedTo: order.assignedTo || '',
    })
  }

  const submitAssign = async () => {
    if (!selectedOrder) return
    try {
      setAssignSubmitting(true)
      const res = await fetch(`/api/inventory/purchase-orders/${selectedOrder.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assignState),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error' }))
        throw new Error(body.error || 'No fue posible asignar la orden')
      }
      setAssignPanelOpen(false)
      await loadOrders()
    } catch (error) {
      console.error('Assign error', error)
      setMessage({ type: 'error', text: 'No fue posible asignar la orden' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setAssignSubmitting(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (activeCompany?.id) params.set('companyId', activeCompany.id)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterVendor !== 'all') params.set('vendorId', filterVendor)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('format', format)
      const res = await fetch(`/api/inventory/purchase-orders/export?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible exportar las órdenes')
      }
      if (format === 'json') {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ordenes-compra-${Date.now()}.json`
        link.click()
        URL.revokeObjectURL(url)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ordenes-compra-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error', error)
      setMessage({ type: 'error', text: 'No fue posible exportar las órdenes' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setExporting(false)
    }
  }

  const openDetail = async (order: PurchaseOrder) => {
    try {
      setDetailLoading(true)
      setDetailOrder(null)
      const res = await fetch(`/api/inventory/purchase-orders/${order.id}`, { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(body.error || 'No fue posible obtener el detalle')
      }
      const data = await res.json()
      setDetailOrder(data.purchaseOrder)
    } catch (error) {
      console.error('Detail error', error)
      setMessage({ type: 'error', text: 'No fue posible cargar el detalle de la orden' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setDetailLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-sm text-gray-600">Controla requisiciones, recepciones y seguimiento de proveedores</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={exporting} onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button variant="outline" disabled={exporting} onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" /> Exportar JSON
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Orden
            </Button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {message.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            <span className={`${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>{message.text}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <ShoppingBag className="mb-3 h-8 w-8 text-blue-600" />
              <div className="text-3xl font-bold text-blue-900">{orders.length}</div>
              <p className="text-sm text-blue-700">Órdenes registradas</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <Clock className="mb-3 h-8 w-8 text-purple-600" />
              <div className="text-3xl font-bold text-purple-900">{pendingCount}</div>
              <p className="text-sm text-purple-700">En proceso</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <CheckCircle2 className="mb-3 h-8 w-8 text-green-600" />
              <div className="text-3xl font-bold text-green-900">{receivedThisMonth}</div>
              <p className="text-sm text-green-700">Recibidas este mes</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <DollarSign className="mb-3 h-8 w-8 text-orange-600" />
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalValue)}</div>
              <p className="text-sm text-orange-700">Valor total</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por número, proveedor o descripción"
                  className="pl-10"
                />
              </div>
              <select
                className="rounded-lg border px-4 py-2 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as PurchaseOrderStatus | 'all')}
              >
                <option value="all">Todos los estados</option>
                {STATUS_VALUES.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {statusMeta[statusValue].label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-4 py-2 text-sm"
                value={filterVendor}
                onChange={(event) => setFilterVendor(event.target.value)}
              >
                <option value="all">Todos los proveedores</option>
                {vendorOptions.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendorNumber ? `${vendor.vendorNumber} · ${vendor.name}` : vendor.name}
                  </option>
                ))}
              </select>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterStatus('all')
                  setFilterVendor('all')
                  setStartDate('')
                  setEndDate('')
                  setSearchTerm('')
                }}
              >
                Limpiar filtros
              </Button>
            </div>
            <div className="grid gap-4 text-sm text-gray-600 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-100 text-gray-700">Borradores {formatCurrency(metrics.draft || 0)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">Pendientes {formatCurrency(metrics.pending || 0)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">Recibidas {formatCurrency(metrics.received || 0)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5" /> {errorMessage}
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{formMode === 'create' ? 'Nueva orden de compra' : 'Editar orden de compra'}</CardTitle>
                  <p className="text-sm text-gray-500">Captura la información base y los artículos de la orden</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={closeForm}>
                    Cancelar
                  </Button>
                  <Button onClick={saveForm} disabled={formSubmitting}>
                    {formSubmitting ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Proveedor registrado</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={formState.vendorId}
                    onChange={(event) => {
                      const vendorId = event.target.value
                      handleFormFieldChange('vendorId', vendorId)
                      if (vendorId) {
                        const vendor = vendorOptions.find((option) => option.id === vendorId)
                        if (vendor) {
                          handleFormFieldChange('vendorName', vendor.name)
                          handleFormFieldChange('vendorEmail', vendor.email || '')
                          handleFormFieldChange('vendorPhone', vendor.phone || '')
                        }
                      }
                    }}
                  >
                    <option value="">Selecciona proveedor</option>
                    {vendorOptions.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendorNumber ? `${vendor.vendorNumber} · ${vendor.name}` : vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Proveedor manual</label>
                  <Input
                    className="mt-1"
                    value={formState.vendorName}
                    placeholder="Nombre del proveedor"
                    onChange={(event) => handleFormFieldChange('vendorName', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de pedido</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={formState.orderDate}
                    onChange={(event) => handleFormFieldChange('orderDate', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha esperada</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={formState.expectedDate}
                    onChange={(event) => handleFormFieldChange('expectedDate', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Solicitada por</label>
                  <Input
                    className="mt-1"
                    value={formState.requestedBy}
                    onChange={(event) => handleFormFieldChange('requestedBy', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Aprobada por</label>
                  <Input
                    className="mt-1"
                    value={formState.approvedBy}
                    onChange={(event) => handleFormFieldChange('approvedBy', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Asignada a</label>
                  <Input
                    className="mt-1"
                    value={formState.assignedTo}
                    onChange={(event) => handleFormFieldChange('assignedTo', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notas</label>
                  <Input
                    className="mt-1"
                    value={formState.notes}
                    onChange={(event) => handleFormFieldChange('notes', event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Artículos</h3>
                  <Button size="sm" variant="secondary" onClick={addItem}>
                    <Plus className="mr-1 h-4 w-4" /> Agregar artículo
                  </Button>
                </div>
                <div className="space-y-3">
                  {formState.items.map((item, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
                      <Input
                        placeholder="Descripción"
                        value={item.description}
                        onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                        className="md:col-span-2"
                      />
                      <Input
                        type="number"
                        placeholder="Cantidad"
                        value={item.quantity}
                        onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Costo unitario"
                        value={item.unitCost}
                        onChange={(event) => handleItemChange(index, 'unitCost', event.target.value)}
                      />
                      {formState.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeItem(index)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Impuestos</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={formState.tax}
                      onChange={(event) => handleFormFieldChange('tax', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Envío</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={formState.shipping}
                      onChange={(event) => handleFormFieldChange('shipping', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total estimado</label>
                    <Input className="mt-1" value={formatCurrency(formTotal)} readOnly />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Listado</CardTitle>
              <p className="text-sm text-gray-500">{orders.length} órdenes</p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="w-32">Fecha</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-64">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      Aún no tienes órdenes registradas. Crea la primera para conectar inventario con compras.
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.poNumber}</div>
                      <p className="text-xs text-gray-500">{order.description || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.vendorName || 'Proveedor'}</div>
                      <p className="text-xs text-gray-500">{order.vendor?.vendorNumber || order.vendorEmail || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(order.orderDate)}</div>
                      <p className="text-xs text-gray-500">ETA {formatDate(order.expectedDate)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={order.status} />
                        <select
                          className="rounded-md border px-2 py-1 text-xs"
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value as PurchaseOrderStatus)}
                        >
                          {STATUS_VALUES.map((statusValue) => (
                            <option key={statusValue} value={statusValue}>
                              {statusMeta[statusValue].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total || 0)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Button size="sm" variant="secondary" onClick={() => openDetail(order)}>
                          <Eye className="mr-1 h-3 w-3" /> Ver
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditForm(order)}>
                          <Edit className="mr-1 h-3 w-3" /> Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleSendOrder(order)}>
                          <Send className="mr-1 h-3 w-3" /> Enviar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openAssignPanel(order)}>
                          <Users className="mr-1 h-3 w-3" /> Asignar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange(order.id, 'RECEIVED')}>
                          <Truck className="mr-1 h-3 w-3" /> Recibir
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteOrder(order)}>
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {detailOrder && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detalle {detailOrder.poNumber}</CardTitle>
                  <p className="text-sm text-gray-500">Actualizado {formatDate(detailOrder.orderDate)}</p>
                </div>
                <Button variant="ghost" onClick={() => setDetailOrder(null)}>
                  Cerrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading && <p className="text-sm text-gray-500">Cargando detalle...</p>}
              {!detailLoading && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Proveedor</p>
                      <p className="font-semibold">{detailOrder.vendorName}</p>
                      <p className="text-sm text-gray-500">{detailOrder.vendorEmail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Fechas</p>
                      <p className="text-sm">Pedido {formatDate(detailOrder.orderDate)}</p>
                      <p className="text-sm">Esperada {formatDate(detailOrder.expectedDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Responsables</p>
                      <p className="text-sm">Solicita: {detailOrder.requestedBy || '—'}</p>
                      <p className="text-sm">Aprueba: {detailOrder.approvedBy || '—'}</p>
                      <p className="text-sm">Asignada a: {detailOrder.assignedTo || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">Artículos</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-24">Cantidad</TableHead>
                            <TableHead className="w-32">Costo</TableHead>
                            <TableHead className="w-32">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailOrder.items?.map((item) => (
                            <TableRow key={item.id || item.description}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                              <TableCell>{formatCurrency(item.quantity * item.unitCost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">Subtotal</p>
                      <p className="font-semibold">{formatCurrency(detailOrder.subtotal || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Impuestos</p>
                      <p className="font-semibold">{formatCurrency(detailOrder.tax || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Envío</p>
                      <p className="font-semibold">{formatCurrency(detailOrder.shipping || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(detailOrder.total || 0)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {assignPanelOpen && selectedOrder && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Asignar orden {selectedOrder.poNumber}</CardTitle>
                <Button variant="ghost" onClick={() => setAssignPanelOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Solicitada por</label>
                  <Input
                    className="mt-1"
                    value={assignState.requestedBy}
                    onChange={(event) => setAssignState((prev) => ({ ...prev, requestedBy: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Aprobada por</label>
                  <Input
                    className="mt-1"
                    value={assignState.approvedBy}
                    onChange={(event) => setAssignState((prev) => ({ ...prev, approvedBy: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Responsable</label>
                  <Input
                    className="mt-1"
                    value={assignState.assignedTo}
                    onChange={(event) => setAssignState((prev) => ({ ...prev, assignedTo: event.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAssignPanelOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submitAssign} disabled={assignSubmitting}>
                  {assignSubmitting ? 'Guardando...' : 'Guardar asignación'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

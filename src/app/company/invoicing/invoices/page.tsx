'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, User, FileText, PlusCircle, Send, Download, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customer?: {
    name: string
    email: string
  }
  issueDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  status: string
  createdAt: string
}

export default function InvoicesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchInvoices()
    }
  }, [status, activeCompany])

  useEffect(() => {
    let filtered = invoices

    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1) // Reset página cuando cambian filtros
  }, [searchTerm, statusFilter, invoices])

  // Datos paginados
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredInvoices.slice(start, start + pageSize)
  }, [filteredInvoices, currentPage, pageSize])

  const totalPages = Math.ceil(filteredInvoices.length / pageSize)

  const fetchInvoices = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/invoices?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setInvoices(Array.isArray(data) ? data : [])
        setFilteredInvoices(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Error al cargar facturas')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; color: string }> = {
      DRAFT: { variant: 'secondary', label: 'Borrador', color: 'gray' },
      SENT: { variant: 'default', label: 'Enviada', color: 'blue' },
      PAID: { variant: 'default', label: 'Pagada', color: 'green' },
      OVERDUE: { variant: 'destructive', label: 'Vencida', color: 'red' },
      CANCELLED: { variant: 'secondary', label: 'Cancelada', color: 'gray' }
    }
    const config = variants[status] || variants.DRAFT
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const stats = [
    {
      label: 'Total Facturado',
      value: `$${filteredInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}`,
      color: 'blue'
    },
    {
      label: 'Facturas Pagadas',
      value: filteredInvoices.filter(inv => inv.status === 'PAID').length,
      color: 'green'
    },
    {
      label: 'Facturas Pendientes',
      value: filteredInvoices.filter(inv => inv.status === 'SENT').length,
      color: 'orange'
    },
    {
      label: 'Facturas Vencidas',
      value: filteredInvoices.filter(inv => inv.status === 'OVERDUE').length,
      color: 'red'
    }
  ]

  if (status === 'loading' || isLoading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const invoiceActions = [
    {
      label: 'Ver todas',
      icon: Eye,
      onClick: () => {
        setSearchTerm('')
        setStatusFilter('all')
        toast.success('📋 Mostrando todas las facturas')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Crear nueva',
      icon: PlusCircle,
      onClick: () => {
        router.push('/company/invoicing/invoices/new')
      },
      variant: 'primary' as const,
    },
    {
      label: 'Editar',
      icon: Edit,
      onClick: () => {
        toast('Selecciona una factura de la tabla para editar')
      },
      variant: 'default' as const,
    },
    {
      label: 'Enviar por email',
      icon: Send,
      onClick: () => {
        toast('📧 Función de envío por email - Selecciona una factura')
      },
      variant: 'default' as const,
    },
    {
      label: 'Eliminar',
      icon: Trash2,
      onClick: () => {
        toast('🗑️ Selecciona una factura para eliminar')
      },
      variant: 'danger' as const,
    },
    {
      label: 'Exportar PDF',
      icon: Download,
      onClick: () => {
        toast.success('📥 Exportando facturas a PDF...')
      },
      variant: 'outline' as const,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Facturas
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona y crea facturas profesionales
            </p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => router.push('/company/invoicing/invoices/new')}>
            <Plus className="w-4 h-4" />
            Nueva Factura
          </Button>
        </div>

        {/* Action Buttons */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Acciones de Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={invoiceActions} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold text-${stat.color}-600`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Lista de Facturas</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="DRAFT">Borradores</option>
                  <option value="SENT">Enviadas</option>
                  <option value="PAID">Pagadas</option>
                  <option value="OVERDUE">Vencidas</option>
                </select>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar facturas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No hay facturas</p>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Crear primera factura
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{invoice.customer?.name}</div>
                            <div className="text-xs text-gray-500">
                              {invoice.customer?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(invoice.issueDate).toLocaleDateString('es-MX')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(invoice.dueDate).toLocaleDateString('es-MX')}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginación */}
            {filteredInvoices.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredInvoices.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

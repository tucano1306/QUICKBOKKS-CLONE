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
  const { status } = useSession()
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
    const variants: Record<string, { variant: any; label: string; className: string }> = {
      DRAFT: { variant: 'secondary', label: 'Borrador', className: 'bg-gray-100 text-gray-700 border border-gray-300' },
      SENT: { variant: 'default', label: 'Enviada', className: 'bg-blue-50 text-[#0077C5] border border-blue-200' },
      PAID: { variant: 'default', label: 'Pagada', className: 'bg-green-50 text-[#108000] border border-green-200' },
      OVERDUE: { variant: 'destructive', label: 'Vencida', className: 'bg-red-50 text-red-700 border border-red-200' },
      CANCELLED: { variant: 'secondary', label: 'Cancelada', className: 'bg-gray-100 text-gray-500 border border-gray-300' }
    }
    const config = variants[status] || variants.DRAFT
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>{config.label}</span>
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#2CA01C] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Cargando facturas...</span>
          </div>
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2942] flex items-center gap-2">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#2CA01C]" />
              Facturas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona y crea facturas profesionales
            </p>
          </div>
          <Button 
            className="flex items-center justify-center gap-2 bg-[#2CA01C] hover:bg-[#108000] shadow-lg shadow-green-500/25 w-full sm:w-auto" 
            onClick={() => router.push('/company/invoicing/invoices/new')}
          >
            <Plus className="w-4 h-4" />
            Nueva Factura
          </Button>
        </div>

        {/* Action Buttons */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
            <CardTitle className="text-sm font-medium text-[#108000] flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Acciones de Facturas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ActionButtonsGroup buttons={invoiceActions} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {stats.map((stat) => {
            const colorClasses = {
              blue: { bg: 'from-blue-50 to-white', text: 'text-[#0077C5]', icon: 'bg-[#0077C5]' },
              green: { bg: 'from-green-50 to-white', text: 'text-[#108000]', icon: 'bg-[#2CA01C]' },
              orange: { bg: 'from-amber-50 to-white', text: 'text-amber-700', icon: 'bg-amber-500' },
              red: { bg: 'from-red-50 to-white', text: 'text-red-700', icon: 'bg-red-500' }
            }
            const colors = colorClasses[stat.color as keyof typeof colorClasses] || colorClasses.blue
            
            return (
              <Card key={stat.label} className={`bg-gradient-to-br ${colors.bg} shadow-md hover:shadow-lg transition-shadow`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">{stat.label}</div>
                  <div className={`text-lg sm:text-2xl font-bold ${colors.text} truncate`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="shadow-md">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <CardTitle className="text-[#0D2942] text-base sm:text-lg">Lista de Facturas</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#2CA01C] focus:border-[#2CA01C] transition-all w-full sm:w-auto"
                >
                  <option value="all">Todos los estados</option>
                  <option value="DRAFT">Borradores</option>
                  <option value="SENT">Enviadas</option>
                  <option value="PAID">Pagadas</option>
                  <option value="OVERDUE">Vencidas</option>
                </select>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <Input
                    placeholder="Buscar facturas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {/* Mobile View - Cards */}
            <div className="block sm:hidden space-y-3 p-3">
              {filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <DollarSign className="w-12 h-12 text-gray-300" />
                  <p className="text-gray-500">No hay facturas</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/company/invoicing/invoices/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera factura
                  </Button>
                </div>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <Card key={invoice.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-[#0D2942]">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-600">{invoice.customer?.name}</div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span>Emisión: {new Date(invoice.issueDate).toLocaleDateString('es-MX')}</span>
                      <span className="font-bold text-[#0D2942]">${invoice.total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            {/* Desktop View - Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha Emisión</TableHead>
                    <TableHead className="hidden lg:table-cell">Fecha Vencimiento</TableHead>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/company/invoicing/invoices/new')}
                          >
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
                            <User className="w-4 h-4 text-gray-400 hidden md:block" />
                            <div>
                              <div className="font-medium">{invoice.customer?.name}</div>
                              <div className="text-xs text-gray-500 hidden lg:block">
                                {invoice.customer?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(invoice.issueDate).toLocaleDateString('es-MX')}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
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
                          <div className="flex justify-end gap-1">
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
            </div>

            {/* Paginación */}
            {filteredInvoices.length > 0 && (
              <div className="p-3 sm:p-0 sm:pt-4">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

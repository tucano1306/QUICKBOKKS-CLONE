'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { 
  Search, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Payment {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
}

export default function PaymentsPage() {
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  const loadPayments = useCallback(async () => {
    if (!activeCompany) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        companyId: activeCompany.id
      })
      
      if (methodFilter !== 'ALL') params.append('method', methodFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const response = await fetch(`/api/invoices/payments?${params}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar pagos')
      }

      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error('Error loading payments:', error)
      toast.error('Error al cargar pagos')
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }, [activeCompany, methodFilter, dateFrom, dateTo])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadPayments()
    }
  }, [status, activeCompany, loadPayments])

  useEffect(() => {
    filterPayments()
  }, [searchTerm, methodFilter, statusFilter, dateFrom, dateTo, payments])

  const filterPayments = () => {
    let filtered = payments.filter(payment =>
      payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (methodFilter !== 'ALL') {
      filtered = filtered.filter(p => p.paymentMethod === methodFilter)
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(p => new Date(p.paymentDate) >= new Date(dateFrom))
    }

    if (dateTo) {
      filtered = filtered.filter(p => new Date(p.paymentDate) <= new Date(dateTo))
    }

    setFilteredPayments(filtered)
  }

  const exportToExcel = () => {
    try {
      const headers = ['Factura', 'Cliente', 'Monto', 'Fecha', 'Método', 'Referencia', 'Estado']
      const rows = filteredPayments.map(p => [
        p.invoiceNumber,
        p.customerName,
        `$${p.amount.toFixed(2)}`,
        format(new Date(p.paymentDate), 'dd/MM/yyyy'),
        p.paymentMethod,
        p.reference,
        p.status
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `pagos_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()

      toast.success('Archivo Excel generado')
    } catch (error) {
      toast.error('Error al exportar')
    }
  }

  const exportToPDF = () => {
    toast.success('Generando PDF...')
  }

  const getMethodBadge = (method: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      TRANSFER: { color: 'bg-blue-100 text-blue-800', label: 'Transferencia' },
      CASH: { color: 'bg-green-100 text-green-800', label: 'Efectivo' },
      CARD: { color: 'bg-purple-100 text-purple-800', label: 'Tarjeta' },
      CHECK: { color: 'bg-orange-100 text-orange-800', label: 'Cheque' }
    }
    const config = variants[method] || { color: 'bg-gray-100 text-gray-800', label: method }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      COMPLETED: { variant: 'success', label: 'Completado' },
      PENDING: { variant: 'warning', label: 'Pendiente' },
      FAILED: { variant: 'destructive', label: 'Fallido' }
    }
    const config = variants[status] || variants.PENDING
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Calculate stats
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const completedPayments = filteredPayments.filter(p => p.status === 'COMPLETED').length
  const pendingPayments = filteredPayments.filter(p => p.status === 'PENDING').length

  if (status === 'loading' || isLoading) {
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pagos Recibidos</h1>
            <p className="text-gray-600 mt-1">
              Historial y gestión de pagos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Recibido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalAmount.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-2xl font-bold text-gray-900">{completedPayments}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingPayments}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pagos</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar pagos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los Métodos</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="CHECK">Cheque</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="COMPLETED">Completados</option>
                <option value="PENDING">Pendientes</option>
                <option value="FAILED">Fallidos</option>
              </select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Desde"
                className="w-40"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Hasta"
                className="w-40"
              />

              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>

              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!Array.isArray(filteredPayments) || filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron pagos' : 'No hay pagos registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                      <TableCell>{payment.customerName}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${payment.amount.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{payment.reference}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" title="Descargar recibo">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

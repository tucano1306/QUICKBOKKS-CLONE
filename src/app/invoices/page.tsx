'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import QuickAccessBar from '@/components/ui/quick-access-bar'
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
  Eye, 
  Download, 
  LayoutDashboard, 
  Users, 
  Receipt, 
  DollarSign, 
  PieChart,
  Send,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Filter,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  total: number
  status: string
  customer: {
    name: string
    email: string | null
  }
}

export default function InvoicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const invoicesLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
    { label: 'Clientes', href: '/customers', icon: Users, color: 'purple' },
    { label: 'Facturas', href: '/invoices', icon: Receipt, color: 'green' },
    { label: 'Pagos', href: '/company/invoices/payments', icon: DollarSign, color: 'yellow' },
    { label: 'Reportes', href: '/reports', icon: PieChart, color: 'indigo' }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      fetchInvoices()
    }
  }, [status])

  useEffect(() => {
    const filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredInvoices(filtered)
  }, [searchTerm, invoices])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const result = await response.json()
        // La API ahora devuelve { data: [...], pagination: {...} }
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

  const generatePaymentLink = async (invoiceId: string, provider: 'stripe' | 'manual') => {
    setGeneratingLink(invoiceId)
    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: provider === 'stripe' ? 'create-stripe' : 'create-manual',
          options: {
            invoiceId,
            expiresInDays: 30,
            customMessage: 'Por favor procesa tu pago usando el siguiente enlace',
          },
        }),
      })

      if (!response.ok) throw new Error('Error generando link')

      const link = await response.json()
      
      // Copiar al portapapeles
      await navigator.clipboard.writeText(link.url)
      toast.success(`Link generado y copiado: ${link.shortCode}`)
    } catch (error: any) {
      toast.error(error.message || 'Error generando payment link')
    } finally {
      setGeneratingLink(null)
    }
  }

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const confirmed = confirm(`¿Enviar factura ${invoice.invoiceNumber} a ${invoice.customer.email}?`)
      if (!confirmed) return

      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success(`Factura enviada a ${invoice.customer.email}`)
    } catch (error) {
      toast.error('Error al enviar factura')
    }
  }

  const handleRegisterPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPaymentModal(true)
  }

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const confirmed = confirm(`¿Eliminar factura ${invoiceNumber}?`)
      if (!confirmed) return

      await new Promise(resolve => setTimeout(resolve, 500))
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
      toast.success('Factura eliminada')
    } catch (error) {
      toast.error('Error al eliminar factura')
    }
  }

  const exportToExcel = () => {
    try {
      const headers = ['Número', 'Cliente', 'Fecha Emisión', 'Fecha Vencimiento', 'Total', 'Estado']
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.customer.name,
        format(new Date(inv.issueDate), 'dd/MM/yyyy'),
        format(new Date(inv.dueDate), 'dd/MM/yyyy'),
        `$${inv.total.toFixed(2)}`,
        inv.status
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `facturas_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()

      toast.success('Archivo Excel generado')
    } catch (error) {
      toast.error('Error al exportar')
    }
  }

  const exportToPDF = () => {
    toast.success('Generando PDF...')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Borrador' },
      SENT: { variant: 'default', label: 'Enviada' },
      VIEWED: { variant: 'default', label: 'Vista' },
      PARTIAL: { variant: 'warning', label: 'Pago Parcial' },
      PAID: { variant: 'success', label: 'Pagada' },
      OVERDUE: { variant: 'destructive', label: 'Vencida' },
      CANCELLED: { variant: 'secondary', label: 'Cancelada' },
    }

    const config = variants[status] || variants.DRAFT
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <QuickAccessBar title="Navegación Facturas" links={invoicesLinks} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facturas</h1>
            <p className="text-gray-600 mt-1">
              Gestiona tus facturas y pagos
            </p>
          </div>
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="DRAFT">Borradores</option>
                <option value="SENT">Enviadas</option>
                <option value="PAID">Pagadas</option>
                <option value="OVERDUE">Vencidas</option>
              </select>
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
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron facturas' : 'No hay facturas registradas'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer.name}</div>
                          {invoice.customer.email && (
                            <div className="text-xs text-gray-500">{invoice.customer.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${invoice.total.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm" title="Ver detalles">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Button variant="ghost" size="sm" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendInvoice(invoice)}
                              title="Enviar por email"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE' || invoice.status === 'PARTIAL') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegisterPayment(invoice)}
                              className="text-green-600 hover:text-green-700"
                              title="Registrar pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePaymentLink(invoice.id, 'manual')}
                              disabled={generatingLink === invoice.id}
                              title="Generar payment link"
                            >
                              {generatingLink === invoice.id ? '...' : '💳'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="Descargar PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Payment Registration Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
            <p className="text-sm text-gray-600 mb-4">
              Factura: <span className="font-semibold">{selectedInvoice.invoiceNumber}</span>
              <br />
              Cliente: <span className="font-semibold">{selectedInvoice.customer.name}</span>
              <br />
              Total: <span className="font-semibold">${selectedInvoice.total.toLocaleString('es-MX')}</span>
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const amount = parseFloat(formData.get('amount') as string)
              const method = formData.get('method') as string
              const reference = formData.get('reference') as string
              
              if (amount <= 0 || amount > selectedInvoice.total) {
                toast.error('Monto inválido')
                return
              }
              
              // Simulate API call
              setTimeout(() => {
                setInvoices(prev => prev.map(inv => 
                  inv.id === selectedInvoice.id 
                    ? { ...inv, status: amount >= selectedInvoice.total ? 'PAID' : 'PARTIAL' }
                    : inv
                ))
                toast.success(`Pago de $${amount.toLocaleString('es-MX')} registrado`)
                setShowPaymentModal(false)
                setSelectedInvoice(null)
              }, 500)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monto</label>
                  <Input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={selectedInvoice.total}
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Método de Pago</label>
                  <select 
                    name="method" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="CHECK">Cheque</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Referencia/Número</label>
                  <Input name="reference" placeholder="Núm. de referencia" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Pago</label>
                  <Input 
                    name="paymentDate" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Registrar Pago
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedInvoice(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

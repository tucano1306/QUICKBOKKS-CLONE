'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { Plus, Search, Edit, Eye, Download } from 'lucide-react'
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)

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
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generatePaymentLink(invoice.id, 'manual')}
                              disabled={generatingLink === invoice.id}
                              title="Generar payment link"
                            >
                              {generatingLink === invoice.id ? '...' : '💳'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
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
    </DashboardLayout>
  )
}

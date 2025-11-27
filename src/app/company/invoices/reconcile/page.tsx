'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Check,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface UnpaidInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
}

interface UnmatchedPayment {
  id: string
  reference: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes?: string
}

interface ReconciliationMatch {
  invoiceId: string
  paymentId: string
  matchScore: number
}

export default function ReconcilePage() {
  const { data: session, status } = useSession()
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([])
  const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<UnpaidInvoice | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchInvoices, setSearchInvoices] = useState('')
  const [searchPayments, setSearchPayments] = useState('')
  const [autoMatches, setAutoMatches] = useState<ReconciliationMatch[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockInvoices: UnpaidInvoice[] = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2024-010',
          customerName: 'Acme Corp',
          amount: 15000,
          dueDate: '2024-01-10',
          daysOverdue: 15
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-2024-015',
          customerName: 'Tech Solutions',
          amount: 28500,
          dueDate: '2024-01-15',
          daysOverdue: 10
        },
        {
          id: 'inv-3',
          invoiceNumber: 'INV-2024-018',
          customerName: 'Global Services',
          amount: 12000,
          dueDate: '2024-01-20',
          daysOverdue: 5
        }
      ]

      const mockPayments: UnmatchedPayment[] = [
        {
          id: 'pay-1',
          reference: 'TRF-123456',
          amount: 15000,
          paymentDate: '2024-01-25',
          paymentMethod: 'TRANSFER',
          notes: 'Pago de factura enero'
        },
        {
          id: 'pay-2',
          reference: 'CASH-001',
          amount: 12000,
          paymentDate: '2024-01-26',
          paymentMethod: 'CASH'
        },
        {
          id: 'pay-3',
          reference: 'TRF-789012',
          amount: 28500,
          paymentDate: '2024-01-27',
          paymentMethod: 'TRANSFER',
          notes: 'Servicios consultoria'
        }
      ]

      setUnpaidInvoices(mockInvoices)
      setUnmatchedPayments(mockPayments)

      // Auto-match by amount
      const matches: ReconciliationMatch[] = []
      mockInvoices.forEach(inv => {
        mockPayments.forEach(pay => {
          if (Math.abs(inv.amount - pay.amount) < 0.01) {
            matches.push({
              invoiceId: inv.id,
              paymentId: pay.id,
              matchScore: 100
            })
          }
        })
      })
      setAutoMatches(matches)

    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualMatch = () => {
    if (!selectedInvoice || !selectedPayment) {
      toast.error('Selecciona una factura y un pago')
      return
    }

    if (selectedPayment.amount > selectedInvoice.amount) {
      toast.error('El monto del pago es mayor al de la factura')
      return
    }

    // Simulate API call
    setTimeout(() => {
      setUnpaidInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id))
      setUnmatchedPayments(prev => prev.filter(pay => pay.id !== selectedPayment.id))
      setSelectedInvoice(null)
      setSelectedPayment(null)
      toast.success('Conciliación realizada exitosamente')
    }, 500)
  }

  const handleAutoMatch = (match: ReconciliationMatch) => {
    const invoice = unpaidInvoices.find(inv => inv.id === match.invoiceId)
    const payment = unmatchedPayments.find(pay => pay.id === match.paymentId)

    if (!invoice || !payment) return

    setTimeout(() => {
      setUnpaidInvoices(prev => prev.filter(inv => inv.id !== match.invoiceId))
      setUnmatchedPayments(prev => prev.filter(pay => pay.id !== match.paymentId))
      setAutoMatches(prev => prev.filter(m => m.invoiceId !== match.invoiceId))
      toast.success(`${invoice.invoiceNumber} conciliado con ${payment.reference}`)
    }, 500)
  }

  const filteredInvoices = unpaidInvoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchInvoices.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchInvoices.toLowerCase())
  )

  const filteredPayments = unmatchedPayments.filter(pay =>
    pay.reference.toLowerCase().includes(searchPayments.toLowerCase()) ||
    (pay.notes?.toLowerCase().includes(searchPayments.toLowerCase()) || false)
  )

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
            <h1 className="text-3xl font-bold text-gray-900">Conciliación de Pagos</h1>
            <p className="text-gray-600 mt-1">
              Relaciona facturas pendientes con pagos recibidos
            </p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Facturas Pendientes</p>
                <p className="text-3xl font-bold text-orange-600">{unpaidInvoices.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pagos Sin Asignar</p>
                <p className="text-3xl font-bold text-blue-600">{unmatchedPayments.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Coincidencias Automáticas</p>
                <p className="text-3xl font-bold text-green-600">{autoMatches.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auto-match suggestions */}
        {autoMatches.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Coincidencias Automáticas Detectadas
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {autoMatches.map(match => {
                const invoice = unpaidInvoices.find(inv => inv.id === match.invoiceId)
                const payment = unmatchedPayments.find(pay => pay.id === match.paymentId)
                if (!invoice || !payment) return null

                return (
                  <div key={match.invoiceId} className="bg-white p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">{invoice.customerName}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">{payment.reference}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ${payment.amount.toLocaleString('es-MX')}
                        </p>
                        <Badge variant="success" className="text-xs">
                          {match.matchScore}% Match
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAutoMatch(match)}
                      className="ml-4"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Conciliar
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Manual matching interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unpaid Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Facturas Pendientes</h3>
                <Badge variant="warning">{filteredInvoices.length}</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInvoices}
                  onChange={(e) => setSearchInvoices(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(filteredInvoices) || filteredInvoices.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay facturas pendientes
                  </p>
                ) : (
                  filteredInvoices.map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedInvoice?.id === invoice.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="font-bold text-orange-600">
                          ${invoice.amount.toLocaleString('es-MX')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">{invoice.customerName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-gray-500">
                          Vencimiento: {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                        </p>
                        {invoice.daysOverdue > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {invoice.daysOverdue} días vencida
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Unmatched Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Pagos Sin Asignar</h3>
                <Badge variant="default">{filteredPayments.length}</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar pagos..."
                  value={searchPayments}
                  onChange={(e) => setSearchPayments(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!Array.isArray(filteredPayments) || filteredPayments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay pagos sin asignar
                  </p>
                ) : (
                  filteredPayments.map(payment => (
                    <div
                      key={payment.id}
                      onClick={() => setSelectedPayment(payment)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPayment?.id === payment.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{payment.reference}</p>
                        <p className="font-bold text-green-600">
                          ${payment.amount.toLocaleString('es-MX')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {payment.paymentMethod.toLowerCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match Action */}
        {selectedInvoice && selectedPayment && (
          <Card className="border-blue-500 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Factura seleccionada</p>
                    <p className="font-bold text-lg">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">${selectedInvoice.amount.toLocaleString('es-MX')}</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pago seleccionado</p>
                    <p className="font-bold text-lg">{selectedPayment.reference}</p>
                    <p className="text-sm text-gray-600">${selectedPayment.amount.toLocaleString('es-MX')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleManualMatch}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Conciliar Ahora
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(null)
                      setSelectedPayment(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
              {Math.abs(selectedInvoice.amount - selectedPayment.amount) > 0.01 && (
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Los montos no coinciden exactamente
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Diferencia: ${Math.abs(selectedInvoice.amount - selectedPayment.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

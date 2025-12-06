'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign,
  Save,
  X,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  Calendar,
  FileText,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    name: string
  }
  total: number
  dueDate: string
  status: string
}

export default function NewPaymentPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'check' | 'paypal'>('transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchInvoices()
    }
  }, [activeCompany])

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?companyId=${activeCompany?.id}&status=SENT`)
      if (response.ok) {
        const data = await response.json()
        const invoiceData = Array.isArray(data) ? data : data.data || []
        // Filtrar solo facturas no pagadas
        setInvoices(invoiceData.filter((inv: Invoice) => inv.status !== 'PAID'))
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  useEffect(() => {
    if (selectedInvoice) {
      const invoice = invoices.find(inv => inv.id === selectedInvoice)
      if (invoice) {
        setAmount(invoice.total)
      }
    }
  }, [selectedInvoice, invoices])

  const handleSave = async () => {
    if (!selectedInvoice || amount <= 0) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      const paymentData = {
        invoiceId: selectedInvoice,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        reference,
        notes,
        companyId: activeCompany?.id
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      if (response.ok) {
        toast.success('✅ Pago registrado exitosamente')
        router.push('/company/invoicing/payments')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al registrar pago')
      }
    } catch (error) {
      console.error('Error registering payment:', error)
      toast.error('Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  const paymentActions = [
    {
      label: 'Registrar pago',
      icon: Save,
      onClick: handleSave,
      variant: 'primary' as const,
      disabled: loading
    },
    {
      label: 'Cancelar',
      icon: X,
      onClick: () => router.push('/company/invoicing/payments'),
      variant: 'danger' as const
    }
  ]

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo', icon: Banknote },
    { value: 'transfer', label: 'Transferencia', icon: Building2 },
    { value: 'card', label: 'Tarjeta', icon: CreditCard },
    { value: 'check', label: 'Cheque', icon: FileText },
    { value: 'paypal', label: 'PayPal', icon: Wallet }
  ]

  const selectedInvoiceData = invoices.find(inv => inv.id === selectedInvoice)

  if (status === 'loading') {
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
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            Registrar Pago Recibido
          </h1>
          <p className="text-gray-600 mt-1">
            Registra pagos recibidos de tus clientes
          </p>
        </div>

        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={paymentActions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Factura a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Factura *
              </label>
              <select
                value={selectedInvoice}
                onChange={(e) => setSelectedInvoice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar factura pendiente...</option>
                {invoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {invoice.customer.name} - ${invoice.total.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoiceData && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Cliente:</span>
                  <span className="text-sm text-blue-700">{selectedInvoiceData.customer.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Total factura:</span>
                  <span className="text-lg font-bold text-blue-900">${selectedInvoiceData.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Vence:</span>
                  <span className="text-sm text-blue-700">
                    {new Date(selectedInvoiceData.dueDate).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700">
                  {selectedInvoiceData.status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Información del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Recibido *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                  className="pl-10 text-lg font-semibold amount-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Pago *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value as any)}
                      className={`p-4 border-2 rounded-lg flex items-center gap-3 transition ${
                        paymentMethod === method.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${
                        paymentMethod === method.value ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia / Número de Transacción
              </label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: SPEI-123456789 o Cheque #1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Adicionales
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 min-h-20"
                placeholder="Notas sobre el pago..."
              />
            </div>
          </CardContent>
        </Card>

        {selectedInvoiceData && amount > 0 && (
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-bold text-green-900">Resumen del Pago</h3>
                    <p className="text-sm text-green-700">Verifica los datos antes de guardar</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Factura:</span>
                  <span className="font-semibold text-green-900">{selectedInvoiceData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Cliente:</span>
                  <span className="font-semibold text-green-900">{selectedInvoiceData.customer.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Método:</span>
                  <span className="font-semibold text-green-900">
                    {paymentMethods.find(m => m.value === paymentMethod)?.label}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900">Monto a registrar:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                {amount === selectedInvoiceData.total && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-200 px-3 py-2 rounded mt-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Este pago cubrirá el total de la factura</span>
                  </div>
                )}
                {amount < selectedInvoiceData.total && (
                  <div className="text-sm text-yellow-700 bg-yellow-100 px-3 py-2 rounded mt-2">
                    ⚠️ Pago parcial - Restante: ${(selectedInvoiceData.total - amount).toFixed(2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || !selectedInvoice || amount <= 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Registrando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Registrar Pago
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/company/invoicing/payments')}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
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
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Wallet,
  Building2,
  Smartphone,
  Link as LinkIcon,
  PlusCircle,
  ArrowDownToLine
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Payment {
  id: string
  paymentNumber: string
  invoice: string
  customer: string
  date: string
  amount: number
  method: 'cash' | 'transfer' | 'card' | 'check' | 'paypal' | 'stripe'
  reference?: string
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  notes?: string
  fee?: number
}

export default function PaymentsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')

  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadPayments = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/payments?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const getMethodBadge = (method: string) => {
    const configs = {
      cash: { icon: Wallet, color: 'green', label: 'Efectivo' },
      transfer: { icon: Building2, color: 'blue', label: 'Transferencia' },
      card: { icon: CreditCard, color: 'purple', label: 'Tarjeta' },
      check: { icon: FileText, color: 'orange', label: 'Cheque' },
      paypal: { icon: Smartphone, color: 'blue', label: 'PayPal' },
      stripe: { icon: CreditCard, color: 'indigo', label: 'Stripe' }
    }
    
    const config = configs[method as keyof typeof configs]
    if (!config) return null
    
    const Icon = config.icon
    return (
      <div className={`flex items-center gap-1 text-${config.color}-700`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completado
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Fallido
        </Badge>
      case 'refunded':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 rotate-180" /> Reembolsado
        </Badge>
      default:
        return null
    }
  }

  const filteredPayments = payments.filter(pay => {
    if (filterStatus !== 'all' && pay.status !== filterStatus) return false
    if (filterMethod !== 'all' && pay.method !== filterMethod) return false
    if (searchTerm && !pay.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pay.invoice.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pay.customer.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalPayments = payments.filter(p => p.status === 'completed' || p.status === 'pending').length
  const totalAmount = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalFees = payments
    .filter(p => p.status === 'completed' && p.fee)
    .reduce((sum, p) => sum + (p.fee || 0), 0)
  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  // Method distribution
  const methodStats = payments
    .filter(p => p.status === 'completed')
    .reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const paymentActions = [
    {
      label: 'Ver todos',
      icon: Eye,
      onClick: () => {
        setFilterStatus('all')
        setFilterMethod('all')
        setSearchTerm('')
        toast.success('📋 Mostrando todos los pagos')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Registrar pago',
      icon: PlusCircle,
      onClick: () => {
        router.push('/company/invoicing/payments/new')
      },
      variant: 'primary' as const,
    },
    {
      label: 'Aplicar a factura',
      icon: ArrowDownToLine,
      onClick: () => {
        toast('Selecciona un pago para aplicar a una factura')
      },
      variant: 'default' as const,
    },
    {
      label: 'Buscar',
      icon: Search,
      onClick: () => {
        const input = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        input?.focus()
        toast('🔍 Busca por factura, cliente o referencia')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Exportar',
      icon: Download,
      onClick: () => {
        const csv = 'Número,Factura,Cliente,Fecha,Monto,Método,Estado\nDatos pagos...'
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success('📥 Exportando pagos a CSV...')
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
              <DollarSign className="w-8 h-8 text-green-600" />
              Pagos Recibidos
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona todos los pagos de tus clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const csv = 'Número,Factura,Cliente,Fecha,Monto,Método,Estado\nDatos pagos...'
              const blob = new Blob([csv], { type: 'text/csv' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              toast.success('📥 Exportando pagos...')
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => router.push('/company/invoicing/payments/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Acciones de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={paymentActions} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Total Cobrado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalPayments}</div>
              <div className="text-sm text-blue-700">Pagos Recibidos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${pendingAmount.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">En Proceso</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${totalFees.toLocaleString()}
              </div>
              <div className="text-sm text-red-700">Comisiones Pagadas</div>
            </CardContent>
          </Card>
        </div>

        {/* Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(methodStats).map(([method, count]) => (
                <div key={method} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-center mb-2">
                    {getMethodBadge(method)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600">pagos</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar pagos..."
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
                <option value="completed">Completados</option>
                <option value="pending">Pendientes</option>
                <option value="failed">Fallidos</option>
                <option value="refunded">Reembolsados</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="all">Todos los Métodos</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="check">Cheque</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Método</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Comisión</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {payment.paymentNumber}
                        </div>
                        {payment.reference && (
                          <div className="text-xs text-gray-500">
                            {payment.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-gray-400" />
                          <span className="text-sm font-mono text-gray-700">
                            {payment.invoice}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.customer}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(payment.date).toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getMethodBadge(payment.method)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ${payment.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payment.fee ? (
                          <div className="text-sm text-red-600">
                            -${payment.fee.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            -
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                          {payment.status === 'completed' && (
                            <button className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                              <LinkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Gestión de Pagos</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Registra y monitorea todos los pagos recibidos de tus clientes.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Múltiples métodos:</strong> Efectivo, transferencias, tarjetas, cheques, PayPal, Stripe</li>
                  <li>• <strong>Aplicación automática:</strong> Vincula pagos con facturas automáticamente</li>
                  <li>• <strong>Seguimiento de comisiones:</strong> Controla las comisiones de procesamiento</li>
                  <li>• <strong>Conciliación bancaria:</strong> Facilita la reconciliación con extractos bancarios</li>
                  <li>• <strong>Reportes:</strong> Analiza tus ingresos por método, cliente y periodo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

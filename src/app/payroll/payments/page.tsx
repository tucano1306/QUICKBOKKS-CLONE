'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building,
  Banknote,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Download,
  Send
} from 'lucide-react'

interface Payment {
  id: string
  type: string
  amount: number
  date: string
  reference: string
  status: string
  payroll: {
    id: string
    periodStart: string
    periodEnd: string
    employee: {
      id: string
      firstName: string
      lastName: string
      department: string
    }
  }
}

interface Payroll {
  id: string
  periodStart: string
  periodEnd: string
  netPay: number
  status: string
  employee: {
    id: string
    firstName: string
    lastName: string
  }
}

export default function PayrollPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingPayrolls, setPendingPayrolls] = useState<Payroll[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([])
  const [paymentType, setPaymentType] = useState<string>('TRANSFER')
  const [processing, setProcessing] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingCount: 0,
    completedCount: 0
  })

  useEffect(() => {
    fetchPayments()
    fetchPendingPayrolls()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payroll/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || data)
        
        // Calculate stats
        const allPayments = data.payments || data
        setStats({
          totalPayments: allPayments.length,
          totalAmount: allPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
          pendingCount: allPayments.filter((p: Payment) => p.status === 'PENDING').length,
          completedCount: allPayments.filter((p: Payment) => p.status === 'COMPLETED').length
        })
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingPayrolls = async () => {
    try {
      const response = await fetch('/api/payroll?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setPendingPayrolls(data.payrolls || data)
      }
    } catch (error) {
      console.error('Error fetching pending payrolls:', error)
    }
  }

  const processPayments = async () => {
    if (selectedPayrolls.length === 0) {
      alert('Por favor seleccione al menos una nómina')
      return
    }

    setProcessing(true)
    try {
      const results = []
      for (const payrollId of selectedPayrolls) {
        const payroll = pendingPayrolls.find(p => p.id === payrollId)
        if (payroll) {
          const response = await fetch('/api/payroll/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payrollId,
              type: paymentType,
              amount: payroll.netPay,
              date: new Date().toISOString(),
              reference: paymentType === 'TRANSFER' 
                ? `TRF-${Date.now()}-${payrollId.slice(0, 4)}`
                : paymentType === 'CASH'
                ? `CASH-${Date.now()}`
                : `DD-${Date.now()}`
            })
          })
          
          if (response.ok) {
            results.push(await response.json())
          }
        }
      }

      alert(`Se procesaron ${results.length} pagos exitosamente`)
      setShowNewPayment(false)
      setSelectedPayrolls([])
      fetchPayments()
      fetchPendingPayrolls()
    } catch (error) {
      console.error('Error processing payments:', error)
      alert('Error al procesar los pagos')
    } finally {
      setProcessing(false)
    }
  }

  const togglePayroll = (id: string) => {
    setSelectedPayrolls(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const selectAllPayrolls = () => {
    if (selectedPayrolls.length === pendingPayrolls.length) {
      setSelectedPayrolls([])
    } else {
      setSelectedPayrolls(pendingPayrolls.map(p => p.id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TRANSFER': return <Building className="h-4 w-4" />
      case 'CASH': return <Banknote className="h-4 w-4" />
      case 'CHECK': return <CreditCard className="h-4 w-4" />
      case 'DIRECT_DEPOSIT': return <Send className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'TRANSFER': return 'Transferencia'
      case 'CASH': return 'Efectivo'
      case 'CHECK': return 'Cheque'
      case 'DIRECT_DEPOSIT': return 'Depósito Directo'
      default: return type
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-700">Completado</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700">Fallido</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.payroll?.employee?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payroll?.employee?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || payment.type === filterType
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/payroll')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pagos de Nómina</h1>
              <p className="text-sm text-gray-500">
                Gestiona transferencias, efectivo y depósitos directos
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewPayment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Pagos</p>
                  <p className="text-2xl font-bold">{stats.totalPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monto Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold">{stats.pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completados</p>
                  <p className="text-2xl font-bold">{stats.completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por empleado o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos los tipos</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CASH">Efectivo</option>
                <option value="CHECK">Cheque</option>
                <option value="DIRECT_DEPOSIT">Depósito Directo</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos los estados</option>
                <option value="COMPLETED">Completado</option>
                <option value="PENDING">Pendiente</option>
                <option value="FAILED">Fallido</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Empleado</th>
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Referencia</th>
                      <th className="text-left py-3 px-4">Fecha</th>
                      <th className="text-right py-3 px-4">Monto</th>
                      <th className="text-left py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">
                            {payment.payroll?.employee?.firstName} {payment.payroll?.employee?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.payroll?.employee?.department}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(payment.type)}
                            {getTypeLabel(payment.type)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">
                          {payment.reference}
                        </td>
                        <td className="py-3 px-4">
                          {new Date(payment.date).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(payment.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay pagos registrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Payment Modal */}
        {showNewPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Procesar Pagos</h2>
              
              {/* Payment Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tipo de Pago</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'TRANSFER', label: 'Transferencia', icon: Building },
                    { value: 'DIRECT_DEPOSIT', label: 'Depósito Directo', icon: Send },
                    { value: 'CASH', label: 'Efectivo', icon: Banknote },
                    { value: 'CHECK', label: 'Cheque', icon: CreditCard }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setPaymentType(type.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        paymentType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`h-6 w-6 ${
                        paymentType === type.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending Payrolls */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Nóminas Pendientes</label>
                  <Button variant="outline" size="sm" onClick={selectAllPayrolls}>
                    {selectedPayrolls.length === pendingPayrolls.length ? 'Deseleccionar' : 'Seleccionar'} Todas
                  </Button>
                </div>
                
                {pendingPayrolls.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {pendingPayrolls.map(payroll => (
                      <div
                        key={payroll.id}
                        onClick={() => togglePayroll(payroll.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPayrolls.includes(payroll.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            {payroll.employee.firstName} {payroll.employee.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Período: {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold text-green-600">
                          {formatCurrency(payroll.netPay)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    No hay nóminas pendientes de pago
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedPayrolls.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Total a Pagar</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          pendingPayrolls
                            .filter(p => selectedPayrolls.includes(p.id))
                            .reduce((sum, p) => sum + p.netPay, 0)
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {selectedPayrolls.length} nómina(s) seleccionada(s)
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNewPayment(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={processPayments}
                  disabled={processing || selectedPayrolls.length === 0}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Procesar Pagos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

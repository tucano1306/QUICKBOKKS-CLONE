'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface CustomerTransaction {
  id: string
  customerId: string
  customerName: string
  type: 'invoice' | 'payment' | 'credit-note' | 'estimate'
  documentNumber: string
  date: string
  dueDate?: string
  amount: number
  balance: number
  status: 'paid' | 'partial' | 'pending' | 'overdue' | 'draft'
  description: string
}

export default function CustomerTransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])

  const loadTransactions = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/transactions?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading customer transactions:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Factura
        </Badge>
      case 'payment':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Pago
        </Badge>
      case 'credit-note':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <Receipt className="w-3 h-3" /> Nota Crédito
        </Badge>
      case 'estimate':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Cotización
        </Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Pagado
        </Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Parcial
        </Badge>
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Vencido
        </Badge>
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Borrador
        </Badge>
      default:
        return null
    }
  }

  const filteredTransactions = transactions.filter(trx => {
    if (filterCustomer !== 'all' && trx.customerId !== filterCustomer) return false
    if (filterType !== 'all' && trx.type !== filterType) return false
    if (filterStatus !== 'all' && trx.status !== filterStatus) return false
    if (searchTerm && !trx.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    if (dateRange !== 'all') {
      const trxDate = new Date(trx.date)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - trxDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dateRange === 'week' && daysDiff > 7) return false
      if (dateRange === 'month' && daysDiff > 30) return false
      if (dateRange === 'quarter' && daysDiff > 90) return false
    }
    
    return true
  })

  // Get unique customers for filter
  const uniqueCustomers = Array.from(new Set(transactions.map(t => t.customerName)))
    .map(name => transactions.find(t => t.customerName === name)!)

  // Calculate stats
  const totalInvoiced = transactions
    .filter(t => t.type === 'invoice' && t.status !== 'draft')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalReceived = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalPending = transactions
    .filter(t => (t.type === 'invoice' || t.type === 'credit-note') && t.balance > 0)
    .reduce((sum, t) => sum + t.balance, 0)
  const overdueCount = transactions.filter(t => t.status === 'overdue').length

  if (status === 'loading' || loading) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Transacciones</h1>
            <p className="text-gray-600 mt-1">
              Todas las facturas y pagos de tus clientes
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            const csv = 'Fecha,Cliente,Tipo,Monto,Estado\nEjemplo de datos...'
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `transacciones-clientes-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowUpRight className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${totalInvoiced.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Facturado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowDownRight className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalReceived.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Total Cobrado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalPending.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Saldo Pendiente</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">{overdueCount}</div>
              <div className="text-sm text-red-700">Facturas Vencidas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
              >
                <option value="all">Todos los Clientes</option>
                {uniqueCustomers.map(customer => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {customer.customerName}
                  </option>
                ))}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="invoice">Facturas</option>
                <option value="payment">Pagos</option>
                <option value="credit-note">Notas de Crédito</option>
                <option value="estimate">Cotizaciones</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="paid">Pagados</option>
                <option value="partial">Parciales</option>
                <option value="pending">Pendientes</option>
                <option value="overdue">Vencidos</option>
                <option value="draft">Borradores</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">Todo el Período</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mes</option>
                <option value="quarter">Último Trimestre</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        {transaction.dueDate && (
                          <div className="text-xs text-gray-500">
                            Vence: {new Date(transaction.dueDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {transaction.documentNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.customerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {transaction.description}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getTypeBadge(transaction.type)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          transaction.amount < 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          ${Math.abs(transaction.amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {transaction.balance > 0 ? (
                          <div className="text-sm font-semibold text-orange-600">
                            ${transaction.balance.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4" />
                          </button>
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
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Historial Completo de Transacciones</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Este módulo te permite visualizar y analizar todas las transacciones con tus clientes en un solo lugar.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Vista unificada</strong> de facturas, pagos, notas de crédito y cotizaciones</li>
                  <li>• <strong>Filtros avanzados</strong> por cliente, tipo, estado y fecha</li>
                  <li>• <strong>Seguimiento de saldos</strong> pendientes por cliente</li>
                  <li>• <strong>Identificación rápida</strong> de facturas vencidas</li>
                  <li>• <strong>Exportación</strong> para análisis y reportes contables</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

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
  History,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  FileText,
  Package,
  RefreshCw
} from 'lucide-react'

interface VendorTransaction {
  id: string
  transactionId: string
  vendor: string
  vendorId: string
  type: 'purchase-order' | 'bill' | 'payment' | 'return'
  date: string
  amount: number
  balance: number
  status: string
  description: string
  reference?: string
}

export default function VendorHistoryPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVendor, setFilterVendor] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [transactions, setTransactions] = useState<VendorTransaction[]>([])
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadData = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      // Load vendors
      const vendorsRes = await fetch(`/api/vendors?companyId=${activeCompany.id}`)
      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json()
        const vendorsList = (vendorsData.vendors || vendorsData || []).map((v: any) => ({
          id: v.id,
          name: v.name
        }))
        setVendors(vendorsList)
      }

      // Load vendor payables as transactions
      const payablesRes = await fetch(`/api/vendors/payables?companyId=${activeCompany.id}`)
      if (payablesRes.ok) {
        const payablesData = await payablesRes.json()
        const payables = payablesData.payables || []
        
        const txns: VendorTransaction[] = payables.map((p: any) => ({
          id: p.id,
          transactionId: p.billNumber || p.id,
          vendor: p.vendor?.name || 'Proveedor',
          vendorId: p.vendorId,
          type: 'bill',
          date: p.issueDate,
          amount: p.total,
          balance: p.balance,
          status: p.status === 'PAID' ? 'Pagado' : 
                  p.status === 'PARTIAL' ? 'Pago Parcial' : 
                  p.status === 'OVERDUE' ? 'Vencido' : 'Por Pagar',
          description: p.description || 'Factura de proveedor'
        }))
        
        setTransactions(txns)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadData()
    }
  }, [status, activeCompany, loadData])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase-order':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <ShoppingBag className="w-3 h-3" /> Orden Compra
        </Badge>
      case 'bill':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Factura
        </Badge>
      case 'payment':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Pago
        </Badge>
      case 'return':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <Package className="w-3 h-3" /> Devolución
        </Badge>
      default:
        return null
    }
  }

  const filteredTransactions = transactions.filter(trx => {
    if (filterVendor !== 'all' && trx.vendorId !== filterVendor) return false
    if (filterType !== 'all' && trx.type !== filterType) return false
    if (searchTerm && !trx.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.vendor.toLowerCase().includes(searchTerm.toLowerCase()) &&
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

  const uniqueVendors = Array.from(new Set(transactions.map(t => t.vendor)))
    .map(name => transactions.find(t => t.vendor === name)!)

  const totalPurchases = transactions
    .filter(t => (t.type === 'purchase-order' || t.type === 'bill') && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const currentBalance = transactions
    .filter(t => t.type !== 'payment')
    .reduce((sum, t) => sum + t.balance, 0)
  const transactionsThisMonth = transactions.filter(t => {
    const trxDate = new Date(t.date)
    const now = new Date()
    return trxDate.getMonth() === now.getMonth() && trxDate.getFullYear() === now.getFullYear()
  }).length

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
            <h1 className="text-2xl font-bold text-gray-900">Historial de Compras</h1>
            <p className="text-gray-600 mt-1">
              Registro completo de transacciones con proveedores
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            const csv = 'ID,Proveedor,Tipo,Fecha,Monto,Balance,Estado\n' + 
              filteredTransactions.map(t => 
                `${t.transactionId},"${t.vendor}",${t.type},${t.date},$${t.amount},$${t.balance},${t.status}`
              ).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `historial-proveedores-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Historial
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${totalPurchases.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Comprado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalPayments.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Total Pagado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${currentBalance.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Saldo Pendiente</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <History className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{transactionsThisMonth}</div>
              <div className="text-sm text-purple-700">Transacciones Este Mes</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="all">Todos los Proveedores</option>
                {uniqueVendors.map(vendor => (
                  <option key={vendor.vendorId} value={vendor.vendorId}>
                    {vendor.vendor}
                  </option>
                ))}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="purchase-order">Órdenes de Compra</option>
                <option value="bill">Facturas</option>
                <option value="payment">Pagos</option>
                <option value="return">Devoluciones</option>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transacción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
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
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {transaction.transactionId}
                        </div>
                        {transaction.reference && (
                          <div className="text-xs text-gray-500">
                            {transaction.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.vendor}
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
                        <span className="text-xs text-gray-700">
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
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
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Historial Completo de Compras</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Visualiza y analiza todas las transacciones con tus proveedores en un solo lugar.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Vista unificada:</strong> Órdenes de compra, facturas, pagos y devoluciones</li>
                  <li>• <strong>Análisis por proveedor:</strong> Identifica tu principal gasto por categoría</li>
                  <li>• <strong>Seguimiento de saldos:</strong> Control de cuentas por pagar en tiempo real</li>
                  <li>• <strong>Reportes detallados:</strong> Exporta para análisis de costos y presupuestos</li>
                  <li>• <strong>Auditoría:</strong> Rastrea cada transacción desde la orden hasta el pago</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

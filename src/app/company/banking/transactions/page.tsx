'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react'

interface BankTransaction {
  id: string
  transactionId: string
  date: string
  account: string
  accountId: string
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest'
  category: string
  description: string
  amount: number
  balance: number
  reference?: string
  counterparty?: string
  status: 'completed' | 'pending' | 'reconciled' | 'cancelled'
  reconciledDate?: string
}

export default function BankTransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('month')
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTransaction, setNewTransaction] = useState({
    accountId: '',
    type: 'deposit',
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    counterparty: '',
    reference: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const transactions: BankTransaction[] = [
    {
      id: 'TRX-001',
      transactionId: 'DEP-2025-001',
      date: '2025-11-25',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'deposit',
      category: 'Cobro Cliente',
      description: 'Pago factura INV-2025-042 - Acme Corp',
      amount: 145000,
      balance: 1250000,
      reference: 'INV-2025-042',
      counterparty: 'Acme Corp S.A. de C.V.',
      status: 'reconciled',
      reconciledDate: '2025-11-25'
    },
    {
      id: 'TRX-002',
      transactionId: 'WTH-2025-012',
      date: '2025-11-24',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'withdrawal',
      category: 'Pago Proveedor',
      description: 'Pago a Distribuidora Tech Solutions - BILL-2025-001',
      amount: -25000,
      balance: 1105000,
      reference: 'BILL-2025-001',
      counterparty: 'Distribuidora Tech Solutions',
      status: 'reconciled',
      reconciledDate: '2025-11-24'
    },
    {
      id: 'TRX-003',
      transactionId: 'TRF-2025-008',
      date: '2025-11-23',
      account: 'Cuenta Nómina',
      accountId: 'ACC-003',
      type: 'transfer',
      category: 'Transferencia Interna',
      description: 'Transferencia para pago de nómina quincena 2',
      amount: -250000,
      balance: 450000,
      reference: 'PAY-2025-Q2',
      status: 'completed'
    },
    {
      id: 'TRX-004',
      transactionId: 'DEP-2025-002',
      date: '2025-11-22',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'deposit',
      category: 'Cobro Cliente',
      description: 'Pago factura INV-2025-038 - GlobalTech Inc',
      amount: 85000,
      balance: 1130000,
      reference: 'INV-2025-038',
      counterparty: 'GlobalTech Inc.',
      status: 'reconciled',
      reconciledDate: '2025-11-22'
    },
    {
      id: 'TRX-005',
      transactionId: 'WTH-2025-013',
      date: '2025-11-21',
      account: 'Cuenta Fiscal - Impuestos',
      accountId: 'ACC-007',
      type: 'withdrawal',
      category: 'Pago Impuestos',
      description: 'Pago ISR y IVA - Octubre 2025',
      amount: -125000,
      balance: 350000,
      reference: 'TAX-OCT-2025',
      counterparty: 'SAT - Servicio de Administración Tributaria',
      status: 'reconciled',
      reconciledDate: '2025-11-21'
    },
    {
      id: 'TRX-006',
      transactionId: 'FEE-2025-004',
      date: '2025-11-20',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'fee',
      category: 'Comisión Bancaria',
      description: 'Comisión por manejo de cuenta - Noviembre 2025',
      amount: -450,
      balance: 1045000,
      status: 'completed'
    },
    {
      id: 'TRX-007',
      transactionId: 'INT-2025-002',
      date: '2025-11-20',
      account: 'Cuenta de Ahorros Empresarial',
      accountId: 'ACC-002',
      type: 'interest',
      category: 'Intereses Ganados',
      description: 'Intereses generados - Octubre 2025 (4.5% anual)',
      amount: 3187.50,
      balance: 850000,
      status: 'reconciled',
      reconciledDate: '2025-11-20'
    },
    {
      id: 'TRX-008',
      transactionId: 'DEP-2025-003',
      date: '2025-11-19',
      account: 'Cuenta USD Internacional',
      accountId: 'ACC-005',
      type: 'deposit',
      category: 'Cobro Internacional',
      description: 'Pago cliente internacional - Project Alpha',
      amount: 5000,
      balance: 45000,
      reference: 'INV-INT-2025-012',
      counterparty: 'Tech Solutions LLC (USA)',
      status: 'completed'
    },
    {
      id: 'TRX-009',
      transactionId: 'WTH-2025-014',
      date: '2025-11-18',
      account: 'Tarjeta de Crédito Corporativa',
      accountId: 'ACC-004',
      type: 'withdrawal',
      category: 'Gastos Operativos',
      description: 'Compra suministros de oficina - Amazon Business',
      amount: -8500,
      balance: -125000,
      reference: 'EXP-2025-089',
      counterparty: 'Amazon Business',
      status: 'pending'
    },
    {
      id: 'TRX-010',
      transactionId: 'WTH-2025-015',
      date: '2025-11-17',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'withdrawal',
      category: 'Pago Servicios',
      description: 'Pago renta oficina - Noviembre 2025',
      amount: -60000,
      balance: 1045450,
      reference: 'BILL-2025-003',
      counterparty: 'Inmobiliaria del Centro',
      status: 'reconciled',
      reconciledDate: '2025-11-17'
    },
    {
      id: 'TRX-011',
      transactionId: 'DEP-2025-004',
      date: '2025-11-15',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'deposit',
      category: 'Cobro Cliente',
      description: 'Pago factura INV-2025-035 - Innovatech',
      amount: 120000,
      balance: 1105450,
      reference: 'INV-2025-035',
      counterparty: 'Innovatech S.A.',
      status: 'reconciled',
      reconciledDate: '2025-11-15'
    },
    {
      id: 'TRX-012',
      transactionId: 'TRF-2025-009',
      date: '2025-11-14',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'transfer',
      category: 'Transferencia Interna',
      description: 'Transferencia a cuenta fiscal para impuestos',
      amount: -150000,
      balance: 985450,
      reference: 'TRF-FISCAL-NOV',
      status: 'completed'
    },
    {
      id: 'TRX-013',
      transactionId: 'WTH-2025-016',
      date: '2025-11-13',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'withdrawal',
      category: 'Pago Proveedor',
      description: 'Pago servicios de limpieza - Octubre 2025',
      amount: -5500,
      balance: 1135450,
      reference: 'BILL-2025-008',
      counterparty: 'Servicios de Limpieza ProClean',
      status: 'reconciled',
      reconciledDate: '2025-11-13'
    },
    {
      id: 'TRX-014',
      transactionId: 'DEP-2025-005',
      date: '2025-11-12',
      account: 'Cuenta Principal Operativa',
      accountId: 'ACC-001',
      type: 'deposit',
      category: 'Cobro Cliente',
      description: 'Pago factura INV-2025-033 - MegaCorp',
      amount: 95000,
      balance: 1140950,
      reference: 'INV-2025-033',
      counterparty: 'MegaCorp International',
      status: 'reconciled',
      reconciledDate: '2025-11-12'
    },
    {
      id: 'TRX-015',
      transactionId: 'WTH-2025-017',
      date: '2025-11-10',
      account: 'Cuenta Nómina',
      accountId: 'ACC-003',
      type: 'withdrawal',
      category: 'Pago Nómina',
      description: 'Dispersión nómina quincena 1 - Noviembre 2025',
      amount: -254798,
      balance: 700000,
      reference: 'PAY-2025-Q1',
      status: 'completed'
    }
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <ArrowDownLeft className="w-3 h-3" /> Depósito
        </Badge>
      case 'withdrawal':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> Retiro
        </Badge>
      case 'transfer':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Transferencia
        </Badge>
      case 'fee':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Comisión
        </Badge>
      case 'interest':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Interés
        </Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completada
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'reconciled':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conciliada
        </Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700">
          Cancelada
        </Badge>
      default:
        return null
    }
  }

  const filteredTransactions = transactions.filter(trx => {
    if (filterType !== 'all' && trx.type !== filterType) return false
    if (filterAccount !== 'all' && trx.accountId !== filterAccount) return false
    if (filterStatus !== 'all' && trx.status !== filterStatus) return false
    if (searchTerm && !trx.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.counterparty?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
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

  const uniqueAccounts = Array.from(new Set(transactions.map(t => t.account)))
    .map(name => transactions.find(t => t.account === name)!)

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' || t.type === 'interest')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' || t.type === 'fee')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalTransactions = transactions.length
  const reconciledCount = transactions.filter(t => t.status === 'reconciled').length

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
            <h1 className="text-2xl font-bold text-gray-900">Transacciones Bancarias</h1>
            <p className="text-gray-600 mt-1">
              Historial completo de movimientos bancarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📥 Exportando transacciones bancarias a CSV')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewTransactionModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalTransactions}</div>
              <div className="text-sm text-blue-700">Total Transacciones</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalDeposits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-green-700">Total Ingresos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${totalWithdrawals.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-700">Total Egresos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{reconciledCount}</div>
              <div className="text-sm text-purple-700">Conciliadas</div>
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
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="deposit">Depósitos</option>
                <option value="withdrawal">Retiros</option>
                <option value="transfer">Transferencias</option>
                <option value="fee">Comisiones</option>
                <option value="interest">Intereses</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              >
                <option value="all">Todas las Cuentas</option>
                {uniqueAccounts.map(account => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.account}
                  </option>
                ))}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="pending">Pendientes</option>
                <option value="reconciled">Conciliadas</option>
                <option value="cancelled">Canceladas</option>
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
            <CardTitle>Historial de Transacciones ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transacción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
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
                            Ref: {transaction.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.account}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {transaction.description}
                        </div>
                        {transaction.counterparty && (
                          <div className="text-xs text-gray-500">
                            {transaction.counterparty}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getTypeBadge(transaction.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transaction.category}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        ${transaction.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transaction.status)}
                        {transaction.reconciledDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(transaction.reconciledDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
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
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Transacciones Bancarias</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Registro completo de todos los movimientos bancarios con categorización y estado de conciliación.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Depósitos:</strong> Ingresos por cobros, transferencias recibidas, intereses ganados</li>
                  <li>• <strong>Retiros:</strong> Pagos a proveedores, gastos operativos, dispersión de nómina</li>
                  <li>• <strong>Transferencias:</strong> Movimientos entre cuentas propias</li>
                  <li>• <strong>Comisiones:</strong> Cargos bancarios por servicios y manejo de cuenta</li>
                  <li>• <strong>Categorización:</strong> Clasificación automática para reportes contables</li>
                  <li>• <strong>Conciliación:</strong> Matching automático con estados de cuenta</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Transaction Modal */}
        {showNewTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Nueva Transacción Bancaria
                  </CardTitle>
                  <Button variant="outline" onClick={() => setShowNewTransactionModal(false)}>
                    Cerrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  try {
                    const response = await fetch('/api/banking/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...newTransaction,
                        amount: newTransaction.type === 'withdrawal' ? -Math.abs(newTransaction.amount) : Math.abs(newTransaction.amount)
                      })
                    })
                    if (response.ok) {
                      setShowNewTransactionModal(false)
                      setNewTransaction({
                        accountId: '',
                        type: 'deposit',
                        category: '',
                        description: '',
                        amount: 0,
                        date: new Date().toISOString().split('T')[0],
                        counterparty: '',
                        reference: ''
                      })
                      window.location.reload()
                    } else {
                      alert('Error al crear la transacción')
                    }
                  } catch (error) {
                    console.error('Error:', error)
                    alert('Error al crear la transacción')
                  } finally {
                    setSaving(false)
                  }
                }} className="space-y-6">
                  
                  {/* Account Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Cuenta Bancaria *
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newTransaction.accountId}
                      onChange={(e) => setNewTransaction({ ...newTransaction, accountId: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar cuenta...</option>
                      <option value="ACC-001">Cuenta Principal Operativa - BBVA</option>
                      <option value="ACC-002">Cuenta de Ahorros Empresarial - Santander</option>
                      <option value="ACC-003">Cuenta Nómina - Banorte</option>
                      <option value="ACC-004">Tarjeta de Crédito Corporativa - Amex</option>
                      <option value="ACC-005">Cuenta USD Internacional - Citibanamex</option>
                    </select>
                  </div>

                  {/* Transaction Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Tipo de Transacción *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { value: 'deposit', label: 'Depósito', icon: ArrowDownLeft, color: 'green' },
                        { value: 'withdrawal', label: 'Retiro', icon: ArrowUpRight, color: 'red' },
                        { value: 'transfer', label: 'Transferencia', icon: RefreshCw, color: 'blue' },
                        { value: 'fee', label: 'Comisión', icon: DollarSign, color: 'orange' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewTransaction({ ...newTransaction, type: type.value })}
                          className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 transition ${
                            newTransaction.type === type.value
                              ? `border-${type.color}-500 bg-${type.color}-50`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <type.icon className={`w-5 h-5 ${
                            newTransaction.type === type.value ? `text-${type.color}-600` : 'text-gray-400'
                          }`} />
                          <span className={`text-xs font-medium ${
                            newTransaction.type === type.value ? `text-${type.color}-700` : 'text-gray-600'
                          }`}>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date and Amount Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Fecha *
                      </label>
                      <Input
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Monto *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          value={newTransaction.amount || ''}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Categoría *
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar categoría...</option>
                      {newTransaction.type === 'deposit' && (
                        <>
                          <option value="Cobro Cliente">Cobro de Cliente</option>
                          <option value="Transferencia Recibida">Transferencia Recibida</option>
                          <option value="Intereses">Intereses Ganados</option>
                          <option value="Préstamo">Préstamo Recibido</option>
                          <option value="Reembolso">Reembolso</option>
                          <option value="Otros Ingresos">Otros Ingresos</option>
                        </>
                      )}
                      {newTransaction.type === 'withdrawal' && (
                        <>
                          <option value="Pago Proveedor">Pago a Proveedor</option>
                          <option value="Nómina">Pago de Nómina</option>
                          <option value="Impuestos">Pago de Impuestos</option>
                          <option value="Servicios">Servicios (Luz, Agua, etc.)</option>
                          <option value="Renta">Renta/Alquiler</option>
                          <option value="Gastos Operativos">Gastos Operativos</option>
                          <option value="Otros Gastos">Otros Gastos</option>
                        </>
                      )}
                      {newTransaction.type === 'transfer' && (
                        <>
                          <option value="Transferencia Interna">Transferencia entre Cuentas</option>
                          <option value="Transferencia Externa">Transferencia a Terceros</option>
                        </>
                      )}
                      {newTransaction.type === 'fee' && (
                        <>
                          <option value="Comisión Bancaria">Comisión Bancaria</option>
                          <option value="Mantenimiento">Mantenimiento de Cuenta</option>
                          <option value="Chequera">Costo de Chequera</option>
                          <option value="Otros Cargos">Otros Cargos</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej: Pago factura #123 - Cliente XYZ"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      required
                    />
                  </div>

                  {/* Counterparty and Reference Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Contraparte
                      </label>
                      <Input
                        type="text"
                        placeholder="Nombre del cliente/proveedor"
                        value={newTransaction.counterparty}
                        onChange={(e) => setNewTransaction({ ...newTransaction, counterparty: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Referencia
                      </label>
                      <Input
                        type="text"
                        placeholder="# Factura, # Cheque, etc."
                        value={newTransaction.reference}
                        onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Transaction Summary */}
                  {newTransaction.amount > 0 && (
                    <div className={`p-4 rounded-lg border-2 ${
                      newTransaction.type === 'deposit' ? 'bg-green-50 border-green-200' :
                      newTransaction.type === 'withdrawal' ? 'bg-red-50 border-red-200' :
                      newTransaction.type === 'transfer' ? 'bg-blue-50 border-blue-200' :
                      'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Resumen de Transacción:</span>
                        <span className={`text-xl font-bold ${
                          newTransaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {newTransaction.type === 'deposit' ? '+' : '-'}${newTransaction.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowNewTransactionModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={saving || !newTransaction.accountId || !newTransaction.category || !newTransaction.description || !newTransaction.amount}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Registrar Transacción
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

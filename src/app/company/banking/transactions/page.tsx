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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button>
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
      </div>
    </CompanyTabsLayout>
  )
}

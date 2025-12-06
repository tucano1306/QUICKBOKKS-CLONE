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
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface BankTransaction {
  id: string
  transactionId: string
  date: string
  account: string
  accountId: string
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  category: string
  description: string
  amount: number
  balance: number
  reference?: string
  counterparty?: string
  status: 'completed' | 'pending' | 'reconciled' | 'cancelled' | 'COMPLETED' | 'PENDING' | 'RECONCILED'
  reconciledDate?: string
  bankAccount?: {
    id: string
    accountName: string
    bankName: string
  }
}

interface BankAccount {
  id: string
  accountName: string
  bankName: string
  currentBalance: number
}

export default function BankTransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('month')
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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

  // Fetch bank accounts
  const fetchBankAccounts = useCallback(async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/banking/accounts?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setBankAccounts(data.accounts || data || [])
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }, [activeCompany])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      let url = `/api/banking/transactions?limit=100`
      
      if (filterAccount !== 'all') {
        url += `&bankAccountId=${filterAccount}`
      }
      
      // Add date range filter
      const now = new Date()
      let startDate: Date | null = null
      
      if (dateRange === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0))
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7))
      } else if (dateRange === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1))
      } else if (dateRange === 'quarter') {
        startDate = new Date(now.setMonth(now.getMonth() - 3))
      } else if (dateRange === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
      }
      
      if (startDate) {
        url += `&startDate=${startDate.toISOString()}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const txns = data.transactions || data || []
        
        // Map API response to component format
        const mappedTxns = txns.map((t: any) => ({
          id: t.id,
          transactionId: t.transactionId || t.id,
          date: t.date,
          account: t.bankAccount?.accountName || 'Cuenta',
          accountId: t.bankAccountId || t.bankAccount?.id,
          type: (t.type || 'deposit').toLowerCase(),
          category: t.category || 'General',
          description: t.description || t.memo || '',
          amount: t.amount,
          balance: t.runningBalance || t.balance || 0,
          reference: t.reference,
          counterparty: t.payee || t.counterparty,
          status: (t.status || 'completed').toLowerCase(),
          reconciledDate: t.reconciledDate,
          bankAccount: t.bankAccount
        }))
        
        setTransactions(mappedTxns)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setMessage({ type: 'error', text: 'Error al cargar transacciones' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany, filterAccount, dateRange])

  useEffect(() => {
    if (activeCompany) {
      fetchBankAccounts()
      fetchTransactions()
    }
  }, [activeCompany, fetchBankAccounts, fetchTransactions])

  // Create new transaction
  const handleCreateTransaction = async () => {
    if (!activeCompany || !newTransaction.accountId) {
      setMessage({ type: 'error', text: 'Seleccione una cuenta bancaria' })
      return
    }
    
    if (!newTransaction.description || !newTransaction.amount) {
      setMessage({ type: 'error', text: 'Complete todos los campos requeridos' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/banking/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: newTransaction.accountId,
          type: newTransaction.type.toUpperCase(),
          description: newTransaction.description,
          amount: newTransaction.type === 'withdrawal' ? -Math.abs(newTransaction.amount) : Math.abs(newTransaction.amount),
          date: newTransaction.date,
          category: newTransaction.category,
          payee: newTransaction.counterparty,
          reference: newTransaction.reference,
          status: 'PENDING'
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Transacción creada exitosamente' })
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
        fetchTransactions()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear transacción' })
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const getTypeBadge = (type: string) => {
    const typeLower = type.toLowerCase()
    switch (typeLower) {
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
    const statusLower = status.toLowerCase()
    switch (statusLower) {
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
    const trxType = trx.type.toLowerCase()
    const trxStatus = trx.status.toLowerCase()
    if (filterType !== 'all' && trxType !== filterType) return false
    if (filterAccount !== 'all' && trx.accountId !== filterAccount) return false
    if (filterStatus !== 'all' && trxStatus !== filterStatus) return false
    if (searchTerm && !trx.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trx.counterparty?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    return true
  })

  const uniqueAccounts = bankAccounts.length > 0 
    ? bankAccounts 
    : Array.from(new Set(transactions.map(t => t.account)))
        .map(name => transactions.find(t => t.account === name)!)
        .filter(Boolean)

  const totalDeposits = transactions
    .filter(t => {
      const type = t.type.toLowerCase()
      return type === 'deposit' || type === 'interest'
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalWithdrawals = transactions
    .filter(t => {
      const type = t.type.toLowerCase()
      return type === 'withdrawal' || type === 'fee'
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalTransactions = transactions.length
  const reconciledCount = transactions.filter(t => t.status.toLowerCase() === 'reconciled').length

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
            <Button variant="outline" onClick={() => fetchTransactions()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => {
              const csv = 'ID,Fecha,Cuenta,Tipo,Descripción,Monto,Estado\n' +
                filteredTransactions.map(t => 
                  `${t.transactionId},${t.date},${t.account},${t.type},"${t.description}",${t.amount},${t.status}`
                ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `transacciones-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              setMessage({ type: 'success', text: 'Archivo exportado exitosamente' })
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewTransactionModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
            <button 
              onClick={() => setMessage(null)} 
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

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
                      setMessage({ type: 'error', text: 'Error al crear la transacción' })
                      setTimeout(() => setMessage(null), 3000)
                    }
                  } catch (error) {
                    console.error('Error:', error)
                    setMessage({ type: 'error', text: 'Error al crear la transacción' })
                    setTimeout(() => setMessage(null), 3000)
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
                          type="text"
                          placeholder="0.00"
                          className="amount-input pl-8"
                          value={newTransaction.amount || ''}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 })}
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

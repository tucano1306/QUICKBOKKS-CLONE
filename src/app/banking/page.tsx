'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import QuickAccessBar from '@/components/ui/quick-access-bar'
import { 
  Building2, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Trash2, 
  LayoutDashboard, 
  Receipt, 
  ArrowRightLeft, 
  PieChart, 
  Plus,
  Eye,
  Edit,
  X,
  Loader2,
  Save,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Upload,
  Download,
  Search,
  Filter,
  Wallet,
  PiggyBank
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber?: string
  bankName?: string
  institutionName?: string
  accountType: string
  currency: string
  balance: number
  status: string
  isPrimary: boolean
  mask?: string
  lastSyncedAt?: string
  createdAt: string
  _count?: {
    bankTransactions: number
    reconciliations: number
  }
}

interface Transaction {
  id: string
  bankAccountId: string
  date: string
  name: string
  description?: string
  amount: number
  debit: number
  credit: number
  reconciled: boolean
  merchantName?: string
  category?: string[]
  bankAccount?: {
    id: string
    accountName: string
    bankName?: string
  }
}

export default function BankingPage() {
  const { status } = useSession()
  const router = useRouter()
  
  // States
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'transfers' | 'reconciliation'>('accounts')
  
  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Form states
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    accountType: 'CHECKING',
    currency: 'USD',
    balance: 0,
    notes: '',
    isPrimary: false
  })
  
  const [transactionForm, setTransactionForm] = useState({
    bankAccountId: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    description: '',
    amount: 0,
    type: 'expense',
    category: '',
    merchantName: '',
    reference: '',
    notes: ''
  })

  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterReconciled, setFilterReconciled] = useState('all')

  const bankingLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
    { label: 'Cuentas', href: '/banking', icon: Building2, color: 'purple' },
    { label: 'Transacciones', href: '/company/banking/transactions', icon: Receipt, color: 'green' },
    { label: 'Conciliación', href: '/company/banking/reconciliation', icon: ArrowRightLeft, color: 'orange' },
    { label: 'Reportes', href: '/reports', icon: PieChart, color: 'indigo' }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadAccounts(), loadTransactions()])
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/banking/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadTransactions = async (accountId?: string) => {
    try {
      let url = '/api/banking/transactions?limit=100'
      if (accountId) url += `&bankAccountId=${accountId}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  // Account CRUD
  const openAccountModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account)
      setAccountForm({
        accountName: account.accountName,
        accountNumber: account.accountNumber || '',
        bankName: account.bankName || account.institutionName || '',
        accountType: account.accountType,
        currency: account.currency,
        balance: account.balance,
        notes: '',
        isPrimary: account.isPrimary
      })
    } else {
      setEditingAccount(null)
      setAccountForm({
        accountName: '',
        accountNumber: '',
        bankName: '',
        accountType: 'CHECKING',
        currency: 'USD',
        balance: 0,
        notes: '',
        isPrimary: false
      })
    }
    setShowAccountModal(true)
  }

  const saveAccount = async () => {
    if (!accountForm.accountName || !accountForm.bankName) {
      alert('Nombre de cuenta y banco son requeridos')
      return
    }

    setProcessing(true)
    try {
      const url = editingAccount 
        ? `/api/banking/accounts/${editingAccount.id}`
        : '/api/banking/accounts'
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      })

      if (response.ok) {
        alert(editingAccount ? 'Cuenta actualizada exitosamente' : 'Cuenta creada exitosamente')
        setShowAccountModal(false)
        loadAccounts()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar cuenta')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Error al guardar cuenta')
    } finally {
      setProcessing(false)
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta? Se eliminarán todas las transacciones asociadas.')) {
      return
    }

    try {
      const response = await fetch(`/api/banking/accounts/${accountId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Cuenta eliminada exitosamente')
        loadAccounts()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar cuenta')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Error al eliminar cuenta')
    }
  }

  // Transaction CRUD
  const openTransactionModal = (type: 'income' | 'expense' = 'expense') => {
    setTransactionForm({
      bankAccountId: selectedAccount?.id || accounts[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      name: '',
      description: '',
      amount: 0,
      type,
      category: '',
      merchantName: '',
      reference: '',
      notes: ''
    })
    setShowTransactionModal(true)
  }

  const saveTransaction = async () => {
    if (!transactionForm.bankAccountId || !transactionForm.name || !transactionForm.amount) {
      alert('Cuenta, nombre y monto son requeridos')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/banking/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionForm)
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Transacción registrada. Nuevo balance: $${data.newBalance?.toFixed(2)}`)
        setShowTransactionModal(false)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar transacción')
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Error al guardar transacción')
    } finally {
      setProcessing(false)
    }
  }

  // Transfer
  const openTransferModal = () => {
    setTransferForm({
      fromAccountId: accounts[0]?.id || '',
      toAccountId: accounts[1]?.id || '',
      amount: 0,
      description: 'Transferencia entre cuentas',
      date: new Date().toISOString().split('T')[0]
    })
    setShowTransferModal(true)
  }

  const executeTransfer = async () => {
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      alert('Seleccione cuentas y monto')
      return
    }

    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('Las cuentas de origen y destino deben ser diferentes')
      return
    }

    setProcessing(true)
    try {
      // Crear egreso en cuenta origen
      await fetch('/api/banking/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: transferForm.fromAccountId,
          date: transferForm.date,
          name: `Transferencia a ${accounts.find(a => a.id === transferForm.toAccountId)?.accountName}`,
          description: transferForm.description,
          amount: transferForm.amount,
          type: 'expense',
          category: 'Transferencia'
        })
      })

      // Crear ingreso en cuenta destino
      await fetch('/api/banking/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: transferForm.toAccountId,
          date: transferForm.date,
          name: `Transferencia desde ${accounts.find(a => a.id === transferForm.fromAccountId)?.accountName}`,
          description: transferForm.description,
          amount: transferForm.amount,
          type: 'income',
          category: 'Transferencia'
        })
      })

      alert('Transferencia realizada exitosamente')
      setShowTransferModal(false)
      loadData()
    } catch (error) {
      console.error('Error executing transfer:', error)
      alert('Error al realizar transferencia')
    } finally {
      setProcessing(false)
    }
  }

  // Export
  const exportTransactions = () => {
    const headers = ['Fecha', 'Cuenta', 'Descripción', 'Tipo', 'Monto', 'Conciliado']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('es-MX'),
      t.bankAccount?.accountName || '',
      t.name,
      t.amount > 0 ? 'Ingreso' : 'Egreso',
      Math.abs(t.amount).toFixed(2),
      t.reconciled ? 'Sí' : 'No'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transacciones-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Filtered data
  const filteredTransactions = transactions.filter(t => {
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filterType === 'income' && t.amount <= 0) return false
    if (filterType === 'expense' && t.amount >= 0) return false
    if (filterReconciled === 'true' && !t.reconciled) return false
    if (filterReconciled === 'false' && t.reconciled) return false
    return true
  })

  // Stats
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const pendingReconciliation = transactions.filter(t => !t.reconciled).length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (status === 'loading' || loading) {
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
        <QuickAccessBar title="Navegación Banca" links={bankingLinks} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Administra cuentas, transacciones y conciliación bancaria
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportTransactions}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => openAccountModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-600">{accounts.length}</Badge>
              </div>
              <div className="text-3xl font-bold text-blue-900">{formatCurrency(totalBalance)}</div>
              <div className="text-sm text-blue-700">Balance Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowDownLeft className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{formatCurrency(totalIncome)}</div>
              <div className="text-sm text-green-700">Ingresos del Período</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowUpRight className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">{formatCurrency(totalExpenses)}</div>
              <div className="text-sm text-red-700">Egresos del Período</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
                <Badge className="bg-orange-600">{pendingReconciliation}</Badge>
              </div>
              <div className="text-3xl font-bold text-orange-900">{pendingReconciliation}</div>
              <div className="text-sm text-orange-700">Pendientes Conciliación</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b pb-2">
          {[
            { id: 'accounts', label: 'Cuentas', icon: Building2 },
            { id: 'transactions', label: 'Transacciones', icon: Receipt },
            { id: 'transfers', label: 'Transferencias', icon: ArrowRightLeft },
            { id: 'reconciliation', label: 'Conciliación', icon: CheckCircle2 }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content - Accounts */}
        {activeTab === 'accounts' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Cuentas Bancarias ({accounts.length})
                </CardTitle>
                <Button onClick={() => openAccountModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Cuenta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700">No hay cuentas bancarias</h3>
                  <p className="text-gray-500 mb-4">Agrega tu primera cuenta para comenzar</p>
                  <Button onClick={() => openAccountModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Cuenta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map(account => (
                    <div
                      key={account.id}
                      className={`border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow ${
                        account.isPrimary ? 'border-blue-300 bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${
                          account.accountType === 'CHECKING' ? 'bg-blue-100' :
                          account.accountType === 'SAVINGS' ? 'bg-green-100' :
                          'bg-purple-100'
                        }`}>
                          {account.accountType === 'CHECKING' ? (
                            <Wallet className="w-6 h-6 text-blue-600" />
                          ) : account.accountType === 'SAVINGS' ? (
                            <PiggyBank className="w-6 h-6 text-green-600" />
                          ) : (
                            <CreditCard className="w-6 h-6 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{account.accountName}</h4>
                            {account.isPrimary && (
                              <Badge className="bg-blue-600 text-xs">Principal</Badge>
                            )}
                            <Badge variant="outline" className={
                              account.status === 'ACTIVE' ? 'text-green-600 border-green-300' : 'text-gray-500'
                            }>
                              {account.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {account.bankName || account.institutionName} 
                            {account.mask && ` ••••${account.mask}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {account._count?.bankTransactions || 0} transacciones
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(account.balance)}
                          </p>
                          <p className="text-xs text-gray-500">{account.currency}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedAccount(account)
                            setActiveTab('transactions')
                          }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAccountModal(account)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteAccount(account.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab Content - Transactions */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Transacciones
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openTransactionModal('income')}>
                    <ArrowDownLeft className="w-4 h-4 mr-2 text-green-600" />
                    Ingreso
                  </Button>
                  <Button onClick={() => openTransactionModal('expense')}>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Egreso
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar transacción..."
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
                  <option value="all">Todos</option>
                  <option value="income">Ingresos</option>
                  <option value="expense">Egresos</option>
                </select>
                <select
                  value={filterReconciled}
                  onChange={(e) => setFilterReconciled(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">Todos</option>
                  <option value="true">Conciliados</option>
                  <option value="false">Pendientes</option>
                </select>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Ingreso</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Egreso</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No hay transacciones registradas
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(transaction => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {new Date(transaction.date).toLocaleDateString('es-MX')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.bankAccount?.accountName || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm">{transaction.name}</div>
                            {transaction.description && (
                              <div className="text-xs text-gray-500">{transaction.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {transaction.amount > 0 && (
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(transaction.amount)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {transaction.amount < 0 && (
                              <span className="text-red-600 font-semibold">
                                {formatCurrency(Math.abs(transaction.amount))}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {transaction.reconciled ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Conciliado
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Content - Transfers */}
        {activeTab === 'transfers' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Transferencias entre Cuentas
                </CardTitle>
                <Button onClick={openTransferModal} disabled={accounts.length < 2}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Transferencia
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length < 2 ? (
                <div className="text-center py-8">
                  <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700">Se requieren al menos 2 cuentas</h3>
                  <p className="text-gray-500 mb-4">
                    Agrega más cuentas bancarias para poder realizar transferencias
                  </p>
                  <Button onClick={() => openAccountModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Cuenta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {accounts.map(account => (
                      <Card key={account.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <h4 className="font-semibold">{account.accountName}</h4>
                          <p className="text-sm text-gray-600">{account.bankName}</p>
                          <p className="text-2xl font-bold text-blue-600 mt-2">
                            {formatCurrency(account.balance)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button onClick={openTransferModal} className="w-full">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Realizar Transferencia
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab Content - Reconciliation */}
        {activeTab === 'reconciliation' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Conciliación Bancaria
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Conciliación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Estado de Cuentas</h3>
                  {accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                      <div>
                        <p className="font-medium">{account.accountName}</p>
                        <p className="text-sm text-gray-500">{account.bankName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(account.balance)}</p>
                        <p className="text-xs text-gray-500">
                          {account._count?.bankTransactions || 0} transacciones sin conciliar
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Cuadrar Saldos</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span>Saldo en Sistema:</span>
                      <span className="font-bold">{formatCurrency(totalBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span>Saldo en Estado de Cuenta:</span>
                      <Input
                        type="number"
                        placeholder="Ingrese saldo bancario"
                        className="w-40 text-right"
                      />
                    </div>
                    <hr className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Diferencia:</span>
                      <span className="font-bold text-green-600">$0.00</span>
                    </div>
                    <Button className="w-full mt-4">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Cuadrar Saldos
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">
                  {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}
                </h2>
                <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de la Cuenta *</label>
                  <Input
                    value={accountForm.accountName}
                    onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                    placeholder="Ej: Cuenta Principal, Nómina, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del Banco *</label>
                  <Input
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="Ej: BBVA, Santander, Chase, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Número de Cuenta</label>
                    <Input
                      value={accountForm.accountNumber}
                      onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                      placeholder="Últimos 4 dígitos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Cuenta</label>
                    <select
                      value={accountForm.accountType}
                      onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="CHECKING">Cuenta Corriente</option>
                      <option value="SAVINGS">Cuenta de Ahorro</option>
                      <option value="CREDIT">Tarjeta de Crédito</option>
                      <option value="INVESTMENT">Inversión</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Moneda</label>
                    <select
                      value={accountForm.currency}
                      onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="USD">USD - Dólar</option>
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance Inicial</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={accountForm.isPrimary}
                    onChange={(e) => setAccountForm({ ...accountForm, isPrimary: e.target.checked })}
                  />
                  <label htmlFor="isPrimary" className="text-sm">Cuenta Principal</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowAccountModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveAccount} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {editingAccount ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">
                  {transactionForm.type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                </h2>
                <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cuenta *</label>
                  <select
                    value={transactionForm.bankAccountId}
                    onChange={(e) => setTransactionForm({ ...transactionForm, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha *</label>
                    <Input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monto *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción *</label>
                  <Input
                    value={transactionForm.name}
                    onChange={(e) => setTransactionForm({ ...transactionForm, name: e.target.value })}
                    placeholder="Descripción de la transacción"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <select
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccionar categoría...</option>
                    <option value="Ventas">Ventas</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Nómina">Nómina</option>
                    <option value="Proveedores">Proveedores</option>
                    <option value="Servicios Públicos">Servicios Públicos</option>
                    <option value="Alquiler">Alquiler</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Referencia</label>
                  <Input
                    value={transactionForm.reference}
                    onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                    placeholder="Número de cheque, factura, etc."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={saveTransaction} 
                  disabled={processing}
                  className={transactionForm.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {transactionForm.type === 'income' ? (
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                  )}
                  Registrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">Transferencia entre Cuentas</h2>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cuenta Origen *</label>
                  <select
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-center">
                  <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cuenta Destino *</label>
                  <select
                    value={transferForm.toAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {accounts.filter(a => a.id !== transferForm.fromAccountId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha</label>
                    <Input
                      type="date"
                      value={transferForm.date}
                      onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monto *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <Input
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="Motivo de la transferencia"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={executeTransfer} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

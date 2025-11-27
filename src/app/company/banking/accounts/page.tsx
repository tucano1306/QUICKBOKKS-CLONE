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
  Building2,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  CreditCard,
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react'

interface BankAccount {
  id: string
  accountNumber: string
  accountName: string
  bank: string
  bankName?: string
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'CHECKING' | 'SAVINGS' | 'CREDIT'
  currency: string
  balance: number
  currentBalance?: number
  availableBalance: number
  lastReconciled?: string
  status: 'active' | 'inactive' | 'frozen' | 'ACTIVE' | 'INACTIVE'
  openingDate: string
  interestRate?: number
  creditLimit?: number
  routing?: string
  swift?: string
  isPrimary?: boolean
}

export default function BankAccountsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newAccount, setNewAccount] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    accountType: 'CHECKING',
    currency: 'MXN',
    currentBalance: 0,
    routing: '',
    swift: '',
    isPrimary: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Fetch bank accounts from API
  const fetchBankAccounts = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/banking/accounts?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const accounts = data.accounts || data || []
        // Map API response to component format
        const mappedAccounts = accounts.map((acc: any) => ({
          id: acc.id,
          accountNumber: acc.accountNumber || acc.id.slice(-8),
          accountName: acc.accountName || acc.name,
          bank: acc.bankName || acc.bank || 'Banco',
          bankName: acc.bankName,
          type: (acc.accountType || acc.type || 'checking').toLowerCase(),
          currency: acc.currency || 'MXN',
          balance: acc.currentBalance || acc.balance || 0,
          currentBalance: acc.currentBalance || acc.balance || 0,
          availableBalance: acc.availableBalance || acc.currentBalance || acc.balance || 0,
          lastReconciled: acc.lastReconciled,
          status: (acc.status || 'active').toLowerCase(),
          openingDate: acc.createdAt || new Date().toISOString(),
          isPrimary: acc.isPrimary
        }))
        setBankAccounts(mappedAccounts)
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      setMessage({ type: 'error', text: 'Error al cargar cuentas bancarias' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (activeCompany) {
      fetchBankAccounts()
    }
  }, [activeCompany, fetchBankAccounts])

  // Create new bank account
  const handleCreateAccount = async () => {
    if (!activeCompany || !newAccount.accountName || !newAccount.bankName) {
      setMessage({ type: 'error', text: 'Complete todos los campos requeridos' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          companyId: activeCompany.id
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cuenta bancaria creada exitosamente' })
        setShowNewAccountModal(false)
        setNewAccount({
          accountName: '',
          bankName: '',
          accountNumber: '',
          accountType: 'CHECKING',
          currency: 'MXN',
          currentBalance: 0,
          routing: '',
          swift: '',
          isPrimary: false
        })
        fetchBankAccounts()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear cuenta' })
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  // Delete bank account
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta bancaria?')) return

    try {
      const response = await fetch(`/api/banking/accounts?id=${accountId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cuenta eliminada exitosamente' })
        fetchBankAccounts()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al eliminar cuenta' })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    }
  }

  const getAccountTypeBadge = (type: string) => {
    const typeLower = type.toLowerCase()
    switch (typeLower) {
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Cuenta Corriente
        </Badge>
      case 'savings':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Ahorros
        </Badge>
      case 'credit':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Crédito
        </Badge>
      case 'investment':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Inversión
        </Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Activa
        </Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Inactiva
        </Badge>
      case 'frozen':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Congelada
        </Badge>
      default:
        return null
    }
  }

  const filteredAccounts = bankAccounts.filter(acc => {
    const accType = acc.type.toLowerCase()
    const accStatus = acc.status.toLowerCase()
    if (filterType !== 'all' && accType !== filterType) return false
    if (filterStatus !== 'all' && accStatus !== filterStatus) return false
    if (searchTerm && !acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !acc.bank.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !acc.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalBalance = bankAccounts
    .filter(acc => acc.status.toLowerCase() === 'active')
    .reduce((sum, acc) => {
      if (acc.currency === 'MXN') return sum + acc.balance
      if (acc.currency === 'USD') return sum + (acc.balance * 17.5)
      return sum
    }, 0)

  const totalAccounts = bankAccounts.filter(acc => acc.status.toLowerCase() === 'active').length
  const totalAvailable = bankAccounts
    .filter(acc => acc.status.toLowerCase() === 'active')
    .reduce((sum, acc) => {
      if (acc.currency === 'MXN') return sum + acc.availableBalance
      if (acc.currency === 'USD') return sum + (acc.availableBalance * 17.5)
      return sum
    }, 0)

  const creditUsed = bankAccounts
    .filter(acc => acc.type.toLowerCase() === 'credit' && acc.status.toLowerCase() === 'active')
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
            <p className="text-gray-600 mt-1">
              Administra tus cuentas bancarias y saldos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchBankAccounts()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => {
              const csv = 'Cuenta,Banco,Tipo,Moneda,Saldo,Estado\n' +
                filteredAccounts.map(a => 
                  `"${a.accountName}","${a.bank}",${a.type},${a.currency},${a.balance},${a.status}`
                ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `cuentas-bancarias-${new Date().toISOString().split('T')[0]}.csv`
              link.click()
              setMessage({ type: 'success', text: 'Archivo exportado exitosamente' })
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewAccountModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
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
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalAccounts}</div>
              <div className="text-sm text-blue-700">Cuentas Activas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-green-700">Saldo Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalAvailable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">Saldo Disponible</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${creditUsed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-700">Crédito Utilizado</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar cuentas..."
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
                <option value="checking">Cuenta Corriente</option>
                <option value="savings">Ahorros</option>
                <option value="credit">Crédito</option>
                <option value="investment">Inversión</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="frozen">Congeladas</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${
                      account.type === 'checking' ? 'bg-blue-100' :
                      account.type === 'savings' ? 'bg-green-100' :
                      account.type === 'credit' ? 'bg-red-100' :
                      'bg-purple-100'
                    }`}>
                      {account.type === 'credit' ? (
                        <CreditCard className={`w-6 h-6 ${
                          account.type === 'credit' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      ) : (
                        <Building2 className={`w-6 h-6 ${
                          account.type === 'savings' ? 'text-green-600' :
                          account.type === 'investment' ? 'text-purple-600' :
                          'text-blue-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
                      <p className="text-sm text-gray-600">{account.bank}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{account.accountNumber}</p>
                    </div>
                  </div>
                  {getStatusBadge(account.status)}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tipo de Cuenta:</span>
                    {getAccountTypeBadge(account.type)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Moneda:</span>
                    <span className="text-sm font-semibold text-gray-900">{account.currency}</span>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Saldo Actual:</span>
                      <span className={`text-xl font-bold ${
                        account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {account.currency} ${Math.abs(account.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Saldo Disponible:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {account.currency} ${account.availableBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {account.creditLimit && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-600">Límite de Crédito:</span>
                        <span className="text-sm text-gray-700">
                          {account.currency} ${account.creditLimit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {account.interestRate && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-600">Tasa de Interés:</span>
                        <span className="text-sm font-semibold text-purple-600">
                          {account.interestRate}% anual
                        </span>
                      </div>
                    )}
                  </div>

                  {account.lastReconciled && (
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                      Última conciliación: {new Date(account.lastReconciled).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Movimientos
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Administración de Cuentas Bancarias</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Gestiona todas tus cuentas bancarias desde un solo lugar con control total de saldos y movimientos.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Cuentas Corrientes:</strong> Para operaciones diarias, pagos y cobros</li>
                  <li>• <strong>Cuentas de Ahorro:</strong> Con rendimientos por intereses</li>
                  <li>• <strong>Tarjetas de Crédito:</strong> Control de saldo utilizado y límite disponible</li>
                  <li>• <strong>Inversiones:</strong> Seguimiento de fondos y rendimientos</li>
                  <li>• <strong>Multimoneda:</strong> Soporte para MXN, USD y más divisas</li>
                  <li>• <strong>Conciliación bancaria:</strong> Reconcilia automáticamente con estados de cuenta</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connect Bank Modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Conectar Banco</CardTitle>
                  <Button variant="outline" onClick={() => setShowBankModal(false)}>Cerrar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Selecciona tu institución bancaria para conectar tu cuenta</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">BBVA</div>
                      <div className="text-xs text-gray-500">Conexión Segura</div>
                    </button>
                    <button className="p-6 border-2 rounded-lg hover:border-red-500 hover:bg-red-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">Santander</div>
                      <div className="text-xs text-gray-500">Conexión Segura</div>
                    </button>
                    <button className="p-6 border-2 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">Banorte</div>
                      <div className="text-xs text-gray-500">Conexión Segura</div>
                    </button>
                    <button className="p-6 border-2 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">Citibanamex</div>
                      <div className="text-xs text-gray-500">Conexión Segura</div>
                    </button>
                    <button className="p-6 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">HSBC</div>
                      <div className="text-xs text-gray-500">Conexión Segura</div>
                    </button>
                    <button className="p-6 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition">
                      <div className="text-3xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">American Express</div>
                      <div className="text-xs text-gray-500">Tarjetas de Crédito</div>
                    </button>
                  </div>
                  <div className="pt-4 border-t bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Seguridad Bancaria
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 🔒 Encriptación SSL 256-bit</li>
                      <li>• 🚫 No almacenamos credenciales</li>
                      <li>• ✅ Conexión API oficial del banco</li>
                      <li>• 🔐 OAuth 2.0 Authentication</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* New Account Modal */}
        {showNewAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Nueva Cuenta Bancaria
                  </CardTitle>
                  <Button variant="outline" onClick={() => setShowNewAccountModal(false)}>
                    Cerrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  try {
                    const response = await fetch('/api/banking/accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newAccount)
                    })
                    if (response.ok) {
                      setShowNewAccountModal(false)
                      setNewAccount({
                        accountName: '',
                        bank: '',
                        accountNumber: '',
                        type: 'checking',
                        currency: 'MXN',
                        balance: 0,
                        routing: '',
                        swift: ''
                      })
                      window.location.reload()
                    } else {
                      setMessage({ type: 'error', text: 'Error al crear la cuenta' })
                      setTimeout(() => setMessage(null), 3000)
                    }
                  } catch (error) {
                    console.error('Error:', error)
                    setMessage({ type: 'error', text: 'Error al crear la cuenta' })
                    setTimeout(() => setMessage(null), 3000)
                  } finally {
                    setSaving(false)
                  }
                }} className="space-y-6">
                  {/* Account Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre de la Cuenta *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej: Cuenta Principal Operativa"
                      value={newAccount.accountName}
                      onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                      required
                    />
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre del Banco *
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newAccount.bank}
                      onChange={(e) => setNewAccount({ ...newAccount, bank: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar banco...</option>
                      <option value="BBVA México">BBVA México</option>
                      <option value="Banco Santander">Banco Santander</option>
                      <option value="Banorte">Banorte</option>
                      <option value="Citibanamex">Citibanamex</option>
                      <option value="HSBC México">HSBC México</option>
                      <option value="Scotiabank">Scotiabank</option>
                      <option value="Banco Azteca">Banco Azteca</option>
                      <option value="Inbursa">Inbursa</option>
                      <option value="BanCoppel">BanCoppel</option>
                      <option value="American Express">American Express</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  {/* Account Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Número de Cuenta / CLABE *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej: 012180001234567890"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                      required
                    />
                  </div>

                  {/* Account Type and Currency Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Tipo de Cuenta *
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newAccount.type}
                        onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                        required
                      >
                        <option value="checking">Cuenta Corriente</option>
                        <option value="savings">Cuenta de Ahorros</option>
                        <option value="credit">Tarjeta de Crédito</option>
                        <option value="investment">Inversión</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Moneda *
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newAccount.currency}
                        onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                        required
                      >
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - Libra Esterlina</option>
                      </select>
                    </div>
                  </div>

                  {/* Initial Balance */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Saldo Inicial
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        value={newAccount.balance || ''}
                        onChange={(e) => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {newAccount.type === 'credit' ? 'Para tarjetas de crédito, ingresa el saldo adeudado como número positivo' : 'Ingresa el saldo actual de la cuenta'}
                    </p>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Número de Ruta (Opcional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 012180015"
                        value={newAccount.routing}
                        onChange={(e) => setNewAccount({ ...newAccount, routing: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Código SWIFT (Opcional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: BCMRMXMMPYM"
                        value={newAccount.swift}
                        onChange={(e) => setNewAccount({ ...newAccount, swift: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Información de la Cuenta</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Al crear una cuenta bancaria, podrás registrar transacciones, realizar conciliaciones 
                          y mantener un seguimiento de tus saldos. Asegúrate de ingresar el número de cuenta correcto.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowNewAccountModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={saving || !newAccount.accountName || !newAccount.bank || !newAccount.accountNumber}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Cuenta
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

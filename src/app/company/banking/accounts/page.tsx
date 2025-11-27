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
  Link as LinkIcon
} from 'lucide-react'

interface BankAccount {
  id: string
  accountNumber: string
  accountName: string
  bank: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  currency: string
  balance: number
  availableBalance: number
  lastReconciled?: string
  status: 'active' | 'inactive' | 'frozen'
  openingDate: string
  interestRate?: number
  creditLimit?: number
  routing?: string
  swift?: string
}

export default function BankAccountsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showBankModal, setShowBankModal] = useState(false)
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [newAccount, setNewAccount] = useState({
    accountName: '',
    bank: '',
    accountNumber: '',
    type: 'checking',
    currency: 'MXN',
    balance: 0,
    routing: '',
    swift: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const bankAccounts: BankAccount[] = [
    {
      id: 'ACC-001',
      accountNumber: '4152-3138-7856-4521',
      accountName: 'Cuenta Principal Operativa',
      bank: 'BBVA México',
      type: 'checking',
      currency: 'MXN',
      balance: 1250000,
      availableBalance: 1248500,
      lastReconciled: '2025-11-20',
      status: 'active',
      openingDate: '2024-01-15',
      routing: '012180015',
      swift: 'BCMRMXMMPYM'
    },
    {
      id: 'ACC-002',
      accountNumber: '0128-4567-8901-2345',
      accountName: 'Cuenta de Ahorros Empresarial',
      bank: 'Banco Santander',
      type: 'savings',
      currency: 'MXN',
      balance: 850000,
      availableBalance: 850000,
      lastReconciled: '2025-11-18',
      status: 'active',
      openingDate: '2024-03-20',
      interestRate: 4.5,
      swift: 'BMSXMXMMPYM'
    },
    {
      id: 'ACC-003',
      accountNumber: '5467-2319-4532-8876',
      accountName: 'Cuenta Nómina',
      bank: 'Banorte',
      type: 'checking',
      currency: 'MXN',
      balance: 450000,
      availableBalance: 450000,
      lastReconciled: '2025-11-22',
      status: 'active',
      openingDate: '2024-01-15',
      routing: '072180002',
      swift: 'MENOMXMTXXX'
    },
    {
      id: 'ACC-004',
      accountNumber: '4539-9821-3456-7890',
      accountName: 'Tarjeta de Crédito Corporativa',
      bank: 'American Express',
      type: 'credit',
      currency: 'MXN',
      balance: -125000,
      availableBalance: 375000,
      lastReconciled: '2025-11-15',
      status: 'active',
      openingDate: '2024-06-10',
      creditLimit: 500000,
      interestRate: 24.9
    },
    {
      id: 'ACC-005',
      accountNumber: 'USD-2468-1357-9024',
      accountName: 'Cuenta USD Internacional',
      bank: 'Citibanamex',
      type: 'checking',
      currency: 'USD',
      balance: 45000,
      availableBalance: 43500,
      lastReconciled: '2025-11-10',
      status: 'active',
      openingDate: '2024-08-05',
      routing: '021000089',
      swift: 'BNMXMXMMXXX'
    },
    {
      id: 'ACC-006',
      accountNumber: '7821-4563-9087-1234',
      accountName: 'Fondo de Inversión',
      bank: 'GBM+ Casa de Bolsa',
      type: 'investment',
      currency: 'MXN',
      balance: 2500000,
      availableBalance: 2500000,
      status: 'active',
      openingDate: '2024-02-28',
      interestRate: 11.2
    },
    {
      id: 'ACC-007',
      accountNumber: '3456-7890-1234-5678',
      accountName: 'Cuenta Fiscal - Impuestos',
      bank: 'HSBC México',
      type: 'checking',
      currency: 'MXN',
      balance: 350000,
      availableBalance: 350000,
      lastReconciled: '2025-11-20',
      status: 'active',
      openingDate: '2024-01-15',
      routing: '021180001',
      swift: 'BIMEMXMMXXX'
    },
    {
      id: 'ACC-008',
      accountNumber: '9876-5432-1098-7654',
      accountName: 'Cuenta Inactiva - Banamex',
      bank: 'Citibanamex',
      type: 'savings',
      currency: 'MXN',
      balance: 25000,
      availableBalance: 25000,
      lastReconciled: '2025-09-30',
      status: 'inactive',
      openingDate: '2023-05-12',
      interestRate: 3.0
    }
  ]

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
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
    switch (status) {
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
    if (filterType !== 'all' && acc.type !== filterType) return false
    if (filterStatus !== 'all' && acc.status !== filterStatus) return false
    if (searchTerm && !acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !acc.bank.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !acc.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalBalance = bankAccounts
    .filter(acc => acc.status === 'active')
    .reduce((sum, acc) => {
      if (acc.currency === 'MXN') return sum + acc.balance
      if (acc.currency === 'USD') return sum + (acc.balance * 17.5) // Exchange rate approximation
      return sum
    }, 0)

  const totalAccounts = bankAccounts.filter(acc => acc.status === 'active').length
  const totalAvailable = bankAccounts
    .filter(acc => acc.status === 'active')
    .reduce((sum, acc) => {
      if (acc.currency === 'MXN') return sum + acc.availableBalance
      if (acc.currency === 'USD') return sum + (acc.availableBalance * 17.5)
      return sum
    }, 0)

  const creditUsed = bankAccounts
    .filter(acc => acc.type === 'credit' && acc.status === 'active')
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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setShowBankModal(true)}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Conectar Banco
            </Button>
            <Button onClick={() => setShowNewAccountModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </div>

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
                      alert('Error al crear la cuenta')
                    }
                  } catch (error) {
                    console.error('Error:', error)
                    alert('Error al crear la cuenta')
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

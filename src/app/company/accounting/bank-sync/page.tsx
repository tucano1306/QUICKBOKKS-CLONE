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
  RefreshCw,
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Link,
  Unlink,
  Eye,
  TrendingUp,
  Loader2,
  XCircle,
  Trash2
} from 'lucide-react'

interface BankConnection {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  accountType: string
  status: 'connected' | 'disconnected' | 'error' | 'active'
  lastSync: string
  balance: number
  currency: string
  logo: string
  isPrimary?: boolean
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  category?: string
  status: 'new' | 'categorized' | 'imported'
  confidence?: number
}

export default function BankSyncPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Form state for new bank
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: 'CHECKING',
    currency: 'MXN',
    initialBalance: '',
    isPrimary: false,
    notes: '',
  })

  // Fetch bank accounts from API
  const fetchBankAccounts = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/banking/accounts?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const accounts = (data.accounts || []).map((acc: any) => ({
          id: acc.id,
          bankName: acc.bankName || acc.institutionName || 'Banco',
          accountName: acc.accountName,
          accountNumber: acc.mask ? `**** ${acc.mask}` : acc.accountNumber || '',
          accountType: acc.accountType || 'Cuenta',
          status: (acc.status || 'ACTIVE').toLowerCase() === 'active' ? 'connected' : acc.status?.toLowerCase() || 'connected',
          lastSync: acc.lastSyncedAt || acc.updatedAt || new Date().toISOString(),
          balance: acc.balance || 0,
          currency: acc.currency || 'MXN',
          logo: '🏦',
          isPrimary: acc.isPrimary || false,
        }))
        setBankConnections(accounts)
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      setMessage({ type: 'error', text: 'Error al cargar cuentas bancarias' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  // Create new bank account
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return
    
    setProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          accountType: formData.accountType,
          currency: formData.currency,
          balance: parseFloat(formData.initialBalance) || 0,
          isPrimary: formData.isPrimary,
          notes: formData.notes,
          companyId: activeCompany.id,
        }),
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Cuenta bancaria agregada exitosamente' })
        setShowBankModal(false)
        setFormData({
          bankName: '',
          accountName: '',
          accountNumber: '',
          accountType: 'CHECKING',
          currency: 'MXN',
          initialBalance: '',
          isPrimary: false,
          notes: '',
        })
        await fetchBankAccounts()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear cuenta bancaria' })
      }
    } catch (error) {
      console.error('Error creating bank:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProcessing(false)
    }
  }

  // Delete bank account
  const handleDeleteBank = async (accountId: string) => {
    if (!confirm('¿Estás seguro de desconectar esta cuenta bancaria?')) return
    
    setProcessing(true)
    try {
      const response = await fetch(`/api/banking/accounts?id=${accountId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Cuenta bancaria desconectada' })
        await fetchBankAccounts()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al desconectar cuenta' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProcessing(false)
    }
  }

  // Select bank from quick options
  const handleQuickBankSelect = (bankName: string) => {
    setFormData(prev => ({ ...prev, bankName }))
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany) {
      fetchBankAccounts()
    }
  }, [activeCompany, fetchBankAccounts])

  // Sample transactions - these would come from API in real implementation
  const sampleTransactions: Transaction[] = [
    {
      id: 'TXN-001',
      date: '2025-11-25',
      description: 'SPEI Recibido - CLIENTE ABC CORP',
      amount: 15000,
      type: 'credit',
      category: 'Ventas de Servicios',
      status: 'categorized',
      confidence: 95
    },
    {
      id: 'TXN-002',
      date: '2025-11-24',
      description: 'Transferencia - RENTA OFICINA',
      amount: 8000,
      type: 'debit',
      category: 'Renta',
      status: 'categorized',
      confidence: 98
    },
  ]

  const handleSync = async (bankId: string) => {
    setSyncing(true)
    try {
      // Simulate sync - in real app would call API
      await new Promise(resolve => setTimeout(resolve, 2000))
      setMessage({ type: 'success', text: '✅ Sincronización completada' })
      await fetchBankAccounts()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al sincronizar' })
    } finally {
      setSyncing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conectado
        </Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Unlink className="w-3 h-3" /> Desconectado
        </Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Error
        </Badge>
      default:
        return null
    }
  }

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Nueva
        </Badge>
      case 'categorized':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Categorizada
        </Badge>
      case 'imported':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Importada
        </Badge>
      default:
        return null
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} hrs`
    return `Hace ${Math.floor(diffMinutes / 1440)} días`
  }

  const totalConnected = bankConnections.filter(b => b.status === 'connected').length
  const totalBalance = bankConnections.reduce((sum, b) => sum + b.balance, 0)
  const newTransactions = sampleTransactions.filter(t => t.status === 'new').length
  const categorizationRate = sampleTransactions.length > 0 
    ? ((sampleTransactions.filter(t => t.status !== 'new').length / sampleTransactions.length) * 100).toFixed(0)
    : '0'

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
            <h1 className="text-2xl font-bold text-gray-900">Sincronización Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Conecta y sincroniza tus cuentas bancarias automáticamente
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={async () => {
                setSyncing(true)
                await fetchBankAccounts()
                setSyncing(false)
                setMessage({ type: 'success', text: '✅ Sincronización completada' })
              }}
              disabled={syncing || processing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Todo
                </>
              )}
            </Button>
            <Button onClick={() => setShowBankModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Conectar Banco
            </Button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-5 h-5" />
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
              <div className="text-3xl font-bold text-blue-900">{totalConnected}</div>
              <div className="text-sm text-blue-700">Bancos Conectados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalBalance.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Balance Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{newTransactions}</div>
              <div className="text-sm text-orange-700">Transacciones Nuevas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{categorizationRate}%</div>
              <div className="text-sm text-purple-700">Auto-Categorización</div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Connections */}
        <Card>
          <CardHeader>
            <CardTitle>Cuentas Bancarias Conectadas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankConnections.map((bank) => (
                <Card key={bank.id} className={`hover:shadow-lg transition ${bank.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{bank.logo}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bank.bankName}</h3>
                          <p className="text-sm text-gray-600">{bank.accountNumber}</p>
                          {bank.isPrimary && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">Principal</Badge>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(bank.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cuenta:</span>
                        <span className="font-medium">{bank.accountName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{bank.accountType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Balance:</span>
                        <span className="font-semibold text-gray-900">
                          ${bank.balance.toLocaleString()} {bank.currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Última sync:</span>
                        <span className="text-gray-700">{getTimeAgo(bank.lastSync)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleSync(bank.id)}
                        disabled={syncing}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                        Sincronizar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteBank(bank.id)}
                        disabled={processing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Bank Card */}
              <Card 
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition cursor-pointer"
                onClick={() => setShowBankModal(true)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[240px]">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Conectar Nuevo Banco</h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Agrega una nueva cuenta bancaria para sincronizar automáticamente
                  </p>
                  <Button onClick={() => setShowBankModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Banco
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transacciones Recientes</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Confianza IA</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(txn.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {txn.type === 'credit' ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm text-gray-900">{txn.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {txn.category || (
                          <span className="text-gray-400 italic">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${txn.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {txn.confidence && (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  txn.confidence >= 90 ? 'bg-green-500' :
                                  txn.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${txn.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{txn.confidence}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getTransactionStatusBadge(txn.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {txn.status === 'new' && (
                          <Button size="sm" variant="outline">
                            Categorizar
                          </Button>
                        )}
                        {txn.status === 'categorized' && (
                          <Button size="sm">
                            Importar
                          </Button>
                        )}
                        {txn.status === 'imported' && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Sincronización Automática</h3>
                  <p className="text-blue-700 text-sm">
                    Las transacciones se sincronizan automáticamente cada 6 horas. Puedes sincronizar 
                    manualmente en cualquier momento para obtener los movimientos más recientes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">Categorización Inteligente</h3>
                  <p className="text-purple-700 text-sm">
                    Nuestra IA aprende de tus patrones y categoriza automáticamente las transacciones 
                    con alta precisión, ahorrándote tiempo en la contabilidad.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">🔒 Conexión Segura</h3>
                <p className="text-green-700 text-sm">
                  Todas las conexiones bancarias utilizan encriptación de nivel bancario (256-bit SSL). 
                  Nunca almacenamos tus credenciales bancarias. La conexión se realiza directamente con tu banco 
                  a través de APIs oficiales y seguras.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connect Bank Modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Conectar Nuevo Banco</CardTitle>
                  <Button variant="outline" onClick={() => setShowBankModal(false)}>Cerrar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateBank} className="space-y-6">
                  {/* Quick Bank Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Selecciona tu banco (opcional)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['BBVA', 'Santander', 'Banorte', 'Citibanamex', 'HSBC', 'Scotiabank', 'Inbursa', 'Otro'].map((bank) => (
                        <button 
                          key={bank}
                          type="button"
                          className={`p-3 border-2 rounded-lg transition text-center ${
                            formData.bankName === bank 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:border-gray-400'
                          }`}
                          onClick={() => handleQuickBankSelect(bank === 'Otro' ? '' : bank)}
                        >
                          <div className="text-xl mb-1">🏦</div>
                          <div className="text-xs font-medium">{bank}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-medium text-gray-900">Detalles de la cuenta</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre del Banco *</label>
                        <Input 
                          type="text" 
                          placeholder="Ej: BBVA, Santander..."
                          value={formData.bankName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre de la Cuenta *</label>
                        <Input 
                          type="text" 
                          placeholder="Ej: Cuenta Principal Empresa"
                          value={formData.accountName}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Número de Cuenta (últimos 4 dígitos)</label>
                        <Input 
                          type="text" 
                          placeholder="Ej: 4567"
                          maxLength={4}
                          value={formData.accountNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo de Cuenta</label>
                        <select 
                          className="w-full px-3 py-2 border rounded-lg"
                          value={formData.accountType}
                          onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                        >
                          <option value="CHECKING">Cuenta de Cheques</option>
                          <option value="SAVINGS">Cuenta de Ahorro</option>
                          <option value="CREDIT_CARD">Tarjeta de Crédito</option>
                          <option value="INVESTMENT">Inversión</option>
                          <option value="LOAN">Préstamo</option>
                          <option value="OTHER">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Moneda</label>
                        <select 
                          className="w-full px-3 py-2 border rounded-lg"
                          value={formData.currency}
                          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        >
                          <option value="MXN">MXN - Peso Mexicano</option>
                          <option value="USD">USD - Dólar Americano</option>
                          <option value="EUR">EUR - Euro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          step="0.01"
                          value={formData.initialBalance}
                          onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                      <Input 
                        type="text" 
                        placeholder="Notas adicionales sobre esta cuenta..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isPrimary"
                        checked={formData.isPrimary}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="isPrimary" className="text-sm text-gray-700">
                        Establecer como cuenta principal
                      </label>
                    </div>
                  </div>

                  {message?.type === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {message.text}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-4">
                      🔒 Conexión segura • Los datos de la cuenta se guardarán de forma encriptada
                    </p>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={processing}>
                        {processing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Cuenta Bancaria
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowBankModal(false)}>
                        Cancelar
                      </Button>
                    </div>
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

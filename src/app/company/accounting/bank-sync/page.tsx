'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  TrendingUp
} from 'lucide-react'

interface BankConnection {
  id: string
  bankName: string
  accountNumber: string
  accountType: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string
  balance: number
  currency: string
  logo: string
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const bankConnections: BankConnection[] = [
    {
      id: '1',
      bankName: 'BBVA',
      accountNumber: '**** 4567',
      accountType: 'Cuenta de Cheques Empresarial',
      status: 'connected',
      lastSync: '2025-11-25T08:30:00',
      balance: 44450,
      currency: 'MXN',
      logo: '🏦'
    },
    {
      id: '2',
      bankName: 'Santander',
      accountNumber: '**** 8901',
      accountType: 'Cuenta Negocios',
      status: 'connected',
      lastSync: '2025-11-25T07:15:00',
      balance: 28500,
      currency: 'MXN',
      logo: '🏦'
    },
    {
      id: '3',
      bankName: 'Banorte',
      accountNumber: '**** 2345',
      accountType: 'Cuenta Empresas Plus',
      status: 'error',
      lastSync: '2025-11-20T14:20:00',
      balance: 15200,
      currency: 'MXN',
      logo: '🏦'
    }
  ]

  const recentTransactions: Transaction[] = [
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
    {
      id: 'TXN-003',
      date: '2025-11-24',
      description: 'COMISION BANCARIA',
      amount: 150,
      type: 'debit',
      status: 'new',
      confidence: 85
    },
    {
      id: 'TXN-004',
      date: '2025-11-23',
      description: 'DEPOSITO - VENTA PRODUCTOS',
      amount: 45000,
      type: 'credit',
      category: 'Ventas de Productos',
      status: 'imported',
      confidence: 92
    },
    {
      id: 'TXN-005',
      date: '2025-11-23',
      description: 'NOMINA QUINCENAL',
      amount: 14000,
      type: 'debit',
      category: 'Sueldos y Salarios',
      status: 'imported',
      confidence: 99
    },
    {
      id: 'TXN-006',
      date: '2025-11-22',
      description: 'PAGO PROVEEDOR XYZ SA',
      amount: 12500,
      type: 'debit',
      status: 'new',
      confidence: 75
    }
  ]

  const handleSync = (bankId: string) => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      alert('Sincronización completada')
    }, 2000)
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
  const newTransactions = recentTransactions.filter(t => t.status === 'new').length
  const categorizationRate = ((recentTransactions.filter(t => t.status !== 'new').length / recentTransactions.length) * 100).toFixed(0)

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
              onClick={() => handleSync('all')}
              disabled={syncing}
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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Conectar Banco
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
                <Card key={bank.id} className="hover:shadow-lg transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{bank.logo}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bank.bankName}</h3>
                          <p className="text-sm text-gray-600">{bank.accountNumber}</p>
                        </div>
                      </div>
                      {getStatusBadge(bank.status)}
                    </div>

                    <div className="space-y-2 mb-4">
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
                      {bank.status === 'connected' ? (
                        <>
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
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </>
                      ) : bank.status === 'error' ? (
                        <Button size="sm" variant="outline" className="flex-1 text-red-600">
                          <Link className="w-4 h-4 mr-1" />
                          Reconectar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Link className="w-4 h-4 mr-1" />
                          Conectar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Bank Card */}
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[240px]">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Conectar Nuevo Banco</h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Agrega una nueva cuenta bancaria para sincronizar automáticamente
                  </p>
                  <Button>
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
      </div>
    </CompanyTabsLayout>
  )
}

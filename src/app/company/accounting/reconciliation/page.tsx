'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  FileCheck,
  Download,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Link as LinkIcon,
  CheckSquare,
  Activity,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface BankAccount {
  id: string
  name: string
  accountNumber: string
  bankBalance: number
  bookBalance: number
  lastReconciled: string
  status: 'reconciled' | 'pending' | 'unreconciled'
}

interface ReconciliationItem {
  id: string
  date: string
  description: string
  type: 'debit' | 'credit'
  amount: number
  status: 'matched' | 'unmatched' | 'pending'
  bankStatement: boolean
  bookRecord: boolean
  reference?: string
}

export default function ReconciliationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch data from API
  const fetchReconciliationData = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyId: activeCompany.id })
      if (selectedAccount) {
        params.append('bankAccountId', selectedAccount)
      }
      
      const response = await fetch(`/api/accounting/reconciliation?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBankAccounts(data.bankAccounts || [])
        setReconciliationItems(data.reconciliationItems || [])
        
        // Select first account if none selected
        if (!selectedAccount && data.bankAccounts?.length > 0) {
          setSelectedAccount(data.bankAccounts[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
      setMessage({ type: 'error', text: 'Error al cargar datos de conciliación' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany, selectedAccount])

  // Reconcile selected transactions
  const handleReconcile = async () => {
    if (!activeCompany || !selectedAccount) return
    
    setProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          bankAccountId: selectedAccount,
          transactionIds: selectedItems.length > 0 ? selectedItems : 
            reconciliationItems.filter(i => i.status === 'unmatched').map(i => i.id)
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Transacciones conciliadas exitosamente' })
        setSelectedItems([])
        await fetchReconciliationData()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al conciliar' })
      }
    } catch (error) {
      console.error('Error reconciling:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProcessing(false)
    }
  }

  // Auto-match transactions
  const handleAutoMatch = async () => {
    if (!activeCompany || !selectedAccount) return
    
    setProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-match',
          bankAccountId: selectedAccount
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: data.message || 'Auto-conciliación completada' })
        await fetchReconciliationData()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error en auto-conciliación' })
      }
    } catch (error) {
      console.error('Error auto-matching:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProcessing(false)
    }
  }

  // Complete reconciliation
  const handleComplete = async () => {
    if (!activeCompany || !selectedAccount) return
    
    const currentAccount = bankAccounts.find(a => a.id === selectedAccount)
    if (!currentAccount) return
    
    const unmatchedCount = reconciliationItems.filter(i => i.status === 'unmatched').length
    if (unmatchedCount > 0) {
      setMessage({ type: 'error', text: `Hay ${unmatchedCount} transacciones sin conciliar. Concilia todas las transacciones primero.` })
      return
    }
    
    setProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          bankAccountId: selectedAccount,
          closingBalance: currentAccount.bankBalance
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Conciliación completada exitosamente' })
        await fetchReconciliationData()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al completar' })
      }
    } catch (error) {
      console.error('Error completing reconciliation:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProcessing(false)
    }
  }

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  // Select all unmatched items
  const selectAllUnmatched = () => {
    const unmatchedIds = reconciliationItems
      .filter(i => i.status === 'unmatched')
      .map(i => i.id)
    setSelectedItems(unmatchedIds)
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany) {
      fetchReconciliationData()
    }
  }, [activeCompany, fetchReconciliationData])

  const currentAccount = bankAccounts.find(acc => acc.id === selectedAccount) || {
    id: '',
    name: 'Sin cuenta seleccionada',
    accountNumber: '',
    bankBalance: 0,
    bookBalance: 0,
    lastReconciled: new Date().toISOString(),
    status: 'unreconciled' as const
  }
  const difference = currentAccount.bookBalance - currentAccount.bankBalance

  const matchedCount = reconciliationItems.filter(i => i.status === 'matched').length
  const unmatchedCount = reconciliationItems.filter(i => i.status === 'unmatched').length
  const pendingCount = reconciliationItems.filter(i => i.status === 'pending').length

  const filteredItems = reconciliationItems.filter(item => {
    if (showOnlyUnmatched && item.status === 'matched') return false
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const exportReport = () => {
    if (!currentAccount) return
    const headers = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Estado Banco', 'Estado Libros', 'Estado']
    const rows = reconciliationItems.map(item => [
      item.date,
      item.description,
      item.type,
      item.amount,
      item.bankStatement ? 'Sí' : 'No',
      item.bookRecord ? 'Sí' : 'No',
      item.status
    ])
    const summary = [
      [''],
      ['RESUMEN DE CONCILIACIÓN'],
      ['Cuenta', currentAccount.name],
      ['Saldo Bancario', currentAccount.bankBalance],
      ['Saldo en Libros', currentAccount.bookBalance],
      ['Diferencia', Math.abs(currentAccount.bookBalance - currentAccount.bankBalance)]
    ]
    const csvContent = [...summary, [''], headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation_${currentAccount.name}_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conciliado
        </Badge>
      case 'unmatched':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Sin Conciliar
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      default:
        return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  // Botones de acción de Conciliación Bancaria
  const reconciliationActions = [
    {
      label: 'Conectar bancos',
      icon: LinkIcon,
      onClick: () => {
        router.push('/company/accounting/bank-sync')
      },
      variant: 'primary' as const,
    },
    {
      label: 'Sincronizar cuentas',
      icon: RefreshCw,
      onClick: async () => {
        await fetchReconciliationData()
      },
      variant: 'outline' as const,
      disabled: processing,
    },
    {
      label: processing ? 'Procesando...' : 'Auto-Match',
      icon: RefreshCw,
      onClick: handleAutoMatch,
      variant: 'success' as const,
      disabled: processing || unmatchedCount === 0,
    },
    {
      label: 'Conciliar Selección',
      icon: CheckCircle2,
      onClick: handleReconcile,
      variant: 'success' as const,
      disabled: processing || selectedItems.length === 0,
    },
    {
      label: 'Completar Conciliación',
      icon: CheckSquare,
      onClick: handleComplete,
      variant: 'default' as const,
      disabled: processing || unmatchedCount > 0,
    },
    {
      label: 'Seleccionar Todos',
      icon: CheckSquare,
      onClick: selectAllUnmatched,
      variant: 'outline' as const,
      disabled: unmatchedCount === 0,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Reconcilia tus cuentas bancarias con tus registros contables
            </p>
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

        {/* Processing Indicator */}
        {processing && (
          <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Procesando transacciones...</span>
          </div>
        )}

        {/* Action Buttons */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Acciones de Conciliación Bancaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={reconciliationActions} />
          </CardContent>
        </Card>

        {/* Original Header Section */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Conciliación
            </Button>
          </div>
        </div>

        {/* Account Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card 
              key={account.id}
              className={`cursor-pointer transition ${
                selectedAccount === account.id 
                  ? 'ring-2 ring-blue-600 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedAccount(account.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  {account.status === 'reconciled' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {account.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  {account.status === 'unreconciled' && <XCircle className="w-5 h-5 text-red-600" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{account.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{account.accountNumber}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo Banco:</span>
                    <span className="font-semibold">${account.bankBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo Libros:</span>
                    <span className="font-semibold">${account.bookBalance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  Última conciliación: {new Date(account.lastReconciled).toLocaleDateString('es-MX')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reconciliation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${currentAccount.bankBalance.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Saldo Bancario</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${currentAccount.bookBalance.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Saldo en Libros</div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${Math.abs(difference) === 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                {Math.abs(difference) === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${Math.abs(difference) === 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${Math.abs(difference).toLocaleString()}
              </div>
              <div className={`text-sm ${Math.abs(difference) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                Diferencia
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-900 mb-1">
                  {matchedCount}/{reconciliationItems.length}
                </div>
                <div className="text-sm text-orange-700">Transacciones Conciliadas</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{matchedCount}</div>
                    <div className="text-sm text-gray-600">Conciliadas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{unmatchedCount}</div>
                    <div className="text-sm text-gray-600">Sin Conciliar</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                    <div className="text-sm text-gray-600">Pendientes</div>
                  </div>
                </div>
              </div>
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
                  placeholder="Buscar transacción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUnmatched}
                  onChange={(e) => setShowOnlyUnmatched(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Solo sin conciliar</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Items */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones para Conciliar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado Banco</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado Libros</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(item.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.reference && (
                          <div className="text-xs text-gray-500">Ref: {item.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.type === 'credit' ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-xs font-medium">Crédito</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <ArrowDownRight className="w-4 h-4" />
                            <span className="text-xs font-medium">Débito</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          item.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${item.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.bankStatement ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.bookRecord ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status !== 'matched' ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems([...selectedItems, item.id])
                                } else {
                                  setSelectedItems(selectedItems.filter(id => id !== item.id))
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={processing}
                              onClick={async () => {
                                setSelectedItems([item.id])
                                await handleReconcile()
                              }}
                            >
                              Conciliar
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">
                            ✓ Conciliado
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Proceso de Conciliación Bancaria</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Paso 1:</strong> Importa o ingresa tu estado de cuenta bancario</li>
                  <li>• <strong>Paso 2:</strong> Verifica que las transacciones coincidan con tus registros</li>
                  <li>• <strong>Paso 3:</strong> Marca las transacciones que coinciden</li>
                  <li>• <strong>Paso 4:</strong> Investiga y ajusta las diferencias encontradas</li>
                  <li>• <strong>Paso 5:</strong> Confirma la conciliación cuando los saldos coincidan</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Reconciliation Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Nueva Conciliación</CardTitle>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>Cerrar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  setProcessing(true)
                  setMessage(null)
                  try {
                    const response = await fetch('/api/accounting/reconciliation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'start',
                        companyId: activeCompany?.id,
                        bankAccountId: formData.get('bankAccountId'),
                        startDate: formData.get('startDate'),
                        endDate: formData.get('endDate'),
                        statementBalance: parseFloat(formData.get('statementBalance') as string) || 0,
                      }),
                    })
                    if (response.ok) {
                      setShowNewModal(false)
                      setMessage({ type: 'success', text: 'Conciliación iniciada exitosamente' })
                      await fetchReconciliationData()
                    } else {
                      const data = await response.json()
                      setMessage({ type: 'error', text: data.error || 'Error al iniciar conciliación' })
                    }
                  } catch (err) {
                    setMessage({ type: 'error', text: 'Error de conexión' })
                  } finally {
                    setProcessing(false)
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select name="bankAccountId" className="w-full px-3 py-2 border rounded-lg" required>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} - {acc.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                    <Input type="date" name="startDate" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha Fin</label>
                    <Input type="date" name="endDate" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Final del Estado de Cuenta</label>
                    <Input type="number" name="statementBalance" placeholder="0.00" step="0.01" required />
                  </div>
                  {message?.type === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {message.text}
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1" disabled={processing}>
                      {processing ? 'Iniciando...' : 'Iniciar Conciliación'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
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

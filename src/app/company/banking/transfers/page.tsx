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
  ArrowRightLeft,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Send,
  Globe,
  X,
  Loader2,
  ArrowRight,
  Building2
} from 'lucide-react'

interface Transfer {
  id: string
  transferId: string
  date: string
  fromAccount: string
  fromAccountId: string
  toAccount: string
  toAccountId: string
  amount: number
  fromCurrency: string
  toCurrency: string
  exchangeRate?: number
  convertedAmount?: number
  type: 'internal' | 'external' | 'international'
  description: string
  reference?: string
  status: 'completed' | 'pending' | 'scheduled' | 'failed' | 'cancelled'
  scheduledDate?: string
  completedDate?: string
  fee?: number
}

interface BankAccount {
  id: string
  accountName: string
  bankName?: string
  accountNumber?: string
  balance: number
  currency: string
}

export default function BankTransfersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Real data from API
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  
  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [processing, setProcessing] = useState(false)
  const [transferType, setTransferType] = useState<'internal' | 'external'>('internal')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Form states
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    externalBankName: '',
    externalAccountNumber: '',
    externalAccountHolder: '',
    reference: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, router])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadAccounts(), loadTransfers()])
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
        if (data.accounts?.length > 0) {
          setTransferForm(prev => ({ ...prev, fromAccountId: data.accounts[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadTransfers = async () => {
    try {
      const response = await fetch('/api/banking/transfers?limit=100')
      if (response.ok) {
        const data = await response.json()
        // Map API transfers to local format
        const mappedTransfers = (data.transfers || []).map((t: any) => ({
          id: t.id,
          transferId: t.id.slice(0, 8).toUpperCase(),
          date: t.date,
          fromAccount: t.bankAccount?.accountName || 'N/A',
          fromAccountId: t.bankAccount?.id || '',
          toAccount: t.pairedWith?.bankAccount?.accountName || t.description || 'Externa',
          toAccountId: t.pairedWith?.bankAccount?.id || '',
          amount: Math.abs(t.amount),
          fromCurrency: t.bankAccount?.currency || 'USD',
          toCurrency: t.bankAccount?.currency || 'USD',
          type: t.isExternal ? 'external' : 'internal',
          description: t.name || t.description || '',
          reference: t.id.slice(0, 12),
          status: t.pending ? 'pending' : (t.reconciled ? 'completed' : 'completed'),
          completedDate: !t.pending ? t.date : undefined
        }))
        setTransfers(mappedTransfers)
      }
    } catch (error) {
      console.error('Error loading transfers:', error)
    }
  }

  const openTransferModal = (type: 'internal' | 'external') => {
    setTransferType(type)
    setTransferForm({
      fromAccountId: accounts[0]?.id || '',
      toAccountId: type === 'internal' ? (accounts[1]?.id || '') : '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      externalBankName: '',
      externalAccountNumber: '',
      externalAccountHolder: '',
      reference: ''
    })
    setShowTransferModal(true)
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const executeTransfer = async () => {
    if (!transferForm.fromAccountId || !transferForm.amount) {
      showMessage('error', 'Cuenta origen y monto son requeridos')
      return
    }

    if (transferType === 'internal' && !transferForm.toAccountId) {
      showMessage('error', 'Seleccione cuenta destino')
      return
    }

    if (transferType === 'internal' && transferForm.fromAccountId === transferForm.toAccountId) {
      showMessage('error', 'Las cuentas deben ser diferentes')
      return
    }

    if (transferType === 'external' && (!transferForm.externalBankName || !transferForm.externalAccountNumber)) {
      showMessage('error', 'Complete datos del banco externo')
      return
    }

    // Check balance
    const fromAccount = accounts.find(a => a.id === transferForm.fromAccountId)
    if (fromAccount && fromAccount.balance < transferForm.amount) {
      showMessage('error', 'Saldo insuficiente en cuenta origen')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/banking/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          type: transferType
        })
      })

      if (response.ok) {
        const data = await response.json()
        showMessage('success', `Transferencia ${transferType === 'external' ? 'iniciada' : 'completada'} - Ref: ${data.reference}`)
        setShowTransferModal(false)
        loadData()
      } else {
        const error = await response.json()
        showMessage('error', error.error || 'Error al realizar transferencia')
      }
    } catch (error) {
      console.error('Error executing transfer:', error)
      showMessage('error', 'Error al realizar transferencia')
    } finally {
      setProcessing(false)
    }
  }

  const confirmTransfer = async (action: 'confirm' | 'cancel') => {
    if (!selectedTransfer) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/banking/transfers/${selectedTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        showMessage('success', action === 'confirm' ? 'Transferencia confirmada' : 'Transferencia cancelada')
        setShowConfirmModal(false)
        setSelectedTransfer(null)
        loadData()
      } else {
        const error = await response.json()
        showMessage('error', error.error || 'Error al procesar transferencia')
      }
    } catch (error) {
      console.error('Error confirming transfer:', error)
      showMessage('error', 'Error al procesar transferencia')
    } finally {
      setProcessing(false)
    }
  }

  const exportTransfers = () => {
    const headers = ['Fecha', 'ID', 'Origen', 'Destino', 'Monto', 'Tipo', 'Estado']
    const rows = filteredTransfers.map(t => [
      new Date(t.date).toLocaleDateString('es-MX'),
      t.transferId,
      t.fromAccount,
      t.toAccount,
      t.amount.toFixed(2),
      t.type,
      t.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transferencias-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    showMessage('success', 'Transferencias exportadas a CSV')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

const getTypeBadge = (type: string) => {
    switch (type) {
      case 'internal':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Interna
        </Badge>
      case 'external':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <ArrowRightLeft className="w-3 h-3" /> Externa
        </Badge>
      case 'international':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Internacional
        </Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completada
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Programada
        </Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Fallida
        </Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Cancelada
        </Badge>
      default:
        return null
    }
  }

  const filteredTransfers = transfers.filter(trf => {
    if (filterType !== 'all' && trf.type !== filterType) return false
    if (filterStatus !== 'all' && trf.status !== filterStatus) return false
    if (searchTerm && !trf.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.transferId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.fromAccount.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.toAccount.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalTransfers = transfers.length
  const completedTransfers = transfers.filter(t => t.status === 'completed').length
  const totalAmount = transfers
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => {
      if (t.fromCurrency === 'MXN') return sum + t.amount
      if (t.fromCurrency === 'USD' && t.exchangeRate) return sum + (t.amount * t.exchangeRate)
      return sum
    }, 0)
  const scheduledTransfers = transfers.filter(t => t.status === 'scheduled').length

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
            <h1 className="text-2xl font-bold text-gray-900">Transferencias Bancarias</h1>
            <p className="text-gray-600 mt-1">
              Gestiona transferencias entre cuentas y hacia terceros
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportTransfers}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => openTransferModal('internal')}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Entre Cuentas
            </Button>
            <Button onClick={() => openTransferModal('external')}>
              <Globe className="w-4 h-4 mr-2" />
              Externa
            </Button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowRightLeft className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalTransfers}</div>
              <div className="text-sm text-blue-700">Total Transferencias</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{completedTransfers}</div>
              <div className="text-sm text-green-700">Completadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{scheduledTransfers}</div>
              <div className="text-sm text-orange-700">Programadas</div>
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
                  placeholder="Buscar transferencias..."
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
                <option value="internal">Internas</option>
                <option value="external">Externas</option>
                <option value="international">Internacionales</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="pending">Pendientes</option>
                <option value="scheduled">Programadas</option>
                <option value="failed">Fallidas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Transferencias ({filteredTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transferencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta Origen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(transfer.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        {transfer.scheduledDate && (
                          <div className="text-xs text-orange-600 mt-1">
                            Progr: {new Date(transfer.scheduledDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {transfer.transferId}
                        </div>
                        {transfer.reference && (
                          <div className="text-xs text-gray-500">
                            Ref: {transfer.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transfer.fromAccount}</div>
                        <div className="text-xs text-gray-500">{transfer.fromCurrency}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transfer.toAccount}</div>
                        <div className="text-xs text-gray-500">{transfer.toCurrency}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        {transfer.description}
                        {transfer.exchangeRate && (
                          <div className="text-xs text-purple-600 mt-1">
                            TC: {transfer.exchangeRate} → {transfer.toCurrency} ${transfer.convertedAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getTypeBadge(transfer.type)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {transfer.fromCurrency} ${transfer.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        {transfer.fee && transfer.fee > 0 && (
                          <div className="text-xs text-orange-600">
                            Comisión: ${transfer.fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transfer.status)}
                        {transfer.completedDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(transfer.completedDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {(transfer.status === 'scheduled' || transfer.status === 'pending') && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedTransfer(transfer)
                                setShowConfirmModal(true)
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
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
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Transferencias Bancarias</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema completo para gestionar transferencias entre cuentas propias, externas e internacionales.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Transferencias Internas:</strong> Entre cuentas propias, sin comisión, inmediatas</li>
                  <li>• <strong>Transferencias Externas:</strong> SPEI a terceros, comisión mínima, mismo día</li>
                  <li>• <strong>Transferencias Internacionales:</strong> Wire transfers, conversión de divisas automática</li>
                  <li>• <strong>Programación:</strong> Agenda transferencias futuras (nómina, pagos recurrentes)</li>
                  <li>• <strong>Tipo de cambio:</strong> Conversión automática MXN-USD con TC en tiempo real</li>
                  <li>• <strong>Comisiones:</strong> Registro automático de costos bancarios por servicio</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Balances */}
        {accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Saldos de Cuentas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {accounts.map(account => (
                  <div key={account.id} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-900">{account.accountName}</h4>
                    <p className="text-sm text-gray-500">{account.bankName}</p>
                    <p className={`text-2xl font-bold mt-2 ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {transferType === 'internal' ? (
                    <>
                      <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                      Transferencia Interna
                    </>
                  ) : (
                    <>
                      <Globe className="w-6 h-6 text-green-600" />
                      Transferencia Externa
                    </>
                  )}
                </h2>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* From Account */}
                <div>
                  <label className="block text-sm font-medium mb-1">Cuenta Origen *</label>
                  <select
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.bankName} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-8 h-8 text-gray-400" />
                </div>

                {transferType === 'internal' ? (
                  /* To Account - Internal */
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Destino *</label>
                    <select
                      value={transferForm.toAccountId}
                      onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.filter(a => a.id !== transferForm.fromAccountId).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} - {acc.bankName} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* External Bank Details */
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Banco Destino *</label>
                      <Input
                        value={transferForm.externalBankName}
                        onChange={(e) => setTransferForm({ ...transferForm, externalBankName: e.target.value })}
                        placeholder="Nombre del banco"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Número de Cuenta *</label>
                      <Input
                        value={transferForm.externalAccountNumber}
                        onChange={(e) => setTransferForm({ ...transferForm, externalAccountNumber: e.target.value })}
                        placeholder="Número de cuenta destino"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Beneficiario</label>
                      <Input
                        value={transferForm.externalAccountHolder}
                        onChange={(e) => setTransferForm({ ...transferForm, externalAccountHolder: e.target.value })}
                        placeholder="Nombre del beneficiario"
                      />
                    </div>
                  </>
                )}

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
                        type="text"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 })}
                        className="amount-input pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Concepto / Descripción</label>
                  <Input
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="Descripción de la transferencia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Referencia</label>
                  <Input
                    value={transferForm.reference}
                    onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
                    placeholder="Referencia (opcional)"
                  />
                </div>

                {transferType === 'external' && (
                  <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Transferencia Externa</p>
                      <p>Las transferencias externas quedan pendientes de confirmación. Verifique los datos antes de confirmar.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
                <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={executeTransfer} 
                  disabled={processing}
                  className={transferType === 'external' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" />
                  {transferType === 'internal' ? 'Transferir' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Transfer Modal */}
        {showConfirmModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">Confirmar Transferencia</h2>
                <button onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedTransfer(null)
                }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-bold">{formatCurrency(Math.abs(selectedTransfer.amount))}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Fecha:</span>
                    <span>{new Date(selectedTransfer.date).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Descripción:</span>
                    <span>{selectedTransfer.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuenta:</span>
                    <span>{selectedTransfer.fromAccount}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  ¿Desea confirmar o cancelar esta transferencia pendiente?
                </p>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button 
                  variant="outline" 
                  onClick={() => confirmTransfer('cancel')}
                  disabled={processing}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Transferencia
                </Button>
                <Button 
                  onClick={() => confirmTransfer('confirm')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

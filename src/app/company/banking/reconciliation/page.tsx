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
  CheckCircle,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  X
} from 'lucide-react'

interface ReconciliationItem {
  id: string
  transactionId: string
  date: string
  description: string
  amount: number
  systemBalance?: number
  statementBalance?: number
  type: 'deposit' | 'withdrawal' | 'fee' | 'interest'
  status: 'matched' | 'missing-system' | 'missing-statement' | 'discrepancy'
  notes?: string
}

interface ReconciliationPeriod {
  id?: string
  accountId: string
  accountName: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  statementBalance: number
  difference: number
  totalDeposits: number
  totalWithdrawals: number
  reconciledItems: number
  pendingItems: number
  status: 'in-progress' | 'completed' | 'needs-review'
}

interface BankAccount {
  id: string
  accountName: string
  bankName?: string
  balance: number
}

export default function BankReconciliationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [reconciledItems, setReconciledItems] = useState<Set<string>>(new Set())
  const [autoReconciling, setAutoReconciling] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Real data from API
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [reconciliations, setReconciliations] = useState<any[]>([])
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([])
  const [reconciliationPeriod, setReconciliationPeriod] = useState<ReconciliationPeriod | null>(null)
  
  // Form states
  const [newReconciliationForm, setNewReconciliationForm] = useState({
    accountId: '',
    startDate: new Date().toISOString().split('T')[0].slice(0, 8) + '01',
    endDate: new Date().toISOString().split('T')[0],
    statementBalance: 0
  })
  
  // Import form
  const [importForm, setImportForm] = useState({
    accountId: '',
    transactions: [] as any[]
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
      await Promise.all([loadAccounts(), loadReconciliations()])
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
          setSelectedAccount(data.accounts[0].id)
          setNewReconciliationForm(prev => ({ ...prev, accountId: data.accounts[0].id }))
          setImportForm(prev => ({ ...prev, accountId: data.accounts[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadReconciliations = async () => {
    try {
      const response = await fetch('/api/banking/reconciliation')
      if (response.ok) {
        const data = await response.json()
        setReconciliations(data.reconciliations || [])
        
        // Load pending transactions for reconciliation items display
        if (data.pendingTransactions?.length > 0) {
          const items: ReconciliationItem[] = data.pendingTransactions.map((t: any) => ({
            id: t.id,
            transactionId: t.id.slice(0, 12).toUpperCase(),
            date: t.date,
            description: t.name || t.description || '',
            amount: t.amount,
            systemBalance: t.amount,
            type: t.amount >= 0 ? 'deposit' : 'withdrawal',
            status: t.reconciled ? 'matched' : 'missing-statement'
          }))
          setReconciliationItems(items)
        }
        
        // Set current period from latest reconciliation or summary
        if (data.reconciliations?.length > 0) {
          const latest = data.reconciliations[0]
          setReconciliationPeriod({
            id: latest.id,
            accountId: latest.bankAccountId,
            accountName: latest.bankAccount?.accountName || '',
            periodStart: latest.startDate,
            periodEnd: latest.endDate,
            openingBalance: 0,
            closingBalance: parseFloat(latest.endingBalance) || 0,
            statementBalance: parseFloat(latest.statementBalance) || 0,
            difference: parseFloat(latest.difference) || 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            reconciledItems: latest._count?.matches || 0,
            pendingItems: 0,
            status: latest.status === 'completed' ? 'completed' : 
                   latest.status === 'in_progress' ? 'in-progress' : 'needs-review'
          })
        }
      }
    } catch (error) {
      console.error('Error loading reconciliations:', error)
    }
  }

  const createReconciliation = async () => {
    if (!newReconciliationForm.accountId) {
      alert('Seleccione una cuenta bancaria')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/banking/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: newReconciliationForm.accountId,
          startDate: newReconciliationForm.startDate,
          endDate: newReconciliationForm.endDate,
          statementBalance: newReconciliationForm.statementBalance,
          transactionIds: [] // Will auto-match
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Conciliación creada exitosamente\n\nTransacciones incluidas: ${data.transactionCount || 0}\nEstado: ${data.reconciliation.status}`)
        setShowNewModal(false)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear conciliación')
      }
    } catch (error) {
      console.error('Error creating reconciliation:', error)
      alert('Error al crear conciliación')
    } finally {
      setProcessing(false)
    }
  }

  const importStatement = async () => {
    if (!importForm.accountId) {
      alert('Seleccione una cuenta bancaria')
      return
    }

    // Simulate importing transactions
    const sampleTransactions = [
      { date: new Date().toISOString().split('T')[0], description: 'Depósito cliente', amount: 5000, reference: 'DEP001' },
      { date: new Date().toISOString().split('T')[0], description: 'Pago servicios', amount: -1500, reference: 'PAY001' },
      { date: new Date().toISOString().split('T')[0], description: 'Comisión bancaria', amount: -50, reference: 'FEE001' }
    ]

    setProcessing(true)
    try {
      const response = await fetch('/api/banking/reconciliation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: importForm.accountId,
          transactions: sampleTransactions
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Estado de cuenta importado\n\nTransacciones importadas: ${data.imported}\nCoincidencias encontradas: ${data.matched}\nNuevas transacciones: ${data.newTransactions}`)
        setShowImportModal(false)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al importar estado de cuenta')
      }
    } catch (error) {
      console.error('Error importing statement:', error)
      alert('Error al importar estado de cuenta')
    } finally {
      setProcessing(false)
    }
  }

  const confirmReconciliation = async (reconciliationId: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/banking/reconciliation/${reconciliationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' })
      })

      if (response.ok) {
        alert('✅ Conciliación confirmada exitosamente')
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al confirmar conciliación')
      }
    } catch (error) {
      console.error('Error confirming reconciliation:', error)
      alert('Error al confirmar conciliación')
    } finally {
      setProcessing(false)
    }
  }

  const generateReport = async () => {
    try {
      let url = '/api/banking/reports/reconciliation'
      if (selectedAccount) url += `?accountId=${selectedAccount}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        
        // Generate CSV
        const headers = ['Cuenta', 'Período', 'Saldo Sistema', 'Saldo Estado', 'Diferencia', 'Estado']
        const rows = data.accounts?.map((acc: any) => [
          acc.accountName,
          `${acc.reconciliations?.[0]?.startDate || 'N/A'} - ${acc.reconciliations?.[0]?.endDate || 'N/A'}`,
          acc.reconciliations?.[0]?.endingBalance || 0,
          acc.reconciliations?.[0]?.statementBalance || 0,
          acc.reconciliations?.[0]?.difference || 0,
          acc.reconciliations?.[0]?.status || 'N/A'
        ]) || []
        
        const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url2 = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url2
        a.download = `reporte-conciliacion-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url2)
        
        alert('📥 Reporte de conciliación exportado')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar reporte')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Defaults if no real data yet
  const defaultPeriod: ReconciliationPeriod = {
    accountId: 'ACC-001',
    accountName: accounts[0]?.accountName || 'Cuenta Principal',
    periodStart: new Date().toISOString().split('T')[0].slice(0, 8) + '01',
    periodEnd: new Date().toISOString().split('T')[0],
    openingBalance: 0,
    closingBalance: accounts[0]?.balance || 0,
    statementBalance: 0,
    difference: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    reconciledItems: 0,
    pendingItems: reconciliationItems.length,
    status: 'in-progress'
  }

  const currentPeriod = reconciliationPeriod || defaultPeriod

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conciliada
        </Badge>
      case 'missing-system':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Falta en Sistema
        </Badge>
      case 'missing-statement':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Falta en Estado
        </Badge>
      case 'discrepancy':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Discrepancia
        </Badge>
      default:
        return null
    }
  }

  const getReconciliationStatusBadge = (status: string) => {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> En Proceso
        </Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Completada
        </Badge>
      case 'needs-review':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Requiere Revisión
        </Badge>
      default:
        return null
    }
  }

  const filteredItems = reconciliationItems.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.transactionId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const matchedItems = reconciliationItems.filter(i => i.status === 'matched').length
  const discrepancyItems = reconciliationItems.filter(i => i.status === 'discrepancy' || i.status === 'missing-system' || i.status === 'missing-statement').length
  const reconciliationProgress = reconciliationItems.length > 0 ? (matchedItems / reconciliationItems.length) * 100 : 0

  // Función para conciliación automática
  const autoReconcile = async () => {
    if (!currentPeriod.id) {
      alert('No hay conciliación activa. Cree una nueva conciliación primero.')
      return
    }
    
    setAutoReconciling(true)
    try {
      // Get all pending transaction IDs
      const pendingIds = reconciliationItems
        .filter(item => item.status !== 'matched')
        .map(item => item.id)
      
      if (pendingIds.length === 0) {
        alert('Todas las transacciones ya están conciliadas')
        setAutoReconciling(false)
        return
      }

      const response = await fetch(`/api/banking/reconciliation/${currentPeriod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile_transactions',
          transactionIds: pendingIds
        })
      })

      if (response.ok) {
        const data = await response.json()
        const matchedIds = pendingIds
        setReconciledItems(new Set(matchedIds))
        alert(`✅ Conciliación Automática Completada\n\n📊 Resultados:\n• Items conciliados: ${matchedIds.length}\n• Progreso: ${((matchedItems + matchedIds.length) / reconciliationItems.length * 100).toFixed(1)}%`)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error en conciliación automática')
      }
    } catch (error) {
      console.error('Error in auto reconcile:', error)
      alert('Error en conciliación automática')
    } finally {
      setAutoReconciling(false)
    }
  }

  // Función para marcar/desmarcar item como conciliado
  const toggleReconciled = (itemId: string) => {
    const newSet = new Set(reconciledItems)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setReconciledItems(newSet)
  }

  // Función para finalizar conciliación
  const finishReconciliation = async () => {
    if (!currentPeriod.id) {
      alert('No hay conciliación activa')
      return
    }

    const totalReconciled = reconciledItems.size
    const totalItems = reconciliationItems.length
    const reconciledPercentage = totalItems > 0 ? (totalReconciled / totalItems) * 100 : 0
    
    if (reconciledPercentage < 100 && totalItems > 0) {
      const confirmed = confirm(`⚠️ Conciliación Incompleta\n\nHas conciliado ${totalReconciled} de ${totalItems} items (${reconciledPercentage.toFixed(1)}%)\n\n¿Deseas finalizar la conciliación de todos modos?\n\nItems pendientes podrán revisarse posteriormente.`)
      if (!confirmed) return
    }

    await confirmReconciliation(currentPeriod.id)
  }

  const exportReport = () => {
    generateReport()
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

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Reconcilia tus cuentas con los estados de cuenta bancarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={autoReconcile}
              disabled={autoReconciling}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoReconciling ? 'animate-spin' : ''}`} />
              Conciliar Auto
            </Button>
            <Button 
              variant="outline" 
              onClick={finishReconciliation}
              disabled={reconciledItems.size === 0 && !currentPeriod.id}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finalizar ({reconciledItems.size}/{reconciliationItems.length})
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Estado
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Conciliación
            </Button>
          </div>
        </div>

        {/* Reconciliation Period Summary */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{currentPeriod.accountName || 'Seleccione una cuenta'}</h3>
                <p className="text-blue-100">
                  Período: {new Date(currentPeriod.periodStart).toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'long',
                    year: 'numeric'
                  })} - {new Date(currentPeriod.periodEnd).toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {getReconciliationStatusBadge(currentPeriod.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Inicial</div>
                <div className="text-xl font-bold">
                  {formatCurrency(currentPeriod.openingBalance)}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Sistema</div>
                <div className="text-xl font-bold">
                  {formatCurrency(currentPeriod.closingBalance)}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Estado</div>
                <div className="text-xl font-bold">
                  {formatCurrency(currentPeriod.statementBalance)}
                </div>
              </div>
              <div className={`backdrop-blur-sm rounded-lg p-4 ${
                Math.abs(currentPeriod.difference) < 100 ? 'bg-green-500/30' : 'bg-red-500/30'
              }`}>
                <div className="text-sm text-blue-100 mb-1">Diferencia</div>
                <div className="text-xl font-bold">
                  {formatCurrency(Math.abs(currentPeriod.difference))}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Progreso</div>
                <div className="text-xl font-bold">
                  {reconciliationProgress.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{matchedItems}</div>
              <div className="text-sm text-green-700">Transacciones Conciliadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{discrepancyItems}</div>
              <div className="text-sm text-orange-700">Discrepancias</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(currentPeriod.totalDeposits || reconciliationItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0))}
              </div>
              <div className="text-sm text-blue-700">Total Depósitos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(Math.abs(currentPeriod.totalWithdrawals || reconciliationItems.filter(i => i.amount < 0).reduce((sum, i) => sum + i.amount, 0)))}
              </div>
              <div className="text-sm text-red-700">Total Retiros</div>
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
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="matched">Conciliadas</option>
                <option value="missing-system">Faltan en Sistema</option>
                <option value="missing-statement">Faltan en Estado</option>
                <option value="discrepancy">Discrepancias</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Conciliación ({filteredItems.length} transacciones)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transacción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sistema</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Estado Cuenta</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${
                      item.status === 'discrepancy' ? 'bg-red-50' :
                      item.status === 'missing-system' ? 'bg-orange-50' :
                      item.status === 'missing-statement' ? 'bg-blue-50' : ''
                    }`}>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(item.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {item.transactionId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {item.description}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-orange-600 mt-1">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.amount >= 0 ? '+' : ''}${Math.abs(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.systemBalance !== undefined ? (
                          `$${Math.abs(item.systemBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-orange-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.statementBalance !== undefined ? (
                          `$${Math.abs(item.statementBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-blue-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {item.status !== 'matched' && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
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
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Conciliación Bancaria</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Proceso sistemático para verificar que los registros contables coincidan con los estados de cuenta bancarios.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Matching Automático:</strong> El sistema compara transacciones por fecha, monto y descripción</li>
                  <li>• <strong>Conciliadas:</strong> Transacciones que coinciden perfectamente entre sistema y estado</li>
                  <li>• <strong>Faltan en Sistema:</strong> Movimientos en estado de cuenta no registrados (comisiones, intereses)</li>
                  <li>• <strong>Faltan en Estado:</strong> Transacciones registradas pero no reflejadas en banco (cheques pendientes)</li>
                  <li>• <strong>Discrepancias:</strong> Diferencias en montos que requieren investigación</li>
                  <li>• <strong>Resolución:</strong> Ajusta entradas, registra faltantes, investiga diferencias hasta cuadrar</li>
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
                  <CardTitle>Nueva Conciliación Bancaria</CardTitle>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg"
                      value={newReconciliationForm.accountId}
                      onChange={(e) => setNewReconciliationForm({ ...newReconciliationForm, accountId: e.target.value })}
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} - {acc.bankName} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha Inicio del Período</label>
                      <Input 
                        type="date" 
                        value={newReconciliationForm.startDate}
                        onChange={(e) => setNewReconciliationForm({ ...newReconciliationForm, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha Fin del Período</label>
                      <Input 
                        type="date" 
                        value={newReconciliationForm.endDate}
                        onChange={(e) => setNewReconciliationForm({ ...newReconciliationForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Final según Estado de Cuenta</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10"
                        value={newReconciliationForm.statementBalance}
                        onChange={(e) => setNewReconciliationForm({ ...newReconciliationForm, statementBalance: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">📋 Información</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      El proceso de conciliación comparará automáticamente:
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• Transacciones registradas en el sistema</li>
                      <li>• Movimientos del estado de cuenta bancario</li>
                      <li>• Identificará discrepancias y diferencias</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1" 
                      onClick={createReconciliation}
                      disabled={processing}
                    >
                      {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Iniciar Conciliación
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Statement Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Importar Estado de Cuenta
                  </CardTitle>
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg"
                      value={importForm.accountId}
                      onChange={(e) => setImportForm({ ...importForm, accountId: e.target.value })}
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} - {acc.bankName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-500">Formatos soportados: CSV, Excel (.xlsx), QFX/OFX</p>
                    <Button variant="outline" className="mt-4">
                      <FileText className="w-4 h-4 mr-2" />
                      Seleccionar Archivo
                    </Button>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Nota sobre importación
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Al importar, el sistema intentará hacer coincidencias automáticas con las transacciones existentes.
                      Las transacciones nuevas se crearán como pendientes de revisión.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1" 
                      onClick={importStatement}
                      disabled={processing || !importForm.accountId}
                    >
                      {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Upload className="w-4 h-4 mr-2" />
                      Importar (Demo)
                    </Button>
                    <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

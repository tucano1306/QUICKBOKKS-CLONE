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
  Bot, Brain, Zap, CheckCircle, Clock, AlertCircle,
  ThumbsUp, ThumbsDown, RefreshCw, TrendingUp, Target, Activity,
  Play, Pause
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  status: 'pending' | 'categorized' | 'reviewed' | 'rejected'
  aiCategory?: string
  aiAccount?: string
  aiConfidence?: number
  aiProcessingTime?: string
  suggestedCategories?: { category: string; account: string; confidence: number }[]
  bankAccount?: string
}

interface AIStats {
  totalProcessed: number
  categorized: number
  pending: number
  averageConfidence: number
  accuracyRate: number
  learningProgress: number
}

export default function AICategorizationPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<AIStats>({
    totalProcessed: 0, categorized: 0, pending: 0, averageConfidence: 0, accuracyRate: 0, learningProgress: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [autoMode, setAutoMode] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (activeCompany?.id) params.append('companyId', activeCompany.id)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const response = await fetch(`/api/accounting/ai-categorization?${params}`)

      if (!response.ok) throw new Error('Error al cargar datos')

      const data = await response.json()
      setTransactions(data.transactions || [])
      // Note: categories and accounts are loaded from API for future use
      setStats(data.stats || stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id, filterStatus])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, fetchData])

  const handleAutoCategorize = async () => {
    try {
      setProcessing(true)
      const ids = selectedIds.size > 0 
        ? Array.from(selectedIds) 
        : transactions.filter(t => t.status === 'pending').map(t => t.id)

      const response = await fetch('/api/accounting/ai-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-categorize',
          transactionIds: ids
        })
      })

      if (!response.ok) throw new Error('Error al categorizar')

      const data = await response.json()
      setSuccess(data.message)
      setSelectedIds(new Set())
      fetchData()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al categorizar')
    } finally {
      setProcessing(false)
    }
  }

  const handleApprove = async (transactionIds: string[]) => {
    try {
      const response = await fetch('/api/accounting/ai-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          transactionIds
        })
      })

      if (!response.ok) throw new Error('Error al aprobar')

      setSuccess('Categorización aprobada')
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleReject = async (transactionIds: string[]) => {
    try {
      const response = await fetch('/api/accounting/ai-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          transactionIds
        })
      })

      if (!response.ok) throw new Error('Error al rechazar')

      setSuccess('Categorización rechazada, transacción marcada para revisión manual')
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleTrain = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/accounting/ai-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'train' })
      })

      if (!response.ok) throw new Error('Error al entrenar')

      const data = await response.json()
      setSuccess(`${data.message}. Nueva precisión: ${data.newAccuracy}%`)
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'categorized': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'reviewed': return 'bg-blue-100 text-blue-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredTransactions = transactions.filter(t => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return t.description.toLowerCase().includes(search) ||
             t.aiCategory?.toLowerCase().includes(search) ||
             t.aiAccount?.toLowerCase().includes(search)
    }
    return true
  })

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
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600">×</button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              AI Auto-Categorización
            </h1>
            <p className="text-gray-600 mt-1">Clasificación inteligente de transacciones</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setAutoMode(!autoMode)}
              className={autoMode ? 'bg-green-50 border-green-500 text-green-700' : ''}
            >
              {autoMode ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              Modo Auto: {autoMode ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" onClick={handleTrain} disabled={processing}>
              <Zap className="w-4 h-4 mr-2" />
              Re-entrenar
            </Button>
            <Button onClick={handleAutoCategorize} disabled={processing}>
              <Bot className="w-4 h-4 mr-2" />
              {processing ? 'Procesando...' : 'Categorizar'}
            </Button>
          </div>
        </div>

        {/* AI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-xl font-bold">{stats.totalProcessed}</div>
                  <div className="text-xs text-gray-600">Procesadas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-xl font-bold">{stats.categorized}</div>
                  <div className="text-xs text-gray-600">Categorizadas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="text-xl font-bold">{stats.pending}</div>
                  <div className="text-xs text-gray-600">Pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-xl font-bold">{stats.averageConfidence.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Confianza</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-xl font-bold">{stats.accuracyRate}%</div>
                  <div className="text-xs text-gray-600">Precisión</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-indigo-600" />
                <div>
                  <div className="text-xl font-bold">{stats.learningProgress}%</div>
                  <div className="text-xs text-gray-600">Aprendizaje</div>
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
                <Input
                  type="text"
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pending">Pendientes</option>
                <option value="categorized">Categorizadas</option>
                <option value="reviewed">Revisadas</option>
                <option value="rejected">Rechazadas</option>
              </select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions with AI Suggestions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transacciones para Clasificar</CardTitle>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                  onChange={selectAll}
                />
                <span>Seleccionar todo</span>
              </label>
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(Array.from(selectedIds))}>
                    <ThumbsUp className="w-4 h-4 mr-1" /> Aprobar ({selectedIds.size})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(Array.from(selectedIds))}>
                    <ThumbsDown className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 w-12"></th>
                    <th className="text-left p-4 font-medium text-gray-600">Fecha</th>
                    <th className="text-left p-4 font-medium text-gray-600">Descripción</th>
                    <th className="text-right p-4 font-medium text-gray-600">Monto</th>
                    <th className="text-left p-4 font-medium text-gray-600">Categoría AI</th>
                    <th className="text-left p-4 font-medium text-gray-600">Cuenta</th>
                    <th className="text-center p-4 font-medium text-gray-600">Confianza</th>
                    <th className="text-center p-4 font-medium text-gray-600">Estado</th>
                    <th className="text-center p-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                          />
                        </td>
                        <td className="p-4 text-gray-900">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="text-gray-900 font-medium">{t.description}</div>
                          {t.bankAccount && <div className="text-sm text-gray-500">{t.bankAccount}</div>}
                        </td>
                        <td className={`p-4 text-right font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'credit' ? '+' : '-'}${t.amount.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-500" />
                            <span className="text-gray-900">{t.aiCategory || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{t.aiAccount || '-'}</td>
                        <td className="p-4 text-center">
                          {t.aiConfidence ? (
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(t.aiConfidence)}`}>
                              {t.aiConfidence}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={getStatusBadge(t.status)}>
                            {(() => {
                              if (t.status === 'categorized') return 'Categorizada'
                              if (t.status === 'pending') return 'Pendiente'
                              if (t.status === 'reviewed') return 'Revisada'
                              return 'Rechazada'
                            })()}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handleApprove([t.id])}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Aprobar"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleReject([t.id])}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Rechazar"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">
                        No hay transacciones para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Info Card */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Sobre la AI Auto-Categorización</h3>
                <p className="text-purple-700 text-sm">
                  El sistema de inteligencia artificial analiza patrones en las descripciones de transacciones, 
                  montos, fechas y comercios para sugerir automáticamente la categoría y cuenta contable correcta. 
                  Cuantas más transacciones apruebes o corrijas, más preciso será el modelo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

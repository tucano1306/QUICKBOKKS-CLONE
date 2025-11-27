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
  Receipt, Plus, Search, Download, Calendar, ArrowUpRight, ArrowDownRight,
  Eye, Edit, Trash2, Upload, CheckSquare, RefreshCw, AlertCircle, CheckCircle,
  Filter, FileText
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  category: string
  description: string
  account: string
  amount: number
  reference?: string
  status: 'pending' | 'completed' | 'cancelled'
  source: string
  attachments: number
}

interface Stats {
  totalIncome: number
  totalExpenses: number
  pendingCount: number
  completedCount: number
  totalCount: number
}

export default function TransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats>({ totalIncome: 0, totalExpenses: 0, pendingCount: 0, completedCount: 0, totalCount: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState('month')
  const [showImportModal, setShowImportModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (activeCompany?.id) params.append('companyId', activeCompany.id)
      if (filterType !== 'all') params.append('type', filterType)
      if (searchTerm) params.append('search', searchTerm)

      // Calcular fechas según rango
      const now = new Date()
      let startDate: Date
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      params.append('startDate', startDate.toISOString())
      params.append('endDate', now.toISOString())

      const response = await fetch(`/api/accounting/transactions?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar transacciones')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setStats(data.stats || { totalIncome: 0, totalExpenses: 0, pendingCount: 0, completedCount: 0, totalCount: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, filterType, searchTerm, dateRange])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions()
    }
  }, [status, fetchTransactions])

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').slice(1) // Skip header
      const transactions = lines
        .filter(line => line.trim())
        .map(line => {
          const [date, description, amount, category] = line.split(',')
          return {
            date: date?.trim(),
            description: description?.trim()?.replace(/"/g, ''),
            amount: parseFloat(amount?.trim() || '0'),
            category: category?.trim()?.replace(/"/g, '')
          }
        })

      const response = await fetch('/api/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          transactions,
          companyId: activeCompany?.id
        })
      })

      if (!response.ok) throw new Error('Error al importar')

      const data = await response.json()
      setSuccess(`${data.count} transacciones importadas exitosamente`)
      setShowImportModal(false)
      fetchTransactions()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    }
  }

  const handleExport = () => {
    const csv = 'Fecha,Tipo,Categoría,Descripción,Cuenta,Monto,Referencia,Estado\n' + 
      transactions.map(t => 
        `${new Date(t.date).toLocaleDateString()},${t.type},"${t.category}","${t.description}","${t.account}",${t.amount},"${t.reference || ''}",${t.status}`
      ).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacciones-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredTransactions = transactions.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
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
            <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
            <p className="text-gray-600 mt-1">Importar y clasificar transacciones</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTransactions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalIncome.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Ingresos</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-100">
                  <ArrowDownRight className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalExpenses.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Gastos</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
                  <div className="text-sm text-gray-600">Pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalCount}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64 relative">
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
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="transfer">Transferencias</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="pending">Pendientes</option>
                <option value="cancelled">Canceladas</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="week">Última semana</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="year">Este año</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Transacciones ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Fecha</th>
                    <th className="text-left p-4 font-medium text-gray-600">Tipo</th>
                    <th className="text-left p-4 font-medium text-gray-600">Descripción</th>
                    <th className="text-left p-4 font-medium text-gray-600">Categoría</th>
                    <th className="text-left p-4 font-medium text-gray-600">Cuenta</th>
                    <th className="text-right p-4 font-medium text-gray-600">Monto</th>
                    <th className="text-center p-4 font-medium text-gray-600">Estado</th>
                    <th className="text-center p-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-gray-900">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {t.type === 'income' ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            ) : t.type === 'expense' ? (
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-600" />
                            )}
                            <span className={t.type === 'income' ? 'text-green-700' : t.type === 'expense' ? 'text-red-700' : 'text-blue-700'}>
                              {t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-900">{t.description}</div>
                          {t.reference && <div className="text-sm text-gray-500">Ref: {t.reference}</div>}
                        </td>
                        <td className="p-4 text-gray-600">{t.category}</td>
                        <td className="p-4 text-gray-600">{t.account}</td>
                        <td className={`p-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : t.type === 'expense' ? 'text-red-600' : 'text-gray-900'}`}>
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${t.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={getStatusBadge(t.status)}>
                            {t.status === 'completed' ? 'Completada' : t.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        No se encontraron transacciones
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Importar Transacciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Sube un archivo CSV con el formato: Fecha, Descripción, Monto, Categoría
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Arrastra un archivo CSV o haz clic para seleccionar</p>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImport(file)
                    }}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                    Seleccionar Archivo
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

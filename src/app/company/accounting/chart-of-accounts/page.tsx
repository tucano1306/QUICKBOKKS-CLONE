'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  BookOpen, Plus, Search, Filter, Download, Upload, Edit, Trash2,
  ChevronRight, ChevronDown, Eye, DollarSign, Building2, FileText,
  Receipt, Calculator, LayoutDashboard, PieChart, ArrowRightLeft,
  RefreshCw, AlertCircle, CheckCircle, Square, CheckSquare
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  category: string
  level: number
  parentId?: string | null
  balance: number
  isActive: boolean
  description?: string
  children?: Account[]
  _count?: { journalEntries: number; budgets: number }
}

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para selección múltiple
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Formulario de nueva cuenta
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'ASSET' as Account['type'],
    category: '',
    description: '',
    parentId: ''
  })

  // Fetch accounts from API
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)
      params.append('isActive', 'true')

      const response = await fetch(`/api/accounting/chart-of-accounts?${params}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar el catálogo de cuentas')
      }

      const data = await response.json()
      
      // Organizar cuentas en estructura jerárquica
      const accountsMap = new Map<string, Account>()
      const rootAccounts: Account[] = []

      // Primero, crear mapa de todas las cuentas
      data.forEach((acc: Account) => {
        accountsMap.set(acc.id, { ...acc, children: [] })
      })

      // Luego, organizar jerarquía
      data.forEach((acc: Account) => {
        const account = accountsMap.get(acc.id)!
        if (acc.parentId && accountsMap.has(acc.parentId)) {
          const parent = accountsMap.get(acc.parentId)!
          parent.children = parent.children || []
          parent.children.push(account)
        } else {
          rootAccounts.push(account)
        }
      })

      // Ordenar por código
      const sortAccounts = (accs: Account[]): Account[] => {
        return accs.sort((a, b) => a.code.localeCompare(b.code)).map(acc => ({
          ...acc,
          children: acc.children ? sortAccounts(acc.children) : []
        }))
      }

      setAccounts(sortAccounts(rootAccounts))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAccounts()
    }
  }, [status, fetchAccounts])

  // Crear nueva cuenta
  const handleCreateAccount = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          parentId: newAccount.parentId || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear cuenta')
      }

      setSuccess('Cuenta creada exitosamente')
      setShowNewAccountModal(false)
      setNewAccount({ code: '', name: '', type: 'ASSET', category: '', description: '', parentId: '' })
      fetchAccounts()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta')
    } finally {
      setSaving(false)
    }
  }

  // Actualizar cuenta
  const handleUpdateAccount = async () => {
    if (!editingAccount) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/accounting/chart-of-accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAccount.name,
          category: editingAccount.category,
          description: editingAccount.description,
          isActive: editingAccount.isActive
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar cuenta')
      }

      setSuccess('Cuenta actualizada exitosamente')
      setEditingAccount(null)
      fetchAccounts()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar cuenta')
    } finally {
      setSaving(false)
    }
  }

  // Eliminar cuenta
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch(`/api/accounting/chart-of-accounts/${accountId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar cuenta')
      }

      setSuccess('Cuenta eliminada exitosamente')
      fetchAccounts()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cuenta')
    }
  }

  // Eliminar múltiples cuentas
  const handleDeleteMultiple = async () => {
    if (selectedAccounts.size === 0) return
    
    if (!confirm(`¿Estás seguro de eliminar ${selectedAccounts.size} cuenta(s)? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch('/api/accounting/chart-of-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedAccounts) })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar cuentas')
      }

      setSuccess(data.message || `${selectedAccounts.size} cuenta(s) eliminada(s)`)
      setSelectedAccounts(new Set())
      setSelectMode(false)
      fetchAccounts()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cuentas')
    }
  }

  // Toggle selección de cuenta
  const toggleSelectAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  // Seleccionar todas las cuentas visibles
  const selectAllAccounts = () => {
    const flattenAccounts = (accs: Account[]): string[] => {
      const result: string[] = []
      accs.forEach(acc => {
        result.push(acc.id)
        if (acc.children) result.push(...flattenAccounts(acc.children))
      })
      return result
    }
    
    const allIds = flattenAccounts(accounts)
    if (selectedAccounts.size === allIds.length) {
      setSelectedAccounts(new Set())
    } else {
      setSelectedAccounts(new Set(allIds))
    }
  }

  // Cancelar modo selección
  const cancelSelectMode = () => {
    setSelectMode(false)
    setSelectedAccounts(new Set())
  }

  // Exportar a CSV
  const handleExport = () => {
    const flattenAccounts = (accs: Account[]): Account[] => {
      const result: Account[] = []
      accs.forEach(acc => {
        result.push(acc)
        if (acc.children) result.push(...flattenAccounts(acc.children))
      })
      return result
    }
    
    const allAccounts = flattenAccounts(accounts)
    const csv = 'Código,Nombre,Tipo,Categoría,Saldo,Activa\n' + 
      allAccounts.map(acc => 
        `${acc.code},"${acc.name}",${acc.type},"${acc.category || ''}",${acc.balance || 0},${acc.isActive}`
      ).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catalogo-cuentas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'ASSET': 'text-blue-700',
      'LIABILITY': 'text-red-700',
      'EQUITY': 'text-purple-700',
      'REVENUE': 'text-green-700',
      'EXPENSE': 'text-orange-700'
    }
    return colors[type] || 'text-gray-700'
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      'ASSET': 'bg-blue-100 text-blue-700',
      'LIABILITY': 'bg-red-100 text-red-700',
      'EQUITY': 'bg-purple-100 text-purple-700',
      'REVENUE': 'bg-green-100 text-green-700',
      'EXPENSE': 'bg-orange-100 text-orange-700'
    }
    return badges[type] || 'bg-gray-100 text-gray-700'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ASSET': 'Activo',
      'LIABILITY': 'Pasivo',
      'EQUITY': 'Capital',
      'REVENUE': 'Ingreso',
      'EXPENSE': 'Gasto'
    }
    return labels[type] || type
  }

  // Filtrar cuentas por búsqueda
  const filterAccounts = (accs: Account[]): Account[] => {
    if (!searchTerm) return accs
    
    return accs.filter(acc => {
      const matchesSelf = acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          acc.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesChildren = acc.children && filterAccounts(acc.children).length > 0
      return matchesSelf || matchesChildren
    }).map(acc => ({
      ...acc,
      children: acc.children ? filterAccounts(acc.children) : []
    }))
  }

  const renderAccount = (account: Account, depth: number = 0) => {
    const isExpanded = expandedAccounts.has(account.id)
    const hasChildren = account.children && account.children.length > 0
    const indent = depth * 24

    return (
      <div key={account.id}>
        <div 
          className={`flex items-center py-3 px-4 hover:bg-gray-50 border-b border-gray-100 ${
            depth === 0 ? 'bg-gray-50 font-bold' : ''
          } ${selectedAccounts.has(account.id) ? 'bg-blue-50' : ''}`}
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          {/* Checkbox para selección múltiple */}
          {selectMode && (
            <div className="w-8 mr-2">
              <input
                type="checkbox"
                checked={selectedAccounts.has(account.id)}
                onChange={() => toggleSelectAccount(account.id)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}
          <div className="w-8">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(account.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <span className={`font-mono text-sm ${getTypeColor(account.type)}`}>
                {account.code}
              </span>
            </div>
            <div className="col-span-4">
              <span className={depth === 0 ? 'font-bold text-gray-900' : 'text-gray-700'}>
                {account.name}
              </span>
            </div>
            <div className="col-span-2">
              <span className={`text-xs px-2 py-1 rounded ${getTypeBadge(account.type)}`}>
                {getTypeLabel(account.type)}
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className={`font-semibold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                ${Math.abs(account.balance || 0).toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              {!selectMode && (
                <>
                  <button 
                    onClick={() => setEditingAccount(account)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setEditingAccount(account)}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!hasChildren && (
                    <button 
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map(child => renderAccount(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Calcular estadísticas
  const calculateStats = () => {
    const flattenAccounts = (accs: Account[]): Account[] => {
      const result: Account[] = []
      accs.forEach(acc => {
        result.push(acc)
        if (acc.children) result.push(...flattenAccounts(acc.children))
      })
      return result
    }
    
    const allAccounts = flattenAccounts(accounts)
    
    const totalAssets = allAccounts
      .filter(a => a.type === 'ASSET' && a.level === 1)
      .reduce((sum, a) => sum + (a.balance || 0), 0)
    
    const totalLiabilities = allAccounts
      .filter(a => a.type === 'LIABILITY' && a.level === 1)
      .reduce((sum, a) => sum + (a.balance || 0), 0)
    
    const totalEquity = allAccounts
      .filter(a => a.type === 'EQUITY' && a.level === 1)
      .reduce((sum, a) => sum + (a.balance || 0), 0)

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalAccounts: allAccounts.length
    }
  }

  const stats = calculateStats()

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const filteredAccounts = filterAccounts(accounts)

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
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h1>
            <p className="text-gray-600 mt-1">Plan de cuentas contable conectado a la base de datos</p>
          </div>
          <div className="flex gap-2">
            {/* Modo selección múltiple */}
            {selectMode ? (
              <>
                <Button variant="outline" onClick={selectAllAccounts}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {selectedAccounts.size > 0 ? 'Deseleccionar' : 'Seleccionar Todo'}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteMultiple}
                  disabled={selectedAccounts.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar ({selectedAccounts.size})
                </Button>
                <Button variant="outline" onClick={cancelSelectMode}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <Square className="w-4 h-4 mr-2" />
                  Seleccionar
                </Button>
                <Button variant="outline" onClick={fetchAccounts}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={() => setShowNewAccountModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cuenta
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalAssets.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Activos</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalLiabilities.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Pasivos</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalEquity.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Capital Contable</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</div>
                  <div className="text-sm text-gray-600">Total Cuentas</div>
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
                  placeholder="Buscar cuenta por código o nombre..."
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
                <option value="ASSET">Activos</option>
                <option value="LIABILITY">Pasivos</option>
                <option value="EQUITY">Capital</option>
                <option value="REVENUE">Ingresos</option>
                <option value="EXPENSE">Gastos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Plan de Cuentas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex items-center py-3 px-4 bg-gray-100 border-b font-semibold text-sm text-gray-700">
                  <div className="w-8"></div>
                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-2">Código</div>
                    <div className="col-span-4">Nombre de Cuenta</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2 text-right">Saldo</div>
                    <div className="col-span-2 text-right">Acciones</div>
                  </div>
                </div>
                <div>
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map(account => renderAccount(account))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron cuentas con ese criterio' : 'No hay cuentas registradas'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nueva Cuenta */}
        {showNewAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewAccountModal(false)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Nueva Cuenta Contable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input 
                      placeholder="1001" 
                      value={newAccount.code}
                      onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo *</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={newAccount.type}
                      onChange={(e) => setNewAccount({...newAccount, type: e.target.value as Account['type']})}
                    >
                      <option value="ASSET">Activo</option>
                      <option value="LIABILITY">Pasivo</option>
                      <option value="EQUITY">Capital</option>
                      <option value="REVENUE">Ingreso</option>
                      <option value="EXPENSE">Gasto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nombre de la Cuenta *</label>
                  <Input 
                    placeholder="Caja General"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Input 
                    placeholder="CASH, BANK, RECEIVABLES, etc."
                    value={newAccount.category}
                    onChange={(e) => setNewAccount({...newAccount, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input 
                    placeholder="Efectivo disponible en caja"
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewAccountModal(false)}>Cancelar</Button>
                  <Button onClick={handleCreateAccount} disabled={saving || !newAccount.code || !newAccount.name}>
                    {saving ? 'Guardando...' : 'Crear Cuenta'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Editar Cuenta */}
        {editingAccount && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingAccount(null)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Editar Cuenta: {editingAccount.code}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código</label>
                    <Input value={editingAccount.code} disabled className="bg-gray-100" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <Input value={getTypeLabel(editingAccount.type)} disabled className="bg-gray-100" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nombre de la Cuenta</label>
                  <Input 
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Input 
                    value={editingAccount.category || ''}
                    onChange={(e) => setEditingAccount({...editingAccount, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input 
                    value={editingAccount.description || ''}
                    onChange={(e) => setEditingAccount({...editingAccount, description: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={editingAccount.isActive}
                    onChange={(e) => setEditingAccount({...editingAccount, isActive: e.target.checked})}
                  />
                  <label className="text-sm">Cuenta activa</label>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <p>Saldo actual: <strong>${(editingAccount.balance || 0).toLocaleString()}</strong></p>
                    <p>Nivel: {editingAccount.level}</p>
                    {editingAccount._count && (
                      <>
                        <p>Asientos asociados: {editingAccount._count.journalEntries}</p>
                        <p>Presupuestos asociados: {editingAccount._count.budgets}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingAccount(null)}>Cancelar</Button>
                  <Button onClick={handleUpdateAccount} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

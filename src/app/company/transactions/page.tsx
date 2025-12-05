'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, RefreshCw, 
  Trash2, Search, X, Filter, CheckSquare, Square
} from 'lucide-react'
import { useCompany } from "@/contexts/CompanyContext"

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  category: string
  description: string | null
  amount: number
  date: string
  status: string
  notes: string | null
}

export default function TransactionsPage() {
  const { activeCompany } = useCompany()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  
  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Filtros de búsqueda
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const loadTransactions = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch (e) {
      console.error('Error loading transactions:', e)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtro por tipo
      if (filter !== 'ALL' && t.type !== filter) return false
      
      // Filtro por texto (descripción, categoría, notas)
      if (searchText) {
        const search = searchText.toLowerCase()
        const matchText = 
          (t.description?.toLowerCase().includes(search)) ||
          (t.category?.toLowerCase().includes(search)) ||
          (t.notes?.toLowerCase().includes(search))
        if (!matchText) return false
      }
      
      // Filtro por fecha desde
      if (dateFrom) {
        const transDate = new Date(t.date)
        const fromDate = new Date(dateFrom)
        if (transDate < fromDate) return false
      }
      
      // Filtro por fecha hasta
      if (dateTo) {
        const transDate = new Date(t.date)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59)
        if (transDate > toDate) return false
      }
      
      // Filtro por monto mínimo
      if (minAmount && t.amount < parseFloat(minAmount)) return false
      
      // Filtro por monto máximo
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false
      
      return true
    })
  }, [transactions, filter, searchText, dateFrom, dateTo, minAmount, maxAmount])

  // Totales basados en filtrados
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  // Selección
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

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Eliminar seleccionados
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar ${selectedIds.size} transacción(es)?\n\nEsta acción no se puede deshacer.`
    )
    
    if (!confirmDelete) return
    
    setDeleting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      
      if (res.ok) {
        alert(`${selectedIds.size} transacción(es) eliminada(s)`)
        setSelectedIds(new Set())
        loadTransactions()
      } else {
        alert('Error al eliminar')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  // Eliminar individual
  const deleteTransaction = async (id: string) => {
    const confirmDelete = window.confirm('¿Eliminar esta transacción?')
    if (!confirmDelete) return
    
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadTransactions()
      }
    } catch (e) {
      alert('Error al eliminar')
    }
  }

  // Limpiar filtros
  const clearFilters = () => {
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setFilter('ALL')
  }

  const hasActiveFilters = searchText || dateFrom || dateTo || minAmount || maxAmount

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">💰 Transacciones</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros {hasActiveFilters && '●'}
          </Button>
          <Button onClick={loadTransactions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda por texto */}
              <div>
                <label className="text-sm font-medium mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Descripción, categoría..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Fecha desde */}
              <div>
                <label className="text-sm font-medium mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              {/* Fecha hasta */}
              <div>
                <label className="text-sm font-medium mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              {/* Monto mínimo y máximo */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Monto mín</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Monto máx</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">
              Ingresos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-green-700">
                ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">
              Gastos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <span className="text-2xl font-bold text-red-700">
                ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Balance Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <span className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                ${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de acciones y filtros por tipo */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            size="sm"
          >
            Todas ({transactions.length})
          </Button>
          <Button 
            variant={filter === 'INCOME' ? 'default' : 'outline'}
            onClick={() => setFilter('INCOME')}
            size="sm"
            className={filter === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            💵 Ingresos ({transactions.filter(t => t.type === 'INCOME').length})
          </Button>
          <Button 
            variant={filter === 'EXPENSE' ? 'default' : 'outline'}
            onClick={() => setFilter('EXPENSE')}
            size="sm"
            className={filter === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            💸 Gastos ({transactions.filter(t => t.type === 'EXPENSE').length})
          </Button>
        </div>

        {/* Acciones de selección */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.size} seleccionado(s)
            </span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={deleteSelected}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Lista de Transacciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Historial de Transacciones
            {hasActiveFilters && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Mostrando {filteredTransactions.length} de {transactions.length})
              </span>
            )}
          </CardTitle>
          {filteredTransactions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedIds.size === filteredTransactions.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Deseleccionar todo
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Seleccionar todo
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {hasActiveFilters 
                ? 'No hay transacciones que coincidan con los filtros'
                : 'No hay transacciones registradas'
              }
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((t) => (
                <div 
                  key={t.id} 
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    t.type === 'INCOME' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  } ${selectedIds.has(t.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                    className="h-5 w-5"
                  />
                  
                  {/* Icono */}
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    t.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {t.type === 'INCOME' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.description || t.category}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.date).toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                    </div>
                    {t.notes && <p className="text-xs text-gray-400 mt-1 truncate">{t.notes}</p>}
                  </div>
                  
                  {/* Monto */}
                  <div className={`text-lg font-bold whitespace-nowrap ${
                    t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  
                  {/* Botón eliminar individual */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTransaction(t.id)}
                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

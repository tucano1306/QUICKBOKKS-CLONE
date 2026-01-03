'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Pagination } from "@/components/ui/pagination"
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, RefreshCw, 
  Trash2, Search, X, Filter, CheckSquare, Square, Eye, Edit, Plus
} from 'lucide-react'
import { useCompany } from "@/contexts/CompanyContext"
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'

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
  const router = useRouter()
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

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

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
      if (minAmount && t.amount < Number.parseFloat(minAmount)) return false
      
      // Filtro por monto máximo
      if (maxAmount && t.amount > Number.parseFloat(maxAmount)) return false
      
      return true
    })
  }, [transactions, filter, searchText, dateFrom, dateTo, minAmount, maxAmount])

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchText, dateFrom, dateTo, minAmount, maxAmount])

  // Calcular datos paginados
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, currentPage, pageSize])

  const totalPages = Math.ceil(filteredTransactions.length / pageSize)

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
    
    const confirmDelete = globalThis.confirm(
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
        globalThis.alert(`${selectedIds.size} transacción(es) eliminada(s)`)
        setSelectedIds(new Set())
        loadTransactions()
      } else {
        globalThis.alert('Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting transactions:', error)
      globalThis.alert('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  // Eliminar individual
  const deleteTransaction = async (id: string) => {
    const confirmDelete = globalThis.confirm('¿Eliminar esta transacción?')
    if (!confirmDelete) return
    
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadTransactions()
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      globalThis.alert('Error al eliminar')
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
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2942]">💰 Transacciones</h1>
            <p className="text-sm text-gray-500">Gestiona todos los movimientos financieros</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => router.push('/company/transactions/new?type=INCOME')} 
              className="bg-[#2CA01C] hover:bg-[#108000] shadow-lg shadow-green-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ingreso
            </Button>
            <Button 
              onClick={() => router.push('/company/transactions/new?type=EXPENSE')} 
              className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
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
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda por texto */}
              <div>
                <label htmlFor="search-text" className="text-sm font-medium mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-text"
                    placeholder="Descripción, categoría..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Fecha desde */}
              <div>
                <span className="text-sm font-medium mb-1 block">Desde</span>
                <DatePicker
                  value={dateFrom}
                  onChange={(date: string) => setDateFrom(date)}
                  placeholder="Fecha inicio"
                />
              </div>
              
              {/* Fecha hasta */}
              <div>
                <span className="text-sm font-medium mb-1 block">Hasta</span>
                <DatePicker
                  value={dateTo}
                  onChange={(date: string) => setDateTo(date)}
                  placeholder="Fecha fin"
                />
              </div>
              
              {/* Monto mínimo y máximo */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="min-amount" className="text-sm font-medium mb-1 block">Monto mín</label>
                  <Input
                    id="min-amount"
                    type="text"
                    className="amount-input"
                    placeholder="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="max-amount" className="text-sm font-medium mb-1 block">Monto máx</label>
                  <Input
                    id="max-amount"
                    type="text"
                    className="amount-input"
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
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#108000] font-semibold">
              Ingresos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#2CA01C] flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#108000]">
                ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 font-semibold">
              Gastos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-red-700">
                ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0077C5] font-semibold">Balance Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#0077C5] flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-[#0077C5]' : 'text-red-700'}`}>
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
            className={filter === 'ALL' ? 'bg-[#0D2942] hover:bg-[#1a3a5c]' : ''}
          >
            Todas ({transactions.length})
          </Button>
          <Button 
            variant={filter === 'INCOME' ? 'default' : 'outline'}
            onClick={() => setFilter('INCOME')}
            size="sm"
            className={filter === 'INCOME' ? 'bg-[#2CA01C] hover:bg-[#108000]' : ''}
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
          {loading && (
            <div className="text-center py-8">Cargando...</div>
          )}
          {!loading && filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {hasActiveFilters 
                ? 'No hay transacciones que coincidan con los filtros'
                : 'No hay transacciones registradas'
              }
            </div>
          )}
          {!loading && filteredTransactions.length > 0 && (
            <div className="space-y-3">
              {paginatedTransactions.map((t) => (
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
                        {(() => {
                          // Parsear la fecha como UTC y ajustar a local para evitar desplazamiento de día
                          const dateStr = t.date.split('T')[0]; // Obtener solo YYYY-MM-DD
                          const [year, month, day] = dateStr.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        })()}
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
                  
                  {/* Botones de acción */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/company/transactions/${t.id}`)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/company/transactions/${t.id}/edit`)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTransaction(t.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Paginación */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </CompanyTabsLayout>
  )
}

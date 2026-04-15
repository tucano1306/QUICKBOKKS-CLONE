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
  Trash2, Search, X, Filter, CheckSquare, Square, Eye, Edit, Plus,
  Download, FileText
} from 'lucide-react'
import { useCompany } from "@/contexts/CompanyContext"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  const [filterCategory, setFilterCategory] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showFilters, setShowFilters] = useState(true)

  // Filtro por mes y año específico
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Categorías únicas para el dropdown (derivadas de los datos)
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category).filter(Boolean))
    return Array.from(cats).sort((a, b) => a.localeCompare(b))
  }, [transactions])

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const loadTransactions = useCallback(async () => {
    if (!activeCompany?.id) return
    
    // Limpiar transacciones anteriores al cambiar de empresa
    setTransactions([])
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?companyId=${activeCompany.id}&limit=5000`)
      if (res.ok) {
        const data = await res.json()
        console.log(`[Transactions] Cargadas ${data.transactions?.length || 0} transacciones para empresa: ${activeCompany.name} (${activeCompany.id})`)
        setTransactions(data.transactions || [])
      }
    } catch (e) {
      console.error('Error loading transactions:', e)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, activeCompany?.name])

  // Limpiar transacciones cuando cambia de empresa
  useEffect(() => {
    setTransactions([])
    setSelectedIds(new Set())
    loadTransactions()
  }, [loadTransactions])

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtro por tipo
      if (filter !== 'ALL' && t.type !== filter) return false
      
      // Filtro por categoría
      if (filterCategory && t.category !== filterCategory) return false

      // Filtro por proveedor (busca en descripción y notas)
      if (filterVendor) {
        const search = filterVendor.toLowerCase()
        const matchVendor =
          (t.description?.toLowerCase().includes(search)) ||
          (t.notes?.toLowerCase().includes(search))
        if (!matchVendor) return false
      }

      // Filtro por descripción
      if (filterDescription) {
        const search = filterDescription.toLowerCase()
        if (!t.description?.toLowerCase().includes(search)) return false
      }
      
      // Filtro por fecha desde (comparar solo fecha, ignorando hora)
      if (dateFrom) {
        const transDate = new Date(t.date)
        // Parsear dateFrom como fecha local (no UTC) para evitar desfase de timezone
        const [yearFrom, monthFrom, dayFrom] = dateFrom.split('-').map(Number)
        const fromDate = new Date(yearFrom, monthFrom - 1, dayFrom, 0, 0, 0)
        // Comparar usando fechas locales normalizadas al inicio del día
        const transDateLocal = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate(), 0, 0, 0)
        if (transDateLocal < fromDate) return false
      }
      
      // Filtro por fecha hasta (comparar solo fecha, ignorando hora)
      if (dateTo) {
        const transDate = new Date(t.date)
        // Parsear dateTo como fecha local (no UTC) para evitar desfase de timezone
        const [yearTo, monthTo, dayTo] = dateTo.split('-').map(Number)
        const toDate = new Date(yearTo, monthTo - 1, dayTo, 23, 59, 59)
        // Comparar usando fechas locales normalizadas al final del día
        const transDateLocal = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate(), 23, 59, 59)
        if (transDateLocal > toDate) return false
      }
      
      // Filtro por monto mínimo
      if (minAmount && t.amount < Number.parseFloat(minAmount)) return false
      
      // Filtro por monto máximo
      if (maxAmount && t.amount > Number.parseFloat(maxAmount)) return false

      // Filtro por mes y año específico (usar UTC para evitar problemas de timezone)
      if (filterMonth || filterYear) {
        const transDate = new Date(t.date)
        // Usar métodos UTC para evitar conversión a zona horaria local
        const transMonth = transDate.getUTCMonth() + 1
        const transYear = transDate.getUTCFullYear()
        
        if (filterMonth && filterYear) {
          const month = Number.parseInt(filterMonth)
          const year = Number.parseInt(filterYear)
          if (transMonth !== month || transYear !== year) return false
        } else if (filterMonth) {
          const month = Number.parseInt(filterMonth)
          if (transMonth !== month) return false
        } else if (filterYear) {
          const year = Number.parseInt(filterYear)
          if (transYear !== year) return false
        }
      }
      
      return true
    })
  }, [transactions, filter, filterCategory, filterVendor, filterDescription, dateFrom, dateTo, minAmount, maxAmount, filterMonth, filterYear])

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, filterCategory, filterVendor, filterDescription, dateFrom, dateTo, minAmount, maxAmount, filterMonth, filterYear])

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
    if (!activeCompany?.id) return
    
    const confirmDelete = globalThis.confirm('¿Eliminar esta transacción?')
    if (!confirmDelete) return
    
    try {
      const res = await fetch(`/api/transactions/${id}?companyId=${activeCompany.id}`, { method: 'DELETE' })
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
    setFilterCategory('')
    setFilterVendor('')
    setFilterDescription('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setFilter('ALL')
    setFilterMonth('')
    setFilterYear('')
  }

  const hasActiveFilters = filterCategory || filterVendor || filterDescription || dateFrom || dateTo || minAmount || maxAmount || filterMonth || filterYear

  // Exportar a CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      globalThis.alert('No hay transacciones para exportar')
      return
    }

    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Estado']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('es-MX'),
      t.type === 'INCOME' ? 'Ingreso' : t.type === 'EXPENSE' ? 'Gasto' : 'Transferencia',
      t.category || '',
      t.description || '',
      t.amount.toFixed(2),
      t.status
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Exportar a PDF
  const exportToPDF = () => {
    if (filteredTransactions.length === 0) {
      globalThis.alert('No hay transacciones para exportar a PDF')
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Header con color corporativo
    doc.setFillColor(0, 119, 197)
    doc.rect(0, 0, pageWidth, 45, 'F')
    
    // Título
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Reporte de Transacciones', pageWidth / 2, 20, { align: 'center' })
    
    // Subtítulo con fecha
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const today = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    doc.text(`Generado: ${today}`, pageWidth / 2, 30, { align: 'center' })
    
    // Filtros aplicados
    let filterText = 'Todas las transacciones'
    const filters: string[] = []
    if (filter !== 'ALL') filters.push(filter === 'INCOME' ? 'Solo Ingresos' : 'Solo Gastos')
    if (filterCategory) filters.push(`Categoría: ${filterCategory}`)
    if (filterVendor) filters.push(`Proveedor: ${filterVendor}`)
    if (filterDescription) filters.push(`Descripción: ${filterDescription}`)
    if (dateFrom) filters.push(`Desde: ${dateFrom}`)
    if (dateTo) filters.push(`Hasta: ${dateTo}`)
    if (minAmount) filters.push(`Mín: $${minAmount}`)
    if (maxAmount) filters.push(`Máx: $${maxAmount}`)
    if (filters.length > 0) filterText = filters.join(' | ')
    
    doc.setFontSize(9)
    doc.text(filterText, pageWidth / 2, 38, { align: 'center' })
    
    // Resumen estadístico
    doc.setTextColor(51, 51, 51)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 52, pageWidth - 28, 28, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN FINANCIERO', 20, 62)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    const incomeTotal = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
    const expenseTotal = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
    const netBalance = incomeTotal - expenseTotal
    
    doc.setTextColor(16, 128, 0)
    doc.text(`Ingresos: $${incomeTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, 72)
    doc.setTextColor(220, 38, 38)
    doc.text(`Gastos: $${expenseTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 75, 72)
    doc.setTextColor(netBalance >= 0 ? 0 : 220, netBalance >= 0 ? 119 : 38, netBalance >= 0 ? 197 : 38)
    doc.text(`Balance: $${netBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 130, 72)
    doc.setTextColor(51, 51, 51)
    doc.text(`Total: ${filteredTransactions.length} transacciones`, 175, 72)
    
    // Tabla de transacciones
    const tableData = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      t.type === 'INCOME' ? '↑ Ingreso' : t.type === 'EXPENSE' ? '↓ Gasto' : '⇄ Transfer',
      t.category || '-',
      (t.description || '-').length > 30 ? (t.description || '').substring(0, 30) + '...' : (t.description || '-'),
      `$${t.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      t.status
    ])
    
    autoTable(doc, {
      startY: 88,
      head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 119, 197],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 30 },
        3: { cellWidth: 55 },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 22, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
        doc.text(
          'ComputoPlus - Sistema de Contabilidad',
          14,
          doc.internal.pageSize.getHeight() - 10
        )
      }
    })
    
    // Guardar PDF
    const typeLabel = filter === 'INCOME' ? 'ingresos' : filter === 'EXPENSE' ? 'gastos' : 'transacciones'
    const fileName = `reporte_${typeLabel}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2942]">💰 Transacciones</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Gestiona todos los movimientos financieros
              {activeCompany && (
                <span className="ml-2 text-[#0077C5] font-medium">• {activeCompany.name}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              size="sm"
              onClick={() => router.push('/company/transactions/new?type=INCOME')} 
              className="flex-1 sm:flex-none bg-[#2CA01C] hover:bg-[#108000] shadow-lg shadow-green-500/25"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo</span> Ingreso
            </Button>
            <Button 
              size="sm"
              onClick={() => router.push('/company/transactions/new?type=EXPENSE')} 
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo</span> Gasto
            </Button>
            <Button size="sm" onClick={() => setShowFilters(!showFilters)} variant="outline" className="flex-1 sm:flex-none">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtros</span> {hasActiveFilters && '●'}
            </Button>
            <Button size="sm" onClick={exportToCSV} variant="outline" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button 
              size="sm" 
              onClick={exportToPDF} 
              variant="outline" 
              className="flex-1 sm:flex-none text-[#0077C5] border-[#0077C5] hover:bg-[#0077C5] hover:text-white"
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button size="sm" onClick={loadTransactions} variant="outline" className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            {/* Fila 1: Categoría, Proveedor, Descripción */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por Categoría */}
              <div>
                <label htmlFor="filter-category" className="text-sm font-medium mb-1 block">Categoría</label>
                <select
                  id="filter-category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todas las categorías</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Proveedor */}
              <div>
                <label htmlFor="filter-vendor" className="text-sm font-medium mb-1 block">Nombre de proveedor</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="filter-vendor"
                    placeholder="Ej: Amazon, Walmart..."
                    value={filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filtro por Descripción */}
              <div>
                <label htmlFor="filter-description" className="text-sm font-medium mb-1 block">Descripción</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="filter-description"
                    placeholder="Buscar en descripción..."
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Fechas y montos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
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

              {/* Placeholder para alinear */}
              <div />
            </div>

            {/* Segunda fila - Filtro por Mes y Año */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              {/* Filtro por Mes */}
              <div>
                <label htmlFor="trans-filter-month" className="text-sm font-medium mb-1 block">📅 Mes específico</label>
                <select
                  id="trans-filter-month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los meses</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>

              {/* Filtro por Año */}
              <div>
                <label htmlFor="trans-filter-year" className="text-sm font-medium mb-1 block">📆 Año específico</label>
                <select
                  id="trans-filter-year"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los años</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Indicador de filtro activo */}
              <div className="flex items-end lg:col-span-2">
                {(filterMonth || filterYear) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-sm text-green-700">
                    <span>🔍 Filtrando: {filterMonth ? ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][Number.parseInt(filterMonth)] : 'Todos los meses'} {filterYear || 'Todos los años'}</span>
                    <button 
                      onClick={() => { setFilterMonth(''); setFilterYear(''); }}
                      className="text-green-500 hover:text-green-700 font-medium"
                    >
                      ✕
                    </button>
                  </div>
                )}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-[#108000] font-semibold">
              Ingresos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#2CA01C] flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-lg sm:text-2xl font-bold text-[#108000] truncate">
                ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-red-700 font-semibold">
              Gastos {hasActiveFilters ? '(Filtrados)' : 'Totales'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-lg sm:text-2xl font-bold text-red-700 truncate">
                ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-[#0077C5] font-semibold">Balance Neto</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0077C5] flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className={`text-lg sm:text-2xl font-bold truncate ${totalIncome - totalExpense >= 0 ? 'text-[#0077C5]' : 'text-red-700'}`}>
                ${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de acciones y filtros por tipo */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            size="sm"
            className={filter === 'ALL' ? 'bg-[#0D2942] hover:bg-[#1a3a5c]' : ''}
          >
            Todas <span className="hidden sm:inline">({transactions.length})</span>
          </Button>
          <Button 
            variant={filter === 'INCOME' ? 'default' : 'outline'}
            onClick={() => setFilter('INCOME')}
            size="sm"
            className={filter === 'INCOME' ? 'bg-[#2CA01C] hover:bg-[#108000]' : ''}
          >
            💵 <span className="hidden sm:inline">Ingresos ({transactions.filter(t => t.type === 'INCOME').length})</span>
          </Button>
          <Button 
            variant={filter === 'EXPENSE' ? 'default' : 'outline'}
            onClick={() => setFilter('EXPENSE')}
            size="sm"
            className={filter === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            💸 <span className="hidden sm:inline">Gastos ({transactions.filter(t => t.type === 'EXPENSE').length})</span>
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
              title={deleting ? 'Eliminando...' : 'Eliminar seleccionados'}
            >
              <Trash2 className="h-4 w-4" />
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
                  className={`p-3 sm:p-4 rounded-lg border transition-all ${
                    t.type === 'INCOME' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  } ${selectedIds.has(t.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {/* Layout Mobile */}
                  <div className="flex items-start gap-2 sm:hidden">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleSelect(t.id)}
                      className="h-5 w-5 mt-0.5 flex-shrink-0"
                    />
                    
                    {/* Icono */}
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${
                      t.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {t.type === 'INCOME' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    
                    {/* Contenido principal mobile */}
                    <div className="flex-1 min-w-0">
                      {/* Descripción y monto */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
                          {t.description || t.category}
                        </p>
                        <div className={`text-base font-bold whitespace-nowrap ${
                          t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      
                      {/* Fecha y categoría */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {(() => {
                            const dateStr = t.date.split('T')[0];
                            const [year, month, day] = dateStr.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return localDate.toLocaleDateString('es-ES', { 
                              day: '2-digit',
                              month: 'short'
                            });
                          })()}
                        </span>
                        <span className="text-gray-400">•</span>
                        <Badge variant="outline" className="text-xs py-0 h-5">{t.category}</Badge>
                      </div>
                      
                      {/* Notas si existen */}
                      {t.notes && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{t.notes}</p>
                      )}
                      
                      {/* Botones de acción mobile */}
                      <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/company/transactions/${t.id}`)}
                          className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-8 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/company/transactions/${t.id}/edit`)}
                          className="flex-1 text-green-600 hover:text-green-800 hover:bg-green-100 h-8 text-xs"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTransaction(t.id)}
                          className="flex-1 text-red-600 hover:text-red-800 hover:bg-red-100 h-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Layout Desktop */}
                  <div className="hidden sm:flex items-center gap-3">
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
                            const dateStr = t.date.split('T')[0];
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

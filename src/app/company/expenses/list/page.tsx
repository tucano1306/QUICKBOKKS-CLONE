'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Download,
  Upload,
  Filter,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  AlertCircle,
  Square,
  CheckSquare
} from 'lucide-react'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  vendor: string | null
  paymentMethod: string
  status: string
  taxDeductible: boolean
  reference: string | null
  category: {
    id: string
    name: string
    type: string
  }
  employee: {
    name: string
  } | null
  createdAt: string
}

export default function ExpensesListPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categories, setCategories] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    deductibleAmount: 0
  })

  // Estados para selección múltiple
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Estados para filtro de fechas
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load expenses and categories
  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load expenses
      const expensesRes = await fetch('/api/expenses')
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        // La API puede devolver { data: [...] } o un array directo
        const expensesArray = Array.isArray(expensesData) 
          ? expensesData 
          : (expensesData.data || [])
        setExpenses(expensesArray)
        setFilteredExpenses(expensesArray)
        calculateStats(expensesArray)
      } else {
        // Si hay error, inicializar con arrays vacíos
        setExpenses([])
        setFilteredExpenses([])
      }

      // Load categories
      const categoriesRes = await fetch('/api/expenses/categories')
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      } else {
        setCategories([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Asegurar que los estados siempre sean arrays
      setExpenses([])
      setFilteredExpenses([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: Expense[]) => {
    const stats = {
      total: data.length,
      pending: data.filter(e => e.status === 'PENDING').length,
      approved: data.filter(e => e.status === 'APPROVED').length,
      rejected: data.filter(e => e.status === 'REJECTED').length,
      totalAmount: data.reduce((sum, e) => sum + e.amount, 0),
      deductibleAmount: data.filter(e => e.taxDeductible).reduce((sum, e) => sum + e.amount, 0)
    }
    setStats(stats)
  }

  // Filter expenses
  useEffect(() => {
    let filtered = expenses

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        e =>
          e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.category.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(e => e.category.id === categoryFilter)
    }

    // Date from filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(e => new Date(e.date) >= fromDate)
    }

    // Date to filter
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(e => new Date(e.date) <= toDate)
    }

    setFilteredExpenses(filtered)
  }, [searchTerm, statusFilter, categoryFilter, dateFrom, dateTo, expenses])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setExpenses(expenses.filter(e => e.id !== id))
        setMessage({ type: 'success', text: 'Gasto eliminado correctamente' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar el gasto' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error al eliminar el gasto' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Eliminar múltiples gastos
  const handleDeleteMultiple = async () => {
    if (selectedExpenses.size === 0) return
    
    if (!confirm(`¿Estás seguro de eliminar ${selectedExpenses.size} gasto(s)? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedExpenses) })
      })

      const data = await response.json()

      if (response.ok) {
        setExpenses(expenses.filter(e => !selectedExpenses.has(e.id)))
        setMessage({ type: 'success', text: data.message || `${selectedExpenses.size} gasto(s) eliminado(s)` })
        setSelectedExpenses(new Set())
        setSelectMode(false)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar gastos' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error al eliminar gastos' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Cambiar estado de múltiples gastos
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedExpenses.size === 0) return
    
    const statusLabels: Record<string, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      PAID: 'Pagado'
    }

    try {
      const response = await fetch('/api/expenses/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedExpenses),
          status: newStatus 
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Actualizar estado local
        setExpenses(expenses.map(e => 
          selectedExpenses.has(e.id) ? { ...e, status: newStatus } : e
        ))
        setMessage({ 
          type: 'success', 
          text: `${selectedExpenses.size} gasto(s) cambiado(s) a "${statusLabels[newStatus]}"` 
        })
        setSelectedExpenses(new Set())
        setSelectMode(false)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar gastos' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error al actualizar gastos' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Toggle selección de gasto
  const toggleSelectExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses)
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId)
    } else {
      newSelected.add(expenseId)
    }
    setSelectedExpenses(newSelected)
  }

  // Seleccionar todos los gastos filtrados
  const selectAllExpenses = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set())
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)))
    }
  }

  // Cancelar modo selección
  const cancelSelectMode = () => {
    setSelectMode(false)
    setSelectedExpenses(new Set())
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/expenses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })

      if (response.ok) {
        const updated = await response.json()
        setExpenses(expenses.map(e => (e.id === id ? updated : e)))
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const exportToCSV = () => {
    if (!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) {
      setMessage({ type: 'error', text: 'No hay gastos para exportar' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const headers = ['Fecha', 'Descripción', 'Categoría', 'Proveedor', 'Monto', 'Estado', 'Deducible']
    const rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString('es-MX'),
      e.description,
      e.category.name,
      e.vendor || '',
      e.amount.toFixed(2),
      e.status,
      e.taxDeductible ? 'Sí' : 'No'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PAID':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-blue-100 text-blue-800'
    }
    const labels = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      PAID: 'Pagado'
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {getStatusIcon(status)}
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Cargando gastos...</div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Gastos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona y controla todos los gastos de tu empresa
            </p>
          </div>
          <div className="flex gap-3">
            {/* Modo selección múltiple */}
            {selectMode ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={selectAllExpenses}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedExpenses.size === filteredExpenses.length ? 'Deseleccionar' : 'Seleccionar Todo'}
                </Button>
                
                {/* Acciones de estado */}
                <div className="flex gap-1 border-l pl-2 ml-1">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange('APPROVED')}
                    disabled={selectedExpenses.size === 0}
                    className="text-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprobar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange('REJECTED')}
                    disabled={selectedExpenses.size === 0}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rechazar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange('PENDING')}
                    disabled={selectedExpenses.size === 0}
                    className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pendiente
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange('PAID')}
                    disabled={selectedExpenses.size === 0}
                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Pagado
                  </Button>
                </div>

                <div className="flex gap-1 border-l pl-2 ml-1">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteMultiple}
                    disabled={selectedExpenses.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar ({selectedExpenses.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelSelectMode}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <Square className="h-4 w-4 mr-2" />
                  Seleccionar
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={() => router.push('/company/expenses/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Gastado</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  ${stats.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-600 mt-1">{stats.total} gastos</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
                <p className="text-xs text-yellow-600 mt-1">Por aprobar</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-600">Aprobados</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.approved}</p>
                <p className="text-xs text-green-600 mt-1">Este mes</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-600">Deducibles</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  ${stats.deductibleAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-purple-600 mt-1">Para impuestos</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descripción, proveedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
              <option value="PAID">Pagados</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas las categorías</option>
              {Array.isArray(categories) && categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Segunda fila con botón de limpiar */}
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {filteredExpenses.length} de {expenses.length} gastos
              {(dateFrom || dateTo) && (
                <span className="ml-2 text-blue-600">
                  • Filtrando por fecha
                </span>
              )}
            </div>
            {/* Clear Filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setCategoryFilter('ALL')
                setDateFrom('')
                setDateTo('')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {/* Columna de checkbox para selección múltiple */}
                  {selectMode && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                        onChange={selectAllExpenses}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!Array.isArray(filteredExpenses) || filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={selectMode ? 8 : 7} className="px-6 py-12 text-center">
                      <Receipt className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 mb-4">
                        {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                          ? 'No se encontraron gastos con los filtros aplicados'
                          : 'No hay gastos registrados'}
                      </p>
                      <Button onClick={() => router.push('/company/expenses/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Gasto
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr 
                      key={expense.id} 
                      className={`hover:bg-gray-50 ${selectedExpenses.has(expense.id) ? 'bg-blue-50' : ''}`}
                    >
                      {/* Checkbox para selección múltiple */}
                      {selectMode && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        {expense.reference && (
                          <div className="text-xs text-gray-500">Ref: {expense.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {expense.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className="font-semibold text-gray-900">
                          ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        {expense.taxDeductible && (
                          <div className="text-xs text-green-600">Deducible</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {!selectMode && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => router.push(`/company/expenses/${expense.id}`)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/company/expenses/${expense.id}/edit`)}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={selectMode ? 5 : 4} className="px-6 py-4 text-sm font-semibold text-gray-900">
                      Total ({filteredExpenses.length} gastos)
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                      ${filteredExpenses
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

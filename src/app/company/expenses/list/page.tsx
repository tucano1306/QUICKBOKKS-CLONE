'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  Plus,
  Download,
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
  CheckSquare,
  FileText
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    id: string
    firstName: string
    lastName: string
  } | null
  createdAt: string
}

export default function ExpensesListPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
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

  // Estados para filtro de mes y año específico
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>('')

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load expenses and categories
  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeCompany])

  const loadData = async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      // Load expenses - usar limit=2000 para cargar todos los gastos
      // CRÍTICO: pasar companyId para evitar cruce de datos entre empresas
      const expensesRes = await fetch(`/api/expenses?limit=2000&companyId=${activeCompany.id}`)
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        // La API puede devolver { data: [...] } o un array directo
        const expensesArray = Array.isArray(expensesData) 
          ? expensesData 
          : (expensesData.data || [])
        console.log(`📊 Total gastos cargados: ${expensesArray.length}`)
        setExpenses(expensesArray)
        setFilteredExpenses(expensesArray)
        calculateStats(expensesArray)
      } else {
        // Si hay error, inicializar con arrays vacíos
        console.error('Error al cargar gastos:', expensesRes.status)
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

    // Search filter - búsqueda inteligente en múltiples campos
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(e => {
        // Verificar cada campo de forma segura
        const descMatch = e.description?.toLowerCase()?.includes(term) || false
        const vendorMatch = e.vendor?.toLowerCase()?.includes(term) || false
        const categoryMatch = e.category?.name?.toLowerCase()?.includes(term) || false
        // Buscar en nombre completo del empleado (firstName + lastName)
        const employeeFullName = e.employee 
          ? `${e.employee.firstName} ${e.employee.lastName}`.toLowerCase()
          : ''
        const employeeMatch = employeeFullName.includes(term)
        const refMatch = e.reference?.toLowerCase()?.includes(term) || false
        const paymentMatch = e.paymentMethod?.toLowerCase()?.includes(term) || false
        const amountMatch = e.amount?.toString()?.includes(term) || false
        
        return descMatch || vendorMatch || categoryMatch || employeeMatch || refMatch || paymentMatch || amountMatch
      })
      console.log(`🔍 Filtro "${term}": ${filtered.length} resultados de ${expenses.length} gastos`)
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(e => e.category?.id === categoryFilter)
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

    // Filtro por mes y año específico
    if (filterMonth && filterYear) {
      const month = parseInt(filterMonth)
      const year = parseInt(filterYear)
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate.getMonth() + 1 === month && expenseDate.getFullYear() === year
      })
    } else if (filterMonth) {
      const month = parseInt(filterMonth)
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate.getMonth() + 1 === month
      })
    } else if (filterYear) {
      const year = parseInt(filterYear)
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate.getFullYear() === year
      })
    }

    setFilteredExpenses(filtered)
    calculateStats(filtered) // Actualizar estadísticas con datos filtrados
    setCurrentPage(1) // Reset a página 1 cuando cambian los filtros
  }, [searchTerm, statusFilter, categoryFilter, dateFrom, dateTo, filterMonth, filterYear, expenses])

  // Calcular datos paginados
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredExpenses.slice(start, start + pageSize)
  }, [filteredExpenses, currentPage, pageSize])

  const totalPages = Math.ceil(filteredExpenses.length / pageSize)

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

  const _handleStatusChange = async (id: string, newStatus: string) => {
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
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const exportToPDF = () => {
    if (!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) {
      setMessage({ type: 'error', text: 'No hay gastos para exportar a PDF' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Header con gradiente simulado
    doc.setFillColor(0, 119, 197) // QuickBooks blue
    doc.rect(0, 0, pageWidth, 45, 'F')
    
    // Título principal
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Reporte de Gastos', pageWidth / 2, 20, { align: 'center' })
    
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
    let filterText = 'Todos los gastos'
    const filters: string[] = []
    if (statusFilter !== 'all') {
      const statusNames: Record<string, string> = {
        'PENDING': 'Pendientes',
        'APPROVED': 'Aprobados', 
        'REJECTED': 'Rechazados',
        'PAID': 'Pagados'
      }
      filters.push(statusNames[statusFilter] || statusFilter)
    }
    if (categoryFilter !== 'all') {
      const cat = categories.find(c => c.id === categoryFilter)
      if (cat) filters.push(`Categoría: ${cat.name}`)
    }
    if (dateFrom) filters.push(`Desde: ${dateFrom}`)
    if (dateTo) filters.push(`Hasta: ${dateTo}`)
    if (filters.length > 0) filterText = filters.join(' | ')
    
    doc.setFontSize(9)
    doc.text(filterText, pageWidth / 2, 38, { align: 'center' })
    
    // Resumen estadístico
    doc.setTextColor(51, 51, 51)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 52, pageWidth - 28, 28, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN', 20, 62)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const deductibleAmount = filteredExpenses.filter(e => e.taxDeductible).reduce((sum, e) => sum + e.amount, 0)
    const pendingCount = filteredExpenses.filter(e => e.status === 'PENDING').length
    const approvedCount = filteredExpenses.filter(e => e.status === 'APPROVED').length
    
    const col1 = 20
    const col2 = 65
    const col3 = 115
    const col4 = 160
    
    doc.text(`Total Gastos: ${filteredExpenses.length}`, col1, 72)
    doc.text(`Monto Total: $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, col2, 72)
    doc.text(`Deducibles: $${deductibleAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, col3, 72)
    doc.text(`Pendientes: ${pendingCount} | Aprobados: ${approvedCount}`, col4, 72)
    
    // Tabla de gastos
    const tableData = filteredExpenses.map(expense => [
      new Date(expense.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      expense.description.length > 35 ? expense.description.substring(0, 35) + '...' : expense.description,
      expense.category.name,
      expense.vendor || '-',
      `$${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      expense.status === 'PENDING' ? 'Pendiente' : 
        expense.status === 'APPROVED' ? 'Aprobado' : 
        expense.status === 'REJECTED' ? 'Rechazado' : 
        expense.status === 'PAID' ? 'Pagado' : expense.status,
      expense.taxDeductible ? '✓' : '-'
    ])
    
    autoTable(doc, {
      startY: 88,
      head: [['Fecha', 'Descripción', 'Categoría', 'Proveedor', 'Monto', 'Estado', 'Ded.']],
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
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer en cada página
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
    const fileName = `reporte_gastos_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    
    setMessage({ type: 'success', text: 'Reporte PDF generado exitosamente' })
    setTimeout(() => setMessage(null), 3000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-[#2CA01C]" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PAID':
        return <DollarSign className="h-4 w-4 text-[#0077C5]" />
      default:
        return <Clock className="h-4 w-4 text-amber-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
      APPROVED: 'bg-green-50 text-[#108000] border border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border border-red-200',
      PAID: 'bg-blue-50 text-[#0077C5] border border-blue-200'
    }
    const labels = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      PAID: 'Pagado'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {getStatusIcon(status)}
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#2CA01C] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Cargando gastos...</span>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 shadow-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-[#108000] border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2942]">Lista de Gastos</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Gestiona y controla todos los gastos de tu empresa
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* Modo selección múltiple */}
            {selectMode ? (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={selectAllExpenses} className="flex-1 sm:flex-none">
                  <CheckSquare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{selectedExpenses.size === filteredExpenses.length ? 'Deseleccionar' : 'Seleccionar Todo'}</span>
                </Button>
                
                {/* Acciones de estado - Solo visible en desktop */}
                <div className="hidden md:flex gap-1 border-l pl-2 ml-1">
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
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setSelectMode(true)} className="flex-shrink-0">
                  <Square className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Seleccionar</span>
                </Button>
                <Button variant="outline" onClick={exportToCSV} className="flex-shrink-0">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportToPDF}
                  className="flex-shrink-0 text-[#0077C5] border-[#0077C5] hover:bg-[#0077C5] hover:text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                <Button onClick={() => router.push('/company/expenses/new')} className="flex-shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nuevo Gasto</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Gastado</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  ${stats.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {stats.total} gastos
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Pendientes</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.pending}</p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    Por aprobar
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Aprobados</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.approved}</p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Este mes
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Deducibles</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  ${stats.deductibleAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    Para impuestos
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-2">
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
              <label htmlFor="expense-date-from" className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                id="expense-date-from"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="expense-date-to" className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                id="expense-date-to"
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

          {/* Segunda fila - Filtro por Mes y Año */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 pt-3 border-t border-gray-100">
            {/* Filtro por Mes */}
            <div>
              <label htmlFor="expense-filter-month" className="block text-xs text-gray-500 mb-1">📅 Mes</label>
              <select
                id="expense-filter-month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
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
              <label htmlFor="expense-filter-year" className="block text-xs text-gray-500 mb-1">📆 Año</label>
              <select
                id="expense-filter-year"
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
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
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <span>🔍 Filtrando: {filterMonth ? ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][parseInt(filterMonth)] : 'Todos los meses'} {filterYear || 'Todos los años'}</span>
                  <button 
                    onClick={() => { setFilterMonth(''); setFilterYear(''); }}
                    className="text-blue-500 hover:text-blue-700 font-medium"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Tercera fila con botón de limpiar */}
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {filteredExpenses.length} de {expenses.length} gastos
              {(dateFrom || dateTo) && (
                <span className="ml-2 text-blue-600">
                  • Filtrando por fecha
                </span>
              )}
              {(filterMonth || filterYear) && (
                <span className="ml-2 text-green-600">
                  • Filtrando por mes/año
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
                setFilterMonth('')
                setFilterYear('')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </Card>

        {/* Expenses List */}
        <Card className="overflow-visible">
          {/* Vista Móvil - Cards */}
          <div className="block md:hidden">
            {!Array.isArray(filteredExpenses) || filteredExpenses.length === 0 ? (
              <div className="p-6 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                    ? 'No se encontraron gastos'
                    : 'No hay gastos registrados'}
                </p>
                <Button size="sm" onClick={() => router.push('/company/expenses/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Gasto
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Mostrar TODOS los gastos filtrados en móvil, sin paginación para evitar confusión */}
                {filteredExpenses.map(expense => (
                  <div 
                    key={expense.id} 
                    className={`p-4 ${selectedExpenses.has(expense.id) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                            className="w-4 h-4 mt-1 text-blue-600 rounded border-gray-300"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{expense.description}</p>
                          <p className="text-xs text-gray-500">{expense.vendor || 'Sin proveedor'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        {expense.taxDeductible && (
                          <span className="text-xs text-green-600">Deducible</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{new Date(expense.date).toLocaleDateString('es-MX')}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {expense.category.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(expense.status)}
                      {!selectMode && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/company/expenses/${expense.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/company/expenses/${expense.id}/edit`)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vista Desktop - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  paginatedExpenses.map(expense => (
                    <tr 
                      key={expense.id} 
                      className={`hover:bg-gray-50 ${selectedExpenses.has(expense.id) ? 'bg-blue-50' : ''}`}
                    >
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        {expense.reference && (
                          <div className="text-xs text-gray-500">Ref: {expense.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {expense.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                        <div className="font-semibold text-gray-900">
                          ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        {expense.taxDeductible && (
                          <div className="text-xs text-green-600">Deducible</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {!selectMode && (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => router.push(`/company/expenses/${expense.id}`)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/company/expenses/${expense.id}/edit`)}
                              className="text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
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
                    <td colSpan={selectMode ? 5 : 4} className="px-4 py-4 text-sm font-semibold text-gray-900">
                      Total ({filteredExpenses.length} gastos)
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-right text-gray-900">
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

          {/* Paginación */}
          {filteredExpenses.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredExpenses.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          )}
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

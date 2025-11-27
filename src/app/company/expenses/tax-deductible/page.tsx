'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  Filter,
  CheckCircle
} from 'lucide-react'

interface DeductibleExpense {
  id: string
  description: string
  amount: number
  taxAmount: number
  date: string
  vendor: string | null
  category: {
    name: string
    type: string
  }
  reference: string | null
}

export default function TaxDeductibleExpensesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [expenses, setExpenses] = useState<DeductibleExpense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<DeductibleExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categories, setCategories] = useState<any[]>([])
  
  const [stats, setStats] = useState({
    totalDeductible: 0,
    totalTax: 0,
    expenseCount: 0,
    savingsEstimate: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load deductible expenses
      const response = await fetch('/api/expenses?deductible=true')
      if (response.ok) {
        const data = await response.json()
        const dataArray = Array.isArray(data) ? data : []
        const deductible = dataArray.filter((e: any) => e.taxDeductible)
        setExpenses(deductible)
        setFilteredExpenses(deductible)
        calculateStats(deductible)
      } else {
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
      setExpenses([])
      setFilteredExpenses([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: DeductibleExpense[]) => {
    const totalDeductible = data.reduce((sum, e) => sum + e.amount, 0)
    const totalTax = data.reduce((sum, e) => sum + e.taxAmount, 0)
    // Estimación de ahorro fiscal (30% del total deducible)
    const savingsEstimate = totalDeductible * 0.3

    setStats({
      totalDeductible,
      totalTax,
      expenseCount: data.length,
      savingsEstimate
    })
  }

  // Filter expenses
  useEffect(() => {
    let filtered = expenses

    // Year filter
    filtered = filtered.filter(e => new Date(e.date).getFullYear() === selectedYear)

    // Month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(e => new Date(e.date).getMonth() === selectedMonth)
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(e => e.category.name === categoryFilter)
    }

    setFilteredExpenses(filtered)
    calculateStats(filtered)
  }, [selectedYear, selectedMonth, categoryFilter, expenses])

  const exportReport = () => {
    if (!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) {
      alert('No hay gastos para exportar')
      return
    }

    const headers = ['Fecha', 'Descripción', 'Categoría', 'Proveedor', 'Monto', 'IVA', 'Referencia']
    const rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString('es-MX'),
      e.description,
      e.category.name,
      e.vendor || '',
      e.amount.toFixed(2),
      e.taxAmount.toFixed(2),
      e.reference || ''
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos_deducibles_${selectedYear}${selectedMonth !== 'all' ? `_${selectedMonth + 1}` : ''}.csv`
    a.click()
  }

  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Cargando gastos deducibles...</div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastos Deducibles de Impuestos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gastos que califican para deducciones fiscales ante el SAT
            </p>
          </div>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-600">Total Deducible</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  ${stats.totalDeductible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 mt-1">{stats.expenseCount} gastos</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600">IVA Total</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  ${stats.totalTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-600 mt-1">Acreditable</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-600">Ahorro Estimado</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  ${stats.savingsEstimate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-purple-600 mt-1">ISR 30%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-orange-600">Promedio Mensual</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  ${(stats.totalDeductible / (selectedMonth !== 'all' ? 1 : 12)).toLocaleString('es-MX', {
                    minimumFractionDigits: 2
                  })}
                </p>
                <p className="text-xs text-orange-600 mt-1">Por mes</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los meses</option>
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todas las categorías</option>
                {Array.isArray(categories) && categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear */}
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedMonth('all')
                  setCategoryFilter('ALL')
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Alert */}
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Requisitos para deducción fiscal</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Gasto estrictamente indispensable para la actividad empresarial</li>
                <li>Contar con CFDI (factura electrónica) vigente</li>
                <li>Realizar pago mediante transferencia, cheque o tarjeta (no efectivo)</li>
                <li>El proveedor debe estar registrado ante el SAT</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    IVA
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!Array.isArray(filteredExpenses) || filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600">No hay gastos deducibles en este período</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => {
                    const subtotal = expense.amount - expense.taxAmount
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{expense.description}</div>
                          {expense.reference && (
                            <div className="text-xs text-gray-500">CFDI: {expense.reference}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                          ${expense.taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-900">
                      Totales
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                      ${filteredExpenses
                        .reduce((sum, e) => sum + (e.amount - e.taxAmount), 0)
                        .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-green-600">
                      ${filteredExpenses
                        .reduce((sum, e) => sum + e.taxAmount, 0)
                        .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                      ${filteredExpenses
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
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

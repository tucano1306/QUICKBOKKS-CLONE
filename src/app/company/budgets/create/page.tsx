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
  Plus,
  Save,
  Download,
  Copy,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
  Loader2,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BudgetItem {
  id?: string
  category: string
  subcategory: string | null
  type: 'REVENUE' | 'EXPENSE'
  department: string | null
  costCenterId: string | null
  accountId: string | null
  q1Budget: number
  q2Budget: number
  q3Budget: number
  q4Budget: number
  annualBudget: number
  notes: string | null
}

interface BudgetPlan {
  id: string
  name: string
  description: string | null
  fiscalYear: number
  startDate: string
  endDate: string
  status: string
  totalRevenue: number
  totalExpense: number
  netProfit: number
  notes: string | null
  items: BudgetItem[]
}

interface CostCenter {
  id: string
  code: string
  name: string
  description?: string
  isActive: boolean
}

export default function BudgetCreatePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [existingPlans, setExistingPlans] = useState<BudgetPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  
  // Form state
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear() + 1)
  const [budgetName, setBudgetName] = useState(`Presupuesto Anual ${new Date().getFullYear() + 1}`)
  const [budgetDescription, setBudgetDescription] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Modal state
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [copySourceId, setCopySourceId] = useState<string>('')
  const [copyAdjustment, setCopyAdjustment] = useState(0)
  
  // New item form
  const [newItem, setNewItem] = useState<BudgetItem>({
    category: '',
    subcategory: null,
    type: 'EXPENSE',
    department: null,
    costCenterId: null,
    accountId: null,
    q1Budget: 0,
    q2Budget: 0,
    q3Budget: 0,
    q4Budget: 0,
    annualBudget: 0,
    notes: null
  })

  // Fetch cost centers
  const fetchCostCenters = useCallback(async () => {
    if (!activeCompany) return
    try {
      const response = await fetch(`/api/accounting/cost-centers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setCostCenters(data.costCenters || data || [])
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error)
    }
  }, [activeCompany])

  // Fetch existing budget plans
  const fetchBudgetPlans = useCallback(async () => {
    if (!activeCompany) return
    try {
      const response = await fetch(`/api/budgets/plans?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setExistingPlans(data.budgetPlans || [])
      }
    } catch (error) {
      console.error('Error fetching budget plans:', error)
    }
  }, [activeCompany])

  // Load selected plan
  const loadPlan = useCallback(async (planId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/budgets/plans/${planId}`)
      if (response.ok) {
        const data = await response.json()
        const plan = data.budgetPlan
        setBudgetName(plan.name)
        setBudgetDescription(plan.description || '')
        setBudgetYear(plan.fiscalYear)
        setBudgetItems(plan.items || [])
        setSelectedPlanId(planId)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
      toast.error('Error al cargar el presupuesto')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new budget
  const handleNewBudget = () => {
    setSelectedPlanId(null)
    setBudgetName(`Presupuesto Anual ${budgetYear}`)
    setBudgetDescription('')
    setBudgetItems([])
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      setLoading(true)
      Promise.all([fetchCostCenters(), fetchBudgetPlans()])
        .finally(() => setLoading(false))
    }
  }, [status, activeCompany, fetchCostCenters, fetchBudgetPlans])

  // Update annual budget when quarterly values change
  const updateItemBudgets = (item: BudgetItem) => {
    return {
      ...item,
      annualBudget: item.q1Budget + item.q2Budget + item.q3Budget + item.q4Budget
    }
  }

  // Add or update item
  const handleSaveItem = () => {
    const itemWithTotal = updateItemBudgets(newItem)
    
    if (!itemWithTotal.category) {
      toast.error('La categoría es requerida')
      return
    }

    if (editingIndex !== null) {
      // Update existing
      const updated = [...budgetItems]
      updated[editingIndex] = itemWithTotal
      setBudgetItems(updated)
      toast.success('Partida actualizada')
    } else {
      // Add new
      setBudgetItems([...budgetItems, itemWithTotal])
      toast.success('Partida agregada')
    }

    setShowItemModal(false)
    resetItemForm()
  }

  // Delete item
  const handleDeleteItem = (index: number) => {
    if (confirm('¿Eliminar esta partida del presupuesto?')) {
      const updated = budgetItems.filter((_, i) => i !== index)
      setBudgetItems(updated)
      toast.success('Partida eliminada')
    }
  }

  // Edit item
  const handleEditItem = (index: number) => {
    setEditingIndex(index)
    setNewItem(budgetItems[index])
    setShowItemModal(true)
  }

  // Reset item form
  const resetItemForm = () => {
    setNewItem({
      category: '',
      subcategory: null,
      type: 'EXPENSE',
      department: null,
      costCenterId: null,
      accountId: null,
      q1Budget: 0,
      q2Budget: 0,
      q3Budget: 0,
      q4Budget: 0,
      annualBudget: 0,
      notes: null
    })
    setEditingIndex(null)
  }

  // Save budget plan
  const handleSaveBudget = async () => {
    if (!activeCompany) {
      toast.error('Seleccione una empresa')
      return
    }

    if (!budgetName) {
      toast.error('El nombre del presupuesto es requerido')
      return
    }

    if (budgetItems.length === 0) {
      toast.error('Agregue al menos una partida al presupuesto')
      return
    }

    setSaving(true)
    try {
      const url = selectedPlanId 
        ? `/api/budgets/plans/${selectedPlanId}`
        : '/api/budgets/plans'
      
      const response = await fetch(url, {
        method: selectedPlanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: budgetName,
          description: budgetDescription,
          fiscalYear: budgetYear,
          startDate: `${budgetYear}-01-01`,
          endDate: `${budgetYear}-12-31`,
          items: budgetItems,
          companyId: activeCompany.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedPlanId(data.budgetPlan.id)
        toast.success(selectedPlanId ? 'Presupuesto actualizado' : 'Presupuesto creado')
        fetchBudgetPlans()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error('Error al guardar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  // Delete budget plan
  const handleDeleteBudget = async () => {
    if (!selectedPlanId) return
    
    if (!confirm('¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer.')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/budgets/plans/${selectedPlanId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Presupuesto eliminado')
        handleNewBudget()
        fetchBudgetPlans()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
      toast.error('Error al eliminar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  // Copy from another year
  const handleCopyBudget = async () => {
    if (!copySourceId) {
      toast.error('Seleccione un presupuesto fuente')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/budgets/plans/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBudgetId: copySourceId,
          targetYear: budgetYear,
          name: budgetName,
          adjustmentPercent: copyAdjustment,
          companyId: activeCompany?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setShowCopyModal(false)
        loadPlan(data.budgetPlan.id)
        fetchBudgetPlans()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al copiar')
      }
    } catch (error) {
      console.error('Error copying budget:', error)
      toast.error('Error al copiar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    if (budgetItems.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    const headers = ['Tipo', 'Departamento', 'Categoría', 'Subcategoría', 'Q1', 'Q2', 'Q3', 'Q4', 'Total Anual']
    const rows = budgetItems.map(item => [
      item.type === 'REVENUE' ? 'Ingreso' : 'Gasto',
      item.department || '',
      item.category,
      item.subcategory || '',
      item.q1Budget,
      item.q2Budget,
      item.q3Budget,
      item.q4Budget,
      item.annualBudget
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `presupuesto-${budgetYear}.csv`
    link.click()
    toast.success('Exportado exitosamente')
  }

  // Calculate totals
  const totalRevenue = budgetItems
    .filter(i => i.type === 'REVENUE')
    .reduce((sum, i) => sum + i.annualBudget, 0)
  const totalExpenses = budgetItems
    .filter(i => i.type === 'EXPENSE')
    .reduce((sum, i) => sum + i.annualBudget, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Quarterly totals
  const quarterlyData = {
    q1: {
      revenue: budgetItems.filter(i => i.type === 'REVENUE').reduce((sum, i) => sum + i.q1Budget, 0),
      expenses: budgetItems.filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.q1Budget, 0)
    },
    q2: {
      revenue: budgetItems.filter(i => i.type === 'REVENUE').reduce((sum, i) => sum + i.q2Budget, 0),
      expenses: budgetItems.filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.q2Budget, 0)
    },
    q3: {
      revenue: budgetItems.filter(i => i.type === 'REVENUE').reduce((sum, i) => sum + i.q3Budget, 0),
      expenses: budgetItems.filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.q3Budget, 0)
    },
    q4: {
      revenue: budgetItems.filter(i => i.type === 'REVENUE').reduce((sum, i) => sum + i.q4Budget, 0),
      expenses: budgetItems.filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.q4Budget, 0)
    }
  }

  // Filtered items
  const filteredItems = selectedDepartment === 'all'
    ? budgetItems
    : budgetItems.filter(i => i.department === selectedDepartment)

  // Unique departments
  const departments = Array.from(new Set(budgetItems.map(i => i.department).filter(Boolean)))

  // Department summaries
  const departmentSummaries = [...new Set([...departments, ...costCenters.map(cc => cc.name)])].map(dept => {
    const deptItems = budgetItems.filter(i => i.department === dept)
    const revenue = deptItems.filter(i => i.type === 'REVENUE').reduce((sum, i) => sum + i.annualBudget, 0)
    const expenses = deptItems.filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.annualBudget, 0)
    return {
      name: dept,
      revenue,
      expenses,
      net: revenue - expenses,
      itemCount: deptItems.length
    }
  }).filter(d => d.itemCount > 0)

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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Crear Presupuesto</h1>
            <p className="text-sm text-gray-600 mt-1">
              Planificación financiera y presupuesto anual por departamento
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCopyModal(true)}
              disabled={existingPlans.length === 0}
            >
              <Copy className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copiar de otro año</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {selectedPlanId && (
              <Button variant="outline" size="sm" onClick={handleDeleteBudget} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            )}
            <Button size="sm" onClick={handleSaveBudget} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Save className="w-4 h-4 sm:mr-2" />}
              <span className="hidden sm:inline">Guardar</span>
            </Button>
          </div>
        </div>

        {/* Budget Info */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Presupuesto
                </label>
                <Input
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="Presupuesto Anual 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año Fiscal
                </label>
                <select
                  value={budgetYear}
                  onChange={(e) => {
                    setBudgetYear(parseInt(e.target.value))
                    if (!selectedPlanId) {
                      setBudgetName(`Presupuesto Anual ${e.target.value}`)
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por Departamento
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="all">Todos los Departamentos</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept!}>{dept}</option>
                  ))}
                  {costCenters.filter(cc => !departments.includes(cc.name)).map(cc => (
                    <option key={cc.id} value={cc.name}>{cc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargar Presupuesto
                </label>
                <select
                  value={selectedPlanId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      loadPlan(e.target.value)
                    } else {
                      handleNewBudget()
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Nuevo Presupuesto --</option>
                  {existingPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.fiscalYear}) - {plan.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {budgetDescription !== undefined && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <Input
                  value={budgetDescription}
                  onChange={(e) => setBudgetDescription(e.target.value)}
                  placeholder="Descripción o notas del presupuesto"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-900">
                ${totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(2)}M` : `${(totalRevenue / 1000).toFixed(0)}K`}
              </div>
              <div className="text-xs sm:text-sm text-green-700">Ingresos Proyectados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-red-900">
                ${totalExpenses >= 1000000 ? `${(totalExpenses / 1000000).toFixed(2)}M` : `${(totalExpenses / 1000).toFixed(0)}K`}
              </div>
              <div className="text-xs sm:text-sm text-red-700">Gastos Presupuestados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <div className={`text-lg sm:text-2xl font-bold ${netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                ${Math.abs(netProfit) >= 1000000 ? `${(netProfit / 1000000).toFixed(2)}M` : `${(netProfit / 1000).toFixed(0)}K`}
              </div>
              <div className="text-xs sm:text-sm text-blue-700">Utilidad Neta</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
              <div className={`text-lg sm:text-2xl font-bold ${profitMargin >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                {profitMargin.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Margen de Utilidad</div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Projection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Proyección Trimestral</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { quarter: 'Q1', data: quarterlyData.q1 },
                { quarter: 'Q2', data: quarterlyData.q2 },
                { quarter: 'Q3', data: quarterlyData.q3 },
                { quarter: 'Q4', data: quarterlyData.q4 }
              ].map(({ quarter, data }) => (
                <div key={quarter} className="border rounded-lg p-3 sm:p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">{quarter} {budgetYear}</div>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ingresos</span>
                      <span className="font-medium text-green-600">
                        ${(data.revenue / 1000).toLocaleString()}K
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gastos</span>
                      <span className="font-medium text-red-600">
                        ${(data.expenses / 1000).toLocaleString()}K
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-500">Utilidad</span>
                      <span className={`font-bold ${data.revenue - data.expenses >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${((data.revenue - data.expenses) / 1000).toLocaleString()}K
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Summary */}
        {departmentSummaries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Resumen por Departamento</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departmentSummaries.map((dept) => (
                  <div key={dept.name} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm">{dept.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {dept.itemCount} partidas
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ingresos</span>
                        <span className="text-green-600">${dept.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gastos</span>
                        <span className="text-red-600">${dept.expenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-500">Neto</span>
                        <span className={dept.net >= 0 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}>
                          ${dept.net.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base">
              Detalle de Presupuesto por Categoría ({filteredItems.length} partidas)
            </CardTitle>
            <Button size="sm" onClick={() => { resetItemForm(); setShowItemModal(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar Partida
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {budgetItems.length === 0 ? (
              <div className="text-center py-12">
                <Info className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No hay partidas en el presupuesto</p>
                <p className="text-sm text-gray-400 mb-4">
                  Agregue partidas de ingresos y gastos para crear su presupuesto anual
                </p>
                <Button onClick={() => { resetItemForm(); setShowItemModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primera Partida
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Subcategoría</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Q1</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Q2</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Q3</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Q4</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Total Anual</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item, index) => {
                      const realIndex = budgetItems.indexOf(item)
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <Badge className={item.type === 'REVENUE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                            }>
                              {item.type === 'REVENUE' ? 'Ingreso' : 'Gasto'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{item.department || '-'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium">{item.category}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{item.subcategory || '-'}</td>
                          <td className="px-3 py-3 text-right text-sm">
                            ${item.q1Budget.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            ${item.q2Budget.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            ${item.q3Budget.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            ${item.q4Budget.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-bold">
                            ${item.annualBudget.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleEditItem(realIndex)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(realIndex)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm font-bold">Totales</td>
                      <td className="px-3 py-3 text-right text-sm font-bold">
                        ${budgetItems.reduce((sum, i) => sum + i.q1Budget, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold">
                        ${budgetItems.reduce((sum, i) => sum + i.q2Budget, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold">
                        ${budgetItems.reduce((sum, i) => sum + i.q3Budget, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold">
                        ${budgetItems.reduce((sum, i) => sum + i.q4Budget, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold">
                        ${budgetItems.reduce((sum, i) => sum + i.annualBudget, 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg hidden sm:block">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sistema de Presupuestos</h3>
                <p className="text-blue-700 text-sm">
                  Los datos del presupuesto se guardan en la base de datos y pueden ser editados, 
                  copiados a otros años con ajustes porcentuales, y comparados con los resultados 
                  reales para análisis de varianzas. El estado del presupuesto puede ser: 
                  Borrador, Pendiente de Aprobación, Aprobado, Activo, Cerrado o Cancelado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">
                {editingIndex !== null ? 'Editar Partida' : 'Agregar Partida'}
              </h3>
              <button onClick={() => { setShowItemModal(false); resetItemForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'REVENUE' | 'EXPENSE' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="REVENUE">Ingreso</option>
                    <option value="EXPENSE">Gasto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Departamento</label>
                  <select
                    value={newItem.department || ''}
                    onChange={(e) => setNewItem({ ...newItem, department: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Seleccionar --</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.name}>{cc.name}</option>
                    ))}
                    <option value="Ventas">Ventas</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operaciones">Operaciones</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Administración">Administración</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="Legal">Legal</option>
                    <option value="Producción">Producción</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría *</label>
                  <Input
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Ej: Nómina, Publicidad, Servicios"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategoría</label>
                  <Input
                    value={newItem.subcategory || ''}
                    onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value || null })}
                    placeholder="Ej: Salarios, Marketing Digital"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Q1 (Ene-Mar)</label>
                  <Input
                    type="number"
                    value={newItem.q1Budget}
                    onChange={(e) => setNewItem({ ...newItem, q1Budget: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Q2 (Abr-Jun)</label>
                  <Input
                    type="number"
                    value={newItem.q2Budget}
                    onChange={(e) => setNewItem({ ...newItem, q2Budget: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Q3 (Jul-Sep)</label>
                  <Input
                    type="number"
                    value={newItem.q3Budget}
                    onChange={(e) => setNewItem({ ...newItem, q3Budget: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Q4 (Oct-Dic)</label>
                  <Input
                    type="number"
                    value={newItem.q4Budget}
                    onChange={(e) => setNewItem({ ...newItem, q4Budget: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Anual:</span>
                  <span className="text-xl font-bold">
                    ${(newItem.q1Budget + newItem.q2Budget + newItem.q3Budget + newItem.q4Budget).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Notas o justificación del presupuesto"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => { setShowItemModal(false); resetItemForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveItem}>
                {editingIndex !== null ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Budget Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Copiar Presupuesto</h3>
              <button onClick={() => setShowCopyModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Presupuesto Fuente *</label>
                <select
                  value={copySourceId}
                  onChange={(e) => setCopySourceId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Seleccionar presupuesto base --</option>
                  {existingPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.fiscalYear}) - ${plan.totalRevenue.toLocaleString()} ingresos
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Año Destino</label>
                <select
                  value={budgetYear}
                  onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ajuste Porcentual (%)
                </label>
                <Input
                  type="number"
                  value={copyAdjustment}
                  onChange={(e) => setCopyAdjustment(parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 5 para aumentar 5%"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positivo para aumentar los valores, negativo para reducir. 
                  Útil para ajustar por inflación o crecimiento proyectado.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del Nuevo Presupuesto</label>
                <Input
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder={`Presupuesto Anual ${budgetYear}`}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCopyModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCopyBudget} disabled={saving || !copySourceId}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copiar Presupuesto
              </Button>
            </div>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

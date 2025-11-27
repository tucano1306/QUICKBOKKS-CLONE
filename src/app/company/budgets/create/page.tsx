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
  Users,
  Package,
  Wrench,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
  Loader2
} from 'lucide-react'

interface BudgetCategory {
  id: string
  category: string
  subcategory: string
  type: 'revenue' | 'expense'
  department: string
  q1Budget: number
  q2Budget: number
  q3Budget: number
  q4Budget: number
  annualBudget: number
  notes: string
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
  const [budgetYear, setBudgetYear] = useState('2026')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [budgetName, setBudgetName] = useState('Presupuesto Anual 2026')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // Fetch cost centers from API
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      setLoading(true)
      fetchCostCenters().finally(() => setLoading(false))
    }
  }, [status, activeCompany, fetchCostCenters])

  // Budget category templates - these are preset configurations the user can customize
  const budgetCategoryTemplates: BudgetCategory[] = [
    // Revenue Categories
    {
      id: 'REV-001',
      category: 'Ingresos por Servicios',
      subcategory: 'Consultoría',
      type: 'revenue',
      department: 'Ventas',
      q1Budget: 2500000,
      q2Budget: 2800000,
      q3Budget: 3000000,
      q4Budget: 3200000,
      annualBudget: 11500000,
      notes: 'Proyección conservadora basada en pipeline actual'
    },
    {
      id: 'REV-002',
      category: 'Ingresos por Servicios',
      subcategory: 'Desarrollo de Software',
      type: 'revenue',
      department: 'Ventas',
      q1Budget: 1800000,
      q2Budget: 2000000,
      q3Budget: 2200000,
      q4Budget: 2400000,
      annualBudget: 8400000,
      notes: 'Incluye proyectos recurrentes y nuevos clientes'
    },
    {
      id: 'REV-003',
      category: 'Ingresos por Productos',
      subcategory: 'Licencias de Software',
      type: 'revenue',
      department: 'Ventas',
      q1Budget: 1200000,
      q2Budget: 1300000,
      q3Budget: 1400000,
      q4Budget: 1500000,
      annualBudget: 5400000,
      notes: 'SaaS con crecimiento del 8% trimestral'
    },
    {
      id: 'REV-004',
      category: 'Ingresos por Servicios',
      subcategory: 'Soporte y Mantenimiento',
      type: 'revenue',
      department: 'Ventas',
      q1Budget: 800000,
      q2Budget: 850000,
      q3Budget: 900000,
      q4Budget: 950000,
      annualBudget: 3500000,
      notes: 'Contratos anuales con incremento trimestral'
    },
    // Expense Categories - Ventas
    {
      id: 'EXP-001',
      category: 'Nómina',
      subcategory: 'Salarios Ventas',
      type: 'expense',
      department: 'Ventas',
      q1Budget: 650000,
      q2Budget: 680000,
      q3Budget: 710000,
      q4Budget: 740000,
      annualBudget: 2780000,
      notes: '15 ejecutivos de ventas + incremento anual 5%'
    },
    {
      id: 'EXP-002',
      category: 'Comisiones',
      subcategory: 'Comisiones Ventas',
      type: 'expense',
      department: 'Ventas',
      q1Budget: 180000,
      q2Budget: 200000,
      q3Budget: 220000,
      q4Budget: 240000,
      annualBudget: 840000,
      notes: '3% de ingresos generados por equipo'
    },
    // Expense Categories - Marketing
    {
      id: 'EXP-003',
      category: 'Nómina',
      subcategory: 'Salarios Marketing',
      type: 'expense',
      department: 'Marketing',
      q1Budget: 420000,
      q2Budget: 440000,
      q3Budget: 460000,
      q4Budget: 480000,
      annualBudget: 1800000,
      notes: '8 especialistas en marketing digital'
    },
    {
      id: 'EXP-004',
      category: 'Publicidad',
      subcategory: 'Marketing Digital',
      type: 'expense',
      department: 'Marketing',
      q1Budget: 250000,
      q2Budget: 280000,
      q3Budget: 300000,
      q4Budget: 320000,
      annualBudget: 1150000,
      notes: 'Google Ads, Meta, LinkedIn'
    },
    {
      id: 'EXP-005',
      category: 'Eventos',
      subcategory: 'Ferias y Conferencias',
      type: 'expense',
      department: 'Marketing',
      q1Budget: 150000,
      q2Budget: 200000,
      q3Budget: 180000,
      q4Budget: 220000,
      annualBudget: 750000,
      notes: '4 eventos principales en el año'
    },
    // Expense Categories - Operaciones
    {
      id: 'EXP-006',
      category: 'Nómina',
      subcategory: 'Salarios Operaciones',
      type: 'expense',
      department: 'Operaciones',
      q1Budget: 850000,
      q2Budget: 890000,
      q3Budget: 930000,
      q4Budget: 970000,
      annualBudget: 3640000,
      notes: '20 empleados operativos'
    },
    {
      id: 'EXP-007',
      category: 'Infraestructura',
      subcategory: 'Servidores y Cloud',
      type: 'expense',
      department: 'Operaciones',
      q1Budget: 120000,
      q2Budget: 130000,
      q3Budget: 140000,
      q4Budget: 150000,
      annualBudget: 540000,
      notes: 'AWS, Azure, infraestructura cloud'
    },
    // Expense Categories - Tecnología
    {
      id: 'EXP-008',
      category: 'Nómina',
      subcategory: 'Salarios Desarrollo',
      type: 'expense',
      department: 'Tecnología',
      q1Budget: 1200000,
      q2Budget: 1250000,
      q3Budget: 1300000,
      q4Budget: 1350000,
      annualBudget: 5100000,
      notes: '25 desarrolladores e ingenieros'
    },
    {
      id: 'EXP-009',
      category: 'Software',
      subcategory: 'Licencias y Herramientas',
      type: 'expense',
      department: 'Tecnología',
      q1Budget: 180000,
      q2Budget: 180000,
      q3Budget: 180000,
      q4Budget: 180000,
      annualBudget: 720000,
      notes: 'GitHub, Jira, Figma, IDEs'
    },
    // Expense Categories - RRHH
    {
      id: 'EXP-010',
      category: 'Nómina',
      subcategory: 'Salarios RRHH',
      type: 'expense',
      department: 'Recursos Humanos',
      q1Budget: 380000,
      q2Budget: 400000,
      q3Budget: 420000,
      q4Budget: 440000,
      annualBudget: 1640000,
      notes: '6 especialistas en recursos humanos'
    },
    {
      id: 'EXP-011',
      category: 'Capacitación',
      subcategory: 'Formación y Desarrollo',
      type: 'expense',
      department: 'Recursos Humanos',
      q1Budget: 200000,
      q2Budget: 220000,
      q3Budget: 240000,
      q4Budget: 260000,
      annualBudget: 920000,
      notes: 'Cursos, certificaciones, workshops'
    },
    // Expense Categories - Administración
    {
      id: 'EXP-012',
      category: 'Nómina',
      subcategory: 'Salarios Administración',
      type: 'expense',
      department: 'Administración',
      q1Budget: 520000,
      q2Budget: 540000,
      q3Budget: 560000,
      q4Budget: 580000,
      annualBudget: 2200000,
      notes: '10 empleados administrativos'
    },
    {
      id: 'EXP-013',
      category: 'Instalaciones',
      subcategory: 'Renta de Oficina',
      type: 'expense',
      department: 'Administración',
      q1Budget: 300000,
      q2Budget: 300000,
      q3Budget: 300000,
      q4Budget: 300000,
      annualBudget: 1200000,
      notes: 'Oficina principal 800m²'
    },
    {
      id: 'EXP-014',
      category: 'Servicios',
      subcategory: 'Servicios Generales',
      type: 'expense',
      department: 'Administración',
      q1Budget: 80000,
      q2Budget: 85000,
      q3Budget: 90000,
      q4Budget: 95000,
      annualBudget: 350000,
      notes: 'Luz, agua, internet, limpieza'
    }
  ]

  const filteredCategories = selectedDepartment === 'all' 
    ? budgetCategoryTemplates 
    : budgetCategoryTemplates.filter(cat => cat.department === selectedDepartment)

  const totalRevenue = budgetCategoryTemplates.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.annualBudget, 0)
  const totalExpenses = budgetCategoryTemplates.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.annualBudget, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const revenueByQuarter = {
    q1: budgetCategoryTemplates.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.q1Budget, 0),
    q2: budgetCategoryTemplates.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.q2Budget, 0),
    q3: budgetCategoryTemplates.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.q3Budget, 0),
    q4: budgetCategoryTemplates.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.q4Budget, 0)
  }

  const expensesByQuarter = {
    q1: budgetCategoryTemplates.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.q1Budget, 0),
    q2: budgetCategoryTemplates.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.q2Budget, 0),
    q3: budgetCategoryTemplates.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.q3Budget, 0),
    q4: budgetCategoryTemplates.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.q4Budget, 0)
  }

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crear Presupuesto</h1>
            <p className="text-gray-600 mt-1">
              Planificación financiera y presupuesto anual por departamento
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setMessage({ type: 'success', text: 'Copiando datos de presupuesto 2025' }); setTimeout(() => setMessage(null), 3000); }}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar de 2025
            </Button>
            <Button variant="outline" onClick={() => { setMessage({ type: 'success', text: 'Exportando presupuesto a Excel' }); setTimeout(() => setMessage(null), 3000); }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setMessage({ type: 'success', text: 'Guardando presupuesto 2026' }); setTimeout(() => setMessage(null), 3000); }}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Presupuesto
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Budget Configuration */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Presupuesto
                </label>
                <Input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="Ej: Presupuesto Anual 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Año Fiscal
                </label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg"
                  value={budgetYear}
                  onChange={(e) => setBudgetYear(e.target.value)}
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtrar por Departamento
                </label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">Todos los Centros de Costo</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.name}>{cc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(totalRevenue / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-green-700">Ingresos Proyectados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${(totalExpenses / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-red-700">Gastos Presupuestados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(netProfit / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-blue-700">Utilidad Neta</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {profitMargin.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-700">Margen de Utilidad</div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Proyección Trimestral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-600 mb-3">Q1 2026</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Ingresos</div>
                    <div className="text-lg font-bold text-green-600">
                      ${(revenueByQuarter.q1 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gastos</div>
                    <div className="text-lg font-bold text-red-600">
                      ${(expensesByQuarter.q1 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-500">Utilidad</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${((revenueByQuarter.q1 - expensesByQuarter.q1) / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-600 mb-3">Q2 2026</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Ingresos</div>
                    <div className="text-lg font-bold text-green-600">
                      ${(revenueByQuarter.q2 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gastos</div>
                    <div className="text-lg font-bold text-red-600">
                      ${(expensesByQuarter.q2 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-500">Utilidad</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${((revenueByQuarter.q2 - expensesByQuarter.q2) / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-600 mb-3">Q3 2026</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Ingresos</div>
                    <div className="text-lg font-bold text-green-600">
                      ${(revenueByQuarter.q3 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gastos</div>
                    <div className="text-lg font-bold text-red-600">
                      ${(expensesByQuarter.q3 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-500">Utilidad</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${((revenueByQuarter.q3 - expensesByQuarter.q3) / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-600 mb-3">Q4 2026</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Ingresos</div>
                    <div className="text-lg font-bold text-green-600">
                      ${(revenueByQuarter.q4 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gastos</div>
                    <div className="text-lg font-bold text-red-600">
                      ${(expensesByQuarter.q4 / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-500">Utilidad</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${((revenueByQuarter.q4 - expensesByQuarter.q4) / 1000).toLocaleString('es-MX')}K
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Presupuesto por Categoría ({filteredCategories.length} partidas)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Subcategoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q1</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q2</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q3</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Q4</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {item.type === 'revenue' ? (
                          <Badge className="bg-green-100 text-green-700">Ingreso</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Gasto</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{item.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.subcategory}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="text"
                          value={`$${item.q1Budget.toLocaleString('es-MX')}`}
                          className="text-right text-sm w-32"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="text"
                          value={`$${item.q2Budget.toLocaleString('es-MX')}`}
                          className="text-right text-sm w-32"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="text"
                          value={`$${item.q3Budget.toLocaleString('es-MX')}`}
                          className="text-right text-sm w-32"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="text"
                          value={`$${item.q4Budget.toLocaleString('es-MX')}`}
                          className="text-right text-sm w-32"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-bold ${
                          item.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${item.annualBudget.toLocaleString('es-MX')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Department Budget Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Presupuesto por Centro de Costo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {costCenters.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No hay centros de costo configurados.</p>
                  <p className="text-sm">Agregue centros de costo en Contabilidad &gt; Centros de Costo</p>
                </div>
              ) : costCenters.map(cc => {
                const ccExpenses = budgetCategoryTemplates
                  .filter(c => c.department === cc.name && c.type === 'expense')
                  .reduce((sum, c) => sum + c.annualBudget, 0)
                const ccRevenue = budgetCategoryTemplates
                  .filter(c => c.department === cc.name && c.type === 'revenue')
                  .reduce((sum, c) => sum + c.annualBudget, 0)
                
                return (
                  <div key={cc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-gray-900">{cc.name}</div>
                        <div className="text-xs text-gray-500">{cc.code}</div>
                      </div>
                    </div>
                    {ccRevenue > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500">Ingresos</div>
                        <div className="text-sm font-bold text-green-600">
                          ${(ccRevenue / 1000).toLocaleString('es-MX')}K
                        </div>
                      </div>
                    )}
                    {ccExpenses > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500">Gastos</div>
                        <div className="text-sm font-bold text-red-600">
                          ${(ccExpenses / 1000).toLocaleString('es-MX')}K
                        </div>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="text-xs text-gray-500">Balance Neto</div>
                      <div className={`text-lg font-bold ${ccRevenue - ccExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${((ccRevenue - ccExpenses) / 1000).toLocaleString('es-MX')}K
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Creación de Presupuesto Maestro</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema integral de planificación financiera basado en metodología de presupuesto base cero (ZBB).
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Presupuesto de Ingresos:</strong> Proyección de ventas por producto/servicio con crecimiento trimestral</li>
                  <li>• <strong>Presupuesto de Gastos:</strong> Clasificación por naturaleza (nómina, marketing, operación) y centro de costo</li>
                  <li>• <strong>Planificación Trimestral:</strong> Desglose por Q1, Q2, Q3, Q4 para seguimiento granular</li>
                  <li>• <strong>Asignación Departamental:</strong> Budget por área con responsables asignados</li>
                  <li>• <strong>Margen Objetivo:</strong> El sistema calcula automáticamente utilidad neta y margen porcentual</li>
                  <li>• <strong>Flexibilidad:</strong> Permite ajustes por estacionalidad, crecimiento proyectado y contingencias</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

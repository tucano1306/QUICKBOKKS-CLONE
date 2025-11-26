'use client'

import { useEffect, useState } from 'react'
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
  Search,
  Download,
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Wrench,
  AlertCircle,
  PieChart,
  Calculator,
  FileText
} from 'lucide-react'

interface CostBreakdown {
  category: string
  budgeted: number
  actual: number
  variance: number
  variancePercent: number
  icon: any
}

interface ProjectCost {
  projectId: string
  projectCode: string
  projectName: string
  client: string
  status: 'active' | 'completed' | 'on-hold'
  totalBudget: number
  totalActualCost: number
  laborBudget: number
  laborActual: number
  materialsBudget: number
  materialsActual: number
  equipmentBudget: number
  equipmentActual: number
  overheadBudget: number
  overheadActual: number
  subcontractorsBudget: number
  subcontractorsActual: number
  miscBudget: number
  miscActual: number
  costVariance: number
  costVariancePercent: number
  completionPercent: number
}

export default function ProjectCostingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('PROJ-001')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const projectCosts: ProjectCost[] = [
    {
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      client: 'GlobalTech Inc.',
      status: 'active',
      totalBudget: 2500000,
      totalActualCost: 1125000,
      laborBudget: 1500000,
      laborActual: 675000,
      materialsBudget: 400000,
      materialsActual: 180000,
      equipmentBudget: 250000,
      equipmentActual: 112500,
      overheadBudget: 200000,
      overheadActual: 90000,
      subcontractorsBudget: 100000,
      subcontractorsActual: 45000,
      miscBudget: 50000,
      miscActual: 22500,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 45
    },
    {
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      client: 'Acme Corp',
      status: 'active',
      totalBudget: 850000,
      totalActualCost: 552500,
      laborBudget: 510000,
      laborActual: 331500,
      materialsBudget: 170000,
      materialsActual: 110500,
      equipmentBudget: 85000,
      equipmentActual: 55250,
      overheadBudget: 51000,
      overheadActual: 33150,
      subcontractorsBudget: 25500,
      subcontractorsActual: 16575,
      miscBudget: 8500,
      miscActual: 5525,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 65
    },
    {
      projectId: 'PROJ-003',
      projectCode: 'APP-2025-008',
      projectName: 'App Móvil Fintech - Innovatech',
      client: 'Innovatech',
      status: 'active',
      totalBudget: 1200000,
      totalActualCost: 960000,
      laborBudget: 720000,
      laborActual: 576000,
      materialsBudget: 240000,
      materialsActual: 192000,
      equipmentBudget: 120000,
      equipmentActual: 96000,
      overheadBudget: 72000,
      overheadActual: 57600,
      subcontractorsBudget: 36000,
      subcontractorsActual: 28800,
      miscBudget: 12000,
      miscActual: 9600,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 80
    },
    {
      projectId: 'PROJ-004',
      projectCode: 'INF-2025-015',
      projectName: 'Migración Cloud - Distribuidora Tech',
      client: 'Distribuidora Tech Solutions',
      status: 'active',
      totalBudget: 950000,
      totalActualCost: 522500,
      laborBudget: 570000,
      laborActual: 313500,
      materialsBudget: 190000,
      materialsActual: 104500,
      equipmentBudget: 95000,
      equipmentActual: 52250,
      overheadBudget: 57000,
      overheadActual: 31350,
      subcontractorsBudget: 28500,
      subcontractorsActual: 15675,
      miscBudget: 9500,
      miscActual: 5225,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 55
    },
    {
      projectId: 'PROJ-005',
      projectCode: 'IOT-2025-004',
      projectName: 'Plataforma IoT Industrial - ManufactureTech',
      client: 'ManufactureTech',
      status: 'active',
      totalBudget: 1450000,
      totalActualCost: 1232500,
      laborBudget: 870000,
      laborActual: 739500,
      materialsBudget: 290000,
      materialsActual: 246500,
      equipmentBudget: 145000,
      equipmentActual: 123250,
      overheadBudget: 87000,
      overheadActual: 73950,
      subcontractorsBudget: 43500,
      subcontractorsActual: 36975,
      miscBudget: 14500,
      miscActual: 12325,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 85
    },
    {
      projectId: 'PROJ-006',
      projectCode: 'CON-2025-007',
      projectName: 'Consultoría Transformación Digital - RetailCorp',
      client: 'RetailCorp',
      status: 'completed',
      totalBudget: 650000,
      totalActualCost: 620000,
      laborBudget: 455000,
      laborActual: 434000,
      materialsBudget: 97500,
      materialsActual: 93000,
      equipmentBudget: 45500,
      equipmentActual: 43400,
      overheadBudget: 32500,
      overheadActual: 31000,
      subcontractorsBudget: 13000,
      subcontractorsActual: 12400,
      miscBudget: 6500,
      miscActual: 6200,
      costVariance: -30000,
      costVariancePercent: -4.6,
      completionPercent: 100
    },
    {
      projectId: 'PROJ-007',
      projectCode: 'DATA-2025-010',
      projectName: 'Business Intelligence Dashboard - Analytics Pro',
      client: 'Analytics Pro',
      status: 'active',
      totalBudget: 720000,
      totalActualCost: 180000,
      laborBudget: 432000,
      laborActual: 108000,
      materialsBudget: 144000,
      materialsActual: 36000,
      equipmentBudget: 72000,
      equipmentActual: 18000,
      overheadBudget: 43200,
      overheadActual: 10800,
      subcontractorsBudget: 21600,
      subcontractorsActual: 5400,
      miscBudget: 7200,
      miscActual: 1800,
      costVariance: 0,
      costVariancePercent: 0,
      completionPercent: 25
    },
    {
      projectId: 'PROJ-008',
      projectCode: 'WEB-2025-018',
      projectName: 'Rediseño Sitio Corporativo - BrandCo',
      client: 'BrandCo',
      status: 'completed',
      totalBudget: 320000,
      totalActualCost: 304000,
      laborBudget: 224000,
      laborActual: 212800,
      materialsBudget: 48000,
      materialsActual: 45600,
      equipmentBudget: 22400,
      equipmentActual: 21280,
      overheadBudget: 16000,
      overheadActual: 15200,
      subcontractorsBudget: 6400,
      subcontractorsActual: 6080,
      miscBudget: 3200,
      miscActual: 3040,
      costVariance: -16000,
      costVariancePercent: -5.0,
      completionPercent: 100
    }
  ]

  const selectedProjectData = projectCosts.find(p => p.projectId === selectedProject) || projectCosts[0]

  const costBreakdown: CostBreakdown[] = [
    {
      category: 'Mano de Obra',
      budgeted: selectedProjectData.laborBudget,
      actual: selectedProjectData.laborActual,
      variance: selectedProjectData.laborBudget - selectedProjectData.laborActual,
      variancePercent: ((selectedProjectData.laborActual / selectedProjectData.laborBudget - 1) * 100),
      icon: Users
    },
    {
      category: 'Materiales',
      budgeted: selectedProjectData.materialsBudget,
      actual: selectedProjectData.materialsActual,
      variance: selectedProjectData.materialsBudget - selectedProjectData.materialsActual,
      variancePercent: ((selectedProjectData.materialsActual / selectedProjectData.materialsBudget - 1) * 100),
      icon: Package
    },
    {
      category: 'Equipamiento',
      budgeted: selectedProjectData.equipmentBudget,
      actual: selectedProjectData.equipmentActual,
      variance: selectedProjectData.equipmentBudget - selectedProjectData.equipmentActual,
      variancePercent: ((selectedProjectData.equipmentActual / selectedProjectData.equipmentBudget - 1) * 100),
      icon: Wrench
    },
    {
      category: 'Gastos Generales',
      budgeted: selectedProjectData.overheadBudget,
      actual: selectedProjectData.overheadActual,
      variance: selectedProjectData.overheadBudget - selectedProjectData.overheadActual,
      variancePercent: ((selectedProjectData.overheadActual / selectedProjectData.overheadBudget - 1) * 100),
      icon: FileText
    },
    {
      category: 'Subcontratistas',
      budgeted: selectedProjectData.subcontractorsBudget,
      actual: selectedProjectData.subcontractorsActual,
      variance: selectedProjectData.subcontractorsBudget - selectedProjectData.subcontractorsActual,
      variancePercent: ((selectedProjectData.subcontractorsActual / selectedProjectData.subcontractorsBudget - 1) * 100),
      icon: Users
    },
    {
      category: 'Misceláneos',
      budgeted: selectedProjectData.miscBudget,
      actual: selectedProjectData.miscActual,
      variance: selectedProjectData.miscBudget - selectedProjectData.miscActual,
      variancePercent: ((selectedProjectData.miscActual / selectedProjectData.miscBudget - 1) * 100),
      icon: DollarSign
    }
  ]

  const getVarianceBadge = (variance: number, variancePercent: number) => {
    if (Math.abs(variancePercent) < 5) {
      return <Badge className="bg-green-100 text-green-700">
        En Presupuesto
      </Badge>
    } else if (variancePercent > 0) {
      return <Badge className="bg-orange-100 text-orange-700">
        Sobre Presupuesto +{Math.abs(variancePercent).toFixed(1)}%
      </Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-700">
        Bajo Presupuesto {variancePercent.toFixed(1)}%
      </Badge>
    }
  }

  const filteredProjects = projectCosts.filter(project => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false
    if (searchTerm && !project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.client.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalBudget = projectCosts.filter(p => p.status !== 'completed').reduce((sum, p) => sum + p.totalBudget, 0)
  const totalActual = projectCosts.filter(p => p.status !== 'completed').reduce((sum, p) => sum + p.totalActualCost, 0)
  const totalVariance = totalBudget - totalActual
  const avgVariancePercent = projectCosts.filter(p => p.status !== 'completed')
    .reduce((sum, p) => sum + ((p.totalActualCost / (p.totalBudget * (p.completionPercent / 100))) - 1) * 100, 0) / 
    projectCosts.filter(p => p.status !== 'completed').length

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
            <h1 className="text-2xl font-bold text-gray-900">Costeo de Proyectos</h1>
            <p className="text-gray-600 mt-1">
              Análisis detallado de costos por proyecto y categoría
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Costos
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(totalBudget / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-blue-700">Presupuesto Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${(totalActual / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-purple-700">Costo Real Actual</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(totalVariance / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-green-700">Varianza Restante</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <PieChart className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {avgVariancePercent.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">Varianza Promedio</div>
            </CardContent>
          </Card>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Seleccionar Proyecto:
              </label>
              <select 
                className="flex-1 px-4 py-2 border rounded-lg bg-white"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projectCosts.map(project => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectCode} - {project.projectName}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Selected Project Overview */}
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{selectedProjectData.projectName}</h3>
                <p className="text-indigo-100">Cliente: {selectedProjectData.client} | Código: {selectedProjectData.projectCode}</p>
              </div>
              <Badge className={`${
                selectedProjectData.status === 'active' ? 'bg-blue-600' :
                selectedProjectData.status === 'completed' ? 'bg-green-600' : 'bg-orange-600'
              } text-white`}>
                {selectedProjectData.status === 'active' ? 'Activo' :
                 selectedProjectData.status === 'completed' ? 'Completado' : 'En Espera'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-indigo-100 mb-1">Presupuesto Total</div>
                <div className="text-xl font-bold">
                  ${selectedProjectData.totalBudget.toLocaleString('es-MX')}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-indigo-100 mb-1">Costo Real</div>
                <div className="text-xl font-bold">
                  ${selectedProjectData.totalActualCost.toLocaleString('es-MX')}
                </div>
              </div>
              <div className={`backdrop-blur-sm rounded-lg p-4 ${
                selectedProjectData.totalActualCost > selectedProjectData.totalBudget ? 'bg-red-500/30' : 'bg-green-500/30'
              }`}>
                <div className="text-sm text-indigo-100 mb-1">Varianza</div>
                <div className="text-xl font-bold">
                  ${Math.abs(selectedProjectData.totalBudget - selectedProjectData.totalActualCost).toLocaleString('es-MX')}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-indigo-100 mb-1">% Completado</div>
                <div className="text-xl font-bold">
                  {selectedProjectData.completionPercent}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Costos por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Presupuestado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costo Real</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Varianza</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">% del Presupuesto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Gráfico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {costBreakdown.map((item) => {
                    const Icon = item.icon
                    const percentOfBudget = (item.budgeted / selectedProjectData.totalBudget) * 100
                    const utilizationPercent = (item.actual / item.budgeted) * 100
                    
                    return (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-900">{item.category}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${item.budgeted.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            item.actual > item.budgeted ? 'text-red-600' :
                            item.actual > item.budgeted * 0.9 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            ${item.actual.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            item.variance < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.variance >= 0 ? '+' : ''}${item.variance.toLocaleString('es-MX')}
                          </div>
                          <div className={`text-xs ${
                            item.variancePercent > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {percentOfBudget.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getVarianceBadge(item.variance, item.variancePercent)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[100px]">
                              <div 
                                className={`h-3 rounded-full ${
                                  utilizationPercent > 100 ? 'bg-red-500' :
                                  utilizationPercent > 90 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-12">
                              {utilizationPercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      ${selectedProjectData.totalBudget.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      ${selectedProjectData.totalActualCost.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      ${(selectedProjectData.totalBudget - selectedProjectData.totalActualCost).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">100%</td>
                    <td className="px-4 py-3 text-center">
                      {getVarianceBadge(
                        selectedProjectData.totalBudget - selectedProjectData.totalActualCost,
                        ((selectedProjectData.totalActualCost / selectedProjectData.totalBudget - 1) * 100)
                      )}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* All Projects Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumen de Todos los Proyectos</CardTitle>
              <div className="flex items-center gap-2">
                <select 
                  className="px-4 py-2 border rounded-lg text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="completed">Completados</option>
                  <option value="on-hold">En Espera</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proyecto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Presupuesto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costo Real</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Varianza</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">% Completado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => {
                    const variance = project.totalBudget - project.totalActualCost
                    const variancePercent = ((project.totalActualCost / project.totalBudget - 1) * 100)
                    
                    return (
                      <tr key={project.projectId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm font-semibold text-blue-600">
                            {project.projectCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900 max-w-xs">
                            {project.projectName}
                          </div>
                          <div className="text-xs text-gray-500">{project.client}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${project.totalBudget.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            project.totalActualCost > project.totalBudget ? 'text-red-600' :
                            project.totalActualCost > project.totalBudget * 0.9 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            ${project.totalActualCost.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${
                            variance < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {variance >= 0 ? '+' : ''}${variance.toLocaleString('es-MX')}
                          </div>
                          <div className={`text-xs ${
                            variancePercent > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                              <div 
                                className={`h-2 rounded-full ${
                                  project.completionPercent >= 80 ? 'bg-green-500' :
                                  project.completionPercent >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${project.completionPercent}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {project.completionPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            onClick={() => setSelectedProject(project.projectId)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sistema de Costeo de Proyectos</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Metodología integral para rastrear y analizar costos reales vs presupuestados en cada proyecto.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Mano de Obra:</strong> Costos de personal interno asignado (salarios, prestaciones, horas trabajadas)</li>
                  <li>• <strong>Materiales:</strong> Insumos, licencias de software, consumibles directos del proyecto</li>
                  <li>• <strong>Equipamiento:</strong> Hardware, servidores, herramientas especializadas necesarias</li>
                  <li>• <strong>Gastos Generales:</strong> Overhead asignado (renta, servicios, administración prorrateada)</li>
                  <li>• <strong>Subcontratistas:</strong> Servicios externos contratados para tareas específicas</li>
                  <li>• <strong>Varianza:</strong> Diferencia entre presupuesto y costo real; verde (bajo), naranja (alerta), rojo (sobrecosto)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

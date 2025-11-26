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
  Search,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface ProjectProfitability {
  projectId: string
  projectCode: string
  projectName: string
  client: string
  status: 'active' | 'completed' | 'on-hold'
  totalRevenue: number
  actualRevenue: number
  totalCosts: number
  laborCosts: number
  materialCosts: number
  overheadCosts: number
  otherCosts: number
  grossProfit: number
  grossMarginPercent: number
  netProfit: number
  netMarginPercent: number
  roi: number
  budgetEfficiency: number
  revenueRealization: number
  completionPercent: number
}

export default function ProjectProfitabilityPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('roi')
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

  const projectsProfitability: ProjectProfitability[] = [
    {
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      client: 'GlobalTech Inc.',
      status: 'active',
      totalRevenue: 3500000,
      actualRevenue: 1575000,
      totalCosts: 1125000,
      laborCosts: 675000,
      materialCosts: 180000,
      overheadCosts: 202500,
      otherCosts: 67500,
      grossProfit: 450000,
      grossMarginPercent: 28.57,
      netProfit: 450000,
      netMarginPercent: 28.57,
      roi: 40.0,
      budgetEfficiency: 100.0,
      revenueRealization: 45.0,
      completionPercent: 45
    },
    {
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      client: 'Acme Corp',
      status: 'active',
      totalRevenue: 1200000,
      actualRevenue: 780000,
      totalCosts: 552500,
      laborCosts: 331500,
      materialCosts: 110500,
      overheadCosts: 88400,
      otherCosts: 22100,
      grossProfit: 227500,
      grossMarginPercent: 29.17,
      netProfit: 227500,
      netMarginPercent: 29.17,
      roi: 41.18,
      budgetEfficiency: 100.0,
      revenueRealization: 65.0,
      completionPercent: 65
    },
    {
      projectId: 'PROJ-003',
      projectCode: 'APP-2025-008',
      projectName: 'App Móvil Fintech - Innovatech',
      client: 'Innovatech',
      status: 'active',
      totalRevenue: 1680000,
      actualRevenue: 1344000,
      totalCosts: 960000,
      laborCosts: 576000,
      materialCosts: 192000,
      overheadCosts: 153600,
      otherCosts: 38400,
      grossProfit: 384000,
      grossMarginPercent: 28.57,
      netProfit: 384000,
      netMarginPercent: 28.57,
      roi: 40.0,
      budgetEfficiency: 100.0,
      revenueRealization: 80.0,
      completionPercent: 80
    },
    {
      projectId: 'PROJ-004',
      projectCode: 'INF-2025-015',
      projectName: 'Migración Cloud - Distribuidora Tech',
      client: 'Distribuidora Tech Solutions',
      status: 'active',
      totalRevenue: 1330000,
      actualRevenue: 731500,
      totalCosts: 522500,
      laborCosts: 313500,
      materialCosts: 104500,
      overheadCosts: 83600,
      otherCosts: 20900,
      grossProfit: 209000,
      grossMarginPercent: 28.57,
      netProfit: 209000,
      netMarginPercent: 28.57,
      roi: 40.0,
      budgetEfficiency: 100.0,
      revenueRealization: 55.0,
      completionPercent: 55
    },
    {
      projectId: 'PROJ-005',
      projectCode: 'IOT-2025-004',
      projectName: 'Plataforma IoT Industrial - ManufactureTech',
      client: 'ManufactureTech',
      status: 'active',
      totalRevenue: 2030000,
      actualRevenue: 1725500,
      totalCosts: 1232500,
      laborCosts: 739500,
      materialCosts: 246500,
      overheadCosts: 197200,
      otherCosts: 49300,
      grossProfit: 493000,
      grossMarginPercent: 28.57,
      netProfit: 493000,
      netMarginPercent: 28.57,
      roi: 40.0,
      budgetEfficiency: 100.0,
      revenueRealization: 85.0,
      completionPercent: 85
    },
    {
      projectId: 'PROJ-006',
      projectCode: 'CON-2025-007',
      projectName: 'Consultoría Transformación Digital - RetailCorp',
      client: 'RetailCorp',
      status: 'completed',
      totalRevenue: 910000,
      actualRevenue: 910000,
      totalCosts: 620000,
      laborCosts: 434000,
      materialCosts: 93000,
      overheadCosts: 74400,
      otherCosts: 18600,
      grossProfit: 290000,
      grossMarginPercent: 31.87,
      netProfit: 290000,
      netMarginPercent: 31.87,
      roi: 46.77,
      budgetEfficiency: 104.6,
      revenueRealization: 100.0,
      completionPercent: 100
    },
    {
      projectId: 'PROJ-007',
      projectCode: 'DATA-2025-010',
      projectName: 'Business Intelligence Dashboard - Analytics Pro',
      client: 'Analytics Pro',
      status: 'active',
      totalRevenue: 1008000,
      actualRevenue: 252000,
      totalCosts: 180000,
      laborCosts: 108000,
      materialCosts: 36000,
      overheadCosts: 28800,
      otherCosts: 7200,
      grossProfit: 72000,
      grossMarginPercent: 28.57,
      netProfit: 72000,
      netMarginPercent: 28.57,
      roi: 40.0,
      budgetEfficiency: 100.0,
      revenueRealization: 25.0,
      completionPercent: 25
    },
    {
      projectId: 'PROJ-008',
      projectCode: 'WEB-2025-018',
      projectName: 'Rediseño Sitio Corporativo - BrandCo',
      client: 'BrandCo',
      status: 'completed',
      totalRevenue: 448000,
      actualRevenue: 448000,
      totalCosts: 304000,
      laborCosts: 212800,
      materialCosts: 45600,
      overheadCosts: 36480,
      otherCosts: 9120,
      grossProfit: 144000,
      grossMarginPercent: 32.14,
      netProfit: 144000,
      netMarginPercent: 32.14,
      roi: 47.37,
      budgetEfficiency: 105.0,
      revenueRealization: 100.0,
      completionPercent: 100
    }
  ]

  const selectedProjectData = projectsProfitability.find(p => p.projectId === selectedProject) || projectsProfitability[0]

  const getProfitabilityBadge = (margin: number) => {
    if (margin >= 30) {
      return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Excelente
      </Badge>
    } else if (margin >= 20) {
      return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Bueno
      </Badge>
    } else if (margin >= 10) {
      return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Aceptable
      </Badge>
    } else {
      return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
        <TrendingDown className="w-3 h-3" /> Bajo
      </Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-700">Activo</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completado</Badge>
      case 'on-hold':
        return <Badge className="bg-orange-100 text-orange-700">En Espera</Badge>
      default:
        return null
    }
  }

  const filteredProjects = projectsProfitability.filter(project => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false
    if (searchTerm && !project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.client.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'roi':
        return b.roi - a.roi
      case 'margin':
        return b.netMarginPercent - a.netMarginPercent
      case 'revenue':
        return b.actualRevenue - a.actualRevenue
      case 'profit':
        return b.netProfit - a.netProfit
      default:
        return 0
    }
  })

  const totalRevenue = projectsProfitability.reduce((sum, p) => sum + p.actualRevenue, 0)
  const totalCosts = projectsProfitability.reduce((sum, p) => sum + p.totalCosts, 0)
  const totalProfit = totalRevenue - totalCosts
  const avgMargin = (totalProfit / totalRevenue) * 100
  const avgROI = projectsProfitability.reduce((sum, p) => sum + p.roi, 0) / projectsProfitability.length

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
            <h1 className="text-2xl font-bold text-gray-900">Rentabilidad de Proyectos</h1>
            <p className="text-gray-600 mt-1">
              Análisis de márgenes, ROI y rentabilidad por proyecto
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Análisis
            </Button>
            <Button>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(totalRevenue / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-green-700">Ingresos Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(totalProfit / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-blue-700">Utilidad Neta</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <PieChart className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {avgMargin.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-700">Margen Promedio</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {avgROI.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">ROI Promedio</div>
            </CardContent>
          </Card>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Análisis Detallado:
              </label>
              <select 
                className="flex-1 px-4 py-2 border rounded-lg bg-white"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projectsProfitability.map(project => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectCode} - {project.projectName}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Selected Project Detail */}
        <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{selectedProjectData.projectName}</h3>
                <p className="text-emerald-100">Cliente: {selectedProjectData.client} | Código: {selectedProjectData.projectCode}</p>
              </div>
              {getStatusBadge(selectedProjectData.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">Ingresos</div>
                <div className="text-xl font-bold">
                  ${(selectedProjectData.actualRevenue / 1000).toLocaleString('es-MX')}K
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">Costos</div>
                <div className="text-xl font-bold">
                  ${(selectedProjectData.totalCosts / 1000).toLocaleString('es-MX')}K
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">Utilidad</div>
                <div className="text-xl font-bold">
                  ${(selectedProjectData.netProfit / 1000).toLocaleString('es-MX')}K
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">Margen Neto</div>
                <div className="text-xl font-bold">
                  {selectedProjectData.netMarginPercent.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">ROI</div>
                <div className="text-xl font-bold">
                  {selectedProjectData.roi.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-emerald-100 mb-1">Eficiencia</div>
                <div className="text-xl font-bold">
                  {selectedProjectData.budgetEfficiency.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown for Selected Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Mano de Obra</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${selectedProjectData.laborCosts.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{ width: `${(selectedProjectData.laborCosts / selectedProjectData.totalCosts) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((selectedProjectData.laborCosts / selectedProjectData.totalCosts) * 100).toFixed(1)}% del total
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Materiales</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${selectedProjectData.materialCosts.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full" 
                      style={{ width: `${(selectedProjectData.materialCosts / selectedProjectData.totalCosts) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((selectedProjectData.materialCosts / selectedProjectData.totalCosts) * 100).toFixed(1)}% del total
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Gastos Generales</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${selectedProjectData.overheadCosts.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full" 
                      style={{ width: `${(selectedProjectData.overheadCosts / selectedProjectData.totalCosts) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((selectedProjectData.overheadCosts / selectedProjectData.totalCosts) * 100).toFixed(1)}% del total
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Otros Costos</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${selectedProjectData.otherCosts.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-orange-500 h-3 rounded-full" 
                      style={{ width: `${(selectedProjectData.otherCosts / selectedProjectData.totalCosts) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((selectedProjectData.otherCosts / selectedProjectData.totalCosts) * 100).toFixed(1)}% del total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Rentabilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Margen Bruto</span>
                    <div className="flex items-center gap-2">
                      {selectedProjectData.grossMarginPercent >= 25 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        selectedProjectData.grossMarginPercent >= 25 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedProjectData.grossMarginPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Utilidad Bruta: ${selectedProjectData.grossProfit.toLocaleString('es-MX')}
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Margen Neto</span>
                    <div className="flex items-center gap-2">
                      {selectedProjectData.netMarginPercent >= 20 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        selectedProjectData.netMarginPercent >= 20 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {selectedProjectData.netMarginPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Utilidad Neta: ${selectedProjectData.netProfit.toLocaleString('es-MX')}
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">ROI (Return on Investment)</span>
                    <div className="flex items-center gap-2">
                      {selectedProjectData.roi >= 30 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-orange-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        selectedProjectData.roi >= 30 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {selectedProjectData.roi.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Retorno por cada peso invertido
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Eficiencia Presupuestal</span>
                    <div className="flex items-center gap-2">
                      {selectedProjectData.budgetEfficiency >= 100 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        selectedProjectData.budgetEfficiency >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedProjectData.budgetEfficiency.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Cumplimiento de presupuesto
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Realización de Ingresos</span>
                    <span className="text-lg font-bold text-blue-600">
                      {selectedProjectData.revenueRealization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{ width: `${selectedProjectData.revenueRealization}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${selectedProjectData.actualRevenue.toLocaleString('es-MX')} de ${selectedProjectData.totalRevenue.toLocaleString('es-MX')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Projects Comparison */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comparativo de Rentabilidad - Todos los Proyectos</CardTitle>
              <div className="flex items-center gap-2">
                <select 
                  className="px-4 py-2 border rounded-lg text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="roi">Ordenar por ROI</option>
                  <option value="margin">Ordenar por Margen</option>
                  <option value="revenue">Ordenar por Ingresos</option>
                  <option value="profit">Ordenar por Utilidad</option>
                </select>
                <select 
                  className="px-4 py-2 border rounded-lg text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="completed">Completados</option>
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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Ingresos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Utilidad</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Margen</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">ROI</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Rentabilidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
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
                        ${project.actualRevenue.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        ${project.totalCosts.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-green-600">
                          ${project.netProfit.toLocaleString('es-MX')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`text-sm font-semibold ${
                          project.netMarginPercent >= 30 ? 'text-green-600' :
                          project.netMarginPercent >= 20 ? 'text-blue-600' :
                          project.netMarginPercent >= 10 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {project.netMarginPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`text-sm font-semibold ${
                          project.roi >= 40 ? 'text-green-600' :
                          project.roi >= 25 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {project.roi.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getProfitabilityBadge(project.netMarginPercent)}
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
                  ))}
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
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Análisis de Rentabilidad de Proyectos</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema avanzado para medir y optimizar la rentabilidad de cada proyecto de la empresa.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Margen Bruto:</strong> (Ingresos - Costos Directos) / Ingresos × 100. Mide rentabilidad antes de gastos generales</li>
                  <li>• <strong>Margen Neto:</strong> (Ingresos - Todos los Costos) / Ingresos × 100. Rentabilidad final después de todos los gastos</li>
                  <li>• <strong>ROI:</strong> (Utilidad Neta / Costos Totales) × 100. Retorno por cada peso invertido en el proyecto</li>
                  <li>• <strong>Eficiencia Presupuestal:</strong> Grado de cumplimiento del presupuesto original (100% = en presupuesto)</li>
                  <li>• <strong>Realización de Ingresos:</strong> Porcentaje de ingresos estimados ya cobrados o facturados</li>
                  <li>• <strong>Clasificación:</strong> Excelente (≥30%), Bueno (20-30%), Aceptable (10-20%), Bajo (&lt;10%)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

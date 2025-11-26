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
  Edit,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Briefcase,
  Building
} from 'lucide-react'

interface Project {
  id: string
  projectCode: string
  name: string
  client: string
  manager: string
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: string
  endDate: string
  completionPercentage: number
  budget: number
  actualCost: number
  estimatedRevenue: number
  actualRevenue: number
  teamSize: number
  billableHours: number
  nonBillableHours: number
  daysRemaining: number
}

export default function ProjectsListPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const projects: Project[] = [
    {
      id: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      name: 'Implementación Sistema ERP - GlobalTech',
      client: 'GlobalTech Inc.',
      manager: 'María González',
      status: 'in-progress',
      priority: 'high',
      startDate: '2025-09-01',
      endDate: '2026-03-31',
      completionPercentage: 45,
      budget: 2500000,
      actualCost: 1125000,
      estimatedRevenue: 3500000,
      actualRevenue: 1575000,
      teamSize: 12,
      billableHours: 1850,
      nonBillableHours: 240,
      daysRemaining: 126
    },
    {
      id: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      name: 'Portal E-commerce Acme Corp',
      client: 'Acme Corp',
      manager: 'Carlos Ramírez',
      status: 'in-progress',
      priority: 'urgent',
      startDate: '2025-10-15',
      endDate: '2026-01-15',
      completionPercentage: 65,
      budget: 850000,
      actualCost: 552500,
      estimatedRevenue: 1200000,
      actualRevenue: 780000,
      teamSize: 8,
      billableHours: 890,
      nonBillableHours: 110,
      daysRemaining: 51
    },
    {
      id: 'PROJ-003',
      projectCode: 'APP-2025-008',
      name: 'App Móvil Fintech - Innovatech',
      client: 'Innovatech',
      manager: 'Ana Martínez',
      status: 'in-progress',
      priority: 'high',
      startDate: '2025-08-01',
      endDate: '2025-12-31',
      completionPercentage: 80,
      budget: 1200000,
      actualCost: 960000,
      estimatedRevenue: 1680000,
      actualRevenue: 1344000,
      teamSize: 6,
      billableHours: 1320,
      nonBillableHours: 180,
      daysRemaining: 36
    },
    {
      id: 'PROJ-004',
      projectCode: 'CRM-2025-003',
      name: 'Personalización CRM - MegaCorp',
      client: 'MegaCorp',
      manager: 'Roberto Silva',
      status: 'planning',
      priority: 'medium',
      startDate: '2026-01-15',
      endDate: '2026-06-30',
      completionPercentage: 15,
      budget: 1800000,
      actualCost: 180000,
      estimatedRevenue: 2520000,
      actualRevenue: 0,
      teamSize: 10,
      billableHours: 240,
      nonBillableHours: 80,
      daysRemaining: 217
    },
    {
      id: 'PROJ-005',
      projectCode: 'INF-2025-015',
      name: 'Migración Cloud - Distribuidora Tech',
      client: 'Distribuidora Tech Solutions',
      manager: 'Laura Hernández',
      status: 'in-progress',
      priority: 'high',
      startDate: '2025-10-01',
      endDate: '2026-02-28',
      completionPercentage: 55,
      budget: 950000,
      actualCost: 522500,
      estimatedRevenue: 1330000,
      actualRevenue: 731500,
      teamSize: 7,
      billableHours: 780,
      nonBillableHours: 120,
      daysRemaining: 95
    },
    {
      id: 'PROJ-006',
      projectCode: 'CON-2025-007',
      name: 'Consultoría Transformación Digital - RetailCorp',
      client: 'RetailCorp',
      manager: 'Pedro López',
      status: 'completed',
      priority: 'medium',
      startDate: '2025-06-01',
      endDate: '2025-11-15',
      completionPercentage: 100,
      budget: 650000,
      actualCost: 620000,
      estimatedRevenue: 910000,
      actualRevenue: 910000,
      teamSize: 5,
      billableHours: 1150,
      nonBillableHours: 150,
      daysRemaining: 0
    },
    {
      id: 'PROJ-007',
      projectCode: 'SEC-2025-002',
      name: 'Auditoría Seguridad - FinanceGroup',
      client: 'FinanceGroup',
      manager: 'Sandra Ruiz',
      status: 'on-hold',
      priority: 'low',
      startDate: '2025-09-15',
      endDate: '2026-01-31',
      completionPercentage: 30,
      budget: 480000,
      actualCost: 144000,
      estimatedRevenue: 672000,
      actualRevenue: 201600,
      teamSize: 4,
      billableHours: 280,
      nonBillableHours: 40,
      daysRemaining: 67
    },
    {
      id: 'PROJ-008',
      projectCode: 'DATA-2025-010',
      name: 'Business Intelligence Dashboard - Analytics Pro',
      client: 'Analytics Pro',
      manager: 'Diego Torres',
      status: 'in-progress',
      priority: 'medium',
      startDate: '2025-11-01',
      endDate: '2026-03-15',
      completionPercentage: 25,
      budget: 720000,
      actualCost: 180000,
      estimatedRevenue: 1008000,
      actualRevenue: 252000,
      teamSize: 6,
      billableHours: 310,
      nonBillableHours: 50,
      daysRemaining: 110
    },
    {
      id: 'PROJ-009',
      projectCode: 'IOT-2025-004',
      name: 'Plataforma IoT Industrial - ManufactureTech',
      client: 'ManufactureTech',
      manager: 'Patricia Morales',
      status: 'in-progress',
      priority: 'urgent',
      startDate: '2025-07-15',
      endDate: '2025-12-20',
      completionPercentage: 85,
      budget: 1450000,
      actualCost: 1232500,
      estimatedRevenue: 2030000,
      actualRevenue: 1725500,
      teamSize: 9,
      billableHours: 1680,
      nonBillableHours: 220,
      daysRemaining: 25
    },
    {
      id: 'PROJ-010',
      projectCode: 'AI-2025-001',
      name: 'Sistema ML Predictivo - DataInsights',
      client: 'DataInsights',
      manager: 'Fernando Castro',
      status: 'planning',
      priority: 'high',
      startDate: '2026-02-01',
      endDate: '2026-08-31',
      completionPercentage: 10,
      budget: 2200000,
      actualCost: 220000,
      estimatedRevenue: 3080000,
      actualRevenue: 0,
      teamSize: 11,
      billableHours: 180,
      nonBillableHours: 60,
      daysRemaining: 278
    },
    {
      id: 'PROJ-011',
      projectCode: 'WEB-2025-018',
      name: 'Rediseño Sitio Corporativo - BrandCo',
      client: 'BrandCo',
      manager: 'Lucía Fernández',
      status: 'completed',
      priority: 'low',
      startDate: '2025-08-15',
      endDate: '2025-10-31',
      completionPercentage: 100,
      budget: 320000,
      actualCost: 304000,
      estimatedRevenue: 448000,
      actualRevenue: 448000,
      teamSize: 4,
      billableHours: 520,
      nonBillableHours: 80,
      daysRemaining: 0
    },
    {
      id: 'PROJ-012',
      projectCode: 'INT-2025-006',
      name: 'Integración API Bancaria - PaymentsTech',
      client: 'PaymentsTech',
      manager: 'Miguel Ángel Suárez',
      status: 'cancelled',
      priority: 'medium',
      startDate: '2025-09-01',
      endDate: '2025-11-30',
      completionPercentage: 40,
      budget: 580000,
      actualCost: 232000,
      estimatedRevenue: 812000,
      actualRevenue: 324800,
      teamSize: 5,
      billableHours: 380,
      nonBillableHours: 70,
      daysRemaining: 0
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Planificación
        </Badge>
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> En Progreso
        </Badge>
      case 'on-hold':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> En Espera
        </Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Completado
        </Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Cancelado
        </Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="border-gray-300 text-gray-600">Baja</Badge>
      case 'medium':
        return <Badge variant="outline" className="border-blue-300 text-blue-600">Media</Badge>
      case 'high':
        return <Badge variant="outline" className="border-orange-300 text-orange-600">Alta</Badge>
      case 'urgent':
        return <Badge variant="outline" className="border-red-300 text-red-600">Urgente</Badge>
      default:
        return null
    }
  }

  const getHealthIndicator = (project: Project) => {
    const costVariance = ((project.actualCost - project.budget * (project.completionPercentage / 100)) / project.budget) * 100
    if (costVariance > 10) {
      return <div className="w-3 h-3 rounded-full bg-red-500" title="Sobre presupuesto" />
    } else if (costVariance > 5) {
      return <div className="w-3 h-3 rounded-full bg-orange-500" title="Alerta de presupuesto" />
    }
    return <div className="w-3 h-3 rounded-full bg-green-500" title="En presupuesto" />
  }

  const filteredProjects = projects.filter(project => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false
    if (filterPriority !== 'all' && project.priority !== filterPriority) return false
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.client.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const activeProjects = projects.filter(p => p.status === 'in-progress').length
  const totalBudget = projects.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + p.budget, 0)
  const totalRevenue = projects.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + p.actualRevenue, 0)
  const avgCompletion = projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed')
    .reduce((sum, p) => sum + p.completionPercentage, 0) / 
    projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed').length

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
            <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y monitorea todos tus proyectos activos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📥 Exportando proyectos a CSV')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => alert('📁 Nuevo Proyecto\n\nCrear proyecto\nPOST /api/projects')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{activeProjects}</div>
              <div className="text-sm text-blue-700">Proyectos Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(totalBudget / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-green-700">Presupuesto Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${(totalRevenue / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-purple-700">Ingresos Generados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {avgCompletion.toFixed(0)}%
              </div>
              <div className="text-sm text-orange-700">Progreso Promedio</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar proyectos por nombre, cliente o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="planning">Planificación</option>
                <option value="in-progress">En Progreso</option>
                <option value="on-hold">En Espera</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Proyectos ({filteredProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proyecto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Manager</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Prioridad</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Progreso</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Presupuesto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costo Real</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Equipo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Días Rest.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getHealthIndicator(project)}
                          {getStatusBadge(project.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {project.projectCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 max-w-xs">
                          {project.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - 
                          {new Date(project.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{project.client}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {project.manager}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getPriorityBadge(project.priority)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div 
                              className={`h-2 rounded-full ${
                                project.completionPercentage >= 80 ? 'bg-green-500' :
                                project.completionPercentage >= 50 ? 'bg-blue-500' :
                                project.completionPercentage >= 25 ? 'bg-orange-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${project.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {project.completionPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        ${project.budget.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          project.actualCost > project.budget ? 'text-red-600' :
                          project.actualCost > project.budget * 0.9 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          ${project.actualCost.toLocaleString('es-MX')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {((project.actualCost / project.budget) * 100).toFixed(0)}% usado
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{project.teamSize}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`text-sm font-semibold ${
                          project.daysRemaining === 0 ? 'text-gray-400' :
                          project.daysRemaining < 15 ? 'text-red-600' :
                          project.daysRemaining < 30 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {project.daysRemaining === 0 ? '-' : `${project.daysRemaining}d`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
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
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Gestión de Proyectos</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema integral para administrar proyectos desde la planificación hasta la entrega.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Indicador de Salud:</strong> Verde (en presupuesto), Naranja (alerta +5%), Rojo (sobre presupuesto +10%)</li>
                  <li>• <strong>Seguimiento de Progreso:</strong> Porcentaje de completitud con barras de progreso visuales</li>
                  <li>• <strong>Control Presupuestal:</strong> Monitoreo de costos reales vs presupuesto asignado</li>
                  <li>• <strong>Gestión de Equipo:</strong> Tamaño del equipo y asignación de recursos por proyecto</li>
                  <li>• <strong>Alertas de Tiempo:</strong> Días restantes con código de colores (rojo menor a 15 días, naranja menor a 30 días)</li>
                  <li>• <strong>Priorización:</strong> Sistema de prioridades (baja, media, alta, urgente) para gestión efectiva</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

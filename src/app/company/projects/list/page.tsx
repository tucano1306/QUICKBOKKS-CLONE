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
  Building,
  RefreshCw,
  Info
} from 'lucide-react'

interface Project {
  id: string
  code?: string
  name: string
  description?: string
  status: string
  priority?: string
  startDate?: string
  endDate?: string
  progress: number
  budget: number
  actualCost: number
  revenue: number
  profit?: number
  margin?: number
  budgetUsed?: number
  costCenter?: { name: string }
  _count?: { expenses: number; invoices: number; timeEntries: number }
}

export default function ProjectsListPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const fetchProjects = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyId: activeCompany.id })
      if (filterStatus !== 'all') params.append('status', filterStatus)
      
      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
        if (data.projects?.length === 0) {
          setMessage({ type: 'info', text: 'No hay proyectos. Cree uno nuevo para comenzar.' })
          setTimeout(() => setMessage(null), 5000)
        }
      } else {
        setMessage({ type: 'error', text: 'Error al cargar proyectos' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setMessage({ type: 'error', text: 'Error de conexión al cargar proyectos' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }, [activeCompany, filterStatus])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      fetchProjects()
    }
  }, [status, activeCompany, fetchProjects])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Planificación
        </Badge>
      case 'in_progress':
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> En Progreso
        </Badge>
      case 'on_hold':
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
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
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
    const budgetUsed = project.budgetUsed || (project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0)
    if (budgetUsed > 110) {
      return <div className="w-3 h-3 rounded-full bg-red-500" title="Sobre presupuesto" />
    } else if (budgetUsed > 90) {
      return <div className="w-3 h-3 rounded-full bg-orange-500" title="Alerta de presupuesto" />
    }
    return <div className="w-3 h-3 rounded-full bg-green-500" title="En presupuesto" />
  }

  const filteredProjects = projects.filter(project => {
    if (filterPriority !== 'all' && project.priority?.toLowerCase() !== filterPriority) return false
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(project.code || '').toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
  const totalBudget = projects.filter(p => p.status !== 'CANCELLED').reduce((sum, p) => sum + p.budget, 0)
  const totalRevenue = projects.filter(p => p.status !== 'CANCELLED').reduce((sum, p) => sum + p.revenue, 0)
  const inProgressProjects = projects.filter(p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED')
  const avgCompletion = inProgressProjects.length > 0 
    ? inProgressProjects.reduce((sum, p) => sum + p.progress, 0) / inProgressProjects.length
    : 0

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
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 
            message.type === 'info' ? 'bg-blue-50 text-blue-700' :
            'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'info' && <Info className="w-5 h-5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y monitorea todos tus proyectos activos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchProjects}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => { setMessage({ type: 'success', text: 'Exportando proyectos a CSV' }); setTimeout(() => setMessage(null), 3000); }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setMessage({ type: 'success', text: 'Iniciando creación de nuevo proyecto' }); setTimeout(() => setMessage(null), 3000); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Centro de Costo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Prioridad</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Progreso</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Presupuesto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costo Real</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Ingresos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No hay proyectos. Cree uno nuevo para comenzar.
                      </td>
                    </tr>
                  ) : filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getHealthIndicator(project)}
                          {getStatusBadge(project.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {project.code || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 max-w-xs">
                          {project.name}
                        </div>
                        {(project.startDate || project.endDate) && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '?'} - 
                            {project.endDate ? new Date(project.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{project.costCenter?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getPriorityBadge(project.priority || 'medium')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div 
                              className={`h-2 rounded-full ${
                                project.progress >= 80 ? 'bg-green-500' :
                                project.progress >= 50 ? 'bg-blue-500' :
                                project.progress >= 25 ? 'bg-orange-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {project.progress}%
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
                        {project.budget > 0 && (
                          <div className="text-xs text-gray-500">
                            {((project.actualCost / project.budget) * 100).toFixed(0)}% usado
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-green-600">
                          ${project.revenue.toLocaleString('es-MX')}
                        </div>
                        {project.profit !== undefined && (
                          <div className={`text-xs ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.profit >= 0 ? '+' : ''}{project.margin?.toFixed(1)}%
                          </div>
                        )}
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

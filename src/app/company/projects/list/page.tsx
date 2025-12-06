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
import toast from 'react-hot-toast'
import { 
  Plus, Search, Download, Eye, Edit, Calendar, DollarSign, Users,
  TrendingUp, AlertCircle, CheckCircle, Clock, Briefcase, Building,
  RefreshCw, X, Trash2, Save
} from 'lucide-react'

interface Project {
  id: string
  code: string | null
  name: string
  description: string | null
  status: string
  priority: string | null
  startDate: string | null
  endDate: string | null
  progress: number
  budget: number
  actualCost: number
  revenue: number
  profit?: number
  margin?: number
  budgetUsed?: number
  costCenter?: { id: string; name: string } | null
  customerId?: string | null
  _count?: { expenses: number; invoices: number; timeEntries: number }
}

interface CostCenter {
  id: string
  code: string
  name: string
}

interface Customer {
  id: string
  name: string
  company: string | null
}

export default function ProjectsListPage() {
  const router = useRouter()
  const sessionHook = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: '',
    endDate: '',
    budget: '',
    costCenterId: '',
    customerId: ''
  })

  const fetchProjects = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyId: activeCompany.id })
      if (filterStatus !== 'all') params.append('status', filterStatus.toUpperCase().replace('-', '_'))
      
      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      } else {
        toast.error('Error al cargar proyectos')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [activeCompany, filterStatus])

  const fetchCostCenters = useCallback(async () => {
    if (!activeCompany) return
    try {
      const response = await fetch(`/api/accounting/cost-centers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setCostCenters(data.costCenters || [])
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error)
    }
  }, [activeCompany])

  const fetchCustomers = useCallback(async () => {
    if (!activeCompany) return
    try {
      const response = await fetch(`/api/customers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }, [activeCompany])

  useEffect(() => {
    if (sessionHook.status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [sessionHook.status, router])

  useEffect(() => {
    if (sessionHook.status === 'authenticated' && activeCompany) {
      fetchProjects()
      fetchCostCenters()
      fetchCustomers()
    }
  }, [sessionHook.status, activeCompany, fetchProjects, fetchCostCenters, fetchCustomers])

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: '',
      endDate: '',
      budget: '',
      costCenterId: '',
      customerId: ''
    })
    setSelectedProject(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      code: project.code || '',
      description: project.description || '',
      status: project.status,
      priority: project.priority || 'MEDIUM',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      budget: project.budget.toString(),
      costCenterId: project.costCenter?.id || '',
      customerId: project.customerId || ''
    })
    setShowModal(true)
  }

  const openViewModal = (project: Project) => {
    setSelectedProject(project)
    setShowViewModal(true)
  }

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project)
    setShowDeleteModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return

    if (!formData.name.trim()) {
      toast.error('El nombre del proyecto es requerido')
      return
    }

    setSaving(true)
    try {
      const url = selectedProject 
        ? `/api/projects/${selectedProject.id}`
        : '/api/projects'
      
      const response = await fetch(url, {
        method: selectedProject ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget) || 0,
          companyId: activeCompany.id,
          costCenterId: formData.costCenterId || null,
          customerId: formData.customerId || null
        })
      })

      if (response.ok) {
        toast.success(selectedProject ? 'Proyecto actualizado' : 'Proyecto creado')
        setShowModal(false)
        resetForm()
        fetchProjects()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al guardar proyecto')
      }
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProject) return

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Proyecto eliminado')
        setShowDeleteModal(false)
        setSelectedProject(null)
        fetchProjects()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al eliminar proyecto')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    if (projects.length === 0) {
      toast.error('No hay proyectos para exportar')
      return
    }

    const headers = ['Código', 'Nombre', 'Estado', 'Prioridad', 'Fecha Inicio', 'Fecha Fin', 'Presupuesto', 'Costo Real', 'Ingresos', 'Progreso']
    const csvContent = [
      headers.join(','),
      ...projects.map(p => [
        p.code || '',
        `"${p.name}"`,
        p.status,
        p.priority || '',
        p.startDate ? new Date(p.startDate).toLocaleDateString() : '',
        p.endDate ? new Date(p.endDate).toLocaleDateString() : '',
        p.budget,
        p.actualCost,
        p.revenue,
        p.progress
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `proyectos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Proyectos exportados')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      'PLANNING': { label: 'Planificación', className: 'bg-gray-100 text-gray-700', icon: Clock },
      'IN_PROGRESS': { label: 'En Progreso', className: 'bg-blue-100 text-blue-700', icon: TrendingUp },
      'ON_HOLD': { label: 'En Espera', className: 'bg-orange-100 text-orange-700', icon: AlertCircle },
      'COMPLETED': { label: 'Completado', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      'CANCELLED': { label: 'Cancelado', className: 'bg-red-100 text-red-700', icon: AlertCircle }
    }
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700', icon: Clock }
    const Icon = config.icon
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" /> {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null
    const priorityMap: Record<string, { label: string; className: string }> = {
      'LOW': { label: 'Baja', className: 'border-gray-300 text-gray-600' },
      'MEDIUM': { label: 'Media', className: 'border-blue-300 text-blue-600' },
      'HIGH': { label: 'Alta', className: 'border-orange-300 text-orange-600' },
      'URGENT': { label: 'Urgente', className: 'border-red-300 text-red-600' }
    }
    const config = priorityMap[priority.toUpperCase()] || { label: priority, className: 'border-gray-300 text-gray-600' }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getHealthIndicator = (project: Project) => {
    const budgetUsed = project.budgetUsed || (project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0)
    if (budgetUsed > 110) return <div className="w-3 h-3 rounded-full bg-red-500" title="Sobre presupuesto" />
    if (budgetUsed > 90) return <div className="w-3 h-3 rounded-full bg-orange-500" title="Alerta de presupuesto" />
    return <div className="w-3 h-3 rounded-full bg-green-500" title="En presupuesto" />
  }

  const filteredProjects = projects.filter(project => {
    if (filterPriority !== 'all' && project.priority?.toUpperCase() !== filterPriority.toUpperCase()) return false
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

  if (sessionHook.status === 'loading' || loading) {
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
            <p className="text-gray-600 mt-1">Gestiona y monitorea todos tus proyectos activos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchProjects}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={openCreateModal}>
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
                ${totalBudget >= 1000000 ? `${(totalBudget / 1000000).toFixed(1)}M` : totalBudget.toLocaleString()}
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
                ${totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(1)}M` : totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Ingresos Generados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{avgCompletion.toFixed(0)}%</div>
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
                  placeholder="Buscar proyectos por nombre o código..."
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
                <option value="in_progress">En Progreso</option>
                <option value="on_hold">En Espera</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">Todas las Prioridades</option>
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
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
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Briefcase className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500">No hay proyectos</p>
                          <Button onClick={openCreateModal}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Proyecto
                          </Button>
                        </div>
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
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {project.code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">{project.name}</div>
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
                        {getPriorityBadge(project.priority)}
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
                          <span className="text-sm font-semibold text-gray-700">{project.progress}%</span>
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
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-green-600">
                          ${project.revenue.toLocaleString('es-MX')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => openViewModal(project)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(project)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(project)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Proyecto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre del proyecto"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="PRJ-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del proyecto"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PLANNING">Planificación</option>
                    <option value="IN_PROGRESS">En Progreso</option>
                    <option value="ON_HOLD">En Espera</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto</label>
                  <Input
                    type="text"
                    className="amount-input"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Centro de Costo</label>
                  <select
                    value={formData.costCenterId}
                    onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin centro de costo</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Asociado</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin cliente asociado</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {selectedProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Detalles del Proyecto</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h3>
                  {selectedProject.code && (
                    <span className="font-mono text-blue-600">{selectedProject.code}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedProject.status)}
                  {getPriorityBadge(selectedProject.priority)}
                </div>
              </div>

              {selectedProject.description && (
                <p className="text-gray-600">{selectedProject.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Presupuesto</div>
                  <div className="text-xl font-bold text-gray-900">${selectedProject.budget.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Costo Real</div>
                  <div className={`text-xl font-bold ${selectedProject.actualCost > selectedProject.budget ? 'text-red-600' : 'text-green-600'}`}>
                    ${selectedProject.actualCost.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Ingresos</div>
                  <div className="text-xl font-bold text-green-600">${selectedProject.revenue.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Progreso</div>
                  <div className="text-xl font-bold text-blue-600">{selectedProject.progress}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fecha de Inicio:</span>
                  <span className="ml-2 text-gray-900">
                    {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString('es-MX') : 'No definida'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Fecha de Fin:</span>
                  <span className="ml-2 text-gray-900">
                    {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString('es-MX') : 'No definida'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Centro de Costo:</span>
                  <span className="ml-2 text-gray-900">{selectedProject.costCenter?.name || 'No asignado'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => { setShowViewModal(false); openEditModal(selectedProject); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Proyecto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Proyecto</h3>
                  <p className="text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que deseas eliminar el proyecto <strong>{selectedProject.name}</strong>?
                Se eliminarán todos los datos asociados.
              </p>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

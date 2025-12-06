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
  Plus, Search, Download, Eye, Calendar, Clock, DollarSign, User,
  CheckCircle, XCircle, AlertCircle, TrendingUp, FileText, Edit, X, Save, RefreshCw
} from 'lucide-react'

interface TimeEntry {
  id: string
  date: string
  employeeName: string
  employeeId: string
  projectName: string
  projectId: string
  description: string
  hours: number
  hourlyRate: number
  billableAmount: number
  status: string
  isBillable: boolean
}

interface Project {
  id: string
  name: string
  code: string | null
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  hourlyRate?: number
}

export default function BillableTimePage() {
  const router = useRouter()
  const sessionHook = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBillable, setFilterBillable] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    notes: '',
    isBillable: true,
    hourlyRate: '75'
  })

  const loadTimeEntries = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/billable-time?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTimeEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error loading time entries:', error)
      toast.error('Error al cargar registros de tiempo')
    }
    setLoading(false)
  }, [activeCompany?.id])

  const loadProjects = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      const res = await fetch(`/api/projects?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [activeCompany?.id])

  const loadEmployees = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      const res = await fetch(`/api/employees?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    if (sessionHook.status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [sessionHook.status, router])

  useEffect(() => {
    if (sessionHook.status === 'authenticated' && activeCompany?.id) {
      loadTimeEntries()
      loadProjects()
      loadEmployees()
    }
  }, [sessionHook.status, activeCompany?.id, loadTimeEntries, loadProjects, loadEmployees])

  const resetForm = () => {
    setFormData({
      employeeId: '',
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      clockIn: '09:00',
      clockOut: '17:00',
      notes: '',
      isBillable: true,
      hourlyRate: '75'
    })
  }

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const calculateHours = (clockIn: string, clockOut: string): number => {
    const [inH, inM] = clockIn.split(':').map(Number)
    const [outH, outM] = clockOut.split(':').map(Number)
    const inMinutes = inH * 60 + inM
    const outMinutes = outH * 60 + outM
    return Math.max(0, (outMinutes - inMinutes) / 60)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return

    if (!formData.employeeId) {
      toast.error('Seleccione un empleado')
      return
    }

    if (!formData.projectId) {
      toast.error('Seleccione un proyecto')
      return
    }

    setSaving(true)
    try {
      const hours = calculateHours(formData.clockIn, formData.clockOut)
      
      if (hours <= 0) {
        toast.error('La hora de salida debe ser posterior a la hora de entrada')
        setSaving(false)
        return
      }

      // Create time entry via API
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          projectId: formData.projectId,
          clockIn: new Date(`${formData.date}T${formData.clockIn}:00`).toISOString(),
          clockOut: new Date(`${formData.date}T${formData.clockOut}:00`).toISOString(),
          notes: formData.notes,
          status: formData.isBillable ? 'APPROVED' : 'PENDING',
          companyId: activeCompany.id
        })
      })

      if (response.ok) {
        toast.success('Registro de tiempo creado')
        setShowModal(false)
        resetForm()
        loadTimeEntries()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al crear registro')
      }
    } catch (error) {
      console.error('Error saving time entry:', error)
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    if (timeEntries.length === 0) {
      toast.error('No hay registros para exportar')
      return
    }

    const headers = ['Fecha', 'Empleado', 'Proyecto', 'Descripción', 'Horas', 'Tarifa/h', 'Monto', 'Facturable']
    const csvContent = [
      headers.join(','),
      ...timeEntries.map(e => [
        e.date,
        `"${e.employeeName}"`,
        `"${e.projectName}"`,
        `"${e.description}"`,
        e.hours,
        e.hourlyRate,
        e.billableAmount,
        e.isBillable ? 'Sí' : 'No'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tiempo-facturable_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Registros exportados')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Aprobado
        </Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rechazado
        </Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    if (filterBillable === 'billable' && !entry.isBillable) return false
    if (filterBillable === 'non-billable' && entry.isBillable) return false
    if (filterProject !== 'all' && entry.projectId !== filterProject) return false
    if (searchTerm && 
        !entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !entry.projectName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !entry.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0)
  const billableHours = filteredEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0)
  const totalBillableAmount = filteredEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.billableAmount, 0)
  const pendingApproval = timeEntries.filter(e => e.status === 'pending').length
  const avgHourlyRate = billableHours > 0 ? totalBillableAmount / billableHours : 0

  const uniqueProjects = [...new Set(timeEntries.map(e => e.projectId))]

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
            <h1 className="text-2xl font-bold text-gray-900">Tiempo Facturable</h1>
            <p className="text-gray-600 mt-1">Registra y gestiona las horas trabajadas en proyectos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTimeEntries}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={openModal}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Entrada
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalHours.toFixed(1)}h</div>
              <div className="text-sm text-blue-700">Total Horas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{billableHours.toFixed(1)}h</div>
              <div className="text-sm text-green-700">Horas Facturables</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalBillableAmount.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Monto Facturable</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{pendingApproval}</div>
              <div className="text-sm text-orange-700">Pendientes Aprobar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900">${avgHourlyRate.toFixed(0)}</div>
              <div className="text-sm text-indigo-700">Tarifa Promedio/h</div>
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
                  placeholder="Buscar por empleado, proyecto o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">Todos los Proyectos</option>
                {uniqueProjects.map(projectId => {
                  const entry = timeEntries.find(e => e.projectId === projectId)
                  return (
                    <option key={projectId} value={projectId}>
                      {entry?.projectName}
                    </option>
                  )
                })}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterBillable}
                onChange={(e) => setFilterBillable(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="billable">Facturable</option>
                <option value="non-billable">No Facturable</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Tiempo ({filteredEntries.length} entradas)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proyecto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Horas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tarifa/h</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Facturable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Clock className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500">No hay registros de tiempo</p>
                          <Button onClick={openModal}>
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Primera Entrada
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEntries.map((entry) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${!entry.isBillable ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(entry.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{entry.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{entry.projectName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 max-w-xs truncate block">{entry.description}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-900">{entry.hours}h</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        ${entry.hourlyRate.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${entry.isBillable ? 'text-green-600' : 'text-gray-400'}`}>
                          ${entry.billableAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.isBillable ? (
                          <Badge className="bg-green-100 text-green-700">Sí</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700">No</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredEntries.length > 0 && (
                  <tfoot className="bg-gray-50 border-t font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-900">TOTALES:</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{totalHours.toFixed(1)}h</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">${totalBillableAmount.toLocaleString()}</td>
                      <td colSpan={2} className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sistema de Tiempo Facturable</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Gestión completa de horas trabajadas con workflow de aprobación y facturación integrada.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Registro de Tiempo:</strong> Empleados registran horas diarias por proyecto</li>
                  <li>• <strong>Facturable vs No Facturable:</strong> Distingue horas cobrables al cliente</li>
                  <li>• <strong>Tarifas Personalizadas:</strong> Cada empleado tiene tarifa horaria según rol</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Time Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Nueva Entrada de Tiempo</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar empleado</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.code ? `${proj.code} - ` : ''}{proj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Entrada</label>
                  <Input
                    type="time"
                    value={formData.clockIn}
                    onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Salida</label>
                  <Input
                    type="time"
                    value={formData.clockOut}
                    onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Horas calculadas:</div>
                <div className="text-xl font-bold text-gray-900">
                  {calculateHours(formData.clockIn, formData.clockOut).toFixed(2)} horas
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa por Hora</label>
                <Input
                  type="text"
                  className="amount-input"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="75.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Descripción del trabajo realizado"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBillable"
                  checked={formData.isBillable}
                  onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isBillable" className="text-sm text-gray-700">
                  Tiempo facturable al cliente
                </label>
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
                  Guardar Entrada
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

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
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  AlertCircle,
  TrendingUp,
  Coffee,
  PlayCircle,
  StopCircle,
  X,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react'

interface TimesheetEntry {
  id: string
  employee: string
  employeeId: string
  department: string
  weekStarting: string
  weekEnding: string
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  breakHours: number
  totalHours: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submittedDate?: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

export default function TimesheetPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [weekFilter, setWeekFilter] = useState<string>('current')
  
  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryType, setEntryType] = useState('REGULAR')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [timeEntries, setTimeEntries] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadTimesheets = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/payroll/timesheets?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setTimesheets(data.timesheets || [])
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadTimesheets()
    }
  }, [status, activeCompany, loadTimesheets])

  const openRegisterModal = async () => {
    setShowRegisterModal(true)
    setProcessing(true)
    try {
      const response = await fetch('/api/employees?status=ACTIVE')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setProcessing(false)
    }
  }

  const closeModal = () => {
    setShowRegisterModal(false)
    setSelectedEmployee('')
    setClockInTime('')
    setClockOutTime('')
    setNotes('')
  }

  const saveTimeEntry = async () => {
    if (!selectedEmployee || !clockInTime) {
      setMessage({ type: 'error', text: 'Seleccione un empleado y hora de entrada' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/payroll/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          date: entryDate,
          clockIn: `${entryDate}T${clockInTime}:00`,
          clockOut: clockOutTime ? `${entryDate}T${clockOutTime}:00` : null,
          type: entryType,
          notes
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Registro guardado exitosamente' })
        setTimeout(() => setMessage(null), 3000)
        closeModal()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al guardar' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error saving time entry:', error)
      setMessage({ type: 'error', text: 'Error al guardar el registro' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setProcessing(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Empleado', 'Departamento', 'Semana', 'Horas Regulares', 'Horas Extra', 'Total', 'Estado']
    const rows = timesheets.map(t => [
      t.employee,
      t.department,
      `${t.weekStarting} - ${t.weekEnding}`,
      t.regularHours,
      t.overtimeHours,
      t.totalHours,
      t.status
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `control-horas-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Edit className="w-3 h-3" /> Borrador
        </Badge>
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Enviada
        </Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Aprobada
        </Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rechazada
        </Badge>
      default:
        return null
    }
  }

  const filteredTimesheets = timesheets.filter(ts => {
    if (filterStatus !== 'all' && ts.status !== filterStatus) return false
    if (filterDepartment !== 'all' && ts.department !== filterDepartment) return false
    if (searchTerm && !ts.employee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !ts.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const uniqueDepartments = Array.from(new Set(timesheets.map(ts => ts.department)))

  const totalTimesheets = timesheets.length
  const pendingApproval = timesheets.filter(ts => ts.status === 'submitted').length
  const totalHoursThisWeek = timesheets.reduce((sum, ts) => sum + ts.totalHours, 0)
  const overtimeHoursThisWeek = timesheets.reduce((sum, ts) => sum + ts.overtimeHours + (ts.doubleTimeHours * 2), 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
            <p className="text-gray-600 mt-1">
              Registra y aprueba las horas trabajadas de tus empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={openRegisterModal}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Horas
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalTimesheets}</div>
              <div className="text-sm text-blue-700">Registros Esta Semana</div>
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

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalHoursThisWeek}</div>
              <div className="text-sm text-green-700">Horas Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{overtimeHoursThisWeek}</div>
              <div className="text-sm text-purple-700">Horas Extra</div>
            </CardContent>
          </Card>
        </div>

        {/* Week Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select 
                  className="px-4 py-2 border rounded-lg font-semibold"
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value)}
                >
                  <option value="previous">Semana Anterior (Nov 10-16)</option>
                  <option value="current">Semana Actual (Nov 17-23)</option>
                  <option value="next">Próxima Semana (Nov 24-30)</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Período: <strong>17 Nov - 23 Nov 2025</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar empleado..."
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
                <option value="draft">Borradores</option>
                <option value="submitted">Enviadas</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">Todos los Departamentos</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Timesheets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Asistencia ({filteredTimesheets.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Período</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Horas Regulares</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Horas Extra</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tiempo Doble</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Total Horas</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTimesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">{ts.employee}</div>
                        <div className="text-xs text-gray-500">{ts.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ts.department}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-xs text-gray-700">
                          {new Date(ts.weekStarting).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - {new Date(ts.weekEnding).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-gray-900">{ts.regularHours}h</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-orange-600">
                          {ts.overtimeHours > 0 ? `${ts.overtimeHours}h` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-red-600">
                          {ts.doubleTimeHours > 0 ? `${ts.doubleTimeHours}h` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-base font-bold text-blue-600">{ts.totalHours}h</div>
                        <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                          <Coffee className="w-3 h-3" /> {ts.breakHours}h descanso
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(ts.status)}
                        {ts.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            por {ts.approvedBy}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {ts.status === 'submitted' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {ts.status === 'draft' && (
                            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
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
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Control de Asistencia y Horas</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema completo para el registro y aprobación de horas trabajadas según la legislación laboral mexicana.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Horas regulares:</strong> Máximo 8 horas diarias / 48 semanales (LFT Art. 61)</li>
                  <li>• <strong>Tiempo extra:</strong> Primeras 9 horas pagadas al 200% (LFT Art. 66)</li>
                  <li>• <strong>Tiempo doble:</strong> Excedente de 9 horas pagadas al 300% (LFT Art. 68)</li>
                  <li>• <strong>Flujo de aprobación:</strong> Borrador → Enviada → Aprobada/Rechazada</li>
                  <li>• <strong>Integración automática:</strong> Vincula con cálculo de nómina</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Registrar Horas */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-lg">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold">Registrar Horas</h2>
                  <p className="text-sm text-gray-500">Registra entrada y salida de empleados</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {processing && employees.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Empleado</label>
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Seleccionar empleado...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - {emp.department || emp.position}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha</label>
                      <Input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Hora de Entrada</label>
                        <Input
                          type="time"
                          value={clockInTime}
                          onChange={(e) => setClockInTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Hora de Salida</label>
                        <Input
                          type="time"
                          value={clockOutTime}
                          onChange={(e) => setClockOutTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo</label>
                      <select
                        value={entryType}
                        onChange={(e) => setEntryType(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="OVERTIME">Tiempo Extra</option>
                        <option value="HOLIDAY">Día Festivo</option>
                        <option value="SICK">Enfermedad</option>
                        <option value="VACATION">Vacaciones</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                      <Input
                        placeholder="Agregar notas..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button onClick={saveTimeEntry} disabled={processing || !selectedEmployee}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

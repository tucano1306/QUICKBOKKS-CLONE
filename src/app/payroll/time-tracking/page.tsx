'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Play,
  Square,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Timer,
  Plus,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'

interface TimeEntry {
  id: string
  employeeId: string
  date: string
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  hoursWorked: number | null
  overtime: number
  notes: string | null
  status: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNumber: string
    department: string | null
    position: string
  }
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNumber: string
  department: string | null
}

export default function TimeTrackingPage() {
  const { status } = useSession()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState({ totalEntries: 0, totalHours: 0, totalOvertime: 0, pendingApproval: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: ''
  })
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    breakMinutes: 60,
    overtime: 0,
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/auth/login')
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar empleados
      const empRes = await fetch('/api/employees?status=ACTIVE')
      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(empData.data || empData)
      }

      // Cargar entradas de tiempo
      const params = new URLSearchParams()
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.status) params.append('status', filters.status)

      const res = await fetch(`/api/payroll/time-entries?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setStats(data.stats || { totalEntries: 0, totalHours: 0, totalOvertime: 0, pendingApproval: 0 })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const clockInDate = new Date(`${formData.date}T${formData.clockIn}:00`)
      const clockOutDate = formData.clockOut ? new Date(`${formData.date}T${formData.clockOut}:00`) : null

      const payload = {
        ...formData,
        date: formData.date,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate?.toISOString()
      }

      let res
      if (editingEntry) {
        res = await fetch('/api/payroll/time-entries', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEntry.id, ...payload })
        })
      } else {
        res = await fetch('/api/payroll/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        setShowModal(false)
        setEditingEntry(null)
        resetForm()
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Error al guardar la entrada')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/payroll/time-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'APPROVED' })
      })
      if (res.ok) loadData()
    } catch (error) {
      console.error('Error approving entry:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/payroll/time-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'REJECTED' })
      })
      if (res.ok) loadData()
    } catch (error) {
      console.error('Error rejecting entry:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada de tiempo?')) return
    try {
      const res = await fetch(`/api/payroll/time-entries?id=${id}`, { method: 'DELETE' })
      if (res.ok) loadData()
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    const clockIn = new Date(entry.clockIn)
    const clockOut = entry.clockOut ? new Date(entry.clockOut) : null
    setFormData({
      employeeId: entry.employeeId,
      date: new Date(entry.date).toISOString().split('T')[0],
      clockIn: clockIn.toTimeString().slice(0, 5),
      clockOut: clockOut ? clockOut.toTimeString().slice(0, 5) : '',
      breakMinutes: entry.breakMinutes,
      overtime: entry.overtime,
      notes: entry.notes || ''
    })
    setShowModal(true)
  }

  const handleExport = () => {
    const csv = [
      ['Empleado', 'Número', 'Fecha', 'Entrada', 'Salida', 'Descanso', 'Horas', 'Extra', 'Estado'].join(','),
      ...entries.map(e => [
        `${e.employee.firstName} ${e.employee.lastName}`,
        e.employee.employeeNumber,
        new Date(e.date).toLocaleDateString(),
        new Date(e.clockIn).toLocaleTimeString(),
        e.clockOut ? new Date(e.clockOut).toLocaleTimeString() : '-',
        `${e.breakMinutes} min`,
        e.hoursWorked?.toFixed(2) || '-',
        e.overtime.toFixed(2),
        e.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `horas_${filters.startDate}_${filters.endDate}.csv`
    a.click()
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      clockIn: '09:00',
      clockOut: '17:00',
      breakMinutes: 60,
      overtime: 0,
      notes: ''
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado'
    }
    return <Badge className={styles[status]}>{labels[status]}</Badge>
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⏱️ Control de Horas</h1>
            <p className="text-gray-600">Registro y aprobación de horas trabajadas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { resetForm(); setEditingEntry(null); setShowModal(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Horas
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Registros</p>
                  <p className="text-2xl font-bold">{stats.totalEntries}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Horas</p>
                  <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Horas Extra</p>
                  <p className="text-2xl font-bold">{stats.totalOvertime.toFixed(1)}</p>
                </div>
                <Timer className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Por Aprobar</p>
                  <p className="text-2xl font-bold">{stats.pendingApproval}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                >
                  <option value="">Todos</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="APPROVED">Aprobado</option>
                  <option value="REJECTED">Rechazado</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={loadData} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de entradas */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay registros de tiempo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Empleado</th>
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-left py-2">Entrada</th>
                      <th className="text-left py-2">Salida</th>
                      <th className="text-right py-2">Horas</th>
                      <th className="text-right py-2">Extra</th>
                      <th className="text-left py-2">Estado</th>
                      <th className="text-right py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium">{entry.employee.firstName} {entry.employee.lastName}</div>
                          <div className="text-sm text-gray-500">{entry.employee.department}</div>
                        </td>
                        <td className="py-3">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="py-3">{new Date(entry.clockIn).toLocaleTimeString()}</td>
                        <td className="py-3">
                          {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '-'}
                        </td>
                        <td className="py-3 text-right">{entry.hoursWorked?.toFixed(2) || '-'}</td>
                        <td className="py-3 text-right">{entry.overtime > 0 ? entry.overtime.toFixed(2) : '-'}</td>
                        <td className="py-3">{getStatusBadge(entry.status)}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {entry.status === 'PENDING' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleApprove(entry.id)}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleReject(entry.id)}>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(entry.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingEntry ? '✏️ Editar Registro' : '🕒 Registrar Horas'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Empleado</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                    disabled={!!editingEntry}
                  >
                    <option value="">Seleccionar empleado</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora Entrada</label>
                    <Input
                      type="time"
                      value={formData.clockIn}
                      onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora Salida</label>
                    <Input
                      type="time"
                      value={formData.clockOut}
                      onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Descanso (min)</label>
                    <Input
                      type="number"
                      value={formData.breakMinutes}
                      onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Horas Extra</label>
                    <Input
                      type="number"
                      value={formData.overtime}
                      onChange={(e) => setFormData({ ...formData, overtime: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingEntry(null) }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingEntry ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

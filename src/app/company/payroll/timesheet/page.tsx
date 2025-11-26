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
  StopCircle
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
  const [weekFilter, setWeekFilter] = useState<string>('current')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const timesheets: TimesheetEntry[] = [
    {
      id: 'TS-001',
      employee: 'Juan Carlos Pérez',
      employeeId: 'EMP-001',
      department: 'Desarrollo',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 5,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 45,
      status: 'approved',
      submittedDate: '2025-11-23',
      approvedBy: 'Ana Martínez',
      approvedDate: '2025-11-24',
      notes: 'Proyecto especial completado'
    },
    {
      id: 'TS-002',
      employee: 'María González',
      employeeId: 'EMP-002',
      department: 'Contabilidad',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 0,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 40,
      status: 'approved',
      submittedDate: '2025-11-23',
      approvedBy: 'Ana Martínez',
      approvedDate: '2025-11-24'
    },
    {
      id: 'TS-003',
      employee: 'Carlos Torres',
      employeeId: 'EMP-003',
      department: 'Ventas',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 42,
      overtimeHours: 3,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 45,
      status: 'submitted',
      submittedDate: '2025-11-23',
      notes: 'Cierre de ventas Q4'
    },
    {
      id: 'TS-004',
      employee: 'Ana Martínez',
      employeeId: 'EMP-004',
      department: 'Administración',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 0,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 40,
      status: 'approved',
      submittedDate: '2025-11-23',
      approvedBy: 'Carlos Torres',
      approvedDate: '2025-11-24'
    },
    {
      id: 'TS-005',
      employee: 'Luis Fernández',
      employeeId: 'EMP-005',
      department: 'Soporte',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 8,
      doubleTimeHours: 2,
      breakHours: 5,
      totalHours: 50,
      status: 'submitted',
      submittedDate: '2025-11-23',
      notes: 'Soporte urgente fin de semana'
    },
    {
      id: 'TS-006',
      employee: 'Pedro Sánchez',
      employeeId: 'EMP-006',
      department: 'IT',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 6,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 46,
      status: 'approved',
      submittedDate: '2025-11-23',
      approvedBy: 'Ana Martínez',
      approvedDate: '2025-11-24',
      notes: 'Migración de servidores'
    },
    {
      id: 'TS-007',
      employee: 'Laura Jiménez',
      employeeId: 'EMP-007',
      department: 'Recursos Humanos',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 38,
      overtimeHours: 0,
      doubleTimeHours: 0,
      breakHours: 4.5,
      totalHours: 38,
      status: 'draft',
      notes: 'Pendiente ajustar viernes'
    },
    {
      id: 'TS-008',
      employee: 'Roberto Díaz',
      employeeId: 'EMP-008',
      department: 'Desarrollo',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 4,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 44,
      status: 'submitted',
      submittedDate: '2025-11-23'
    },
    {
      id: 'TS-009',
      employee: 'Sofia Ramírez',
      employeeId: 'EMP-009',
      department: 'Marketing',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 0,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 40,
      status: 'rejected',
      submittedDate: '2025-11-23',
      notes: 'Revisar entrada de jueves'
    },
    {
      id: 'TS-010',
      employee: 'Miguel Ángel Ruiz',
      employeeId: 'EMP-010',
      department: 'Ventas',
      weekStarting: '2025-11-17',
      weekEnding: '2025-11-23',
      regularHours: 40,
      overtimeHours: 2,
      doubleTimeHours: 0,
      breakHours: 5,
      totalHours: 42,
      status: 'approved',
      submittedDate: '2025-11-23',
      approvedBy: 'Carlos Torres',
      approvedDate: '2025-11-24'
    }
  ]

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
            <Button variant="outline" onClick={() => alert('📥 Exportando hojas de tiempo a CSV')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => alert('⏱️ Registrar Horas\n\nRegistra horas trabajadas')}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Horas
            </Button>
          </div>
        </div>

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
      </div>
    </CompanyTabsLayout>
  )
}

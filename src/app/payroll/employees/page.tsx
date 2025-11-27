'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Calculator,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  TrendingUp,
  Download,
  UserPlus,
  UserMinus,
  History,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
type SalaryType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position: string
  department?: string
  hireDate: string
  terminationDate?: string
  salary: number
  salaryType: SalaryType
  taxId?: string
  bankAccount?: string
  address?: string
  status: EmployeeStatus
  createdAt: string
  _count?: { payrolls: number }
}

interface EmployeeHistory {
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    position: string
    department?: string
    hireDate: string
    terminationDate?: string
    status: EmployeeStatus
  }
  summary: {
    totalPayrolls: number
    totalGross: number
    totalNet: number
    totalDeductions: number
    totalBonuses: number
    averageGross: number
    averageNet: number
  }
  byYear: Array<{ year: number; gross: number; net: number; count: number }>
  payrolls: Array<{
    id: string
    periodStart: string
    periodEnd: string
    grossSalary: number
    deductions: number
    bonuses: number
    netSalary: number
    paymentDate?: string
    paymentMethod: string
    checkNumber?: string
    status: string
  }>
}

type EmployeeFormData = {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  hireDate: string
  salary: string
  salaryType: SalaryType
  taxId: string
  bankAccount: string
  address: string
}

const defaultForm: EmployeeFormData = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  hireDate: new Date().toISOString().split('T')[0],
  salary: '',
  salaryType: 'MONTHLY',
  taxId: '',
  bankAccount: '',
  address: '',
}

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  TERMINATED: 'Terminado',
}

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-yellow-100 text-yellow-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  HOURLY: 'Por Hora',
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function PayrollEmployeesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | EmployeeStatus>('all')
  const [filterDepartment, setFilterDepartment] = useState('all')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeHistory | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      } else {
        toast.error('Error al cargar empleados')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEmployees()
    }
  }, [status, fetchEmployees])

  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department).filter(Boolean))
    return Array.from(depts) as string[]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchTerm ||
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment

      return matchesSearch && matchesStatus && matchesDept
    })
  }, [employees, searchTerm, filterStatus, filterDepartment])

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'ACTIVE')
    const monthlyTotal = active.reduce((sum, emp) => {
      switch (emp.salaryType) {
        case 'MONTHLY':
          return sum + emp.salary
        case 'YEARLY':
          return sum + emp.salary / 12
        case 'BIWEEKLY':
          return sum + (emp.salary * 26) / 12
        case 'WEEKLY':
          return sum + (emp.salary * 52) / 12
        case 'DAILY':
          return sum + emp.salary * 22
        case 'HOURLY':
          return sum + emp.salary * 176
        default:
          return sum
      }
    }, 0)

    return {
      total: employees.length,
      active: active.length,
      inactive: employees.filter((e) => e.status === 'INACTIVE').length,
      terminated: employees.filter((e) => e.status === 'TERMINATED').length,
      monthlyPayroll: monthlyTotal,
    }
  }, [employees])

  const generateEmployeeNumber = () => {
    const count = employees.length + 1
    return `EMP-${String(count).padStart(4, '0')}`
  }

  const handleFormChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const openAddModal = () => {
    setFormData({ ...defaultForm, employeeNumber: generateEmployeeNumber() })
    setShowAddModal(true)
  }

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      position: employee.position,
      department: employee.department || '',
      hireDate: employee.hireDate.split('T')[0],
      salary: String(employee.salary),
      salaryType: employee.salaryType,
      taxId: employee.taxId || '',
      bankAccount: employee.bankAccount || '',
      address: employee.address || '',
    })
    setShowEditModal(true)
  }

  const openProfileModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowProfileModal(true)
  }

  const openHistoryModal = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowHistoryModal(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/employees/${employee.id}/history`)
      if (res.ok) {
        const data = await res.json()
        setEmployeeHistory(data)
      } else {
        toast.error('Error al cargar historial')
      }
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Error al cargar historial')
    } finally {
      setHistoryLoading(false)
    }
  }

  const openDeleteConfirm = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDeleteConfirm(true)
  }

  const handleAddEmployee = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position || !formData.salary) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Empleado agregado exitosamente')
        setShowAddModal(false)
        fetchEmployees()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al agregar empleado')
      }
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error('Error al agregar empleado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Empleado actualizado exitosamente')
        setShowEditModal(false)
        setSelectedEmployee(null)
        fetchEmployees()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al actualizar empleado')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('Error al actualizar empleado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Empleado eliminado')
        setShowDeleteConfirm(false)
        setSelectedEmployee(null)
        fetchEmployees()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al eliminar empleado')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Error al eliminar empleado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeAllModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowProfileModal(false)
    setShowHistoryModal(false)
    setShowDeleteConfirm(false)
    setSelectedEmployee(null)
    setEmployeeHistory(null)
    setFormData(defaultForm)
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Empleados</h1>
            <p className="text-gray-600 mt-1">Administra tu equipo de trabajo y nóminas</p>
          </div>
          <Button onClick={openAddModal} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Agregar Empleado
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Empleados</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactivos</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inactive}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Terminados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.terminated}</p>
                </div>
                <UserMinus className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nómina Mensual</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.monthlyPayroll)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, número, email o puesto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
                <option value="TERMINATED">Terminados</option>
              </select>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">Todos los departamentos</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Empleados</span>
              <span className="text-sm font-normal text-gray-500">
                {filteredEmployees.length} de {employees.length} empleados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin empleados</h3>
                <p className="text-gray-500 mb-4">
                  {employees.length === 0
                    ? 'Agrega tu primer empleado para comenzar'
                    : 'No se encontraron empleados con los filtros actuales'}
                </p>
                {employees.length === 0 && (
                  <Button onClick={openAddModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Empleado
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Empleado</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Puesto</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Departamento</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Salario</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Estado</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Nóminas</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-700 font-medium">
                                {emp.firstName[0]}
                                {emp.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{emp.employeeNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{emp.position}</td>
                        <td className="py-3 px-4">{emp.department || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <p className="font-medium">{formatCurrency(emp.salary)}</p>
                            <p className="text-xs text-gray-500">{SALARY_TYPE_LABELS[emp.salaryType]}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={STATUS_COLORS[emp.status]}>{STATUS_LABELS[emp.status]}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-gray-600">{emp._count?.payrolls || 0}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openProfileModal(emp)}
                              title="Ver perfil"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(emp)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openHistoryModal(emp)}
                              title="Historial laboral"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openDeleteConfirm(emp)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">➕ Agregar Empleado</h2>
                <Button variant="ghost" size="sm" onClick={closeAllModals}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Número de Empleado *</label>
                    <Input
                      value={formData.employeeNumber}
                      onChange={(e) => handleFormChange('employeeNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleFormChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellido *</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleFormChange('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Puesto *</label>
                    <Input
                      value={formData.position}
                      onChange={(e) => handleFormChange('position', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Departamento</label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleFormChange('department', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Contratación</label>
                    <Input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => handleFormChange('hireDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Salario *</label>
                    <Input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => handleFormChange('salary', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Salario</label>
                    <select
                      value={formData.salaryType}
                      onChange={(e) => handleFormChange('salaryType', e.target.value as SalaryType)}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      {Object.entries(SALARY_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">RFC / Tax ID</label>
                    <Input
                      value={formData.taxId}
                      onChange={(e) => handleFormChange('taxId', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <Input
                      value={formData.bankAccount}
                      onChange={(e) => handleFormChange('bankAccount', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={closeAllModals}>
                  Cancelar
                </Button>
                <Button onClick={handleAddEmployee} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Agregar Empleado
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">✏️ Editar Empleado</h2>
                <Button variant="ghost" size="sm" onClick={closeAllModals}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Número de Empleado</label>
                    <Input
                      value={formData.employeeNumber}
                      onChange={(e) => handleFormChange('employeeNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleFormChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellido</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleFormChange('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Puesto</label>
                    <Input
                      value={formData.position}
                      onChange={(e) => handleFormChange('position', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Departamento</label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleFormChange('department', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Contratación</label>
                    <Input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => handleFormChange('hireDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Salario</label>
                    <Input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => handleFormChange('salary', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Salario</label>
                    <select
                      value={formData.salaryType}
                      onChange={(e) => handleFormChange('salaryType', e.target.value as SalaryType)}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      {Object.entries(SALARY_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">RFC / Tax ID</label>
                    <Input
                      value={formData.taxId}
                      onChange={(e) => handleFormChange('taxId', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <Input
                      value={formData.bankAccount}
                      onChange={(e) => handleFormChange('bankAccount', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={closeAllModals}>
                  Cancelar
                </Button>
                <Button onClick={handleEditEmployee} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">📂 Perfil del Empleado</h2>
                <Button variant="ghost" size="sm" onClick={closeAllModals}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-bold text-xl">
                      {selectedEmployee.firstName[0]}
                      {selectedEmployee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h3>
                    <p className="text-gray-500">{selectedEmployee.employeeNumber}</p>
                    <Badge className={STATUS_COLORS[selectedEmployee.status]}>
                      {STATUS_LABELS[selectedEmployee.status]}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Puesto</p>
                      <p className="font-medium">{selectedEmployee.position}</p>
                    </div>
                  </div>
                  {selectedEmployee.department && (
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Departamento</p>
                        <p className="font-medium">{selectedEmployee.department}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  {selectedEmployee.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="font-medium">{selectedEmployee.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Salario</p>
                      <p className="font-medium">
                        {formatCurrency(selectedEmployee.salary)} ({SALARY_TYPE_LABELS[selectedEmployee.salaryType]})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Contratación</p>
                      <p className="font-medium">{formatDate(selectedEmployee.hireDate)}</p>
                    </div>
                  </div>
                  {selectedEmployee.taxId && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">RFC / Tax ID</p>
                        <p className="font-medium">{selectedEmployee.taxId}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.bankAccount && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Cuenta Bancaria</p>
                        <p className="font-medium">{selectedEmployee.bankAccount}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Dirección</p>
                        <p className="font-medium">{selectedEmployee.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => openHistoryModal(selectedEmployee)}>
                  <History className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
                <Button onClick={() => openEditModal(selectedEmployee)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">📑 Historial Laboral</h2>
                <Button variant="ghost" size="sm" onClick={closeAllModals}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {historyLoading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : employeeHistory ? (
                <div className="p-6 space-y-6">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold">
                        {employeeHistory.employee.firstName[0]}
                        {employeeHistory.employee.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold">
                        {employeeHistory.employee.firstName} {employeeHistory.employee.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {employeeHistory.employee.position} • Desde {formatDate(employeeHistory.employee.hireDate)}
                      </p>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Nóminas</p>
                      <p className="text-2xl font-bold">{employeeHistory.summary.totalPayrolls}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Bruto</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(employeeHistory.summary.totalGross)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Neto</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(employeeHistory.summary.totalNet)}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Deducciones</p>
                      <p className="text-xl font-bold text-orange-700">
                        {formatCurrency(employeeHistory.summary.totalDeductions)}
                      </p>
                    </div>
                  </div>

                  {/* By Year */}
                  {employeeHistory.byYear.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Resumen por Año</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {employeeHistory.byYear.map((year) => (
                          <div key={year.year} className="border rounded-lg p-4">
                            <p className="text-lg font-bold">{year.year}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Nóminas:</span>
                                <span>{year.count}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Bruto:</span>
                                <span>{formatCurrency(year.gross)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Neto:</span>
                                <span className="font-medium">{formatCurrency(year.net)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payroll History */}
                  <div>
                    <h4 className="font-semibold mb-3">Historial de Nóminas</h4>
                    {employeeHistory.payrolls.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Sin registros de nómina</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-2 px-3">Período</th>
                              <th className="text-right py-2 px-3">Bruto</th>
                              <th className="text-right py-2 px-3">Deducciones</th>
                              <th className="text-right py-2 px-3">Bonos</th>
                              <th className="text-right py-2 px-3">Neto</th>
                              <th className="text-center py-2 px-3">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employeeHistory.payrolls.map((payroll) => (
                              <tr key={payroll.id} className="border-b">
                                <td className="py-2 px-3">
                                  {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}
                                </td>
                                <td className="py-2 px-3 text-right">{formatCurrency(payroll.grossSalary)}</td>
                                <td className="py-2 px-3 text-right text-red-600">
                                  -{formatCurrency(payroll.deductions)}
                                </td>
                                <td className="py-2 px-3 text-right text-green-600">
                                  +{formatCurrency(payroll.bonuses)}
                                </td>
                                <td className="py-2 px-3 text-right font-medium">
                                  {formatCurrency(payroll.netSalary)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <Badge
                                    className={
                                      payroll.status === 'PAID'
                                        ? 'bg-green-100 text-green-700'
                                        : payroll.status === 'APPROVED'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }
                                  >
                                    {payroll.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">No se pudo cargar el historial</div>
              )}
              <div className="p-6 border-t flex justify-end">
                <Button variant="outline" onClick={closeAllModals}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">¿Eliminar empleado?</h3>
                    <p className="text-gray-500">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  {selectedEmployee._count && selectedEmployee._count.payrolls > 0
                    ? 'Este empleado tiene registros de nómina. Se marcará como terminado en lugar de eliminarse.'
                    : 'Esta acción no se puede deshacer.'}
                </p>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={closeAllModals}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteEmployee}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {selectedEmployee._count && selectedEmployee._count.payrolls > 0 ? 'Marcar como Terminado' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

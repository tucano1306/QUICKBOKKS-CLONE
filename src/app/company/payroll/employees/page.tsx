'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, UserCheck, Mail, Phone, Briefcase, DollarSign, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  salary: number
  startDate: string
  status: string
}

export default function EmployeesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: 0,
    startDate: '',
    status: 'ACTIVE'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchEmployees()
    }
  }, [status, activeCompany])

  useEffect(() => {
    const filtered = employees.filter(
      (employee) =>
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEmployees(filtered)
  }, [searchTerm, employees])

  const fetchEmployees = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/employees?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setEmployees(Array.isArray(data) ? data : [])
        setFilteredEmployees(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Error al cargar empleados')
    } finally {
      setIsLoading(false)
    }
  }

  // Función para abrir modal de edición
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEditFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      startDate: employee.startDate ? (typeof employee.startDate === 'string' ? employee.startDate.split('T')[0] : new Date(employee.startDate).toISOString().split('T')[0]) : '',
      status: employee.status
    })
    setShowEditModal(true)
  }

  // Función para guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          companyId: activeCompany?.id
        })
      })

      if (response.ok) {
        toast.success('✅ Empleado actualizado exitosamente')
        setShowEditModal(false)
        setSelectedEmployee(null)
        fetchEmployees() // Recargar lista
      } else {
        throw new Error('Error al actualizar')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('Error al actualizar empleado')
    }
  }

  // Función para abrir modal de eliminación
  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDeleteModal(true)
  }

  // Función para confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('✅ Empleado eliminado exitosamente')
        setShowDeleteModal(false)
        setSelectedEmployee(null)
        fetchEmployees() // Recargar lista
      } else {
        throw new Error('Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Error al eliminar empleado')
    }
  }

  const stats = [
    {
      label: 'Total Empleados',
      value: employees.length,
      icon: UserCheck,
      color: 'blue'
    },
    {
      label: 'Empleados Activos',
      value: employees.filter(e => e.status === 'ACTIVE').length,
      icon: UserCheck,
      color: 'green'
    },
    {
      label: 'Nómina Mensual',
      value: `$${employees.reduce((sum, e) => sum + e.salary, 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'purple'
    },
    {
      label: 'Departamentos',
      value: new Set(employees.map(e => e.department)).size,
      icon: Briefcase,
      color: 'orange'
    }
  ]

  if (status === 'loading' || isLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
            <p className="text-gray-600 mt-1">
              Gestiona el equipo y la nómina de tu empresa
            </p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowNewEmployeeModal(true)}>
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">{stat.label}</div>
                    <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div className={`text-2xl font-bold text-${stat.color}-600`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Employee List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Directorio de Empleados</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Salario</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No hay empleados registrados</p>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar primer empleado
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {employee.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {employee.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          {employee.position}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.department}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${employee.salary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(employee.startDate).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                            title="Editar empleado"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(employee)}
                            title="Eliminar empleado"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal Editar Empleado */}
        {showEditModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Editar Empleado: {selectedEmployee.firstName} {selectedEmployee.lastName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input 
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Apellido</label>
                    <Input 
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email" 
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input 
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Puesto</label>
                    <Input 
                      value={editFormData.position}
                      onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Departamento</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                    >
                      <option value="Contabilidad">Contabilidad</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Operaciones">Operaciones</option>
                      <option value="Administración">Administración</option>
                      <option value="IT">IT</option>
                      <option value="RRHH">RRHH</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Salario Anual</label>
                    <Input 
                      type="number" 
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({...editFormData, salary: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Inicio</label>
                    <Input 
                      type="date" 
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowEditModal(false)
                    setSelectedEmployee(null)
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Confirmar Eliminación */}
        {showDeleteModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Confirmar Eliminación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  ¿Estás seguro de que deseas eliminar al empleado{' '}
                  <span className="font-semibold text-gray-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  Esta acción no se puede deshacer. Se eliminarán todos los registros asociados a este empleado.
                </p>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedEmployee(null)
                  }}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmDelete}>
                    Eliminar Empleado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Nuevo Empleado */}
        {showNewEmployeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewEmployeeModal(false)}>
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Nuevo Empleado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input placeholder="Juan" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Apellido</label>
                    <Input placeholder="Pérez" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="juan.perez@empresa.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input placeholder="(555) 123-4567" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Puesto</label>
                    <Input placeholder="Contador Senior" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Departamento</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Contabilidad</option>
                      <option>Ventas</option>
                      <option>Operaciones</option>
                      <option>Administración</option>
                      <option>IT</option>
                      <option>RRHH</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Salario Anual</label>
                    <Input type="number" placeholder="75000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Inicio</label>
                    <Input type="date" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">SSN / RFC</label>
                    <Input placeholder="123-45-6789" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo de Empleado</label>
                    <select className="w-full border rounded-md p-2">
                      <option>W-2 Employee</option>
                      <option>1099 Contractor</option>
                      <option>1099-NEC</option>
                      <option>1099-MISC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Dirección</label>
                  <Input placeholder="123 Main Street, Miami, FL 33101" />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Información de Nómina</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Método de Pago</label>
                      <select className="w-full border rounded-md p-2">
                        <option>Depósito Directo</option>
                        <option>Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Frecuencia de Pago</label>
                      <select className="w-full border rounded-md p-2">
                        <option>Quincenal</option>
                        <option>Semanal</option>
                        <option>Mensual</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Retenciones (W-4)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Filing Status</label>
                      <select className="w-full border rounded-md p-2">
                        <option>Single</option>
                        <option>Married Filing Jointly</option>
                        <option>Married Filing Separately</option>
                        <option>Head of Household</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Allowances</label>
                      <Input type="number" placeholder="1" defaultValue="1" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowNewEmployeeModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    toast.success('✅ Empleado creado exitosamente\n\nEn producción, esto enviaría:\nPOST /api/payroll/employees')
                    setShowNewEmployeeModal(false)
                  }}>
                    Crear Empleado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

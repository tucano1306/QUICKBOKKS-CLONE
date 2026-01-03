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
  const { status } = useSession()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeCompany, router])

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
    // Format start date
    let formattedStartDate = ''
    if (employee.startDate) {
      if (typeof employee.startDate === 'string') {
        formattedStartDate = employee.startDate.split('T')[0]
      } else {
        formattedStartDate = new Date(employee.startDate).toISOString().split('T')[0]
      }
    }
    setEditFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      startDate: formattedStartDate,
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
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowNewEmployeeModal(true)}
                        >
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
          <>
            <button
              type="button" 
              className="fixed inset-0 bg-black/50 z-40" 
              onClick={() => setShowEditModal(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowEditModal(false)}
              aria-label="Cerrar modal"
            />
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              aria-labelledby="edit-modal-title"
            >
              <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle id="edit-modal-title">Editar Empleado: {selectedEmployee.firstName} {selectedEmployee.lastName}</CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-firstName" className="text-sm font-medium">Nombre</label>
                    <Input 
                      id="edit-firstName"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-lastName" className="text-sm font-medium">Apellido</label>
                    <Input 
                      id="edit-lastName"
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-email" className="text-sm font-medium">Email</label>
                    <Input 
                      id="edit-email"
                      type="email" 
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-phone" className="text-sm font-medium">Teléfono</label>
                    <Input 
                      id="edit-phone"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-position" className="text-sm font-medium">Puesto</label>
                    <Input 
                      id="edit-position"
                      value={editFormData.position}
                      onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-department" className="text-sm font-medium">Departamento</label>
                    <select 
                      id="edit-department"
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
                    <label htmlFor="edit-salary" className="text-sm font-medium">Salario Anual</label>
                    <Input 
                      id="edit-salary"
                      type="text"
                      className="amount-input"
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({...editFormData, salary: Number(e.target.value.replaceAll(',', ''))})}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-startDate" className="text-sm font-medium">Fecha de Inicio</label>
                    <Input 
                      id="edit-startDate"
                      type="date" 
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-status" className="text-sm font-medium">Estado</label>
                  <select 
                    id="edit-status"
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
          </>
        )}

        {/* Modal Confirmar Eliminación */}
        {showDeleteModal && selectedEmployee && (
          <>
            <button
              type="button" 
              className="fixed inset-0 bg-black/50 z-40" 
              onClick={() => setShowDeleteModal(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowDeleteModal(false)}
              aria-label="Cerrar modal"
            />
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              aria-labelledby="delete-modal-title"
            >
              <Card className="w-full max-w-md mx-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle id="delete-modal-title" className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Confirmar Eliminación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  ¿Estás seguro de que deseas eliminar al empleado{' '}
                  <span className="font-semibold text-gray-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </span>?
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
          </>
        )}

        {/* Modal Nuevo Empleado */}
        {showNewEmployeeModal && (
          <>
            <button
              type="button" 
              className="fixed inset-0 bg-black/50 z-40" 
              onClick={() => setShowNewEmployeeModal(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowNewEmployeeModal(false)}
              aria-label="Cerrar modal"
            />
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              aria-labelledby="new-employee-modal-title"
            >
              <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle id="new-employee-modal-title">Nuevo Empleado</CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-firstName" className="text-sm font-medium">Nombre</label>
                    <Input id="new-firstName" placeholder="Juan" />
                  </div>
                  <div>
                    <label htmlFor="new-lastName" className="text-sm font-medium">Apellido</label>
                    <Input id="new-lastName" placeholder="Pérez" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-email" className="text-sm font-medium">Email</label>
                    <Input id="new-email" type="email" placeholder="juan.perez@empresa.com" />
                  </div>
                  <div>
                    <label htmlFor="new-phone" className="text-sm font-medium">Teléfono</label>
                    <Input id="new-phone" placeholder="(555) 123-4567" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-position" className="text-sm font-medium">Puesto</label>
                    <Input id="new-position" placeholder="Contador Senior" />
                  </div>
                  <div>
                    <label htmlFor="new-department" className="text-sm font-medium">Departamento</label>
                    <select id="new-department" className="w-full border rounded-md p-2">
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
                    <label htmlFor="new-salary" className="text-sm font-medium">Salario Anual</label>
                    <Input id="new-salary" type="text" className="amount-input" placeholder="75000" />
                  </div>
                  <div>
                    <label htmlFor="new-startDate" className="text-sm font-medium">Fecha de Inicio</label>
                    <Input id="new-startDate" type="date" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-ssn" className="text-sm font-medium">SSN / RFC</label>
                    <Input id="new-ssn" placeholder="123-45-6789" />
                  </div>
                  <div>
                    <label htmlFor="new-employeeType" className="text-sm font-medium">Tipo de Empleado</label>
                    <select id="new-employeeType" className="w-full border rounded-md p-2">
                      <option>W-2 Employee</option>
                      <option>1099 Contractor</option>
                      <option>1099-NEC</option>
                      <option>1099-MISC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-address" className="text-sm font-medium">Dirección</label>
                  <Input id="new-address" placeholder="123 Main Street, Miami, FL 33101" />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Información de Nómina</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="new-paymentMethod" className="text-sm font-medium">Método de Pago</label>
                      <select id="new-paymentMethod" className="w-full border rounded-md p-2">
                        <option>Depósito Directo</option>
                        <option>Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="new-payFrequency" className="text-sm font-medium">Frecuencia de Pago</label>
                      <select id="new-payFrequency" className="w-full border rounded-md p-2">
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
                      <label htmlFor="new-filingStatus" className="text-sm font-medium">Filing Status</label>
                      <select id="new-filingStatus" className="w-full border rounded-md p-2">
                        <option>Single</option>
                        <option>Married Filing Jointly</option>
                        <option>Married Filing Separately</option>
                        <option>Head of Household</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="new-allowances" className="text-sm font-medium">Allowances</label>
                      <Input id="new-allowances" type="text" className="amount-input" placeholder="1" defaultValue="1" />
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
          </>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  position: string
  salary: number
  salaryType: string
  status: string
}

export default function NewPayrollRunPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    periodStart: '',
    periodEnd: '',
    paymentDate: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      fetchEmployees()
      // Set default dates (current month)
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setFormData({
        periodStart: firstDay.toISOString().split('T')[0],
        periodEnd: lastDay.toISOString().split('T')[0],
        paymentDate: lastDay.toISOString().split('T')[0],
      })
    }
  }, [status])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/payroll/employees?status=ACTIVE')
      if (response.ok) {
        const data = await response.json()
        setEmployees(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Error al cargar empleados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.periodStart || !formData.periodEnd || !formData.paymentDate) {
      toast.error('Todos los campos son requeridos')
      return
    }

    if (employees.length === 0) {
      toast.error('No hay empleados activos para procesar nómina')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          paymentDate: formData.paymentDate,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Nómina procesada: ${data.length} empleados`)
        router.push('/payroll')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al procesar nómina')
      }
    } catch (error) {
      console.error('Error processing payroll:', error)
      toast.error('Error al procesar nómina')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const totalGross = employees.reduce((sum, emp) => sum + emp.salary, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/payroll">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Nómina</h1>
            <p className="text-gray-600 mt-1">
              Procesar nómina para empleados activos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Empleados Activos
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                Para procesar en esta nómina
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Estimado (Bruto)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Antes de deducciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Periodo de Pago
              </CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {formData.periodStart && formData.periodEnd ? (
                  <>
                    {new Date(formData.periodStart).toLocaleDateString('es-ES', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} - {new Date(formData.periodEnd).toLocaleDateString('es-ES', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </>
                ) : (
                  'Seleccionar fechas'
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Periodo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inicio del Periodo *
                  </label>
                  <Input
                    type="date"
                    value={formData.periodStart}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fin del Periodo *
                  </label>
                  <Input
                    type="date"
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empleados a Procesar ({employees.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay empleados activos para procesar</p>
                  <Link href="/employees/new" className="text-blue-600 hover:underline mt-2 inline-block">
                    Agregar empleado
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {employee.employeeNumber} • {employee.position}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${employee.salary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-600">
                          {employee.salaryType === 'HOURLY' ? 'Por hora' : 
                           employee.salaryType === 'MONTHLY' ? 'Mensual' : 
                           'Anual'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/payroll">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting || employees.length === 0}
            >
              {isSubmitting ? 'Procesando...' : 'Procesar Nómina'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

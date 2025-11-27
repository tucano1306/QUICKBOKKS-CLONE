'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  Calculator,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Download,
  Send
} from 'lucide-react'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  department: string
  salary: number
  payrollType: string
}

interface PayrollCalculation {
  employeeId: string
  employee: Employee
  grossSalary: number
  deductions: {
    isr: number
    imss: number
    other: number
  }
  netSalary: number
}

interface PayrollResult {
  id: string
  employeeId: string
  periodStart: string
  periodEnd: string
  baseSalary: number
  deductions: number
  netPay: number
  status: string
}

export default function NewPayrollRunPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([])
  const [payrollResults, setPayrollResults] = useState<PayrollResult[]>([])
  const [step, setStep] = useState<'config' | 'preview' | 'complete'>('config')
  
  // Form state
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  useEffect(() => {
    fetchEmployees()
    // Set default dates
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    setPeriodStart(firstDay.toISOString().split('T')[0])
    setPeriodEnd(lastDay.toISOString().split('T')[0])
    setPaymentDate(lastDay.toISOString().split('T')[0])
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/employees?status=ACTIVE')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || data)
        // Select all employees by default
        setSelectedEmployees((data.employees || data).map((e: Employee) => e.id))
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePayroll = async () => {
    if (!periodStart || !periodEnd || selectedEmployees.length === 0) {
      alert('Por favor complete todos los campos y seleccione al menos un empleado')
      return
    }

    setCalculating(true)
    try {
      // Calculate for each selected employee
      const calcs: PayrollCalculation[] = []
      
      for (const empId of selectedEmployees) {
        const emp = employees.find(e => e.id === empId)
        if (emp) {
          // Calculate monthly salary for the period
          const startDate = new Date(periodStart)
          const endDate = new Date(periodEnd)
          const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          
          // Assuming monthly salary
          const dailySalary = emp.salary / 30
          const grossSalary = dailySalary * daysInPeriod
          
          // Calculate deductions
          const isrRate = 0.10 // 10% ISR
          const imssRate = 0.03 // 3% IMSS
          
          const isr = grossSalary * isrRate
          const imss = grossSalary * imssRate
          const other = 0
          
          const netSalary = grossSalary - isr - imss - other
          
          calcs.push({
            employeeId: emp.id,
            employee: emp,
            grossSalary,
            deductions: { isr, imss, other },
            netSalary
          })
        }
      }
      
      setCalculations(calcs)
      setStep('preview')
    } catch (error) {
      console.error('Error calculating payroll:', error)
      alert('Error al calcular la nómina')
    } finally {
      setCalculating(false)
    }
  }

  const processPayroll = async () => {
    setCalculating(true)
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          paymentDate,
          employeeIds: selectedEmployees
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPayrollResults(data.payrolls || [])
        setStep('complete')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al procesar la nómina')
      }
    } catch (error) {
      console.error('Error processing payroll:', error)
      alert('Error al procesar la nómina')
    } finally {
      setCalculating(false)
    }
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    )
  }

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map(e => e.id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getTotalGross = () => calculations.reduce((sum, c) => sum + c.grossSalary, 0)
  const getTotalDeductions = () => calculations.reduce((sum, c) => sum + c.deductions.isr + c.deductions.imss + c.deductions.other, 0)
  const getTotalNet = () => calculations.reduce((sum, c) => sum + c.netSalary, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/payroll')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nueva Nómina</h1>
              <p className="text-sm text-gray-500">
                {step === 'config' && 'Paso 1: Configurar período y empleados'}
                {step === 'preview' && 'Paso 2: Revisar cálculos'}
                {step === 'complete' && 'Paso 3: Nómina procesada'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'config' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <span className="font-semibold">1</span>
            <span>Configurar</span>
          </div>
          <div className="h-px flex-1 bg-gray-200"></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'preview' ? 'bg-blue-100 text-blue-700' : 
            step === 'complete' ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'
          }`}>
            <span className="font-semibold">2</span>
            <span>Revisar</span>
          </div>
          <div className="h-px flex-1 bg-gray-200"></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'complete' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <span className="font-semibold">3</span>
            <span>Completado</span>
          </div>
        </div>

        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Period Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Período de Nómina
                </CardTitle>
                <CardDescription>
                  Define el período a calcular
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Pago
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Employee Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Empleados
                    </CardTitle>
                    <CardDescription>
                      Selecciona los empleados a incluir
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAllEmployees}>
                    {selectedEmployees.length === employees.length ? 'Deseleccionar' : 'Seleccionar'} Todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {employees.map(emp => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedEmployees.includes(emp.id) 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <div>
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-gray-500">{emp.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-700">
                            {formatCurrency(emp.salary)}
                          </p>
                          <p className="text-xs text-gray-500">{emp.payrollType}</p>
                        </div>
                      </div>
                    ))}
                    {employees.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No hay empleados activos
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Empleados</p>
                      <p className="text-2xl font-bold">{calculations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Bruto</p>
                      <p className="text-2xl font-bold">{formatCurrency(getTotalGross())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Deducciones</p>
                      <p className="text-2xl font-bold">{formatCurrency(getTotalDeductions())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Neto</p>
                      <p className="text-2xl font-bold">{formatCurrency(getTotalNet())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Cálculos</CardTitle>
                <CardDescription>
                  Período: {periodStart} al {periodEnd}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Empleado</th>
                        <th className="text-left py-3 px-4">Puesto</th>
                        <th className="text-right py-3 px-4">Salario Bruto</th>
                        <th className="text-right py-3 px-4">ISR (10%)</th>
                        <th className="text-right py-3 px-4">IMSS (3%)</th>
                        <th className="text-right py-3 px-4">Salario Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.map(calc => (
                        <tr key={calc.employeeId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium">
                              {calc.employee.firstName} {calc.employee.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{calc.employee.email}</p>
                          </td>
                          <td className="py-3 px-4">{calc.employee.position}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(calc.grossSalary)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600">
                            -{formatCurrency(calc.deductions.isr)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600">
                            -{formatCurrency(calc.deductions.imss)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-green-600">
                            {formatCurrency(calc.netSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td className="py-3 px-4" colSpan={2}>TOTALES</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(getTotalGross())}</td>
                        <td className="py-3 px-4 text-right text-red-600">
                          -{formatCurrency(calculations.reduce((s, c) => s + c.deductions.isr, 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          -{formatCurrency(calculations.reduce((s, c) => s + c.deductions.imss, 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatCurrency(getTotalNet())}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900">
                      ¡Nómina Procesada Exitosamente!
                    </h3>
                    <p className="text-green-700">
                      Se han creado {payrollResults.length} registros de nómina
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Nóminas Generadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">ID</th>
                        <th className="text-left py-3 px-4">Período</th>
                        <th className="text-right py-3 px-4">Salario Base</th>
                        <th className="text-right py-3 px-4">Deducciones</th>
                        <th className="text-right py-3 px-4">Pago Neto</th>
                        <th className="text-left py-3 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollResults.map(result => (
                        <tr key={result.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">
                            {result.id.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-4">
                            {new Date(result.periodStart).toLocaleDateString()} - {new Date(result.periodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(result.baseSalary)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600">
                            -{formatCurrency(result.deductions)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-green-600">
                            {formatCurrency(result.netPay)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                              {result.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={() => router.push('/payroll/checks')}>
                <FileText className="h-4 w-4 mr-2" />
                Generar Cheques
              </Button>
              <Button variant="outline" onClick={() => router.push('/payroll')}>
                <Send className="h-4 w-4 mr-2" />
                Procesar Pagos
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar a Excel
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step !== 'complete' && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => step === 'preview' ? setStep('config') : router.push('/payroll')}
            >
              {step === 'preview' ? 'Modificar Configuración' : 'Cancelar'}
            </Button>
            <Button
              onClick={step === 'config' ? calculatePayroll : processPayroll}
              disabled={calculating || (step === 'config' && selectedEmployees.length === 0)}
            >
              {calculating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step === 'config' ? 'Calcular Nómina' : 'Procesar Nómina'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

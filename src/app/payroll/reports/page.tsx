'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Loader2,
  PieChart,
  BarChart3,
  Printer
} from 'lucide-react'

interface PayrollSummary {
  totalGross: number
  totalDeductions: number
  totalNet: number
  byDepartment: { department: string; total: number; count: number }[]
  byMonth: { month: string; total: number }[]
  employeeCount: number
  averageSalary: number
}

interface Payroll {
  id: string
  periodStart: string
  periodEnd: string
  baseSalary: number
  deductions: number
  netPay: number
  status: string
  employee: {
    firstName: string
    lastName: string
    department: string
    position: string
  }
}

export default function PayrollReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [summary, setSummary] = useState<PayrollSummary>({
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    byDepartment: [],
    byMonth: [],
    employeeCount: 0,
    averageSalary: 0
  })
  
  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [department, setDepartment] = useState('all')
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'by-department' | 'by-employee'>('summary')

  useEffect(() => {
    // Set default date range (current year)
    const today = new Date()
    const yearStart = new Date(today.getFullYear(), 0, 1)
    setStartDate(yearStart.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
    
    fetchData()
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchData()
    }
  }, [startDate, endDate, department])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (department !== 'all') params.append('department', department)

      const response = await fetch(`/api/payroll?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const allPayrolls = data.payrolls || data
        setPayrolls(allPayrolls)
        
        // Calculate summary
        const totalGross = allPayrolls.reduce((sum: number, p: Payroll) => sum + p.baseSalary, 0)
        const totalDeductions = allPayrolls.reduce((sum: number, p: Payroll) => sum + p.deductions, 0)
        const totalNet = allPayrolls.reduce((sum: number, p: Payroll) => sum + p.netPay, 0)
        
        // Group by department
        const deptMap = new Map<string, { total: number; count: number }>()
        allPayrolls.forEach((p: Payroll) => {
          const dept = p.employee?.department || 'Sin departamento'
          const current = deptMap.get(dept) || { total: 0, count: 0 }
          deptMap.set(dept, { total: current.total + p.netPay, count: current.count + 1 })
        })
        
        const byDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
          department,
          total: data.total,
          count: data.count
        }))
        
        // Group by month
        const monthMap = new Map<string, number>()
        allPayrolls.forEach((p: Payroll) => {
          const date = new Date(p.periodStart)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + p.netPay)
        })
        
        const byMonth = Array.from(monthMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month))
        
        // Unique employees
        const uniqueEmployees = new Set(allPayrolls.map((p: Payroll) => p.employee?.firstName + p.employee?.lastName))
        
        setSummary({
          totalGross,
          totalDeductions,
          totalNet,
          byDepartment,
          byMonth,
          employeeCount: uniqueEmployees.size,
          averageSalary: uniqueEmployees.size > 0 ? totalNet / uniqueEmployees.size : 0
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const exportToCSV = () => {
    const headers = ['Empleado', 'Departamento', 'Puesto', 'Período Inicio', 'Período Fin', 'Salario Bruto', 'Deducciones', 'Salario Neto', 'Estado']
    const rows = payrolls.map(p => [
      `${p.employee?.firstName} ${p.employee?.lastName}`,
      p.employee?.department,
      p.employee?.position,
      p.periodStart,
      p.periodEnd,
      p.baseSalary,
      p.deductions,
      p.netPay,
      p.status
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte-nomina-${startDate}-${endDate}.csv`
    link.click()
  }

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
  }

  const departments = Array.from(new Set(payrolls.map(p => p.employee?.department).filter(Boolean)))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/payroll')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reportes de Nómina</h1>
              <p className="text-sm text-gray-500">
                Análisis y reportes detallados de la nómina
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Departamento</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="px-3 py-2 border rounded-lg min-w-[150px]"
                >
                  <option value="all">Todos</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Reporte</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="px-3 py-2 border rounded-lg min-w-[150px]"
                >
                  <option value="summary">Resumen</option>
                  <option value="detailed">Detallado</option>
                  <option value="by-department">Por Departamento</option>
                  <option value="by-employee">Por Empleado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Bruto</p>
                      <p className="text-xl font-bold">{formatCurrency(summary.totalGross)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Deducciones</p>
                      <p className="text-xl font-bold">{formatCurrency(summary.totalDeductions)}</p>
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
                      <p className="text-sm text-gray-500">Total Neto</p>
                      <p className="text-xl font-bold">{formatCurrency(summary.totalNet)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Promedio por Empleado</p>
                      <p className="text-xl font-bold">{formatCurrency(summary.averageSalary)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Content */}
            {reportType === 'summary' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* By Department */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Por Departamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary.byDepartment.map((dept, index) => (
                        <div key={dept.department} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                            />
                            <div>
                              <p className="font-medium">{dept.department}</p>
                              <p className="text-sm text-gray-500">{dept.count} empleados</p>
                            </div>
                          </div>
                          <p className="font-bold">{formatCurrency(dept.total)}</p>
                        </div>
                      ))}
                      {summary.byDepartment.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No hay datos</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* By Month */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Por Mes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary.byMonth.map(month => {
                        const maxTotal = Math.max(...summary.byMonth.map(m => m.total))
                        const percentage = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0
                        
                        return (
                          <div key={month.month}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{getMonthName(month.month)}</span>
                              <span className="text-sm font-bold">{formatCurrency(month.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      {summary.byMonth.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No hay datos</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {reportType === 'detailed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Nóminas</CardTitle>
                  <CardDescription>
                    {payrolls.length} registros encontrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Empleado</th>
                          <th className="text-left py-3 px-4">Departamento</th>
                          <th className="text-left py-3 px-4">Período</th>
                          <th className="text-right py-3 px-4">Bruto</th>
                          <th className="text-right py-3 px-4">Deducciones</th>
                          <th className="text-right py-3 px-4">Neto</th>
                          <th className="text-left py-3 px-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrolls.map(payroll => (
                          <tr key={payroll.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <p className="font-medium">
                                {payroll.employee?.firstName} {payroll.employee?.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{payroll.employee?.position}</p>
                            </td>
                            <td className="py-3 px-4">{payroll.employee?.department}</td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">{formatCurrency(payroll.baseSalary)}</td>
                            <td className="py-3 px-4 text-right text-red-600">
                              -{formatCurrency(payroll.deductions)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">
                              {formatCurrency(payroll.netPay)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                payroll.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                payroll.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {payroll.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-bold">
                          <td className="py-3 px-4" colSpan={3}>TOTALES</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(summary.totalGross)}</td>
                          <td className="py-3 px-4 text-right text-red-600">
                            -{formatCurrency(summary.totalDeductions)}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600">
                            {formatCurrency(summary.totalNet)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportType === 'by-department' && (
              <Card>
                <CardHeader>
                  <CardTitle>Reporte por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Departamento</th>
                          <th className="text-right py-3 px-4">Empleados</th>
                          <th className="text-right py-3 px-4">Total Bruto</th>
                          <th className="text-right py-3 px-4">Total Deducciones</th>
                          <th className="text-right py-3 px-4">Total Neto</th>
                          <th className="text-right py-3 px-4">Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byDepartment.map(dept => {
                          const deptPayrolls = payrolls.filter(p => p.employee?.department === dept.department)
                          const gross = deptPayrolls.reduce((s, p) => s + p.baseSalary, 0)
                          const deductions = deptPayrolls.reduce((s, p) => s + p.deductions, 0)
                          
                          return (
                            <tr key={dept.department} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{dept.department}</td>
                              <td className="py-3 px-4 text-right">{dept.count}</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(gross)}</td>
                              <td className="py-3 px-4 text-right text-red-600">
                                -{formatCurrency(deductions)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-green-600">
                                {formatCurrency(dept.total)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {formatCurrency(dept.total / dept.count)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportType === 'by-employee' && (
              <Card>
                <CardHeader>
                  <CardTitle>Reporte por Empleado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Empleado</th>
                          <th className="text-left py-3 px-4">Puesto</th>
                          <th className="text-left py-3 px-4">Departamento</th>
                          <th className="text-right py-3 px-4">Nóminas</th>
                          <th className="text-right py-3 px-4">Total Pagado</th>
                          <th className="text-right py-3 px-4">Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const employeeMap = new Map<string, { 
                            name: string; 
                            position: string;
                            department: string;
                            count: number; 
                            total: number 
                          }>()
                          
                          payrolls.forEach(p => {
                            const key = `${p.employee?.firstName} ${p.employee?.lastName}`
                            const current = employeeMap.get(key) || { 
                              name: key, 
                              position: p.employee?.position || '',
                              department: p.employee?.department || '',
                              count: 0, 
                              total: 0 
                            }
                            employeeMap.set(key, {
                              ...current,
                              count: current.count + 1,
                              total: current.total + p.netPay
                            })
                          })
                          
                          return Array.from(employeeMap.values()).map(emp => (
                            <tr key={emp.name} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{emp.name}</td>
                              <td className="py-3 px-4">{emp.position}</td>
                              <td className="py-3 px-4">{emp.department}</td>
                              <td className="py-3 px-4 text-right">{emp.count}</td>
                              <td className="py-3 px-4 text-right font-bold text-green-600">
                                {formatCurrency(emp.total)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {formatCurrency(emp.total / emp.count)}
                              </td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

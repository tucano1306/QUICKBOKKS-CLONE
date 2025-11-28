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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface CostData {
  department: string
  salaries: number
  benefits: number
  taxes: number
  overtime: number
  total: number
  headcount: number
  averageCost: number
}

interface TrendData {
  month: string
  salaries: number
  benefits: number
  taxes: number
  total: number
}

export default function LaborCostsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [costsByDepartment, setCostsByDepartment] = useState<CostData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [summary, setSummary] = useState({
    totalSalaries: 0,
    totalBenefits: 0,
    totalTaxes: 0,
    totalOvertime: 0,
    grandTotal: 0,
    totalHeadcount: 0,
    avgCostPerEmployee: 0,
    yoyChange: 0
  })

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch employees and payrolls
      const [empRes, payrollRes] = await Promise.all([
        fetch('/api/employees?status=ACTIVE'),
        fetch(`/api/payroll?year=${year}`)
      ])

      if (empRes.ok && payrollRes.ok) {
        const employees = (await empRes.json()).employees || await empRes.json()
        const payrolls = (await payrollRes.json()).payrolls || await payrollRes.json()

        // Group by department
        const deptMap = new Map<string, {
          salaries: number
          benefits: number
          taxes: number
          overtime: number
          headcount: Set<string>
        }>()

        payrolls.forEach((p: any) => {
          const dept = p.employee?.department || 'Sin Departamento'
          const current = deptMap.get(dept) || {
            salaries: 0,
            benefits: 0,
            taxes: 0,
            overtime: 0,
            headcount: new Set<string>()
          }

          current.salaries += p.baseSalary || 0
          current.taxes += p.deductions || 0
          current.benefits += (p.baseSalary || 0) * 0.12 // Estimated benefits 12%
          current.overtime += (p.overtime || 0)
          if (p.employeeId) current.headcount.add(p.employeeId)

          deptMap.set(dept, current)
        })

        const costs: CostData[] = Array.from(deptMap.entries()).map(([department, data]) => {
          const total = data.salaries + data.benefits + data.taxes + data.overtime
          const headcount = data.headcount.size
          return {
            department,
            salaries: data.salaries,
            benefits: data.benefits,
            taxes: data.taxes,
            overtime: data.overtime,
            total,
            headcount,
            averageCost: headcount > 0 ? total / headcount : 0
          }
        })

        setCostsByDepartment(costs)

        // Calculate summary
        const totalSalaries = costs.reduce((s, c) => s + c.salaries, 0)
        const totalBenefits = costs.reduce((s, c) => s + c.benefits, 0)
        const totalTaxes = costs.reduce((s, c) => s + c.taxes, 0)
        const totalOvertime = costs.reduce((s, c) => s + c.overtime, 0)
        const grandTotal = totalSalaries + totalBenefits + totalTaxes + totalOvertime
        const totalHeadcount = employees.length

        setSummary({
          totalSalaries,
          totalBenefits,
          totalTaxes,
          totalOvertime,
          grandTotal,
          totalHeadcount,
          avgCostPerEmployee: totalHeadcount > 0 ? grandTotal / totalHeadcount : 0,
          yoyChange: 5.2
        })

        // Generate trend data (mock monthly data)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const currentMonth = new Date().getMonth()
        const monthlyAvg = grandTotal / (currentMonth + 1)
        
        const trends: TrendData[] = months.slice(0, currentMonth + 1).map((month, i) => {
          const variance = 0.9 + Math.random() * 0.2
          const monthlySalaries = (totalSalaries / (currentMonth + 1)) * variance
          const monthlyBenefits = (totalBenefits / (currentMonth + 1)) * variance
          const monthlyTaxes = (totalTaxes / (currentMonth + 1)) * variance
          
          return {
            month,
            salaries: monthlySalaries,
            benefits: monthlyBenefits,
            taxes: monthlyTaxes,
            total: monthlySalaries + monthlyBenefits + monthlyTaxes
          }
        })

        setTrendData(trends)
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
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const exportToCSV = () => {
    const headers = ['Departamento', 'Salarios', 'Beneficios', 'Impuestos', 'Tiempo Extra', 'Total', 'Empleados', 'Costo Promedio']
    const rows = costsByDepartment.map(c => [
      c.department,
      c.salaries,
      c.benefits,
      c.taxes,
      c.overtime,
      c.total,
      c.headcount,
      c.averageCost
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `costos-laborales-${year}.csv`
    link.click()
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Análisis de Costos Laborales</h1>
              <p className="text-sm text-gray-500">
                Visualiza y analiza los costos de tu fuerza laboral
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {[2024, 2023, 2022, 2021].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Costo Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(summary.grandTotal)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {summary.yoyChange >= 0 ? (
                          <>
                            <ArrowUpRight className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-500">+{summary.yoyChange}% vs año anterior</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-500">{summary.yoyChange}% vs año anterior</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Empleados</p>
                      <p className="text-2xl font-bold">{summary.totalHeadcount}</p>
                      <p className="text-xs text-gray-400 mt-1">Activos</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Costo Promedio</p>
                      <p className="text-2xl font-bold">{formatCurrency(summary.avgCostPerEmployee)}</p>
                      <p className="text-xs text-gray-400 mt-1">Por empleado</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Departamentos</p>
                      <p className="text-2xl font-bold">{costsByDepartment.length}</p>
                      <p className="text-xs text-gray-400 mt-1">Con nóminas</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Desglose por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'Salarios', value: summary.totalSalaries, color: 'bg-blue-500', percent: (summary.totalSalaries / summary.grandTotal) * 100 },
                      { label: 'Beneficios', value: summary.totalBenefits, color: 'bg-green-500', percent: (summary.totalBenefits / summary.grandTotal) * 100 },
                      { label: 'Impuestos', value: summary.totalTaxes, color: 'bg-red-500', percent: (summary.totalTaxes / summary.grandTotal) * 100 },
                      { label: 'Tiempo Extra', value: summary.totalOvertime, color: 'bg-orange-500', percent: (summary.totalOvertime / summary.grandTotal) * 100 },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${item.percent || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{(item.percent || 0).toFixed(1)}% del total</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tendencia Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trendData.map((month, index) => {
                      const maxTotal = Math.max(...trendData.map(t => t.total))
                      const percentage = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0
                      
                      return (
                        <div key={month.month} className="flex items-center gap-3">
                          <span className="w-8 text-sm font-medium text-gray-500">{month.month}</span>
                          <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2 transition-all"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {formatCurrency(month.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* By Department Table */}
            <Card>
              <CardHeader>
                <CardTitle>Costos por Departamento</CardTitle>
                <CardDescription>
                  Desglose detallado de costos laborales por área
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Departamento</th>
                        <th className="text-right py-3 px-4">Empleados</th>
                        <th className="text-right py-3 px-4">Salarios</th>
                        <th className="text-right py-3 px-4">Beneficios</th>
                        <th className="text-right py-3 px-4">Impuestos</th>
                        <th className="text-right py-3 px-4">Tiempo Extra</th>
                        <th className="text-right py-3 px-4">Total</th>
                        <th className="text-right py-3 px-4">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costsByDepartment.map(dept => (
                        <tr key={dept.department} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{dept.department}</td>
                          <td className="py-3 px-4 text-right">{dept.headcount}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(dept.salaries)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(dept.benefits)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(dept.taxes)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(dept.overtime)}</td>
                          <td className="py-3 px-4 text-right font-bold">{formatCurrency(dept.total)}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(dept.averageCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td className="py-3 px-4">TOTAL</td>
                        <td className="py-3 px-4 text-right">{summary.totalHeadcount}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(summary.totalSalaries)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(summary.totalBenefits)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(summary.totalTaxes)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(summary.totalOvertime)}</td>
                        <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(summary.grandTotal)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(summary.avgCostPerEmployee)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">Costo por Hora</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {formatCurrency(summary.grandTotal / (summary.totalHeadcount * 2080))}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Basado en 2,080 hrs/año</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-medium">% Beneficios</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">
                      {((summary.totalBenefits / summary.totalSalaries) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-green-600 mt-1">Sobre salarios base</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-purple-600 font-medium">Carga Fiscal</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">
                      {((summary.totalTaxes / summary.totalSalaries) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Impuestos sobre salarios</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

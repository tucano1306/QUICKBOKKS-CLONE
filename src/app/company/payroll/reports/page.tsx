'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  BarChart3,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  PieChart,
  Filter,
  Eye,
  X,
  Loader2,
  Printer,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

interface PayrollReport {
  id: string
  type: string
  name: string
  description: string
  icon: any
  color: string
  period: string
}

interface DepartmentCost {
  department: string
  employees: number
  grossPay: number
  deductions: number
  netPay: number
  employerCosts: number
  totalCost: number
}

export default function PayrollReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current')
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PayrollReport | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const reports: PayrollReport[] = [
    {
      id: 'payroll-summary',
      type: 'summary',
      name: 'Resumen de Nómina',
      description: 'Reporte consolidado de percepciones, deducciones y pagos netos',
      icon: BarChart3,
      color: 'blue',
      period: 'Nov 16-30, 2025'
    },
    {
      id: 'tax-report',
      type: 'tax',
      name: 'Reporte de Impuestos',
      description: 'ISR, IMSS e INFONAVIT - Retenciones y aportaciones',
      icon: FileText,
      color: 'red',
      period: 'Nov 16-30, 2025'
    },
    {
      id: 'department-costs',
      type: 'costs',
      name: 'Costos por Departamento',
      description: 'Análisis de costo total de nómina por área',
      icon: PieChart,
      color: 'purple',
      period: 'Nov 16-30, 2025'
    },
    {
      id: 'deductions-report',
      type: 'deductions',
      name: 'Reporte de Deducciones',
      description: 'Detalle de todas las deducciones aplicadas',
      icon: TrendingDown,
      color: 'orange',
      period: 'Nov 16-30, 2025'
    },
    {
      id: 'overtime-report',
      type: 'overtime',
      name: 'Reporte de Horas Extra',
      description: 'Análisis de tiempo extra y tiempo doble',
      icon: Calendar,
      color: 'green',
      period: 'Nov 16-30, 2025'
    },
    {
      id: 'employee-cost',
      type: 'employee',
      name: 'Costo por Empleado',
      description: 'Detalle individual del costo total por empleado',
      icon: Users,
      color: 'indigo',
      period: 'Nov 16-30, 2025'
    }
  ]

  const departmentCosts: DepartmentCost[] = [
    {
      department: 'Desarrollo',
      employees: 3,
      grossPay: 89015.63,
      deductions: 16664.17,
      netPay: 72351.46,
      employerCosts: 12258.77,
      totalCost: 101274.40
    },
    {
      department: 'Administración',
      employees: 1,
      grossPay: 40000,
      deductions: 9307,
      netPay: 30693,
      employerCosts: 5480,
      totalCost: 45480
    },
    {
      department: 'Ventas',
      employees: 2,
      grossPay: 46923.44,
      deductions: 8027.12,
      netPay: 38896.32,
      employerCosts: 6100.05,
      totalCost: 53023.49
    },
    {
      department: 'Contabilidad',
      employees: 1,
      grossPay: 23500,
      deductions: 4334.75,
      netPay: 19165.25,
      employerCosts: 3217.50,
      totalCost: 26717.50
    },
    {
      department: 'IT',
      employees: 1,
      grossPay: 33781.25,
      deductions: 6846.37,
      netPay: 26934.88,
      employerCosts: 4631.50,
      totalCost: 38412.75
    },
    {
      department: 'Soporte',
      employees: 1,
      grossPay: 25687.50,
      deductions: 4611.91,
      netPay: 21075.59,
      employerCosts: 3338.58,
      totalCost: 29026.08
    },
    {
      department: 'Recursos Humanos',
      employees: 1,
      grossPay: 25800,
      deductions: 4934.40,
      netPay: 20865.60,
      employerCosts: 3534,
      totalCost: 29334
    },
    {
      department: 'Marketing',
      employees: 1,
      grossPay: 24200,
      deductions: 4383.40,
      netPay: 19816.60,
      employerCosts: 3267,
      totalCost: 27467
    }
  ]

  const totalEmployees = departmentCosts.reduce((sum, d) => sum + d.employees, 0)
  const totalGrossPay = departmentCosts.reduce((sum, d) => sum + d.grossPay, 0)
  const totalDeductions = departmentCosts.reduce((sum, d) => sum + d.deductions, 0)
  const totalNetPay = departmentCosts.reduce((sum, d) => sum + d.netPay, 0)
  const totalEmployerCosts = departmentCosts.reduce((sum, d) => sum + d.employerCosts, 0)
  const totalCost = departmentCosts.reduce((sum, d) => sum + d.totalCost, 0)

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' }
    }
    return colors[color] || colors.blue
  }

  const openReportModal = (report: PayrollReport) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setSelectedReport(null)
  }

  const exportSingleReport = (report: PayrollReport) => {
    let csvContent = ''
    const filename = `${report.id}-${new Date().toISOString().split('T')[0]}.csv`
    
    if (report.type === 'costs') {
      csvContent = 'Departamento,Empleados,Salario Bruto,Deducciones,Salario Neto,Costos Patronales,Costo Total\n'
      departmentCosts.forEach(dept => {
        csvContent += `${dept.department},${dept.employees},${dept.grossPay},${dept.deductions},${dept.netPay},${dept.employerCosts},${dept.totalCost}\n`
      })
    } else {
      csvContent = `Reporte: ${report.name}\n`
      csvContent += `Tipo: ${report.type}\n`
      csvContent += `Período: ${report.period}\n`
      csvContent += `Descripción: ${report.description}\n\n`
      csvContent += 'Métrica,Valor\n'
      csvContent += `Total Empleados,${totalEmployees}\n`
      csvContent += `Salario Bruto Total,$${totalGrossPay.toFixed(2)}\n`
      csvContent += `Total Deducciones,$${totalDeductions.toFixed(2)}\n`
      csvContent += `Salario Neto Total,$${totalNetPay.toFixed(2)}\n`
      csvContent += `Costos Patronales,$${totalEmployerCosts.toFixed(2)}\n`
      csvContent += `Costo Total,$${totalCost.toFixed(2)}\n`
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportAllReports = async () => {
    setExporting(true)
    
    try {
      // Generar CSV consolidado con todos los reportes
      let csvContent = 'REPORTES CONSOLIDADOS DE NÓMINA\n'
      csvContent += `Empresa: ${activeCompany?.name || 'Mi Empresa'}\n`
      csvContent += `Fecha de exportación: ${new Date().toLocaleDateString('es-MX')}\n\n`
      
      // Resumen general
      csvContent += '=== RESUMEN GENERAL ===\n'
      csvContent += `Total Empleados,${totalEmployees}\n`
      csvContent += `Salario Bruto Total,$${totalGrossPay.toFixed(2)}\n`
      csvContent += `Total Deducciones,$${totalDeductions.toFixed(2)}\n`
      csvContent += `Salario Neto Total,$${totalNetPay.toFixed(2)}\n`
      csvContent += `Costos Patronales,$${totalEmployerCosts.toFixed(2)}\n`
      csvContent += `Costo Total Nómina,$${totalCost.toFixed(2)}\n\n`
      
      // Costos por departamento
      csvContent += '=== COSTOS POR DEPARTAMENTO ===\n'
      csvContent += 'Departamento,Empleados,Salario Bruto,Deducciones,Salario Neto,Costos Patronales,Costo Total\n'
      departmentCosts.forEach(dept => {
        csvContent += `${dept.department},${dept.employees},$${dept.grossPay.toFixed(2)},$${dept.deductions.toFixed(2)},$${dept.netPay.toFixed(2)},$${dept.employerCosts.toFixed(2)},$${dept.totalCost.toFixed(2)}\n`
      })
      csvContent += '\n'
      
      // Lista de reportes disponibles
      csvContent += '=== REPORTES DISPONIBLES ===\n'
      csvContent += 'ID,Nombre,Tipo,Período,Descripción\n'
      reports.forEach(report => {
        csvContent += `${report.id},${report.name},${report.type},${report.period},"${report.description}"\n`
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `reportes-nomina-consolidados-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error al exportar:', error)
      setMessage({ type: 'error', text: 'Error al exportar los reportes' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setExporting(false)
    }
  }

  const printReport = () => {
    window.print()
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Nómina</h1>
            <p className="text-gray-600 mt-1">
              Análisis completo de costos, impuestos y distribución de nómina
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printReport}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={exportAllReports} disabled={exporting}>
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar Todos
            </Button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {message.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            <span className={`${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>{message.text}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalEmployees}</div>
              <div className="text-sm text-blue-700">Total Empleados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalGrossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-green-700">Nómina Bruta</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalNetPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">Nómina Neta</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-orange-700">Costo Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select 
                  className="px-4 py-2 border rounded-lg font-semibold"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="current">Período Actual (Nov 16-30, 2025)</option>
                  <option value="previous">Período Anterior (Nov 1-15, 2025)</option>
                  <option value="october-q2">Octubre 2025 - Quincena 2</option>
                  <option value="october-q1">Octubre 2025 - Quincena 1</option>
                  <option value="month">Todo Noviembre 2025</option>
                  <option value="quarter">Q4 2025</option>
                  <option value="year">2025 Completo</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Quincena 2 - Noviembre 2025
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const colors = getColorClasses(report.color)
            const Icon = report.icon
            return (
              <Card key={report.id} className={`${colors.bg} ${colors.border} hover:shadow-lg transition-shadow cursor-pointer`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${colors.bg} rounded-lg border ${colors.border}`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <Badge className="bg-white text-gray-700 border border-gray-300">
                      {report.period}
                    </Badge>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>{report.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openReportModal(report)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportSingleReport(report)}>
                      <Download className="w-4 h-4 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Department Costs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Costos por Departamento</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportSingleReport(reports.find(r => r.type === 'costs') || reports[2])}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Empleados</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Nómina Bruta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deducciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Nómina Neta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costos Patronales</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Costo Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departmentCosts.map((dept) => (
                    <tr key={dept.department} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">{dept.department}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {dept.employees}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        ${dept.grossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                        -${dept.deductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                        ${dept.netPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-purple-600">
                        ${dept.employerCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-blue-600">
                        ${dept.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {((dept.totalCost / totalCost) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{totalEmployees}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      ${totalGrossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      -${totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      ${totalNetPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-purple-600">
                      ${totalEmployerCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-base text-blue-600">
                      ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Desglose de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Sueldos y Salarios</span>
                  <span className="text-base font-bold text-green-600">
                    ${totalGrossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">IMSS Patronal</span>
                  <span className="text-base font-bold text-purple-600">
                    ${(totalEmployerCosts * 0.65).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">INFONAVIT Patronal</span>
                  <span className="text-base font-bold text-orange-600">
                    ${(totalEmployerCosts * 0.35).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-lg mt-2">
                  <span className="text-base font-bold">Costo Total de Nómina</span>
                  <span className="text-xl font-bold">
                    ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">Métricas Clave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Costo Promedio por Empleado</span>
                  <span className="text-base font-bold text-blue-600">
                    ${(totalCost / totalEmployees).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">% Deducciones del Bruto</span>
                  <span className="text-base font-bold text-red-600">
                    {((totalDeductions / totalGrossPay) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">% Carga Patronal</span>
                  <span className="text-base font-bold text-purple-600">
                    {((totalEmployerCosts / totalGrossPay) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-600 text-white rounded-lg mt-2">
                  <span className="text-base font-bold">Incremento sobre Nómina</span>
                  <span className="text-xl font-bold">
                    {(((totalCost - totalGrossPay) / totalGrossPay) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Reportes de Nómina</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Análisis completo y detallado de todos los aspectos de tu nómina para toma de decisiones y cumplimiento fiscal.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Resumen de Nómina:</strong> Vista consolidada de percepciones, deducciones y pagos netos</li>
                  <li>• <strong>Reporte Fiscal:</strong> ISR, IMSS e INFONAVIT para declaraciones mensuales</li>
                  <li>• <strong>Análisis por Departamento:</strong> Distribución de costos para presupuestación</li>
                  <li>• <strong>Costos Totales:</strong> Incluye nómina bruta + aportaciones patronales (IMSS 8% + INFONAVIT 5%)</li>
                  <li>• <strong>Exportación:</strong> Formatos Excel, PDF y XML para contabilidad y auditoría</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Detalle de Reporte */}
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getColorClasses(selectedReport.color).bg}`}>
                    <selectedReport.icon className={`w-6 h-6 ${getColorClasses(selectedReport.color).text}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReport.name}</h2>
                    <p className="text-sm text-gray-600">{selectedReport.period}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={closeReportModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-gray-600">{selectedReport.description}</p>
                
                {/* Contenido del reporte según tipo */}
                {selectedReport.type === 'summary' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Resumen General</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Empleados</p>
                        <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Nómina Bruta</p>
                        <p className="text-2xl font-bold text-green-600">${totalGrossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Deducciones</p>
                        <p className="text-2xl font-bold text-red-600">${totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Nómina Neta</p>
                        <p className="text-2xl font-bold text-blue-600">${totalNetPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Costos Patronales</p>
                        <p className="text-2xl font-bold text-purple-600">${totalEmployerCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-gray-600">Costo Total</p>
                        <p className="text-2xl font-bold text-indigo-600">${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport.type === 'tax' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Retenciones e Impuestos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-gray-600">ISR Retenido</p>
                        <p className="text-2xl font-bold text-red-600">${(totalDeductions * 0.6).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600">Cuotas IMSS (Empleado)</p>
                        <p className="text-2xl font-bold text-blue-600">${(totalDeductions * 0.25).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600">Aportaciones INFONAVIT</p>
                        <p className="text-2xl font-bold text-green-600">${(totalDeductions * 0.15).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-purple-100 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-purple-900">Total Aportaciones Patronales</p>
                        <p className="text-xl font-bold text-purple-600">${totalEmployerCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport.type === 'costs' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Desglose por Departamento</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Departamento</th>
                          <th className="px-3 py-2 text-center">Empleados</th>
                          <th className="px-3 py-2 text-right">Costo Total</th>
                          <th className="px-3 py-2 text-right">% del Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {departmentCosts.map((dept) => (
                          <tr key={dept.department}>
                            <td className="px-3 py-2 font-medium">{dept.department}</td>
                            <td className="px-3 py-2 text-center">{dept.employees}</td>
                            <td className="px-3 py-2 text-right">${dept.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">{((dept.totalCost / totalCost) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(selectedReport.type === 'deductions' || selectedReport.type === 'overtime' || selectedReport.type === 'employee') && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">
                        Este reporte muestra un resumen. Para ver el detalle completo, exporte el reporte.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Empleados</p>
                        <p className="text-xl font-bold">{totalEmployees}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Período</p>
                        <p className="text-xl font-bold">{selectedReport.period}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => exportSingleReport(selectedReport)}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button variant="outline" onClick={printReport}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={closeReportModal}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

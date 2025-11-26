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
  Calculator,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Send
} from 'lucide-react'

interface PayrollCalculation {
  id: string
  employee: string
  employeeId: string
  department: string
  period: string
  periodStart: string
  periodEnd: string
  baseSalary: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  overtimePay: number
  doubleTimePay: number
  bonuses: number
  commissions: number
  grossPay: number
  isrTax: number
  imss: number
  infonavit: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  status: 'draft' | 'calculated' | 'approved' | 'paid'
  calculatedDate?: string
  approvedBy?: string
  paidDate?: string
}

export default function PayrollCalculatePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const payrollCalculations: PayrollCalculation[] = [
    {
      id: 'PAY-001',
      employee: 'Juan Carlos Pérez',
      employeeId: 'EMP-001',
      department: 'Desarrollo',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 25000,
      regularHours: 80,
      overtimeHours: 5,
      doubleTimeHours: 0,
      overtimePay: 1953.13,
      doubleTimePay: 0,
      bonuses: 2000,
      commissions: 0,
      grossPay: 28953.13,
      isrTax: 3215.34,
      imss: 869.59,
      infonavit: 1250,
      otherDeductions: 0,
      totalDeductions: 5334.93,
      netPay: 23618.20,
      status: 'calculated',
      calculatedDate: '2025-11-25'
    },
    {
      id: 'PAY-002',
      employee: 'María González',
      employeeId: 'EMP-002',
      department: 'Contabilidad',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 22000,
      regularHours: 80,
      overtimeHours: 0,
      doubleTimeHours: 0,
      overtimePay: 0,
      doubleTimePay: 0,
      bonuses: 1500,
      commissions: 0,
      grossPay: 23500,
      isrTax: 2468.50,
      imss: 766.25,
      infonavit: 1100,
      otherDeductions: 0,
      totalDeductions: 4334.75,
      netPay: 19165.25,
      status: 'approved',
      calculatedDate: '2025-11-25',
      approvedBy: 'Ana Martínez'
    },
    {
      id: 'PAY-003',
      employee: 'Carlos Torres',
      employeeId: 'EMP-003',
      department: 'Ventas',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 18000,
      regularHours: 84,
      overtimeHours: 3,
      doubleTimeHours: 0,
      overtimePay: 1181.25,
      doubleTimePay: 0,
      bonuses: 1000,
      commissions: 3500,
      grossPay: 23681.25,
      isrTax: 2478.52,
      imss: 627,
      infonavit: 900,
      otherDeductions: 0,
      totalDeductions: 4005.52,
      netPay: 19675.73,
      status: 'calculated',
      calculatedDate: '2025-11-25'
    },
    {
      id: 'PAY-004',
      employee: 'Ana Martínez',
      employeeId: 'EMP-004',
      department: 'Administración',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 35000,
      regularHours: 80,
      overtimeHours: 0,
      doubleTimeHours: 0,
      overtimePay: 0,
      doubleTimePay: 0,
      bonuses: 5000,
      commissions: 0,
      grossPay: 40000,
      isrTax: 5832,
      imss: 1225,
      infonavit: 1750,
      otherDeductions: 500,
      totalDeductions: 9307,
      netPay: 30693,
      status: 'approved',
      calculatedDate: '2025-11-25',
      approvedBy: 'Carlos Torres'
    },
    {
      id: 'PAY-005',
      employee: 'Luis Fernández',
      employeeId: 'EMP-005',
      department: 'Soporte',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 20000,
      regularHours: 80,
      overtimeHours: 8,
      doubleTimeHours: 2,
      overtimePay: 3125,
      doubleTimePay: 1562.50,
      bonuses: 1000,
      commissions: 0,
      grossPay: 25687.50,
      isrTax: 2911.91,
      imss: 700,
      infonavit: 1000,
      otherDeductions: 0,
      totalDeductions: 4611.91,
      netPay: 21075.59,
      status: 'calculated',
      calculatedDate: '2025-11-25'
    },
    {
      id: 'PAY-006',
      employee: 'Pedro Sánchez',
      employeeId: 'EMP-006',
      department: 'IT',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 28000,
      regularHours: 80,
      overtimeHours: 6,
      doubleTimeHours: 0,
      overtimePay: 3281.25,
      doubleTimePay: 0,
      bonuses: 2500,
      commissions: 0,
      grossPay: 33781.25,
      isrTax: 4466.37,
      imss: 980,
      infonavit: 1400,
      otherDeductions: 0,
      totalDeductions: 6846.37,
      netPay: 26934.88,
      status: 'approved',
      calculatedDate: '2025-11-25',
      approvedBy: 'Ana Martínez'
    },
    {
      id: 'PAY-007',
      employee: 'Laura Jiménez',
      employeeId: 'EMP-007',
      department: 'Recursos Humanos',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 24000,
      regularHours: 76,
      overtimeHours: 0,
      doubleTimeHours: 0,
      overtimePay: 0,
      doubleTimePay: 0,
      bonuses: 1800,
      commissions: 0,
      grossPay: 25800,
      isrTax: 2894.40,
      imss: 840,
      infonavit: 1200,
      otherDeductions: 0,
      totalDeductions: 4934.40,
      netPay: 20865.60,
      status: 'draft'
    },
    {
      id: 'PAY-008',
      employee: 'Roberto Díaz',
      employeeId: 'EMP-008',
      department: 'Desarrollo',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 26000,
      regularHours: 80,
      overtimeHours: 4,
      doubleTimeHours: 0,
      overtimePay: 2031.25,
      doubleTimePay: 0,
      bonuses: 2000,
      commissions: 0,
      grossPay: 30031.25,
      isrTax: 3453.62,
      imss: 910,
      infonavit: 1300,
      otherDeductions: 0,
      totalDeductions: 5663.62,
      netPay: 24367.63,
      status: 'calculated',
      calculatedDate: '2025-11-25'
    },
    {
      id: 'PAY-009',
      employee: 'Sofia Ramírez',
      employeeId: 'EMP-009',
      department: 'Marketing',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 21000,
      regularHours: 80,
      overtimeHours: 0,
      doubleTimeHours: 0,
      overtimePay: 0,
      doubleTimePay: 0,
      bonuses: 1200,
      commissions: 2000,
      grossPay: 24200,
      isrTax: 2598.40,
      imss: 735,
      infonavit: 1050,
      otherDeductions: 0,
      totalDeductions: 4383.40,
      netPay: 19816.60,
      status: 'calculated',
      calculatedDate: '2025-11-25'
    },
    {
      id: 'PAY-010',
      employee: 'Miguel Ángel Ruiz',
      employeeId: 'EMP-010',
      department: 'Ventas',
      period: 'Noviembre 2025 - Quincena 2',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      baseSalary: 19000,
      regularHours: 80,
      overtimeHours: 2,
      doubleTimeHours: 0,
      overtimePay: 742.19,
      doubleTimePay: 0,
      bonuses: 1000,
      commissions: 2500,
      grossPay: 23242.19,
      isrTax: 2406.60,
      imss: 665,
      infonavit: 950,
      otherDeductions: 0,
      totalDeductions: 4021.60,
      netPay: 19220.59,
      status: 'approved',
      calculatedDate: '2025-11-25',
      approvedBy: 'Ana Martínez'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Edit className="w-3 h-3" /> Borrador
        </Badge>
      case 'calculated':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Calculator className="w-3 h-3" /> Calculada
        </Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Aprobada
        </Badge>
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Pagada
        </Badge>
      default:
        return null
    }
  }

  const filteredPayroll = payrollCalculations.filter(pay => {
    if (filterStatus !== 'all' && pay.status !== filterStatus) return false
    if (filterDepartment !== 'all' && pay.department !== filterDepartment) return false
    if (searchTerm && !pay.employee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pay.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const uniqueDepartments = Array.from(new Set(payrollCalculations.map(p => p.department)))

  const totalEmployees = payrollCalculations.length
  const totalGrossPay = payrollCalculations.reduce((sum, p) => sum + p.grossPay, 0)
  const totalDeductions = payrollCalculations.reduce((sum, p) => sum + p.totalDeductions, 0)
  const totalNetPay = payrollCalculations.reduce((sum, p) => sum + p.netPay, 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Cálculo de Nómina</h1>
            <p className="text-gray-600 mt-1">
              Calcula salarios, deducciones y pagos netos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📥 Exportando cálculos de nómina a CSV')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => alert('🧮 Calculando nómina para todos los empleados...\n\nProcesando sueldos, deducciones e impuestos')}>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Todo
            </Button>
            <Button onClick={() => alert('📄 Nueva Nómina\n\nIniciando nuevo periodo de nómina')}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Nómina
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

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-700">Total Deducciones</div>
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
        </div>

        {/* Period Info */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Período de Nómina</h3>
                <p className="text-blue-100">16 de Noviembre - 30 de Noviembre 2025</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">Quincena 2</div>
                <div className="text-sm text-blue-100">Noviembre 2025</div>
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
                <option value="calculated">Calculadas</option>
                <option value="approved">Aprobadas</option>
                <option value="paid">Pagadas</option>
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

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cálculos de Nómina ({filteredPayroll.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Salario Base</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Extras</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Bonos/Com.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Nómina Bruta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deducciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Nómina Neta</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayroll.map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">{payroll.employee}</div>
                        <div className="text-xs text-gray-500">{payroll.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {payroll.department}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ${payroll.baseSalary.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payroll.regularHours}h
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(payroll.overtimePay + payroll.doubleTimePay) > 0 ? (
                          <>
                            <div className="text-sm font-semibold text-orange-600">
                              ${(payroll.overtimePay + payroll.doubleTimePay).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payroll.overtimeHours}h + {payroll.doubleTimeHours}h doble
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(payroll.bonuses + payroll.commissions) > 0 ? (
                          <div className="text-sm font-semibold text-green-600">
                            ${(payroll.bonuses + payroll.commissions).toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-base font-bold text-blue-600">
                          ${payroll.grossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-red-600">
                          -${payroll.totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          ISR + IMSS + INF
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-base font-bold text-green-600">
                          ${payroll.netPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(payroll.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {payroll.status === 'draft' && (
                            <Button size="sm" variant="outline">
                              <Calculator className="w-4 h-4" />
                            </Button>
                          )}
                          {payroll.status === 'calculated' && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          {payroll.status === 'approved' && (
                            <Button size="sm" variant="outline" className="text-purple-600">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <FileText className="w-4 h-4" />
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
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Cálculo de Nómina</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema automatizado de cálculo de nómina conforme a la legislación laboral y fiscal mexicana.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Percepciones:</strong> Salario base + horas extra (200%) + tiempo doble (300%) + bonos + comisiones</li>
                  <li>• <strong>ISR:</strong> Cálculo según tabla Art. 96 LISR (retención mensual)</li>
                  <li>• <strong>IMSS:</strong> Cuota obrera (3% aprox) según LSS Art. 25, 106, 107</li>
                  <li>• <strong>INFONAVIT:</strong> Descuento 5% sobre salario base (créditos vigentes)</li>
                  <li>• <strong>Integración automática:</strong> Datos desde control de asistencia</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

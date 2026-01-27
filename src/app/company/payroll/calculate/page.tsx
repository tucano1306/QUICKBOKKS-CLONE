'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Send,
  X,
  Loader2,
  Calendar
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
  federalWithholding: number
  socialSecurity: number
  medicare: number
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
  
  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Modal states
  const [showNewPayrollModal, setShowNewPayrollModal] = useState(false)
  const [modalStep, setModalStep] = useState<'config' | 'preview' | 'complete'>('config')
  const [processing, setProcessing] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [calculations, setCalculations] = useState<any[]>([])
  const [payrollResults, setPayrollResults] = useState<any[]>([])
  const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([])

  const loadPayrollHistory = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/history?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setPayrollCalculations(data.payrolls || [])
      }
    } catch (error) {
      console.error('Error loading payroll history:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadPayrollHistory()
  }, [loadPayrollHistory])

  // Fetch employees when modal opens
  const openNewPayrollModal = async () => {
    setShowNewPayrollModal(true)
    setModalStep('config')
    setProcessing(true)
    
    // Set default dates
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setPeriodStart(firstDay.toISOString().split('T')[0])
    setPeriodEnd(lastDay.toISOString().split('T')[0])
    setPaymentDate(lastDay.toISOString().split('T')[0])
    
    try {
      const response = await fetch(`/api/employees?status=ACTIVE&companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        const empList = data.employees || data || []
        if (empList.length > 0) {
          setEmployees(empList)
          setSelectedEmployees(empList.map((e: any) => e.id))
        } else {
          // No hay empleados en la base de datos
          setEmployees([])
          setSelectedEmployees([])
          setMessage({ type: 'error', text: 'No hay empleados activos. Primero agregue empleados en Nómina > Empleados.' })
          setTimeout(() => setMessage(null), 5000)
        }
      } else {
        // Error al obtener empleados
        setEmployees([])
        setSelectedEmployees([])
        setMessage({ type: 'error', text: 'Error al cargar empleados. Verifique la conexión.' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      // Error de conexión
      setEmployees([])
      setSelectedEmployees([])
      setMessage({ type: 'error', text: 'Error de conexión al cargar empleados.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setProcessing(false)
    }
  }

  const closeModal = () => {
    setShowNewPayrollModal(false)
    setModalStep('config')
    setCalculations([])
    setPayrollResults([])
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map(e => e.id))
    }
  }

  const calculatePayroll = () => {
    if (!periodStart || !periodEnd || selectedEmployees.length === 0) {
      setMessage({ type: 'error', text: 'Complete todos los campos y seleccione empleados' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const calcs = selectedEmployees.map(empId => {
      const emp = employees.find(e => e.id === empId)
      if (!emp) return null
      
      const startDate = new Date(periodStart)
      const endDate = new Date(periodEnd)
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const dailySalary = (emp.salary || 0) / 30
      const grossSalary = dailySalary * daysInPeriod
      
      // US Tax calculations (Florida - no state income tax)
      const federalWithholding = grossSalary * 0.12  // Estimated federal rate
      const socialSecurity = grossSalary * 0.062     // 6.2% employee portion
      const medicare = grossSalary * 0.0145          // 1.45% employee portion
      const netSalary = grossSalary - federalWithholding - socialSecurity - medicare
      
      return {
        employeeId: emp.id,
        employee: emp,
        grossSalary,
        deductions: { federalWithholding, socialSecurity, medicare, other: 0 },
        netSalary
      }
    }).filter(Boolean)
    
    setCalculations(calcs)
    setModalStep('preview')
  }

  const processPayroll = async () => {
    setProcessing(true)
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
        setModalStep('complete')
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al procesar la nómina' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error processing payroll:', error)
      setMessage({ type: 'error', text: 'Error al procesar la nómina' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTotalGross = () => calculations.reduce((sum, c) => sum + (c?.grossSalary || 0), 0)
  const getTotalDeductions = () => calculations.reduce((sum, c) => sum + (c?.deductions?.federalWithholding || 0) + (c?.deductions?.socialSecurity || 0) + (c?.deductions?.medicare || 0), 0)
  const getTotalNet = () => calculations.reduce((sum, c) => sum + (c?.netSalary || 0), 0)

  const exportToCSV = () => {
    const headers = ['Employee', 'Department', 'Period', 'Gross Pay', 'Federal Tax', 'Social Security', 'Medicare', 'Deductions', 'Net Pay', 'Status']
    const rows = payrollCalculations.map(p => [
      p.employee,
      p.department,
      p.period,
      p.grossPay,
      p.federalWithholding,
      p.socialSecurity,
      p.medicare,
      p.totalDeductions,
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
    link.download = `payroll-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <Edit className="w-3 h-3" /> Draft
        </Badge>
      case 'calculated':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Calculator className="w-3 h-3" /> Calculated
        </Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </Badge>
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Paid
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Payroll Calculation</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Calculate wages, deductions, and net pay
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={openNewPayrollModal}>
              <Calculator className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Calcular Todo</span>
            </Button>
            <Button size="sm" onClick={openNewPayrollModal}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Nómina</span>
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-blue-900">{totalEmployees}</div>
              <div className="text-xs sm:text-sm text-blue-700">Total Employees</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-900 truncate">
                ${totalGrossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-green-700">Gross Payroll</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-red-900 truncate">
                ${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-red-700">Total Deductions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-purple-900 truncate">
                ${totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Net Payroll</div>
            </CardContent>
          </Card>
        </div>

        {/* Period Info */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold mb-1">Payroll Period</h3>
                <p className="text-blue-100 text-sm">November 16 - November 30, 2025</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-3xl font-bold">Pay Period 2</div>
                <div className="text-xs sm:text-sm text-blue-100">November 2025</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="draft">Drafts</option>
                  <option value="calculated">Calculated</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
                <select 
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-sm"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                >
                  <option value="all">All Depts</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Calculations ({filteredPayroll.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Base Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Overtime</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Bonuses/Comm.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Gross Pay</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Net Pay</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
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
                              ${(payroll.overtimePay + payroll.doubleTimePay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payroll.overtimeHours}h + {payroll.doubleTimeHours}h double
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
                          ${payroll.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-red-600">
                          -${payroll.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          FICA + Fed Tax
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-base font-bold text-green-600">
                          ${payroll.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                <h3 className="font-semibold text-blue-900 mb-2">Payroll Calculation</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Automated payroll calculation system compliant with US federal and Florida state labor laws.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Earnings:</strong> Base salary + overtime (1.5x) + double time (2x) + bonuses + commissions</li>
                  <li>• <strong>Federal Withholding:</strong> Calculated based on W-4 and IRS tax brackets</li>
                  <li>• <strong>Social Security:</strong> 6.2% employee + 6.2% employer (up to $168,600 wage base)</li>
                  <li>• <strong>Medicare:</strong> 1.45% employee + 1.45% employer (no wage base limit)</li>
                  <li>• <strong>Florida:</strong> No state income tax (employer pays SUTA ~2.7%)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nueva Nómina */}
        {showNewPayrollModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold">New Payroll</h2>
                  <p className="text-sm text-gray-500">
                    {modalStep === 'config' && 'Step 1: Configure period and employees'}
                    {modalStep === 'preview' && 'Step 2: Review calculations'}
                    {modalStep === 'complete' && 'Step 3: Payroll processed'}
                  </p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Step 1: Config */}
                {modalStep === 'config' && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Period Config */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Payroll Period
                      </h3>
                      <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <Input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Date</label>
                        <Input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Employee Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          Employees ({selectedEmployees.length}/{employees.length})
                        </h3>
                        <Button variant="outline" size="sm" onClick={selectAllEmployees}>
                          {selectedEmployees.length === employees.length ? 'Deselect' : 'Select'} All
                        </Button>
                      </div>
                      
                      {processing ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="max-h-[250px] overflow-y-auto space-y-2 border rounded-lg p-2">
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
                                <p className="text-sm text-gray-500">{emp.position || emp.department}</p>
                              </div>
                              <p className="font-medium text-gray-700">
                                {formatCurrency(emp.salary || 0)}
                              </p>
                            </div>
                          ))}
                          {employees.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No active employees</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Preview */}
                {modalStep === 'preview' && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600">Empleados</p>
                        <p className="text-2xl font-bold text-blue-900">{calculations.length}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600">Total Bruto</p>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(getTotalGross())}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600">Deducciones</p>
                        <p className="text-2xl font-bold text-red-900">{formatCurrency(getTotalDeductions())}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600">Total Neto</p>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(getTotalNet())}</p>
                      </div>
                    </div>

                    {/* Detail Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Employee</th>
                            <th className="text-right py-3 px-2">Gross Salary</th>
                            <th className="text-right py-3 px-2">Fed Tax (12%)</th>
                            <th className="text-right py-3 px-2">Social Security (6.2%)</th>
                            <th className="text-right py-3 px-2">Medicare (1.45%)</th>
                            <th className="text-right py-3 px-2">Net Salary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculations.map(calc => (
                            <tr key={calc.employeeId} className="border-b">
                              <td className="py-3 px-2">
                                <p className="font-medium">{calc.employee.firstName} {calc.employee.lastName}</p>
                              </td>
                              <td className="py-3 px-2 text-right">{formatCurrency(calc.grossSalary)}</td>
                              <td className="py-3 px-2 text-right text-red-600">-{formatCurrency(calc.deductions.federalWithholding)}</td>
                              <td className="py-3 px-2 text-right text-red-600">-{formatCurrency(calc.deductions.socialSecurity)}</td>
                              <td className="py-3 px-2 text-right text-red-600">-{formatCurrency(calc.deductions.medicare)}</td>
                              <td className="py-3 px-2 text-right font-bold text-green-600">{formatCurrency(calc.netSalary)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 3: Complete */}
                {modalStep === 'complete' && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-green-900">Payroll Processed Successfully!</h3>
                        <p className="text-green-700">{payrollResults.length} payroll records have been created</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">ID</th>
                            <th className="text-left py-3 px-2">Period</th>
                            <th className="text-right py-3 px-2">Base Salary</th>
                            <th className="text-right py-3 px-2">Net Pay</th>
                            <th className="text-left py-3 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollResults.map(result => (
                            <tr key={result.id} className="border-b">
                              <td className="py-3 px-2 font-mono text-xs">{result.id?.slice(0, 8)}...</td>
                              <td className="py-3 px-2">
                                {new Date(result.periodStart).toLocaleDateString()} - {new Date(result.periodEnd).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2 text-right">{formatCurrency(result.baseSalary)}</td>
                              <td className="py-3 px-2 text-right font-bold text-green-600">{formatCurrency(result.netPay)}</td>
                              <td className="py-3 px-2">
                                <Badge className="bg-yellow-100 text-yellow-700">{result.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={modalStep === 'preview' ? () => setModalStep('config') : closeModal}>
                  {modalStep === 'preview' ? 'Modify' : 'Cancel'}
                </Button>
                
                {modalStep === 'config' && (
                  <Button onClick={calculatePayroll} disabled={selectedEmployees.length === 0}>
                    Calculate Payroll
                  </Button>
                )}
                
                {modalStep === 'preview' && (
                  <Button onClick={processPayroll} disabled={processing}>
                    {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Process Payroll
                  </Button>
                )}
                
                {modalStep === 'complete' && (
                  <Button onClick={closeModal}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

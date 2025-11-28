'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, FileText, Download, Printer, User, DollarSign, Calendar,
  Building2, CheckCircle, AlertCircle, RefreshCw, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Employee {
  id: string
  firstName: string
  lastName: string
  ssn?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  salary: number
  salaryType: string
}

interface W2Data {
  employee: Employee
  year: number
  wagesTips: number
  federalTaxWithheld: number
  socialSecurityWages: number
  socialSecurityTaxWithheld: number
  medicareWages: number
  medicareTaxWithheld: number
  socialSecurityTips: number
  stateTaxWithheld: number
  stateWages: number
  localTaxWithheld: number
  localWages: number
}

export default function W2FormsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [w2Data, setW2Data] = useState<W2Data[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/employees?status=ACTIVE')
      if (response.ok) {
        const data = await response.json()
        const emps = data.employees || data || []
        setEmployees(emps)
        
        // Generate W-2 data for each employee
        const w2s: W2Data[] = emps.map((emp: Employee) => {
          // Calculate annual salary
          let annualSalary = emp.salary
          if (emp.salaryType === 'HOURLY') annualSalary = emp.salary * 2080
          else if (emp.salaryType === 'BIWEEKLY') annualSalary = emp.salary * 26
          else if (emp.salaryType === 'WEEKLY') annualSalary = emp.salary * 52
          else if (emp.salaryType === 'MONTHLY') annualSalary = emp.salary * 12

          // Calculate withholdings (approximate)
          const federalTax = annualSalary * 0.22 // ~22% federal bracket
          const socialSecurityTax = Math.min(annualSalary * 0.062, 160200 * 0.062) // SS cap
          const medicareTax = annualSalary * 0.0145
          const stateTax = annualSalary * 0.05 // ~5% state average

          return {
            employee: emp,
            year: selectedYear,
            wagesTips: annualSalary,
            federalTaxWithheld: federalTax,
            socialSecurityWages: Math.min(annualSalary, 160200),
            socialSecurityTaxWithheld: socialSecurityTax,
            medicareWages: annualSalary,
            medicareTaxWithheld: medicareTax,
            socialSecurityTips: 0,
            stateTaxWithheld: stateTax,
            stateWages: annualSalary,
            localTaxWithheld: 0,
            localWages: 0
          }
        })
        setW2Data(w2s)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatSSN = (ssn?: string) => {
    if (!ssn) return 'XXX-XX-XXXX'
    return `XXX-XX-${ssn.slice(-4)}`
  }

  const handleDownloadW2 = async (w2: W2Data) => {
    setGeneratingPDF(w2.employee.id)
    
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create CSV for now (PDF would require a library)
    const content = `Form W-2 Wage and Tax Statement - ${w2.year}
Employee: ${w2.employee.firstName} ${w2.employee.lastName}
SSN: ${formatSSN(w2.employee.ssn)}

Box 1 - Wages, tips, other compensation: ${formatCurrency(w2.wagesTips)}
Box 2 - Federal income tax withheld: ${formatCurrency(w2.federalTaxWithheld)}
Box 3 - Social security wages: ${formatCurrency(w2.socialSecurityWages)}
Box 4 - Social security tax withheld: ${formatCurrency(w2.socialSecurityTaxWithheld)}
Box 5 - Medicare wages and tips: ${formatCurrency(w2.medicareWages)}
Box 6 - Medicare tax withheld: ${formatCurrency(w2.medicareTaxWithheld)}
Box 16 - State wages, tips, etc.: ${formatCurrency(w2.stateWages)}
Box 17 - State income tax: ${formatCurrency(w2.stateTaxWithheld)}
`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `W2_${w2.year}_${w2.employee.lastName}_${w2.employee.firstName}.txt`
    a.click()
    URL.revokeObjectURL(url)
    
    setGeneratingPDF(null)
  }

  const handleDownloadAll = async () => {
    for (const w2 of filteredW2Data) {
      await handleDownloadW2(w2)
    }
  }

  const filteredW2Data = w2Data.filter(w2 => {
    if (!searchTerm) return true
    const fullName = `${w2.employee.firstName} ${w2.employee.lastName}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const totals = filteredW2Data.reduce((acc, w2) => ({
    wages: acc.wages + w2.wagesTips,
    federalTax: acc.federalTax + w2.federalTaxWithheld,
    socialSecurityTax: acc.socialSecurityTax + w2.socialSecurityTaxWithheld,
    medicareTax: acc.medicareTax + w2.medicareTaxWithheld,
    stateTax: acc.stateTax + w2.stateTaxWithheld
  }), { wages: 0, federalTax: 0, socialSecurityTax: 0, medicareTax: 0, stateTax: 0 })

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-8 h-8 text-red-600" />
                Formularios W-2
              </h1>
              <p className="text-gray-600">Wage and Tax Statement - Año Fiscal {selectedYear}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              {[2024, 2023, 2022, 2021].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="outline" onClick={loadEmployees}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={handleDownloadAll}>
              <Download className="w-4 h-4 mr-2" />
              Descargar Todos
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm text-blue-600 mb-1">Total Empleados</div>
              <div className="text-2xl font-bold text-blue-900">{filteredW2Data.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="text-sm text-green-600 mb-1">Total Salarios</div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.wages)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="text-sm text-red-600 mb-1">Federal Retenido</div>
              <div className="text-2xl font-bold text-red-900">{formatCurrency(totals.federalTax)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="text-sm text-purple-600 mb-1">FICA (SS + Medicare)</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(totals.socialSecurityTax + totals.medicareTax)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="text-sm text-orange-600 mb-1">State Retenido</div>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(totals.stateTax)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar empleado por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* W-2 Forms List */}
        <Card>
          <CardHeader>
            <CardTitle>Formularios W-2 Generados ({filteredW2Data.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SSN</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Box 1 - Wages</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Box 2 - Federal Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Box 4 - SS Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Box 6 - Medicare</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Box 17 - State Tax</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredW2Data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay empleados para generar W-2</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => router.push('/payroll/employees')}
                        >
                          Ir a Empleados
                        </Button>
                      </td>
                    </tr>
                  ) : filteredW2Data.map((w2) => (
                    <tr key={w2.employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {w2.employee.firstName} {w2.employee.lastName}
                            </div>
                            <div className="text-xs text-gray-500">ID: {w2.employee.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {formatSSN(w2.employee.ssn)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(w2.wagesTips)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatCurrency(w2.federalTaxWithheld)}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-600">
                        {formatCurrency(w2.socialSecurityTaxWithheld)}
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-600">
                        {formatCurrency(w2.medicareTaxWithheld)}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {formatCurrency(w2.stateTaxWithheld)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadW2(w2)}
                            disabled={generatingPDF === w2.employee.id}
                          >
                            {generatingPDF === w2.employee.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredW2Data.length > 0 && (
                  <tfoot className="bg-gray-50 border-t font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">TOTALES:</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.wages)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totals.federalTax)}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(totals.socialSecurityTax)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{formatCurrency(totals.medicareTax)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.stateTax)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Información del Formulario W-2</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Box 1:</strong> Total de salarios, propinas y otras compensaciones pagadas</li>
                  <li>• <strong>Box 2:</strong> Impuesto federal sobre la renta retenido</li>
                  <li>• <strong>Box 3-4:</strong> Salarios y impuestos del Seguro Social</li>
                  <li>• <strong>Box 5-6:</strong> Salarios y impuestos de Medicare</li>
                  <li>• <strong>Box 16-17:</strong> Salarios e impuestos estatales</li>
                  <li>• Los W-2 deben entregarse a empleados antes del 31 de enero</li>
                  <li>• Copias deben enviarse a la SSA antes del 31 de enero</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

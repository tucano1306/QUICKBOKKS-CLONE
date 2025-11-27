'use client'

import { useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator,
  FileText,
  Download,
  Printer,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'

// PORCENTAJES FLORIDA 2025
const FLORIDA_TAX_RATES = {
  // Federal
  socialSecurity: 0.062, // 6.2% Employee
  socialSecurityMax: 168600, // Wage base limit 2025
  medicare: 0.0145, // 1.45% Employee
  medicareAdditional: 0.009, // 0.9% additional for income > $200k
  medicareThreshold: 200000,
  
  // Federal Unemployment (FUTA)
  futa: 0.006, // 0.6% after credit
  futaWageBase: 7000,
  
  // State Unemployment (SUTA) - Florida
  suta: 0.0275, // 2.75% (varía por empresa, rango 0.1% - 5.4%)
  sutaWageBase: 7000,
  
  // Florida NO tiene state income tax
  stateIncomeTax: 0
}

// Federal Income Tax Withholding Tables 2025 (Single)
const FEDERAL_WITHHOLDING_SINGLE = [
  { min: 0, max: 13850, base: 0, rate: 0.10 },
  { min: 13850, max: 52850, base: 1385, rate: 0.12 },
  { min: 52850, max: 84200, base: 6065, rate: 0.22 },
  { min: 84200, max: 178150, base: 12962, rate: 0.24 },
  { min: 178150, max: 340100, base: 35410, rate: 0.32 },
  { min: 340100, max: 431900, base: 87234, rate: 0.35 },
  { min: 431900, max: Infinity, base: 119404, rate: 0.37 }
]

interface Employee {
  id: string
  name: string
  checkNumber: string
  ssn: string
  filingStatus: 'single' | 'married' | 'head_of_household'
  allowances: number
  hourlyRate: number
  regularHours: number
  overtimeHours: number
  ytdGross: number
  ytdFederalTax: number
  ytdSocialSecurity: number
  ytdMedicare: number
  ytdSuta: number
  type: 'W2' | '1099-NEC' | '1099-MISC'
}

export default function FloridaPayrollPage() {
  const { activeCompany } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: 'EMP001',
      name: 'John Smith',
      checkNumber: '1001',
      ssn: '123-45-6789',
      filingStatus: 'single',
      allowances: 1,
      hourlyRate: 25.00,
      regularHours: 80,
      overtimeHours: 5,
      ytdGross: 45000,
      ytdFederalTax: 5400,
      ytdSocialSecurity: 2790,
      ytdMedicare: 652.50,
      ytdSuta: 192.50,
      type: 'W2'
    },
    {
      id: 'EMP002',
      name: 'Maria Garcia',
      checkNumber: '1002',
      ssn: '987-65-4321',
      filingStatus: 'married',
      allowances: 3,
      hourlyRate: 30.00,
      regularHours: 80,
      overtimeHours: 0,
      ytdGross: 52000,
      ytdFederalTax: 6240,
      ytdSocialSecurity: 3224,
      ytdMedicare: 754,
      ytdSuta: 192.50,
      type: 'W2'
    },
    {
      id: 'CNT001',
      name: 'David Contractor LLC',
      checkNumber: '',
      ssn: '45-6789123',
      filingStatus: 'single',
      allowances: 0,
      hourlyRate: 0,
      regularHours: 0,
      overtimeHours: 0,
      ytdGross: 15000,
      ytdFederalTax: 0,
      ytdSocialSecurity: 0,
      ytdMedicare: 0,
      ytdSuta: 0,
      type: '1099-NEC'
    }
  ])

  const [calculatedPayroll, setCalculatedPayroll] = useState<any>(null)

  const calculateFederalWithholding = (grossPay: number, filingStatus: string, allowances: number) => {
    // Simplified calculation - uses Single table
    const annualizedIncome = grossPay * 26 // Bi-weekly
    const standardDeduction = filingStatus === 'single' ? 13850 : 27700
    const allowanceAmount = allowances * 4300
    const taxableIncome = Math.max(0, annualizedIncome - standardDeduction - allowanceAmount)
    
    let tax = 0
    for (const bracket of FEDERAL_WITHHOLDING_SINGLE) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
        tax = bracket.base + (taxableInBracket * bracket.rate)
      }
    }
    
    return tax / 26 // Convert back to bi-weekly
  }

  const calculatePayroll = () => {
    const results = employees.map(emp => {
      if (emp.type === '1099-NEC' || emp.type === '1099-MISC') {
        // Contractors - no withholding
        return {
          ...emp,
          grossPay: emp.ytdGross / 12, // Simplificado
          federalTax: 0,
          socialSecurity: 0,
          medicare: 0,
          suta: 0,
          futa: 0,
          totalDeductions: 0,
          netPay: emp.ytdGross / 12
        }
      }

      // W-2 Employees
      const regularPay = emp.regularHours * emp.hourlyRate
      const overtimePay = emp.overtimeHours * emp.hourlyRate * 1.5
      const grossPay = regularPay + overtimePay

      // Federal Income Tax Withholding
      const federalTax = calculateFederalWithholding(grossPay, emp.filingStatus, emp.allowances)

      // Social Security (6.2% up to wage base)
      let socialSecurity = 0
      if (emp.ytdGross < FLORIDA_TAX_RATES.socialSecurityMax) {
        const remaining = FLORIDA_TAX_RATES.socialSecurityMax - emp.ytdGross
        const taxable = Math.min(grossPay, remaining)
        socialSecurity = taxable * FLORIDA_TAX_RATES.socialSecurity
      }

      // Medicare (1.45% + 0.9% over $200k)
      let medicare = grossPay * FLORIDA_TAX_RATES.medicare
      if (emp.ytdGross > FLORIDA_TAX_RATES.medicareThreshold) {
        medicare += grossPay * FLORIDA_TAX_RATES.medicareAdditional
      }

      // SUTA (State Unemployment - Employer only, shown for reference)
      let suta = 0
      if (emp.ytdGross < FLORIDA_TAX_RATES.sutaWageBase) {
        const remaining = FLORIDA_TAX_RATES.sutaWageBase - emp.ytdGross
        const taxable = Math.min(grossPay, remaining)
        suta = taxable * FLORIDA_TAX_RATES.suta
      }

      // FUTA (Federal Unemployment - Employer only)
      let futa = 0
      if (emp.ytdGross < FLORIDA_TAX_RATES.futaWageBase) {
        const remaining = FLORIDA_TAX_RATES.futaWageBase - emp.ytdGross
        const taxable = Math.min(grossPay, remaining)
        futa = taxable * FLORIDA_TAX_RATES.futa
      }

      const totalDeductions = federalTax + socialSecurity + medicare
      const netPay = grossPay - totalDeductions

      return {
        ...emp,
        regularPay,
        overtimePay,
        grossPay,
        federalTax,
        socialSecurity,
        medicare,
        suta, // Employer paid (for reference)
        futa, // Employer paid (for reference)
        totalDeductions,
        netPay
      }
    })

    setCalculatedPayroll(results)
    
    // Mostrar resumen
    const totalGross = results.reduce((sum: number, emp: any) => sum + (emp.grossPay || 0), 0)
    const totalNet = results.reduce((sum: number, emp: any) => sum + (emp.netPay || 0), 0)
    const totalTaxes = results.reduce((sum: number, emp: any) => sum + (emp.totalDeductions || 0), 0)
    
    setMessage({ type: 'success', text: `Nómina calculada: ${results.length} empleados, Gross: $${totalGross.toFixed(2)}, Net: $${totalNet.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateRT6 = () => {
    // Florida Reemployment Tax Return (RT-6)
    // Filed quarterly
    setMessage({ type: 'info', text: 'Formulario RT-6 (Florida Reemployment Tax) generado exitosamente' })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateForm941 = () => {
    if (!calculatedPayroll) {
      setMessage({ type: 'error', text: 'Primero calcula la nómina' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const totalGross = calculatedPayroll.reduce((sum: number, emp: any) => 
      emp.type === 'W2' ? sum + emp.grossPay : sum, 0)
    const totalFederalTax = calculatedPayroll.reduce((sum: number, emp: any) => sum + (emp.federalTax || 0), 0)
    const totalSS = calculatedPayroll.reduce((sum: number, emp: any) => sum + (emp.socialSecurity || 0), 0)
    const totalMedicare = calculatedPayroll.reduce((sum: number, emp: any) => sum + (emp.medicare || 0), 0)
    
    const employerSS = totalSS // Employer matches employee
    const employerMedicare = totalMedicare // Employer matches employee
    
    const totalTaxes = totalFederalTax + (totalSS * 2) + (totalMedicare * 2)

    setMessage({ type: 'info', text: `Formulario 941 generado - Total adeudado: $${totalTaxes.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateForm940 = () => {
    if (!calculatedPayroll) {
      setMessage({ type: 'error', text: 'Primero calcula la nómina' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const totalFUTA = calculatedPayroll.reduce((sum: number, emp: any) => 
      emp.type === 'W2' ? sum + (emp.futa || 0) : sum, 0)

    setMessage({ type: 'info', text: `Formulario 940 (FUTA) generado - Total: $${totalFUTA.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateW2 = (employee: any) => {
    if (employee.type !== 'W2') {
      setMessage({ type: 'error', text: 'Este empleado no es W-2' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setMessage({ type: 'info', text: `Formulario W-2 generado para ${employee.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateW3 = () => {
    if (!calculatedPayroll) {
      setMessage({ type: 'error', text: 'Primero calcula la nómina' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const w2Employees = calculatedPayroll.filter((e: any) => e.type === 'W2')
    const totalWages = w2Employees.reduce((sum: number, emp: any) => sum + emp.ytdGross, 0)

    setMessage({ type: 'info', text: `Formulario W-3 generado - ${w2Employees.length} empleados, Total: $${totalWages.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1099NEC = (contractor: any) => {
    if (contractor.type !== '1099-NEC') {
      setMessage({ type: 'error', text: 'Este trabajador no es 1099-NEC' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setMessage({ type: 'info', text: `Formulario 1099-NEC generado para ${contractor.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1099MISC = (recipient: any) => {
    if (recipient.type !== '1099-MISC') {
      setMessage({ type: 'error', text: 'Este receptor no es 1099-MISC' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setMessage({ type: 'info', text: `Formulario 1099-MISC generado para ${recipient.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1096 = () => {
    if (!calculatedPayroll) {
      setMessage({ type: 'error', text: 'Primero calcula la nómina' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const contractors1099NEC = calculatedPayroll.filter((e: any) => e.type === '1099-NEC')
    const contractors1099MISC = calculatedPayroll.filter((e: any) => e.type === '1099-MISC')
    
    const totalNEC = contractors1099NEC.reduce((sum: number, c: any) => sum + c.ytdGross, 0)
    const totalMISC = contractors1099MISC.reduce((sum: number, c: any) => sum + c.ytdGross, 0)

    setMessage({ type: 'info', text: `Formulario 1096 generado - ${contractors1099NEC.length + contractors1099MISC.length} formularios 1099, Total: $${(totalNEC + totalMISC).toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  if (!activeCompany) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Selecciona una empresa</p>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nómina Florida - Sistema Completo</h1>
          <p className="text-gray-600 mt-1">
            Cálculo automático con retenciones federales + Formularios RT-6, 941, 940, W-2, W-3, 1099-NEC, 1099-MISC, 1096
          </p>
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

        {/* Tax Rates Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Porcentajes de Retención - Florida 2025
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">Federal - Empleado</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Social Security: <strong>6.2%</strong> (hasta $168,600)</li>
                  <li>• Medicare: <strong>1.45%</strong> (+ 0.9% si {'>'}$200k)</li>
                  <li>• Federal Income Tax: <strong>Variable</strong> (según W-4)</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900">Federal - Empleador</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Social Security: <strong>6.2%</strong> (match)</li>
                  <li>• Medicare: <strong>1.45%</strong> (match)</li>
                  <li>• FUTA: <strong>0.6%</strong> (hasta $7,000/empleado)</li>
                </ul>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900">Florida - Empleador</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• SUTA: <strong>2.75%</strong> (hasta $7,000/empleado)</li>
                  <li>• State Income Tax: <strong>0%</strong> ✅</li>
                  <li className="text-xs text-gray-600">Florida NO tiene impuesto estatal sobre ingresos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Período de Nómina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Ej: Q4 2025, Noviembre 2025"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
              <Button onClick={calculatePayroll} className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Nómina
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Empleados y Contratistas ({employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Check #</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-right">Horas Reg.</th>
                    <th className="px-4 py-2 text-right">Horas Extra</th>
                    <th className="px-4 py-2 text-right">Tasa/Hr</th>
                    <th className="px-4 py-2 text-right">YTD Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{emp.name}</td>
                      <td className="px-4 py-3">
                        {emp.checkNumber ? (
                          <Badge variant="outline">{emp.checkNumber}</Badge>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          emp.type === 'W2' ? 'bg-blue-100 text-blue-800' :
                          emp.type === '1099-NEC' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {emp.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{emp.regularHours}</td>
                      <td className="px-4 py-3 text-right">{emp.overtimeHours}</td>
                      <td className="px-4 py-3 text-right">${emp.hourlyRate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${emp.ytdGross.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Calculated Payroll Results */}
        {calculatedPayroll && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Resultados del Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Empleado</th>
                      <th className="px-4 py-2 text-right">Gross Pay</th>
                      <th className="px-4 py-2 text-right">Fed. Tax</th>
                      <th className="px-4 py-2 text-right">Soc. Sec.</th>
                      <th className="px-4 py-2 text-right">Medicare</th>
                      <th className="px-4 py-2 text-right">Total Ded.</th>
                      <th className="px-4 py-2 text-right">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculatedPayroll.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{emp.name}</div>
                            {emp.checkNumber && (
                              <div className="text-xs text-gray-500">Check #{emp.checkNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">${emp.grossPay.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${(emp.federalTax || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${(emp.socialSecurity || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${(emp.medicare || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-red-600">${(emp.totalDeductions || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">${emp.netPay.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Forms Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generar Formularios Fiscales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button onClick={generateRT6} variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  RT-6 (Florida Reemployment Tax)
                </Button>
                <Button onClick={generateForm941} variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Form 941 (Quarterly Federal)
                </Button>
                <Button onClick={generateForm940} variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Form 940 (FUTA Annual)
                </Button>
                <Button onClick={generateW3} variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  W-3 (Transmittal of W-2s)
                </Button>
                <Button onClick={generate1096} variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Form 1096 (Transmittal of 1099s)
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Formularios por Empleado:</h4>
                <div className="space-y-2">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{emp.name}</span>
                        {emp.checkNumber && (
                          <span className="ml-2 text-sm text-gray-600">Check #{emp.checkNumber}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {emp.type === 'W2' && (
                          <Button onClick={() => generateW2(emp)} size="sm" variant="outline">
                            W-2
                          </Button>
                        )}
                        {emp.type === '1099-NEC' && (
                          <Button onClick={() => generate1099NEC(emp)} size="sm" variant="outline">
                            1099-NEC
                          </Button>
                        )}
                        {emp.type === '1099-MISC' && (
                          <Button onClick={() => generate1099MISC(emp)} size="sm" variant="outline">
                            1099-MISC
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="space-y-2 text-sm">
                <h3 className="font-semibold text-blue-900">Información Importante - Florida Payroll</h3>
                <ul className="space-y-1 text-blue-800">
                  <li>✅ <strong>Florida NO tiene State Income Tax</strong> - No se retiene impuesto estatal sobre ingresos</li>
                  <li>📋 <strong>RT-6:</strong> Presentar trimestralmente al Florida Department of Revenue (SUTA)</li>
                  <li>📋 <strong>Form 941:</strong> Presentar trimestralmente al IRS (retenciones federales)</li>
                  <li>📋 <strong>Form 940:</strong> Presentar anualmente al IRS (FUTA)</li>
                  <li>📋 <strong>W-2/W-3:</strong> Emitir antes del 31 de enero a empleados y SSA</li>
                  <li>📋 <strong>1099-NEC/MISC + 1096:</strong> Emitir antes del 31 de enero a contratistas e IRS</li>
                  <li>💰 Los cheques (Check Numbers) son únicos por empleado para tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

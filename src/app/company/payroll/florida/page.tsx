'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import jsPDF from 'jspdf'

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
  { min: 0, max: 13850, base: 0, rate: 0.1 },
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

// Type aliases for message and employee types
type MessageType = 'success' | 'error' | 'info'
type EmployeeType = 'W2' | '1099-NEC' | '1099-MISC'

// Helper functions for styling
function getMessageBgClass(type: MessageType): string {
  switch (type) {
    case 'success': return 'bg-green-50 border border-green-200'
    case 'error': return 'bg-red-50 border border-red-200'
    default: return 'bg-blue-50 border border-blue-200'
  }
}

function getMessageTextClass(type: MessageType): string {
  switch (type) {
    case 'success': return 'text-green-800'
    case 'error': return 'text-red-800'
    default: return 'text-blue-800'
  }
}

function getEmployeeTypeBadgeClass(type: EmployeeType): string {
  switch (type) {
    case 'W2': return 'bg-blue-100 text-blue-800'
    case '1099-NEC': return 'bg-green-100 text-green-800'
    default: return 'bg-purple-100 text-purple-800'
  }
}

export default function FloridaPayrollPage() {
  const { status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [calculatedPayroll, setCalculatedPayroll] = useState<any>(null)

  // Empleados de ejemplo para Florida Payroll
  const sampleEmployees: Employee[] = [
    {
      id: '1',
      name: 'Laura Sánchez Díaz',
      checkNumber: '1001',
      ssn: '***-**-1234',
      filingStatus: 'single',
      allowances: 1,
      hourlyRate: 31.25,
      regularHours: 80,
      overtimeHours: 0,
      ytdGross: 65000,
      ytdFederalTax: 14300,
      ytdSocialSecurity: 4030,
      ytdMedicare: 942.5,
      ytdSuta: 189,
      type: 'W2'
    },
    {
      id: '2',
      name: 'Roberto Martínez Cruz',
      checkNumber: '1002',
      ssn: '***-**-5678',
      filingStatus: 'married',
      allowances: 2,
      hourlyRate: 36.06,
      regularHours: 80,
      overtimeHours: 5,
      ytdGross: 75000,
      ytdFederalTax: 16500,
      ytdSocialSecurity: 4650,
      ytdMedicare: 1087.5,
      ytdSuta: 189,
      type: 'W2'
    },
    {
      id: '3',
      name: 'Ana García López',
      checkNumber: '1003',
      ssn: '***-**-9012',
      filingStatus: 'head_of_household',
      allowances: 2,
      hourlyRate: 40.87,
      regularHours: 80,
      overtimeHours: 0,
      ytdGross: 85000,
      ytdFederalTax: 18700,
      ytdSocialSecurity: 5270,
      ytdMedicare: 1232.5,
      ytdSuta: 189,
      type: 'W2'
    }
  ]

  const loadEmployees = useCallback(async () => {
    if (!activeCompany) {
      // Si no hay compañía activa, usar empleados de ejemplo
      setEmployees(sampleEmployees)
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/employees?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const empList = (data.employees || data || []).map((emp: any) => ({
          id: emp.id,
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Sin nombre',
          checkNumber: '',
          ssn: emp.ssn || '',
          filingStatus: emp.taxFilingStatus?.toLowerCase() || 'single',
          allowances: emp.federalAllowances || 0,
          hourlyRate: emp.hourlyRate || emp.salary / 2080 || 0,
          regularHours: 80,
          overtimeHours: 0,
          ytdGross: emp.ytdGross || 0,
          ytdFederalTax: emp.ytdFederalTax || 0,
          ytdSocialSecurity: emp.ytdSocialSecurity || 0,
          ytdMedicare: emp.ytdMedicare || 0,
          ytdSuta: emp.ytdSuta || 0,
          type: emp.employeeType === 'CONTRACTOR' ? '1099-NEC' : 'W2'
        }))
        
        // Si no hay empleados en la base de datos, usar los de ejemplo
        if (empList.length === 0) {
          setEmployees(sampleEmployees)
        } else {
          setEmployees(empList)
        }
      } else {
        // Si hay error, usar empleados de ejemplo
        setEmployees(sampleEmployees)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      // En caso de error, usar empleados de ejemplo
      setEmployees(sampleEmployees)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated') {
      loadEmployees()
    } else if (status === 'unauthenticated') {
      // Para usuarios no autenticados, mostrar empleados de ejemplo
      setEmployees(sampleEmployees)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeCompany, loadEmployees])

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
    
    setMessage({ type: 'success', text: `Nómina calculada: ${results.length} empleados, Gross: $${totalGross.toFixed(2)}, Net: $${totalNet.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  // Función helper para crear PDF con estilo profesional
  const createPDF = (title: string, subtitle: string) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Header con fondo
    doc.setFillColor(30, 64, 175) // Azul oscuro
    doc.rect(0, 0, pageWidth, 35, 'F')
    
    // Título
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pageWidth / 2, 15, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, pageWidth / 2, 25, { align: 'center' })
    
    // Reset color
    doc.setTextColor(0, 0, 0)
    
    return doc
  }

  const generateRT6 = () => {
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3)
    const year = new Date().getFullYear()
    
    const totalWages = employees.reduce((sum, emp) => sum + (emp.hourlyRate * emp.regularHours * 6), 0)
    const taxableWages = Math.min(totalWages, 7000 * employees.length)
    const taxDue = taxableWages * FLORIDA_TAX_RATES.suta

    const doc = createPDF('FLORIDA DEPARTMENT OF REVENUE', `RT-6 - Employer's Quarterly Report - Q${quarter} ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info de empresa
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADOR', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('EIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 12
    
    // Resumen de impuestos
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 50, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE IMPUESTOS - FLORIDA REEMPLOYMENT TAX', 14, y + 4)
    y += 12
    doc.setFont('helvetica', 'normal')
    
    const col1 = 20, col2 = 120
    doc.text('Total Salarios del Trimestre:', col1, y)
    doc.text(`$${totalWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('Salarios en Exceso (> $7,000/emp):', col1, y)
    doc.text(`$${(totalWages - taxableWages).toFixed(2)}`, col2, y)
    y += 7
    doc.text('Salarios Gravables:', col1, y)
    doc.text(`$${taxableWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('Tasa de Impuesto (SUTA):', col1, y)
    doc.text(`${(FLORIDA_TAX_RATES.suta * 100).toFixed(2)}%`, col2, y)
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.text('IMPUESTO DEBIDO:', col1, y)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${taxDue.toFixed(2)}`, col2, y)
    doc.setTextColor(0, 0, 0)
    y += 15
    
    // Tabla de empleados
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE POR EMPLEADO', 14, y)
    y += 8
    
    // Headers de tabla
    doc.setFillColor(30, 64, 175)
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text('SSN', 18, y + 1)
    doc.text('Nombre del Empleado', 50, y + 1)
    doc.text('Salarios Q' + quarter, 140, y + 1)
    y += 10
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    employees.forEach((emp, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F')
      }
      doc.text(emp.ssn || '***-**-****', 18, y)
      doc.text(emp.name, 50, y)
      doc.text(`$${(emp.hourlyRate * emp.regularHours * 6).toFixed(2)}`, 140, y)
      y += 7
    })
    
    // Footer
    y += 10
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Florida Department of Revenue | Formulario RT-6`, pageWidth / 2, y, { align: 'center' })

    doc.save(`RT6_Florida_Q${quarter}_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario RT-6 (PDF) descargado - Impuesto debido: $${taxDue.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateForm941 = () => {
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3)
    const year = new Date().getFullYear()

    const totalGross = employees.reduce((sum, emp) => sum + (emp.hourlyRate * emp.regularHours * 6), 0)
    const totalFederalTax = totalGross * 0.22
    const totalSS = Math.min(totalGross, FLORIDA_TAX_RATES.socialSecurityMax) * FLORIDA_TAX_RATES.socialSecurity
    const totalMedicare = totalGross * FLORIDA_TAX_RATES.medicare
    const totalTaxes = totalFederalTax + (totalSS * 2) + (totalMedicare * 2)

    const doc = createPDF('IRS FORM 941', `Employer's Quarterly Federal Tax Return - Q${quarter} ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info de empresa
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADOR', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('EIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 12
    
    // Parte 1
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 65, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('PARTE 1: CÁLCULO DE IMPUESTOS', 14, y + 4)
    y += 12
    doc.setFont('helvetica', 'normal')
    
    const col1 = 20, col2 = 140
    doc.text('1. Número de empleados que recibieron salarios:', col1, y)
    doc.text(`${employees.length}`, col2, y)
    y += 7
    doc.text('2. Salarios, propinas y otras compensaciones:', col1, y)
    doc.text(`$${totalGross.toFixed(2)}`, col2, y)
    y += 7
    doc.text('3. Impuesto federal sobre ingresos retenido:', col1, y)
    doc.text(`$${totalFederalTax.toFixed(2)}`, col2, y)
    y += 7
    doc.text('5a. Social Security wages:', col1, y)
    doc.text(`$${totalGross.toFixed(2)}`, col2, y)
    y += 7
    doc.text('5a(ii). Social Security tax (12.4%):', col1, y)
    doc.text(`$${(totalSS * 2).toFixed(2)}`, col2, y)
    y += 7
    doc.text('5c. Medicare wages:', col1, y)
    doc.text(`$${totalGross.toFixed(2)}`, col2, y)
    y += 7
    doc.text('5c(ii). Medicare tax (2.9%):', col1, y)
    doc.text(`$${(totalMedicare * 2).toFixed(2)}`, col2, y)
    y += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('10. TOTAL DE IMPUESTOS:', col1, y)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${totalTaxes.toFixed(2)}`, col2, y)
    doc.setTextColor(0, 0, 0)
    y += 15
    
    // Tabla de empleados
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE POR EMPLEADO', 14, y)
    y += 8
    
    doc.setFillColor(30, 64, 175)
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.text('Nombre', 18, y + 1)
    doc.text('Salarios', 70, y + 1)
    doc.text('Fed. Tax', 100, y + 1)
    doc.text('SS Tax', 130, y + 1)
    doc.text('Medicare', 160, y + 1)
    y += 10
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    employees.forEach((emp, index) => {
      const wages = emp.hourlyRate * emp.regularHours * 6
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F')
      }
      doc.text(emp.name.substring(0, 25), 18, y)
      doc.text(`$${wages.toFixed(2)}`, 70, y)
      doc.text(`$${(wages * 0.22).toFixed(2)}`, 100, y)
      doc.text(`$${(wages * 0.062).toFixed(2)}`, 130, y)
      doc.text(`$${(wages * 0.0145).toFixed(2)}`, 160, y)
      y += 7
    })

    // Footer
    y += 10
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form 941`, pageWidth / 2, y, { align: 'center' })

    doc.save(`Form941_Federal_Q${quarter}_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario 941 (PDF) descargado - Total: $${totalTaxes.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateForm940 = () => {
    const year = new Date().getFullYear()
    
    const totalPayments = employees.reduce((sum, emp) => sum + emp.ytdGross, 0)
    const totalFUTAWages = employees.length * FLORIDA_TAX_RATES.futaWageBase
    const totalFUTA = totalFUTAWages * FLORIDA_TAX_RATES.futa

    const doc = createPDF('IRS FORM 940', `Employer's Annual Federal Unemployment (FUTA) Tax Return - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info de empresa
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADOR', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('EIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Estado: Florida (FL)', 14, y)
    y += 12
    
    // Parte 2
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 70, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('PARTE 2: DETERMINACIÓN DEL IMPUESTO FUTA', 14, y + 4)
    y += 12
    doc.setFont('helvetica', 'normal')
    
    const col1 = 20, col2 = 140
    doc.text('3. Total pagos a empleados:', col1, y)
    doc.text(`$${totalPayments.toFixed(2)}`, col2, y)
    y += 7
    doc.text('4. Pagos exentos de FUTA:', col1, y)
    doc.text('$0.00', col2, y)
    y += 7
    doc.text('5. Pagos que exceden $7,000 por empleado:', col1, y)
    doc.text(`$${(totalPayments - totalFUTAWages).toFixed(2)}`, col2, y)
    y += 7
    doc.text('7. Total salarios FUTA:', col1, y)
    doc.text(`$${totalFUTAWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('8. Impuesto FUTA antes de ajustes (6%):', col1, y)
    doc.text(`$${(totalFUTAWages * 0.06).toFixed(2)}`, col2, y)
    y += 7
    doc.text('9. Crédito por impuesto estatal (5.4%):', col1, y)
    doc.text(`$${(totalFUTAWages * 0.054).toFixed(2)}`, col2, y)
    y += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('12. TOTAL IMPUESTO FUTA (0.6%):', col1, y)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${totalFUTA.toFixed(2)}`, col2, y)
    doc.setTextColor(0, 0, 0)
    y += 15
    
    // Tabla de empleados
    doc.setFont('helvetica', 'bold')
    doc.text('LISTA DE EMPLEADOS CUBIERTOS', 14, y)
    y += 8
    
    doc.setFillColor(30, 64, 175)
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text('Nombre del Empleado', 18, y + 1)
    doc.text('Salario Anual', 100, y + 1)
    doc.text('Salarios FUTA (max $7,000)', 140, y + 1)
    y += 10
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    employees.forEach((emp, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F')
      }
      doc.text(emp.name, 18, y)
      doc.text(`$${emp.ytdGross.toFixed(2)}`, 100, y)
      doc.text(`$${Math.min(emp.ytdGross, 7000).toFixed(2)}`, 140, y)
      y += 7
    })

    // Footer
    y += 10
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form 940`, pageWidth / 2, y, { align: 'center' })

    doc.save(`Form940_FUTA_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario 940 (PDF) descargado - Total FUTA: $${totalFUTA.toFixed(2)}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateW2 = (employee: any) => {
    const year = new Date().getFullYear()
    const wages = employee.ytdGross || employee.hourlyRate * 2080
    const federalTax = wages * 0.22
    const ssWages = Math.min(wages, FLORIDA_TAX_RATES.socialSecurityMax)
    const ssTax = ssWages * FLORIDA_TAX_RATES.socialSecurity
    const medicareWages = wages
    const medicareTax = medicareWages * FLORIDA_TAX_RATES.medicare

    const doc = createPDF('IRS FORM W-2', `Wage and Tax Statement - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Dos columnas - Empleador y Empleado
    doc.setFontSize(11)
    
    // Columna izquierda - Empleador
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADOR', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('b. Employer ID (EIN): XX-XXXXXXX', 14, y)
    y += 6
    doc.text(`c. Employer: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('   123 Business Ave, Miami, FL 33101', 14, y)
    y += 12
    
    // Información del empleado
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADO', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`d. Employee SSN: ${employee.ssn || '***-**-****'}`, 14, y)
    y += 6
    doc.text(`e. Employee: ${employee.name}`, 14, y)
    y += 6
    doc.text('f. Address: Dirección del Empleado, FL', 14, y)
    y += 15
    
    // Boxes de W-2 en formato de grilla
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 80, 'F')
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('WAGES AND TAX STATEMENT', 14, y + 4)
    y += 12
    
    const boxWidth = 85
    const boxHeight = 20
    let startX = 20
    
    // Fila 1
    doc.setFillColor(255, 255, 255)
    doc.rect(startX, y, boxWidth, boxHeight, 'F')
    doc.rect(startX + boxWidth + 5, y, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.text('1. Wages, tips, other compensation', startX + 2, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${wages.toFixed(2)}`, startX + 2, y + 15)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('2. Federal income tax withheld', startX + boxWidth + 7, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${federalTax.toFixed(2)}`, startX + boxWidth + 7, y + 15)
    y += boxHeight + 5
    
    // Fila 2
    doc.setFillColor(255, 255, 255)
    doc.rect(startX, y, boxWidth, boxHeight, 'F')
    doc.rect(startX + boxWidth + 5, y, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('3. Social Security wages', startX + 2, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${ssWages.toFixed(2)}`, startX + 2, y + 15)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('4. Social Security tax withheld', startX + boxWidth + 7, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${ssTax.toFixed(2)}`, startX + boxWidth + 7, y + 15)
    y += boxHeight + 5
    
    // Fila 3
    doc.setFillColor(255, 255, 255)
    doc.rect(startX, y, boxWidth, boxHeight, 'F')
    doc.rect(startX + boxWidth + 5, y, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('5. Medicare wages and tips', startX + 2, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${medicareWages.toFixed(2)}`, startX + 2, y + 15)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('6. Medicare tax withheld', startX + boxWidth + 7, y + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${medicareTax.toFixed(2)}`, startX + boxWidth + 7, y + 15)
    y += boxHeight + 15
    
    // Estado
    doc.setFillColor(255, 255, 255)
    doc.rect(startX, y, pageWidth - 48, 25, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('15. State: FL | 16. State wages: $' + wages.toFixed(2) + ' | 17. State income tax: $0.00', startX + 2, y + 8)
    doc.setFontSize(10)
    doc.setTextColor(34, 139, 34)
    doc.text('* Florida NO tiene impuesto estatal sobre la renta (State Income Tax)', startX + 2, y + 18)
    doc.setTextColor(0, 0, 0)
    
    // Footer
    y += 35
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form W-2`, pageWidth / 2, y, { align: 'center' })

    doc.save(`W2_${employee.name.replaceAll(' ', '_')}_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario W-2 (PDF) descargado para ${employee.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generateW3 = () => {
    const year = new Date().getFullYear()
    
    const totalWages = employees.reduce((sum, emp) => sum + (emp.ytdGross || emp.hourlyRate * 2080), 0)
    const totalFederalTax = totalWages * 0.22
    const totalSSWages = Math.min(totalWages, FLORIDA_TAX_RATES.socialSecurityMax * employees.length)
    const totalSSTax = totalSSWages * FLORIDA_TAX_RATES.socialSecurity
    const totalMedicareWages = totalWages
    const totalMedicareTax = totalMedicareWages * FLORIDA_TAX_RATES.medicare

    const doc = createPDF('IRS FORM W-3', `Transmittal of Wage and Tax Statements - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info de empresa
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL EMPLEADOR', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('EIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 6
    doc.text('Teléfono: (305) 555-0100', 14, y)
    y += 12
    
    // Resumen W-3
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 65, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE TODOS LOS FORMULARIOS W-2', 14, y + 4)
    y += 12
    doc.setFont('helvetica', 'normal')
    
    const col1 = 20, col2 = 140
    doc.setFont('helvetica', 'bold')
    doc.text(`Número de formularios W-2: ${employees.length}`, col1, y)
    y += 10
    doc.setFont('helvetica', 'normal')
    
    doc.text('1. Wages, tips, other compensation:', col1, y)
    doc.text(`$${totalWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('2. Federal income tax withheld:', col1, y)
    doc.text(`$${totalFederalTax.toFixed(2)}`, col2, y)
    y += 7
    doc.text('3. Social Security wages:', col1, y)
    doc.text(`$${totalSSWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('4. Social Security tax withheld:', col1, y)
    doc.text(`$${totalSSTax.toFixed(2)}`, col2, y)
    y += 7
    doc.text('5. Medicare wages and tips:', col1, y)
    doc.text(`$${totalMedicareWages.toFixed(2)}`, col2, y)
    y += 7
    doc.text('6. Medicare tax withheld:', col1, y)
    doc.text(`$${totalMedicareTax.toFixed(2)}`, col2, y)
    y += 15
    
    // Tabla de empleados
    doc.setFont('helvetica', 'bold')
    doc.text('LISTA DE EMPLEADOS INCLUIDOS', 14, y)
    y += 8
    
    doc.setFillColor(30, 64, 175)
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.text('Nombre', 18, y + 1)
    doc.text('SSN', 70, y + 1)
    doc.text('Salarios', 100, y + 1)
    doc.text('Fed. Tax', 130, y + 1)
    doc.text('SS+Med', 160, y + 1)
    y += 10
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    employees.forEach((emp, index) => {
      const wages = emp.ytdGross || emp.hourlyRate * 2080
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F')
      }
      doc.text(emp.name.substring(0, 20), 18, y)
      doc.text(emp.ssn || '***-**-****', 70, y)
      doc.text(`$${wages.toFixed(0)}`, 100, y)
      doc.text(`$${(wages * 0.22).toFixed(0)}`, 130, y)
      doc.text(`$${(wages * 0.0765).toFixed(0)}`, 160, y)
      y += 7
    })

    // Footer
    y += 10
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form W-3`, pageWidth / 2, y, { align: 'center' })

    doc.save(`W3_Transmittal_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario W-3 (PDF) descargado - ${employees.length} empleados` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1099NEC = (contractor: any) => {
    const year = new Date().getFullYear()
    const compensation = contractor.ytdGross || contractor.hourlyRate * 2080

    const doc = createPDF('IRS FORM 1099-NEC', `Nonemployee Compensation - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info del pagador
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYER (Pagador)', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('TIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 12
    
    // Info del receptor
    doc.setFont('helvetica', 'bold')
    doc.text('RECIPIENT (Receptor)', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${contractor.name}`, 14, y)
    y += 6
    doc.text(`TIN: ${contractor.ssn || '***-**-****'}`, 14, y)
    y += 15
    
    // Box de compensación
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 40, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.text('NONEMPLOYEE COMPENSATION', 14, y + 4)
    y += 15
    
    doc.setFillColor(255, 255, 255)
    doc.rect(20, y, 80, 20, 'F')
    doc.setFontSize(9)
    doc.text('Box 1 - Nonemployee compensation', 22, y + 5)
    doc.setFontSize(14)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${compensation.toFixed(2)}`, 22, y + 15)
    doc.setTextColor(0, 0, 0)
    
    doc.setFillColor(255, 255, 255)
    doc.rect(105, y, 80, 20, 'F')
    doc.setFontSize(9)
    doc.text('Box 4 - Federal tax withheld', 107, y + 5)
    doc.setFontSize(14)
    doc.text('$0.00', 107, y + 15)
    
    // Footer
    y += 50
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form 1099-NEC`, pageWidth / 2, y, { align: 'center' })

    doc.save(`1099NEC_${contractor.name.replaceAll(' ', '_')}_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario 1099-NEC (PDF) descargado para ${contractor.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1099MISC = (recipient: any) => {
    const year = new Date().getFullYear()
    const amount = recipient.ytdGross || recipient.hourlyRate * 2080

    const doc = createPDF('IRS FORM 1099-MISC', `Miscellaneous Income - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info del pagador
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYER (Pagador)', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('TIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 12
    
    // Info del receptor
    doc.setFont('helvetica', 'bold')
    doc.text('RECIPIENT (Receptor)', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${recipient.name}`, 14, y)
    y += 6
    doc.text(`TIN: ${recipient.ssn || '***-**-****'}`, 14, y)
    y += 15
    
    // Box de ingresos
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 40, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.text('MISCELLANEOUS INCOME', 14, y + 4)
    y += 15
    
    doc.setFillColor(255, 255, 255)
    doc.rect(20, y, 80, 20, 'F')
    doc.setFontSize(9)
    doc.text('Box 3 - Other income', 22, y + 5)
    doc.setFontSize(14)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${amount.toFixed(2)}`, 22, y + 15)
    doc.setTextColor(0, 0, 0)
    
    doc.setFillColor(255, 255, 255)
    doc.rect(105, y, 80, 20, 'F')
    doc.setFontSize(9)
    doc.text('Box 4 - Federal tax withheld', 107, y + 5)
    doc.setFontSize(14)
    doc.text('$0.00', 107, y + 15)
    
    // Footer
    y += 50
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form 1099-MISC`, pageWidth / 2, y, { align: 'center' })

    doc.save(`1099MISC_${recipient.name.replaceAll(' ', '_')}_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario 1099-MISC (PDF) descargado para ${recipient.name}` })
    setTimeout(() => setMessage(null), 5000)
  }

  const generate1096 = () => {
    const year = new Date().getFullYear()
    
    const contractors1099NEC = employees.filter((e: any) => e.type === '1099-NEC')
    const contractors1099MISC = employees.filter((e: any) => e.type === '1099-MISC')
    
    const totalNEC = contractors1099NEC.reduce((sum: number, c: any) => sum + (c.ytdGross || c.hourlyRate * 2080), 0)
    const totalMISC = contractors1099MISC.reduce((sum: number, c: any) => sum + (c.ytdGross || c.hourlyRate * 2080), 0)
    const totalForms = contractors1099NEC.length + contractors1099MISC.length

    const doc = createPDF('IRS FORM 1096', `Annual Summary and Transmittal of U.S. Information Returns - ${year}`)
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 45
    
    // Info del remitente
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('FILER (Remitente)', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${activeCompany?.name || 'Mi Empresa LLC'}`, 14, y)
    y += 6
    doc.text('TIN: XX-XXXXXXX', 14, y)
    y += 6
    doc.text('Dirección: 123 Business Ave, Miami, FL 33101', 14, y)
    y += 6
    doc.text('Contacto: Administrador | Tel: (305) 555-0100', 14, y)
    y += 15
    
    // Resumen
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y - 4, pageWidth - 28, 55, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE FORMULARIOS 1099', 14, y + 4)
    y += 12
    doc.setFont('helvetica', 'normal')
    
    const col1 = 20, col2 = 100, col3 = 150
    
    // Headers
    doc.setFont('helvetica', 'bold')
    doc.text('Tipo de Formulario', col1, y)
    doc.text('Cantidad', col2, y)
    doc.text('Monto Total', col3, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    doc.text('1099-NEC (Nonemployee Comp.)', col1, y)
    doc.text(`${contractors1099NEC.length}`, col2, y)
    doc.text(`$${totalNEC.toFixed(2)}`, col3, y)
    y += 7
    
    doc.text('1099-MISC (Miscellaneous)', col1, y)
    doc.text(`${contractors1099MISC.length}`, col2, y)
    doc.text(`$${totalMISC.toFixed(2)}`, col3, y)
    y += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', col1, y)
    doc.text(`${totalForms}`, col2, y)
    doc.setTextColor(220, 38, 38)
    doc.text(`$${(totalNEC + totalMISC).toFixed(2)}`, col3, y)
    doc.setTextColor(0, 0, 0)
    y += 15
    
    // Información adicional
    doc.setFont('helvetica', 'normal')
    doc.text('Federal income tax withheld: $0.00', 20, y)
    
    // Footer
    y += 30
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generado: ${new Date().toLocaleDateString()} | Internal Revenue Service | Form 1096`, pageWidth / 2, y, { align: 'center' })

    doc.save(`Form1096_Transmittal_${year}.pdf`)
    setMessage({ type: 'success', text: `✅ Formulario 1096 (PDF) descargado - ${totalForms} formularios 1099` })
    setTimeout(() => setMessage(null), 5000)
  }

  if (loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
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
          <div className={`p-4 rounded-lg flex items-center gap-3 ${getMessageBgClass(message.type)}`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {message.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            <span className={getMessageTextClass(message.type)}>{message.text}</span>
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
                        <Badge className={getEmployeeTypeBadgeClass(emp.type)}>
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

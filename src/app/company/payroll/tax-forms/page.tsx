'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText, 
  Download, 
  Eye, 
  Printer,
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'

// Tipos de formularios fiscales
type TaxFormType = 'rt6' | '941' | '940' | 'w3' | '1096' | 'w2'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  department: string
  taxId: string
  salary: number
  status: string
}

interface TaxFormData {
  type: TaxFormType
  name: string
  description: string
  frequency: string
  dueDate: string
  icon: React.ReactNode
}

// Datos de ejemplo para los empleados de Florida
const sampleEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'Laura',
    lastName: 'Sánchez Díaz',
    email: 'laura.sanchez@empresa.com',
    position: 'Contadora Senior',
    department: 'Finanzas',
    taxId: '***-**-1234',
    salary: 65000,
    status: 'ACTIVE'
  },
  {
    id: '2',
    firstName: 'Roberto',
    lastName: 'Martínez Cruz',
    email: 'roberto.martinez@empresa.com',
    position: 'Desarrollador',
    department: 'Tecnología',
    taxId: '***-**-5678',
    salary: 75000,
    status: 'ACTIVE'
  },
  {
    id: '3',
    firstName: 'Ana',
    lastName: 'García López',
    email: 'ana.garcia@empresa.com',
    position: 'Gerente de Ventas',
    department: 'Ventas',
    taxId: '***-**-9012',
    salary: 85000,
    status: 'ACTIVE'
  }
]

// Información de formularios fiscales
const taxForms: TaxFormData[] = [
  {
    type: 'rt6',
    name: 'RT-6 (Florida Reemployment Tax)',
    description: 'Reporte Trimestral de Impuesto de Reempleo de Florida',
    frequency: 'Trimestral',
    dueDate: 'Último día del mes siguiente al trimestre',
    icon: <Building2 className="w-5 h-5" />
  },
  {
    type: '941',
    name: 'Form 941 (Quarterly Federal)',
    description: 'Declaración Trimestral de Impuestos Federales del Empleador',
    frequency: 'Trimestral',
    dueDate: 'Último día del mes siguiente al trimestre',
    icon: <FileText className="w-5 h-5" />
  },
  {
    type: '940',
    name: 'Form 940 (FUTA Annual)',
    description: 'Declaración Anual de Impuesto Federal de Desempleo',
    frequency: 'Anual',
    dueDate: '31 de Enero del año siguiente',
    icon: <Calendar className="w-5 h-5" />
  },
  {
    type: 'w3',
    name: 'W-3 (Transmittal of W-2s)',
    description: 'Resumen de Transmisión de Formularios W-2',
    frequency: 'Anual',
    dueDate: '31 de Enero del año siguiente',
    icon: <FileSpreadsheet className="w-5 h-5" />
  },
  {
    type: '1096',
    name: 'Form 1096 (Transmittal of 1099s)',
    description: 'Resumen de Transmisión de Formularios 1099',
    frequency: 'Anual',
    dueDate: '28 de Febrero del año siguiente',
    icon: <FileSpreadsheet className="w-5 h-5" />
  },
  {
    type: 'w2',
    name: 'W-2 (Wage and Tax Statement)',
    description: 'Declaración de Salarios e Impuestos por Empleado',
    frequency: 'Anual',
    dueDate: '31 de Enero del año siguiente',
    icon: <Users className="w-5 h-5" />
  }
]

export default function TaxFormsPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
  
  const [selectedForm, setSelectedForm] = useState<TaxFormType>('rt6')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [selectedQuarter, setSelectedQuarter] = useState<number>(4)
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchEmployees = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      const response = await fetch(`/api/employees?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data)
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }, [activeCompany?.id])

  // Cargar empleados reales si hay compañía activa
  useEffect(() => {
    if (activeCompany) {
      fetchEmployees()
    }
  }, [activeCompany, fetchEmployees])

  const currentFormInfo = taxForms.find(f => f.type === selectedForm)

  // Generar datos del formulario RT-6
  const generateRT6Data = () => {
    const totalWages = employees.reduce((sum, emp) => sum + (emp.salary / 4), 0) // Trimestral
    const taxableWages = Math.min(totalWages, 7000 * employees.length)
    const taxRate = 0.027 // 2.7% Florida SUI
    const taxDue = taxableWages * taxRate

    return {
      formType: 'RT-6',
      title: 'FLORIDA DEPARTMENT OF REVENUE - EMPLOYER\'S QUARTERLY REPORT',
      period: `Q${selectedQuarter} ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101',
        accountNumber: 'FL-1234567'
      },
      data: {
        totalWages: totalWages.toFixed(2),
        excessWages: (totalWages - taxableWages).toFixed(2),
        taxableWages: taxableWages.toFixed(2),
        taxRate: (taxRate * 100).toFixed(2) + '%',
        taxDue: taxDue.toFixed(2),
        employeeCount: employees.length,
        employees: employees.map(emp => ({
          ssn: emp.taxId,
          name: `${emp.lastName}, ${emp.firstName}`,
          wages: (emp.salary / 4).toFixed(2)
        }))
      }
    }
  }

  // Generar datos del formulario 941
  const generateForm941Data = () => {
    const totalWages = employees.reduce((sum, emp) => sum + (emp.salary / 4), 0)
    const federalWithholding = totalWages * 0.22 // Aproximado 22%
    const socialSecurityWages = totalWages
    const socialSecurityTax = socialSecurityWages * 0.124 // 6.2% empleado + 6.2% empleador
    const medicareWages = totalWages
    const medicareTax = medicareWages * 0.029 // 1.45% empleado + 1.45% empleador
    const totalTaxes = federalWithholding + socialSecurityTax + medicareTax

    return {
      formType: 'Form 941',
      title: 'EMPLOYER\'S QUARTERLY FEDERAL TAX RETURN',
      period: `Q${selectedQuarter} ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101'
      },
      data: {
        numberOfEmployees: employees.length,
        wagesAndTips: totalWages.toFixed(2),
        federalIncomeTaxWithheld: federalWithholding.toFixed(2),
        socialSecurityWages: socialSecurityWages.toFixed(2),
        socialSecurityTax: socialSecurityTax.toFixed(2),
        medicareWages: medicareWages.toFixed(2),
        medicareTax: medicareTax.toFixed(2),
        totalTaxes: totalTaxes.toFixed(2),
        totalDeposits: totalTaxes.toFixed(2),
        balanceDue: '0.00'
      }
    }
  }

  // Generar datos del formulario 940
  const generateForm940Data = () => {
    const totalPayments = employees.reduce((sum, emp) => sum + emp.salary, 0)
    const futaWageBase = 7000
    const totalFUTAWages = employees.length * futaWageBase
    const futaTaxRate = 0.006 // 0.6% después del crédito estatal
    const totalFUTATax = totalFUTAWages * futaTaxRate

    return {
      formType: 'Form 940',
      title: 'EMPLOYER\'S ANNUAL FEDERAL UNEMPLOYMENT (FUTA) TAX RETURN',
      period: `Año ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101'
      },
      data: {
        stateQualification: 'Florida',
        totalPayments: totalPayments.toFixed(2),
        exemptPayments: '0.00',
        paymentsExcludingFUTA: (totalPayments - (futaWageBase * employees.length)).toFixed(2),
        totalFUTAWages: totalFUTAWages.toFixed(2),
        futaTaxBeforeAdjustments: (totalFUTAWages * 0.06).toFixed(2),
        stateUnemploymentCredit: (totalFUTAWages * 0.054).toFixed(2),
        totalFUTATax: totalFUTATax.toFixed(2),
        totalDeposits: totalFUTATax.toFixed(2),
        balanceDue: '0.00'
      }
    }
  }

  // Generar datos del formulario W-3
  const generateW3Data = () => {
    const totalWages = employees.reduce((sum, emp) => sum + emp.salary, 0)
    const federalWithholding = totalWages * 0.22
    const ssWages = Math.min(totalWages, 168600 * employees.length)
    const ssTax = ssWages * 0.062
    const medicareWages = totalWages
    const medicareTax = medicareWages * 0.0145

    return {
      formType: 'Form W-3',
      title: 'TRANSMITTAL OF WAGE AND TAX STATEMENTS',
      period: `Año ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101'
      },
      data: {
        numberOfW2Forms: employees.length,
        totalWages: totalWages.toFixed(2),
        totalFederalIncomeTaxWithheld: federalWithholding.toFixed(2),
        totalSocialSecurityWages: ssWages.toFixed(2),
        totalSocialSecurityTaxWithheld: ssTax.toFixed(2),
        totalMedicareWages: medicareWages.toFixed(2),
        totalMedicareTaxWithheld: medicareTax.toFixed(2),
        stateName: 'Florida',
        stateWages: totalWages.toFixed(2),
        stateIncomeTax: '0.00' // Florida no tiene impuesto estatal sobre ingresos
      }
    }
  }

  // Generar datos del formulario 1096
  const generateForm1096Data = () => {
    return {
      formType: 'Form 1096',
      title: 'ANNUAL SUMMARY AND TRANSMITTAL OF U.S. INFORMATION RETURNS',
      period: `Año ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101'
      },
      data: {
        formType1099: '1099-NEC',
        numberOfForms: '0',
        totalAmount: '0.00',
        federalIncomeTaxWithheld: '0.00',
        note: 'Este formulario resume todos los 1099 emitidos a contratistas independientes'
      }
    }
  }

  // Generar datos del formulario W-2 por empleado
  const generateW2Data = (employee: Employee) => {
    const wages = employee.salary
    const federalWithholding = wages * 0.22
    const ssWages = Math.min(wages, 168600)
    const ssTax = ssWages * 0.062
    const medicareWages = wages
    const medicareTax = medicareWages * 0.0145

    return {
      formType: 'Form W-2',
      title: 'WAGE AND TAX STATEMENT',
      period: `Año ${selectedYear}`,
      companyInfo: {
        name: activeCompany?.name || 'Mi Empresa LLC',
        ein: 'XX-XXXXXXX',
        address: '123 Business Ave, Miami, FL 33101'
      },
      employeeInfo: {
        name: `${employee.firstName} ${employee.lastName}`,
        ssn: employee.taxId,
        address: 'Dirección del Empleado'
      },
      data: {
        box1_wages: wages.toFixed(2),
        box2_federalTax: federalWithholding.toFixed(2),
        box3_ssWages: ssWages.toFixed(2),
        box4_ssTax: ssTax.toFixed(2),
        box5_medicareWages: medicareWages.toFixed(2),
        box6_medicareTax: medicareTax.toFixed(2),
        box15_state: 'FL',
        box16_stateWages: wages.toFixed(2),
        box17_stateTax: '0.00' // Florida no tiene impuesto estatal
      }
    }
  }

  // Generar preview del formulario seleccionado
  const handlePreview = () => {
    let data: any

    switch (selectedForm) {
      case 'rt6':
        data = generateRT6Data()
        break
      case '941':
        data = generateForm941Data()
        break
      case '940':
        data = generateForm940Data()
        break
      case 'w3':
        data = generateW3Data()
        break
      case '1096':
        data = generateForm1096Data()
        break
      case 'w2':
        if (selectedEmployee === 'all') {
          data = {
            formType: 'Form W-2 (Todos)',
            employees: employees.map(emp => generateW2Data(emp))
          }
        } else {
          const emp = employees.find(e => e.id === selectedEmployee)
          if (emp) {
            data = generateW2Data(emp)
          }
        }
        break
    }

    setPreviewData(data)
    setShowPreview(true)
  }

  // Función para descargar como CSV
  const downloadAsCSV = (data: any, filename: string) => {
    let csvContent = ''

    if (data.formType === 'Form W-2 (Todos)') {
      // Headers para W-2 múltiples
      csvContent = 'Empleado,SSN,Salarios,Impuesto Federal,SS Wages,SS Tax,Medicare Wages,Medicare Tax,Estado,State Wages,State Tax\n'
      data.employees.forEach((w2: any) => {
        csvContent += `"${w2.employeeInfo.name}",${w2.employeeInfo.ssn},${w2.data.box1_wages},${w2.data.box2_federalTax},${w2.data.box3_ssWages},${w2.data.box4_ssTax},${w2.data.box5_medicareWages},${w2.data.box6_medicareTax},${w2.data.box15_state},${w2.data.box16_stateWages},${w2.data.box17_stateTax}\n`
      })
    } else if (data.formType === 'RT-6') {
      csvContent = `Formulario,${data.formType}\n`
      csvContent += `Período,${data.period}\n`
      csvContent += `Empresa,${data.companyInfo.name}\n`
      csvContent += `EIN,${data.companyInfo.ein}\n\n`
      csvContent += `Total Salarios,$${data.data.totalWages}\n`
      csvContent += `Salarios en Exceso,$${data.data.excessWages}\n`
      csvContent += `Salarios Gravables,$${data.data.taxableWages}\n`
      csvContent += `Tasa de Impuesto,${data.data.taxRate}\n`
      csvContent += `Impuesto Debido,$${data.data.taxDue}\n\n`
      csvContent += `SSN,Nombre,Salarios\n`
      data.data.employees.forEach((emp: any) => {
        csvContent += `${emp.ssn},"${emp.name}",$${emp.wages}\n`
      })
    } else {
      // Formato genérico para otros formularios
      csvContent = `Formulario,${data.formType}\n`
      csvContent += `Período,${data.period}\n`
      csvContent += `Empresa,${data.companyInfo.name}\n`
      csvContent += `EIN,${data.companyInfo.ein}\n\n`
      
      Object.entries(data.data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          csvContent += `${key},$${value}\n`
        }
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${selectedYear}_Q${selectedQuarter}.csv`
    link.click()
    toast.success(`${filename} descargado correctamente`)
  }

  // Descargar formulario
  const handleDownload = () => {
    let data: any
    let filename: string = ''

    switch (selectedForm) {
      case 'rt6':
        data = generateRT6Data()
        filename = 'RT6_Florida'
        break
      case '941':
        data = generateForm941Data()
        filename = 'Form941_Federal'
        break
      case '940':
        data = generateForm940Data()
        filename = 'Form940_FUTA'
        break
      case 'w3':
        data = generateW3Data()
        filename = 'FormW3_Transmittal'
        break
      case '1096':
        data = generateForm1096Data()
        filename = 'Form1096_Transmittal'
        break
      case 'w2':
        if (selectedEmployee === 'all') {
          data = {
            formType: 'Form W-2 (Todos)',
            employees: employees.map(emp => generateW2Data(emp))
          }
          filename = 'FormW2_AllEmployees'
        } else {
          const emp = employees.find(e => e.id === selectedEmployee)
          if (emp) {
            data = generateW2Data(emp)
            filename = `FormW2_${emp.lastName.replaceAll(/\s/g, '_')}`
          }
        }
        break
    }

    downloadAsCSV(data, filename)
  }

  // Renderizar preview del formulario
  const renderFormPreview = () => {
    if (!previewData) return null

    if (previewData.formType === 'Form W-2 (Todos)') {
      return (
        <div className="space-y-6">
          {previewData.employees.map((w2: any) => (
            <Card key={w2.employeeInfo.ssn} className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  W-2: {w2.employeeInfo.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Box 1 - Wages</p>
                    <p className="font-semibold">${w2.data.box1_wages}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Box 2 - Federal Tax</p>
                    <p className="font-semibold">${w2.data.box2_federalTax}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Box 3 - SS Wages</p>
                    <p className="font-semibold">${w2.data.box3_ssWages}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Box 4 - SS Tax</p>
                    <p className="font-semibold">${w2.data.box4_ssTax}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Box 5 - Medicare Wages</p>
                    <p className="font-semibold">${w2.data.box5_medicareWages}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Box 6 - Medicare Tax</p>
                    <p className="font-semibold">${w2.data.box6_medicareTax}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    return (
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {previewData.formType} - {previewData.period}
          </CardTitle>
          <p className="text-sm text-gray-600">{previewData.title}</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Información de la Empresa</h4>
            <p>{previewData.companyInfo.name}</p>
            <p className="text-sm text-gray-600">EIN: {previewData.companyInfo.ein}</p>
            <p className="text-sm text-gray-600">{previewData.companyInfo.address}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(previewData.data).map(([key, value]) => {
              if (key === 'employees') return null
              if (typeof value === 'object') return null
              
              const label = key
                .replaceAll(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replaceAll('_', ' ')

              return (
                <div key={key} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold">
                    {typeof value === 'string' && !value.includes('%') ? `$${value}` : value as string}
                  </p>
                </div>
              )
            })}
          </div>

          {previewData.data.employees && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Lista de Empleados</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SSN</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Salarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.data.employees.map((emp: any) => (
                    <TableRow key={emp.ssn}>
                      <TableCell>{emp.ssn}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell className="text-right">${emp.wages}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (status === 'loading') {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-blue-600" />
              Generador de Formularios Fiscales
            </h1>
            <p className="text-gray-600 mt-1">
              Genere y descargue formularios fiscales de Florida y federales
            </p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 px-3 py-1">
            <AlertCircle className="w-4 h-4 mr-1" />
            Florida Payroll
          </Badge>
        </div>

        {/* Información Importante */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Información Importante - Florida Payroll</h3>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Florida NO tiene impuesto estatal sobre la renta (State Income Tax)</li>
                  <li>• RT-6 es requerido trimestralmente para el impuesto de reempleo de Florida</li>
                  <li>• La tasa SUI de Florida es 2.7% sobre los primeros $7,000 por empleado</li>
                  <li>• Los formularios W-2 deben entregarse antes del 31 de enero</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selectores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Formulario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Selector de Formulario */}
              <div>
                <label htmlFor="form-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Formulario
                </label>
                <Select value={selectedForm} onValueChange={(value: TaxFormType) => {
                  setSelectedForm(value)
                  setShowPreview(false)
                }}>
                  <SelectTrigger id="form-type">
                    <SelectValue placeholder="Seleccione formulario" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxForms.map(form => (
                      <SelectItem key={form.type} value={form.type}>
                        <div className="flex items-center gap-2">
                          {form.icon}
                          <span>{form.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Año */}
              <div>
                <label htmlFor="fiscal-year" className="block text-sm font-medium text-gray-700 mb-2">
                  Año Fiscal
                </label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
                  <SelectTrigger id="fiscal-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Trimestre (solo para formularios trimestrales) */}
              {(selectedForm === 'rt6' || selectedForm === '941') && (
                <div>
                  <label htmlFor="quarter" className="block text-sm font-medium text-gray-700 mb-2">
                    Trimestre
                  </label>
                  <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(Number.parseInt(value))}>
                    <SelectTrigger id="quarter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Ene-Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Abr-Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct-Dic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selector de Empleado (solo para W-2) */}
              {selectedForm === 'w2' && (
                <div>
                  <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
                    Empleado
                  </label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger id="employee">
                      <SelectValue placeholder="Seleccione empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Todos los Empleados
                        </div>
                      </SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Info del formulario seleccionado */}
            {currentFormInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {currentFormInfo.icon}
                  <div>
                    <h4 className="font-semibold">{currentFormInfo.name}</h4>
                    <p className="text-sm text-gray-600">{currentFormInfo.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Frecuencia: {currentFormInfo.frequency}</span>
                      <span>Vencimiento: {currentFormInfo.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3 mt-6">
              <Button onClick={handlePreview} className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Descargar CSV
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Empleados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Empleados ({employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead className="text-right">Salario Anual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="font-mono text-sm">{employee.taxId}</TableCell>
                    <TableCell className="text-right">
                      ${employee.salary.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedForm('w2')
                          setSelectedEmployee(employee.id)
                          handlePreview()
                        }}
                        className="flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        W-2
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preview del Formulario */}
        {showPreview && previewData && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vista Previa del Formulario</h2>
              <Button onClick={handleDownload} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Descargar Este Formulario
              </Button>
            </div>
            {renderFormPreview()}
          </div>
        )}

        {/* Resumen de Formularios Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formularios Fiscales Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {taxForms.map(form => (
                <button
                  type="button"
                  key={form.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-all text-left w-full ${
                    selectedForm === form.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    setSelectedForm(form.type)
                    setShowPreview(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedForm === form.type ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {form.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{form.name}</h4>
                      <p className="text-xs text-gray-500">{form.frequency}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

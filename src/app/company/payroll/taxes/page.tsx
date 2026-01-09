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
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Building2,
  Receipt,
  X,
  Flag
} from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

// Interfaces para impuestos de USA/Florida
interface TaxRecord {
  id: string
  employee: string
  employeeId: string
  period: string
  periodStart: string
  periodEnd: string
  grossPay: number
  federalWithholding: number
  socialSecurity: number
  medicare: number
  futaEmployer: number
  sutaEmployer: number
  totalWithholdings: number
  employerContributions: number
  status: 'pending' | 'calculated' | 'filed' | 'paid'
}

interface TaxSummary {
  period: string
  totalFederalWithholding: number
  totalSocialSecurityEmployee: number
  totalSocialSecurityEmployer: number
  totalMedicareEmployee: number
  totalMedicareEmployer: number
  totalFUTA: number
  totalSUTA: number
  totalWithholdings: number
  totalEmployerContributions: number
  employees: number
}

export default function PayrollTaxesPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'individual' | 'summary'>('summary')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDeclarationModal, setShowDeclarationModal] = useState(false)
  const [selectedTax, setSelectedTax] = useState<TaxRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    type: 'federal',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    bank: ''
  })

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([])
  const [taxSummary, setTaxSummary] = useState<TaxSummary>({
    period: '',
    totalFederalWithholding: 0,
    totalSocialSecurityEmployee: 0,
    totalSocialSecurityEmployer: 0,
    totalMedicareEmployee: 0,
    totalMedicareEmployer: 0,
    totalFUTA: 0,
    totalSUTA: 0,
    totalWithholdings: 0,
    totalEmployerContributions: 0,
    employees: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadTaxData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/taxes-florida?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTaxRecords(data.records || [])
        setTaxSummary(data.summary || {
          period: '',
          totalFederalWithholding: 0,
          totalSocialSecurityEmployee: 0,
          totalSocialSecurityEmployer: 0,
          totalMedicareEmployee: 0,
          totalMedicareEmployer: 0,
          totalFUTA: 0,
          totalSUTA: 0,
          totalWithholdings: 0,
          totalEmployerContributions: 0,
          employees: 0
        })
      } else {
        toast.error('Error loading tax data')
      }
    } catch (error) {
      console.error('Error loading tax data:', error)
      toast.error('Error loading tax data')
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'authenticated') {
      loadTaxData()
    }
  }, [status, loadTaxData])

  const getStatusBadge = (taxStatus: string) => {
    switch (taxStatus) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Pending
        </Badge>
      case 'calculated':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Calculated
        </Badge>
      case 'filed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Filed
        </Badge>
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Paid
        </Badge>
      default:
        return null
    }
  }

  const filteredTaxes = taxRecords.filter(tax => {
    if (filterStatus !== 'all' && tax.status !== filterStatus) return false
    if (searchTerm && !tax.employee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tax.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Función para exportar datos a PDF
  const handleExport = () => {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    
    // Header
    pdf.setFillColor(59, 130, 246)
    pdf.rect(0, 0, pageWidth, 35, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PAYROLL TAX REPORT', pageWidth / 2, 15, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Florida, USA', pageWidth / 2, 23, { align: 'center' })
    pdf.text(activeCompany?.name || 'Company', pageWidth / 2, 30, { align: 'center' })
    
    // Reset text color
    pdf.setTextColor(0, 0, 0)
    
    let yPos = 50
    
    if (viewMode === 'summary') {
      // Summary View PDF
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Tax Summary', 14, yPos)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Period: ${taxSummary.period}`, 14, yPos + 7)
      pdf.text(`Report Date: ${today}`, 14, yPos + 14)
      pdf.text(`Total Employees: ${taxSummary.employees}`, 14, yPos + 21)
      
      yPos += 35
      
      // Table header
      pdf.setFillColor(243, 244, 246)
      pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text('Tax Concept', 20, yPos + 7)
      pdf.text('Amount (USD)', pageWidth - 50, yPos + 7, { align: 'right' })
      
      yPos += 15
      pdf.setFont('helvetica', 'normal')
      
      const summaryData = [
        { concept: 'Federal Income Tax Withheld', amount: taxSummary.totalFederalWithholding },
        { concept: 'Social Security (Employee 6.2%)', amount: taxSummary.totalSocialSecurityEmployee },
        { concept: 'Social Security (Employer 6.2%)', amount: taxSummary.totalSocialSecurityEmployer },
        { concept: 'Medicare (Employee 1.45%)', amount: taxSummary.totalMedicareEmployee },
        { concept: 'Medicare (Employer 1.45%)', amount: taxSummary.totalMedicareEmployer },
        { concept: 'FUTA (Federal Unemployment 0.6%)', amount: taxSummary.totalFUTA },
        { concept: 'SUTA (Florida Reemployment 2.75%)', amount: taxSummary.totalSUTA },
      ]
      
      summaryData.forEach((item, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251)
          pdf.rect(14, yPos - 5, pageWidth - 28, 10, 'F')
        }
        pdf.text(item.concept, 20, yPos)
        pdf.text(`$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 50, yPos, { align: 'right' })
        yPos += 10
      })
      
      // Totals section
      yPos += 5
      pdf.setDrawColor(200, 200, 200)
      pdf.line(14, yPos, pageWidth - 14, yPos)
      yPos += 10
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFillColor(219, 234, 254)
      pdf.rect(14, yPos - 5, pageWidth - 28, 10, 'F')
      pdf.text('Total Employee Withholdings', 20, yPos)
      pdf.text(`$${taxSummary.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 50, yPos, { align: 'right' })
      
      yPos += 12
      pdf.setFillColor(220, 252, 231)
      pdf.rect(14, yPos - 5, pageWidth - 28, 10, 'F')
      pdf.text('Total Employer Contributions', 20, yPos)
      pdf.text(`$${taxSummary.totalEmployerContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 50, yPos, { align: 'right' })
      
      yPos += 12
      pdf.setFillColor(254, 243, 199)
      pdf.rect(14, yPos - 5, pageWidth - 28, 10, 'F')
      pdf.text('GRAND TOTAL', 20, yPos)
      const grandTotal = taxSummary.totalWithholdings + taxSummary.totalEmployerContributions
      pdf.text(`$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 50, yPos, { align: 'right' })
      
    } else {
      // Individual Employee View PDF
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Cost per Employee Detail', 14, yPos)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Report Date: ${today}`, 14, yPos + 7)
      pdf.text(`Total Employees: ${filteredTaxes.length}`, 14, yPos + 14)
      
      yPos += 30
      
      filteredTaxes.forEach((tax, index) => {
        if (yPos > 250) {
          pdf.addPage()
          yPos = 20
        }
        
        // Employee header
        pdf.setFillColor(59, 130, 246)
        pdf.rect(14, yPos - 5, pageWidth - 28, 12, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${tax.employee} (${tax.employeeId})`, 20, yPos + 2)
        pdf.setTextColor(0, 0, 0)
        
        yPos += 15
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        
        pdf.text(`Period: ${tax.period}`, 20, yPos)
        pdf.text(`Gross Pay: $${tax.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 100, yPos)
        
        yPos += 8
        pdf.text(`Federal W/H: $${tax.federalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos)
        pdf.text(`Social Security: $${tax.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 100, yPos)
        
        yPos += 8
        pdf.text(`Medicare: $${tax.medicare.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos)
        pdf.text(`FUTA: $${tax.futaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 100, yPos)
        
        yPos += 8
        pdf.text(`SUTA (Florida): $${tax.sutaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos)
        
        yPos += 8
        pdf.setFont('helvetica', 'bold')
        pdf.text(`Total Cost: $${(tax.totalWithholdings + tax.employerContributions).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos)
        pdf.text(`Status: ${tax.status.toUpperCase()}`, 100, yPos)
        
        yPos += 15
        pdf.setFontSize(10)
      })
    }
    
    // Footer
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' })
      pdf.text('Generated by COMPUTOPLUS - Florida Payroll System', pageWidth / 2, 295, { align: 'center' })
    }
    
    pdf.save(`payroll_taxes_florida_${viewMode}_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success(`✅ PDF exported: payroll_taxes_florida_${viewMode}.pdf`)
  }

  // Función para generar declaración
  const handleGenerateDeclaration = () => {
    setShowDeclarationModal(true)
  }

  const generateDeclarationPDF = (type: string) => {
    const declarationData = {
      type,
      period: 'Nov 16-30, 2025',
      company: activeCompany?.name || 'My Company',
      generatedAt: new Date().toLocaleString('en-US'),
      ein: '12-3456789',
      state: 'Florida',
      city: 'Miami'
    }

    const getTypeLabel = (t: string) => {
      if (t === 'federal') return 'Federal Taxes (Form 941)'
      if (t === 'state') return 'Florida Reemployment Tax (RT-6)'
      return 'Complete Summary'
    }

    let content = `
================================================================================
                    PAYROLL TAX SUMMARY - FLORIDA, USA
================================================================================

Type: ${getTypeLabel(type)}
Company: ${declarationData.company}
EIN: ${declarationData.ein}
Period: ${declarationData.period}
State: ${declarationData.state}
Generated: ${declarationData.generatedAt}

--------------------------------------------------------------------------------
                              TAX BREAKDOWN
--------------------------------------------------------------------------------
`
    if (type === 'federal' || type === 'all') {
      content += `
FEDERAL TAXES (Form 941 - Quarterly)
=====================================
Federal Income Tax Withheld:     $${taxSummary.totalFederalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}

Social Security Tax (6.2% each):
  - Employee Portion:            $${taxSummary.totalSocialSecurityEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Employer Portion:            $${taxSummary.totalSocialSecurityEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Total Social Security:       $${(taxSummary.totalSocialSecurityEmployee + taxSummary.totalSocialSecurityEmployer).toLocaleString('en-US', { minimumFractionDigits: 2 })}

Medicare Tax (1.45% each):
  - Employee Portion:            $${taxSummary.totalMedicareEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Employer Portion:            $${taxSummary.totalMedicareEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Total Medicare:              $${(taxSummary.totalMedicareEmployee + taxSummary.totalMedicareEmployer).toLocaleString('en-US', { minimumFractionDigits: 2 })}

FUTA (Federal Unemployment - 0.6%):
  - Employer Only:               $${taxSummary.totalFUTA.toLocaleString('en-US', { minimumFractionDigits: 2 })}
`
    }
    if (type === 'state' || type === 'all') {
      content += `
FLORIDA STATE TAXES (RT-6 - Quarterly)
======================================
⭐ FLORIDA HAS NO STATE INCOME TAX ⭐

Florida Reemployment Tax (SUTA - 2.75%):
  - Employer Only:               $${taxSummary.totalSUTA.toLocaleString('en-US', { minimumFractionDigits: 2 })}

Note: Florida is one of 9 states with no state income tax.
Employers must pay Florida Reemployment Tax on first $7,000 of wages per employee.
`
    }
    content += `

--------------------------------------------------------------------------------
                              TOTALS
--------------------------------------------------------------------------------
Total Employee Withholdings:     $${taxSummary.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Total Employer Contributions:    $${taxSummary.totalEmployerContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
TOTAL PAYROLL TAX LIABILITY:     $${(taxSummary.totalWithholdings + taxSummary.totalEmployerContributions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Number of Employees:             ${taxSummary.employees}

--------------------------------------------------------------------------------
                           DEPOSIT SCHEDULE
--------------------------------------------------------------------------------
• Federal Taxes: Semi-weekly or Monthly (based on lookback period)
• Form 941: Due quarterly (Apr 30, Jul 31, Oct 31, Jan 31)
• FUTA (Form 940): Due annually (Jan 31)
• Florida RT-6: Due quarterly (Apr 30, Jul 31, Oct 31, Jan 31)

This document is for review purposes.
File via EFTPS (federal) and FloridaRevenue.com (state).
================================================================================
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tax_declaration_${type}_florida_${new Date().toISOString().split('T')[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
    
    setShowDeclarationModal(false)
    toast.success(`✅ ${type.toUpperCase()} declaration generated successfully`)
  }

  // Función para registrar pago
  const handleRegisterPayment = () => {
    if (!paymentData.amount || !paymentData.reference) {
      toast.error('Please complete all required fields')
      return
    }

    toast.success(`✅ ${paymentData.type.toUpperCase()} payment registered\nAmount: $${paymentData.amount.toLocaleString('en-US')}\nReference: ${paymentData.reference}`)
    setShowPaymentModal(false)
    setPaymentData({
      type: 'federal',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reference: '',
      bank: ''
    })
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

  if (!loading && taxRecords.length === 0) {
    return (
      <CompanyTabsLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Payroll Taxes</h1>
                <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Florida
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">
                Federal and Florida state payroll tax management
              </p>
            </div>
          </div>

          <Card className="p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Payroll Tax Records</h3>
            <p className="text-gray-500 mb-6">
              No payroll data found for the current period. Process payroll first to see tax calculations.
            </p>
            <Button onClick={() => router.push('/company/payroll/florida')}>
              <Plus className="w-4 h-4 mr-2" />
              Go to Payroll Processing
            </Button>
          </Card>
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Payroll Taxes</h1>
              <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
                <Flag className="w-3 h-3" /> Florida
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Federal and Florida state payroll tax management
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateDeclaration}>
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Generate Forms</span>
            </Button>
            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Record Payment</span>
            </Button>
          </div>
        </div>

        {/* Florida Notice */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-orange-900">Florida Tax Advantage:</span>
                <span className="text-orange-700 ml-1 sm:ml-2">
                  No state income tax! Only Federal taxes + Florida Reemployment Tax (SUTA) apply.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-blue-900 truncate">
                ${taxSummary.totalFederalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-blue-700">Federal Income Tax</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-900 truncate">
                ${(taxSummary.totalSocialSecurityEmployee + taxSummary.totalSocialSecurityEmployer).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-green-700">Social Security</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-purple-900 truncate">
                ${(taxSummary.totalMedicareEmployee + taxSummary.totalMedicareEmployer).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Medicare (Total)</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-orange-900 truncate">
                ${(taxSummary.totalFUTA + taxSummary.totalSUTA).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-orange-700">Unemployment</div>
            </CardContent>
          </Card>
        </div>

        {/* Employee vs Employer Contributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-red-700 mb-1">Total Employee Withholdings</div>
                  <div className="text-xl sm:text-3xl font-bold text-red-900 truncate">
                    ${taxSummary.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-red-600 mt-2 hidden sm:block">
                    Federal W/H + Social Security + Medicare deducted from pay
                  </div>
                </div>
                <TrendingDown className="w-8 h-8 sm:w-12 sm:h-12 text-red-600 opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-indigo-700 mb-1">Total Employer Contributions</div>
                  <div className="text-xl sm:text-3xl font-bold text-indigo-900 truncate">
                    ${taxSummary.totalEmployerContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-indigo-600 mt-2 hidden sm:block">
                    Matching SS + Medicare + FUTA + Florida SUTA
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Calendar className="w-5 h-5 text-gray-400 hidden sm:block" />
                <span className="text-sm sm:text-base font-semibold text-gray-700">
                  Period: <strong>{taxSummary.period || 'Current Period'}</strong>
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  Summary
                </Button>
                <Button 
                  size="sm"
                  variant={viewMode === 'individual' ? 'default' : 'outline'}
                  onClick={() => setViewMode('individual')}
                >
                  By Employee
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'summary' ? (
          /* Summary View */
          <Card>
            <CardHeader>
              <CardTitle>Payroll Tax Summary - Florida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                  {/* Federal Income Tax Section */}
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Federal Income Tax Withholding</h3>
                      <span className="text-2xl font-bold text-blue-600">
                        ${taxSummary.totalFederalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Based on employee W-4 forms - {taxSummary.employees} employees
                    </p>
                  </div>

                  {/* FICA Section */}
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">FICA Taxes (Social Security + Medicare)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-700 mb-1">Social Security (6.2% each)</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <div className="text-xs text-green-600">Employee</div>
                            <div className="text-lg font-bold text-green-900">
                              ${taxSummary.totalSocialSecurityEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-600">Employer</div>
                            <div className="text-lg font-bold text-green-900">
                              ${taxSummary.totalSocialSecurityEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2">Wage base limit: $168,600 (2025)</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-purple-700 mb-1">Medicare (1.45% each)</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <div className="text-xs text-purple-600">Employee</div>
                            <div className="text-lg font-bold text-purple-900">
                              ${taxSummary.totalMedicareEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-purple-600">Employer</div>
                            <div className="text-lg font-bold text-purple-900">
                              ${taxSummary.totalMedicareEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-purple-600 mt-2">Additional 0.9% on wages over $200K</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Form 941: Quarterly filing for Federal Income Tax + FICA
                    </p>
                  </div>

                  {/* Unemployment Section */}
                  <div className="pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Unemployment Taxes (Employer Only)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-700 mb-1">FUTA (Federal Unemployment)</div>
                        <div className="text-xl font-bold text-blue-900">
                          ${taxSummary.totalFUTA.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">0.6% on first $7,000 per employee</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm text-orange-700 mb-1">Florida Reemployment Tax (SUTA)</div>
                        <div className="text-xl font-bold text-orange-900">
                          ${taxSummary.totalSUTA.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">2.75% on first $7,000 per employee</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Form 940 (FUTA): Annual filing | RT-6 (Florida): Quarterly filing
                    </p>
                  </div>

                  {/* Total Summary */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Withholdings</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${taxSummary.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Employer Cost</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${taxSummary.totalEmployerContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Tax Liability</div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${(taxSummary.totalWithholdings + taxSummary.totalEmployerContributions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        ) : (
          /* Individual View */
          <>
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
                  <select 
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="calculated">Calculated</option>
                    <option value="filed">Filed</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Individual Tax Records Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Tax Details by Employee ({filteredTaxes.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile Card View */}
                <div className="block md:hidden divide-y">
                  {filteredTaxes.map((tax) => (
                    <div key={tax.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{tax.employee}</div>
                          <div className="text-xs text-gray-500">{tax.employeeId}</div>
                        </div>
                        {getStatusBadge(tax.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Gross Pay:</span>
                          <div className="font-semibold">${tax.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Federal W/H:</span>
                          <div className="font-semibold text-blue-600">${tax.federalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Social Security:</span>
                          <div className="font-semibold text-green-600">${tax.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Medicare:</span>
                          <div className="font-semibold text-purple-600">${tax.medicare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">FUTA:</span>
                          <div className="font-semibold text-indigo-600">${tax.futaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">FL SUTA:</span>
                          <div className="font-semibold text-orange-600">${tax.sutaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTax(tax)
                            setShowDetailModal(true)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Gross Pay</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Federal W/H</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Social Security</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Medicare</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">FUTA</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">FL SUTA</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTaxes.map((tax) => (
                        <tr key={tax.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm text-gray-900">{tax.employee}</div>
                            <div className="text-xs text-gray-500">{tax.employeeId}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                            ${tax.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                            ${tax.federalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                            ${tax.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-purple-600">
                            ${tax.medicare.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-600">
                            ${tax.futaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-orange-600">
                            ${tax.sutaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(tax.status)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedTax(tax)
                                setShowDetailModal(true)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Florida Payroll Tax Guide</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Payroll tax obligations for employers in Florida, Miami-Dade County.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>No State Income Tax:</strong> Florida is one of 9 states with no state income tax</li>
                  <li>• <strong>Federal Income Tax:</strong> Withheld based on employee W-4 elections</li>
                  <li>• <strong>Social Security:</strong> 6.2% employee + 6.2% employer (wage base $168,600 for 2025)</li>
                  <li>• <strong>Medicare:</strong> 1.45% employee + 1.45% employer (no wage limit)</li>
                  <li>• <strong>FUTA:</strong> 0.6% employer-only on first $7,000 per employee annually</li>
                  <li>• <strong>Florida Reemployment Tax (SUTA):</strong> 2.75% employer-only on first $7,000</li>
                  <li>• <strong>Deposit Schedule:</strong> Semi-weekly or monthly based on lookback period</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Generate Declaration */}
        {showDeclarationModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
            onClick={() => setShowDeclarationModal(false)}
            aria-hidden="true"
          >
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generate Tax Forms</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowDeclarationModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select the type of tax form to generate for the current period.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto py-4"
                    onClick={() => generateDeclarationPDF('federal')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Form 941 - Federal Taxes</div>
                        <div className="text-sm text-gray-500">Total: ${(taxSummary.totalFederalWithholding + taxSummary.totalSocialSecurityEmployee + taxSummary.totalSocialSecurityEmployer + taxSummary.totalMedicareEmployee + taxSummary.totalMedicareEmployer).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto py-4"
                    onClick={() => generateDeclarationPDF('state')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Flag className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">RT-6 - Florida Reemployment Tax</div>
                        <div className="text-sm text-gray-500">SUTA: ${taxSummary.totalSUTA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </Button>

                  <Button 
                    className="w-full justify-start h-auto py-4"
                    onClick={() => generateDeclarationPDF('all')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">Complete Tax Summary</div>
                        <div className="text-sm text-green-100">Total: ${(taxSummary.totalWithholdings + taxSummary.totalEmployerContributions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Register Payment */}
        {showPaymentModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
            onClick={() => setShowPaymentModal(false)}
            aria-hidden="true"
          >
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Record Tax Payment</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="tax-type" className="text-sm font-medium">Tax Type</label>
                  <select 
                    id="tax-type"
                    className="w-full border rounded-md p-2 mt-1"
                    value={paymentData.type}
                    onChange={(e) => setPaymentData({...paymentData, type: e.target.value})}
                  >
                    <option value="federal">Federal Taxes (Form 941)</option>
                    <option value="futa">FUTA (Form 940)</option>
                    <option value="suta">Florida Reemployment Tax (RT-6)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="amount-to-pay" className="text-sm font-medium">Amount to Pay</label>
                  <Input 
                    id="amount-to-pay"
                    type="text"
                    className="amount-input"
                    placeholder="0.00"
                    value={paymentData.amount || ''}
                    onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value.replaceAll(',', ''))})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentData.type === 'federal' && `Pending: $${(taxSummary.totalFederalWithholding + taxSummary.totalSocialSecurityEmployee + taxSummary.totalSocialSecurityEmployer + taxSummary.totalMedicareEmployee + taxSummary.totalMedicareEmployer).toLocaleString('en-US')}`}
                    {paymentData.type === 'futa' && `Pending: $${taxSummary.totalFUTA.toLocaleString('en-US')}`}
                    {paymentData.type === 'suta' && `Pending: $${taxSummary.totalSUTA.toLocaleString('en-US')}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payment-date" className="text-sm font-medium">Payment Date</label>
                    <Input 
                      id="payment-date"
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="payment-method" className="text-sm font-medium">Payment Method</label>
                    <select 
                      id="payment-method"
                      className="w-full border rounded-md p-2 mt-1"
                      value={paymentData.bank}
                      onChange={(e) => setPaymentData({...paymentData, bank: e.target.value})}
                    >
                      <option value="">Select...</option>
                      <option value="eftps">EFTPS (Federal)</option>
                      <option value="florida">FloridaRevenue.com</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmation-number" className="text-sm font-medium">Confirmation Number</label>
                  <Input 
                    id="confirmation-number"
                    placeholder="e.g., EFTPS123456789"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRegisterPayment}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee Tax Details Modal */}
        {showDetailModal && selectedTax && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
            onClick={() => setShowDetailModal(false)}
            aria-hidden="true"
          >
            <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="text-lg">Tax Details - {selectedTax.employee}</CardTitle>
                  <p className="text-sm text-gray-500">{selectedTax.employeeId} • Period: {selectedTax.period}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Gross Pay */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gross Pay for Period</span>
                    <span className="text-2xl font-bold text-gray-900">${selectedTax.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Employee Withholdings */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Employee Withholdings
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Federal Income Tax Withholding</span>
                      <span className="font-semibold text-blue-600">${selectedTax.federalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Social Security (6.2%)</span>
                      <span className="font-semibold text-green-600">${selectedTax.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Medicare (1.45%)</span>
                      <span className="font-semibold text-purple-600">${selectedTax.medicare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-gray-100 px-2 rounded font-semibold">
                      <span>Total Employee Withholdings</span>
                      <span className="text-gray-900">${selectedTax.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Employer Contributions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Employer Contributions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Social Security Match (6.2%)</span>
                      <span className="font-semibold text-green-600">${selectedTax.socialSecurity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Medicare Match (1.45%)</span>
                      <span className="font-semibold text-purple-600">${selectedTax.medicare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">FUTA (0.6% on first $7,000)</span>
                      <span className="font-semibold text-indigo-600">${selectedTax.futaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Florida SUTA (2.75% on first $7,000)</span>
                      <span className="font-semibold text-orange-600">${selectedTax.sutaEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-gray-100 px-2 rounded font-semibold">
                      <span>Total Employer Contributions</span>
                      <span className="text-gray-900">${selectedTax.employerContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Calculation */}
                <div className="p-4 bg-[#E6F4EA] rounded-lg border border-[#2CA01C]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Gross Pay</span>
                    <span className="font-semibold">${selectedTax.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Less: Employee Withholdings</span>
                    <span className="font-semibold text-red-600">-${selectedTax.totalWithholdings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-[#2CA01C] pt-2 mt-2 flex justify-between items-center">
                    <span className="font-bold text-[#108000]">Net Pay (Take Home)</span>
                    <span className="text-xl font-bold text-[#2CA01C]">${(selectedTax.grossPay - selectedTax.totalWithholdings).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Status and Period Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500 uppercase">Status</div>
                    <div className="mt-1">
                      {selectedTax.status === 'paid' && <Badge className="bg-green-100 text-green-800">Paid</Badge>}
                      {selectedTax.status === 'filed' && <Badge className="bg-blue-100 text-blue-800">Filed</Badge>}
                      {selectedTax.status === 'calculated' && <Badge className="bg-yellow-100 text-yellow-800">Calculated</Badge>}
                      {selectedTax.status === 'pending' && <Badge className="bg-gray-100 text-gray-800">Pending</Badge>}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500 uppercase">Period Dates</div>
                    <div className="mt-1 font-semibold text-sm">
                      {new Date(selectedTax.periodStart).toLocaleDateString()} - {new Date(selectedTax.periodEnd).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Total Tax Liability */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-900">Total Tax Liability (Employee + Employer)</span>
                    <span className="text-xl font-bold text-blue-600">
                      ${(selectedTax.totalWithholdings + selectedTax.employerContributions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                  <Button 
                    className="bg-[#2CA01C] hover:bg-[#108000]"
                    onClick={() => {
                      toast.success(`Downloading pay stub for ${selectedTax.employee}`)
                      setShowDetailModal(false)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Pay Stub
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

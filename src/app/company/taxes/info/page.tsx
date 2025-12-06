'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Building,
  Receipt,
  Shield,
  Info,
  ArrowRight,
  AlertTriangle,
  X,
  Save,
  Edit,
  RefreshCw
} from 'lucide-react'

interface TaxObligation {
  id: string
  type: string
  description: string
  frequency: string
  nextDueDate: string
  status: 'current' | 'upcoming' | 'overdue'
  amount?: number
  filingMethod: string
  employeeCount?: number
  vendorCount?: number
}

interface TaxPayment {
  id: string
  type: string
  period: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'pending' | 'overdue'
  confirmationNumber?: string
}

interface TaxSettings {
  ein: string
  taxYear: string
  filingStatus: string
  accountingMethod: string
  fiscalYearEnd: string
  state: string
  stateId: string | null
  industry: string
  naicsCode: string
  federalTaxRate: number
  stateTaxRate: number
}

interface TaxSummary {
  totalRevenue: number
  totalExpenses: number
  totalPayroll: number
  payrollTaxes: number
  netIncome: number
  totalDeductions: number
  estimatedFederalTax: number
  estimatedStateTax: number
  totalEstimatedTax: number
}

export default function TaxInfoPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [taxObligations, setTaxObligations] = useState<TaxObligation[]>([])
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([])
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null)
  const [summary, setSummary] = useState<TaxSummary | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingSettings, setEditingSettings] = useState<Partial<TaxSettings>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchTaxData = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/taxes?companyId=${activeCompany.id}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setTaxObligations(data.taxObligations || [])
        setTaxSettings(data.taxSettings || null)
        setSummary(data.summary || null)
        
        if (data.quarterlyEstimates) {
          const payments: TaxPayment[] = data.quarterlyEstimates.map((est: any, index: number) => ({
            id: `PAY-${String(index + 1).padStart(3, '0')}`,
            type: 'Quarterly Estimated Tax',
            period: est.quarter,
            amount: est.amountDue,
            dueDate: est.dueDate,
            paidDate: est.status === 'paid' ? est.dueDate : undefined,
            status: est.status,
            confirmationNumber: est.status === 'paid' ? `EFTPS-${Date.now()}` : undefined
          }))
          setTaxPayments(payments)
        }
      }
    } catch (error) {
      console.error('Error fetching tax data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    fetchTaxData()
  }, [fetchTaxData])

  const handleSaveSettings = async () => {
    if (!activeCompany?.id) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-settings',
          companyId: activeCompany.id,
          settings: editingSettings
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setShowSettingsModal(false)
        fetchTaxData()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredPayments = taxPayments.filter(p => {
    const paymentYear = new Date(p.dueDate).getFullYear().toString()
    return paymentYear === selectedYear
  })

  const stats = {
    totalPaid: filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pending: filteredPayments.filter(p => p.status === 'pending').length,
    overdue: filteredPayments.filter(p => p.status === 'overdue').length,
    nextPayment: taxObligations.filter(o => o.amount).sort((a, b) => 
      new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    )[0]
  }

  const complianceStatus = {
    federalTaxID: !!taxSettings?.ein && taxSettings.ein !== 'XX-XXXXXXX',
    floridaTaxID: !!taxSettings?.stateId,
    salesTaxPermit: true,
    employerAccount: true,
    annualReport: false,
    insuranceCoverage: true
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</Badge>
      case 'current':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" /> Current</Badge>
      case 'upcoming':
        return <Badge className="bg-orange-100 text-orange-700"><Clock className="w-3 h-3 mr-1" /> Upcoming</Badge>
      default:
        return <Badge>{status}</Badge>
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Information Center</h1>
            <p className="text-gray-600 mt-1">Compliance dashboard and filing status</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTaxData}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
            <Button variant="outline" onClick={() => { setEditingSettings(taxSettings || {}); setShowSettingsModal(true) }}>
              <Edit className="w-4 h-4 mr-2" />Edit Settings
            </Button>
            <Button onClick={() => router.push('/company/taxes/export')}>
              <Download className="w-4 h-4 mr-2" />Export Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">${((summary?.totalRevenue || 0) / 1000).toFixed(0)}K</div>
              <div className="text-sm text-green-700">Revenue {selectedYear}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-900">${((summary?.totalEstimatedTax || 0) / 1000).toFixed(0)}K</div>
              <div className="text-sm text-blue-700">Est. Tax Liability</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
              <div className="text-sm text-yellow-700">Pending Payments</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-xl font-bold text-purple-900">
                {stats.nextPayment ? new Date(stats.nextPayment.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div className="text-sm text-purple-700">Next Due Date</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Company Tax Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {taxSettings ? (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">Legal Name:</span><span className="text-sm font-semibold">{activeCompany?.name || 'N/A'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">EIN:</span><span className="text-sm font-semibold">{taxSettings.ein}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">Filing Status:</span><span className="text-sm font-semibold">{taxSettings.filingStatus}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">Fiscal Year End:</span><span className="text-sm font-semibold">{taxSettings.fiscalYearEnd}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">State:</span><span className="text-sm font-semibold">{taxSettings.state}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">Accounting Method:</span><span className="text-sm font-semibold">{taxSettings.accountingMethod}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-sm text-gray-600">Federal Tax Rate:</span><span className="text-sm font-semibold">{taxSettings.federalTaxRate}%</span></div>
                  <div className="flex justify-between py-2"><span className="text-sm text-gray-600">State Tax Rate:</span><span className="text-sm font-semibold">{taxSettings.stateTaxRate}%</span></div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No tax settings configured</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Federal Tax ID (EIN)', status: complianceStatus.federalTaxID },
                  { label: 'State Tax Registration', status: complianceStatus.floridaTaxID, warning: true },
                  { label: 'Sales Tax Permit', status: complianceStatus.salesTaxPermit },
                  { label: 'Employer Account (Payroll)', status: complianceStatus.employerAccount },
                  { label: `${selectedYear} Annual Report Filed`, status: complianceStatus.annualReport, warning: true },
                  { label: 'Workers Comp Insurance', status: complianceStatus.insuranceCoverage },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    {item.status ? <CheckCircle className="w-5 h-5 text-green-600" /> : 
                     item.warning ? <AlertTriangle className="w-5 h-5 text-yellow-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {summary && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Financial Summary - {selectedYear}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg"><div className="text-sm text-blue-600 mb-1">Total Revenue</div><div className="text-xl font-bold text-blue-900">${summary.totalRevenue.toLocaleString()}</div></div>
                <div className="p-4 bg-red-50 rounded-lg"><div className="text-sm text-red-600 mb-1">Total Expenses</div><div className="text-xl font-bold text-red-900">${summary.totalExpenses.toLocaleString()}</div></div>
                <div className="p-4 bg-purple-50 rounded-lg"><div className="text-sm text-purple-600 mb-1">Payroll</div><div className="text-xl font-bold text-purple-900">${summary.totalPayroll.toLocaleString()}</div></div>
                <div className="p-4 bg-green-50 rounded-lg"><div className="text-sm text-green-600 mb-1">Net Income</div><div className="text-xl font-bold text-green-900">${summary.netIncome.toLocaleString()}</div></div>
                <div className="p-4 bg-orange-50 rounded-lg"><div className="text-sm text-orange-600 mb-1">Est. Tax</div><div className="text-xl font-bold text-orange-900">${summary.totalEstimatedTax.toLocaleString()}</div></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Upcoming Tax Obligations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Frequency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {taxObligations.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No tax obligations found. Add expenses and invoices to calculate tax obligations.</td></tr>
                  ) : (
                    taxObligations.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()).map((obligation) => {
                      const dueDate = new Date(obligation.nextDueDate)
                      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      const isUrgent = daysUntil >= 0 && daysUntil <= 30
                      
                      // Determinar la acción según el tipo de obligación
                      const getActionForObligation = (obl: TaxObligation) => {
                        switch (obl.type) {
                          case 'Federal Income Tax':
                          case 'State Corporate Income Tax':
                            return () => router.push('/company/reports/profit-loss')
                          case 'Quarterly Estimated Tax':
                            return () => router.push('/company/taxes/estimates')
                          case 'Sales & Use Tax':
                            return () => router.push('/company/reports/tax-reports')
                          case 'Payroll Tax (Form 941)':
                            return () => router.push('/company/payroll/taxes')
                          case 'Form W-2':
                            return () => router.push('/company/payroll/tax-forms')
                          case 'Form 1099-NEC':
                            return () => router.push('/company/vendors/list')
                          default:
                            return () => router.push('/company/taxes/deductions')
                        }
                      }
                      
                      const getActionLabel = (obl: TaxObligation) => {
                        switch (obl.type) {
                          case 'Federal Income Tax':
                          case 'State Corporate Income Tax':
                            return 'View P&L'
                          case 'Quarterly Estimated Tax':
                            return 'Pay Now'
                          case 'Sales & Use Tax':
                            return 'File Return'
                          case 'Payroll Tax (Form 941)':
                            return 'View Form'
                          case 'Form W-2':
                            return 'Generate'
                          case 'Form 1099-NEC':
                            return 'Review'
                          default:
                            return 'View'
                        }
                      }
                      
                      return (
                        <tr key={obligation.id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{obligation.type}</div>
                            <div className="text-xs text-gray-500">{obligation.filingMethod}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-700">{obligation.description}</div>
                            {obligation.employeeCount !== undefined && (
                              <div className="text-xs text-blue-600">{obligation.employeeCount} employees</div>
                            )}
                            {obligation.vendorCount !== undefined && (
                              <div className="text-xs text-purple-600">{obligation.vendorCount} vendors</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-xs">{obligation.frequency}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {obligation.amount ? (
                              <div className="text-sm font-semibold text-gray-900">${obligation.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            ) : (
                              <span className="text-gray-400 text-sm">Calculated</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`text-sm ${isUrgent ? 'font-bold text-orange-600' : ''}`}>
                              {dueDate.toLocaleDateString()}
                            </div>
                            {daysUntil > 0 && daysUntil <= 60 && (
                              <div className={`text-xs ${daysUntil <= 14 ? 'text-red-600 font-medium' : daysUntil <= 30 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {daysUntil} days left
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(obligation.status)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              size="sm" 
                              variant={isUrgent ? "default" : "outline"}
                              className={isUrgent ? "bg-[#2CA01C] hover:bg-[#108000]" : ""}
                              onClick={getActionForObligation(obligation)}
                            >
                              {getActionLabel(obligation)}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tax Payment History</CardTitle>
              <select className="px-3 py-2 border rounded-lg text-sm" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Paid Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments found for {selectedYear}</td></tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><div className="text-sm font-semibold">{payment.type}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-700">{payment.period}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm font-bold">${payment.amount.toLocaleString()}</div></td>
                        <td className="px-4 py-3 text-center"><div className="text-sm">{new Date(payment.dueDate).toLocaleDateString()}</div></td>
                        <td className="px-4 py-3 text-center">{payment.paidDate ? <div className="text-sm">{new Date(payment.paidDate).toLocaleDateString()}</div> : <span className="text-gray-500">-</span>}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(payment.status)}</td>
                        <td className="px-4 py-3">{payment.confirmationNumber ? <div className="text-xs text-gray-600 font-mono">{payment.confirmationNumber}</div> : <span className="text-gray-500">-</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg"><Info className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Tax Information Dashboard</h3>
                <p className="text-blue-700 text-sm mb-2">Centralized hub for tax compliance, filing obligations, and payment tracking.</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Federal Taxes:</strong> Corporate income tax ({taxSettings?.federalTaxRate || 21}%), quarterly estimates, payroll taxes</li>
                  <li>• <strong>State:</strong> Corporate income tax ({taxSettings?.stateTaxRate || 5.5}%), sales & use tax, annual report</li>
                  <li>• <strong>Safe Harbor:</strong> 100% of prior year tax (110% if AGI exceeds $150K) to avoid penalties</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSettingsModal && (
        <div className="qb-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="qb-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="qb-modal-header">
              <h2 className="qb-modal-title">Tax Settings</h2>
              <button className="qb-modal-close" onClick={() => setShowSettingsModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="qb-modal-body space-y-4 max-h-96 overflow-y-auto">
              <div className="qb-form-group">
                <label className="qb-label">EIN (Federal Tax ID)</label>
                <Input value={editingSettings.ein || ''} onChange={(e) => setEditingSettings({ ...editingSettings, ein: e.target.value })} placeholder="XX-XXXXXXX" />
              </div>
              <div className="qb-form-group">
                <label className="qb-label">Filing Status</label>
                <select className="qb-select" value={editingSettings.filingStatus || ''} onChange={(e) => setEditingSettings({ ...editingSettings, filingStatus: e.target.value })}>
                  <option value="Corporation (C-Corp)">Corporation (C-Corp)</option><option value="S Corporation">S Corporation</option><option value="LLC">LLC</option><option value="Partnership">Partnership</option>
                </select>
              </div>
              <div className="qb-form-group">
                <label className="qb-label">Accounting Method</label>
                <select className="qb-select" value={editingSettings.accountingMethod || ''} onChange={(e) => setEditingSettings({ ...editingSettings, accountingMethod: e.target.value })}>
                  <option value="Accrual">Accrual</option><option value="Cash">Cash</option>
                </select>
              </div>
              <div className="qb-form-group">
                <label className="qb-label">Fiscal Year End</label>
                <Input value={editingSettings.fiscalYearEnd || ''} onChange={(e) => setEditingSettings({ ...editingSettings, fiscalYearEnd: e.target.value })} />
              </div>
              <div className="qb-form-group">
                <label className="qb-label">State</label>
                <Input value={editingSettings.state || ''} onChange={(e) => setEditingSettings({ ...editingSettings, state: e.target.value })} />
              </div>
              <div className="qb-form-group">
                <label className="qb-label">Industry</label>
                <Input value={editingSettings.industry || ''} onChange={(e) => setEditingSettings({ ...editingSettings, industry: e.target.value })} />
              </div>
              <div className="qb-form-group">
                <label className="qb-label">NAICS Code</label>
                <Input value={editingSettings.naicsCode || ''} onChange={(e) => setEditingSettings({ ...editingSettings, naicsCode: e.target.value })} />
              </div>
            </div>
            <div className="qb-modal-footer">
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSaveSettings} disabled={saving}>{saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}</Button>
            </div>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

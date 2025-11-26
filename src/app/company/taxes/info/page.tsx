'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Users,
  Receipt,
  Shield,
  Info,
  ArrowRight,
  AlertTriangle
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

export default function TaxInfoPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const taxObligations: TaxObligation[] = [
    {
      id: 'OBL-001',
      type: 'Federal Income Tax',
      description: 'Corporate tax return (Form 1120)',
      frequency: 'Annual',
      nextDueDate: '2026-03-15',
      status: 'upcoming',
      filingMethod: 'Electronic (IRS e-file)'
    },
    {
      id: 'OBL-002',
      type: 'Quarterly Estimated Tax',
      description: 'Q4 2025 estimated tax payment',
      frequency: 'Quarterly',
      nextDueDate: '2026-01-15',
      status: 'upcoming',
      amount: 285000,
      filingMethod: 'EFTPS'
    },
    {
      id: 'OBL-003',
      type: 'Florida Corporate Income Tax',
      description: 'State corporate income tax return',
      frequency: 'Annual',
      nextDueDate: '2026-05-01',
      status: 'upcoming',
      filingMethod: 'Florida Department of Revenue'
    },
    {
      id: 'OBL-004',
      type: 'Sales & Use Tax',
      description: 'Florida sales tax return',
      frequency: 'Monthly',
      nextDueDate: '2025-12-20',
      status: 'upcoming',
      amount: 42500,
      filingMethod: 'Electronic'
    },
    {
      id: 'OBL-005',
      type: 'Payroll Tax (Form 941)',
      description: 'Federal quarterly payroll tax',
      frequency: 'Quarterly',
      nextDueDate: '2026-01-31',
      status: 'upcoming',
      amount: 156000,
      filingMethod: 'IRS e-file'
    },
    {
      id: 'OBL-006',
      type: 'Annual Report',
      description: 'Florida Division of Corporations annual report',
      frequency: 'Annual',
      nextDueDate: '2026-05-01',
      status: 'upcoming',
      amount: 150,
      filingMethod: 'Sunbiz.org'
    },
    {
      id: 'OBL-007',
      type: 'Form W-2',
      description: 'Employee wage statements',
      frequency: 'Annual',
      nextDueDate: '2026-01-31',
      status: 'upcoming',
      filingMethod: 'SSA Business Services Online'
    },
    {
      id: 'OBL-008',
      type: 'Form 1099-NEC',
      description: 'Nonemployee compensation reporting',
      frequency: 'Annual',
      nextDueDate: '2026-01-31',
      status: 'upcoming',
      filingMethod: 'IRS FIRE System'
    }
  ]

  const taxPayments: TaxPayment[] = [
    {
      id: 'PAY-001',
      type: 'Quarterly Estimated Tax - Q1',
      period: 'Q1 2025',
      amount: 275000,
      dueDate: '2025-04-15',
      paidDate: '2025-04-12',
      status: 'paid',
      confirmationNumber: 'EFTPS-2025041200123'
    },
    {
      id: 'PAY-002',
      type: 'Quarterly Estimated Tax - Q2',
      period: 'Q2 2025',
      amount: 280000,
      dueDate: '2025-06-15',
      paidDate: '2025-06-14',
      status: 'paid',
      confirmationNumber: 'EFTPS-2025061400456'
    },
    {
      id: 'PAY-003',
      type: 'Quarterly Estimated Tax - Q3',
      period: 'Q3 2025',
      amount: 282000,
      dueDate: '2025-09-15',
      paidDate: '2025-09-13',
      status: 'paid',
      confirmationNumber: 'EFTPS-2025091300789'
    },
    {
      id: 'PAY-004',
      type: 'Florida Corporate Income Tax',
      period: '2024',
      amount: 186500,
      dueDate: '2025-05-01',
      paidDate: '2025-04-28',
      status: 'paid',
      confirmationNumber: 'FDOR-2025042801234'
    },
    {
      id: 'PAY-005',
      type: 'Sales & Use Tax',
      period: 'October 2025',
      amount: 41200,
      dueDate: '2025-11-20',
      paidDate: '2025-11-18',
      status: 'paid',
      confirmationNumber: 'FLSALES-202511180567'
    },
    {
      id: 'PAY-006',
      type: 'Payroll Tax (Form 941)',
      period: 'Q3 2025',
      amount: 152000,
      dueDate: '2025-10-31',
      paidDate: '2025-10-29',
      status: 'paid',
      confirmationNumber: 'IRS941-2025102900234'
    },
    {
      id: 'PAY-007',
      type: 'Quarterly Estimated Tax - Q4',
      period: 'Q4 2025',
      amount: 285000,
      dueDate: '2026-01-15',
      status: 'pending'
    },
    {
      id: 'PAY-008',
      type: 'Sales & Use Tax',
      period: 'November 2025',
      amount: 42500,
      dueDate: '2025-12-20',
      status: 'pending'
    }
  ]

  const companyInfo = {
    legalName: 'QuickBooks Clone LLC',
    ein: '65-1234567',
    businessType: 'Limited Liability Company (LLC)',
    taxClassification: 'C Corporation',
    fiscalYearEnd: 'December 31',
    incorporationState: 'Florida',
    businessAddress: '123 Business Blvd, Miami, FL 33101',
    taxFilingStatus: 'Active',
    accountingMethod: 'Accrual',
    naicsCode: '541512 - Computer Systems Design Services'
  }

  const complianceStatus = {
    federalTaxID: true,
    floridaTaxID: true,
    salesTaxPermit: true,
    employerAccount: true,
    annualReport2025: false,
    insuranceCoverage: true
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Information Center</h1>
            <p className="text-gray-600 mt-1">
              Compliance dashboard and filing status
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              View Tax Calendar
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(stats.totalPaid / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-green-700">Taxes Paid {selectedYear}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {stats.pending}
              </div>
              <div className="text-sm text-yellow-700">Pending Payments</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                {stats.overdue}
              </div>
              <div className="text-sm text-red-700">Overdue Items</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-900">
                {stats.nextPayment ? new Date(stats.nextPayment.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div className="text-sm text-blue-700">Next Due Date</div>
            </CardContent>
          </Card>
        </div>

        {/* Company Tax Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" /> Company Tax Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Legal Name:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.legalName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">EIN (Federal Tax ID):</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.ein}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Business Type:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.businessType}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Tax Classification:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.taxClassification}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Fiscal Year End:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.fiscalYearEnd}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">State of Incorporation:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.incorporationState}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Accounting Method:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.accountingMethod}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">NAICS Code:</span>
                  <span className="text-sm font-semibold text-gray-900">{companyInfo.naicsCode}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Federal Tax ID (EIN)</span>
                  </div>
                  {complianceStatus.federalTaxID ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Florida Tax Registration</span>
                  </div>
                  {complianceStatus.floridaTaxID ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Sales Tax Permit</span>
                  </div>
                  {complianceStatus.salesTaxPermit ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Employer Account (Payroll)</span>
                  </div>
                  {complianceStatus.employerAccount ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">2025 Annual Report Filed</span>
                  </div>
                  {complianceStatus.annualReport2025 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Workers' Comp Insurance</span>
                  </div>
                  {complianceStatus.insuranceCoverage ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tax Obligations */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tax Obligations</CardTitle>
          </CardHeader>
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
                  {taxObligations.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()).map((obligation) => {
                    const dueDate = new Date(obligation.nextDueDate)
                    const today = new Date()
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isUrgent = daysUntil >= 0 && daysUntil <= 30

                    return (
                      <tr key={obligation.id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{obligation.type}</div>
                          <div className="text-xs text-gray-500">{obligation.filingMethod}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">{obligation.description}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-xs">{obligation.frequency}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {obligation.amount ? (
                            <div className="text-sm font-semibold text-gray-900">
                              ${obligation.amount.toLocaleString('en-US')}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`text-sm ${isUrgent ? 'font-bold text-orange-600' : 'text-gray-900'}`}>
                            {dueDate.toLocaleDateString('en-US')}
                          </div>
                          {isUrgent && (
                            <div className="text-xs text-orange-600">
                              {daysUntil} days
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(obligation.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="outline">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tax Payment History</CardTitle>
              <select 
                className="px-3 py-2 border rounded-lg text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
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
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">{payment.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{payment.period}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-gray-900">
                          ${payment.amount.toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.dueDate).toLocaleDateString('en-US')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {payment.paidDate ? (
                          <div className="text-sm text-gray-900">
                            {new Date(payment.paidDate).toLocaleDateString('en-US')}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.confirmationNumber ? (
                          <div className="text-xs text-gray-600 font-mono">
                            {payment.confirmationNumber}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
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
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Tax Information Dashboard</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Centralized hub for tax compliance, filing obligations, and payment tracking for Florida businesses.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Federal Taxes:</strong> Corporate income tax (21%), quarterly estimates, payroll taxes (Form 941)</li>
                  <li>• <strong>Florida State:</strong> Corporate income tax (5.5%), sales & use tax, annual report, reemployment tax</li>
                  <li>• <strong>Filing Deadlines:</strong> March 15 (1120), quarterly estimates (15th of 4th, 6th, 9th, 12th month)</li>
                  <li>• <strong>Payment Methods:</strong> EFTPS (federal), Florida Department of Revenue portal, electronic filing</li>
                  <li>• <strong>Compliance Tracking:</strong> Monitor registration status, permits, licenses, insurance requirements</li>
                  <li>• <strong>Safe Harbor:</strong> 100% of prior year tax (110% if AGI exceeds $150K) to avoid penalties</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

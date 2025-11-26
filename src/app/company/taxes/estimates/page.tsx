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
  Calculator,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Shield,
  TrendingDown,
  AlertTriangle,
  FileText
} from 'lucide-react'

interface QuarterlyEstimate {
  quarter: string
  dueDate: string
  estimatedIncome: number
  estimatedTax: number
  previousPayments: number
  amountDue: number
  status: 'paid' | 'pending' | 'overdue'
  paidDate?: string
  paidAmount?: number
  confirmationNumber?: string
}

export default function TaxEstimatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [estimatedAnnualIncome, setEstimatedAnnualIncome] = useState(3800000)
  const [priorYearTax, setPriorYearTax] = useState(1095000)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  // Tax calculation constants
  const federalCorporateRate = 0.21 // 21% federal corporate tax rate
  const floridaCorporateRate = 0.055 // 5.5% Florida corporate income tax
  
  // Calculate estimated tax liability
  const estimatedFederalTax = estimatedAnnualIncome * federalCorporateRate
  const estimatedFloridaTax = estimatedAnnualIncome * floridaCorporateRate
  const totalEstimatedTax = estimatedFederalTax + estimatedFloridaTax
  
  // Safe harbor calculation (100% of prior year, 110% if income > $150K)
  const safeHarborAmount = priorYearTax >= 150000 ? priorYearTax * 1.10 : priorYearTax
  const recommendedQuarterlyPayment = Math.max(totalEstimatedTax / 4, safeHarborAmount / 4)

  const quarterlyEstimates: QuarterlyEstimate[] = [
    {
      quarter: 'Q1 2025',
      dueDate: '2025-04-15',
      estimatedIncome: 950000,
      estimatedTax: 256250,
      previousPayments: 0,
      amountDue: 275000,
      status: 'paid',
      paidDate: '2025-04-12',
      paidAmount: 275000,
      confirmationNumber: 'EFTPS-2025041200123'
    },
    {
      quarter: 'Q2 2025',
      dueDate: '2025-06-15',
      estimatedIncome: 950000,
      estimatedTax: 256250,
      previousPayments: 275000,
      amountDue: 256250,
      status: 'paid',
      paidDate: '2025-06-14',
      paidAmount: 280000,
      confirmationNumber: 'EFTPS-2025061400456'
    },
    {
      quarter: 'Q3 2025',
      dueDate: '2025-09-15',
      estimatedIncome: 950000,
      estimatedTax: 256250,
      previousPayments: 555000,
      amountDue: 256250,
      status: 'paid',
      paidDate: '2025-09-13',
      paidAmount: 282000,
      confirmationNumber: 'EFTPS-2025091300789'
    },
    {
      quarter: 'Q4 2025',
      dueDate: '2026-01-15',
      estimatedIncome: 950000,
      estimatedTax: 256250,
      previousPayments: 837000,
      amountDue: 285000,
      status: 'pending'
    }
  ]

  const stats = {
    totalPaid: quarterlyEstimates.filter(q => q.status === 'paid').reduce((sum, q) => sum + (q.paidAmount || 0), 0),
    totalDue: quarterlyEstimates.filter(q => q.status === 'pending').reduce((sum, q) => sum + q.amountDue, 0),
    nextPayment: quarterlyEstimates.find(q => q.status === 'pending'),
    compliance: quarterlyEstimates.filter(q => q.status === 'paid').length
  }

  // Penalty calculation
  const calculatePenalty = (quarterlyEstimate: QuarterlyEstimate) => {
    if (quarterlyEstimate.status !== 'overdue') return 0
    const daysLate = Math.floor((new Date().getTime() - new Date(quarterlyEstimate.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    const penaltyRate = 0.05 // 5% annual rate (simplified)
    return quarterlyEstimate.amountDue * (penaltyRate / 365) * daysLate
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</Badge>
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
            <h1 className="text-2xl font-bold text-gray-900">Estimated Tax Calculator</h1>
            <p className="text-gray-600 mt-1">
              Quarterly estimated tax payments and safe harbor calculations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📥 Exportando calendario de pagos estimados a PDF')}>
              <Download className="w-4 h-4 mr-2" />
              Export Schedule
            </Button>
            <Button onClick={() => alert('🧮 Recalculando pagos estimados...\n\nActualizando cálculos con datos más recientes')}>
              <Calculator className="w-4 h-4 mr-2" />
              Recalculate
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(totalEstimatedTax / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-blue-700">Est. Total Tax {selectedYear}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(stats.totalPaid / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-green-700">Paid Year-to-Date</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                ${(stats.totalDue / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-yellow-700">Remaining Due</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-purple-900">
                {stats.nextPayment ? new Date(stats.nextPayment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div className="text-sm text-purple-700">Next Payment Due</div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Calculation Input */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" /> Tax Estimate Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Estimated Annual Taxable Income
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={estimatedAnnualIncome}
                      onChange={(e) => setEstimatedAnnualIncome(Number(e.target.value))}
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Projected taxable income for {selectedYear}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Prior Year Tax Liability
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={priorYearTax}
                      onChange={(e) => setPriorYearTax(Number(e.target.value))}
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total tax liability from 2024 return
                  </p>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Federal Tax (21%):</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${estimatedFederalTax.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Florida Tax (5.5%):</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${estimatedFloridaTax.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-bold text-gray-900">Total Estimated Tax:</span>
                    <span className="text-sm font-bold text-blue-600">
                      ${totalEstimatedTax.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-gray-900">Quarterly Payment:</span>
                    <span className="text-sm font-bold text-green-600">
                      ${recommendedQuarterlyPayment.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> Safe Harbor Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 text-sm mb-1">Current Year Method</h4>
                      <p className="text-xs text-green-700 mb-2">
                        Pay 100% of estimated current year tax liability
                      </p>
                      <div className="text-sm font-bold text-green-900">
                        ${(totalEstimatedTax / 4).toLocaleString('en-US')} per quarter
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm mb-1">Prior Year Safe Harbor</h4>
                      <p className="text-xs text-blue-700 mb-2">
                        Pay {priorYearTax >= 150000 ? '110%' : '100%'} of prior year tax
                      </p>
                      <div className="text-sm font-bold text-blue-900">
                        ${(safeHarborAmount / 4).toLocaleString('en-US')} per quarter
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">Recommended Payment</h4>
                      <p className="text-xs text-purple-700 mb-2">
                        Higher of current year estimate or safe harbor
                      </p>
                      <div className="text-lg font-bold text-purple-900">
                        ${recommendedQuarterlyPayment.toLocaleString('en-US')} per quarter
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 text-sm mb-1">Underpayment Penalty</h4>
                      <p className="text-xs text-yellow-700">
                        Avoid penalties by meeting safe harbor requirements. IRS charges interest on underpayments (currently ~8% annually).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Payment Schedule - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Quarter</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Est. Income</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Est. Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Prev. Payments</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount Due</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quarterlyEstimates.map((estimate) => {
                    const dueDate = new Date(estimate.dueDate)
                    const today = new Date()
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isUrgent = daysUntil >= 0 && daysUntil <= 30 && estimate.status === 'pending'

                    return (
                      <tr key={estimate.quarter} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{estimate.quarter}</div>
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
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-900">
                            ${estimate.estimatedIncome.toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            ${estimate.estimatedTax.toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-700">
                            ${estimate.previousPayments.toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-bold text-blue-600">
                            ${estimate.amountDue.toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(estimate.status)}
                        </td>
                        <td className="px-4 py-3">
                          {estimate.confirmationNumber ? (
                            <div>
                              <div className="text-xs text-gray-600 font-mono mb-1">
                                {estimate.confirmationNumber}
                              </div>
                              {estimate.paidDate && (
                                <div className="text-xs text-gray-500">
                                  Paid: {new Date(estimate.paidDate).toLocaleDateString('en-US')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button size="sm" variant="outline">
                              Make Payment
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">
                      Annual Totals:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ${quarterlyEstimates.reduce((sum, e) => sum + e.estimatedTax, 0).toLocaleString('en-US')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ${stats.totalPaid.toLocaleString('en-US')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-blue-600">
                        ${stats.totalDue.toLocaleString('en-US')}
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Deadlines Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> 2025 Estimated Tax Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-semibold text-blue-900 mb-1">Q1 2025</div>
                <div className="text-lg font-bold text-blue-600">April 15, 2025</div>
                <div className="text-xs text-blue-700 mt-1">Jan 1 - Mar 31</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-semibold text-green-900 mb-1">Q2 2025</div>
                <div className="text-lg font-bold text-green-600">June 15, 2025</div>
                <div className="text-xs text-green-700 mt-1">Apr 1 - May 31</div>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm font-semibold text-purple-900 mb-1">Q3 2025</div>
                <div className="text-lg font-bold text-purple-600">Sept 15, 2025</div>
                <div className="text-xs text-purple-700 mt-1">Jun 1 - Aug 31</div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-sm font-semibold text-orange-900 mb-1">Q4 2025</div>
                <div className="text-lg font-bold text-orange-600">Jan 15, 2026</div>
                <div className="text-xs text-orange-700 mt-1">Sep 1 - Dec 31</div>
              </div>
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
                <h3 className="font-semibold text-blue-900 mb-2">Estimated Tax Requirements</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Corporations must make quarterly estimated tax payments if they expect to owe $500 or more when filing their return.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Who Must Pay:</strong> Corporations expecting $500+ tax liability for the year</li>
                  <li>• <strong>Payment Method:</strong> EFTPS (Electronic Federal Tax Payment System) for federal, state portal for Florida</li>
                  <li>• <strong>Safe Harbor:</strong> Pay 100% of prior year tax (110% if over $1M income) to avoid penalties</li>
                  <li>• <strong>Underpayment Penalty:</strong> IRS charges interest (currently ~8%) on insufficient payments</li>
                  <li>• <strong>Annualization:</strong> Option to annualize income for uneven cash flow throughout year</li>
                  <li>• <strong>Form 1120-W:</strong> Worksheet for calculating estimated tax liability</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

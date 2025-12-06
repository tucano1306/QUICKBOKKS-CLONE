'use client'

import { useEffect, useState, useCallback } from 'react'
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
  AlertTriangle,
  RefreshCw
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

interface TaxEstimate {
  year: string
  totalRevenue: number
  totalExpenses: number
  totalPayroll: number
  netIncome: number
  federalTax: number
  stateTax: number
  selfEmploymentTax: number
  totalTax: number
  quarterlyPayment: number
  effectiveRate: number
}

export default function TaxEstimatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [quarterlyEstimates, setQuarterlyEstimates] = useState<QuarterlyEstimate[]>([])
  const [taxEstimate, setTaxEstimate] = useState<TaxEstimate | null>(null)
  const [estimatedAnnualIncome, setEstimatedAnnualIncome] = useState(0)
  const [priorYearTax, setPriorYearTax] = useState(0)

  const federalCorporateRate = 0.21
  const floridaCorporateRate = 0.055

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchEstimates = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/taxes?companyId=${activeCompany.id}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setQuarterlyEstimates(data.quarterlyEstimates || [])
        setEstimatedAnnualIncome(data.summary?.netIncome || 0)
        
        if (data.summary) {
          const { netIncome, totalRevenue, totalExpenses, totalPayroll, estimatedFederalTax, estimatedStateTax, totalEstimatedTax } = data.summary
          setTaxEstimate({
            year: selectedYear,
            totalRevenue,
            totalExpenses,
            totalPayroll,
            netIncome,
            federalTax: estimatedFederalTax,
            stateTax: estimatedStateTax,
            selfEmploymentTax: 0,
            totalTax: totalEstimatedTax,
            quarterlyPayment: totalEstimatedTax / 4,
            effectiveRate: netIncome > 0 ? (totalEstimatedTax / netIncome * 100) : 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching estimates:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    fetchEstimates()
  }, [fetchEstimates])

  const handleRecalculate = async () => {
    if (!activeCompany?.id) return
    
    setCalculating(true)
    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate-estimate',
          companyId: activeCompany.id,
          year: selectedYear
        })
      })
      
      const data = await response.json()
      if (data.success && data.estimate) {
        setTaxEstimate(data.estimate)
        setEstimatedAnnualIncome(data.estimate.netIncome)
      }
    } catch (error) {
      console.error('Error calculating estimates:', error)
    } finally {
      setCalculating(false)
    }
  }

  const totalEstimatedTax = estimatedAnnualIncome * (federalCorporateRate + floridaCorporateRate)
  const safeHarborAmount = priorYearTax >= 150000 ? priorYearTax * 1.10 : priorYearTax
  const recommendedQuarterlyPayment = Math.max(totalEstimatedTax / 4, safeHarborAmount / 4)

  const stats = {
    totalPaid: quarterlyEstimates.filter(q => q.status === 'paid').reduce((sum, q) => sum + (q.paidAmount || q.amountDue), 0),
    totalDue: quarterlyEstimates.filter(q => q.status === 'pending').reduce((sum, q) => sum + q.amountDue, 0),
    nextPayment: quarterlyEstimates.find(q => q.status === 'pending'),
    compliance: quarterlyEstimates.filter(q => q.status === 'paid').length
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estimated Tax Calculator</h1>
            <p className="text-gray-600 mt-1">Quarterly estimated tax payments and safe harbor calculations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/company/taxes/export')}>
              <Download className="w-4 h-4 mr-2" />Export Schedule
            </Button>
            <Button onClick={handleRecalculate} disabled={calculating}>
              {calculating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
              Recalculate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-900">${((taxEstimate?.totalTax || 0) / 1000).toFixed(0)}K</div>
              <div className="text-sm text-blue-700">Est. Total Tax {selectedYear}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">${(stats.totalPaid / 1000).toFixed(0)}K</div>
              <div className="text-sm text-green-700">Paid Year-to-Date</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-2xl font-bold text-yellow-900">${(stats.totalDue / 1000).toFixed(0)}K</div>
              <div className="text-sm text-yellow-700">Remaining Due</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-xl font-bold text-purple-900">
                {stats.nextPayment ? new Date(stats.nextPayment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div className="text-sm text-purple-700">Next Payment Due</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Tax Estimate Calculator</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Estimated Annual Taxable Income</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="text" value={estimatedAnnualIncome} onChange={(e) => setEstimatedAnnualIncome(Number(e.target.value.replace(/,/g, '')))} className="amount-input flex-1 px-4 py-2 border rounded-lg" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Projected taxable income for {selectedYear}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Prior Year Tax Liability</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="text" value={priorYearTax} onChange={(e) => setPriorYearTax(Number(e.target.value.replace(/,/g, '')))} className="amount-input flex-1 px-4 py-2 border rounded-lg" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total tax liability from prior year return</p>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Federal Tax ({federalCorporateRate * 100}%):</span>
                    <span className="text-sm font-semibold text-gray-900">${(estimatedAnnualIncome * federalCorporateRate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">State Tax ({floridaCorporateRate * 100}%):</span>
                    <span className="text-sm font-semibold text-gray-900">${(estimatedAnnualIncome * floridaCorporateRate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-bold text-gray-900">Total Estimated Tax:</span>
                    <span className="text-sm font-bold text-blue-600">${totalEstimatedTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-gray-900">Quarterly Payment:</span>
                    <span className="text-sm font-bold text-green-600">${recommendedQuarterlyPayment.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Safe Harbor Rules</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 text-sm mb-1">Current Year Method</h4>
                      <p className="text-xs text-green-700 mb-2">Pay 100% of estimated current year tax liability</p>
                      <div className="text-sm font-bold text-green-900">${(totalEstimatedTax / 4).toLocaleString()} per quarter</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm mb-1">Prior Year Safe Harbor</h4>
                      <p className="text-xs text-blue-700 mb-2">Pay {priorYearTax >= 150000 ? '110%' : '100%'} of prior year tax</p>
                      <div className="text-sm font-bold text-blue-900">${(safeHarborAmount / 4).toLocaleString()} per quarter</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">Recommended Payment</h4>
                      <p className="text-xs text-purple-700 mb-2">Higher of current year estimate or safe harbor</p>
                      <div className="text-lg font-bold text-purple-900">${recommendedQuarterlyPayment.toLocaleString()} per quarter</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 text-sm mb-1">Underpayment Penalty</h4>
                      <p className="text-xs text-yellow-700">Avoid penalties by meeting safe harbor requirements. IRS charges interest (~8% annually).</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Quarterly Payment Schedule - {selectedYear}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Quarter</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Est. Income</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Est. Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount Due</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quarterlyEstimates.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No estimates found</td></tr>
                  ) : (
                    quarterlyEstimates.map((estimate) => {
                      const dueDate = new Date(estimate.dueDate)
                      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      const isUrgent = daysUntil >= 0 && daysUntil <= 30 && estimate.status === 'pending'
                      return (
                        <tr key={estimate.quarter} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3"><div className="text-sm font-semibold text-gray-900">{estimate.quarter}</div></td>
                          <td className="px-4 py-3 text-center">
                            <div className={`text-sm ${isUrgent ? 'font-bold text-orange-600' : 'text-gray-900'}`}>{dueDate.toLocaleDateString()}</div>
                            {isUrgent && <div className="text-xs text-orange-600">{daysUntil} days</div>}
                          </td>
                          <td className="px-4 py-3 text-right"><div className="text-sm text-gray-900">${estimate.estimatedIncome.toLocaleString()}</div></td>
                          <td className="px-4 py-3 text-right"><div className="text-sm font-semibold text-gray-900">${estimate.estimatedTax.toLocaleString()}</div></td>
                          <td className="px-4 py-3 text-right"><div className="text-sm font-bold text-blue-600">${estimate.amountDue.toLocaleString()}</div></td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(estimate.status)}</td>
                          <td className="px-4 py-3">
                            {estimate.status === 'pending' ? (
                              <Button size="sm" variant="outline">Make Payment</Button>
                            ) : (
                              <div className="text-xs text-gray-500">{estimate.paidDate && `Paid: ${new Date(estimate.paidDate).toLocaleDateString()}`}</div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">Annual Totals:</td>
                    <td className="px-4 py-3 text-right"><div className="text-sm font-bold text-gray-900">${quarterlyEstimates.reduce((sum, e) => sum + e.estimatedTax, 0).toLocaleString()}</div></td>
                    <td className="px-4 py-3 text-right"><div className="text-sm font-bold text-blue-600">${(stats.totalPaid + stats.totalDue).toLocaleString()}</div></td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> {selectedYear} Estimated Tax Deadlines</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><div className="text-sm font-semibold text-blue-900 mb-1">Q1 {selectedYear}</div><div className="text-lg font-bold text-blue-600">April 15</div><div className="text-xs text-blue-700 mt-1">Jan 1 - Mar 31</div></div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg"><div className="text-sm font-semibold text-green-900 mb-1">Q2 {selectedYear}</div><div className="text-lg font-bold text-green-600">June 15</div><div className="text-xs text-green-700 mt-1">Apr 1 - May 31</div></div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg"><div className="text-sm font-semibold text-purple-900 mb-1">Q3 {selectedYear}</div><div className="text-lg font-bold text-purple-600">Sept 15</div><div className="text-xs text-purple-700 mt-1">Jun 1 - Aug 31</div></div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg"><div className="text-sm font-semibold text-orange-900 mb-1">Q4 {selectedYear}</div><div className="text-lg font-bold text-orange-600">Jan 15, {parseInt(selectedYear) + 1}</div><div className="text-xs text-orange-700 mt-1">Sep 1 - Dec 31</div></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg"><Info className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Estimated Tax Requirements</h3>
                <p className="text-blue-700 text-sm mb-2">Corporations must make quarterly estimated tax payments if they expect to owe $500 or more.</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Who Must Pay:</strong> Corporations expecting $500+ tax liability for the year</li>
                  <li>• <strong>Payment Method:</strong> EFTPS (federal), state portal for state taxes</li>
                  <li>• <strong>Safe Harbor:</strong> Pay 100% of prior year tax (110% if over $1M income) to avoid penalties</li>
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

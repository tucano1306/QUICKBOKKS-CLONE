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
  DollarSign,
  TrendingUp,
  Receipt,
  Car,
  Home,
  Users,
  Briefcase,
  Heart,
  GraduationCap,
  PiggyBank,
  Plus,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingDown
} from 'lucide-react'

interface TaxDeduction {
  id: string
  category: string
  subcategory: string
  description: string
  amount: number
  date: string
  status: 'documented' | 'needs-documentation' | 'under-review'
  documentCount: number
  limitPercentage?: number
  limitAmount?: number
  notes?: string
}

export default function TaxDeductionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const deductions: TaxDeduction[] = [
    // Operating Expenses
    {
      id: 'DED-001',
      category: 'Operating Expenses',
      subcategory: 'Salaries & Wages',
      description: 'Employee compensation and benefits',
      amount: 1850000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    {
      id: 'DED-002',
      category: 'Operating Expenses',
      subcategory: 'Rent',
      description: 'Office space rental - 123 Business Blvd',
      amount: 120000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12,
      notes: 'Monthly lease $10,000'
    },
    {
      id: 'DED-003',
      category: 'Operating Expenses',
      subcategory: 'Utilities',
      description: 'Electricity, water, internet, phone',
      amount: 36000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    {
      id: 'DED-004',
      category: 'Operating Expenses',
      subcategory: 'Office Supplies',
      description: 'Stationery, equipment, software licenses',
      amount: 48500,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 45
    },
    // Professional Services
    {
      id: 'DED-005',
      category: 'Professional Services',
      subcategory: 'Legal Fees',
      description: 'Contract review, compliance consulting',
      amount: 35000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 8
    },
    {
      id: 'DED-006',
      category: 'Professional Services',
      subcategory: 'Accounting & Tax Prep',
      description: 'CPA services, bookkeeping, tax filing',
      amount: 28000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 4
    },
    {
      id: 'DED-007',
      category: 'Professional Services',
      subcategory: 'Consulting',
      description: 'Business strategy and IT consulting',
      amount: 52000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 6
    },
    // Vehicle & Travel
    {
      id: 'DED-008',
      category: 'Vehicle & Travel',
      subcategory: 'Vehicle Expenses',
      description: 'Business vehicle operation and maintenance',
      amount: 18500,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 24,
      notes: 'Standard mileage rate: $0.67/mile'
    },
    {
      id: 'DED-009',
      category: 'Vehicle & Travel',
      subcategory: 'Business Travel',
      description: 'Airfare, hotels, meals (50% deductible)',
      amount: 42000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 18,
      limitPercentage: 50
    },
    // Insurance
    {
      id: 'DED-010',
      category: 'Insurance',
      subcategory: 'Business Insurance',
      description: 'General liability, property, E&O insurance',
      amount: 24000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 3
    },
    {
      id: 'DED-011',
      category: 'Insurance',
      subcategory: 'Health Insurance',
      description: 'Employee health insurance premiums',
      amount: 156000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    // Marketing & Advertising
    {
      id: 'DED-012',
      category: 'Marketing & Advertising',
      subcategory: 'Digital Marketing',
      description: 'Google Ads, social media, SEO services',
      amount: 68000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    {
      id: 'DED-013',
      category: 'Marketing & Advertising',
      subcategory: 'Website & Software',
      description: 'Website hosting, CRM, marketing tools',
      amount: 32000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    // Depreciation
    {
      id: 'DED-014',
      category: 'Depreciation',
      subcategory: 'Equipment',
      description: 'Computer equipment, furniture, machinery',
      amount: 85000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 15,
      notes: 'Section 179 & bonus depreciation'
    },
    {
      id: 'DED-015',
      category: 'Depreciation',
      subcategory: 'Software',
      description: 'Business software and SaaS subscriptions',
      amount: 45000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 20
    },
    // Interest & Fees
    {
      id: 'DED-016',
      category: 'Interest & Fees',
      subcategory: 'Business Loan Interest',
      description: 'Interest on business loans and lines of credit',
      amount: 22000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    {
      id: 'DED-017',
      category: 'Interest & Fees',
      subcategory: 'Bank Fees',
      description: 'Business account fees, transaction fees',
      amount: 4200,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 12
    },
    // Education & Training
    {
      id: 'DED-018',
      category: 'Education & Training',
      subcategory: 'Employee Training',
      description: 'Professional development, certifications',
      amount: 38000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 24
    },
    {
      id: 'DED-019',
      category: 'Education & Training',
      subcategory: 'Conference & Seminars',
      description: 'Industry conferences, trade shows',
      amount: 18500,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 8
    },
    // Charitable Contributions
    {
      id: 'DED-020',
      category: 'Charitable Contributions',
      subcategory: 'Donations',
      description: 'Qualified charitable organizations',
      amount: 25000,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 5,
      limitPercentage: 10,
      notes: 'Limited to 10% of taxable income'
    },
    // Home Office (if applicable)
    {
      id: 'DED-021',
      category: 'Home Office',
      subcategory: 'Home Office Deduction',
      description: 'Portion of home expenses for business use',
      amount: 12000,
      date: '2025-12-31',
      status: 'needs-documentation',
      documentCount: 0,
      notes: 'Requires dedicated workspace documentation'
    },
    // Retirement Contributions
    {
      id: 'DED-022',
      category: 'Retirement',
      subcategory: 'SEP IRA Contributions',
      description: 'Employer contributions to employee SEP IRAs',
      amount: 92500,
      date: '2025-12-31',
      status: 'documented',
      documentCount: 8,
      limitPercentage: 25,
      notes: 'Limited to 25% of compensation'
    }
  ]

  const filteredDeductions = deductions.filter(d => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false
    return true
  })

  const categories = Array.from(new Set(deductions.map(d => d.category)))

  const totalDeductions = filteredDeductions.reduce((sum, d) => sum + d.amount, 0)
  const documentedDeductions = filteredDeductions.filter(d => d.status === 'documented').reduce((sum, d) => sum + d.amount, 0)
  const needsDocumentation = filteredDeductions.filter(d => d.status === 'needs-documentation').length

  const deductionsByCategory = categories.map(category => ({
    category,
    amount: deductions.filter(d => d.category === category).reduce((sum, d) => sum + d.amount, 0),
    count: deductions.filter(d => d.category === category).length
  })).sort((a, b) => b.amount - a.amount)

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'Operating Expenses': Briefcase,
      'Professional Services': Users,
      'Vehicle & Travel': Car,
      'Insurance': Heart,
      'Marketing & Advertising': TrendingUp,
      'Depreciation': TrendingDown,
      'Interest & Fees': DollarSign,
      'Education & Training': GraduationCap,
      'Charitable Contributions': Heart,
      'Home Office': Home,
      'Retirement': PiggyBank
    }
    const Icon = icons[category] || Receipt
    return <Icon className="w-5 h-5" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'documented':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Documented</Badge>
      case 'needs-documentation':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Needs Docs</Badge>
      case 'under-review':
        return <Badge className="bg-yellow-100 text-yellow-700"><FileText className="w-3 h-3 mr-1" /> Under Review</Badge>
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
            <h1 className="text-2xl font-bold text-gray-900">Tax Deductions Tracker</h1>
            <p className="text-gray-600 mt-1">
              Track and optimize business tax deductions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Deduction
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
                ${(totalDeductions / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-blue-700">Total Deductions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${(documentedDeductions / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-green-700">Documented</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                {needsDocumentation}
              </div>
              <div className="text-sm text-red-700">Needs Documentation</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {categories.length}
              </div>
              <div className="text-sm text-purple-700">Categories</div>
            </CardContent>
          </Card>
        </div>

        {/* Deductions by Category Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Deductions by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deductionsByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{item.category}</div>
                        <div className="text-xs text-gray-500">{item.count} items</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ${(item.amount / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-gray-500">
                        {((item.amount / totalDeductions) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deduction Limits & Restrictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 text-sm mb-1">Meals & Entertainment</h4>
                      <p className="text-xs text-yellow-700">Only 50% of meal expenses are deductible. Entertainment expenses are generally not deductible.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm mb-1">Charitable Contributions</h4>
                      <p className="text-xs text-blue-700">Limited to 10% of taxable income for C corporations. Excess can be carried forward 5 years.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 text-sm mb-1">Section 179 Deduction</h4>
                      <p className="text-xs text-green-700">Up to $1,220,000 (2025) for qualified equipment purchases. Phase-out begins at $3.05M.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <PiggyBank className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">Retirement Contributions</h4>
                      <p className="text-xs text-purple-700">SEP IRA: up to 25% of compensation or $69,000 (2025). 401(k): $23,500 employee + $46,000 employer.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Car className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 text-sm mb-1">Vehicle Deductions</h4>
                      <p className="text-xs text-orange-700">Standard mileage: $0.67/mile (2025) or actual expenses. Luxury vehicle limits apply.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Category:
              </label>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex-1"></div>
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Tax Year:
              </label>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Deductions - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Documents</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Limit</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDeductions.map((deduction) => (
                    <tr key={deduction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 rounded">
                            {getCategoryIcon(deduction.category)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{deduction.category}</div>
                            <div className="text-xs text-gray-500">{deduction.subcategory}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{deduction.description}</div>
                        {deduction.notes && (
                          <div className="text-xs text-gray-500 mt-1">{deduction.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-gray-900">
                          ${deduction.amount.toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-900">{deduction.documentCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(deduction.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deduction.limitPercentage ? (
                          <Badge variant="outline" className="text-xs">
                            {deduction.limitPercentage}% limit
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-8 px-2">
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-gray-900">
                      Total Deductions:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-lg font-bold text-green-700">
                        ${totalDeductions.toLocaleString('en-US')}
                      </div>
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Tax Deductions Optimization</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Comprehensive tracking of business tax deductions to minimize taxable income and maximize savings.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Documentation:</strong> Keep receipts, invoices, contracts, and proof of payment for all deductions</li>
                  <li>• <strong>Ordinary & Necessary:</strong> Deductions must be common and helpful for your business</li>
                  <li>• <strong>Business Purpose:</strong> Maintain records showing business purpose and benefit</li>
                  <li>• <strong>Depreciation:</strong> Section 179 for immediate expensing, bonus depreciation for large purchases</li>
                  <li>• <strong>Home Office:</strong> Exclusive and regular use required, proportionate to business use</li>
                  <li>• <strong>Record Retention:</strong> Keep records for 3-7 years depending on circumstance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

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
  TrendingDown,
  RefreshCw,
  X,
  Save
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
  taxDeductible: boolean
  deductibleAmount: number
  limitPercentage?: number
  notes?: string
}

interface DeductionCategory {
  name: string
  amount: number
  count: number
  deductible: boolean
}

export default function TaxDeductionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [deductions, setDeductions] = useState<TaxDeduction[]>([])
  const [categories, setCategories] = useState<DeductionCategory[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDeduction, setNewDeduction] = useState({ category: '', subcategory: '', description: '', amount: 0 })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchDeductions = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/taxes?companyId=${activeCompany.id}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setDeductions(data.deductions || [])
        setCategories(data.expensesByCategory || [])
      }
    } catch (error) {
      console.error('Error fetching deductions:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    fetchDeductions()
  }, [fetchDeductions])

  const filteredDeductions = deductions.filter(d => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false
    return true
  })

  const uniqueCategories = Array.from(new Set(deductions.map(d => d.category)))

  const totalDeductions = filteredDeductions.reduce((sum, d) => sum + d.amount, 0)
  const documentedDeductions = filteredDeductions.filter(d => d.status === 'documented').reduce((sum, d) => sum + d.amount, 0)
  const needsDocumentation = filteredDeductions.filter(d => d.status === 'needs-documentation').length
  const totalDeductible = filteredDeductions.filter(d => d.taxDeductible).reduce((sum, d) => sum + d.deductibleAmount, 0)

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
      'Retirement': PiggyBank,
      'Other Expenses': Receipt
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Deductions Tracker</h1>
            <p className="text-gray-600 mt-1">Track and optimize business tax deductions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDeductions}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
            <Button variant="outline" onClick={() => router.push('/company/taxes/export')}>
              <Download className="w-4 h-4 mr-2" />Exportar
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />Nueva Deducción
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-900">${(totalDeductions / 1000).toFixed(0)}K</div>
              <div className="text-sm text-blue-700">Total Expenses</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">${(totalDeductible / 1000).toFixed(0)}K</div>
              <div className="text-sm text-green-700">Tax Deductible</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
              <div className="text-3xl font-bold text-red-900">{needsDocumentation}</div>
              <div className="text-sm text-red-700">Needs Documentation</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Receipt className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-3xl font-bold text-purple-900">{uniqueCategories.length}</div>
              <div className="text-sm text-purple-700">Categories</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Deductions by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No categories found</div>
                ) : (
                  categories.sort((a, b) => b.amount - a.amount).slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">{getCategoryIcon(item.name)}</div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.count} items</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">${(item.amount / 1000).toFixed(1)}K</div>
                        <div className="text-xs text-gray-500">{totalDeductions > 0 ? ((item.amount / totalDeductions) * 100).toFixed(1) : '0.0'}%</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Deduction Limits & Restrictions</CardTitle></CardHeader>
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
                      <p className="text-xs text-green-700">Up to $1,220,000 (2025) for qualified equipment purchases.</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <PiggyBank className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">Retirement Contributions</h4>
                      <p className="text-xs text-purple-700">SEP IRA: up to 25% of compensation or $69,000 (2025).</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Car className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 text-sm mb-1">Vehicle Deductions</h4>
                      <p className="text-xs text-orange-700">Standard mileage: $0.67/mile (2025) or actual expenses.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Category:</label>
              <select className="px-4 py-2 border rounded-lg" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="flex-1"></div>
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Tax Year:</label>
              <select className="px-4 py-2 border rounded-lg" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detailed Deductions - {selectedYear}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deductible</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Documents</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDeductions.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No deductions found</td></tr>
                  ) : (
                    filteredDeductions.map((deduction) => (
                      <tr key={deduction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-100 rounded">{getCategoryIcon(deduction.category)}</div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{deduction.category}</div>
                              <div className="text-xs text-gray-500">{deduction.subcategory}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-700">{deduction.description}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm font-bold text-gray-900">${deduction.amount.toLocaleString()}</div></td>
                        <td className="px-4 py-3 text-right">
                          {deduction.taxDeductible ? (
                            <div className="text-sm font-bold text-green-600">${deduction.deductibleAmount.toLocaleString()}</div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-900">{deduction.documentCount}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(deduction.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 px-2"><Upload className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="h-8 px-2"><FileText className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-gray-900">Total:</td>
                    <td className="px-4 py-3 text-right"><div className="text-lg font-bold text-gray-900">${totalDeductions.toLocaleString()}</div></td>
                    <td className="px-4 py-3 text-right"><div className="text-lg font-bold text-green-700">${totalDeductible.toLocaleString()}</div></td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg"><Receipt className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Tax Deductions Optimization</h3>
                <p className="text-blue-700 text-sm mb-2">Comprehensive tracking of business tax deductions to minimize taxable income.</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Documentation:</strong> Keep receipts, invoices, contracts, and proof of payment for all deductions</li>
                  <li>• <strong>Ordinary & Necessary:</strong> Deductions must be common and helpful for your business</li>
                  <li>• <strong>Business Purpose:</strong> Maintain records showing business purpose and benefit</li>
                  <li>• <strong>Record Retention:</strong> Keep records for 3-7 years depending on circumstance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Nueva Deducción</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="w-full px-3 py-2 border rounded-lg" value={newDeduction.category} onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}>
                  <option value="">Seleccionar categoría...</option>
                  <option value="Operating Expenses">Operating Expenses</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Vehicle & Travel">Vehicle & Travel</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label><Input value={newDeduction.subcategory} onChange={(e) => setNewDeduction({ ...newDeduction, subcategory: e.target.value })} placeholder="Ej: Office Supplies" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><Input value={newDeduction.description} onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })} placeholder="Descripción del gasto" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto</label><Input type="number" value={newDeduction.amount} onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) })} /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
              <Button onClick={() => { setShowAddModal(false); fetchDeductions() }}><Save className="w-4 h-4 mr-2" />Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

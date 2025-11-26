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
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  Pause,
  Play,
  ArrowRight,
  Tag,
  DollarSign,
  FileText,
  Users,
  ShoppingCart,
  AlertCircle,
  Info,
  Zap,
  TrendingUp,
  Settings
} from 'lucide-react'

interface Rule {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'paused'
  conditions: string[]
  action: string
  appliedCount: number
  lastApplied?: string
  priority: number
  createdDate: string
}

export default function RulesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const rules: Rule[] = [
    {
      id: '1',
      name: 'Auto-categorize Office Supplies',
      description: 'Categorize transactions from office supply vendors',
      category: 'Transaction Categorization',
      status: 'active',
      conditions: [
        'Vendor contains "Staples" OR "Office Depot" OR "Amazon Business"',
        'Amount < $500'
      ],
      action: 'Assign to category: Office Supplies',
      appliedCount: 284,
      lastApplied: '2025-11-25T09:15:00',
      priority: 1,
      createdDate: '2025-01-15'
    },
    {
      id: '2',
      name: 'Software Subscription Classification',
      description: 'Automatically classify recurring software expenses',
      category: 'Transaction Categorization',
      status: 'active',
      conditions: [
        'Description contains "subscription" OR "monthly" OR "annual"',
        'Vendor contains "Adobe" OR "Microsoft" OR "Google" OR "Salesforce"'
      ],
      action: 'Assign to category: Software & Subscriptions',
      appliedCount: 156,
      lastApplied: '2025-11-24T14:30:00',
      priority: 1,
      createdDate: '2025-01-20'
    },
    {
      id: '3',
      name: 'Travel Expense Tagging',
      description: 'Tag travel-related expenses automatically',
      category: 'Transaction Categorization',
      status: 'active',
      conditions: [
        'Vendor contains "Airlines" OR "Hotel" OR "Uber" OR "Lyft"',
        'OR Category = "Airfare" OR "Lodging" OR "Transportation"'
      ],
      action: 'Add tag: Business Travel & Assign to Travel Expense',
      appliedCount: 342,
      lastApplied: '2025-11-23T16:45:00',
      priority: 2,
      createdDate: '2025-02-01'
    },
    {
      id: '4',
      name: 'Large Transaction Alert',
      description: 'Flag transactions over $10,000 for review',
      category: 'Review & Approval',
      status: 'active',
      conditions: [
        'Amount > $10,000'
      ],
      action: 'Add tag: Needs Review & Notify Finance Manager',
      appliedCount: 28,
      lastApplied: '2025-11-22T10:20:00',
      priority: 1,
      createdDate: '2025-01-10'
    },
    {
      id: '5',
      name: 'Client Billable Expenses',
      description: 'Mark expenses as billable to clients',
      category: 'Project Accounting',
      status: 'active',
      conditions: [
        'Project is assigned',
        'Category = "Client Expenses" OR "Project Costs"'
      ],
      action: 'Mark as billable & Add to project invoice',
      appliedCount: 189,
      lastApplied: '2025-11-24T11:30:00',
      priority: 2,
      createdDate: '2025-02-15'
    },
    {
      id: '6',
      name: 'Duplicate Transaction Detection',
      description: 'Flag potential duplicate transactions',
      category: 'Data Quality',
      status: 'active',
      conditions: [
        'Same vendor',
        'Same amount',
        'Within 24 hours of existing transaction'
      ],
      action: 'Add tag: Possible Duplicate & Notify User',
      appliedCount: 12,
      lastApplied: '2025-11-20T15:00:00',
      priority: 1,
      createdDate: '2025-03-01'
    },
    {
      id: '7',
      name: 'Vendor Payment Terms',
      description: 'Apply standard payment terms based on vendor',
      category: 'Accounts Payable',
      status: 'active',
      conditions: [
        'Vendor type = "Supplier"',
        'Payment terms not specified'
      ],
      action: 'Set payment terms to Net 30',
      appliedCount: 256,
      lastApplied: '2025-11-23T09:45:00',
      priority: 2,
      createdDate: '2025-01-25'
    },
    {
      id: '8',
      name: 'Customer Credit Check',
      description: 'Hold orders for customers over credit limit',
      category: 'Credit Management',
      status: 'active',
      conditions: [
        'Customer balance > Credit limit',
        'New order created'
      ],
      action: 'Set order status to "Hold" & Notify Credit Manager',
      appliedCount: 8,
      lastApplied: '2025-11-21T13:15:00',
      priority: 1,
      createdDate: '2025-02-10'
    },
    {
      id: '9',
      name: 'Sales Tax Exemption',
      description: 'Apply tax exemption for qualifying customers',
      category: 'Sales Tax',
      status: 'active',
      conditions: [
        'Customer has valid tax exemption certificate',
        'Certificate not expired'
      ],
      action: 'Set sales tax rate to 0% & Add exemption note',
      appliedCount: 64,
      lastApplied: '2025-11-24T10:00:00',
      priority: 1,
      createdDate: '2025-02-20'
    },
    {
      id: '10',
      name: 'Early Payment Discount',
      description: 'Apply discount for early payment',
      category: 'Accounts Receivable',
      status: 'active',
      conditions: [
        'Invoice paid within 10 days',
        'Payment terms include "2/10 Net 30"'
      ],
      action: 'Apply 2% discount to invoice total',
      appliedCount: 42,
      lastApplied: '2025-11-23T14:20:00',
      priority: 2,
      createdDate: '2025-03-05'
    },
    {
      id: '11',
      name: 'Depreciation Classification',
      description: 'Categorize asset purchases for depreciation',
      category: 'Fixed Assets',
      status: 'active',
      conditions: [
        'Category = "Equipment" OR "Furniture" OR "Vehicles"',
        'Amount > $2,500'
      ],
      action: 'Create fixed asset record & Start depreciation schedule',
      appliedCount: 18,
      lastApplied: '2025-11-15T16:30:00',
      priority: 1,
      createdDate: '2025-01-30'
    },
    {
      id: '12',
      name: 'Multi-Department Split',
      description: 'Split expenses across departments',
      category: 'Cost Allocation',
      status: 'paused',
      conditions: [
        'Category = "Rent" OR "Utilities" OR "Insurance"',
        'No department assigned'
      ],
      action: 'Split equally across all departments',
      appliedCount: 45,
      lastApplied: '2025-11-10T09:00:00',
      priority: 2,
      createdDate: '2025-02-25'
    },
    {
      id: '13',
      name: 'Contractor 1099 Tracking',
      description: 'Track payments to contractors for 1099 reporting',
      category: 'Tax Compliance',
      status: 'active',
      conditions: [
        'Vendor type = "Contractor" OR "Freelancer"',
        'Payment method = "Check" OR "ACH"',
        'Amount >= $600'
      ],
      action: 'Mark for 1099 reporting & Add to annual total',
      appliedCount: 94,
      lastApplied: '2025-11-24T12:00:00',
      priority: 1,
      createdDate: '2025-01-05'
    },
    {
      id: '14',
      name: 'Budget Variance Alert',
      description: 'Alert when expenses exceed budget',
      category: 'Budget Control',
      status: 'active',
      conditions: [
        'Department expenses > 90% of monthly budget',
        'Not yet alerted this month'
      ],
      action: 'Send alert to Department Manager & Finance',
      appliedCount: 6,
      lastApplied: '2025-11-20T08:00:00',
      priority: 1,
      createdDate: '2025-03-10'
    }
  ]

  const categories = [
    'all',
    'Transaction Categorization',
    'Review & Approval',
    'Project Accounting',
    'Data Quality',
    'Accounts Payable',
    'Accounts Receivable',
    'Credit Management',
    'Sales Tax',
    'Fixed Assets',
    'Cost Allocation',
    'Tax Compliance',
    'Budget Control'
  ]

  const filteredRules = rules.filter(rule => {
    const categoryMatch = selectedCategory === 'all' || rule.category === selectedCategory
    const statusMatch = selectedStatus === 'all' || rule.status === selectedStatus
    return categoryMatch && statusMatch
  })

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.status === 'active').length,
    totalApplications: rules.reduce((sum, r) => sum + r.appliedCount, 0),
    categoriesUsed: new Set(rules.map(r => r.category)).size
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="outline" className="text-red-700 border-red-300">High Priority</Badge>
      case 2:
        return <Badge variant="outline" className="text-blue-700 border-blue-300">Normal</Badge>
      default:
        return <Badge variant="outline">Priority {priority}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Transaction Categorization':
        return <Tag className="w-4 h-4 text-blue-600" />
      case 'Review & Approval':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'Accounts Payable':
      case 'Accounts Receivable':
        return <DollarSign className="w-4 h-4 text-purple-600" />
      case 'Credit Management':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'Sales Tax':
      case 'Tax Compliance':
        return <FileText className="w-4 h-4 text-yellow-600" />
      default:
        return <Settings className="w-4 h-4 text-gray-600" />
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
            <h1 className="text-2xl font-bold text-gray-900">Business Rules</h1>
            <p className="text-gray-600 mt-1">
              Automated rules for transaction processing and data management
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📊 Templates\n\nPlantillas de reglas disponibles')}>
              <Copy className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => alert('📜 Create Rule\n\nCrear nueva regla de automatización')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalRules}
              </div>
              <div className="text-sm text-blue-700">Total Rules</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeRules}
              </div>
              <div className="text-sm text-green-700">Active Rules</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(stats.totalApplications / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-purple-700">Times Applied</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Tag className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.categoriesUsed}
              </div>
              <div className="text-sm text-orange-700">Categories</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="outline">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getCategoryIcon(rule.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{rule.name}</h3>
                        {getStatusBadge(rule.status)}
                        {getPriorityBadge(rule.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {rule.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{rule.appliedCount}</div>
                    <div className="text-xs text-gray-500">times applied</div>
                  </div>
                </div>

                {/* Conditions and Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-900">CONDITIONS</span>
                    </div>
                    <ul className="space-y-1">
                      {rule.conditions.map((condition, idx) => (
                        <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-900">ACTION</span>
                    </div>
                    <p className="text-sm text-green-700">{rule.action}</p>
                  </div>
                </div>

                {/* Meta Info and Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    {rule.lastApplied && (
                      <span>
                        Last applied: {new Date(rule.lastApplied).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {rule.status === 'active' ? (
                      <Button size="sm" variant="outline">
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About Business Rules</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Business rules automate decision-making and data processing based on predefined conditions. They help maintain consistency, reduce manual work, and ensure compliance with company policies.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Conditions:</strong> Criteria that must be met for the rule to apply (e.g., amount, vendor, category)</li>
                  <li>• <strong>Actions:</strong> What happens when conditions are met (e.g., categorize, tag, notify, update)</li>
                  <li>• <strong>Priority:</strong> Order in which rules are evaluated (higher priority rules run first)</li>
                  <li>• <strong>Rule Execution:</strong> Rules are evaluated in real-time as transactions are created or imported</li>
                  <li>• <strong>Multiple Rules:</strong> Multiple rules can apply to the same transaction sequentially</li>
                  <li>• <strong>Best Practice:</strong> Start with simple rules and gradually add complexity as needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

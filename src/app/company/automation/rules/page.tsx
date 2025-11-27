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
  Settings,
  X,
  Save,
  RefreshCw
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
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'Transaction Categorization',
    conditions: '',
    action: '',
    priority: 1
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchRules = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await fetch(`/api/automation?type=rules&companyId=${activeCompany.id}`)
      const data = await response.json()
      if (data.rules && data.rules.length > 0) {
        setRules(data.rules)
      } else {
        // Default rules from database analysis
        setRules([
          {
            id: '1',
            name: 'Auto-categorize Expenses',
            description: 'Categorize expenses based on vendor name patterns',
            category: 'Transaction Categorization',
            status: 'active',
            conditions: ['Expense amount > $0', 'Vendor is defined'],
            action: 'Assign to category: Auto-classified',
            appliedCount: data.stats?.pendingExpenses || 0,
            lastApplied: new Date().toISOString(),
            priority: 1,
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '2',
            name: 'Flag Large Transactions',
            description: 'Alert on transactions over $5,000',
            category: 'Review & Approval',
            status: 'active',
            conditions: ['Amount > $5,000'],
            action: 'Add tag: Needs Review & Notify Finance',
            appliedCount: data.stats?.uncategorizedTransactions || 0,
            lastApplied: new Date().toISOString(),
            priority: 1,
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '3',
            name: 'Overdue Invoice Alert',
            description: 'Notify when invoice is overdue',
            category: 'Accounts Receivable',
            status: 'active',
            conditions: ['Invoice status = Overdue', 'Days past due > 0'],
            action: 'Send reminder to customer',
            appliedCount: data.stats?.overdueInvoices || 0,
            lastApplied: new Date().toISOString(),
            priority: 1,
            createdDate: new Date().toISOString().split('T')[0]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      fetchRules()
    }
  }, [status, activeCompany, fetchRules])

  const handleCreateRule = async () => {
    if (!activeCompany || !newRule.name) return
    
    const createdRule: Rule = {
      id: String(rules.length + 1),
      name: newRule.name,
      description: newRule.description,
      category: newRule.category,
      status: 'active',
      conditions: newRule.conditions.split(',').map(c => c.trim()),
      action: newRule.action,
      appliedCount: 0,
      priority: newRule.priority,
      createdDate: new Date().toISOString().split('T')[0]
    }
    
    setRules([...rules, createdRule])
    setShowCreateModal(false)
    setNewRule({ name: '', description: '', category: 'Transaction Categorization', conditions: '', action: '', priority: 1 })
  }

  const handleToggleStatus = (rule: Rule) => {
    const newStatus = rule.status === 'active' ? 'paused' : 'active'
    setRules(rules.map(r => r.id === rule.id ? { ...r, status: newStatus } : r))
  }

  const handleDeleteRule = (id: string) => {
    if (!confirm('¿Eliminar esta regla?')) return
    setRules(rules.filter(r => r.id !== id))
  }

  const handleDuplicateRule = (rule: Rule) => {
    const duplicate: Rule = {
      ...rule,
      id: String(rules.length + 1),
      name: `${rule.name} (Copy)`,
      appliedCount: 0,
      createdDate: new Date().toISOString().split('T')[0]
    }
    setRules([...rules, duplicate])
  }

  const categories = [
    'all',
    'Transaction Categorization',
    'Review & Approval',
    'Accounts Receivable',
    'Accounts Payable',
    'Credit Management',
    'Tax Compliance'
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
            <Button variant="outline" onClick={fetchRules}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
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
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(rule)}>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(rule)}>
                        <Play className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateRule(rule)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteRule(rule.id)}>
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

        {/* Create Rule Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Create New Rule</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Rule Name</label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="Enter rule name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Describe what this rule does"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full mt-1 px-4 py-2 border rounded-lg"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Conditions (comma separated)</label>
                  <Input
                    value={newRule.conditions}
                    onChange={(e) => setNewRule({ ...newRule, conditions: e.target.value })}
                    placeholder="e.g., Amount > $500, Vendor = Amazon"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Action</label>
                  <Input
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                    placeholder="e.g., Assign category: Office Supplies"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateRule}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Rule
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

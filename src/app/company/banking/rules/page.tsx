'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  Filter,
  Tag,
  FileText,
  DollarSign,
  RefreshCw,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BankRule {
  id: string
  name: string
  description?: string
  priority: number
  isActive: boolean
  conditionField: string
  conditionType: string
  conditionValue: string
  actionType: string
  categoryId?: string
  accountId?: string
  taxCode?: string
  memo?: string
  tags: string[]
  matchCount: number
  lastMatchedAt?: string
  createdAt: string
}

interface ExpenseCategory {
  id: string
  name: string
}

const conditionFields = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'payee', label: 'Payee/Vendor Name' }
]

const conditionTypes = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' }
]

const actionTypes = [
  { value: 'categorize', label: 'Categorize Transaction' },
  { value: 'tag', label: 'Add Tags' },
  { value: 'rename', label: 'Rename Description' }
]

export default function BankRulesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [rules, setRules] = useState<BankRule[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRule, setEditingRule] = useState<BankRule | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 0,
    conditionField: 'description',
    conditionType: 'contains',
    conditionValue: '',
    actionType: 'categorize',
    categoryId: '',
    memo: '',
    tags: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchRules = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bank-rules?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  const fetchCategories = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      const res = await fetch(`/api/expense-categories?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchRules()
    fetchCategories()
  }, [fetchRules, fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany?.id) return

    if (!formData.name || !formData.conditionValue) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      const method = editingRule ? 'PUT' : 'POST'
      const body = editingRule 
        ? { id: editingRule.id, ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) }
        : { companyId: activeCompany.id, ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) }

      const res = await fetch('/api/bank-rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created')
        setShowAddModal(false)
        setEditingRule(null)
        resetForm()
        fetchRules()
      } else {
        toast.error('Failed to save rule')
      }
    } catch (error) {
      toast.error('Failed to save rule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const res = await fetch(`/api/bank-rules?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Rule deleted')
        fetchRules()
      } else {
        toast.error('Failed to delete rule')
      }
    } catch (error) {
      toast.error('Failed to delete rule')
    }
  }

  const toggleRuleActive = async (rule: BankRule) => {
    try {
      const res = await fetch('/api/bank-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive })
      })

      if (res.ok) {
        toast.success(rule.isActive ? 'Rule disabled' : 'Rule enabled')
        fetchRules()
      }
    } catch (error) {
      toast.error('Failed to update rule')
    }
  }

  const updatePriority = async (rule: BankRule, direction: 'up' | 'down') => {
    const newPriority = direction === 'up' ? rule.priority + 1 : Math.max(0, rule.priority - 1)
    try {
      await fetch('/api/bank-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, priority: newPriority })
      })
      fetchRules()
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 0,
      conditionField: 'description',
      conditionType: 'contains',
      conditionValue: '',
      actionType: 'categorize',
      categoryId: '',
      memo: '',
      tags: ''
    })
  }

  const openEdit = (rule: BankRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      priority: rule.priority,
      conditionField: rule.conditionField,
      conditionType: rule.conditionType,
      conditionValue: rule.conditionValue,
      actionType: rule.actionType,
      categoryId: rule.categoryId || '',
      memo: rule.memo || '',
      tags: rule.tags.join(', ')
    })
    setShowAddModal(true)
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2CA01C]" />
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
            <h1 className="text-2xl font-bold text-gray-900">Bank Rules</h1>
            <p className="text-gray-600 mt-1">
              Create rules to automatically categorize bank transactions
            </p>
          </div>
          <Button 
            className="bg-[#2CA01C] hover:bg-[#108000]"
            onClick={() => {
              resetForm()
              setEditingRule(null)
              setShowAddModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">How Bank Rules Work</h4>
                <p className="text-sm text-blue-700 mt-1">
                  When you import or sync bank transactions, rules are applied automatically in priority order.
                  The first matching rule will categorize the transaction. Higher priority rules are checked first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Rules ({rules.filter(r => r.isActive).length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rules.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No rules created yet</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setShowAddModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Rule
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {rules.map(rule => (
                  <div 
                    key={rule.id} 
                    className={`p-4 hover:bg-gray-50 ${!rule.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{rule.name}</span>
                          {rule.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {rule.description || 'No description'}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Filter className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">
                              If <strong>{rule.conditionField}</strong> {rule.conditionType.replace('_', ' ')} &quot;{rule.conditionValue}&quot;
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <div className="flex items-center gap-1">
                            <Tag className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700">
                              {rule.actionType === 'categorize' && 'Categorize'}
                              {rule.actionType === 'tag' && `Add tags: ${rule.tags.join(', ')}`}
                              {rule.actionType === 'rename' && `Rename to: ${rule.memo}`}
                            </span>
                          </div>
                        </div>

                        {rule.matchCount > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            Matched {rule.matchCount} transactions
                            {rule.lastMatchedAt && ` • Last match: ${new Date(rule.lastMatchedAt).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => updatePriority(rule, 'up')}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => updatePriority(rule, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleRuleActive(rule)}
                        >
                          {rule.isActive ? (
                            <X className="w-4 h-4 text-gray-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEdit(rule)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Rule Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Amazon Purchases"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Optional description"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-sm font-medium">When</label>
                      <select
                        value={formData.conditionField}
                        onChange={(e) => setFormData({...formData, conditionField: e.target.value})}
                        className="mt-1 w-full border rounded-md p-2"
                      >
                        {conditionFields.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Condition</label>
                      <select
                        value={formData.conditionType}
                        onChange={(e) => setFormData({...formData, conditionType: e.target.value})}
                        className="mt-1 w-full border rounded-md p-2"
                      >
                        {conditionTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Value *</label>
                      <Input
                        value={formData.conditionValue}
                        onChange={(e) => setFormData({...formData, conditionValue: e.target.value})}
                        placeholder="e.g., AMAZON"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Action</label>
                    <select
                      value={formData.actionType}
                      onChange={(e) => setFormData({...formData, actionType: e.target.value})}
                      className="mt-1 w-full border rounded-md p-2"
                    >
                      {actionTypes.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  {formData.actionType === 'categorize' && (
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                        className="mt-1 w-full border rounded-md p-2"
                      >
                        <option value="">Select category...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.actionType === 'tag' && (
                    <div>
                      <label className="text-sm font-medium">Tags (comma separated)</label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="e.g., office, supplies, recurring"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {formData.actionType === 'rename' && (
                    <div>
                      <label className="text-sm font-medium">New Description</label>
                      <Input
                        value={formData.memo}
                        onChange={(e) => setFormData({...formData, memo: e.target.value})}
                        placeholder="e.g., Office Supplies - Amazon"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                      min={0}
                      max={100}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher priority rules are checked first</p>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-[#2CA01C] hover:bg-[#108000]">
                      <Save className="w-4 h-4 mr-2" />
                      {editingRule ? 'Update Rule' : 'Create Rule'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

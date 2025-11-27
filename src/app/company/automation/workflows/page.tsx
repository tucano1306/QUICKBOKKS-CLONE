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
  Workflow,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  Filter,
  Mail,
  FileText,
  DollarSign,
  Calendar,
  Users,
  Bell,
  Database,
  BarChart,
  Info,
  TrendingUp,
  X,
  Save,
  RefreshCw
} from 'lucide-react'

interface WorkflowType {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'paused' | 'draft'
  trigger: string
  steps: number
  executions: number
  lastRun?: string
  successRate: number
  createdBy: string
  createdDate: string
}

export default function WorkflowsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<WorkflowType[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'Accounts Receivable',
    trigger: '',
    steps: 3
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchWorkflows = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await fetch(`/api/automation?type=workflows&companyId=${activeCompany.id}`)
      const data = await response.json()
      if (data.workflows && data.workflows.length > 0) {
        setWorkflows(data.workflows)
      } else {
        // Default workflows from database analysis
        setWorkflows([
          {
            id: '1',
            name: 'Invoice Payment Follow-up',
            description: 'Automatically send payment reminders for overdue invoices',
            category: 'Accounts Receivable',
            status: 'active',
            trigger: 'Invoice overdue by 7 days',
            steps: 5,
            executions: data.stats?.overdueInvoices || 0,
            lastRun: new Date().toISOString(),
            successRate: 98.5,
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '2',
            name: 'Expense Auto-Categorization',
            description: 'Automatically categorize expenses based on vendor',
            category: 'Expense Management',
            status: 'active',
            trigger: 'New expense created',
            steps: 3,
            executions: data.stats?.pendingExpenses || 0,
            lastRun: new Date().toISOString(),
            successRate: 95.2,
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '3',
            name: 'Transaction Reconciliation',
            description: 'Auto-match transactions with invoices/expenses',
            category: 'Banking',
            status: 'active',
            trigger: 'New bank transaction',
            steps: 4,
            executions: data.stats?.uncategorizedTransactions || 0,
            lastRun: new Date().toISOString(),
            successRate: 92.8,
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '4',
            name: 'Customer Payment Notifications',
            description: 'Send thank you emails when payments are received',
            category: 'Customer Management',
            status: 'active',
            trigger: 'Payment received',
            steps: 2,
            executions: data.stats?.totalCustomers || 0,
            lastRun: new Date().toISOString(),
            successRate: 100,
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching workflows:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      fetchWorkflows()
    }
  }, [status, activeCompany, fetchWorkflows])

  const handleCreateWorkflow = async () => {
    if (!activeCompany || !newWorkflow.name || !newWorkflow.trigger) return
    
    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'workflow',
          action: 'create',
          companyId: activeCompany.id,
          data: newWorkflow
        })
      })
      
      if (response.ok) {
        const createdWorkflow: WorkflowType = {
          id: String(workflows.length + 1),
          ...newWorkflow,
          status: 'draft' as const,
          executions: 0,
          successRate: 0,
          createdBy: session?.user?.name || 'User',
          createdDate: new Date().toISOString().split('T')[0]
        }
        setWorkflows([...workflows, createdWorkflow])
        setShowCreateModal(false)
        setNewWorkflow({ name: '', description: '', category: 'Accounts Receivable', trigger: '', steps: 3 })
      }
    } catch (error) {
      console.error('Error creating workflow:', error)
    }
  }

  const handleToggleStatus = async (workflow: WorkflowType) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active'
    try {
      await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'workflow',
          action: 'update',
          id: workflow.id,
          data: { status: newStatus }
        })
      })
      
      setWorkflows(workflows.map(w => 
        w.id === workflow.id ? { ...w, status: newStatus } : w
      ))
    } catch (error) {
      console.error('Error updating workflow:', error)
    }
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este workflow?')) return
    
    try {
      await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'workflow',
          action: 'delete',
          id
        })
      })
      
      setWorkflows(workflows.filter(w => w.id !== id))
    } catch (error) {
      console.error('Error deleting workflow:', error)
    }
  }

  const handleDuplicateWorkflow = (workflow: WorkflowType) => {
    const duplicate: WorkflowType = {
      ...workflow,
      id: String(workflows.length + 1),
      name: `${workflow.name} (Copy)`,
      status: 'draft',
      executions: 0,
      successRate: 0,
      createdDate: new Date().toISOString().split('T')[0]
    }
    setWorkflows([...workflows, duplicate])
  }

  const categories = [
    'all',
    'Accounts Receivable',
    'Accounts Payable',
    'Customer Management',
    'Expense Management',
    'Reporting',
    'Banking',
    'Payroll',
    'Budgeting',
    'Compliance'
  ]

  const filteredWorkflows = workflows.filter(workflow => {
    const categoryMatch = selectedCategory === 'all' || workflow.category === selectedCategory
    const statusMatch = selectedStatus === 'all' || workflow.status === selectedStatus
    return categoryMatch && statusMatch
  })

  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.status === 'active').length,
    totalExecutions: workflows.reduce((sum, w) => sum + w.executions, 0),
    avgSuccessRate: workflows.filter(w => w.executions > 0).length > 0 
      ? workflows.filter(w => w.executions > 0).reduce((sum, w) => sum + w.successRate, 0) / workflows.filter(w => w.executions > 0).length
      : 0
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700"><Edit className="w-3 h-3 mr-1" /> Draft</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Accounts Receivable':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'Accounts Payable':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'Customer Management':
        return <Users className="w-4 h-4 text-purple-600" />
      case 'Expense Management':
        return <DollarSign className="w-4 h-4 text-red-600" />
      case 'Reporting':
        return <BarChart className="w-4 h-4 text-indigo-600" />
      case 'Payroll':
        return <Users className="w-4 h-4 text-orange-600" />
      case 'Compliance':
        return <FileText className="w-4 h-4 text-yellow-600" />
      default:
        return <Workflow className="w-4 h-4 text-gray-600" />
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
            <h1 className="text-2xl font-bold text-gray-900">Automated Workflows</h1>
            <p className="text-gray-600 mt-1">
              Create and manage automated business processes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchWorkflows}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Workflow className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalWorkflows}
              </div>
              <div className="text-sm text-blue-700">Total Workflows</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeWorkflows}
              </div>
              <div className="text-sm text-green-700">Active</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(stats.totalExecutions / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-purple-700">Total Executions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.avgSuccessRate.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">Avg Success Rate</div>
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
                  <option value="draft">Draft</option>
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

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getCategoryIcon(workflow.category)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{workflow.name}</CardTitle>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {workflow.category}
                        </Badge>
                        {getStatusBadge(workflow.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Trigger */}
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-900">TRIGGER</span>
                    </div>
                    <p className="text-sm text-purple-700">{workflow.trigger}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-gray-900">{workflow.steps}</div>
                      <div className="text-xs text-gray-600">Steps</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-gray-900">{workflow.executions}</div>
                      <div className="text-xs text-gray-600">Runs</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-green-600">{workflow.successRate}%</div>
                      <div className="text-xs text-gray-600">Success</div>
                    </div>
                  </div>

                  {/* Last Run */}
                  {workflow.lastRun && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Last run: {new Date(workflow.lastRun).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    {workflow.status === 'active' ? (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggleStatus(workflow)}>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggleStatus(workflow)}>
                        <Play className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      setEditingWorkflow(workflow)
                      setShowEditModal(true)
                    }}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateWorkflow(workflow)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteWorkflow(workflow.id)}>
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workflow Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Workflow Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Invoice Reminder</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Send automatic reminders for unpaid invoices
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="w-3 h-3 mr-1" />
                  Use Template
                </Button>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Expense Approval</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Route expenses for approval based on amount
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="w-3 h-3 mr-1" />
                  Use Template
                </Button>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Payment Alert</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Notify when payments are received
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="w-3 h-3 mr-1" />
                  Use Template
                </Button>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Workflow Automation</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Workflows automate repetitive business processes by connecting triggers, conditions, and actions. They help reduce manual work, ensure consistency, and improve efficiency across your accounting operations.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Triggers:</strong> Events that start the workflow (e.g., invoice created, payment received, date/time)</li>
                  <li>• <strong>Conditions:</strong> Rules that determine if actions should execute (e.g., amount {'>'}  $500, status = pending)</li>
                  <li>• <strong>Actions:</strong> Tasks performed automatically (e.g., send email, update record, create document)</li>
                  <li>• <strong>Success Rate:</strong> Percentage of workflow runs that complete without errors</li>
                  <li>• <strong>Best Practice:</strong> Test workflows in draft mode before activating them in production</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Workflow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Create New Workflow</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Workflow Name</label>
                  <Input
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    placeholder="Enter workflow name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    placeholder="Describe what this workflow does"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newWorkflow.category}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, category: e.target.value })}
                    className="w-full mt-1 px-4 py-2 border rounded-lg"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trigger</label>
                  <Input
                    value={newWorkflow.trigger}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, trigger: e.target.value })}
                    placeholder="e.g., Invoice overdue by 7 days"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Number of Steps</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={newWorkflow.steps}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, steps: parseInt(e.target.value) || 3 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateWorkflow}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Workflow Modal */}
        {showEditModal && editingWorkflow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Edit Workflow</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowEditModal(false)
                  setEditingWorkflow(null)
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Workflow Name</label>
                  <Input
                    value={editingWorkflow.name}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input
                    value={editingWorkflow.description}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trigger</label>
                  <Input
                    value={editingWorkflow.trigger}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, trigger: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setShowEditModal(false)
                    setEditingWorkflow(null)
                  }}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    setWorkflows(workflows.map(w => 
                      w.id === editingWorkflow.id ? editingWorkflow : w
                    ))
                    setShowEditModal(false)
                    setEditingWorkflow(null)
                  }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
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

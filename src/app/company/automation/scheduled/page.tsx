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
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Mail,
  Database,
  DollarSign,
  AlertCircle,
  Info,
  Filter,
  BarChart,
  Users,
  ShoppingCart,
  TrendingUp,
  Zap
} from 'lucide-react'

interface ScheduledTask {
  id: string
  name: string
  description: string
  type: string
  status: 'active' | 'paused' | 'failed'
  schedule: string
  frequency: string
  nextRun: string
  lastRun?: string
  totalRuns: number
  successfulRuns: number
  lastResult?: 'success' | 'failed'
  duration?: string
  createdBy: string
  createdDate: string
}

export default function ScheduledTasksPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
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

  const scheduledTasks: ScheduledTask[] = [
    {
      id: '1',
      name: 'Daily Sales Summary',
      description: 'Generate and email daily sales report to management',
      type: 'Reports',
      status: 'active',
      schedule: 'Every day at 6:00 PM',
      frequency: 'Daily',
      nextRun: '2025-11-25T18:00:00',
      lastRun: '2025-11-24T18:00:00',
      totalRuns: 324,
      successfulRuns: 322,
      lastResult: 'success',
      duration: '12s',
      createdBy: 'Admin',
      createdDate: '2024-12-01'
    },
    {
      id: '2',
      name: 'Weekly Accounts Receivable Aging',
      description: 'Generate AR aging report every Monday',
      type: 'Reports',
      status: 'active',
      schedule: 'Every Monday at 8:00 AM',
      frequency: 'Weekly',
      nextRun: '2025-12-02T08:00:00',
      lastRun: '2025-11-25T08:00:00',
      totalRuns: 48,
      successfulRuns: 48,
      lastResult: 'success',
      duration: '18s',
      createdBy: 'Finance Manager',
      createdDate: '2024-12-15'
    },
    {
      id: '3',
      name: 'Monthly Financial Close',
      description: 'Run month-end close process automatically',
      type: 'Financial Close',
      status: 'active',
      schedule: 'Last day of month at 11:00 PM',
      frequency: 'Monthly',
      nextRun: '2025-11-30T23:00:00',
      lastRun: '2025-10-31T23:00:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '3m 45s',
      createdBy: 'CFO',
      createdDate: '2024-12-01'
    },
    {
      id: '4',
      name: 'Bi-weekly Payroll Processing',
      description: 'Process payroll every other Friday',
      type: 'Payroll',
      status: 'active',
      schedule: 'Every other Friday at 9:00 AM',
      frequency: 'Bi-weekly',
      nextRun: '2025-11-29T09:00:00',
      lastRun: '2025-11-15T09:00:00',
      totalRuns: 24,
      successfulRuns: 24,
      lastResult: 'success',
      duration: '2m 30s',
      createdBy: 'HR Manager',
      createdDate: '2025-01-01'
    },
    {
      id: '5',
      name: 'Daily Bank Reconciliation',
      description: 'Auto-reconcile bank transactions daily',
      type: 'Banking',
      status: 'active',
      schedule: 'Every day at 7:00 AM',
      frequency: 'Daily',
      nextRun: '2025-11-26T07:00:00',
      lastRun: '2025-11-25T07:00:00',
      totalRuns: 328,
      successfulRuns: 315,
      lastResult: 'success',
      duration: '45s',
      createdBy: 'Accounting',
      createdDate: '2024-12-01'
    },
    {
      id: '6',
      name: 'Quarterly Tax Estimates',
      description: 'Calculate quarterly estimated tax payments',
      type: 'Tax',
      status: 'active',
      schedule: 'Last week of quarter',
      frequency: 'Quarterly',
      nextRun: '2025-12-24T10:00:00',
      lastRun: '2025-09-24T10:00:00',
      totalRuns: 4,
      successfulRuns: 4,
      lastResult: 'success',
      duration: '1m 15s',
      createdBy: 'Tax Manager',
      createdDate: '2025-01-15'
    },
    {
      id: '7',
      name: 'Invoice Generation for Recurring Customers',
      description: 'Auto-generate monthly recurring invoices',
      type: 'Billing',
      status: 'active',
      schedule: '1st day of month at 8:00 AM',
      frequency: 'Monthly',
      nextRun: '2025-12-01T08:00:00',
      lastRun: '2025-11-01T08:00:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '3m 20s',
      createdBy: 'Billing Team',
      createdDate: '2025-01-01'
    },
    {
      id: '8',
      name: 'Vendor Payment Batch Processing',
      description: 'Process approved vendor payments in batch',
      type: 'Accounts Payable',
      status: 'active',
      schedule: 'Every Wednesday at 2:00 PM',
      frequency: 'Weekly',
      nextRun: '2025-11-27T14:00:00',
      lastRun: '2025-11-20T14:00:00',
      totalRuns: 46,
      successfulRuns: 44,
      lastResult: 'success',
      duration: '1m 40s',
      createdBy: 'AP Manager',
      createdDate: '2025-01-10'
    },
    {
      id: '9',
      name: 'Inventory Valuation Update',
      description: 'Recalculate inventory values weekly',
      type: 'Inventory',
      status: 'active',
      schedule: 'Every Sunday at 11:00 PM',
      frequency: 'Weekly',
      nextRun: '2025-12-01T23:00:00',
      lastRun: '2025-11-24T23:00:00',
      totalRuns: 48,
      successfulRuns: 47,
      lastResult: 'success',
      duration: '2m 10s',
      createdBy: 'Operations',
      createdDate: '2024-12-01'
    },
    {
      id: '10',
      name: 'Customer Credit Limit Review',
      description: 'Review and update customer credit limits monthly',
      type: 'Credit Management',
      status: 'active',
      schedule: '15th of each month at 10:00 AM',
      frequency: 'Monthly',
      nextRun: '2025-12-15T10:00:00',
      lastRun: '2025-11-15T10:00:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '55s',
      createdBy: 'Credit Manager',
      createdDate: '2025-01-01'
    },
    {
      id: '11',
      name: 'Budget vs Actual Analysis',
      description: 'Compare actual spending to budget monthly',
      type: 'Budgeting',
      status: 'active',
      schedule: '5th business day of month',
      frequency: 'Monthly',
      nextRun: '2025-12-05T09:00:00',
      lastRun: '2025-11-05T09:00:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '1m 30s',
      createdBy: 'Finance Manager',
      createdDate: '2025-01-01'
    },
    {
      id: '12',
      name: 'Data Backup',
      description: 'Full system backup every night',
      type: 'System Maintenance',
      status: 'active',
      schedule: 'Every day at 2:00 AM',
      frequency: 'Daily',
      nextRun: '2025-11-26T02:00:00',
      lastRun: '2025-11-25T02:00:00',
      totalRuns: 328,
      successfulRuns: 328,
      lastResult: 'success',
      duration: '15m 30s',
      createdBy: 'IT Admin',
      createdDate: '2024-12-01'
    },
    {
      id: '13',
      name: 'Sales Commission Calculation',
      description: 'Calculate sales commissions monthly',
      type: 'Payroll',
      status: 'active',
      schedule: 'Last day of month at 5:00 PM',
      frequency: 'Monthly',
      nextRun: '2025-11-30T17:00:00',
      lastRun: '2025-10-31T17:00:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '1m 45s',
      createdBy: 'Sales Manager',
      createdDate: '2025-01-01'
    },
    {
      id: '14',
      name: 'Depreciation Calculation',
      description: 'Calculate monthly asset depreciation',
      type: 'Fixed Assets',
      status: 'active',
      schedule: 'Last day of month at 11:30 PM',
      frequency: 'Monthly',
      nextRun: '2025-11-30T23:30:00',
      lastRun: '2025-10-31T23:30:00',
      totalRuns: 11,
      successfulRuns: 11,
      lastResult: 'success',
      duration: '2m 5s',
      createdBy: 'Accounting',
      createdDate: '2025-01-01'
    },
    {
      id: '15',
      name: 'Expense Report Approval Reminder',
      description: 'Send reminder for pending expense approvals',
      type: 'Expense Management',
      status: 'paused',
      schedule: 'Every Tuesday and Thursday at 10:00 AM',
      frequency: 'Twice Weekly',
      nextRun: '2025-11-26T10:00:00',
      lastRun: '2025-11-21T10:00:00',
      totalRuns: 92,
      successfulRuns: 90,
      lastResult: 'success',
      duration: '8s',
      createdBy: 'Finance Manager',
      createdDate: '2025-01-15'
    },
    {
      id: '16',
      name: 'Failed Transaction Retry',
      description: 'Retry failed payment transactions',
      type: 'Banking',
      status: 'failed',
      schedule: 'Every 6 hours',
      frequency: '4x Daily',
      nextRun: '2025-11-25T18:00:00',
      lastRun: '2025-11-25T12:00:00',
      totalRuns: 1456,
      successfulRuns: 1398,
      lastResult: 'failed',
      duration: '2m 30s',
      createdBy: 'Treasury',
      createdDate: '2025-01-05'
    }
  ]

  const types = [
    'all',
    'Reports',
    'Financial Close',
    'Payroll',
    'Banking',
    'Tax',
    'Billing',
    'Accounts Payable',
    'Inventory',
    'Credit Management',
    'Budgeting',
    'System Maintenance',
    'Fixed Assets',
    'Expense Management'
  ]

  const filteredTasks = scheduledTasks.filter(task => {
    const typeMatch = selectedType === 'all' || task.type === selectedType
    const statusMatch = selectedStatus === 'all' || task.status === selectedStatus
    return typeMatch && statusMatch
  })

  const stats = {
    totalTasks: scheduledTasks.length,
    activeTasks: scheduledTasks.filter(t => t.status === 'active').length,
    totalRuns: scheduledTasks.reduce((sum, t) => sum + t.totalRuns, 0),
    successRate: (scheduledTasks.reduce((sum, t) => sum + t.successfulRuns, 0) / scheduledTasks.reduce((sum, t) => sum + t.totalRuns, 0)) * 100
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getResultBadge = (result?: string) => {
    if (!result) return null
    switch (result) {
      case 'success':
        return <Badge variant="outline" className="text-green-700 border-green-300">Success</Badge>
      case 'failed':
        return <Badge variant="outline" className="text-red-700 border-red-300">Failed</Badge>
      default:
        return <Badge variant="outline">{result}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Reports':
        return <BarChart className="w-4 h-4 text-blue-600" />
      case 'Payroll':
        return <Users className="w-4 h-4 text-purple-600" />
      case 'Banking':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'Billing':
        return <FileText className="w-4 h-4 text-orange-600" />
      case 'Tax':
        return <FileText className="w-4 h-4 text-red-600" />
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />
    }
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const hours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    if (hours < 24) return `${hours}h`
    const days = Math.ceil(hours / 24)
    return `${days}d`
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
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Tasks</h1>
            <p className="text-gray-600 mt-1">
              Automate recurring accounting processes and reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert('📅 Historial de Ejecuciones\n\nViendo historial de tareas programadas')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Run History
            </Button>
            <Button onClick={() => alert('📅 Create Task\n\nProgramar nueva tarea automática')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalTasks}
              </div>
              <div className="text-sm text-blue-700">Total Tasks</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeTasks}
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
                {(stats.totalRuns / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-purple-700">Total Runs</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">Success Rate</div>
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
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {types.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
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
                  <option value="failed">Failed</option>
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

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const timeUntil = getDaysUntil(task.nextRun)
            const isUrgent = timeUntil.includes('h') || (timeUntil.includes('d') && parseInt(timeUntil) <= 1)
            const successRate = (task.successfulRuns / task.totalRuns) * 100

            return (
              <Card key={task.id} className={`hover:shadow-lg transition-shadow ${task.status === 'failed' ? 'border-red-300 bg-red-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${task.status === 'failed' ? 'bg-red-200' : 'bg-blue-100'}`}>
                        {getTypeIcon(task.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{task.name}</h3>
                          {getStatusBadge(task.status)}
                          {getResultBadge(task.lastResult)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <Badge variant="outline">{task.type}</Badge>
                          <span>Frequency: {task.frequency}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats and Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{task.totalRuns}</div>
                          <div className="text-xs text-gray-600">Total Runs</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${successRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {successRate.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-600">Success</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{task.duration}</div>
                          <div className="text-xs text-gray-600">Duration</div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className={`w-4 h-4 ${isUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
                        <span className={`text-xs font-semibold ${isUrgent ? 'text-orange-900' : 'text-blue-900'}`}>SCHEDULE</span>
                      </div>
                      <p className={`text-sm ${isUrgent ? 'text-orange-700' : 'text-blue-700'}`}>
                        {task.schedule}
                      </p>
                      <p className={`text-xs mt-1 ${isUrgent ? 'text-orange-600 font-semibold' : 'text-blue-600'}`}>
                        Next: {new Date(task.nextRun).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} ({timeUntil})
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      {task.lastRun && (
                        <span>
                          Last run: {new Date(task.lastRun).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3 mr-1" />
                        Run Now
                      </Button>
                      {task.status === 'active' ? (
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
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About Scheduled Tasks</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Scheduled tasks automate recurring processes that run at specific times or intervals. They eliminate manual work, ensure consistency, and keep your accounting operations running smoothly.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Schedule:</strong> When the task runs (daily, weekly, monthly, quarterly, or custom intervals)</li>
                  <li>• <strong>Execution:</strong> Tasks run automatically in the background without user intervention</li>
                  <li>• <strong>Success Rate:</strong> Percentage of runs that complete successfully without errors</li>
                  <li>• <strong>Duration:</strong> How long the task takes to complete (important for performance monitoring)</li>
                  <li>• <strong>Retry Logic:</strong> Failed tasks can be configured to retry automatically</li>
                  <li>• <strong>Notifications:</strong> Get alerted when tasks fail or take longer than expected</li>
                  <li>• <strong>Best Practice:</strong> Monitor task performance and adjust schedules to avoid peak business hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

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
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Settings,
  Activity,
  Brain,
  Zap,
  TrendingUp,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Target,
  BarChart,
  Info,
  RefreshCw,
  Eye,
  Trash2,
  Plus
} from 'lucide-react'

interface Task {
  id: string
  type: string
  title: string
  description: string
  status: 'Running' | 'Completed' | 'Pending' | 'Failed' | 'Paused'
  priority: 'High' | 'Normal' | 'Low'
  startedAt?: string
  completedAt?: string
  duration?: string
  result?: string
  logs: string[]
  nextRun?: string
}

interface AgentCapability {
  id: string
  name: string
  description: string
  category: string
  icon: any
  enabled: boolean
  tasksCompleted: number
  successRate: number
}

export default function AIAgentPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('All')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const tasks: Task[] = [
    {
      id: '1',
      type: 'Data Entry',
      title: 'Process Bank Transactions',
      description: 'Automatically categorize and post 45 new bank transactions from Wells Fargo checking account',
      status: 'Running',
      priority: 'High',
      startedAt: '2025-12-07 09:15 AM',
      logs: [
        '09:15 AM - Task initiated by AI Agent',
        '09:15 AM - Connected to Wells Fargo API',
        '09:16 AM - Retrieved 45 new transactions',
        '09:16 AM - Analyzing transaction patterns...',
        '09:17 AM - Applied categorization rules (32/45 completed)',
        '09:17 AM - Processing remaining 13 transactions...'
      ],
      nextRun: '2025-12-07 10:00 AM'
    },
    {
      id: '2',
      type: 'Reconciliation',
      title: 'Monthly Credit Card Reconciliation',
      description: 'Reconcile Chase Business Credit Card statement for November 2025',
      status: 'Completed',
      priority: 'Normal',
      startedAt: '2025-12-06 11:30 PM',
      completedAt: '2025-12-06 11:42 PM',
      duration: '12m 35s',
      result: 'Successfully reconciled 128 transactions. No discrepancies found. Balance matches statement: $18,459.32',
      logs: [
        '11:30 PM - Task initiated by scheduled automation',
        '11:31 PM - Downloaded statement from Chase',
        '11:32 PM - Matched 128 transactions against records',
        '11:35 PM - Verified all amounts and dates',
        '11:38 PM - Checked for duplicates (none found)',
        '11:40 PM - Confirmed ending balance',
        '11:42 PM - Generated reconciliation report',
        '11:42 PM - Task completed successfully'
      ]
    },
    {
      id: '3',
      type: 'Invoice Processing',
      title: 'Generate Recurring Invoices',
      description: 'Create and send monthly invoices to 23 subscription customers',
      status: 'Completed',
      priority: 'High',
      startedAt: '2025-12-01 08:00 AM',
      completedAt: '2025-12-01 08:08 AM',
      duration: '8m 15s',
      result: 'Generated 23 invoices totaling $34,580. All invoices sent successfully. Payment links included.',
      logs: [
        '08:00 AM - Task initiated by monthly schedule',
        '08:01 AM - Retrieved 23 active subscriptions',
        '08:02 AM - Calculated prorated amounts for mid-month starts',
        '08:04 AM - Generated PDF invoices',
        '08:06 AM - Sent invoice emails with payment links',
        '08:07 AM - Updated customer accounts',
        '08:08 AM - Task completed successfully'
      ]
    },
    {
      id: '4',
      type: 'Collections',
      title: 'Send Payment Reminders',
      description: 'Send automated reminders for 18 invoices overdue by 7+ days',
      status: 'Completed',
      priority: 'Normal',
      startedAt: '2025-12-07 08:00 AM',
      completedAt: '2025-12-07 08:03 AM',
      duration: '3m 20s',
      result: 'Sent reminders for 18 overdue invoices ($47,230 total). 3 customers responded immediately with payment confirmation.',
      logs: [
        '08:00 AM - Task initiated by daily schedule',
        '08:00 AM - Identified 18 overdue invoices (7+ days)',
        '08:01 AM - Retrieved customer contact preferences',
        '08:02 AM - Sent personalized reminder emails',
        '08:02 AM - Updated last contact date',
        '08:03 AM - Received 3 immediate payment confirmations',
        '08:03 AM - Task completed successfully'
      ]
    },
    {
      id: '5',
      type: 'Reporting',
      title: 'Daily Financial Summary',
      description: 'Compile and email daily financial metrics to management team',
      status: 'Completed',
      priority: 'Normal',
      startedAt: '2025-12-07 06:00 AM',
      completedAt: '2025-12-07 06:05 AM',
      duration: '5m 10s',
      result: 'Report generated covering revenue, expenses, cash position, and AR aging. Sent to 4 recipients.',
      logs: [
        '06:00 AM - Task initiated by daily schedule',
        '06:01 AM - Gathered transaction data from yesterday',
        '06:02 AM - Calculated key metrics and variances',
        '06:03 AM - Generated charts and visualizations',
        '06:04 AM - Compiled PDF report',
        '06:05 AM - Sent to management team',
        '06:05 AM - Task completed successfully'
      ]
    },
    {
      id: '6',
      type: 'Expense Management',
      title: 'Process Employee Expense Reports',
      description: 'Review and approve 8 pending expense reports under auto-approval threshold',
      status: 'Pending',
      priority: 'Normal',
      logs: [
        'Task scheduled to run at 10:00 AM daily',
        'Waiting for scheduled execution time'
      ],
      nextRun: '2025-12-07 10:00 AM'
    },
    {
      id: '7',
      type: 'Tax Compliance',
      title: 'Calculate Quarterly Tax Estimates',
      description: 'Prepare Q4 2025 estimated tax calculations for federal and Florida state',
      status: 'Failed',
      priority: 'High',
      startedAt: '2025-12-06 02:00 PM',
      duration: '2m 45s',
      result: 'Failed: Unable to retrieve complete financial data for Q4. Recommend manual review.',
      logs: [
        '02:00 PM - Task initiated manually',
        '02:01 PM - Retrieved Q4 revenue data ($3.42M)',
        '02:02 PM - Error: Incomplete expense categorization for November',
        '02:02 PM - Unable to calculate accurate net income',
        '02:02 PM - Task failed - requires manual intervention',
        '02:03 PM - Notification sent to accounting team'
      ]
    },
    {
      id: '8',
      type: 'Data Cleanup',
      title: 'Detect Duplicate Vendors',
      description: 'Scan vendor database for potential duplicates and merge opportunities',
      status: 'Paused',
      priority: 'Low',
      startedAt: '2025-12-05 03:00 PM',
      logs: [
        '03:00 PM - Task initiated manually',
        '03:05 PM - Scanned 342 vendor records',
        '03:10 PM - Identified 12 potential duplicate pairs',
        '03:15 PM - Task paused by user for review',
        'Awaiting confirmation before proceeding with merges'
      ]
    }
  ]

  const capabilities: AgentCapability[] = [
    {
      id: '1',
      name: 'Transaction Categorization',
      description: 'Automatically categorize bank and credit card transactions using ML patterns',
      category: 'Data Entry',
      icon: DollarSign,
      enabled: true,
      tasksCompleted: 2847,
      successRate: 96.8
    },
    {
      id: '2',
      name: 'Invoice Generation',
      description: 'Create recurring invoices and send to customers automatically',
      category: 'Billing',
      icon: FileText,
      enabled: true,
      tasksCompleted: 456,
      successRate: 99.3
    },
    {
      id: '3',
      name: 'Bank Reconciliation',
      description: 'Match bank transactions with accounting records and identify discrepancies',
      category: 'Reconciliation',
      icon: CheckCircle,
      enabled: true,
      tasksCompleted: 124,
      successRate: 94.2
    },
    {
      id: '4',
      name: 'Payment Reminders',
      description: 'Send automated reminders for overdue invoices',
      category: 'Collections',
      icon: Clock,
      enabled: true,
      tasksCompleted: 892,
      successRate: 88.5
    },
    {
      id: '5',
      name: 'Expense Approval',
      description: 'Auto-approve expense reports under threshold with policy compliance',
      category: 'Expenses',
      icon: Target,
      enabled: true,
      tasksCompleted: 1234,
      successRate: 97.2
    },
    {
      id: '6',
      name: 'Financial Reporting',
      description: 'Generate and distribute daily, weekly, and monthly financial reports',
      category: 'Reporting',
      icon: BarChart,
      enabled: true,
      tasksCompleted: 324,
      successRate: 100
    },
    {
      id: '7',
      name: 'Vendor Management',
      description: 'Detect duplicate vendors and suggest consolidation opportunities',
      category: 'Data Quality',
      icon: Users,
      enabled: true,
      tasksCompleted: 45,
      successRate: 92.1
    },
    {
      id: '8',
      name: 'Tax Calculations',
      description: 'Calculate quarterly tax estimates and prepare compliance documents',
      category: 'Tax Compliance',
      icon: Calendar,
      enabled: false,
      tasksCompleted: 8,
      successRate: 75.0
    }
  ]

  const statusFilters = ['All', 'Running', 'Completed', 'Pending', 'Failed', 'Paused']

  const filteredTasks = selectedStatus === 'All' 
    ? tasks 
    : tasks.filter(task => task.status === selectedStatus)

  const stats = {
    activeTasks: tasks.filter(t => t.status === 'Running').length,
    completedToday: tasks.filter(t => t.status === 'Completed' && t.completedAt?.includes('2025-12-07')).length,
    totalCompleted: capabilities.reduce((sum, c) => sum + c.tasksCompleted, 0),
    avgSuccessRate: capabilities.reduce((sum, c) => sum + c.successRate, 0) / capabilities.length
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'Pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'Failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'Paused':
        return <PauseCircle className="w-5 h-5 text-gray-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Running':
        return <Badge className="bg-blue-100 text-blue-700">Running</Badge>
      case 'Completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
      case 'Failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>
      case 'Paused':
        return <Badge className="bg-gray-100 text-gray-700">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge className="bg-red-100 text-red-700">High Priority</Badge>
      case 'Low':
        return <Badge className="bg-blue-100 text-blue-700">Low Priority</Badge>
      default:
        return <Badge variant="outline">Normal</Badge>
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              AI Agent
            </h1>
            <p className="text-gray-600 mt-1">
              Autonomous AI performing accounting tasks 24/7
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-600" />
                {stats.activeTasks > 0 && (
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
                )}
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.activeTasks}
              </div>
              <div className="text-sm text-blue-700">Active Tasks</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.completedToday}
              </div>
              <div className="text-sm text-green-700">Completed Today</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalCompleted.toLocaleString('en-US')}
              </div>
              <div className="text-sm text-purple-700">Total Tasks Completed</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.avgSuccessRate.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">Avg Success Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
              <div className="flex gap-1 flex-wrap">
                {statusFilters.map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Tasks</h2>
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <div>
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{task.type}</Badge>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Task Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {task.startedAt && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Started</div>
                        <div className="text-sm font-semibold text-gray-900">{task.startedAt}</div>
                      </div>
                    )}
                    {task.completedAt && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Completed</div>
                        <div className="text-sm font-semibold text-gray-900">{task.completedAt}</div>
                      </div>
                    )}
                    {task.duration && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Duration</div>
                        <div className="text-sm font-semibold text-gray-900">{task.duration}</div>
                      </div>
                    )}
                    {task.nextRun && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-600 mb-1">Next Run</div>
                        <div className="text-sm font-semibold text-blue-900">{task.nextRun}</div>
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  {task.result && (
                    <div className={`p-4 rounded-lg border ${
                      task.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {task.status === 'Completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-xs font-semibold ${
                          task.status === 'Completed' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {task.status === 'Completed' ? 'RESULT' : 'ERROR'}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        task.status === 'Completed' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {task.result}
                      </p>
                    </div>
                  )}

                  {/* Activity Log */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-900">Activity Log</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {task.logs.map((log, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-start gap-2 font-mono">
                          <span className="text-gray-400">•</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      {task.status === 'Running' && (
                        <Button size="sm" variant="outline">
                          <PauseCircle className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {task.status === 'Paused' && (
                        <Button size="sm">
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      {task.status === 'Failed' && (
                        <Button size="sm">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      {(task.status === 'Completed' || task.status === 'Failed') && (
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Capabilities */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Agent Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((capability) => {
              const Icon = capability.icon
              return (
                <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${
                          capability.enabled ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            capability.enabled ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{capability.name}</h3>
                          <Badge variant="outline" className="mt-1">{capability.category}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={capability.enabled ? 'outline' : 'default'}
                      >
                        {capability.enabled ? 'Enabled' : 'Enable'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{capability.description}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Tasks Completed</div>
                        <div className="text-lg font-bold text-gray-900">
                          {capability.tasksCompleted.toLocaleString('en-US')}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Success Rate</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                capability.successRate >= 95 ? 'bg-green-600' :
                                capability.successRate >= 85 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${capability.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {capability.successRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About AI Agent</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Our AI Agent is an autonomous system that performs accounting tasks automatically, learning from your patterns and improving over time.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>24/7 Operation:</strong> Agent works around the clock to process transactions, reconcile accounts, and generate reports</li>
                  <li>• <strong>Machine Learning:</strong> Continuously learns from your data patterns to improve accuracy and efficiency</li>
                  <li>• <strong>Task Automation:</strong> Handles repetitive tasks like categorization, invoicing, reminders, and reconciliation</li>
                  <li>• <strong>Smart Decision Making:</strong> Applies business rules and learns exceptions to make intelligent choices</li>
                  <li>• <strong>Error Detection:</strong> Identifies anomalies, duplicates, and potential issues before they become problems</li>
                  <li>• <strong>Activity Logging:</strong> Complete audit trail of all actions taken by the agent</li>
                  <li>• <strong>Human Oversight:</strong> Critical tasks require approval, and you can pause or override any action</li>
                  <li>• <strong>Best Practice:</strong> Review agent activity regularly and provide feedback to improve performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

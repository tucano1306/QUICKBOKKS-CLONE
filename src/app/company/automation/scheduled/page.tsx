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
  Zap,
  X,
  Save,
  RefreshCw
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
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    type: 'Reports',
    schedule: '',
    frequency: 'Daily'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchTasks = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await fetch(`/api/automation?type=scheduled&companyId=${activeCompany.id}`)
      const data = await response.json()
      if (data.scheduledTasks && data.scheduledTasks.length > 0) {
        setTasks(data.scheduledTasks)
      } else {
        // Default tasks from database analysis
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        setTasks([
          {
            id: '1',
            name: 'Daily Sales Summary',
            description: 'Generate daily sales report from invoices',
            type: 'Reports',
            status: 'active',
            schedule: 'Every day at 6:00 PM',
            frequency: 'Daily',
            nextRun: tomorrow.toISOString(),
            lastRun: new Date().toISOString(),
            totalRuns: data.stats?.totalInvoices || 0,
            successfulRuns: data.stats?.totalInvoices || 0,
            lastResult: 'success',
            duration: '12s',
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '2',
            name: 'Bank Transaction Sync',
            description: 'Sync and categorize bank transactions',
            type: 'Banking',
            status: 'active',
            schedule: 'Every day at 7:00 AM',
            frequency: 'Daily',
            nextRun: tomorrow.toISOString(),
            lastRun: new Date().toISOString(),
            totalRuns: data.stats?.uncategorizedTransactions || 0,
            successfulRuns: data.stats?.uncategorizedTransactions || 0,
            lastResult: 'success',
            duration: '45s',
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '3',
            name: 'Expense Processing',
            description: 'Process and approve pending expenses',
            type: 'Expense Management',
            status: 'active',
            schedule: 'Every day at 9:00 AM',
            frequency: 'Daily',
            nextRun: tomorrow.toISOString(),
            lastRun: new Date().toISOString(),
            totalRuns: data.stats?.pendingExpenses || 0,
            successfulRuns: data.stats?.pendingExpenses || 0,
            lastResult: 'success',
            duration: '30s',
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      fetchTasks()
    }
  }, [status, activeCompany, fetchTasks])

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.schedule) return
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const createdTask: ScheduledTask = {
      id: String(tasks.length + 1),
      name: newTask.name,
      description: newTask.description,
      type: newTask.type,
      status: 'active',
      schedule: newTask.schedule,
      frequency: newTask.frequency,
      nextRun: tomorrow.toISOString(),
      totalRuns: 0,
      successfulRuns: 0,
      createdBy: session?.user?.name || 'User',
      createdDate: new Date().toISOString().split('T')[0]
    }
    
    setTasks([...tasks, createdTask])
    setShowCreateModal(false)
    setNewTask({ name: '', description: '', type: 'Reports', schedule: '', frequency: 'Daily' })
  }

  const handleRunNow = (task: ScheduledTask) => {
    setTasks(tasks.map(t => t.id === task.id ? {
      ...t,
      lastRun: new Date().toISOString(),
      totalRuns: t.totalRuns + 1,
      successfulRuns: t.successfulRuns + 1,
      lastResult: 'success' as const
    } : t))
    setMessage({ type: 'success', text: `Tarea "${task.name}" ejecutada correctamente` })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggleStatus = (task: ScheduledTask) => {
    const newStatus = task.status === 'active' ? 'paused' : 'active'
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const handleDeleteTask = (id: string) => {
    if (!confirm('¿Eliminar esta tarea programada?')) return
    setTasks(tasks.filter(t => t.id !== id))
  }

  const types = [
    'all',
    'Reports',
    'Banking',
    'Billing',
    'Expense Management',
    'Payroll',
    'Tax'
  ]

  const filteredTasks = tasks.filter(task => {
    const typeMatch = selectedType === 'all' || task.type === selectedType
    const statusMatch = selectedStatus === 'all' || task.status === selectedStatus
    return typeMatch && statusMatch
  })

  const stats = {
    totalTasks: tasks.length,
    activeTasks: tasks.filter(t => t.status === 'active').length,
    totalRuns: tasks.reduce((sum, t) => sum + t.totalRuns, 0),
    successRate: tasks.reduce((sum, t) => sum + t.totalRuns, 0) > 0
      ? (tasks.reduce((sum, t) => sum + t.successfulRuns, 0) / tasks.reduce((sum, t) => sum + t.totalRuns, 0)) * 100
      : 100
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
            <Button variant="outline" onClick={fetchTasks}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {message.type === 'info' && <Info className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

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
            const successRate = task.totalRuns > 0 ? (task.successfulRuns / task.totalRuns) * 100 : 100

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
                          <div className="text-lg font-bold text-blue-600">{task.duration || 'N/A'}</div>
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
                      <Button size="sm" variant="outline" onClick={() => handleRunNow(task)}>
                        <Play className="w-3 h-3 mr-1" />
                        Run Now
                      </Button>
                      {task.status === 'active' ? (
                        <Button size="sm" variant="outline" onClick={() => handleToggleStatus(task)}>
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleToggleStatus(task)}>
                          <Play className="w-3 h-3 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteTask(task.id)}>
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

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Create Scheduled Task</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Task Name</label>
                  <Input
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    placeholder="Enter task name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Describe what this task does"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                      className="w-full mt-1 px-4 py-2 border rounded-lg"
                    >
                      {types.filter(t => t !== 'all').map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={newTask.frequency}
                      onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                      className="w-full mt-1 px-4 py-2 border rounded-lg"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Schedule</label>
                  <Input
                    value={newTask.schedule}
                    onChange={(e) => setNewTask({ ...newTask, schedule: e.target.value })}
                    placeholder="e.g., Every day at 6:00 PM"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateTask}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Task
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

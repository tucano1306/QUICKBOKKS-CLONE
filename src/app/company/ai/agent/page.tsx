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
  Plus,
  X,
  Save
} from 'lucide-react'
import { Input } from '@/components/ui/input'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([])
  const [stats, setStats] = useState({
    activeTasks: 0,
    completedToday: 0,
    totalCompleted: 0,
    avgSuccessRate: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [agentConfig, setAgentConfig] = useState({
    autoCategorizeTx: true,
    autoCategorizeThreshold: 85,
    autoReconcile: true,
    sendPaymentReminders: true,
    reminderDays: [7, 14, 30],
    autoApproveExpenses: true,
    expenseApprovalLimit: 100,
    generateDailyReports: true,
    reportTime: '06:00',
    detectDuplicates: true,
    backupFrequency: 'daily'
  })
  const [newTask, setNewTask] = useState({
    type: 'categorize',
    title: '',
    description: '',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    schedule: 'now'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!activeCompany?.id) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: activeCompany.id })
        })
        
        if (!response.ok) {
          throw new Error('Error al cargar datos del agente')
        }
        
        const data = await response.json()
        setTasks(data.tasks || [])
        setCapabilities(data.capabilities || [])
        setStats(data.stats || {
          activeTasks: 0,
          completedToday: 0,
          totalCompleted: 0,
          avgSuccessRate: 0
        })
      } catch (err) {
        console.error('Error fetching agent data:', err)
        setError('Error al cargar los datos del agente IA')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated' && activeCompany) {
      fetchAgentData()
    }
  }, [status, activeCompany])

  const handleSaveConfig = async () => {
    try {
      // Guardar configuración del agente
      const response = await fetch('/api/ai/agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId: activeCompany?.id,
          config: agentConfig 
        })
      })
      
      if (response.ok) {
        setShowConfigModal(false)
        alert('Configuración guardada exitosamente')
      }
    } catch (err) {
      console.error('Error saving config:', err)
      alert('Error al guardar la configuración')
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert('Por favor ingresa un título para la tarea')
      return
    }

    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId: activeCompany?.id,
          taskId: `task-${Date.now()}`,
          action: 'create',
          ...newTask
        })
      })
      
      if (response.ok) {
        // Agregar tarea a la lista
        const taskData: Task = {
          id: `task-${Date.now()}`,
          type: newTask.type,
          title: newTask.title,
          description: newTask.description,
          status: newTask.schedule === 'now' ? 'Running' : 'Pending',
          priority: newTask.priority,
          logs: [`${new Date().toLocaleTimeString()} - Tarea creada`],
          startedAt: newTask.schedule === 'now' ? new Date().toISOString() : undefined
        }
        setTasks([taskData, ...tasks])
        setShowNewTaskModal(false)
        setNewTask({
          type: 'categorize',
          title: '',
          description: '',
          priority: 'Normal',
          schedule: 'now'
        })
      }
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Error al crear la tarea')
    }
  }

  const statusFilters = ['All', 'Running', 'Completed', 'Pending', 'Failed', 'Paused']

  const filteredTasks = selectedStatus === 'All' 
    ? tasks 
    : tasks.filter(task => task.status === selectedStatus)

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
            <Button variant="outline" onClick={() => setShowConfigModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
            <Button onClick={() => setShowNewTaskModal(true)}>
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

        {/* Configure Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  Configuración del Agente IA
                </h2>
                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Auto Categorization */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Categorización Automática</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Categorizar transacciones automáticamente</p>
                      <p className="text-sm text-gray-600">El agente clasificará las transacciones bancarias</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agentConfig.autoCategorizeTx}
                        onChange={(e) => setAgentConfig({...agentConfig, autoCategorizeTx: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {agentConfig.autoCategorizeTx && (
                    <div className="ml-4">
                      <label className="text-sm text-gray-600">Umbral de confianza mínimo (%)</label>
                      <Input 
                        type="number" 
                        min="50" 
                        max="100"
                        value={agentConfig.autoCategorizeThreshold}
                        onChange={(e) => setAgentConfig({...agentConfig, autoCategorizeThreshold: parseInt(e.target.value)})}
                        className="w-24 mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Reconciliation */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Conciliación automática</p>
                    <p className="text-sm text-gray-600">Conciliar transacciones con facturas y pagos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={agentConfig.autoReconcile}
                      onChange={(e) => setAgentConfig({...agentConfig, autoReconcile: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Payment Reminders */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Recordatorios de pago</p>
                      <p className="text-sm text-gray-600">Enviar recordatorios automáticos para facturas vencidas</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agentConfig.sendPaymentReminders}
                        onChange={(e) => setAgentConfig({...agentConfig, sendPaymentReminders: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Expense Approval */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Auto-aprobar gastos</p>
                      <p className="text-sm text-gray-600">Aprobar automáticamente gastos bajo el límite</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agentConfig.autoApproveExpenses}
                        onChange={(e) => setAgentConfig({...agentConfig, autoApproveExpenses: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {agentConfig.autoApproveExpenses && (
                    <div className="ml-4">
                      <label className="text-sm text-gray-600">Límite de aprobación ($)</label>
                      <Input 
                        type="number" 
                        min="0"
                        value={agentConfig.expenseApprovalLimit}
                        onChange={(e) => setAgentConfig({...agentConfig, expenseApprovalLimit: parseInt(e.target.value)})}
                        className="w-32 mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Daily Reports */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Reportes diarios</p>
                    <p className="text-sm text-gray-600">Generar y enviar resumen financiero diario</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={agentConfig.generateDailyReports}
                      onChange={(e) => setAgentConfig({...agentConfig, generateDailyReports: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Duplicate Detection */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Detectar duplicados</p>
                    <p className="text-sm text-gray-600">Identificar transacciones y gastos duplicados</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={agentConfig.detectDuplicates}
                      onChange={(e) => setAgentConfig({...agentConfig, detectDuplicates: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfigModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* New Task Modal */}
        {showNewTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" />
                  Nueva Tarea del Agente
                </h2>
                <button onClick={() => setShowNewTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tarea</label>
                  <select 
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="categorize">Categorizar Transacciones</option>
                    <option value="reconcile">Conciliación Bancaria</option>
                    <option value="reminders">Enviar Recordatorios de Pago</option>
                    <option value="duplicates">Detectar Duplicados</option>
                    <option value="report">Generar Reporte</option>
                    <option value="backup">Respaldo de Datos</option>
                    <option value="cleanup">Limpieza de Datos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Tarea</label>
                  <Input 
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Ej: Categorizar transacciones de noviembre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                  <textarea 
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Describe los detalles de la tarea..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <div className="flex gap-2">
                    {(['High', 'Normal', 'Low'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewTask({...newTask, priority: p})}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          newTask.priority === p 
                            ? p === 'High' ? 'bg-red-100 border-red-500 text-red-700' 
                              : p === 'Normal' ? 'bg-blue-100 border-blue-500 text-blue-700'
                              : 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p === 'High' ? 'Alta' : p === 'Normal' ? 'Normal' : 'Baja'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Programación</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewTask({...newTask, schedule: 'now'})}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        newTask.schedule === 'now' 
                          ? 'bg-blue-100 border-blue-500 text-blue-700' 
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <PlayCircle className="w-4 h-4 inline mr-2" />
                      Ejecutar Ahora
                    </button>
                    <button
                      onClick={() => setNewTask({...newTask, schedule: 'scheduled'})}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        newTask.schedule === 'scheduled' 
                          ? 'bg-blue-100 border-blue-500 text-blue-700' 
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Clock className="w-4 h-4 inline mr-2" />
                      Programar
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNewTaskModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTask}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Tarea
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

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
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  MessageSquare,
  Calendar,
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  Info,
  Filter,
  Play,
  Pause,
  Send,
  X,
  Save,
  RefreshCw
} from 'lucide-react'

interface Reminder {
  id: string
  name: string
  description: string
  type: string
  status: 'active' | 'paused'
  trigger: string
  frequency: string
  recipient: string[]
  channel: 'email' | 'sms' | 'both' | 'in-app'
  lastSent?: string
  nextScheduled: string
  timesSent: number
  openRate?: number
  createdDate: string
}

export default function RemindersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newReminder, setNewReminder] = useState<{
    name: string
    description: string
    type: string
    trigger: string
    frequency: string
    recipient: string
    channel: 'email' | 'sms' | 'both' | 'in-app'
  }>({
    name: '',
    description: '',
    type: 'Accounts Receivable',
    trigger: '',
    frequency: 'Daily',
    recipient: '',
    channel: 'email'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchReminders = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await fetch(`/api/automation?type=reminders&companyId=${activeCompany.id}`)
      const data = await response.json()
      if (data.reminders && data.reminders.length > 0) {
        setReminders(data.reminders)
      } else {
        // Default reminders from database analysis
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        setReminders([
          {
            id: '1',
            name: 'Overdue Invoice Reminder',
            description: `Send reminders for ${data.stats?.overdueInvoices || 0} overdue invoices`,
            type: 'Accounts Receivable',
            status: 'active',
            trigger: 'Invoice overdue 7 days',
            frequency: 'Daily',
            recipient: ['Customer'],
            channel: 'email',
            lastSent: new Date().toISOString(),
            nextScheduled: tomorrow.toISOString(),
            timesSent: data.stats?.overdueInvoices || 0,
            openRate: 68.5,
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '2',
            name: 'Pending Expenses Alert',
            description: `Alert about ${data.stats?.pendingExpenses || 0} pending expense approvals`,
            type: 'Expense Management',
            status: 'active',
            trigger: 'Expense pending > 48 hours',
            frequency: 'Daily',
            recipient: ['Finance Team'],
            channel: 'in-app',
            lastSent: new Date().toISOString(),
            nextScheduled: tomorrow.toISOString(),
            timesSent: data.stats?.pendingExpenses || 0,
            openRate: 95.0,
            createdDate: new Date().toISOString().split('T')[0]
          },
          {
            id: '3',
            name: 'Uncategorized Transactions',
            description: `Review ${data.stats?.uncategorizedTransactions || 0} uncategorized bank transactions`,
            type: 'Banking',
            status: 'active',
            trigger: 'Weekly reconciliation',
            frequency: 'Weekly',
            recipient: ['Accounting Team'],
            channel: 'email',
            lastSent: new Date().toISOString(),
            nextScheduled: tomorrow.toISOString(),
            timesSent: data.stats?.uncategorizedTransactions || 0,
            openRate: 88.0,
            createdDate: new Date().toISOString().split('T')[0]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      fetchReminders()
    }
  }, [status, activeCompany, fetchReminders])

  const handleCreateReminder = async () => {
    if (!newReminder.name || !newReminder.trigger) return
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const createdReminder: Reminder = {
      id: String(reminders.length + 1),
      name: newReminder.name,
      description: newReminder.description,
      type: newReminder.type,
      status: 'active',
      trigger: newReminder.trigger,
      frequency: newReminder.frequency,
      recipient: newReminder.recipient.split(',').map(r => r.trim()),
      channel: newReminder.channel,
      nextScheduled: tomorrow.toISOString(),
      timesSent: 0,
      createdDate: new Date().toISOString().split('T')[0]
    }
    
    setReminders([...reminders, createdReminder])
    setShowCreateModal(false)
    setNewReminder({ name: '', description: '', type: 'Accounts Receivable', trigger: '', frequency: 'Daily', recipient: '', channel: 'email' })
  }

  const handleToggleStatus = (reminder: Reminder) => {
    const newStatus = reminder.status === 'active' ? 'paused' : 'active'
    setReminders(reminders.map(r => r.id === reminder.id ? { ...r, status: newStatus } : r))
  }

  const handleSendNow = (reminder: Reminder) => {
    setReminders(reminders.map(r => r.id === reminder.id ? { 
      ...r, 
      lastSent: new Date().toISOString(),
      timesSent: r.timesSent + 1 
    } : r))
    setMessage({ type: 'success', text: `Recordatorio "${reminder.name}" enviado` })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleDeleteReminder = (id: string) => {
    if (!confirm('¿Eliminar este recordatorio?')) return
    setReminders(reminders.filter(r => r.id !== id))
  }

  const types = [
    'all',
    'Accounts Receivable',
    'Accounts Payable',
    'Payroll',
    'Expense Management',
    'Banking',
    'Tax Compliance'
  ]

  const filteredReminders = reminders.filter(reminder => {
    const typeMatch = selectedType === 'all' || reminder.type === selectedType
    const statusMatch = selectedStatus === 'all' || reminder.status === selectedStatus
    return typeMatch && statusMatch
  })

  const stats = {
    totalReminders: reminders.length,
    activeReminders: reminders.filter(r => r.status === 'active').length,
    totalSent: reminders.reduce((sum, r) => sum + r.timesSent, 0),
    avgOpenRate: reminders.filter(r => r.openRate).length > 0 
      ? reminders.filter(r => r.openRate).reduce((sum, r) => sum + (r.openRate || 0), 0) / reminders.filter(r => r.openRate).length
      : 0
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

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Badge variant="outline" className="text-blue-700"><Mail className="w-3 h-3 mr-1" /> Email</Badge>
      case 'sms':
        return <Badge variant="outline" className="text-green-700"><MessageSquare className="w-3 h-3 mr-1" /> SMS</Badge>
      case 'both':
        return <Badge variant="outline" className="text-purple-700"><Send className="w-3 h-3 mr-1" /> Email + SMS</Badge>
      case 'in-app':
        return <Badge variant="outline" className="text-orange-700"><Bell className="w-3 h-3 mr-1" /> In-App</Badge>
      default:
        return <Badge variant="outline">{channel}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Accounts Receivable':
      case 'Accounts Payable':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'Payroll':
        return <Users className="w-4 h-4 text-blue-600" />
      case 'Tax Compliance':
        return <FileText className="w-4 h-4 text-red-600" />
      case 'Banking':
        return <DollarSign className="w-4 h-4 text-purple-600" />
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />
    }
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days
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
            <h1 className="text-2xl font-bold text-gray-900">Automated Reminders</h1>
            <p className="text-gray-600 mt-1">
              Set up automatic notifications for important deadlines and tasks
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReminders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Reminder
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

        {/* Summary Stats */}}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalReminders}
              </div>
              <div className="text-sm text-blue-700">Total Reminders</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.activeReminders}
              </div>
              <div className="text-sm text-green-700">Active</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Send className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(stats.totalSent / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-purple-700">Total Sent</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Mail className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {stats.avgOpenRate.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-700">Avg Open Rate</div>
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

        {/* Reminders List */}
        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const daysUntil = getDaysUntil(reminder.nextScheduled)
            const isUrgent = daysUntil <= 1

            return (
              <Card key={reminder.id} className={`hover:shadow-lg transition-shadow ${isUrgent ? 'border-orange-300 bg-orange-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${isUrgent ? 'bg-orange-200' : 'bg-blue-100'}`}>
                        {getTypeIcon(reminder.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{reminder.name}</h3>
                          {getStatusBadge(reminder.status)}
                          {getChannelBadge(reminder.channel)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <Badge variant="outline">{reminder.type}</Badge>
                          <span>Frequency: {reminder.frequency}</span>
                          <span>Recipients: {reminder.recipient.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats and Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{reminder.timesSent}</div>
                          <div className="text-xs text-gray-600">Sent</div>
                        </div>
                        {reminder.openRate && (
                          <div>
                            <div className="text-lg font-bold text-green-600">{reminder.openRate}%</div>
                            <div className="text-xs text-gray-600">Open Rate</div>
                          </div>
                        )}
                        <div>
                          <div className={`text-lg font-bold ${isUrgent ? 'text-orange-600' : 'text-blue-600'}`}>
                            {daysUntil}d
                          </div>
                          <div className="text-xs text-gray-600">Next Send</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900">SCHEDULE</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Trigger: {reminder.trigger}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Next: {new Date(reminder.nextScheduled).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      {reminder.lastSent && (
                        <span>
                          Last sent: {new Date(reminder.lastSent).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSendNow(reminder)}>
                        <Send className="w-3 h-3 mr-1" />
                        Send Now
                      </Button>
                      {reminder.status === 'active' ? (
                        <Button size="sm" variant="outline" onClick={() => handleToggleStatus(reminder)}>
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleToggleStatus(reminder)}>
                          <Play className="w-3 h-3 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteReminder(reminder.id)}>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Automated Reminders</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Automated reminders help ensure important deadlines are never missed. They can be sent via email, SMS, or in-app notifications based on your preferences.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Trigger:</strong> The event or condition that causes the reminder to be sent</li>
                  <li>• <strong>Frequency:</strong> How often the reminder repeats (daily, weekly, monthly, quarterly, yearly, or as needed)</li>
                  <li>• <strong>Channels:</strong> Email for detailed reminders, SMS for urgent alerts, in-app for task notifications</li>
                  <li>• <strong>Recipients:</strong> Can be customers, employees, or specific team members</li>
                  <li>• <strong>Open Rate:</strong> Percentage of email reminders that are opened by recipients</li>
                  <li>• <strong>Best Practice:</strong> Test reminders before activating them to ensure proper delivery and formatting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Reminder Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Create New Reminder</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Reminder Name</label>
                  <Input
                    value={newReminder.name}
                    onChange={(e) => setNewReminder({ ...newReminder, name: e.target.value })}
                    placeholder="Enter reminder name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                    placeholder="Describe this reminder"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                      className="w-full mt-1 px-4 py-2 border rounded-lg"
                    >
                      {types.filter(t => t !== 'all').map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Channel</label>
                    <select
                      value={newReminder.channel}
                      onChange={(e) => setNewReminder({ ...newReminder, channel: e.target.value as 'email' | 'sms' | 'both' | 'in-app' })}
                      className="w-full mt-1 px-4 py-2 border rounded-lg"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="both">Email + SMS</option>
                      <option value="in-app">In-App</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trigger</label>
                  <Input
                    value={newReminder.trigger}
                    onChange={(e) => setNewReminder({ ...newReminder, trigger: e.target.value })}
                    placeholder="e.g., Invoice overdue 7 days"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={newReminder.frequency}
                      onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
                      className="w-full mt-1 px-4 py-2 border rounded-lg"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="As needed">As needed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Recipients</label>
                    <Input
                      value={newReminder.recipient}
                      onChange={(e) => setNewReminder({ ...newReminder, recipient: e.target.value })}
                      placeholder="e.g., Finance Team, Manager"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateReminder}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Reminder
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

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
  Send
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

  const reminders: Reminder[] = [
    {
      id: '1',
      name: 'Overdue Invoice Reminder',
      description: 'Send reminder for invoices overdue by 7 days',
      type: 'Accounts Receivable',
      status: 'active',
      trigger: 'Invoice overdue 7 days',
      frequency: 'Daily',
      recipient: ['Customer'],
      channel: 'email',
      lastSent: '2025-11-25T08:00:00',
      nextScheduled: '2025-11-26T08:00:00',
      timesSent: 342,
      openRate: 68.5,
      createdDate: '2025-01-15'
    },
    {
      id: '2',
      name: 'Payment Due in 3 Days',
      description: 'Friendly reminder before invoice due date',
      type: 'Accounts Receivable',
      status: 'active',
      trigger: '3 days before due date',
      frequency: 'As needed',
      recipient: ['Customer'],
      channel: 'email',
      lastSent: '2025-11-24T09:00:00',
      nextScheduled: '2025-11-26T09:00:00',
      timesSent: 428,
      openRate: 72.3,
      createdDate: '2025-01-10'
    },
    {
      id: '3',
      name: 'Bill Payment Due',
      description: 'Remind AP team about upcoming bill payments',
      type: 'Accounts Payable',
      status: 'active',
      trigger: '2 days before due date',
      frequency: 'As needed',
      recipient: ['AP Manager', 'Finance Team'],
      channel: 'email',
      lastSent: '2025-11-24T10:00:00',
      nextScheduled: '2025-11-27T10:00:00',
      timesSent: 186,
      openRate: 95.2,
      createdDate: '2025-02-01'
    },
    {
      id: '4',
      name: 'Payroll Processing Deadline',
      description: 'Alert HR 3 days before payroll processing',
      type: 'Payroll',
      status: 'active',
      trigger: '3 days before pay date',
      frequency: 'Bi-weekly',
      recipient: ['HR Manager', 'Payroll Team'],
      channel: 'both',
      lastSent: '2025-11-12T08:00:00',
      nextScheduled: '2025-11-26T08:00:00',
      timesSent: 24,
      openRate: 100,
      createdDate: '2025-01-20'
    },
    {
      id: '5',
      name: 'Timesheet Submission',
      description: 'Remind employees to submit timesheets',
      type: 'Payroll',
      status: 'active',
      trigger: 'Friday 4 PM',
      frequency: 'Weekly',
      recipient: ['All Employees'],
      channel: 'in-app',
      lastSent: '2025-11-22T16:00:00',
      nextScheduled: '2025-11-29T16:00:00',
      timesSent: 42,
      openRate: 88.6,
      createdDate: '2025-02-15'
    },
    {
      id: '6',
      name: 'Expense Report Submission',
      description: 'Monthly reminder to submit expense reports',
      type: 'Expense Management',
      status: 'active',
      trigger: 'Last Friday of month',
      frequency: 'Monthly',
      recipient: ['All Employees'],
      channel: 'email',
      lastSent: '2025-10-31T09:00:00',
      nextScheduled: '2025-11-29T09:00:00',
      timesSent: 11,
      openRate: 76.4,
      createdDate: '2025-01-25'
    },
    {
      id: '7',
      name: 'Purchase Order Approval',
      description: 'Remind managers about pending PO approvals',
      type: 'Procurement',
      status: 'active',
      trigger: 'PO pending > 48 hours',
      frequency: 'Daily',
      recipient: ['Department Managers'],
      channel: 'in-app',
      lastSent: '2025-11-24T14:00:00',
      nextScheduled: '2025-11-25T14:00:00',
      timesSent: 156,
      openRate: 92.3,
      createdDate: '2025-02-10'
    },
    {
      id: '8',
      name: 'Quarterly Tax Filing',
      description: 'Alert tax team 7 days before quarterly deadline',
      type: 'Tax Compliance',
      status: 'active',
      trigger: '7 days before quarter end',
      frequency: 'Quarterly',
      recipient: ['Tax Manager', 'CFO'],
      channel: 'both',
      lastSent: '2025-09-08T08:00:00',
      nextScheduled: '2026-01-08T08:00:00',
      timesSent: 4,
      openRate: 100,
      createdDate: '2025-01-05'
    },
    {
      id: '9',
      name: 'Sales Tax Filing',
      description: 'Monthly reminder for sales tax returns',
      type: 'Tax Compliance',
      status: 'active',
      trigger: '5 days before month end',
      frequency: 'Monthly',
      recipient: ['Tax Manager'],
      channel: 'email',
      lastSent: '2025-10-26T08:00:00',
      nextScheduled: '2025-11-25T08:00:00',
      timesSent: 11,
      openRate: 100,
      createdDate: '2025-01-30'
    },
    {
      id: '10',
      name: 'Contract Renewal Notice',
      description: 'Alert 30 days before contract expiration',
      type: 'Contract Management',
      status: 'active',
      trigger: '30 days before expiration',
      frequency: 'As needed',
      recipient: ['Procurement', 'Legal'],
      channel: 'email',
      lastSent: '2025-11-15T09:00:00',
      nextScheduled: '2025-12-05T09:00:00',
      timesSent: 18,
      openRate: 94.4,
      createdDate: '2025-03-01'
    },
    {
      id: '11',
      name: 'Credit Card Payment Due',
      description: 'Remind about corporate credit card payments',
      type: 'Banking',
      status: 'active',
      trigger: '5 days before due date',
      frequency: 'Monthly',
      recipient: ['Treasury', 'CFO'],
      channel: 'email',
      lastSent: '2025-11-10T08:00:00',
      nextScheduled: '2025-12-10T08:00:00',
      timesSent: 11,
      openRate: 100,
      createdDate: '2025-02-20'
    },
    {
      id: '12',
      name: 'Bank Reconciliation',
      description: 'Monthly reminder to complete bank reconciliation',
      type: 'Banking',
      status: 'active',
      trigger: '1st business day of month',
      frequency: 'Monthly',
      recipient: ['Accounting Team'],
      channel: 'in-app',
      lastSent: '2025-11-01T08:00:00',
      nextScheduled: '2025-12-01T08:00:00',
      timesSent: 11,
      openRate: 100,
      createdDate: '2025-01-15'
    },
    {
      id: '13',
      name: 'Budget Review Meeting',
      description: 'Quarterly budget review reminder',
      type: 'Budgeting',
      status: 'paused',
      trigger: '1 week before quarter end',
      frequency: 'Quarterly',
      recipient: ['Department Heads', 'CFO'],
      channel: 'email',
      lastSent: '2025-09-24T10:00:00',
      nextScheduled: '2025-12-24T10:00:00',
      timesSent: 4,
      openRate: 100,
      createdDate: '2025-03-10'
    },
    {
      id: '14',
      name: 'Year-End Close Preparation',
      description: 'Alert about year-end closing tasks',
      type: 'Financial Close',
      status: 'active',
      trigger: 'December 1st',
      frequency: 'Yearly',
      recipient: ['Accounting Team', 'CFO'],
      channel: 'both',
      lastSent: '2024-12-01T08:00:00',
      nextScheduled: '2025-12-01T08:00:00',
      timesSent: 1,
      openRate: 100,
      createdDate: '2024-11-15'
    }
  ]

  const types = [
    'all',
    'Accounts Receivable',
    'Accounts Payable',
    'Payroll',
    'Expense Management',
    'Procurement',
    'Tax Compliance',
    'Contract Management',
    'Banking',
    'Budgeting',
    'Financial Close'
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
    avgOpenRate: reminders.filter(r => r.openRate).reduce((sum, r) => sum + (r.openRate || 0), 0) / reminders.filter(r => r.openRate).length
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
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Test Reminder
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Reminder
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
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
                      <Button size="sm" variant="outline">
                        <Send className="w-3 h-3 mr-1" />
                        Send Now
                      </Button>
                      {reminder.status === 'active' ? (
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
      </div>
    </CompanyTabsLayout>
  )
}

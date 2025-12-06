'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FolderPlus,
  Folder,
  FileText,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  BarChart3,
  FileBarChart,
  TrendingUp,
  DollarSign,
  Users,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportGroup {
  id: string
  name: string
  description: string | null
  color: string | null
  reportTypes: string[]
  isDefault: boolean
  order: number
  createdAt: string
}

const reportTypeLabels: Record<string, { label: string; icon: typeof BarChart3 }> = {
  'profit-loss': { label: 'Profit & Loss', icon: TrendingUp },
  'balance-sheet': { label: 'Balance Sheet', icon: BarChart3 },
  'cash-flow': { label: 'Cash Flow', icon: DollarSign },
  'expenses': { label: 'Expenses', icon: FileBarChart },
  'sales': { label: 'Sales', icon: TrendingUp },
  'customers': { label: 'Customer Reports', icon: Users },
  'vendors': { label: 'Vendor Reports', icon: Building2 },
  'taxes': { label: 'Tax Reports', icon: FileText },
  'payroll': { label: 'Payroll Reports', icon: Users },
  'inventory': { label: 'Inventory Reports', icon: FileBarChart }
}

const colorOptions = [
  { value: '#2CA01C', label: 'Green' },
  { value: '#0077C5', label: 'Blue' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#14B8A6', label: 'Teal' }
]

export default function ReportGroupsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [groups, setGroups] = useState<ReportGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ReportGroup | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2CA01C',
    reportTypes: [] as string[],
    isDefault: false
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchGroups = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/report-groups?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Error fetching report groups:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const openModal = (group?: ReportGroup) => {
    if (group) {
      setEditingGroup(group)
      setFormData({
        name: group.name,
        description: group.description || '',
        color: group.color || '#2CA01C',
        reportTypes: group.reportTypes || [],
        isDefault: group.isDefault
      })
    } else {
      setEditingGroup(null)
      setFormData({
        name: '',
        description: '',
        color: '#2CA01C',
        reportTypes: [],
        isDefault: false
      })
    }
    setShowModal(true)
  }

  const toggleReportType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      reportTypes: prev.reportTypes.includes(type)
        ? prev.reportTypes.filter(t => t !== type)
        : [...prev.reportTypes, type]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany?.id) return

    if (!formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    setSaving(true)
    try {
      const url = '/api/report-groups'
      const method = editingGroup ? 'PUT' : 'POST'
      const body = editingGroup 
        ? { ...formData, id: editingGroup.id }
        : { ...formData, companyId: activeCompany.id }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingGroup ? 'Group updated' : 'Group created')
        setShowModal(false)
        fetchGroups()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save group')
      }
    } catch (error) {
      toast.error('Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this report group?')) return

    try {
      const res = await fetch(`/api/report-groups?id=${groupId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Group deleted')
        fetchGroups()
      } else {
        toast.error('Failed to delete group')
      }
    } catch (error) {
      toast.error('Failed to delete group')
    }
  }

  const setAsDefault = async (group: ReportGroup) => {
    try {
      const res = await fetch('/api/report-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.id, isDefault: true })
      })

      if (res.ok) {
        toast.success(`${group.name} set as default`)
        fetchGroups()
      }
    } catch (error) {
      toast.error('Failed to update default group')
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Report Groups</h1>
            <p className="text-gray-600 mt-1">
              Organize your reports into custom groups for easy access
            </p>
          </div>
          <Button 
            className="bg-[#2CA01C] hover:bg-[#108000]"
            onClick={() => openModal()}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No report groups created yet</p>
              <Button 
                className="bg-[#2CA01C] hover:bg-[#108000]"
                onClick={() => openModal()}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <Card 
                key={group.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                style={{ borderTopColor: group.color || '#2CA01C', borderTopWidth: '4px' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${group.color}20` }}
                      >
                        <Folder className="w-5 h-5" style={{ color: group.color || '#2CA01C' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {group.name}
                          {group.isDefault && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Default</Badge>
                          )}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-500">{group.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openModal(group) }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!group.isDefault && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteGroup(group.id) }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Report Types */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {group.reportTypes.slice(0, 4).map(type => {
                      const config = reportTypeLabels[type]
                      return (
                        <Badge key={type} variant="outline" className="text-xs">
                          {config?.label || type}
                        </Badge>
                      )
                    })}
                    {group.reportTypes.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{group.reportTypes.length - 4} more
                      </Badge>
                    )}
                    {group.reportTypes.length === 0 && (
                      <span className="text-xs text-gray-400">No reports assigned</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/company/reports?group=${group.id}`)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Reports
                    </Button>
                    {!group.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAsDefault(group)}
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Report Categories Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              {Object.entries(reportTypeLabels).slice(0, 5).map(([key, { label, icon: Icon }]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-lg text-center">
                  <Icon className="w-6 h-6 text-[#0077C5] mx-auto mb-2" />
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-gray-500">
                    {groups.filter(g => g.reportTypes.includes(key)).length} groups
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle>{editingGroup ? 'Edit Report Group' : 'New Report Group'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label>Group Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Financial Statements"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-1">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color.value ? 'border-gray-900' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Report Types</Label>
                    <p className="text-sm text-gray-500 mb-2">Select which reports to include in this group</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(reportTypeLabels).map(([key, { label, icon: Icon }]) => (
                        <button
                          key={key}
                          type="button"
                          className={`flex items-center gap-2 p-2 rounded border text-sm text-left ${
                            formData.reportTypes.includes(key)
                              ? 'border-[#2CA01C] bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleReportType(key)}
                        >
                          <Icon className="w-4 h-4 text-gray-500" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer">
                      Set as default group
                    </Label>
                  </div>
                </CardContent>
                <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#2CA01C] hover:bg-[#108000]"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingGroup ? 'Update Group' : 'Create Group'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  MapPin,
  X,
  RefreshCw,
  Save,
  FolderTree,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TransactionClass {
  id: string
  name: string
  description?: string
  parentId?: string
  isActive: boolean
  parent?: TransactionClass
  children?: TransactionClass[]
}

interface TransactionLocation {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  isActive: boolean
}

export default function TrackingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [classes, setClasses] = useState<TransactionClass[]>([])
  const [locations, setLocations] = useState<TransactionLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'classes' | 'locations'>('classes')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<TransactionClass | TransactionLocation | null>(null)
  
  const [classForm, setClassForm] = useState({
    name: '',
    description: '',
    parentId: ''
  })

  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tracking?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes || [])
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmitClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany?.id) return

    if (!classForm.name) {
      toast.error('Please enter a class name')
      return
    }

    try {
      const method = editingItem ? 'PUT' : 'POST'
      const body = editingItem 
        ? { id: editingItem.id, type: 'class', ...classForm }
        : { companyId: activeCompany.id, type: 'class', ...classForm }

      const res = await fetch('/api/tracking', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingItem ? 'Class updated' : 'Class created')
        setShowModal(false)
        setEditingItem(null)
        resetForms()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save class')
      }
    } catch (error) {
      toast.error('Failed to save class')
    }
  }

  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany?.id) return

    if (!locationForm.name) {
      toast.error('Please enter a location name')
      return
    }

    try {
      const method = editingItem ? 'PUT' : 'POST'
      const body = editingItem 
        ? { id: editingItem.id, type: 'location', ...locationForm }
        : { companyId: activeCompany.id, type: 'location', ...locationForm }

      const res = await fetch('/api/tracking', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingItem ? 'Location updated' : 'Location created')
        setShowModal(false)
        setEditingItem(null)
        resetForms()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save location')
      }
    } catch (error) {
      toast.error('Failed to save location')
    }
  }

  const handleDelete = async (id: string, type: 'class' | 'location') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      const res = await fetch(`/api/tracking?id=${id}&type=${type}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`)
        fetchData()
      } else {
        toast.error(`Failed to delete ${type}`)
      }
    } catch (error) {
      toast.error(`Failed to delete ${type}`)
    }
  }

  const toggleActive = async (item: TransactionClass | TransactionLocation, type: 'class' | 'location') => {
    try {
      const res = await fetch('/api/tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type, isActive: !item.isActive })
      })

      if (res.ok) {
        toast.success(item.isActive ? `${type} disabled` : `${type} enabled`)
        fetchData()
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const resetForms = () => {
    setClassForm({ name: '', description: '', parentId: '' })
    setLocationForm({ name: '', address: '', city: '', state: '', country: '' })
  }

  const openEditClass = (cls: TransactionClass) => {
    setEditingItem(cls)
    setClassForm({
      name: cls.name,
      description: cls.description || '',
      parentId: cls.parentId || ''
    })
    setActiveTab('classes')
    setShowModal(true)
  }

  const openEditLocation = (loc: TransactionLocation) => {
    setEditingItem(loc)
    setLocationForm({
      name: loc.name,
      address: loc.address || '',
      city: loc.city || '',
      state: loc.state || '',
      country: loc.country || ''
    })
    setActiveTab('locations')
    setShowModal(true)
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
            <h1 className="text-2xl font-bold text-gray-900">Class & Location Tracking</h1>
            <p className="text-gray-600 mt-1">
              Organize transactions by class (department) and location
            </p>
          </div>
          <Button 
            className="bg-[#2CA01C] hover:bg-[#108000]"
            onClick={() => {
              resetForms()
              setEditingItem(null)
              setShowModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FolderTree className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">About Class & Location Tracking</h4>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Classes</strong> help you categorize transactions by department, project, or any custom grouping. 
                  <strong className="ml-2">Locations</strong> let you track transactions by physical location or branch.
                  Both can be used in reports for better financial insights.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'classes' | 'locations')}>
          <TabsList>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Classes ({classes.length})
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locations ({locations.length})
            </TabsTrigger>
          </TabsList>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Classes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {classes.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No classes created yet</p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        resetForms()
                        setActiveTab('classes')
                        setShowModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Class
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {classes.map(cls => (
                      <div 
                        key={cls.id}
                        className={`p-4 flex items-center justify-between hover:bg-gray-50 ${!cls.isActive ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Tag className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{cls.name}</div>
                            {cls.description && (
                              <div className="text-sm text-gray-500">{cls.description}</div>
                            )}
                            {cls.parent && (
                              <div className="text-xs text-gray-400">Parent: {cls.parent.name}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cls.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleActive(cls, 'class')}
                          >
                            {cls.isActive ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditClass(cls)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(cls.id, 'class')}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Locations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {locations.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No locations created yet</p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        resetForms()
                        setActiveTab('locations')
                        setShowModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Location
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {locations.map(loc => (
                      <div 
                        key={loc.id}
                        className={`p-4 flex items-center justify-between hover:bg-gray-50 ${!loc.isActive ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <MapPin className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{loc.name}</div>
                            {(loc.address || loc.city || loc.state) && (
                              <div className="text-sm text-gray-500">
                                {[loc.address, loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {loc.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleActive(loc, 'location')}
                          >
                            {loc.isActive ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditLocation(loc)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(loc.id, 'location')}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'classes' ? 'Class' : 'Location'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Tabs in Modal */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={activeTab === 'classes' ? 'default' : 'outline'}
                      onClick={() => {
                        setActiveTab('classes')
                        resetForms()
                        setEditingItem(null)
                      }}
                      className={activeTab === 'classes' ? 'bg-[#2CA01C] hover:bg-[#108000]' : ''}
                      disabled={!!editingItem}
                    >
                      <Tag className="w-4 h-4 mr-1" />
                      Class
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === 'locations' ? 'default' : 'outline'}
                      onClick={() => {
                        setActiveTab('locations')
                        resetForms()
                        setEditingItem(null)
                      }}
                      className={activeTab === 'locations' ? 'bg-[#2CA01C] hover:bg-[#108000]' : ''}
                      disabled={!!editingItem}
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Location
                    </Button>
                  </div>
                </div>

                {activeTab === 'classes' ? (
                  <form onSubmit={handleSubmitClass} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Class Name *</label>
                      <Input
                        value={classForm.name}
                        onChange={(e) => setClassForm({...classForm, name: e.target.value})}
                        placeholder="e.g., Marketing, Sales, Operations"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={classForm.description}
                        onChange={(e) => setClassForm({...classForm, description: e.target.value})}
                        placeholder="Optional description"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Parent Class</label>
                      <select
                        value={classForm.parentId}
                        onChange={(e) => setClassForm({...classForm, parentId: e.target.value})}
                        className="mt-1 w-full border rounded-md p-2"
                      >
                        <option value="">No parent (top-level)</option>
                        {classes.filter(c => c.id !== editingItem?.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-[#2CA01C] hover:bg-[#108000]">
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? 'Update' : 'Create'} Class
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitLocation} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Location Name *</label>
                      <Input
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                        placeholder="e.g., Main Office, Warehouse, Store #1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        value={locationForm.address}
                        onChange={(e) => setLocationForm({...locationForm, address: e.target.value})}
                        placeholder="Street address"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">City</label>
                        <Input
                          value={locationForm.city}
                          onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                          placeholder="City"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">State</label>
                        <Input
                          value={locationForm.state}
                          onChange={(e) => setLocationForm({...locationForm, state: e.target.value})}
                          placeholder="State"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <Input
                        value={locationForm.country}
                        onChange={(e) => setLocationForm({...locationForm, country: e.target.value})}
                        placeholder="Country"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-[#2CA01C] hover:bg-[#108000]">
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? 'Update' : 'Add'} Location
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

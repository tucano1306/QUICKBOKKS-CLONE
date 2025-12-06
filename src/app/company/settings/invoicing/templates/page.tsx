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
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Star,
  Eye,
  X,
  RefreshCw,
  Save,
  Palette,
  Type,
  Image,
  Layout,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

interface InvoiceTemplate {
  id: string
  name: string
  isDefault: boolean
  logoUrl?: string
  headerColor: string
  accentColor: string
  fontFamily: string
  showLogo: boolean
  showCompanyAddress: boolean
  showCustomerAddress: boolean
  showDueDate: boolean
  showPaymentTerms: boolean
  showNotes: boolean
  showTaxBreakdown: boolean
  showPaymentInfo: boolean
  footerText?: string
  termsText?: string
  createdAt: string
}

const fontOptions = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Arial', label: 'Arial (Classic)' },
  { value: 'Times New Roman', label: 'Times New Roman (Formal)' },
  { value: 'Georgia', label: 'Georgia (Elegant)' },
  { value: 'Roboto', label: 'Roboto (Clean)' }
]

const colorPresets = [
  { name: 'QuickBooks Green', primary: '#2CA01C', accent: '#0077C5' },
  { name: 'Professional Blue', primary: '#0077C5', accent: '#2CA01C' },
  { name: 'Corporate Gray', primary: '#374151', accent: '#6B7280' },
  { name: 'Elegant Navy', primary: '#0D2942', accent: '#0077C5' },
  { name: 'Modern Teal', primary: '#0D9488', accent: '#14B8A6' }
]

export default function InvoiceTemplatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    isDefault: false,
    headerColor: '#2CA01C',
    accentColor: '#0077C5',
    fontFamily: 'Inter',
    showLogo: true,
    showCompanyAddress: true,
    showCustomerAddress: true,
    showDueDate: true,
    showPaymentTerms: true,
    showNotes: true,
    showTaxBreakdown: true,
    showPaymentInfo: true,
    footerText: 'Thank you for your business!',
    termsText: 'Payment is due within the terms specified above.'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchTemplates = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoice-templates?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany?.id) return

    if (!formData.name) {
      toast.error('Please enter a template name')
      return
    }

    try {
      const method = editingTemplate ? 'PUT' : 'POST'
      const body = editingTemplate 
        ? { id: editingTemplate.id, companyId: activeCompany.id, ...formData }
        : { companyId: activeCompany.id, ...formData }

      const res = await fetch('/api/invoice-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created')
        setShowModal(false)
        setEditingTemplate(null)
        fetchTemplates()
      } else {
        toast.error('Failed to save template')
      }
    } catch (error) {
      toast.error('Failed to save template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const res = await fetch(`/api/invoice-templates?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete template')
      }
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const setAsDefault = async (template: InvoiceTemplate) => {
    try {
      const res = await fetch('/api/invoice-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, companyId: activeCompany?.id, isDefault: true })
      })

      if (res.ok) {
        toast.success('Default template updated')
        fetchTemplates()
      }
    } catch (error) {
      toast.error('Failed to update default')
    }
  }

  const openEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      isDefault: template.isDefault,
      headerColor: template.headerColor,
      accentColor: template.accentColor,
      fontFamily: template.fontFamily,
      showLogo: template.showLogo,
      showCompanyAddress: template.showCompanyAddress,
      showCustomerAddress: template.showCustomerAddress,
      showDueDate: template.showDueDate,
      showPaymentTerms: template.showPaymentTerms,
      showNotes: template.showNotes,
      showTaxBreakdown: template.showTaxBreakdown,
      showPaymentInfo: template.showPaymentInfo,
      footerText: template.footerText || '',
      termsText: template.termsText || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      isDefault: false,
      headerColor: '#2CA01C',
      accentColor: '#0077C5',
      fontFamily: 'Inter',
      showLogo: true,
      showCompanyAddress: true,
      showCustomerAddress: true,
      showDueDate: true,
      showPaymentTerms: true,
      showNotes: true,
      showTaxBreakdown: true,
      showPaymentInfo: true,
      footerText: 'Thank you for your business!',
      termsText: 'Payment is due within the terms specified above.'
    })
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
            <h1 className="text-2xl font-bold text-gray-900">Invoice Templates</h1>
            <p className="text-gray-600 mt-1">
              Customize how your invoices look
            </p>
          </div>
          <Button 
            className="bg-[#2CA01C] hover:bg-[#108000]"
            onClick={() => {
              resetForm()
              setEditingTemplate(null)
              setShowModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className={`relative ${template.isDefault ? 'ring-2 ring-[#2CA01C]' : ''}`}>
              {template.isDefault && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-[#2CA01C]">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                </div>
              )}
              
              {/* Template Preview */}
              <div 
                className="h-40 rounded-t-lg p-4 relative overflow-hidden"
                style={{ backgroundColor: template.headerColor }}
              >
                <div className="bg-white/90 rounded-lg p-3 h-full">
                  <div className="flex justify-between mb-2">
                    <div 
                      className="w-16 h-4 rounded"
                      style={{ backgroundColor: template.headerColor }}
                    />
                    <div className="text-right">
                      <div className="text-xs text-gray-400">INVOICE</div>
                      <div className="text-sm font-bold" style={{ color: template.accentColor }}>#INV-001</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div 
                      className="h-6 w-16 rounded text-xs flex items-center justify-center text-white"
                      style={{ backgroundColor: template.accentColor }}
                    >
                      $0.00
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: template.headerColor }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: template.accentColor }}
                    />
                  </div>
                  <span>{template.fontFamily}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEdit(template)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAsDefault(template)}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
            <Card className="w-full max-w-2xl mx-4 my-8" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Template Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Professional Blue"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Colors
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {colorPresets.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                            formData.headerColor === preset.primary ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setFormData({...formData, headerColor: preset.primary, accentColor: preset.accent})}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Header Color</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={formData.headerColor}
                            onChange={(e) => setFormData({...formData, headerColor: e.target.value})}
                            className="w-10 h-8 rounded cursor-pointer"
                          />
                          <Input
                            value={formData.headerColor}
                            onChange={(e) => setFormData({...formData, headerColor: e.target.value})}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accent Color</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={formData.accentColor}
                            onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                            className="w-10 h-8 rounded cursor-pointer"
                          />
                          <Input
                            value={formData.accentColor}
                            onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Font Family
                    </label>
                    <select
                      value={formData.fontFamily}
                      onChange={(e) => setFormData({...formData, fontFamily: e.target.value})}
                      className="mt-1 w-full border rounded-md p-2"
                    >
                      {fontOptions.map(font => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sections */}
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      Sections to Show
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {[
                        { key: 'showLogo', label: 'Company Logo' },
                        { key: 'showCompanyAddress', label: 'Company Address' },
                        { key: 'showCustomerAddress', label: 'Customer Address' },
                        { key: 'showDueDate', label: 'Due Date' },
                        { key: 'showPaymentTerms', label: 'Payment Terms' },
                        { key: 'showTaxBreakdown', label: 'Tax Breakdown' },
                        { key: 'showNotes', label: 'Notes Section' },
                        { key: 'showPaymentInfo', label: 'Payment Info' }
                      ].map(section => (
                        <label key={section.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={formData[section.key as keyof typeof formData] as boolean}
                            onCheckedChange={(checked) => setFormData({...formData, [section.key]: checked})}
                          />
                          <span className="text-sm">{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Footer Text</label>
                      <Input
                        value={formData.footerText}
                        onChange={(e) => setFormData({...formData, footerText: e.target.value})}
                        placeholder="Thank you for your business!"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Terms Text</label>
                      <Input
                        value={formData.termsText}
                        onChange={(e) => setFormData({...formData, termsText: e.target.value})}
                        placeholder="Payment terms..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Set as default */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({...formData, isDefault: !!checked})}
                    />
                    <span className="text-sm font-medium">Set as default template</span>
                  </label>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-[#2CA01C] hover:bg-[#108000]">
                      <Save className="w-4 h-4 mr-2" />
                      {editingTemplate ? 'Update Template' : 'Create Template'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewTemplate(null)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Preview: {previewTemplate.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Invoice Preview */}
                <div 
                  className="border rounded-lg overflow-hidden"
                  style={{ fontFamily: previewTemplate.fontFamily }}
                >
                  {/* Header */}
                  <div 
                    className="p-6 text-white"
                    style={{ backgroundColor: previewTemplate.headerColor }}
                  >
                    <div className="flex justify-between items-start">
                      {previewTemplate.showLogo && (
                        <div className="w-20 h-10 bg-white/20 rounded flex items-center justify-center text-xs">
                          LOGO
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-2xl font-bold">INVOICE</div>
                        <div className="text-white/80">#INV-2025-001</div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {previewTemplate.showCompanyAddress && (
                        <div>
                          <div className="font-semibold mb-1">From:</div>
                          <div className="text-sm text-gray-600">
                            Your Company Name<br />
                            123 Business St<br />
                            Miami, FL 33101
                          </div>
                        </div>
                      )}
                      {previewTemplate.showCustomerAddress && (
                        <div>
                          <div className="font-semibold mb-1">Bill To:</div>
                          <div className="text-sm text-gray-600">
                            Customer Name<br />
                            456 Client Ave<br />
                            New York, NY 10001
                          </div>
                        </div>
                      )}
                    </div>

                    {previewTemplate.showDueDate && (
                      <div className="flex gap-6 text-sm">
                        <div><span className="text-gray-500">Date:</span> Dec 6, 2025</div>
                        <div><span className="text-gray-500">Due Date:</span> Jan 5, 2026</div>
                        {previewTemplate.showPaymentTerms && (
                          <div><span className="text-gray-500">Terms:</span> Net 30</div>
                        )}
                      </div>
                    )}

                    {/* Items Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: previewTemplate.accentColor + '20' }}>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Rate</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">Professional Services</td>
                          <td className="text-right p-2">10</td>
                          <td className="text-right p-2">$100.00</td>
                          <td className="text-right p-2">$1,000.00</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-64 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>$1,000.00</span>
                        </div>
                        {previewTemplate.showTaxBreakdown && (
                          <div className="flex justify-between">
                            <span>Tax (7%):</span>
                            <span>$70.00</span>
                          </div>
                        )}
                        <div 
                          className="flex justify-between font-bold p-2 rounded"
                          style={{ backgroundColor: previewTemplate.accentColor + '20', color: previewTemplate.accentColor }}
                        >
                          <span>Total:</span>
                          <span>$1,070.00</span>
                        </div>
                      </div>
                    </div>

                    {previewTemplate.showNotes && (
                      <div className="text-sm">
                        <div className="font-semibold mb-1">Notes:</div>
                        <div className="text-gray-600">Thank you for your business!</div>
                      </div>
                    )}

                    {previewTemplate.showPaymentInfo && (
                      <div 
                        className="text-sm p-3 rounded"
                        style={{ backgroundColor: previewTemplate.headerColor + '10' }}
                      >
                        <div className="font-semibold mb-1">Payment Information:</div>
                        <div className="text-gray-600">Bank: Example Bank • Account: XXXX1234</div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {(previewTemplate.footerText || previewTemplate.termsText) && (
                    <div 
                      className="p-4 text-center text-sm text-white/90"
                      style={{ backgroundColor: previewTemplate.headerColor }}
                    >
                      {previewTemplate.footerText}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={() => setPreviewTemplate(null)}>
                    Close Preview
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

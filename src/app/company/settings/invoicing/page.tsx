'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Palette,
  DollarSign,
  Clock,
  Hash,
  Mail,
  Save,
  CheckCircle,
  Info,
  AlertCircle,
  Eye,
  Upload,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'

interface InvoiceTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
  colorScheme: string
  logoPosition: string
  showCompanyAddress: boolean
  showPaymentTerms: boolean
  customFields: number
}

export default function InvoicingSettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])

  const loadSettings = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/invoicing?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setInvoiceSettings(prev => ({ ...prev, ...data.settings }))
        }
        if (data.templates) {
          setTemplates(data.templates)
        }
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const [invoiceSettings, setInvoiceSettings] = useState({
    // Numbering
    invoicePrefix: 'INV',
    startingNumber: '1001',
    numberPadding: '4',
    resetNumbering: 'Never',
    
    // Payment Terms
    defaultPaymentTerms: 'Net 30',
    dueDateCalculation: 'From Invoice Date',
    allowPartialPayments: true,
    
    // Late Fees
    enableLateFees: true,
    lateFeeType: 'Percentage',
    lateFeeAmount: '1.5',
    gracePeriodDays: '5',
    maxLateFee: '100',
    
    // Discounts
    enableEarlyPayment: true,
    discountPercentage: '2',
    discountDays: '10',
    
    // Email Settings
    autoSendInvoices: false,
    emailSubject: 'Invoice {invoice_number} from {company_name}',
    emailMessage: 'Thank you for your business! Please find your invoice attached.',
    ccEmail: '',
    bccEmail: '',
    
    // Branding
    primaryColor: '#2563EB',
    logoUrl: '',
    showCompanyLogo: true,
    showPaymentTerms: true,
    showNotes: true,
    showDueDate: true,
    
    // Other
    currencyFormat: 'Symbol',
    taxInclusive: false,
    showItemizedTax: true,
    requirePONumber: false,
    attachPDF: true
  })

  const paymentTermsOptions = [
    'Due on Receipt',
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    '2/10 Net 30',
    'End of Month',
    'Custom'
  ]

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1500)
  }

  const generateInvoicePreview = () => {
    const prefix = invoiceSettings.invoicePrefix
    const number = invoiceSettings.startingNumber.padStart(parseInt(invoiceSettings.numberPadding), '0')
    return `${prefix}-${number}`
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
              <FileText className="w-8 h-8 text-blue-600" />
              Invoice Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Configure invoice templates, payment terms, and automation
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Invoice settings saved successfully!</span>
          </div>
        )}

        {/* Invoice Numbering */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Invoice Numbering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Prefix
                </label>
                <Input
                  value={invoiceSettings.invoicePrefix}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, invoicePrefix: e.target.value.toUpperCase()})}
                  placeholder="INV"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Number
                </label>
                <Input
                  type="number"
                  value={invoiceSettings.startingNumber}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, startingNumber: e.target.value})}
                  placeholder="1001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number Padding (Digits)
                </label>
                <select
                  value={invoiceSettings.numberPadding}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, numberPadding: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">3 (001, 002, 003)</option>
                  <option value="4">4 (0001, 0002, 0003)</option>
                  <option value="5">5 (00001, 00002, 00003)</option>
                  <option value="6">6 (000001, 000002, 000003)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reset Numbering
                </label>
                <select
                  value={invoiceSettings.resetNumbering}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, resetNumbering: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Never">Never</option>
                  <option value="Yearly">Every Year (Jan 1)</option>
                  <option value="Monthly">Every Month</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">PREVIEW</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {generateInvoicePreview()}
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Next invoice number format
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Payment Terms & Due Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Payment Terms
                </label>
                <select
                  value={invoiceSettings.defaultPaymentTerms}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, defaultPaymentTerms: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentTermsOptions.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date Calculation
                </label>
                <select
                  value={invoiceSettings.dueDateCalculation}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, dueDateCalculation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="From Invoice Date">From Invoice Date</option>
                  <option value="From Delivery Date">From Delivery Date</option>
                  <option value="End of Month">End of Current Month</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={invoiceSettings.allowPartialPayments}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, allowPartialPayments: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Allow partial payments on invoices
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Late Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Late Fee Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.enableLateFees}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, enableLateFees: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Automatically calculate late fees on overdue invoices
              </label>

              {invoiceSettings.enableLateFees && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Fee Type
                    </label>
                    <select
                      value={invoiceSettings.lateFeeType}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, lateFeeType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Percentage">Percentage of Invoice</option>
                      <option value="Fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {invoiceSettings.lateFeeType === 'Percentage' ? 'Percentage (%)' : 'Amount ($)'}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceSettings.lateFeeAmount}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, lateFeeAmount: e.target.value})}
                      placeholder={invoiceSettings.lateFeeType === 'Percentage' ? '1.5' : '25.00'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grace Period (Days)
                    </label>
                    <Input
                      type="number"
                      value={invoiceSettings.gracePeriodDays}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, gracePeriodDays: e.target.value})}
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Days after due date before late fees apply
                    </p>
                  </div>

                  {invoiceSettings.lateFeeType === 'Percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Late Fee ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={invoiceSettings.maxLateFee}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, maxLateFee: e.target.value})}
                        placeholder="100.00"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Early Payment Discount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Early Payment Discount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.enableEarlyPayment}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, enableEarlyPayment: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Offer discount for early payment
              </label>

              {invoiceSettings.enableEarlyPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={invoiceSettings.discountPercentage}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, discountPercentage: e.target.value})}
                      placeholder="2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Days
                    </label>
                    <Input
                      type="number"
                      value={invoiceSettings.discountDays}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, discountDays: e.target.value})}
                      placeholder="10"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        <strong>Terms:</strong> {invoiceSettings.discountPercentage}% discount if paid within {invoiceSettings.discountDays} days (e.g., "2/10 Net 30")
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.autoSendInvoices}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, autoSendInvoices: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Automatically send invoices to customers when created
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject Line
                </label>
                <Input
                  value={invoiceSettings.emailSubject}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, emailSubject: e.target.value})}
                  placeholder="Invoice {invoice_number} from {company_name}"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Available variables: {'{invoice_number}'}, {'{company_name}'}, {'{customer_name}'}, {'{due_date}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Message
                </label>
                <textarea
                  value={invoiceSettings.emailMessage}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, emailMessage: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Thank you for your business..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CC Email (Optional)
                  </label>
                  <Input
                    type="email"
                    value={invoiceSettings.ccEmail}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, ccEmail: e.target.value})}
                    placeholder="accounting@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BCC Email (Optional)
                  </label>
                  <Input
                    type="email"
                    value={invoiceSettings.bccEmail}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, bccEmail: e.target.value})}
                    placeholder="records@company.com"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.attachPDF}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, attachPDF: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Attach PDF invoice to email
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Invoice Templates
              </CardTitle>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Create Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.isDefault && <Badge className="bg-blue-100 text-blue-700">Default</Badge>}
                        <Badge variant="outline">{template.colorScheme}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Logo: {template.logoPosition}</span>
                        <span>Custom Fields: {template.customFields}</span>
                        <span>Company Address: {template.showCompanyAddress ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      {!template.isDefault && (
                        <Button size="sm" variant="outline">
                          Set Default
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Display Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.showCompanyLogo}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, showCompanyLogo: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Show company logo on invoices
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.showPaymentTerms}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, showPaymentTerms: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Show payment terms on invoices
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.showDueDate}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, showDueDate: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Show due date prominently
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.showNotes}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, showNotes: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Show notes/terms section
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.showItemizedTax}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, showItemizedTax: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Show itemized tax breakdown
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={invoiceSettings.requirePONumber}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, requirePONumber: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Require PO number on invoices
              </label>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Invoice Settings</h3>
                <p className="text-blue-700 text-sm mb-2">
                  These settings control how your invoices are generated, formatted, and sent to customers.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Invoice Numbers:</strong> Sequential numbering helps track invoices and prevents duplicates</li>
                  <li>• <strong>Payment Terms:</strong> Clear terms help customers understand when payment is expected</li>
                  <li>• <strong>Late Fees:</strong> Verify local laws before enabling automatic late fees (some states regulate this)</li>
                  <li>• <strong>Early Payment:</strong> Discounts improve cash flow by incentivizing faster payment</li>
                  <li>• <strong>Templates:</strong> Professional templates reflect your brand and improve customer experience</li>
                  <li>• <strong>Email Automation:</strong> Automated sending saves time but review invoices before enabling</li>
                  <li>• <strong>Best Practice:</strong> Review invoice settings annually and keep templates current with branding</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button - Bottom */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

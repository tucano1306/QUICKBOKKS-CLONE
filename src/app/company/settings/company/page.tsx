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
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  FileText,
  Hash,
  DollarSign,
  Users,
  Save,
  CheckCircle,
  Info,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react'

interface CompanyInfo {
  legalName: string
  dbaName: string
  ein: string
  businessType: string
  incorporationDate: string
  fiscalYearEnd: string
  address1: string
  address2: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  email: string
  website: string
  industry: string
  employees: string
  annualRevenue: string
  logoUrl?: string
}

export default function CompanySettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    legalName: '',
    dbaName: '',
    ein: '',
    businessType: 'LLC',
    incorporationDate: '',
    fiscalYearEnd: '12-31',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: '',
    email: '',
    website: '',
    industry: 'Professional Services',
    employees: '1-10',
    annualRevenue: '$0-$100K'
  })

  const [taxSettings, setTaxSettings] = useState({
    federalTaxId: '',
    stateTaxId: '',
    salesTaxNumber: '',
    useAccrualBasis: true,
    taxFilingFrequency: 'Quarterly',
    salesTaxRate: '7.0',
    nexusStates: [] as string[]
  })

  const loadCompanyData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      // Load company data from activeCompany context
      setCompanyInfo(prev => ({
        ...prev,
        legalName: activeCompany.legalName || activeCompany.name || '',
        dbaName: activeCompany.name || '',
        ein: activeCompany.taxId || '',
        industry: activeCompany.industry || 'Professional Services',
      }))
      setTaxSettings(prev => ({
        ...prev,
        federalTaxId: activeCompany.taxId || ''
      }))
    } catch (error) {
      console.error('Error loading company data:', error)
    }
    setLoading(false)
  }, [activeCompany])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  const handleSave = async () => {
    if (!activeCompany?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/companies/${activeCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyInfo.dbaName,
          legalName: companyInfo.legalName,
          taxId: companyInfo.ein,
          industry: companyInfo.industry,
          website: companyInfo.website,
          address: companyInfo.address1,
          city: companyInfo.city,
          state: companyInfo.state,
          zipCode: companyInfo.zipCode,
          phone: companyInfo.phone,
          email: companyInfo.email
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving company:', error)
    }
    setSaving(false)
  }

  const businessTypes = [
    'Sole Proprietorship',
    'Partnership',
    'LLC',
    'S Corporation',
    'C Corporation',
    'Non-Profit'
  ]

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  const industries = [
    'Professional Services',
    'Retail',
    'Manufacturing',
    'Technology',
    'Healthcare',
    'Construction',
    'Real Estate',
    'Hospitality',
    'Education',
    'Other'
  ]

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
              <Building2 className="w-8 h-8 text-blue-600" />
              Company Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your company profile and business information
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
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Settings saved successfully!</span>
          </div>
        )}

        {/* Company Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Upload your company logo. Recommended size: 512x512px, PNG or JPG format.
                </p>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Name *
                </label>
                <Input
                  value={companyInfo.legalName}
                  onChange={(e) => setCompanyInfo({...companyInfo, legalName: e.target.value})}
                  placeholder="Full legal business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DBA Name (Doing Business As)
                </label>
                <Input
                  value={companyInfo.dbaName}
                  onChange={(e) => setCompanyInfo({...companyInfo, dbaName: e.target.value})}
                  placeholder="Trade name or brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  value={companyInfo.businessType}
                  onChange={(e) => setCompanyInfo({...companyInfo, businessType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  value={companyInfo.industry}
                  onChange={(e) => setCompanyInfo({...companyInfo, industry: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incorporation Date *
                </label>
                <Input
                  type="date"
                  value={companyInfo.incorporationDate}
                  onChange={(e) => setCompanyInfo({...companyInfo, incorporationDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year End * (MM-DD)
                </label>
                <Input
                  value={companyInfo.fiscalYearEnd}
                  onChange={(e) => setCompanyInfo({...companyInfo, fiscalYearEnd: e.target.value})}
                  placeholder="12-31"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Employees
                </label>
                <select
                  value={companyInfo.employees}
                  onChange={(e) => setCompanyInfo({...companyInfo, employees: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1-10">1-10</option>
                  <option value="11-25">11-25</option>
                  <option value="26-50">26-50</option>
                  <option value="50-100">50-100</option>
                  <option value="100-250">100-250</option>
                  <option value="250+">250+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Revenue
                </label>
                <select
                  value={companyInfo.annualRevenue}
                  onChange={(e) => setCompanyInfo({...companyInfo, annualRevenue: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="$0-$100K">$0-$100K</option>
                  <option value="$100K-$500K">$100K-$500K</option>
                  <option value="$500K-$1M">$500K-$1M</option>
                  <option value="$1M-$5M">$1M-$5M</option>
                  <option value="$5M-$10M">$5M-$10M</option>
                  <option value="$10M+">$10M+</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tax Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Federal Tax ID (EIN) *
                </label>
                <Input
                  value={taxSettings.federalTaxId}
                  onChange={(e) => setTaxSettings({...taxSettings, federalTaxId: e.target.value})}
                  placeholder="12-3456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State Tax ID
                </label>
                <Input
                  value={taxSettings.stateTaxId}
                  onChange={(e) => setTaxSettings({...taxSettings, stateTaxId: e.target.value})}
                  placeholder="FL-987654321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Tax Number
                </label>
                <Input
                  value={taxSettings.salesTaxNumber}
                  onChange={(e) => setTaxSettings({...taxSettings, salesTaxNumber: e.target.value})}
                  placeholder="FL-ST-2024-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Sales Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxSettings.salesTaxRate}
                  onChange={(e) => setTaxSettings({...taxSettings, salesTaxRate: e.target.value})}
                  placeholder="7.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accounting Method *
                </label>
                <select
                  value={taxSettings.useAccrualBasis ? 'Accrual' : 'Cash'}
                  onChange={(e) => setTaxSettings({...taxSettings, useAccrualBasis: e.target.value === 'Accrual'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Accrual">Accrual Basis</option>
                  <option value="Cash">Cash Basis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Filing Frequency
                </label>
                <select
                  value={taxSettings.taxFilingFrequency}
                  onChange={(e) => setTaxSettings({...taxSettings, taxFilingFrequency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Tax Nexus States
              </label>
              <div className="flex flex-wrap gap-2">
                {taxSettings.nexusStates.map((state, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-700">{state}</Badge>
                ))}
                <Button size="sm" variant="outline">+ Add State</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number *
                </label>
                <Input
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                  placeholder="info@company.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <Input
                  value={companyInfo.website}
                  onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <Input
                  value={companyInfo.address1}
                  onChange={(e) => setCompanyInfo({...companyInfo, address1: e.target.value})}
                  placeholder="1234 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <Input
                  value={companyInfo.address2}
                  onChange={(e) => setCompanyInfo({...companyInfo, address2: e.target.value})}
                  placeholder="Suite, Unit, Building, Floor"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <Input
                    value={companyInfo.city}
                    onChange={(e) => setCompanyInfo({...companyInfo, city: e.target.value})}
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={companyInfo.state}
                    onChange={(e) => setCompanyInfo({...companyInfo, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <Input
                    value={companyInfo.zipCode}
                    onChange={(e) => setCompanyInfo({...companyInfo, zipCode: e.target.value})}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <Input
                  value={companyInfo.country}
                  onChange={(e) => setCompanyInfo({...companyInfo, country: e.target.value})}
                  placeholder="United States"
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-600 rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Important Tax and Legal Notice</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• <strong>EIN Verification:</strong> Ensure your Federal Tax ID (EIN) is correct. This is used for all tax reporting and filings.</li>
                  <li>• <strong>Fiscal Year:</strong> Changing fiscal year end may have tax implications. Consult with your accountant before modifying.</li>
                  <li>• <strong>Accounting Method:</strong> Accrual vs Cash basis affects how revenue and expenses are recognized for tax purposes.</li>
                  <li>• <strong>Sales Tax Nexus:</strong> You must collect and remit sales tax in states where you have nexus (physical presence or economic activity).</li>
                  <li>• <strong>Legal Name:</strong> Must match your business registration documents and tax filings exactly.</li>
                  <li>• <strong>State Requirements:</strong> Some states require additional registrations for business operations.</li>
                </ul>
              </div>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Company Settings</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Your company settings are used throughout the system for reports, invoices, tax calculations, and compliance.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Required Fields:</strong> Fields marked with * are required for basic system operation</li>
                  <li>• <strong>Invoice Headers:</strong> Company name and address appear on all customer invoices</li>
                  <li>• <strong>Tax Calculations:</strong> Your tax settings determine how sales tax is calculated and applied</li>
                  <li>• <strong>Fiscal Reporting:</strong> Fiscal year end determines your annual reporting period</li>
                  <li>• <strong>Multi-State Operations:</strong> Add all states where you have sales tax obligations</li>
                  <li>• <strong>Security:</strong> Changes to company settings are logged in the audit trail</li>
                  <li>• <strong>Best Practice:</strong> Review and update company information annually or when changes occur</li>
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

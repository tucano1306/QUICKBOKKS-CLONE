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
  Settings,
  Bell,
  Globe,
  Calendar,
  DollarSign,
  FileText,
  Save,
  CheckCircle,
  Info,
  Monitor,
  Palette,
  Clock,
  Mail
} from 'lucide-react'

export default function PreferencesSettingsPage() {
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

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 500)
  }, [])

  const [preferences, setPreferences] = useState({
    // Regional
    language: 'English (US)',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    firstDayOfWeek: 'Sunday',
    
    // Number Formatting
    numberFormat: '1,234.56',
    currencyDisplay: 'Symbol',
    negativeNumbers: '(1,234.56)',
    percentDisplay: '12.34%',
    
    // Notifications
    emailNotifications: true,
    invoiceReminders: true,
    paymentConfirmations: true,
    expenseApprovals: true,
    systemUpdates: false,
    securityAlerts: true,
    weeklyDigest: true,
    monthlyReports: true,
    
    // Display
    theme: 'Light',
    compactView: false,
    showCents: true,
    colorCodeAccounts: true,
    sidebarCollapsed: false,
    
    // Accounting
    defaultPaymentMethod: 'Credit Card',
    defaultPaymentTerms: 'Net 30',
    defaultTaxRate: '7.0',
    autoSaveEntries: true,
    warnBeforeDelete: true
  })

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1500)
  }

  const languages = [
    'English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Portuguese', 'Italian'
  ]

  const timezones = [
    'America/New_York (EST/EDT)',
    'America/Chicago (CST/CDT)',
    'America/Denver (MST/MDT)',
    'America/Los_Angeles (PST/PDT)',
    'America/Anchorage (AKST/AKDT)',
    'Pacific/Honolulu (HST)',
    'Europe/London (GMT/BST)',
    'Europe/Paris (CET/CEST)',
    'Asia/Tokyo (JST)',
    'Australia/Sydney (AEST/AEDT)'
  ]

  const dateFormats = [
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'MMM DD, YYYY',
    'DD MMM YYYY'
  ]

  const numberFormats = [
    { value: '1,234.56', label: '1,234.56 (US)' },
    { value: '1.234,56', label: '1.234,56 (Europe)' },
    { value: '1 234.56', label: '1 234.56 (International)' },
    { value: '1234.56', label: '1234.56 (No separators)' }
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
              <Settings className="w-8 h-8 text-blue-600" />
              Preferences
            </h1>
            <p className="text-gray-600 mt-1">
              Customize your system preferences and display settings
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
                Save Preferences
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Preferences saved successfully!</span>
          </div>
        )}

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional & Language Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timezones.map(tz => {
                    const value = tz.split(' ')[0]
                    return <option key={value} value={value}>{tz}</option>
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => setPreferences({...preferences, dateFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dateFormats.map(format => (
                    <option key={format} value={format}>
                      {format} (e.g., {new Date().toLocaleDateString('en-US')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Format
                </label>
                <select
                  value={preferences.timeFormat}
                  onChange={(e) => setPreferences({...preferences, timeFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="12-hour">12-hour (3:30 PM)</option>
                  <option value="24-hour">24-hour (15:30)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Day of Week
                </label>
                <select
                  value={preferences.firstDayOfWeek}
                  onChange={(e) => setPreferences({...preferences, firstDayOfWeek: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Number Formatting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Number & Currency Formatting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number Format
                </label>
                <select
                  value={preferences.numberFormat}
                  onChange={(e) => setPreferences({...preferences, numberFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {numberFormats.map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Display
                </label>
                <select
                  value={preferences.currencyDisplay}
                  onChange={(e) => setPreferences({...preferences, currencyDisplay: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Symbol">Symbol ($1,234.56)</option>
                  <option value="Code">Code (USD 1,234.56)</option>
                  <option value="Name">Name (US Dollar 1,234.56)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Negative Numbers
                </label>
                <select
                  value={preferences.negativeNumbers}
                  onChange={(e) => setPreferences({...preferences, negativeNumbers: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="(1,234.56)">(1,234.56) - Parentheses</option>
                  <option value="-1,234.56">-1,234.56 - Minus sign</option>
                  <option value="1,234.56-">1,234.56- - Trailing minus</option>
                  <option value="1,234.56 CR">1,234.56 CR - Credit notation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percent Display
                </label>
                <select
                  value={preferences.percentDisplay}
                  onChange={(e) => setPreferences({...preferences, percentDisplay: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="12.34%">12.34% - 2 decimals</option>
                  <option value="12.3%">12.3% - 1 decimal</option>
                  <option value="12%">12% - No decimals</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.showCents}
                    onChange={(e) => setPreferences({...preferences, showCents: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Always show cents/decimals (e.g., $100.00 instead of $100)
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive email notifications for important events</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pl-6 space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.invoiceReminders}
                    onChange={(e) => setPreferences({...preferences, invoiceReminders: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Invoice payment reminders and overdue notices
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.paymentConfirmations}
                    onChange={(e) => setPreferences({...preferences, paymentConfirmations: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Payment confirmations and receipts
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.expenseApprovals}
                    onChange={(e) => setPreferences({...preferences, expenseApprovals: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Expense approval requests and status updates
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.securityAlerts}
                    onChange={(e) => setPreferences({...preferences, securityAlerts: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Security alerts and suspicious activity (Recommended)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.weeklyDigest}
                    onChange={(e) => setPreferences({...preferences, weeklyDigest: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Weekly activity digest (Sundays)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.monthlyReports}
                    onChange={(e) => setPreferences({...preferences, monthlyReports: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  Monthly financial summary reports
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.systemUpdates}
                    onChange={(e) => setPreferences({...preferences, systemUpdates: e.target.checked})}
                    disabled={!preferences.emailNotifications}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  System updates and new feature announcements
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Display Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={preferences.theme}
                  onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Light">Light Mode</option>
                  <option value="Dark">Dark Mode</option>
                  <option value="Auto">Auto (System Default)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={preferences.compactView}
                  onChange={(e) => setPreferences({...preferences, compactView: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Compact view (Show more data in less space)
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={preferences.colorCodeAccounts}
                  onChange={(e) => setPreferences({...preferences, colorCodeAccounts: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Color-code accounts and categories
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={preferences.sidebarCollapsed}
                  onChange={(e) => setPreferences({...preferences, sidebarCollapsed: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Collapse sidebar by default
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Accounting Defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Payment Method
                </label>
                <select
                  value={preferences.defaultPaymentMethod}
                  onChange={(e) => setPreferences({...preferences, defaultPaymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="Wire">Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Payment Terms
                </label>
                <select
                  value={preferences.defaultPaymentTerms}
                  onChange={(e) => setPreferences({...preferences, defaultPaymentTerms: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="2/10 Net 30">2/10 Net 30 (2% discount if paid within 10 days)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={preferences.defaultTaxRate}
                  onChange={(e) => setPreferences({...preferences, defaultTaxRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="7.0"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.autoSaveEntries}
                    onChange={(e) => setPreferences({...preferences, autoSaveEntries: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Auto-save entries as I work (Recommended)
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={preferences.warnBeforeDelete}
                    onChange={(e) => setPreferences({...preferences, warnBeforeDelete: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Warn before deleting transactions (Recommended)
                </label>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Preferences</h3>
                <p className="text-blue-700 text-sm mb-2">
                  These preferences control how data is displayed and how the system behaves. Changes apply immediately after saving.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Regional Settings:</strong> Affect how dates, times, and numbers are formatted throughout the system</li>
                  <li>• <strong>Notifications:</strong> Control which email notifications you receive and when</li>
                  <li>• <strong>Display:</strong> Customize the look and feel of your interface</li>
                  <li>• <strong>Defaults:</strong> Pre-populate forms with your most common choices to save time</li>
                  <li>• <strong>User-Specific:</strong> These preferences are tied to your user account, not the company</li>
                  <li>• <strong>Override:</strong> You can override defaults on individual transactions as needed</li>
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
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

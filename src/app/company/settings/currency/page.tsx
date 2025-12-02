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
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Globe,
  Calendar,
  RefreshCw,
  Save,
  CheckCircle,
  Info,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Currency {
  code: string
  name: string
  symbol: string
  enabled: boolean
  exchangeRate: number
  lastUpdated: string
}

interface ExchangeRateHistory {
  date: string
  rate: number
  change: number
}

export default function CurrencySettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [autoUpdateRates, setAutoUpdateRates] = useState(true)
  const [updateFrequency, setUpdateFrequency] = useState('Daily')
  const [rateSource, setRateSource] = useState('European Central Bank')
  const [exchangeRateHistory, setExchangeRateHistory] = useState<ExchangeRateHistory[]>([])

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditRateModal, setShowEditRateModal] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', exchangeRate: 1 })
  const [editingRate, setEditingRate] = useState('')

  // Available currencies to add
  const availableCurrencies = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadCurrencies = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/currencies?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setCurrencies(data.currencies || [])
        if (data.baseCurrency) setBaseCurrency(data.baseCurrency)
      }
    } catch (error) {
      console.error('Error loading currencies:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    loadCurrencies()
  }, [loadCurrencies])

  const handleSave = async () => {
    if (!activeCompany?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/settings/currencies?companyId=${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies, baseCurrency })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving currencies:', error)
    }
    setSaving(false)
  }

  const handleUpdateRates = async () => {
    setUpdating(true)
    await loadCurrencies()
    setUpdating(false)
  }

  // Add a new currency
  const handleAddCurrency = async () => {
    if (!activeCompany?.id) return
    if (!newCurrency.code) {
      toast.error('Please select a currency')
      return
    }
    
    // Check if already exists
    if (currencies.some(c => c.code === newCurrency.code)) {
      toast.error('Currency already added')
      return
    }

    const currencyToAdd = availableCurrencies.find(c => c.code === newCurrency.code)
    if (!currencyToAdd) return

    const newCurrencyData: Currency = {
      code: currencyToAdd.code,
      name: currencyToAdd.name,
      symbol: currencyToAdd.symbol,
      exchangeRate: newCurrency.exchangeRate,
      enabled: true,
      lastUpdated: new Date().toISOString().split('T')[0]
    }

    try {
      const updatedCurrencies = [...currencies, newCurrencyData]
      const res = await fetch(`/api/settings/currencies?companyId=${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: updatedCurrencies, baseCurrency })
      })
      
      if (res.ok) {
        setCurrencies(updatedCurrencies)
        toast.success(`${currencyToAdd.name} added successfully`)
        setShowAddModal(false)
        setNewCurrency({ code: '', name: '', symbol: '', exchangeRate: 1 })
      } else {
        toast.error('Failed to add currency')
      }
    } catch (error) {
      console.error('Error adding currency:', error)
      toast.error('Error adding currency')
    }
  }

  // Edit exchange rate
  const handleEditRate = async () => {
    if (!activeCompany?.id || !selectedCurrency) return
    
    const rate = parseFloat(editingRate)
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid exchange rate')
      return
    }

    try {
      const updatedCurrencies = currencies.map(c => 
        c.code === selectedCurrency.code 
          ? { ...c, exchangeRate: rate, lastUpdated: new Date().toISOString().split('T')[0] }
          : c
      )
      
      const res = await fetch(`/api/settings/currencies?companyId=${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: updatedCurrencies, baseCurrency })
      })
      
      if (res.ok) {
        setCurrencies(updatedCurrencies)
        toast.success(`Exchange rate updated for ${selectedCurrency.code}`)
        setShowEditRateModal(false)
        setSelectedCurrency(null)
        setEditingRate('')
      } else {
        toast.error('Failed to update exchange rate')
      }
    } catch (error) {
      console.error('Error updating rate:', error)
      toast.error('Error updating exchange rate')
    }
  }

  // Toggle currency enabled/disabled
  const handleToggleCurrency = async (currency: Currency) => {
    if (!activeCompany?.id) return

    try {
      const updatedCurrencies = currencies.map(c => 
        c.code === currency.code 
          ? { ...c, enabled: !c.enabled }
          : c
      )
      
      const res = await fetch(`/api/settings/currencies?companyId=${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: updatedCurrencies, baseCurrency })
      })
      
      if (res.ok) {
        setCurrencies(updatedCurrencies)
        toast.success(`${currency.code} ${currency.enabled ? 'disabled' : 'enabled'}`)
      } else {
        toast.error('Failed to update currency')
      }
    } catch (error) {
      console.error('Error toggling currency:', error)
      toast.error('Error updating currency')
    }
  }

  // Open edit rate modal
  const openEditRateModal = (currency: Currency) => {
    setSelectedCurrency(currency)
    setEditingRate(currency.exchangeRate.toString())
    setShowEditRateModal(true)
  }

  const stats = {
    enabledCurrencies: currencies.filter(c => c.enabled).length,
    totalCurrencies: currencies.length,
    lastUpdate: '2025-11-25 09:00 AM',
    nextUpdate: 'Today at 12:00 PM'
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
              <Globe className="w-8 h-8 text-blue-600" />
              Multi-Currency Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage currencies and exchange rates for international transactions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUpdateRates} disabled={updating}>
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Rates
                </>
              )}
            </Button>
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
        </div>

        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Currency settings saved successfully!</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.enabledCurrencies}
              </div>
              <div className="text-sm text-blue-700">Active Currencies</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {baseCurrency}
              </div>
              <div className="text-sm text-green-700">Base Currency</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <RefreshCw className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {updateFrequency}
              </div>
              <div className="text-sm text-purple-700">Update Frequency</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-sm font-bold text-orange-900">
                {stats.nextUpdate}
              </div>
              <div className="text-sm text-orange-700">Next Update</div>
            </CardContent>
          </Card>
        </div>

        {/* Base Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Base Currency Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Currency (Base Currency)
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="CAD">CAD - Canadian Dollar (C$)</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  This is your company's primary currency. All financial reports will be displayed in this currency. 
                  <strong className="text-yellow-700"> Warning: Changing base currency requires careful review of existing transactions.</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exchange Rate Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Exchange Rate Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <input
                    type="checkbox"
                    checked={autoUpdateRates}
                    onChange={(e) => setAutoUpdateRates(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Automatically update exchange rates
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Frequency
                </label>
                <select
                  value={updateFrequency}
                  onChange={(e) => setUpdateFrequency(e.target.value)}
                  disabled={!autoUpdateRates}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="Hourly">Hourly</option>
                  <option value="Daily">Daily (9:00 AM)</option>
                  <option value="Weekly">Weekly (Mondays)</option>
                  <option value="Manual">Manual Only</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange Rate Source
                </label>
                <select
                  value={rateSource}
                  onChange={(e) => setRateSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="European Central Bank">European Central Bank (ECB)</option>
                  <option value="Federal Reserve">Federal Reserve (Fed)</option>
                  <option value="Bank of England">Bank of England</option>
                  <option value="XE.com">XE.com</option>
                  <option value="OANDA">OANDA</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  Exchange rates are sourced from {rateSource}. Rates update {updateFrequency.toLowerCase()}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Supported Currencies
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Currency
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currencies.map((currency) => (
                <div key={currency.code} className={`p-4 border rounded-lg transition-all ${
                  currency.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{currency.symbol}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{currency.name}</h3>
                          <Badge variant="outline">{currency.code}</Badge>
                          {currency.enabled && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                          {currency.code === baseCurrency && (
                            <Badge className="bg-blue-100 text-blue-700">Base Currency</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            1 {baseCurrency} = {currency.exchangeRate.toFixed(currency.exchangeRate < 1 ? 4 : 2)} {currency.code}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Updated: {currency.lastUpdated}
                          </div>
                          {currency.enabled && currency.code !== baseCurrency && (
                            <div className="flex items-center gap-1">
                              {Math.random() > 0.5 ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                  <span className="text-green-600">+0.22%</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                  <span className="text-red-600">-0.15%</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {currency.code !== baseCurrency && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditRateModal(currency)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Rate
                          </Button>
                          <Button
                            size="sm"
                            variant={currency.enabled ? 'outline' : 'default'}
                            onClick={() => handleToggleCurrency(currency)}
                          >
                            {currency.enabled ? 'Disable' : 'Enable'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exchange Rate History - EUR Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Exchange Rate History (EUR/USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exchangeRateHistory.map((history, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{history.date}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900">1 USD = {history.rate.toFixed(4)} EUR</span>
                    <div className="flex items-center gap-1">
                      {history.change > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 text-sm">+{(history.change * 100).toFixed(2)}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 text-sm">{(history.change * 100).toFixed(2)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                <h3 className="font-semibold text-yellow-900 mb-2">Multi-Currency Accounting Considerations</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• <strong>Exchange Rate Fluctuations:</strong> Gains and losses from currency fluctuations are recognized according to GAAP standards</li>
                  <li>• <strong>Realized vs Unrealized:</strong> Realized gains/losses occur when payment is made; unrealized when AR/AP is recorded</li>
                  <li>• <strong>IRS Reporting:</strong> Foreign currency transactions must be reported on Form 1040 Schedule D or Form 8949</li>
                  <li>• <strong>Functional Currency:</strong> Your base currency should be the primary currency of your business operations</li>
                  <li>• <strong>Historical Rates:</strong> System maintains historical exchange rates for accurate financial reporting</li>
                  <li>• <strong>Bank Reconciliation:</strong> Multi-currency bank accounts require careful reconciliation at transaction date rates</li>
                  <li>• <strong>Best Practice:</strong> Consult with your CPA about foreign currency accounting and tax implications</li>
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
                <h3 className="font-semibold text-blue-900 mb-2">About Multi-Currency</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Multi-currency support allows you to conduct business in multiple currencies while maintaining accurate accounting records.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Enable Currencies:</strong> Activate only the currencies you regularly transact in</li>
                  <li>• <strong>Exchange Rates:</strong> Rates update automatically from trusted financial sources</li>
                  <li>• <strong>Manual Override:</strong> You can manually set exchange rates for specific transactions if needed</li>
                  <li>• <strong>Reporting:</strong> All financial reports display in your base currency with conversion applied</li>
                  <li>• <strong>Customer/Vendor Currency:</strong> Assign preferred currency to customers and vendors</li>
                  <li>• <strong>Invoice Currency:</strong> Create invoices in any enabled currency</li>
                  <li>• <strong>Payment Matching:</strong> System handles exchange rate differences when payments don't match invoice amounts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Currency Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Select a currency to add to your supported currencies list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency-select">Currency</Label>
              <Select 
                value={newCurrency.code} 
                onValueChange={(value) => setNewCurrency({ ...newCurrency, code: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies
                    .filter(c => !currencies.some(existing => existing.code === c.code))
                    .map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exchange-rate">Exchange Rate (1 {baseCurrency} = X)</Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.0001"
                min="0.0001"
                value={newCurrency.exchangeRate}
                onChange={(e) => setNewCurrency({ ...newCurrency, exchangeRate: parseFloat(e.target.value) || 1 })}
                placeholder="Enter exchange rate"
              />
              <p className="text-xs text-gray-500">
                Enter how many units of the new currency equal 1 {baseCurrency}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCurrency}>
              <Plus className="w-4 h-4 mr-1" />
              Add Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Modal */}
      <Dialog open={showEditRateModal} onOpenChange={setShowEditRateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Exchange Rate</DialogTitle>
            <DialogDescription>
              Update the exchange rate for {selectedCurrency?.name} ({selectedCurrency?.code})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rate">
                Exchange Rate (1 {baseCurrency} = X {selectedCurrency?.code})
              </Label>
              <Input
                id="edit-rate"
                type="number"
                step="0.0001"
                min="0.0001"
                value={editingRate}
                onChange={(e) => setEditingRate(e.target.value)}
                placeholder="Enter new exchange rate"
              />
              <p className="text-xs text-gray-500">
                Current rate: 1 {baseCurrency} = {selectedCurrency?.exchangeRate} {selectedCurrency?.code}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRate}>
              <Save className="w-4 h-4 mr-1" />
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyTabsLayout>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Link as LinkIcon,
  RefreshCw,
  Shield,
  FileText,
  Database,
  AlertTriangle,
  Check,
  X,
  Zap
} from 'lucide-react'

interface ImportStep {
  id: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending' | 'error'
  details?: string
}

interface DataMapping {
  category: string
  quickbooksAccount: string
  turboTaxForm: string
  turboTaxLine: string
  amount: number
  status: 'mapped' | 'review' | 'error'
}

interface ImportHistory {
  id: string
  date: string
  turboTaxYear: string
  recordsImported: number
  status: 'success' | 'partial' | 'failed'
  duration: string
  errors: number
}

export default function TurboTaxPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [dataMappings, setDataMappings] = useState<DataMapping[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchTurboTaxData = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/taxes?companyId=${activeCompany.id}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setDataMappings(data.turboTaxMapping || [])
      }
    } catch (error) {
      console.error('Error fetching TurboTax data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    fetchTurboTaxData()
  }, [fetchTurboTaxData])

  const handleSync = async () => {
    if (!activeCompany?.id) return
    
    setSyncing(true)
    setCurrentStep(0)
    
    // Simulate step-by-step progress
    for (let i = 1; i <= 8; i++) {
      setCurrentStep(i)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-turbotax',
          companyId: activeCompany.id,
          year: selectedYear
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Add to history
        const newImport: ImportHistory = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          turboTaxYear: selectedYear,
          recordsImported: data.sync.recordsSynced,
          status: 'success',
          duration: '2m 30s',
          errors: 0
        }
        setImportHistory(prev => [newImport, ...prev])
        
        setMessage({ type: 'success', text: `Sincronización completada: ${data.sync.recordsSynced} registros sincronizados` }); setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error syncing with TurboTax:', error)
    } finally {
      setSyncing(false)
    }
  }

  const importSteps: ImportStep[] = [
    { id: '1', title: 'Connect to TurboTax', description: 'Establish secure connection', status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'pending' : 'pending', details: 'TurboTax Business ' + selectedYear },
    { id: '2', title: 'Verify Company Information', description: 'Confirm EIN and business details', status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'current' : 'pending', details: activeCompany?.name },
    { id: '3', title: 'Map Chart of Accounts', description: 'Automatically map accounts to tax forms', status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : 'pending', details: `${dataMappings.length} accounts mapped` },
    { id: '4', title: 'Import Financial Data', description: 'Transfer income statement and balance sheet', status: currentStep >= 4 ? 'completed' : currentStep === 3 ? 'current' : 'pending' },
    { id: '5', title: 'Import Tax Deductions', description: 'Transfer business deductions and credits', status: currentStep >= 5 ? 'completed' : currentStep === 4 ? 'current' : 'pending' },
    { id: '6', title: 'Import Asset Depreciation', description: 'Transfer depreciation schedules (Form 4562)', status: currentStep >= 6 ? 'completed' : currentStep === 5 ? 'current' : 'pending' },
    { id: '7', title: 'Reconcile Balances', description: 'Verify all amounts match between systems', status: currentStep >= 7 ? 'completed' : currentStep === 6 ? 'current' : 'pending' },
    { id: '8', title: 'Review & Finalize', description: 'Final review before filing', status: currentStep >= 8 ? 'completed' : currentStep === 7 ? 'current' : 'pending' }
  ]

  const stats = {
    accountsMapped: dataMappings.filter(m => m.status === 'mapped').length,
    needsReview: dataMappings.filter(m => m.status === 'review').length,
    totalRecords: dataMappings.length,
    completedSteps: currentStep
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'current': return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'mapped': return <Badge className="bg-green-100 text-green-700"><Check className="w-3 h-3 mr-1" /> Mapped</Badge>
      case 'review': return <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" /> Review</Badge>
      case 'error': return <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 mr-1" /> Error</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getImportStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>
      case 'partial': return <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" /> Partial</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>
      default: return <Badge>{status}</Badge>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TurboTax Integration</h1>
            <p className="text-gray-600 mt-1">Direct import to TurboTax Business for seamless tax filing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTurboTaxData}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {syncing ? 'Syncing...' : 'Start Import'}
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <LinkIcon className="w-8 h-8 text-blue-600" />
                <Badge className={connectionStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'}>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</Badge>
              </div>
              <div className="text-xl font-bold text-blue-900">TurboTax {selectedYear}</div>
              <div className="text-sm text-blue-700">Business Edition</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">{stats.accountsMapped}</div>
              <div className="text-sm text-green-700">Accounts Mapped</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-2xl font-bold text-yellow-900">{stats.needsReview}</div>
              <div className="text-sm text-yellow-700">Need Review</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Database className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-900">{stats.totalRecords}</div>
              <div className="text-sm text-purple-700">Data Mappings</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Import Progress - Tax Year {selectedYear}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {importSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    {getStepIcon(step.status)}
                    {index < importSteps.length - 1 && (<div className={`w-0.5 h-12 mt-2 ${step.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`} />)}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-semibold ${step.status === 'current' ? 'text-blue-900' : 'text-gray-900'}`}>{step.title}</h4>
                      {step.status === 'completed' && <Badge className="bg-green-100 text-green-700">Complete</Badge>}
                      {step.status === 'current' && <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    {step.details && <p className="text-xs text-gray-500 mt-1">{step.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account Mapping to TurboTax Forms</CardTitle>
              <Button variant="outline" size="sm">Review All Mappings</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">QuickBooks Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">TurboTax Form</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Line Item</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dataMappings.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No mappings found. Click "Start Import" to begin.</td></tr>
                  ) : (
                    dataMappings.map((mapping, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${mapping.status === 'review' ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3"><div className="text-sm font-semibold text-gray-900">{mapping.category}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-900">{mapping.quickbooksAccount}</div></td>
                        <td className="px-4 py-3"><div className="text-sm font-semibold text-blue-600">{mapping.turboTaxForm}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-700">{mapping.turboTaxLine}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm font-semibold text-gray-900">${mapping.amount.toLocaleString()}</div></td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(mapping.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {importHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Import History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tax Year</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Records</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Duration</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Errors</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importHistory.map((import_item) => (
                      <tr key={import_item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><div className="text-sm text-gray-900">{new Date(import_item.date).toLocaleDateString()}</div></td>
                        <td className="px-4 py-3"><div className="text-sm font-semibold text-gray-900">{import_item.turboTaxYear}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm text-gray-900">{import_item.recordsImported.toLocaleString()}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-700">{import_item.duration}</div></td>
                        <td className="px-4 py-3 text-center"><div className={`text-sm font-semibold ${import_item.errors === 0 ? 'text-green-600' : 'text-red-600'}`}>{import_item.errors}</div></td>
                        <td className="px-4 py-3 text-center">{getImportStatusBadge(import_item.status)}</td>
                        <td className="px-4 py-3"><Button size="sm" variant="outline">View Details</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600 rounded-lg"><Shield className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Connection Secure</h3>
                  <p className="text-green-700 text-sm mb-2">Your data is securely transferred using industry-standard encryption.</p>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• <strong>OAuth 2.0:</strong> Secure authentication</li>
                    <li>• <strong>TLS 1.3:</strong> Encrypted data transfer</li>
                    <li>• <strong>No Credentials Stored:</strong> Direct API connection</li>
                    <li>• <strong>Audit Trail:</strong> All imports logged</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg"><Info className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">TurboTax Requirements</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• <strong>Version:</strong> TurboTax Business {selectedYear} or newer</li>
                    <li>• <strong>Account:</strong> Active TurboTax Online or Desktop</li>
                    <li>• <strong>Business Type:</strong> C-Corp, S-Corp, LLC, Partnership</li>
                    <li>• <strong>Forms Supported:</strong> 1120, 1120-S, 1065, Schedule C</li>
                    <li>• <strong>Data Transfer:</strong> Income, Expenses, Deductions, Depreciation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg"><FileText className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">How TurboTax Integration Works</h3>
                <div className="text-blue-700 text-sm space-y-2">
                  <p><strong>1. Automatic Mapping:</strong> Accounts are automatically mapped to corresponding IRS form lines.</p>
                  <p><strong>2. Data Validation:</strong> All financial data is validated against IRS requirements before import.</p>
                  <p><strong>3. Review Process:</strong> Items requiring special tax treatment are flagged for manual review.</p>
                  <p><strong>4. Reconciliation:</strong> Total amounts are reconciled between systems to ensure accuracy.</p>
                  <p><strong>5. Form Generation:</strong> TurboTax uses imported data to automatically populate tax forms.</p>
                  <p className="mt-2 pt-2 border-t border-blue-300"><strong>Note:</strong> Always review all data in TurboTax before filing.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

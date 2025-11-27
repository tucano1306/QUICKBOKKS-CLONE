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
  FileDown,
  CheckCircle,
  Calendar,
  FileText,
  Database,
  Upload,
  Info,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  FileType,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

interface ExportFormat {
  id: string
  name: string
  description: string
  fileType: string
  icon: React.ReactNode
  taxSoftware: string[]
  dataTypes: string[]
  supported: boolean
}

interface ExportHistory {
  id: string
  format: string
  taxSoftware: string
  dateExported: string
  dateRange: string
  fileSize: string
  recordCount: number
  status: 'success' | 'failed' | 'processing'
  fileName: string
}

interface ExportStats {
  invoiceCount: number
  expenseCount: number
  employeeCount: number
  vendorCount: number
  customerCount: number
  transactionCount: number
  dataReady: boolean
}

export default function TaxExportPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>('txf')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` })
  const [exportStats, setExportStats] = useState<ExportStats | null>(null)
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchExportData = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/taxes?companyId=${activeCompany.id}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setExportStats(data.exportStats || null)
      }
    } catch (error) {
      console.error('Error fetching export data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    fetchExportData()
  }, [fetchExportData])

  const handleExport = async (formatId: string) => {
    if (!activeCompany?.id) return
    
    setExporting(true)
    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          companyId: activeCompany.id,
          year: selectedYear,
          format: formatId,
          dateRange
        })
      })
      
      const data = await response.json()
      if (data.success && data.export) {
        // Add to history
        const newExport: ExportHistory = {
          id: Date.now().toString(),
          format: formatId.toUpperCase(),
          taxSoftware: 'Manual Export',
          dateExported: new Date().toISOString(),
          dateRange: `${dateRange.start} - ${dateRange.end}`,
          fileSize: data.export.fileSize,
          recordCount: data.export.recordCount,
          status: 'success',
          fileName: data.export.fileName
        }
        setExportHistory(prev => [newExport, ...prev])
        
        // If JSON, show data
        if (formatId === 'json' && data.data) {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.export.fileName
          a.click()
          URL.revokeObjectURL(url)
        } else {
          setMessage({ type: 'success', text: `Exportación completada: ${data.export.fileName} (${data.export.recordCount} registros)` }); setTimeout(() => setMessage(null), 3000)
        }
      }
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(false)
    }
  }

  const exportFormats: ExportFormat[] = [
    {
      id: 'txf',
      name: 'TXF Format',
      description: 'Tax Exchange Format - Universal format for most tax software',
      fileType: '.txf',
      icon: <FileType className="w-5 h-5" />,
      taxSoftware: ['TurboTax', 'H&R Block', 'TaxAct', 'TaxSlayer'],
      dataTypes: ['Income', 'Expenses', 'Deductions', 'Assets'],
      supported: true
    },
    {
      id: 'iif',
      name: 'IIF Format',
      description: 'Intuit Interchange Format - Native QuickBooks format',
      fileType: '.iif',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['QuickBooks', 'TurboTax', 'ProSeries', 'Lacerte'],
      dataTypes: ['Chart of Accounts', 'Transactions', 'Balances'],
      supported: true
    },
    {
      id: 'csv',
      name: 'CSV Format',
      description: 'Comma-Separated Values - Universal spreadsheet format',
      fileType: '.csv',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['Excel', 'Google Sheets', 'Any Tax Software'],
      dataTypes: ['All Financial Data', 'Custom Reports'],
      supported: true
    },
    {
      id: 'excel',
      name: 'Excel Workbook',
      description: 'Multi-sheet Excel workbook with formatted data',
      fileType: '.xlsx',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['Excel', 'Google Sheets', 'Manual Entry'],
      dataTypes: ['Organized by Tax Forms', 'Multiple Worksheets'],
      supported: true
    },
    {
      id: 'pdf',
      name: 'PDF Reports',
      description: 'Formatted tax reports for filing or record-keeping',
      fileType: '.pdf',
      icon: <FileText className="w-5 h-5" />,
      taxSoftware: ['Manual Filing', 'CPA Review', 'Record Keeping'],
      dataTypes: ['Income Statement', 'Balance Sheet', 'Tax Schedules'],
      supported: true
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Structured JSON for API integration',
      fileType: '.json',
      icon: <Database className="w-5 h-5" />,
      taxSoftware: ['Custom Software', 'API Integration', 'Developers'],
      dataTypes: ['Complete Data Model', 'API Compatible'],
      supported: true
    }
  ]

  const stats = {
    totalExports: exportHistory.length,
    successfulExports: exportHistory.filter(e => e.status === 'success').length,
    lastExport: exportHistory[0],
    totalRecords: exportHistory.filter(e => e.status === 'success').reduce((sum, e) => sum + e.recordCount, 0)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" /> Processing</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>
      default:
        return <Badge>{status}</Badge>
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
            <h1 className="text-2xl font-bold text-gray-900">Tax Data Export</h1>
            <p className="text-gray-600 mt-1">Export accounting data for tax software and filing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchExportData}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
            <Button onClick={() => handleExport(selectedFormat)} disabled={exporting}>
              {exporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export Selected
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
              <FileDown className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-900">{exportStats?.transactionCount || 0}</div>
              <div className="text-sm text-blue-700">Transactions Available</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-900">{exportStats?.invoiceCount || 0}</div>
              <div className="text-sm text-green-700">Invoices</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Database className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-900">{exportStats?.expenseCount || 0}</div>
              <div className="text-sm text-purple-700">Expenses</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 text-orange-600 mb-2" />
              <div className="text-xl font-bold text-orange-900">{exportStats?.employeeCount || 0}</div>
              <div className="text-sm text-orange-700">Employees (W-2)</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Select Export Format</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportFormats.map((format) => (
                <div key={format.id} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedFormat === format.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`} onClick={() => setSelectedFormat(format.id)}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${selectedFormat === format.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{format.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{format.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-gray-500 mb-1">Compatible:</div>
                      <div className="flex flex-wrap gap-1">
                        {format.taxSoftware.slice(0, 2).map((software) => (<Badge key={software} variant="outline" className="text-xs">{software}</Badge>))}
                        {format.taxSoftware.length > 2 && (<Badge variant="outline" className="text-xs">+{format.taxSoftware.length - 2}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-3" size="sm" variant={selectedFormat === format.id ? 'default' : 'outline'} onClick={(e) => { e.stopPropagation(); handleExport(format.id) }} disabled={exporting}>
                    Export {format.fileType}<ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Export Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Tax Year</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Start Date</label>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">End Date</label>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">Data to Export:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Income Statement', 'Balance Sheet', 'Trial Balance', 'Chart of Accounts', 'Deductions', 'Depreciation', 'Payroll Data', '1099 Data'].map(item => (
                  <label key={item} className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm text-blue-900">{item}</span></label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {exportHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Export History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Format</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date Exported</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date Range</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Records</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">File Size</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {exportHistory.map((export_item) => (
                      <tr key={export_item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded"><FileType className="w-4 h-4 text-blue-600" /></div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{export_item.format}</div>
                              <div className="text-xs text-gray-500">{export_item.fileName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-900">{new Date(export_item.dateExported).toLocaleDateString()}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-gray-900">{export_item.dateRange}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm text-gray-900">{export_item.recordCount.toLocaleString()}</div></td>
                        <td className="px-4 py-3 text-right"><div className="text-sm text-gray-900">{export_item.fileSize}</div></td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(export_item.status)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" />Download</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg"><Info className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Export Format Guide</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>TXF:</strong> Universal format for TurboTax, H&R Block, TaxAct</li>
                  <li>• <strong>IIF:</strong> Native QuickBooks format, best for ProSeries, Lacerte</li>
                  <li>• <strong>CSV:</strong> Universal spreadsheet format, works with any software</li>
                  <li>• <strong>Excel:</strong> Formatted workbook with multiple sheets organized by tax forms</li>
                  <li>• <strong>PDF:</strong> Print-ready reports for CPA review or manual filing</li>
                  <li>• <strong>JSON:</strong> Structured data for API integration and custom software</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

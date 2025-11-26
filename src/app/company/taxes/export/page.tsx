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
  ChevronRight
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

export default function TaxExportPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState<string>('txf')
  const [selectedYear, setSelectedYear] = useState('2025')
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-12-31' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

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
      description: 'Intuit Interchange Format - Native QuickBooks/Intuit format',
      fileType: '.iif',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['QuickBooks', 'TurboTax', 'ProSeries', 'Lacerte'],
      dataTypes: ['Chart of Accounts', 'Transactions', 'Balances', 'Journal Entries'],
      supported: true
    },
    {
      id: 'csv',
      name: 'CSV Format',
      description: 'Comma-Separated Values - Universal spreadsheet format',
      fileType: '.csv',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['Excel', 'Google Sheets', 'Any Tax Software'],
      dataTypes: ['All Financial Data', 'Custom Reports', 'Raw Transactions'],
      supported: true
    },
    {
      id: 'excel',
      name: 'Excel Workbook',
      description: 'Multi-sheet Excel workbook with formatted data',
      fileType: '.xlsx',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      taxSoftware: ['Excel', 'Google Sheets', 'Manual Entry'],
      dataTypes: ['Organized by Tax Forms', 'Multiple Worksheets', 'Pivot Tables'],
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
      dataTypes: ['Complete Data Model', 'API Compatible', 'Machine Readable'],
      supported: true
    }
  ]

  const exportHistory: ExportHistory[] = [
    {
      id: '1',
      format: 'TXF',
      taxSoftware: 'TurboTax Business',
      dateExported: '2025-12-05T10:30:00',
      dateRange: 'Jan 1, 2025 - Dec 31, 2025',
      fileSize: '2.3 MB',
      recordCount: 5420,
      status: 'success',
      fileName: 'quickbooks_2025_tax_data.txf'
    },
    {
      id: '2',
      format: 'IIF',
      taxSoftware: 'ProSeries Professional',
      dateExported: '2025-11-15T14:20:00',
      dateRange: 'Jan 1, 2025 - Nov 30, 2025',
      fileSize: '3.1 MB',
      recordCount: 6200,
      status: 'success',
      fileName: 'quickbooks_2025_q3.iif'
    },
    {
      id: '3',
      format: 'Excel',
      taxSoftware: 'Manual Review',
      dateExported: '2025-10-01T09:15:00',
      dateRange: 'Q3 2025',
      fileSize: '1.8 MB',
      recordCount: 3850,
      status: 'success',
      fileName: 'q3_2025_tax_workbook.xlsx'
    },
    {
      id: '4',
      format: 'CSV',
      taxSoftware: 'H&R Block Premium',
      dateExported: '2025-09-30T16:45:00',
      dateRange: 'Jan 1, 2025 - Sep 30, 2025',
      fileSize: '4.2 MB',
      recordCount: 8520,
      status: 'success',
      fileName: 'transactions_q1_q3_2025.csv'
    },
    {
      id: '5',
      format: 'PDF',
      taxSoftware: 'CPA Firm',
      dateExported: '2025-08-15T11:00:00',
      dateRange: 'Q2 2025',
      fileSize: '5.6 MB',
      recordCount: 0,
      status: 'success',
      fileName: 'q2_2025_financial_reports.pdf'
    },
    {
      id: '6',
      format: 'TXF',
      taxSoftware: 'TaxAct Business',
      dateExported: '2025-07-10T13:30:00',
      dateRange: 'Jan 1, 2025 - Jun 30, 2025',
      fileSize: '1.9 MB',
      recordCount: 4320,
      status: 'failed',
      fileName: 'h1_2025_export.txf'
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

  const handleExport = (formatId: string) => {
    console.log('Exporting to format:', formatId)
    // In real implementation, this would trigger the export process
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
            <h1 className="text-2xl font-bold text-gray-900">Tax Data Export</h1>
            <p className="text-gray-600 mt-1">
              Export accounting data for tax software and filing
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Selected
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileDown className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalExports}
              </div>
              <div className="text-sm text-blue-700">Total Exports</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.successfulExports}
              </div>
              <div className="text-sm text-green-700">Successful</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Database className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(stats.totalRecords / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-purple-700">Records Exported</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-xl font-bold text-orange-900">
                {new Date(stats.lastExport.dateExported).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-sm text-orange-700">Last Export</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Export Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportFormats.map((format) => (
                <div
                  key={format.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${selectedFormat === format.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {format.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{format.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-gray-500 mb-1">Compatible Software:</div>
                      <div className="flex flex-wrap gap-1">
                        {format.taxSoftware.slice(0, 2).map((software) => (
                          <Badge key={software} variant="outline" className="text-xs">
                            {software}
                          </Badge>
                        ))}
                        {format.taxSoftware.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{format.taxSoftware.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Includes:</div>
                      <div className="text-gray-700">
                        {format.dataTypes.slice(0, 2).join(', ')}
                        {format.dataTypes.length > 2 && '...'}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-3"
                    size="sm"
                    variant={selectedFormat === format.id ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExport(format.id)
                    }}
                  >
                    Export {format.fileType}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tax Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">Data to Export:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Income Statement</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Balance Sheet</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Trial Balance</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Chart of Accounts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Deductions</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Depreciation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">Payroll Data</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-blue-900">1099 Data</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export History */}
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tax Software</th>
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
                          <div className="p-2 bg-blue-100 rounded">
                            <FileType className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{export_item.format}</div>
                            <div className="text-xs text-gray-500">{export_item.fileName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{export_item.taxSoftware}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(export_item.dateExported).toLocaleDateString('en-US')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(export_item.dateExported).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{export_item.dateRange}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-gray-900">
                          {export_item.recordCount > 0 ? export_item.recordCount.toLocaleString('en-US') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-gray-900">{export_item.fileSize}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(export_item.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {export_item.status === 'success' ? (
                            <>
                              <Button size="sm" variant="outline">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline">
                                Re-export
                              </Button>
                            </>
                          ) : export_item.status === 'failed' ? (
                            <Button size="sm" variant="outline">
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <h3 className="font-semibold text-blue-900 mb-2">Export Format Guide</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>TXF (Tax Exchange Format):</strong> Universal format supported by most tax software. Best for TurboTax, H&R Block, TaxAct.</li>
                  <li>• <strong>IIF (Intuit Interchange):</strong> Native QuickBooks format. Best for QuickBooks, ProSeries, Lacerte, TurboTax.</li>
                  <li>• <strong>CSV:</strong> Universal spreadsheet format. Compatible with all software but may require manual mapping.</li>
                  <li>• <strong>Excel:</strong> Formatted workbook with multiple sheets organized by tax forms. Best for manual review.</li>
                  <li>• <strong>PDF:</strong> Print-ready reports for filing or sending to CPA. Not machine-readable.</li>
                  <li>• <strong>JSON:</strong> Structured data format for API integration and custom software development.</li>
                </ul>
                <p className="text-blue-700 text-sm mt-2">
                  <strong>Data Mapping:</strong> Exports include chart of accounts mapping to standard tax forms (1120, 1065, Schedule C). 
                  Verify mappings in your tax software before finalizing return.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

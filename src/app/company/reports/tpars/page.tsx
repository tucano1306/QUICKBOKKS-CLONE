'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  X,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TPARSReport {
  id: string
  fiscalYear: number
  status: 'DRAFT' | 'GENERATED' | 'REVIEWED' | 'SUBMITTED' | 'AMENDED'
  totalPayments: number
  totalGST: number
  totalWithheld: number
  vendorCount: number
  reportData?: {
    vendorId: string
    vendorName: string
    taxId: string | null
    totalPayments: number
    totalGST: number
    totalWithheld: number
    paymentCount: number
  }[]
  generatedAt?: string
  submittedAt?: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  GENERATED: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-green-100 text-green-800',
  AMENDED: 'bg-purple-100 text-purple-800'
}

export default function TPARSReportPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [reports, setReports] = useState<TPARSReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)
  const [viewingReport, setViewingReport] = useState<TPARSReport | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchReports = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tpars?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (error) {
      console.error('Error fetching TPARS reports:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const generateReport = async () => {
    if (!activeCompany?.id) return
    
    setGenerating(true)
    try {
      const res = await fetch('/api/tpars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          fiscalYear: selectedYear
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`TPARS Report generated for ${selectedYear}`)
        fetchReports()
        if (data.report) {
          setViewingReport(data.report)
        }
      } else {
        toast.error(data.error || 'Failed to generate report')
      }
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const updateStatus = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/tpars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus })
      })

      if (res.ok) {
        toast.success(`Report marked as ${newStatus.toLowerCase()}`)
        fetchReports()
        if (viewingReport?.id === reportId) {
          setViewingReport(null)
        }
      }
    } catch (error) {
      toast.error('Failed to update report status')
    }
  }

  const downloadReport = (report: TPARSReport) => {
    // Create CSV content
    let csv = 'Vendor Name,Tax ID,Total Payments,GST Amount,Amount Withheld,Payment Count\n'
    
    if (report.reportData) {
      report.reportData.forEach(vendor => {
        csv += `"${vendor.vendorName}","${vendor.taxId || 'N/A'}",${vendor.totalPayments.toFixed(2)},${vendor.totalGST.toFixed(2)},${vendor.totalWithheld.toFixed(2)},${vendor.paymentCount}\n`
      })
    }

    csv += `\n"TOTALS","",${report.totalPayments.toFixed(2)},${report.totalGST.toFixed(2)},${report.totalWithheld.toFixed(2)},${report.vendorCount}\n`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TPARS_Report_${report.fiscalYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
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
            <h1 className="text-2xl font-bold text-gray-900">TPARS - Taxable Payments Annual Report</h1>
            <p className="text-gray-600 mt-1">
              Generate and submit annual taxable payments reports for contractors and vendors
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">About TPARS</h4>
                <p className="text-sm text-blue-700 mt-1">
                  The Taxable Payments Annual Report summarizes all payments made to contractors and vendors during the fiscal year.
                  This report is required for tax compliance and helps track 1099-reportable payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Report Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div>
                <label className="text-sm font-medium">Fiscal Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="mt-1 block border rounded-md p-2"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <Button 
                className="bg-[#2CA01C] hover:bg-[#108000]"
                onClick={generateReport}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No TPARS reports generated yet</p>
                <p className="text-sm text-gray-400">Generate your first report above</p>
              </div>
            ) : (
              <div className="divide-y">
                {reports.map(report => (
                  <div key={report.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{report.fiscalYear}</span>
                            <Badge className={statusColors[report.status]}>{report.status}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'N/A'}
                            {report.submittedAt && ` • Submitted: ${new Date(report.submittedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Total Payments</div>
                          <div className="font-semibold text-lg">${report.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Vendors</div>
                          <div className="font-semibold text-lg">{report.vendorCount}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingReport(report)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                          {report.status === 'GENERATED' && (
                            <Button 
                              size="sm"
                              className="bg-[#2CA01C] hover:bg-[#108000]"
                              onClick={() => updateStatus(report.id, 'REVIEWED')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark Reviewed
                            </Button>
                          )}
                          {report.status === 'REVIEWED' && (
                            <Button 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => updateStatus(report.id, 'SUBMITTED')}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Mark Submitted
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Report Modal */}
        {viewingReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingReport(null)}>
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle>TPARS Report - Fiscal Year {viewingReport.fiscalYear}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={statusColors[viewingReport.status]}>{viewingReport.status}</Badge>
                    <span className="text-sm text-gray-500">
                      Generated: {viewingReport.generatedAt ? new Date(viewingReport.generatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewingReport(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ${viewingReport.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500">Total Payments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${viewingReport.totalGST.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500">Total GST/Tax</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${viewingReport.totalWithheld.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500">Total Withheld</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {viewingReport.vendorCount}
                    </div>
                    <div className="text-sm text-gray-500">Vendors</div>
                  </div>
                </div>

                {/* Vendor Details Table */}
                {viewingReport.reportData && viewingReport.reportData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3 font-semibold">Vendor</th>
                        <th className="text-left p-3 font-semibold">Tax ID</th>
                        <th className="text-right p-3 font-semibold">Total Paid</th>
                        <th className="text-right p-3 font-semibold">GST/Tax</th>
                        <th className="text-right p-3 font-semibold">Withheld</th>
                        <th className="text-center p-3 font-semibold">Payments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingReport.reportData.map((vendor, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              {vendor.vendorName}
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">{vendor.taxId || 'N/A'}</td>
                          <td className="p-3 text-right font-medium">
                            ${vendor.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-blue-600">
                            ${vendor.totalGST.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-green-600">
                            ${vendor.totalWithheld.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">{vendor.paymentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No vendor data available</p>
                    <p className="text-sm text-gray-400">Add expenses and vendor payments to generate report data</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button variant="outline" onClick={() => downloadReport(viewingReport)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <div className="flex gap-2">
                  {viewingReport.status === 'GENERATED' && (
                    <Button 
                      className="bg-[#2CA01C] hover:bg-[#108000]"
                      onClick={() => updateStatus(viewingReport.id, 'REVIEWED')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Reviewed
                    </Button>
                  )}
                  {viewingReport.status === 'REVIEWED' && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => updateStatus(viewingReport.id, 'SUBMITTED')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark as Submitted
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewingReport(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

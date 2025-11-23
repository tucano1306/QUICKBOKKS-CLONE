'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  Download,
  Users,
  Package,
  Clock,
} from 'lucide-react'

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [asOfDate, setAsOfDate] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
    setAsOfDate(today.toISOString().split('T')[0])
  }, [status])

  const generateReport = async (type: string) => {
    setLoading(true)
    setSelectedReport(type)
    
    try {
      let url = `/api/reports/generate?type=${type}`
      
      if (['balance-sheet', 'aging-report', 'inventory-valuation'].includes(type)) {
        url += `&asOfDate=${asOfDate}`
      } else {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (type: string, format: 'pdf' | 'csv') => {
    try {
      let url = `/api/reports/export?type=${type}&format=${format}`
      
      if (['balance-sheet', 'aging-report'].includes(type)) {
        url += `&asOfDate=${asOfDate}`
      } else {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to export report')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `report-${type}-${Date.now()}.${format === 'pdf' ? 'html' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Error exporting report')
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const reports = [
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Assets, liabilities, and equity',
      icon: DollarSign,
      color: 'blue',
    },
    {
      id: 'income-statement',
      title: 'Income Statement',
      description: 'Revenue and expenses',
      icon: TrendingUp,
      color: 'green',
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow',
      description: 'Cash movements',
      icon: BarChart3,
      color: 'purple',
    },
    {
      id: 'sales-by-customer',
      title: 'Sales by Customer',
      description: 'Customer sales analysis',
      icon: Users,
      color: 'orange',
    },
    {
      id: 'sales-by-product',
      title: 'Sales by Product',
      description: 'Product sales analysis',
      icon: Package,
      color: 'pink',
    },
    {
      id: 'payroll-summary',
      title: 'Payroll Summary',
      description: 'Payroll by employee',
      icon: FileText,
      color: 'indigo',
    },
    {
      id: 'aging-report',
      title: 'A/R Aging',
      description: 'Receivables aging',
      icon: Clock,
      color: 'red',
    },
    {
      id: 'inventory-valuation',
      title: 'Inventory Valuation',
      description: 'Current inventory value',
      icon: Package,
      color: 'teal',
    },
  ]

  const renderReportData = () => {
    if (!reportData || !selectedReport) return null

    switch (selectedReport) {
      case 'balance-sheet':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Balance Sheet</h3>
            <p className="text-sm text-gray-600">
              As of: {new Date(reportData.asOfDate).toLocaleDateString()}
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Assets</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {reportData.assets.currentAssets.map((asset: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1">{asset.accountName}</td>
                        <td className="text-right">${asset.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold border-t">
                      <td className="py-1">Total Assets</td>
                      <td className="text-right">${reportData.assets.totalAssets.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Liabilities & Equity</h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="font-bold border-t-2">
                      <td className="py-2">Total Liabilities</td>
                      <td className="text-right">${reportData.liabilities.totalLiabilities.toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-2">Total Equity</td>
                      <td className="text-right">${reportData.equity.totalEquity.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'income-statement':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Income Statement</h3>
            <p className="text-sm text-gray-600">
              {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
            </p>
            
            <table className="w-full text-sm">
              <tbody>
                <tr className="font-semibold"><td colSpan={2}>Revenue</td></tr>
                <tr className="font-semibold border-t">
                  <td className="py-1">Total Revenue</td>
                  <td className="text-right">${reportData.revenue.total.toFixed(2)}</td>
                </tr>
                <tr className="font-bold border-t-2">
                  <td className="py-2">NET INCOME</td>
                  <td className="text-right">${reportData.netIncome.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )

      case 'sales-by-customer':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Sales by Customer</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-right py-2">Sales</th>
                  <th className="text-right py-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportData.customers.map((customer: any) => (
                  <tr key={customer.customerId} className="border-b">
                    <td className="py-2">{customer.customerName}</td>
                    <td className="text-right">${customer.totalSales.toFixed(2)}</td>
                    <td className="text-right">${customer.totalOutstanding.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      default:
        return <div className="text-center py-12 text-gray-500">Report generated successfully</div>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate financial reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">As Of Date</label>
                <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <report.icon className="h-6 w-6" />
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                </div>
                <p className="text-xs text-gray-600">{report.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button onClick={() => generateReport(report.id)} className="w-full" size="sm" disabled={loading}>
                    {loading && selectedReport === report.id ? 'Loading...' : 'View'}
                  </Button>
                  <div className="flex gap-2">
                    <Button onClick={() => exportReport(report.id, 'csv')} variant="outline" size="sm" className="flex-1">
                      <Download className="h-3 w-3 mr-1" />CSV
                    </Button>
                    <Button onClick={() => exportReport(report.id, 'pdf')} variant="outline" size="sm" className="flex-1">
                      <Download className="h-3 w-3 mr-1" />PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {reportData && (
          <Card>
            <CardContent className="pt-6">
              {renderReportData()}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

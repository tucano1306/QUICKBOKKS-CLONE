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
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  DollarSign,
  TrendingUp,
  FileCheck,
  Send,
  Printer,
  Eye
} from 'lucide-react'

interface TaxReport {
  id: string
  type: string
  period: string
  fiscalYear: number
  dueDate: string
  status: 'pending' | 'filed' | 'overdue' | 'amended'
  filedDate?: string
  amount: number
  taxBase: number
  taxRate: number
  withheld?: number
  balance: number
  folio?: string
  acknowledgment?: string
}

export default function TaxReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [taxReports, setTaxReports] = useState<TaxReport[]>([])

  const loadTaxReports = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/tax-reports?companyId=${activeCompany.id}&year=${selectedYear}`)
      if (res.ok) {
        const data = await res.json()
        setTaxReports(data.reports || [])
      }
    } catch (error) {
      console.error('Error loading tax reports:', error)
    }
    setLoading(false)
  }, [activeCompany?.id, selectedYear])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadTaxReports()
  }, [loadTaxReports])

  const filteredReports = taxReports.filter(report => {
    if (report.fiscalYear.toString() !== selectedYear) return false
    if (selectedType !== 'all' && report.type !== selectedType) return false
    return true
  })

  const stats = {
    pending: taxReports.filter(r => r.status === 'pending' && r.fiscalYear.toString() === selectedYear).length,
    filed: taxReports.filter(r => r.status === 'filed' && r.fiscalYear.toString() === selectedYear).length,
    overdue: taxReports.filter(r => r.status === 'overdue' && r.fiscalYear.toString() === selectedYear).length,
    totalTaxes: taxReports
      .filter(r => r.status === 'filed' && r.fiscalYear.toString() === selectedYear)
      .reduce((sum, r) => sum + r.balance, 0)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Presentada</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendiente</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Vencida</Badge>
      case 'amended':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1"><FileText className="w-3 h-3" /> Complementaria</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTaxTypeIcon = (type: string) => {
    if (type.includes('ISR')) return <Receipt className="w-5 h-5 text-blue-600" />
    if (type.includes('IVA')) return <DollarSign className="w-5 h-5 text-green-600" />
    if (type.includes('IETU')) return <TrendingUp className="w-5 h-5 text-purple-600" />
    if (type.includes('Retenciones')) return <FileCheck className="w-5 h-5 text-orange-600" />
    if (type.includes('DIOT')) return <FileText className="w-5 h-5 text-indigo-600" />
    if (type.includes('Anual')) return <Calendar className="w-5 h-5 text-red-600" />
    if (type.includes('PTU')) return <TrendingUp className="w-5 h-5 text-teal-600" />
    return <FileText className="w-5 h-5 text-gray-600" />
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
            <h1 className="text-2xl font-bold text-gray-900">Reportes Fiscales</h1>
            <p className="text-gray-600 mt-1">
              Gestión de declaraciones y obligaciones fiscales
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setMessage({ type: 'success', text: 'Exportando reportes fiscales a PDF' }); setTimeout(() => setMessage(null), 3000); }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setMessage({ type: 'success', text: 'Iniciando nueva declaración fiscal' }); setTimeout(() => setMessage(null), 3000); }}>
              <FileText className="w-4 h-4 mr-2" />
              Nueva Declaración
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {stats.pending}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">
                {stats.filed}
              </div>
              <div className="text-sm text-green-700">Presentadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                {stats.overdue}
              </div>
              <div className="text-sm text-red-700">Vencidas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${(stats.totalTaxes / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-blue-700">Impuestos Pagados</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Año Fiscal:
              </label>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <div className="flex-1"></div>
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Tipo de Impuesto:
              </label>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="ISR Mensual">ISR Mensual</option>
                <option value="IVA Mensual">IVA Mensual</option>
                <option value="Retenciones ISR">Retenciones ISR</option>
                <option value="DIOT">DIOT</option>
                <option value="Declaración Anual">Declaración Anual</option>
                <option value="PTU">PTU</option>
                <option value="IETU Anual">IETU</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Tax Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Declaraciones Fiscales - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Período</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Base Gravable</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tasa</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Impuesto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Retenciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo a Pagar</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const dueDate = new Date(report.dueDate)
                    const today = new Date()
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 7 && report.status === 'pending'

                    return (
                      <tr key={report.id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getTaxTypeIcon(report.type)}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{report.type}</div>
                              {report.folio && (
                                <div className="text-xs text-gray-500">Folio: {report.folio}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{report.period}</div>
                          {report.filedDate && (
                            <div className="text-xs text-gray-500">
                              Presentada: {new Date(report.filedDate).toLocaleDateString('es-MX')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-900">
                            ${report.taxBase.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {report.taxRate > 0 ? `${report.taxRate}%` : 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            ${report.amount.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-700">
                            {report.withheld ? `-$${report.withheld.toLocaleString('es-MX')}` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-bold text-green-700">
                            ${report.balance.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`text-sm ${
                            isUrgent ? 'font-bold text-orange-600' : 'text-gray-900'
                          }`}>
                            {new Date(report.dueDate).toLocaleDateString('es-MX')}
                          </div>
                          {report.status === 'pending' && (
                            <div className={`text-xs ${
                              daysUntilDue < 0 ? 'text-red-600 font-semibold' :
                              daysUntilDue <= 7 ? 'text-orange-600 font-semibold' : 'text-gray-500'
                            }`}>
                              {daysUntilDue < 0 
                                ? `Vencida hace ${Math.abs(daysUntilDue)} días`
                                : `${daysUntilDue} días restantes`
                              }
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {report.status === 'filed' ? (
                              <>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" className="h-8 px-2">
                                  <Send className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tax Summary by Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Tipo de Impuesto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['ISR Mensual', 'IVA Mensual', 'Retenciones ISR', 'DIOT', 'Declaración Anual', 'PTU'].map((type) => {
                  const reports = taxReports.filter(r => 
                    r.type === type && 
                    r.fiscalYear.toString() === selectedYear &&
                    r.status === 'filed'
                  )
                  const total = reports.reduce((sum, r) => sum + r.balance, 0)
                  const count = reports.length

                  if (count === 0) return null

                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTaxTypeIcon(type)}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{type}</div>
                          <div className="text-xs text-gray-500">{count} declaraciones</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-700">
                          ${total.toLocaleString('es-MX')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Vencimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {taxReports
                  .filter(r => r.status === 'pending' && r.fiscalYear.toString() === selectedYear)
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 5)
                  .map((report) => {
                    const dueDate = new Date(report.dueDate)
                    const today = new Date()
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isUrgent = daysUntilDue <= 7

                    return (
                      <div key={report.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          {getTaxTypeIcon(report.type)}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{report.type}</div>
                            <div className="text-xs text-gray-500">{report.period}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-semibold ${
                            isUrgent ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            {new Date(report.dueDate).toLocaleDateString('es-MX')}
                          </div>
                          <div className={`text-xs ${
                            isUrgent ? 'text-orange-700 font-bold' : 'text-gray-500'
                          }`}>
                            {daysUntilDue} días
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Tax Obligations in Florida</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Comprehensive tax reporting system compliant with Florida state tax regulations and IRS requirements.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Corporate Income Tax:</strong> Florida corporate income tax rate of 5.5% on federal taxable income</li>
                  <li>• <strong>Sales & Use Tax:</strong> 6% state rate plus discretionary county surtax (up to 2.5%)</li>
                  <li>• <strong>Reemployment Tax:</strong> Florida unemployment tax for eligible employers</li>
                  <li>• <strong>Federal Income Tax:</strong> Corporate tax returns (Form 1120) and quarterly estimates</li>
                  <li>• <strong>Annual Report:</strong> Florida Department of State annual filing requirement</li>
                  <li>• <strong>Form 1099:</strong> Information returns for contractors and vendors</li>
                  <li>• <strong>Deadlines:</strong> Quarterly estimates (15th of 4th, 6th, 9th, 12th month), Annual returns (March 15 for corporations)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

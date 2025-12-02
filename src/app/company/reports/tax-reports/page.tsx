'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Eye,
  Plus,
  X
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

interface NewDeclarationForm {
  type: string
  period: string
  fiscalYear: string
  taxBase: number
  taxRate: number
  withheld: number
  dueDate: string
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
  
  // Modal state
  const [showNewModal, setShowNewModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<TaxReport | null>(null)
  const [savingDeclaration, setSavingDeclaration] = useState(false)
  const [newDeclaration, setNewDeclaration] = useState<NewDeclarationForm>({
    type: 'ISR Mensual',
    period: '',
    fiscalYear: '2025',
    taxBase: 0,
    taxRate: 0,
    withheld: 0,
    dueDate: ''
  })

  const taxTypes = [
    { value: 'ISR Mensual', label: 'ISR Mensual', rate: 30 },
    { value: 'IVA Mensual', label: 'IVA Mensual', rate: 16 },
    { value: 'Retenciones ISR', label: 'Retenciones ISR', rate: 10 },
    { value: 'DIOT', label: 'DIOT (Operaciones con Terceros)', rate: 0 },
    { value: 'Declaración Anual', label: 'Declaración Anual', rate: 30 },
    { value: 'PTU', label: 'PTU (Participación de Utilidades)', rate: 10 },
    { value: 'Sales Tax', label: 'Sales & Use Tax (Florida)', rate: 6 },
    { value: 'Corporate Tax', label: 'Corporate Income Tax (Florida)', rate: 5.5 },
  ]

  const periods = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    'Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)', 'Anual'
  ]

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

  // Calculate tax amount when base or rate changes
  const calculateTaxAmount = (base: number, rate: number) => {
    return base * (rate / 100)
  }

  const handleTypeChange = (type: string) => {
    const taxType = taxTypes.find(t => t.value === type)
    setNewDeclaration(prev => ({
      ...prev,
      type,
      taxRate: taxType?.rate || 0
    }))
  }

  const handleSaveDeclaration = async () => {
    if (!newDeclaration.type || !newDeclaration.period || !newDeclaration.dueDate) {
      setMessage({ type: 'error', text: 'Por favor complete todos los campos requeridos' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setSavingDeclaration(true)
    try {
      const taxAmount = calculateTaxAmount(newDeclaration.taxBase, newDeclaration.taxRate)
      const balance = taxAmount - newDeclaration.withheld

      const newReport: TaxReport = {
        id: `tax-${Date.now()}`,
        type: newDeclaration.type,
        period: newDeclaration.period,
        fiscalYear: parseInt(newDeclaration.fiscalYear),
        dueDate: newDeclaration.dueDate,
        status: 'pending',
        amount: taxAmount,
        taxBase: newDeclaration.taxBase,
        taxRate: newDeclaration.taxRate,
        withheld: newDeclaration.withheld,
        balance: balance > 0 ? balance : 0
      }

      // Add to local state (in production, this would be an API call)
      setTaxReports(prev => [...prev, newReport])
      
      setMessage({ type: 'success', text: `Declaración de ${newDeclaration.type} creada exitosamente` })
      setShowNewModal(false)
      setNewDeclaration({
        type: 'ISR Mensual',
        period: '',
        fiscalYear: '2025',
        taxBase: 0,
        taxRate: 0,
        withheld: 0,
        dueDate: ''
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear la declaración' })
    } finally {
      setSavingDeclaration(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleFileDeclaration = async (report: TaxReport) => {
    // Simulate filing
    setTaxReports(prev => prev.map(r => 
      r.id === report.id 
        ? { 
            ...r, 
            status: 'filed' as const, 
            filedDate: new Date().toISOString(),
            folio: `FOL-${Date.now().toString().slice(-8)}`,
            acknowledgment: `ACK-${Math.random().toString(36).substring(7).toUpperCase()}`
          } 
        : r
    ))
    setMessage({ type: 'success', text: `Declaración de ${report.type} presentada exitosamente` })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleViewReport = (report: TaxReport) => {
    setSelectedReport(report)
    setShowViewModal(true)
  }

  const handlePrintReport = (report: TaxReport) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Declaración ${report.type} - ${report.period}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1a365d; }
            .report-title { font-size: 20px; margin-top: 10px; color: #333; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { padding: 15px; background: #f8f8f8; border-radius: 8px; }
            .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .info-value { font-size: 16px; font-weight: bold; }
            .amount-section { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #bae6fd; }
            .amount-row:last-child { border-bottom: none; }
            .total-row { font-size: 18px; font-weight: bold; background: #1a365d; color: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .status-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-filed { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${activeCompany?.name || 'Empresa'}</div>
            <div class="report-title">Declaración Fiscal: ${report.type}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Período</div>
              <div class="info-value">${report.period} ${report.fiscalYear}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Fecha de Vencimiento</div>
              <div class="info-value">${new Date(report.dueDate).toLocaleDateString('es-ES')}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Estado</div>
              <div class="info-value">
                <span class="status-badge ${report.status === 'filed' ? 'status-filed' : 'status-pending'}">
                  ${report.status === 'filed' ? 'Presentada' : 'Pendiente'}
                </span>
              </div>
            </div>
            ${report.folio ? `
            <div class="info-box">
              <div class="info-label">Folio</div>
              <div class="info-value">${report.folio}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="amount-section">
            <div class="amount-row">
              <span>Base Gravable</span>
              <span>$${report.taxBase.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span>Tasa de Impuesto</span>
              <span>${report.taxRate}%</span>
            </div>
            <div class="amount-row">
              <span>Impuesto Calculado</span>
              <span>$${report.amount.toLocaleString()}</span>
            </div>
            ${report.withheld ? `
            <div class="amount-row">
              <span>Retenciones</span>
              <span>-$${report.withheld.toLocaleString()}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="total-row" style="display: flex; justify-content: space-between;">
            <span>SALDO A PAGAR</span>
            <span>$${report.balance.toLocaleString()}</span>
          </div>
          
          ${report.acknowledgment ? `
          <div style="margin-top: 30px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
            <strong>Acuse de Recibo:</strong> ${report.acknowledgment}<br>
            <strong>Fecha de Presentación:</strong> ${report.filedDate ? new Date(report.filedDate).toLocaleDateString('es-ES') : 'N/A'}
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>Este documento es un comprobante de declaración fiscal.</p>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
  }

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
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Declaración
            </Button>
          </div>
        </div>

        {/* Modal Nueva Declaración */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Nueva Declaración Fiscal
              </DialogTitle>
              <DialogDescription>
                Complete los datos para crear una nueva declaración fiscal
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxType">Tipo de Impuesto *</Label>
                  <select
                    id="taxType"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newDeclaration.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    {taxTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Período *</Label>
                  <select
                    id="period"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newDeclaration.period}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, period: e.target.value }))}
                  >
                    <option value="">Seleccionar período</option>
                    {periods.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Año Fiscal *</Label>
                  <select
                    id="fiscalYear"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newDeclaration.fiscalYear}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, fiscalYear: e.target.value }))}
                  >
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newDeclaration.dueDate}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxBase">Base Gravable</Label>
                  <Input
                    id="taxBase"
                    type="number"
                    placeholder="0.00"
                    value={newDeclaration.taxBase || ''}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, taxBase: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tasa (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={newDeclaration.taxRate || ''}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withheld">Retenciones</Label>
                  <Input
                    id="withheld"
                    type="number"
                    placeholder="0.00"
                    value={newDeclaration.withheld || ''}
                    onChange={(e) => setNewDeclaration(prev => ({ ...prev, withheld: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              {/* Preview */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Resumen del Cálculo</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-blue-700">Impuesto Calculado:</div>
                  <div className="font-bold text-blue-900">
                    ${calculateTaxAmount(newDeclaration.taxBase, newDeclaration.taxRate).toLocaleString()}
                  </div>
                  <div className="text-blue-700">Menos Retenciones:</div>
                  <div className="font-bold text-blue-900">
                    -${newDeclaration.withheld.toLocaleString()}
                  </div>
                  <div className="text-blue-700 font-semibold">Saldo a Pagar:</div>
                  <div className="font-bold text-green-700 text-lg">
                    ${Math.max(0, calculateTaxAmount(newDeclaration.taxBase, newDeclaration.taxRate) - newDeclaration.withheld).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDeclaration} disabled={savingDeclaration}>
                {savingDeclaration ? 'Guardando...' : 'Crear Declaración'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Ver Declaración */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Detalle de Declaración
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTaxTypeIcon(selectedReport.type)}
                    <span className="font-semibold">{selectedReport.type}</span>
                  </div>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500">Período</div>
                    <div className="font-medium">{selectedReport.period} {selectedReport.fiscalYear}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Vencimiento</div>
                    <div className="font-medium">{new Date(selectedReport.dueDate).toLocaleDateString('es-ES')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Base Gravable</div>
                    <div className="font-medium">${selectedReport.taxBase.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Tasa</div>
                    <div className="font-medium">{selectedReport.taxRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Impuesto</div>
                    <div className="font-medium text-blue-600">${selectedReport.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Retenciones</div>
                    <div className="font-medium">${selectedReport.withheld?.toLocaleString() || 0}</div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-800">Saldo a Pagar</span>
                    <span className="text-2xl font-bold text-green-700">${selectedReport.balance.toLocaleString()}</span>
                  </div>
                </div>
                {selectedReport.status === 'filed' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm space-y-1">
                      <div><strong>Folio:</strong> {selectedReport.folio}</div>
                      <div><strong>Acuse:</strong> {selectedReport.acknowledgment}</div>
                      <div><strong>Fecha Presentación:</strong> {selectedReport.filedDate ? new Date(selectedReport.filedDate).toLocaleDateString('es-ES') : 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Cerrar
              </Button>
              {selectedReport && (
                <Button onClick={() => { handlePrintReport(selectedReport); setShowViewModal(false); }}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleViewReport(report)} title="Ver detalle">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handlePrintReport(report)} title="Descargar">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handlePrintReport(report)} title="Imprimir">
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" className="h-8 px-2" onClick={() => handleFileDeclaration(report)} title="Presentar declaración">
                                  <Send className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleViewReport(report)} title="Ver detalle">
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

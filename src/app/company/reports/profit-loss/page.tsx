'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Calendar, Download, Printer, RefreshCw, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import jsPDF from 'jspdf'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface AccountData {
  code: string
  name: string
  balance: number
}

interface IncomeStatementData {
  revenue: {
    operating: AccountData[]
    nonOperating: AccountData[]
    total: number
  }
  expenses: {
    operating: AccountData[]
    nonOperating: AccountData[]
    costOfSales: AccountData[]
    total: number
  }
  netIncome: number
}

export default function ProfitLossPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Este Mes'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [incomeData, setIncomeData] = useState<IncomeStatementData>({
    revenue: { operating: [], nonOperating: [], total: 0 },
    expenses: { operating: [], nonOperating: [], costOfSales: [], total: 0 },
    netIncome: 0
  })

  // Fetch income statement from API
  const fetchIncomeStatement = useCallback(async () => {
    if (!activeCompany?.id) return
    
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        companyId: activeCompany.id
      })
      const response = await fetch(`/api/accounting/reports/income-statement?${params}`)
      if (!response.ok) throw new Error('Error al cargar estado de resultados')
      const data = await response.json()
      setIncomeData(data.incomeStatement)
      setMessage({ type: 'success', text: 'Estado de resultados actualizado' })
    } catch (error) {
      console.error('Error fetching income statement:', error)
      setMessage({ type: 'error', text: 'Error al cargar estado de resultados' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }, [dateRange.startDate, dateRange.endDate, activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchIncomeStatement()
    }
  }, [status, fetchIncomeStatement])

  const currentMonth = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Función para recalcular P&L basado en rango de fechas
  const recalculatePL = () => {
    fetchIncomeStatement()
  }

  // Convertir datos de API al formato para mostrar
  const ingresos = [
    ...incomeData.revenue.operating.map(a => ({ concepto: a.name, monto: a.balance, cambio: 0 })),
    ...incomeData.revenue.nonOperating.map(a => ({ concepto: a.name, monto: a.balance, cambio: 0 }))
  ]
  
  const gastosOperativos = [
    ...incomeData.expenses.costOfSales.map(a => ({ concepto: a.name, monto: a.balance, cambio: 0 })),
    ...incomeData.expenses.operating.map(a => ({ concepto: a.name, monto: a.balance, cambio: 0 }))
  ]
  
  const otrosGastos = incomeData.expenses.nonOperating.map(a => ({ concepto: a.name, monto: a.balance, cambio: 0 }))

  const totalIngresos = incomeData.revenue.total
  const totalGastosOp = incomeData.expenses.costOfSales.reduce((s, a) => s + a.balance, 0) + 
                        incomeData.expenses.operating.reduce((s, a) => s + a.balance, 0)
  const totalOtrosGastos = incomeData.expenses.nonOperating.reduce((s, a) => s + a.balance, 0)
  const utilidadOperativa = totalIngresos - totalGastosOp
  const utilidadNeta = incomeData.netIncome
  const margenNeto = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0

  // Función para generar CSV
  const generatePLCSV = () => {
    let csv = 'ESTADO DE RESULTADOS (P&L)\n'
    csv += `Empresa: ${activeCompany?.name || 'N/A'}\n`
    csv += `Periodo: ${dateRange.startDate} al ${dateRange.endDate}\n`
    csv += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`
    csv += 'Concepto,Monto,Cambio %\n'
    csv += '\nINGRESOS\n'
    ingresos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL INGRESOS,${totalIngresos},\n\n`
    csv += 'GASTOS OPERATIVOS\n'
    gastosOperativos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL GASTOS OPERATIVOS,${totalGastosOp},\n`
    csv += `UTILIDAD OPERATIVA,${utilidadOperativa},\n\n`
    csv += 'OTROS GASTOS\n'
    otrosGastos.forEach(item => {
      csv += `"${item.concepto}",${item.monto},${item.cambio}%\n`
    })
    csv += `TOTAL OTROS GASTOS,${totalOtrosGastos},\n\n`
    csv += `UTILIDAD NETA,${utilidadNeta},\n`
    csv += `MARGEN NETO,${margenNeto.toFixed(2)}%,\n`
    return csv
  }

  // Función para generar PDF profesional
  const generatePDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 0

    // ===== HEADER CON FONDO AZUL =====
    doc.setFillColor(30, 64, 175) // Azul oscuro profesional
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    // Logo/Empresa
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(activeCompany?.name || 'Mi Empresa', pageWidth / 2, 15, { align: 'center' })
    
    // Título del reporte
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('ESTADO DE RESULTADOS (P&L)', pageWidth / 2, 25, { align: 'center' })
    
    // Período
    doc.setFontSize(10)
    doc.text(`Período: ${dateRange.startDate} al ${dateRange.endDate}`, pageWidth / 2, 33, { align: 'center' })
    
    // Reset color
    doc.setTextColor(0, 0, 0)
    y = 50

    // ===== RESUMEN EJECUTIVO =====
    doc.setFillColor(240, 249, 255) // Azul muy claro
    doc.rect(margin, y, pageWidth - (margin * 2), 35, 'F')
    doc.setDrawColor(59, 130, 246) // Borde azul
    doc.rect(margin, y, pageWidth - (margin * 2), 35, 'S')
    
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN EJECUTIVO', margin + 5, y)
    y += 10

    // Grid de métricas
    const col1 = margin + 5
    const col2 = pageWidth / 2 + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    doc.text('Total Ingresos:', col1, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105) // Verde
    doc.text(`$${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, col1 + 40, y)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Total Gastos:', col2, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38) // Rojo
    doc.text(`$${(totalGastosOp + totalOtrosGastos).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, col2 + 40, y)
    
    y += 8
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Utilidad Neta:', col1, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(utilidadNeta >= 0 ? 5 : 220, utilidadNeta >= 0 ? 150 : 38, utilidadNeta >= 0 ? 105 : 38)
    doc.text(`$${utilidadNeta.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, col1 + 40, y)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Margen Neto:', col2, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(utilidadNeta >= 0 ? 5 : 220, utilidadNeta >= 0 ? 150 : 38, utilidadNeta >= 0 ? 105 : 38)
    doc.text(`${margenNeto.toFixed(2)}%`, col2 + 40, y)

    doc.setTextColor(0, 0, 0)
    y += 25

    // ===== SECCIÓN DE INGRESOS =====
    doc.setFillColor(5, 150, 105) // Verde
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INGRESOS', margin + 5, y + 5.5)
    y += 12

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Lista de ingresos
    ingresos.forEach(item => {
      doc.text(item.concepto, margin + 10, y)
      doc.text(`$${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y, { align: 'right' })
      y += 6
    })

    // Total Ingresos
    doc.setDrawColor(5, 150, 105)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL INGRESOS', margin + 5, y)
    doc.setTextColor(5, 150, 105)
    doc.text(`$${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y, { align: 'right' })
    y += 12

    // ===== SECCIÓN DE GASTOS OPERATIVOS =====
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(220, 38, 38) // Rojo
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('GASTOS OPERATIVOS', margin + 5, y + 5.5)
    y += 12

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Lista de gastos operativos
    gastosOperativos.forEach(item => {
      doc.text(item.concepto, margin + 10, y)
      doc.text(`($${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })})`, pageWidth - margin - 5, y, { align: 'right' })
      y += 6
    })

    // Total Gastos Operativos
    doc.setDrawColor(220, 38, 38)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL GASTOS OPERATIVOS', margin + 5, y)
    doc.setTextColor(220, 38, 38)
    doc.text(`($${totalGastosOp.toLocaleString('en-US', { minimumFractionDigits: 2 })})`, pageWidth - margin - 5, y, { align: 'right' })
    y += 8

    // Utilidad Operativa
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('UTILIDAD OPERATIVA', margin + 5, y + 5.5)
    doc.setTextColor(utilidadOperativa >= 0 ? 5 : 220, utilidadOperativa >= 0 ? 150 : 38, utilidadOperativa >= 0 ? 105 : 38)
    doc.text(`$${utilidadOperativa.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 5.5, { align: 'right' })
    y += 15

    // ===== OTROS GASTOS (si existen) =====
    if (otrosGastos.length > 0) {
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(234, 179, 8) // Amarillo/naranja
      doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('OTROS GASTOS', margin + 5, y + 5.5)
      y += 12

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      otrosGastos.forEach(item => {
        doc.text(item.concepto, margin + 10, y)
        doc.text(`($${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })})`, pageWidth - margin - 5, y, { align: 'right' })
        y += 6
      })

      doc.setDrawColor(234, 179, 8)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL OTROS GASTOS', margin + 5, y)
      doc.setTextColor(234, 179, 8)
      doc.text(`($${totalOtrosGastos.toLocaleString('en-US', { minimumFractionDigits: 2 })})`, pageWidth - margin - 5, y, { align: 'right' })
      y += 12
    }

    // ===== UTILIDAD NETA (RESULTADO FINAL) =====
    doc.setTextColor(0, 0, 0)
    const netBgColor = utilidadNeta >= 0 ? [220, 252, 231] : [254, 226, 226] // Verde claro o rojo claro
    doc.setFillColor(netBgColor[0], netBgColor[1], netBgColor[2])
    doc.setDrawColor(utilidadNeta >= 0 ? 5 : 220, utilidadNeta >= 0 ? 150 : 38, utilidadNeta >= 0 ? 105 : 38)
    doc.setLineWidth(1)
    doc.rect(margin, y, pageWidth - (margin * 2), 15, 'FD')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('UTILIDAD NETA', margin + 10, y + 10)
    doc.setTextColor(utilidadNeta >= 0 ? 5 : 220, utilidadNeta >= 0 ? 150 : 38, utilidadNeta >= 0 ? 105 : 38)
    doc.setFontSize(14)
    doc.text(`$${utilidadNeta.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 10, y + 10, { align: 'right' })
    
    doc.setLineWidth(0.5)
    y += 25

    // ===== FOOTER =====
    doc.setTextColor(128, 128, 128)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, margin, footerY)
    doc.text('Estado de Resultados - Reporte Financiero', pageWidth / 2, footerY, { align: 'center' })
    doc.text('Página 1 de 1', pageWidth - margin, footerY, { align: 'right' })

    // Descargar PDF
    doc.save(`estado-resultados-${activeCompany?.name?.replace(/\s+/g, '-') || 'empresa'}-${dateRange.endDate}.pdf`)
    setMessage({ type: 'success', text: 'PDF generado exitosamente' })
  }

  if (status === 'loading') {
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
            <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados</h1>
            <p className="text-gray-600 mt-1">
              Pérdidas y Ganancias (Profit & Loss)
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Periodo: {dateRange.label || `${dateRange.startDate} al ${dateRange.endDate}`}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="w-72">
              <DateRangeSelector
                value={dateRange}
                onSelect={(range: DateRange) => {
                  setDateRange(range)
                  recalculatePL()
                }}
              />
            </div>
            <Button variant="outline" onClick={recalculatePL} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
            <Button variant="outline" onClick={() => {
              const csvData = generatePLCSV()
              const blob = new Blob([csvData], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `estado-resultados-${dateRange.endDate}.csv`
              a.click()
              setMessage({ type: 'success', text: 'CSV exportado exitosamente' })
            }}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={generatePDF} className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => {
              const printWindow = window.open('', '_blank')
              if (printWindow) {
                const ingresosRows = ingresos.map(i => `<tr><td style="padding-left: 20px;">${i.concepto}</td><td class="amount">$${i.monto.toLocaleString()}</td></tr>`).join('')
                const gastosOpRows = gastosOperativos.map(g => `<tr><td style="padding-left: 20px;">${g.concepto}</td><td class="amount negative">$${g.monto.toLocaleString()}</td></tr>`).join('')
                const otrosGastosRows = otrosGastos.map(g => `<tr><td style="padding-left: 20px;">${g.concepto}</td><td class="amount negative">$${g.monto.toLocaleString()}</td></tr>`).join('')
                
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Estado de Resultados - ${activeCompany?.name || 'Empresa'}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                      .company-name { font-size: 24px; font-weight: bold; color: #1a365d; }
                      .report-title { font-size: 20px; margin-top: 10px; color: #333; }
                      .period { font-size: 14px; color: #666; margin-top: 5px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; }
                      .section-header { font-weight: bold; background: #f0f0f0; font-size: 14px; }
                      .amount { text-align: right; font-family: monospace; }
                      .positive { color: #047857; }
                      .negative { color: #dc2626; }
                      .total-row { font-weight: bold; background: #f0f7ff; }
                      .net-income { font-size: 18px; font-weight: bold; padding: 15px; background: ${utilidadNeta >= 0 ? '#dcfce7' : '#fee2e2'}; border-radius: 8px; margin-top: 20px; }
                      .net-income .label { color: #374151; }
                      .net-income .value { float: right; color: ${utilidadNeta >= 0 ? '#047857' : '#dc2626'}; }
                      .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                      @media print { body { padding: 20px; } }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="company-name">${activeCompany?.name || 'Empresa'}</div>
                      <div class="report-title">Estado de Resultados (P&L)</div>
                      <div class="period">Período: ${dateRange.startDate} al ${dateRange.endDate}</div>
                    </div>
                    
                    <table>
                      <tr class="section-header"><td colspan="2">INGRESOS</td></tr>
                      ${ingresosRows}
                      <tr class="total-row"><td>Total Ingresos</td><td class="amount positive">$${totalIngresos.toLocaleString()}</td></tr>
                      
                      <tr class="section-header"><td colspan="2">GASTOS OPERATIVOS</td></tr>
                      ${gastosOpRows}
                      <tr class="total-row"><td>Total Gastos Operativos</td><td class="amount negative">$${totalGastosOp.toLocaleString()}</td></tr>
                      
                      <tr class="total-row"><td>UTILIDAD OPERATIVA</td><td class="amount ${utilidadOperativa >= 0 ? 'positive' : 'negative'}">$${utilidadOperativa.toLocaleString()}</td></tr>
                      
                      ${otrosGastos.length > 0 ? `
                        <tr class="section-header"><td colspan="2">OTROS GASTOS</td></tr>
                        ${otrosGastosRows}
                        <tr class="total-row"><td>Total Otros Gastos</td><td class="amount negative">$${totalOtrosGastos.toLocaleString()}</td></tr>
                      ` : ''}
                    </table>
                    
                    <div class="net-income">
                      <span class="label">UTILIDAD NETA</span>
                      <span class="value">$${utilidadNeta.toLocaleString()}</span>
                    </div>
                    <div style="text-align: right; margin-top: 10px; color: #666;">
                      Margen Neto: ${margenNeto.toFixed(2)}%
                    </div>
                    
                    <div class="footer">
                      <p>Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p>Este reporte fue generado automáticamente por el sistema de contabilidad.</p>
                    </div>
                  </body>
                  </html>
                `)
                printWindow.document.close()
                printWindow.focus()
                setTimeout(() => printWindow.print(), 250)
              }
            }}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-green-700">Total Ingresos</div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalIngresos.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-red-700">Total Gastos</div>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${(totalGastosOp + totalOtrosGastos).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700">Utilidad Neta</div>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${utilidadNeta.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-700">Margen Neto</div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {margenNeto.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report */}
        <div className="grid grid-cols-1 gap-6">
          {/* Ingresos */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center justify-between">
                <span>Ingresos</span>
                <span>${totalIngresos.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {ingresos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(item.cambio)}%
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gastos Operativos */}
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-900 flex items-center justify-between">
                <span>Gastos Operativos</span>
                <span>-${totalGastosOp.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {gastosOperativos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      {item.cambio !== 0 && (
                        <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(item.cambio)}%
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      -${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Utilidad Operativa */}
          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-blue-900">Utilidad Operativa</div>
                <div className="text-2xl font-bold text-blue-900">
                  ${utilidadOperativa.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Otros Gastos */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-900 flex items-center justify-between">
                <span>Otros Gastos</span>
                <span>-${totalOtrosGastos.toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {otrosGastos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-900 font-medium">{item.concepto}</div>
                      <div className={`flex items-center gap-1 text-sm ${item.cambio >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(item.cambio)}%
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      -${item.monto.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Utilidad Neta Final */}
          <Card className={utilidadNeta >= 0 ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300' : 'bg-gradient-to-br from-red-100 to-red-200 border-red-300'}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold mb-2 ${utilidadNeta >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    Utilidad Neta
                  </div>
                  <div className="text-sm text-gray-700">
                    Margen: {margenNeto.toFixed(2)}%
                  </div>
                </div>
                <div className={`text-4xl font-bold ${utilidadNeta >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ${utilidadNeta.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

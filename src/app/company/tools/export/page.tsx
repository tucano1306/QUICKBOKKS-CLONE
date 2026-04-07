'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { useCompany } from '@/contexts/CompanyContext'
import {
    BarChart3,
    Calendar,
    CheckCircle,
    Database,
    DollarSign,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    Package,
    Receipt,
    RefreshCw,
    TrendingUp,
    Truck,
    Users
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import toast from 'react-hot-toast'

// Tipos de exportación disponibles
const exportTypes = [
  {
    id: 'customers',
    name: 'Clientes',
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    description: 'Exportar lista completa de clientes',
    endpoint: '/api/customers',
    fields: ['name', 'email', 'phone', 'address', 'city', 'state', 'taxId', 'status', 'createdAt']
  },
  {
    id: 'vendors',
    name: 'Proveedores',
    icon: Truck,
    color: 'bg-purple-100 text-purple-600',
    description: 'Exportar lista de proveedores',
    endpoint: '/api/vendors',
    fields: ['vendorNumber', 'name', 'email', 'phone', 'address', 'city', 'status', 'totalPurchases']
  },
  {
    id: 'products',
    name: 'Productos',
    icon: Package,
    color: 'bg-green-100 text-green-600',
    description: 'Exportar catálogo de productos',
    endpoint: '/api/products',
    fields: ['name', 'sku', 'description', 'price', 'cost', 'stockQuantity', 'unit', 'active']
  },
  {
    id: 'invoices',
    name: 'Facturas',
    icon: FileText,
    color: 'bg-orange-100 text-orange-600',
    description: 'Exportar registro de facturas',
    endpoint: '/api/invoices',
    fields: ['invoiceNumber', 'customerName', 'issueDate', 'dueDate', 'subtotal', 'taxAmount', 'total', 'status']
  },
  {
    id: 'expenses',
    name: 'Gastos',
    icon: Receipt,
    color: 'bg-red-100 text-red-600',
    description: 'Exportar registro de gastos',
    endpoint: '/api/expenses',
    fields: ['date', 'description', 'category', 'vendor', 'amount', 'paymentMethod', 'status']
  },
  {
    id: 'transactions',
    name: 'Transacciones',
    icon: TrendingUp,
    color: 'bg-indigo-100 text-indigo-600',
    description: 'Exportar historial de transacciones',
    endpoint: '/api/transactions',
    fields: ['date', 'type', 'category', 'description', 'amount', 'reference', 'status']
  },
]

async function fetchDataFromEndpoint(endpoint: string, companyId: string, dateFrom: string, dateTo: string): Promise<any[]> {
  const params = new URLSearchParams()
  params.append('companyId', companyId)
  if (dateFrom) params.append('from', dateFrom)
  if (dateTo) params.append('to', dateTo)
  const response = await fetch(`${endpoint}?${params}`)
  if (!response.ok) return []
  const result = await response.json()
  return Array.isArray(result) ? result : (result.data ?? result.items ?? [])
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportDataPage() {
  const { status } = useSession()
  const { activeCompany } = useCompany()

  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [exportedFiles, setExportedFiles] = useState<{ name: string; date: Date }[]>([])

  // Toggle selección
  const toggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    )
  }

  // Seleccionar todos
  const selectAll = () => {
    if (selectedTypes.length === exportTypes.length) {
      setSelectedTypes([])
    } else {
      setSelectedTypes(exportTypes.map(t => t.id))
    }
  }

  // Exportar datos
  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Selecciona al menos un tipo de datos para exportar')
      return
    }

    if (!activeCompany?.id) {
      toast.error('Debes tener una empresa activa')
      return
    }

    setIsExporting(true)

    try {
      for (const typeId of selectedTypes) {
        const exportType = exportTypes.find(t => t.id === typeId)
        if (!exportType) continue

        const data = await fetchDataFromEndpoint(exportType.endpoint, activeCompany.id, dateFrom, dateTo)
        if (data.length === 0) {
          toast.error(`No hay datos de ${exportType.name} para exportar`)
          continue
        }

        const exportResponse = await fetch('/api/tools/excel/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, fileName: `${typeId}_export`, sheetName: exportType.name })
        })
        if (!exportResponse.ok) throw new Error(`Error al exportar ${exportType.name}`)

        triggerDownload(await exportResponse.blob(), `${exportType.name}_${new Date().toISOString().split('T')[0]}.xlsx`)
        setExportedFiles(prev => [...prev, { name: exportType.name, date: new Date() }])
      }

      toast.success(`¡${selectedTypes.length} archivo(s) exportado(s)!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al exportar')
    } finally {
      setIsExporting(false)
    }
  }

  // Exportar reporte completo
  const handleExportFullReport = async () => {
    if (!activeCompany?.id) {
      toast.error('Debes tener una empresa activa')
      return
    }

    setIsExporting(true)

    try {
      const allData: { sheetName: string; data: Record<string, unknown>[] }[] = []

      for (const exportType of exportTypes) {
        try {
          const data = await fetchDataFromEndpoint(exportType.endpoint, activeCompany.id, dateFrom, dateTo)
          if (data.length > 0) allData.push({ sheetName: exportType.name, data })
        } catch (e) {
          console.warn(`No se pudo obtener ${exportType.name}:`, e)
        }
      }

      if (allData.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const exportResponse = await fetch('/api/tools/excel/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: allData, fileName: `reporte_completo_${activeCompany.name}` })
      })
      if (!exportResponse.ok) throw new Error('Error al generar reporte')

      triggerDownload(await exportResponse.blob(), `Reporte_Completo_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('¡Reporte completo exportado!')
      setExportedFiles(prev => [...prev, { name: 'Reporte Completo', date: new Date() }])
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al exportar')
    } finally {
      setIsExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              Exportar Datos
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Descarga tus datos en formato Excel
            </p>
          </div>

          <Button
            onClick={handleExportFullReport}
            disabled={isExporting}
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Reporte Completo</span>
            <span className="sm:hidden">Reporte</span>
          </Button>
        </div>

        {/* Filtros de Fecha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Exportación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Desde
                </label>
                <DatePicker
                  value={dateFrom}
                  onChange={(date: string) => setDateFrom(date)}
                  placeholder="Fecha inicio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Hasta
                </label>
                <DatePicker
                  value={dateTo}
                  onChange={(date: string) => setDateTo(date)}
                  placeholder="Fecha fin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                  Formato
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={exportFormat === 'xlsx' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('xlsx')}
                    className="flex-1"
                  >
                    Excel (.xlsx)
                  </Button>
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('csv')}
                    className="flex-1"
                    disabled
                  >
                    CSV
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selección de Datos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Selecciona los Datos a Exportar
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedTypes.length === exportTypes.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportTypes.map(type => {
                const Icon = type.icon
                const isSelected = selectedTypes.includes(type.id)

                return (
                  <button
                    key={type.id}
                    onClick={() => toggleType(type.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg ${type.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{type.name}</h3>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {type.fields.slice(0, 3).map(field => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                          {type.fields.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{type.fields.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Botón de Exportar */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedTypes.length === 0
                    ? 'Selecciona los datos que deseas exportar'
                    : `${selectedTypes.length} tipo(s) de datos seleccionado(s)`
                  }
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTypes.length > 0 && (
                    <>
                      Exportar: {selectedTypes.map(t => exportTypes.find(et => et.id === t)?.name).join(', ')}
                    </>
                  )}
                </p>
              </div>
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedTypes.length === 0 || !activeCompany?.id}
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exportar Seleccionados
                  </>
                )}
              </Button>
            </div>

            {!activeCompany?.id && (
              <p className="text-sm text-red-600 mt-3">
                ⚠️ Debes tener una empresa activa para exportar datos
              </p>
            )}
          </CardContent>
        </Card>

        {/* Historial de Exportaciones */}
        {exportedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Archivos Exportados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">{file.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {file.date.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-900">Respaldo Financiero</h4>
              <p className="text-sm text-blue-700 mt-1">
                Mantén copias de seguridad de tu información contable
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-purple-900">Análisis Externo</h4>
              <p className="text-sm text-purple-700 mt-1">
                Usa Excel para análisis avanzados y reportes personalizados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900">Formato Compatible</h4>
              <p className="text-sm text-green-700 mt-1">
                Archivos .xlsx compatibles con Excel, Google Sheets y más
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

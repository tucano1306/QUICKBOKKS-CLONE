'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSpreadsheet,
  Upload,
  Database,
  Users,
  Package,
  Receipt,
  Truck,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Layers,
  Eye,
  X,
  TrendingUp,
  DollarSign,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// Tipos
interface ExcelSheet {
  name: string
  data: Record<string, unknown>[]
  headers: string[]
  rowCount: number
  colCount: number
}

interface ExcelFile {
  fileName: string
  sheets: ExcelSheet[]
  totalRows: number
}

interface DetectedType {
  type: string
  confidence: number
  mappings: Record<string, string>
}

export default function ImportDataPage() {
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [uploadedFile, setUploadedFile] = useState<ExcelFile | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<ExcelSheet | null>(null)
  const [detectedType, setDetectedType] = useState<DetectedType | null>(null)
  const [importTypes, setImportTypes] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<Record<string, Record<string, string>>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState<{
    success?: boolean
    imported: number
    errors: string[]
    message?: string
    types?: string[]
  } | null>(null)
  const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'result'>('upload')

  // Opciones de importación
  const importOptions = [
    { 
      value: 'customers', 
      label: 'Clientes', 
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
      description: 'Importar lista de clientes y contactos',
      fields: [
        { field: 'name', required: true, label: 'Nombre', aliases: ['nombre', 'cliente', 'customer', 'company', 'empresa'] },
        { field: 'email', required: false, label: 'Email', aliases: ['correo', 'e-mail', 'mail'] },
        { field: 'phone', required: false, label: 'Teléfono', aliases: ['telefono', 'teléfono', 'tel', 'mobile', 'celular'] },
        { field: 'address', required: false, label: 'Dirección', aliases: ['direccion', 'dirección', 'domicilio'] },
        { field: 'city', required: false, label: 'Ciudad', aliases: ['ciudad'] },
        { field: 'state', required: false, label: 'Estado', aliases: ['estado', 'provincia'] },
        { field: 'tax_id', required: false, label: 'RFC/Tax ID', aliases: ['rfc', 'ein', 'nit', 'rut', 'taxid'] },
      ]
    },
    { 
      value: 'vendors', 
      label: 'Proveedores', 
      icon: Truck,
      color: 'text-purple-600 bg-purple-100',
      description: 'Importar lista de proveedores',
      fields: [
        { field: 'name', required: true, label: 'Nombre', aliases: ['nombre', 'proveedor', 'vendor', 'supplier', 'empresa'] },
        { field: 'email', required: false, label: 'Email', aliases: ['correo', 'e-mail', 'mail'] },
        { field: 'phone', required: false, label: 'Teléfono', aliases: ['telefono', 'teléfono', 'tel'] },
        { field: 'address', required: false, label: 'Dirección', aliases: ['direccion', 'dirección'] },
      ]
    },
    { 
      value: 'products', 
      label: 'Productos', 
      icon: Package,
      color: 'text-green-600 bg-green-100',
      description: 'Importar catálogo de productos',
      fields: [
        { field: 'name', required: true, label: 'Nombre', aliases: ['nombre', 'producto', 'product', 'item', 'articulo'] },
        { field: 'sku', required: false, label: 'SKU/Código', aliases: ['codigo', 'código', 'code', 'barcode'] },
        { field: 'price', required: false, label: 'Precio', aliases: ['precio', 'unit_price', 'precio_unitario', 'valor'] },
        { field: 'cost', required: false, label: 'Costo', aliases: ['costo', 'purchase_price', 'precio_compra'] },
        { field: 'stock', required: false, label: 'Stock', aliases: ['quantity', 'cantidad', 'inventario', 'qty'] },
        { field: 'description', required: false, label: 'Descripción', aliases: ['descripcion', 'descripción', 'detalle'] },
      ]
    },
    { 
      value: 'expenses', 
      label: 'Gastos', 
      icon: Receipt,
      color: 'text-red-600 bg-red-100',
      description: 'Importar registro de gastos',
      fields: [
        { field: 'amount', required: true, label: 'Monto/Cantidades', aliases: ['monto', 'total', 'importe', 'valor', 'cantidades', 'cantidad', 'precio', 'costo', 'total gastos', 'pagos a cesar totales', 'pagos de la camioneta', 'pagos del seguro', 'ingresos mensuales bruto', 'ganancias'] },
        { field: 'description', required: false, label: 'Descripción', aliases: ['descripcion', 'descripción', 'concepto', 'detalle', 'pago', 'ingreso', 'gasto', 'mes', 'periodo'] },
        { field: 'date', required: false, label: 'Fecha/Mes', aliases: ['fecha', 'date_expense', 'fecha_gasto', 'mes', 'mes2', 'semana', 'periodo', 'año'] },
        { field: 'category', required: false, label: 'Categoría', aliases: ['categoria', 'categoría', 'tipo', 'total gastos', 'observaciones', 'pagos a cesar', 'pagos del seguro', 'pagos de la camioneta'] },
        { field: 'vendor', required: false, label: 'Proveedor', aliases: ['proveedor', 'supplier', 'empresa', 'a quien', 'beneficiario'] },
      ]
    },
    { 
      value: 'income', 
      label: 'Ingresos', 
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-100',
      description: 'Importar registro de ingresos',
      fields: [
        { field: 'amount', required: true, label: 'Monto', aliases: ['monto', 'total', 'importe', 'valor', 'cantidades', 'ingresos', 'ingresos mensuales bruto', 'ganancias', 'ingreso', 'cobro', 'venta'] },
        { field: 'description', required: false, label: 'Descripción', aliases: ['descripcion', 'descripción', 'concepto', 'detalle', 'ingreso', 'tipo', 'servicio'] },
        { field: 'date', required: false, label: 'Fecha/Mes', aliases: ['fecha', 'mes', 'mes2', 'periodo', 'semana', 'año'] },
        { field: 'category', required: false, label: 'Categoría', aliases: ['categoria', 'categoría', 'tipo', 'fuente', 'origen', 'cliente'] },
        { field: 'customer', required: false, label: 'Cliente', aliases: ['cliente', 'customer', 'pagador', 'de quien', 'origen'] },
      ]
    },
    { 
      value: 'invoices', 
      label: 'Facturas', 
      icon: FileText,
      color: 'text-orange-600 bg-orange-100',
      description: 'Importar facturas de venta',
      fields: [
        { field: 'customer', required: true, label: 'Cliente', aliases: ['cliente', 'client', 'nombre_cliente'] },
        { field: 'total', required: true, label: 'Total', aliases: ['amount', 'monto', 'importe'] },
        { field: 'date', required: false, label: 'Fecha', aliases: ['fecha', 'invoice_date', 'fecha_factura'] },
        { field: 'notes', required: false, label: 'Notas', aliases: ['notas', 'observaciones', 'comments'] },
      ]
    },
  ]

  // Procesar archivo
  const processFile = async (file: File) => {
    setIsProcessing(true)
    setImportResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/tools/excel', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al procesar archivo')
      }
      
      const result = await response.json()
      
      setUploadedFile(result.file)
      
      if (result.file.sheets.length > 0) {
        setSelectedSheet(result.file.sheets[0])
      }
      
      setDetectedType(result.detectedType)
      
      // Auto-seleccionar tipos detectados
      if (result.detectedType && result.detectedType.confidence > 50) {
        const types = [result.detectedType.type]
        setImportTypes(types)
        autoMapColumnsForTypes(types, result.file.sheets[0])
      }
      
      setStep('configure')
      toast.success(`Archivo cargado: ${result.file.totalRows} registros encontrados`)
      
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar archivo')
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-mapear columnas para múltiples tipos
  const autoMapColumnsForTypes = (types: string[], sheet: ExcelSheet) => {
    const allMappings: Record<string, Record<string, string>> = {}
    
    for (const type of types) {
      const option = importOptions.find(o => o.value === type)
      if (!option || !sheet) continue

      const newMappings: Record<string, string> = {}

      for (const field of option.fields) {
        const allAliases = [field.field, ...field.aliases]
        
        for (const header of sheet.headers) {
          const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          if (allAliases.some(alias => headerLower.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
            newMappings[header] = field.field
            break
          }
        }
      }
      
      allMappings[type] = newMappings
    }

    setColumnMappings(allMappings)
  }

  // Manejar drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const excelFile = files.find(f => f.name.match(/\.(xlsx|xls|csv)$/i))
    
    if (excelFile) {
      processFile(excelFile)
    } else {
      toast.error('Por favor sube un archivo Excel (.xlsx, .xls, .csv)')
    }
  }, [])

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Seleccionar/deseleccionar tipo de importación (multi-selección)
  const handleToggleType = (type: string) => {
    setImportTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
      
      // Actualizar mapeos para los tipos seleccionados
      if (selectedSheet) {
        autoMapColumnsForTypes(newTypes, selectedSheet)
      }
      
      return newTypes
    })
  }

  // Ejecutar importación (múltiples tipos)
  const handleImport = async () => {
    if (!selectedSheet || importTypes.length === 0 || !activeCompany?.id) {
      toast.error('Faltan datos para la importación')
      return
    }

    setIsImporting(true)

    try {
      let totalImported = 0
      let totalErrors: string[] = []
      
      // Importar cada tipo seleccionado
      for (const type of importTypes) {
        const response = await fetch('/api/tools/excel/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: type,
            data: selectedSheet.data,
            mappings: columnMappings[type] || {},
            companyId: activeCompany.id
          })
        })

        const result = await response.json()

        if (!response.ok) {
          totalErrors.push(`${type}: ${result.error || 'Error'}`)
        } else {
          totalImported += result.imported || 0
          if (result.errors?.length) {
            totalErrors.push(...result.errors.map((e: string) => `${type}: ${e}`))
          }
        }
      }

      setImportResult({
        imported: totalImported,
        errors: totalErrors,
        types: importTypes
      })
      setStep('result')
      
      if (totalImported > 0) {
        toast.success(`¡${totalImported} registros importados!`)
      }
      if (totalErrors.length > 0) {
        toast.error(`${totalErrors.length} errores durante la importación`)
      }

    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al importar datos')
    } finally {
      setIsImporting(false)
    }
  }

  // Reiniciar
  const handleReset = () => {
    setUploadedFile(null)
    setSelectedSheet(null)
    setDetectedType(null)
    setImportTypes([])
    setColumnMappings({})
    setImportResult(null)
    setStep('upload')
  }

  const selectedOptions = importOptions.filter(o => importTypes.includes(o.value))

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
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-8 h-8 text-blue-600" />
              Importar Datos
            </h1>
            <p className="text-gray-600 mt-1">
              Importa datos desde archivos Excel a tu sistema contable
            </p>
          </div>
          
          <Link href="/company/tools/excel-manager">
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Gestor Excel Avanzado
            </Button>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {['upload', 'configure', 'preview', 'result'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === s 
                  ? 'bg-blue-600 text-white' 
                  : ['upload', 'configure', 'preview', 'result'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {['upload', 'configure', 'preview', 'result'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && (
                <div className={`w-16 h-1 mx-1 ${
                  ['upload', 'configure', 'preview', 'result'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-16 text-center transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {isProcessing ? (
                  <div className="space-y-4">
                    <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
                    <p className="text-lg font-semibold text-gray-700">Procesando archivo...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 mx-auto text-blue-600" />
                    <div>
                      <p className="text-xl font-semibold text-gray-700">
                        Arrastra tu archivo Excel aquí
                      </p>
                      <p className="text-gray-500 mt-2">o haz clic para seleccionar</p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload">
                      <Button asChild className="mt-4">
                        <span>Seleccionar Archivo</span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-400">
                      Formatos soportados: .xlsx, .xls, .csv
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Options */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">¿Qué deseas importar?</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {importOptions.map(option => {
                    const Icon = option.icon
                    return (
                      <div
                        key={option.value}
                        className="p-4 rounded-lg border border-gray-200 text-center hover:border-blue-300 hover:bg-blue-50 transition-all"
                      >
                        <div className={`w-12 h-12 rounded-full ${option.color} mx-auto flex items-center justify-center mb-2`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure */}
        {step === 'configure' && uploadedFile && (
          <div className="space-y-6">
            {/* File Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{uploadedFile.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {uploadedFile.totalRows} registros • {uploadedFile.sheets.length} hoja(s)
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Detected Type */}
            {detectedType && detectedType.type !== 'unknown' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">
                        Detectado automáticamente: <span className="capitalize">{detectedType.type}</span>
                      </p>
                      <p className="text-sm text-blue-700">Confianza: {detectedType.confidence}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Select Type - Multi-selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selecciona los tipos de datos a importar</CardTitle>
                <p className="text-sm text-gray-500">Puedes seleccionar múltiples tipos para importar desde el mismo archivo</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {importOptions.map(option => {
                    const Icon = option.icon
                    const isSelected = importTypes.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleToggleType(option.value)}
                        className={`p-4 rounded-lg border-2 text-center transition-all relative ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        
                        <div className={`w-12 h-12 rounded-full ${option.color} mx-auto flex items-center justify-center mb-2`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </button>
                    )
                  })}
                </div>
                
                {importTypes.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      {importTypes.length} tipo(s) seleccionado(s): {selectedOptions.map(o => o.label).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column Mapping - Multiple types */}
            {importTypes.length > 0 && selectedSheet && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Mapeo de Columnas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Asigna cada columna de tu Excel al campo correspondiente. Los campos con * son obligatorios.
                  </p>
                  
                  {/* Tabs/Sections for each selected type */}
                  <div className="space-y-6">
                    {selectedOptions.map(option => (
                      <div key={option.value} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center`}>
                            <option.icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-semibold text-gray-900">{option.label}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {option.fields.map(field => {
                            const typeMappings = columnMappings[option.value] || {}
                            return (
                              <div key={`${option.value}-${field.field}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <label className="w-28 text-sm font-medium text-gray-700">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <select
                                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white"
                                  value={
                                    Object.entries(typeMappings).find(([, v]) => v === field.field)?.[0] || ''
                                  }
                                  onChange={(e) => {
                                    const newTypeMappings = { ...typeMappings }
                                    Object.keys(newTypeMappings).forEach(key => {
                                      if (newTypeMappings[key] === field.field) {
                                        delete newTypeMappings[key]
                                      }
                                    })
                                    if (e.target.value) {
                                      newTypeMappings[e.target.value] = field.field
                                    }
                                    setColumnMappings(prev => ({
                                      ...prev,
                                      [option.value]: newTypeMappings
                                    }))
                                  }}
                                >
                                  <option value="">-- Sin asignar --</option>
                                  {selectedSheet.headers.map(header => (
                                    <option key={header} value={header}>
                                      {header}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div className="mt-3">
                          <Badge variant="secondary">
                            {Object.keys(columnMappings[option.value] || {}).length} de {option.fields.length} campos mapeados
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {importTypes.length} tipo(s) configurados
                    </span>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleReset}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setStep('preview')}>
                        Continuar a Vista Previa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && selectedSheet && importTypes.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Vista Previa de Importación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedSheet.rowCount}</div>
                    <div className="text-sm text-gray-600">Registros</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(columnMappings).reduce((sum, m) => sum + Object.keys(m).length, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Campos Mapeados</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{importTypes.length}</div>
                    <div className="text-sm text-gray-600">Tipo(s)</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{selectedSheet.headers.length}</div>
                    <div className="text-sm text-gray-600">Columnas</div>
                  </div>
                </div>

                {/* Selected types */}
                <div className="flex flex-wrap gap-2">
                  {selectedOptions.map(opt => (
                    <Badge key={opt.value} className={`${opt.color} text-white`}>
                      <opt.icon className="w-3 h-3 mr-1" />
                      {opt.label}
                    </Badge>
                  ))}
                </div>

                {/* Data Preview */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">#</th>
                        {selectedSheet.headers.slice(0, 6).map(h => {
                          // Show which types use this column
                          const usedBy = selectedOptions.filter(opt => 
                            columnMappings[opt.value]?.[h]
                          )
                          return (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                              {h}
                              {usedBy.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {usedBy.map(opt => (
                                    <Badge key={opt.value} variant="secondary" className="text-xs">
                                      {opt.label.slice(0, 3)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSheet.data.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          {selectedSheet.headers.slice(0, 6).map(h => (
                            <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-xs">
                              {String(row[h] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedSheet.data.length > 5 && (
                    <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                      ... y {selectedSheet.data.length - 5} registros más
                    </div>
                  )}
                </div>

                {!activeCompany?.id && (
                  <div className="p-4 bg-red-50 rounded-lg text-red-700 text-center">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Debes tener una empresa activa para importar datos
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('configure')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={isImporting || !activeCompany?.id}
                    className="gap-2"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Importar {selectedSheet.rowCount} Registros
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && importResult && (
          <Card className={importResult.imported > 0 ? 'border-green-300' : 'border-red-300'}>
            <CardContent className="p-8 text-center">
              {importResult.imported > 0 ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">
                    ¡Importación Exitosa!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Se importaron <strong>{importResult.imported}</strong> registros correctamente
                  </p>
                  {importResult.types && importResult.types.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {importResult.types.map((type: string) => {
                        const opt = importOptions.find(o => o.value === type)
                        return opt ? (
                          <Badge key={type} className={`${opt.color} text-white`}>
                            <opt.icon className="w-3 h-3 mr-1" />
                            {opt.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-700 mb-2">
                    Error en la Importación
                  </h2>
                </>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50 rounded-lg text-left max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-orange-800 mb-2">
                    Errores ({importResult.errors.length}):
                  </h4>
                  <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                    {importResult.errors.slice(0, 10).map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="font-semibold">... y {importResult.errors.length - 10} más</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-4 mt-6">
                <Button variant="outline" onClick={handleReset}>
                  Importar Otro Archivo
                </Button>
                {importTypes.length === 1 && (
                  <Link href={`/company/${importTypes[0]}`}>
                    <Button>
                      Ver {selectedOptions[0]?.label || 'Registros'}
                    </Button>
                  </Link>
                )}
                {importTypes.length > 1 && (
                  <Link href="/company">
                    <Button>
                      Ver Empresa
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

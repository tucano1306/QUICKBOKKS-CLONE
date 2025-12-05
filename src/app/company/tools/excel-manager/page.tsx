'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSpreadsheet,
  Upload,
  Table,
  BarChart3,
  Download,
  Trash2,
  Eye,
  Calculator,
  Database,
  Layers,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

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

interface ExcelAnalysis {
  summary: {
    totalRows: number
    totalColumns: number
    dataTypes: Record<string, number>
  }
  columns: {
    name: string
    type: string
    uniqueValues: number
    nullCount: number
    sampleValues: unknown[]
  }[]
  numericStats: {
    column: string
    min: number
    max: number
    sum: number
    avg: number
    count: number
  }[]
}

interface DetectedType {
  type: string
  confidence: number
  mappings: Record<string, string>
}

export default function ExcelManagerPage() {
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [excelFiles, setExcelFiles] = useState<ExcelFile[]>([])
  const [selectedFile, setSelectedFile] = useState<ExcelFile | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<ExcelSheet | null>(null)
  const [analysis, setAnalysis] = useState<ExcelAnalysis | null>(null)
  const [detectedType, setDetectedType] = useState<DetectedType | null>(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Estados para la tabla
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Procesar archivo con la API
  const processFile = async (file: File) => {
    setIsProcessing(true)
    
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
      
      setExcelFiles(prev => [...prev, result.file])
      setSelectedFile(result.file)
      
      if (result.file.sheets.length > 0) {
        setSelectedSheet(result.file.sheets[0])
      }
      
      setAnalysis(result.analysis)
      setDetectedType(result.detectedType)
      setActiveTab('view')
      setCurrentPage(1)
      
      toast.success(`Archivo "${file.name}" cargado con ${result.file.totalRows} registros`)
      
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar archivo')
    } finally {
      setIsProcessing(false)
    }
  }

  // Manejar drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const excelFile = files.find(f => 
      f.name.match(/\.(xlsx|xls|csv)$/i)
    )
    
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

  // Exportar datos
  const handleExport = async () => {
    if (!selectedSheet) return
    
    try {
      const response = await fetch('/api/tools/excel/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: getFilteredData(),
          fileName: `${selectedSheet.name}_export`,
          sheetName: selectedSheet.name
        })
      })
      
      if (!response.ok) throw new Error('Error al exportar')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedSheet.name}_export_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('Archivo exportado')
    } catch (error) {
      toast.error('Error al exportar')
    }
  }

  // Filtrar y ordenar datos
  const getFilteredData = () => {
    if (!selectedSheet) return []
    
    let data = [...selectedSheet.data]
    
    // Búsqueda
    if (searchTerm) {
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
    
    // Ordenar
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        const comparison = String(aVal).localeCompare(String(bVal))
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }
    
    return data
  }

  // Paginación
  const filteredData = getFilteredData()
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Cambiar ordenamiento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Eliminar archivo
  const handleDeleteFile = (fileName: string) => {
    setExcelFiles(prev => prev.filter(f => f.fileName !== fileName))
    if (selectedFile?.fileName === fileName) {
      setSelectedFile(null)
      setSelectedSheet(null)
      setAnalysis(null)
      setDetectedType(null)
      setActiveTab('upload')
    }
    toast.success('Archivo eliminado')
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              Gestor de Archivos Excel
            </h1>
            <p className="text-gray-600 mt-1">
              Carga, analiza y gestiona datos de archivos Excel
            </p>
          </div>
          
          {excelFiles.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Database className="w-4 h-4 mr-1" />
                {excelFiles.length} archivo(s)
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Layers className="w-4 h-4 mr-1" />
                {excelFiles.reduce((sum, f) => sum + f.totalRows, 0)} registros
              </Badge>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Cargar
            </TabsTrigger>
            <TabsTrigger value="view" disabled={!selectedSheet} className="flex items-center gap-2">
              <Table className="w-4 h-4" />
              Ver Datos
            </TabsTrigger>
            <TabsTrigger value="analyze" disabled={!analysis} className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analizar
            </TabsTrigger>
            <TabsTrigger value="import" disabled={!selectedSheet} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          {/* Tab: Cargar */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Uploader */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                      isDragging 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    {isProcessing ? (
                      <div className="space-y-4">
                        <RefreshCw className="w-16 h-16 mx-auto text-green-600 animate-spin" />
                        <p className="text-lg font-semibold text-gray-700">Procesando archivo...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FileSpreadsheet className="w-16 h-16 mx-auto text-green-600" />
                        <div>
                          <p className="text-lg font-semibold text-gray-700">
                            Arrastra un archivo Excel aquí
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            o haz clic para seleccionar
                          </p>
                        </div>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="excel-upload"
                        />
                        <Button asChild>
                          <label htmlFor="excel-upload" className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Seleccionar Archivo
                          </label>
                        </Button>
                        <p className="text-xs text-gray-400">
                          Formatos: .xlsx, .xls, .csv (máx. 25MB)
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de archivos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Archivos Cargados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {excelFiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>No hay archivos cargados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {excelFiles.map((file, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedFile?.fileName === file.fileName
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            setSelectedFile(file)
                            if (file.sheets.length > 0) {
                              setSelectedSheet(file.sheets[0])
                            }
                            setCurrentPage(1)
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-10 h-10 text-green-600" />
                            <div>
                              <p className="font-semibold text-gray-900">{file.fileName}</p>
                              <p className="text-sm text-gray-500">
                                {file.sheets.length} hoja(s) • {file.totalRows} filas
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                setSelectedFile(file)
                                if (file.sheets.length > 0) {
                                  setSelectedSheet(file.sheets[0])
                                }
                                setActiveTab('view')
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                handleDeleteFile(file.fileName)
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Ver Datos */}
          <TabsContent value="view" className="space-y-4">
            {selectedFile && selectedSheet && (
              <>
                {/* Selector de hojas */}
                {selectedFile.sheets.length > 1 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold">Hojas:</span>
                        <div className="flex gap-2">
                          {selectedFile.sheets.map((sheet, index) => (
                            <Button
                              key={index}
                              variant={selectedSheet.name === sheet.name ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedSheet(sheet)
                                setCurrentPage(1)
                              }}
                            >
                              {sheet.name}
                              <Badge variant="secondary" className="ml-2">
                                {sheet.rowCount}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Controles */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="w-5 h-5 text-gray-400" />
                        <Input
                          placeholder="Buscar en todos los datos..."
                          value={searchTerm}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="max-w-md"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {filteredData.length} de {selectedSheet.rowCount} registros
                        </span>
                        <Button variant="outline" onClick={handleExport}>
                          <Download className="w-4 h-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabla */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-12">
                              #
                            </th>
                            {selectedSheet.headers.map((header) => (
                              <th
                                key={header}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort(header)}
                              >
                                <div className="flex items-center gap-1">
                                  {header}
                                  {sortColumn === header && (
                                    <ArrowUpDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-400">
                                {(currentPage - 1) * pageSize + rowIndex + 1}
                              </td>
                              {selectedSheet.headers.map((header) => (
                                <td key={header} className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate">
                                  {String(row[header] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Filas por página:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value))
                            setCurrentPage(1)
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          Página {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Analizar */}
          <TabsContent value="analyze" className="space-y-6">
            {analysis && selectedSheet && (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6">
                      <Layers className="w-8 h-8 text-blue-600 mb-2" />
                      <div className="text-3xl font-bold text-blue-900">
                        {analysis.summary.totalRows}
                      </div>
                      <div className="text-sm text-blue-700">Total Registros</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-6">
                      <Table className="w-8 h-8 text-green-600 mb-2" />
                      <div className="text-3xl font-bold text-green-900">
                        {analysis.summary.totalColumns}
                      </div>
                      <div className="text-sm text-green-700">Columnas</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-6">
                      <Calculator className="w-8 h-8 text-purple-600 mb-2" />
                      <div className="text-3xl font-bold text-purple-900">
                        {analysis.numericStats?.length || 0}
                      </div>
                      <div className="text-sm text-purple-700">Cols. Numéricas</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-6">
                      {detectedType?.confidence && detectedType.confidence > 50 ? (
                        <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-orange-600 mb-2" />
                      )}
                      <div className="text-lg font-bold text-orange-900 capitalize">
                        {detectedType?.type || 'Desconocido'}
                      </div>
                      <div className="text-sm text-orange-700">
                        Tipo detectado ({detectedType?.confidence || 0}%)
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Estadísticas numéricas */}
                {analysis.numericStats && analysis.numericStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Estadísticas Numéricas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysis.numericStats.map((stat, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-700 mb-3 truncate">
                              {stat.column}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Mín:</span>
                                <span className="ml-1 font-mono">{stat.min.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Máx:</span>
                                <span className="ml-1 font-mono">{stat.max.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Suma:</span>
                                <span className="ml-1 font-mono">{stat.sum.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Prom:</span>
                                <span className="ml-1 font-mono">{stat.avg.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Análisis de columnas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Análisis por Columna</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Columna</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tipo</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Únicos</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Vacíos</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ejemplos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {analysis.columns.map((col, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{col.name}</td>
                              <td className="px-4 py-3">
                                <Badge variant={col.type === 'number' ? 'default' : 'secondary'}>
                                  {col.type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-gray-700">
                                {col.uniqueValues}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={col.nullCount > 0 ? 'text-orange-600' : 'text-green-600'}>
                                  {col.nullCount}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                {col.sampleValues.slice(0, 3).map((v: unknown) => String(v)).join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Importar */}
          <TabsContent value="import" className="space-y-6">
            <ImportSection 
              selectedSheet={selectedSheet}
              detectedType={detectedType}
              companyId={activeCompany?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </CompanyTabsLayout>
  )
}

// Componente separado para la importación
function ImportSection({ 
  selectedSheet, 
  detectedType, 
  companyId 
}: { 
  selectedSheet: ExcelSheet | null
  detectedType: DetectedType | null
  companyId: string | undefined
}) {
  const [importType, setImportType] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    errors: string[]
    message: string
  } | null>(null)
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})

  // Opciones de tipo de importación
  const importOptions = [
    { value: 'customers', label: 'Clientes', icon: '👥', description: 'Importar clientes/contactos' },
    { value: 'vendors', label: 'Proveedores', icon: '🏢', description: 'Importar proveedores' },
    { value: 'products', label: 'Productos', icon: '📦', description: 'Importar productos/inventario' },
    { value: 'expenses', label: 'Gastos', icon: '💸', description: 'Importar gastos/egresos' },
    { value: 'income', label: 'Ingresos', icon: '💰', description: 'Importar ingresos/ventas' },
    { value: 'invoices', label: 'Facturas', icon: '📄', description: 'Importar facturas de venta' },
  ]

  // Campos esperados por tipo
  const expectedFields: Record<string, { field: string; required: boolean; aliases: string[] }[]> = {
    customers: [
      { field: 'name', required: true, aliases: ['nombre', 'cliente', 'customer', 'company', 'empresa'] },
      { field: 'email', required: false, aliases: ['correo', 'e-mail', 'mail'] },
      { field: 'phone', required: false, aliases: ['telefono', 'teléfono', 'tel', 'mobile', 'celular'] },
      { field: 'address', required: false, aliases: ['direccion', 'dirección', 'domicilio'] },
      { field: 'city', required: false, aliases: ['ciudad'] },
      { field: 'state', required: false, aliases: ['estado', 'provincia'] },
      { field: 'zip', required: false, aliases: ['zipcode', 'codigo_postal', 'cp'] },
      { field: 'tax_id', required: false, aliases: ['rfc', 'ein', 'nit', 'rut', 'taxid'] },
    ],
    vendors: [
      { field: 'name', required: true, aliases: ['nombre', 'proveedor', 'vendor', 'supplier', 'empresa'] },
      { field: 'email', required: false, aliases: ['correo', 'e-mail', 'mail'] },
      { field: 'phone', required: false, aliases: ['telefono', 'teléfono', 'tel'] },
      { field: 'address', required: false, aliases: ['direccion', 'dirección'] },
      { field: 'website', required: false, aliases: ['web', 'url', 'sitio_web'] },
    ],
    products: [
      { field: 'name', required: true, aliases: ['nombre', 'producto', 'product', 'item', 'articulo'] },
      { field: 'sku', required: false, aliases: ['codigo', 'código', 'code', 'barcode'] },
      { field: 'price', required: false, aliases: ['precio', 'unit_price', 'precio_unitario', 'valor'] },
      { field: 'cost', required: false, aliases: ['costo', 'purchase_price', 'precio_compra'] },
      { field: 'stock', required: false, aliases: ['quantity', 'cantidad', 'inventario', 'qty'] },
      { field: 'description', required: false, aliases: ['descripcion', 'descripción', 'detalle'] },
    ],
    expenses: [
      { field: 'amount', required: true, aliases: ['monto', 'total', 'importe', 'valor', 'cantidades', 'cantidad', 'precio', 'costo', 'pago', 'total gastos', 'pagos a cesar totales', 'pagos de la camioneta', 'pagos del seguro', 'ingresos mensuales bruto', 'ganancias', 'egresos', 'ingresos'] },
      { field: 'description', required: false, aliases: ['descripcion', 'descripción', 'concepto', 'detalle', 'pago', 'ingreso', 'gasto', 'mes', 'periodo', 'tipo'] },
      { field: 'date', required: false, aliases: ['fecha', 'date_expense', 'fecha_gasto', 'mes', 'mes2', 'semana', 'periodo', 'año'] },
      { field: 'category', required: false, aliases: ['categoria', 'categoría', 'tipo', 'total gastos', 'observaciones', 'pagos a cesar', 'pagos del seguro', 'pagos de la camioneta', 'ingresos mensuales'] },
      { field: 'vendor', required: false, aliases: ['proveedor', 'supplier', 'empresa', 'a quien', 'beneficiario', 'cesar', 'maricruz'] },
    ],
    invoices: [
      { field: 'customer', required: true, aliases: ['cliente', 'client', 'nombre_cliente'] },
      { field: 'total', required: true, aliases: ['amount', 'monto', 'importe'] },
      { field: 'date', required: false, aliases: ['fecha', 'invoice_date', 'fecha_factura'] },
      { field: 'notes', required: false, aliases: ['notas', 'observaciones', 'comments'] },
    ],
    income: [
      { field: 'amount', required: true, aliases: ['monto', 'total', 'importe', 'valor', 'cantidades', 'ingresos', 'ingresos mensuales bruto', 'ganancias', 'ingreso', 'cobro', 'venta', 'bruto', 'neto'] },
      { field: 'description', required: false, aliases: ['descripcion', 'descripción', 'concepto', 'detalle', 'servicio', 'tipo', 'ingreso', 'mes', 'periodo'] },
      { field: 'date', required: false, aliases: ['fecha', 'mes', 'mes2', 'periodo', 'semana', 'año'] },
      { field: 'category', required: false, aliases: ['categoria', 'categoría', 'tipo', 'fuente', 'origen'] },
      { field: 'customer', required: false, aliases: ['cliente', 'customer', 'pagador', 'de quien', 'origen'] },
    ],
  }

  // Auto-mapear columnas cuando cambia el tipo
  const autoMapColumns = (type: string) => {
    if (!selectedSheet || !type) return

    const fields = expectedFields[type] || []
    const newMappings: Record<string, string> = {}

    for (const field of fields) {
      const allAliases = [field.field, ...field.aliases]
      
      for (const header of selectedSheet.headers) {
        const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        if (allAliases.some(alias => headerLower.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
          newMappings[header] = field.field
          break
        }
      }
    }

    setColumnMappings(newMappings)
  }

  // Ejecutar importación
  const handleImport = async () => {
    if (!selectedSheet || !importType || !companyId) {
      toast.error('Selecciona un tipo de importación')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/tools/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          data: selectedSheet.data,
          mappings: columnMappings,
          companyId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al importar')
      }

      setImportResult(result)
      
      if (result.imported > 0) {
        toast.success(`¡${result.imported} registros importados exitosamente!`)
      }
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} errores durante la importación`)
      }

    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al importar datos')
    } finally {
      setIsImporting(false)
    }
  }

  if (!selectedSheet) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Database className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Carga un archivo Excel primero para poder importar datos</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Detección automática */}
      {detectedType && detectedType.type !== 'unknown' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {detectedType.confidence > 50 ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-600" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">
                  Tipo detectado automáticamente: <span className="capitalize">{detectedType.type}</span>
                </h4>
                <p className="text-sm text-blue-700">
                  Confianza: {detectedType.confidence}% - Puedes seleccionar otro tipo si es incorrecto
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setImportType(detectedType.type)
                  autoMapColumns(detectedType.type)
                }}
              >
                Usar este tipo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            Paso 1: Selecciona el tipo de datos a importar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {importOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setImportType(option.value)
                  autoMapColumns(option.value)
                  setImportResult(null)
                }}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  importType === option.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <div className="font-semibold text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mapeo de columnas */}
      {importType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Paso 2: Mapea las columnas del Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Indica qué columna de tu Excel corresponde a cada campo. Los campos con * son obligatorios.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expectedFields[importType]?.map(field => (
                <div key={field.field} className="flex items-center gap-3">
                  <label className="w-32 text-sm font-medium text-gray-700">
                    {field.field} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    value={
                      Object.entries(columnMappings).find(([, v]) => v === field.field)?.[0] || ''
                    }
                    onChange={(e) => {
                      const newMappings = { ...columnMappings }
                      // Limpiar mapeos anteriores para este campo
                      Object.keys(newMappings).forEach(key => {
                        if (newMappings[key] === field.field) {
                          delete newMappings[key]
                        }
                      })
                      if (e.target.value) {
                        newMappings[e.target.value] = field.field
                      }
                      setColumnMappings(newMappings)
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
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                <strong>Columnas mapeadas:</strong> {Object.keys(columnMappings).length} de {expectedFields[importType]?.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa y botón de importar */}
      {importType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Paso 3: Revisar e importar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{selectedSheet.rowCount}</div>
                  <div className="text-sm text-gray-500">Registros a importar</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{Object.keys(columnMappings).length}</div>
                  <div className="text-sm text-gray-500">Columnas mapeadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{selectedSheet.headers.length}</div>
                  <div className="text-sm text-gray-500">Total columnas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold capitalize text-purple-600">{importType}</div>
                  <div className="text-sm text-gray-500">Tipo de datos</div>
                </div>
              </div>
            </div>

            {/* Preview de primeras filas */}
            <div className="overflow-x-auto max-h-48 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {selectedSheet.headers.slice(0, 6).map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">
                        {h}
                        {columnMappings[h] && (
                          <span className="ml-1 text-xs text-blue-600">→ {columnMappings[h]}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedSheet.data.slice(0, 3).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {selectedSheet.headers.slice(0, 6).map(h => (
                        <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-xs">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleImport}
                disabled={isImporting || !companyId}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Importar {selectedSheet.rowCount} registros a {importType}
                  </>
                )}
              </Button>
            </div>

            {!companyId && (
              <p className="text-sm text-red-500 text-center">
                Debes tener una empresa activa para importar datos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultados de importación */}
      {importResult && (
        <Card className={importResult.success ? 'border-green-200' : 'border-red-200'}>
          <CardHeader>
            <CardTitle className={`text-lg flex items-center gap-2 ${
              importResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {importResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              Resultado de la Importación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                importResult.success ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="font-semibold">
                  {importResult.message}
                </p>
                <p className="text-sm mt-1">
                  Se importaron <strong>{importResult.imported}</strong> registros exitosamente
                </p>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">
                    Errores ({importResult.errors.length}):
                  </h4>
                  <ul className="list-disc list-inside text-sm text-orange-700 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>... y {importResult.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

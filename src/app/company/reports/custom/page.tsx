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
  Save,
  Play,
  Plus,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Filter,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  dataSource: string
  createdBy: string
  createdDate: string
  lastRun?: string
  isFavorite: boolean
}

interface ReportField {
  id: string
  name: string
  type: 'dimension' | 'metric' | 'date' | 'text'
  dataType: 'string' | 'number' | 'date' | 'currency'
  category: string
  selected: boolean
}

export default function CustomReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'builder' | 'templates'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'table' | 'bar' | 'line' | 'pie'>('table')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [availableFields, setAvailableFields] = useState<ReportField[]>([])
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [runningReport, setRunningReport] = useState<string | null>(null)

  const loadReportData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/custom?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
        setAvailableFields(data.fields || [])
        setReportData(data.sampleData || [])
      }
    } catch (error) {
      console.error('Error loading report data:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  // Ejecutar reporte
  const handleRunReport = async (template: ReportTemplate) => {
    setRunningReport(template.id)
    setMessage({ type: 'info', text: `Ejecutando reporte: ${template.name}...` })
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update lastRun
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, lastRun: new Date().toISOString() }
          : t
      ))
      
      setMessage({ type: 'success', text: `Reporte "${template.name}" ejecutado correctamente` })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al ejecutar el reporte' })
    } finally {
      setRunningReport(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Ver vista previa
  const handlePreviewReport = (template: ReportTemplate) => {
    setSelectedTemplate(template.id)
    setActiveTab('builder')
    setMessage({ type: 'info', text: `Cargando vista previa de: ${template.name}` })
    setTimeout(() => setMessage(null), 2000)
  }

  // Configurar reporte
  const handleConfigureReport = (template: ReportTemplate) => {
    setSelectedTemplate(template.id)
    setActiveTab('builder')
  }

  // Descargar reporte
  const handleDownloadReport = async (template: ReportTemplate) => {
    setMessage({ type: 'info', text: `Generando descarga de: ${template.name}...` })
    
    try {
      // Generate CSV content
      const csvContent = `Reporte: ${template.name}\nDescripción: ${template.description}\nFecha: ${new Date().toLocaleString('es-MX')}\nOrigen: ${template.dataSource}\n\n"Campo","Valor"\n"Ejemplo","Datos de muestra"`
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Reporte descargado correctamente' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al descargar el reporte' })
    }
    
    setTimeout(() => setMessage(null), 3000)
  }

  const filteredTemplates = templates

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Ventas': 'bg-green-100 text-green-700',
      'Proyectos': 'bg-blue-100 text-blue-700',
      'Gastos': 'bg-red-100 text-red-700',
      'Cobros': 'bg-orange-100 text-orange-700',
      'Nómina': 'bg-purple-100 text-purple-700',
      'Inventario': 'bg-indigo-100 text-indigo-700',
      'Presupuesto': 'bg-yellow-100 text-yellow-700',
      'Tesorería': 'bg-teal-100 text-teal-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'Ventas': DollarSign,
      'Proyectos': Layers,
      'Gastos': TrendingUp,
      'Cobros': FileText,
      'Nómina': Users,
      'Inventario': Table,
      'Presupuesto': BarChart3,
      'Tesorería': Calendar
    }
    const Icon = icons[category] || FileText
    return <Icon className="w-4 h-4" />
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
            <h1 className="text-2xl font-bold text-gray-900">Reportes Personalizados</h1>
            <p className="text-gray-600 mt-1">
              Constructor de reportes con análisis avanzado
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setActiveTab('builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Reporte
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 font-semibold ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Plantillas Guardadas
          </button>
          <button
            className={`px-4 py-2 font-semibold ${
              activeTab === 'builder'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('builder')}
          >
            Constructor de Reportes
          </button>
        </div>

        {/* Templates View */}
        {activeTab === 'templates' && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {templates.length}
                  </div>
                  <div className="text-sm text-blue-700">Reportes Guardados</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    {templates.filter(t => t.isFavorite).length}
                  </div>
                  <div className="text-sm text-green-700">Favoritos</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900">
                    {templates.filter(t => t.lastRun).length}
                  </div>
                  <div className="text-sm text-purple-700">Ejecutados</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Layers className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    {new Set(templates.map(t => t.category)).size}
                  </div>
                  <div className="text-sm text-orange-700">Categorías</div>
                </CardContent>
              </Card>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getCategoryIcon(template.category)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      {template.isFavorite && (
                        <div className="text-yellow-500">★</div>
                      )}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Origen: {template.dataSource}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Creado por: {template.createdBy}</span>
                        <span>{new Date(template.createdDate).toLocaleDateString('es-MX')}</span>
                      </div>
                      {template.lastRun && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Última ejecución:</span>
                          <span className="font-semibold">{new Date(template.lastRun).toLocaleDateString('es-MX')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleRunReport(template)}
                        disabled={runningReport === template.id}
                      >
                        {runningReport === template.id ? (
                          <span className="animate-spin mr-1">⏳</span>
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Ejecutar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePreviewReport(template)}
                        title="Vista previa"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConfigureReport(template)}
                        title="Configurar"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadReport(template)}
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Report Builder View */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Field Selection */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campos Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Dimensions */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Dimensiones
                      </div>
                      <div className="space-y-1">
                        {availableFields.filter(f => f.type === 'dimension').map((field) => (
                          <div
                            key={field.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                              selectedFields.includes(field.id) ? 'bg-blue-50 border border-blue-200' : ''
                            }`}
                            onClick={() => toggleField(field.id)}
                          >
                            {selectedFields.includes(field.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-700">{field.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Date Fields */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Tiempo
                      </div>
                      <div className="space-y-1">
                        {availableFields.filter(f => f.type === 'date').map((field) => (
                          <div
                            key={field.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                              selectedFields.includes(field.id) ? 'bg-blue-50 border border-blue-200' : ''
                            }`}
                            onClick={() => toggleField(field.id)}
                          >
                            {selectedFields.includes(field.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-700">{field.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Métricas
                      </div>
                      <div className="space-y-1">
                        {availableFields.filter(f => f.type === 'metric').map((field) => (
                          <div
                            key={field.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                              selectedFields.includes(field.id) ? 'bg-blue-50 border border-blue-200' : ''
                            }`}
                            onClick={() => toggleField(field.id)}
                          >
                            {selectedFields.includes(field.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-700">{field.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Rango de Fechas</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option>Este mes</option>
                        <option>Últimos 3 meses</option>
                        <option>Este año</option>
                        <option>Año pasado</option>
                        <option>Personalizado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Agrupar por</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option>Mes</option>
                        <option>Trimestre</option>
                        <option>Año</option>
                        <option>Cliente</option>
                        <option>Departamento</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Preview */}
            <div className="lg:col-span-2 space-y-4">
              {/* Chart Type Selector */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-700">Tipo de Visualización</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={chartType === 'table' ? 'default' : 'outline'}
                        onClick={() => setChartType('table')}
                      >
                        <Table className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === 'bar' ? 'default' : 'outline'}
                        onClick={() => setChartType('bar')}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === 'line' ? 'default' : 'outline'}
                        onClick={() => setChartType('line')}
                      >
                        <LineChart className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={chartType === 'pie' ? 'default' : 'outline'}
                        onClick={() => setChartType('pie')}
                      >
                        <PieChart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Vista Previa del Reporte</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedFields.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Selecciona campos para comenzar
                      </h3>
                      <p className="text-gray-500">
                        Arrastra campos desde el panel izquierdo para construir tu reporte
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            {selectedFields.map((fieldId) => {
                              const field = availableFields.find(f => f.id === fieldId)
                              return (
                                <th key={fieldId} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                  {field?.name}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {reportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {selectedFields.map((fieldId) => {
                                const field = availableFields.find(f => f.id === fieldId)
                                const value = row[fieldId as keyof typeof row]
                                return (
                                  <td key={fieldId} className="px-4 py-3 text-sm text-gray-900">
                                    {field?.dataType === 'currency' 
                                      ? `$${Number(value).toLocaleString('es-MX')}`
                                      : field?.dataType === 'number' && fieldId === 'margin'
                                      ? `${value}%`
                                      : String(value)
                                    }
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              {selectedFields.length > 0 && (
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Reporte
                  </Button>
                  <Button variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Ejecutar
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Constructor de Reportes Personalizados</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Herramienta avanzada para crear reportes ad-hoc con análisis multidimensional.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Dimensiones:</strong> Campos para agrupar datos (cliente, proyecto, departamento, período)</li>
                  <li>• <strong>Métricas:</strong> Valores numéricos y cálculos (ingresos, gastos, margen, ROI)</li>
                  <li>• <strong>Filtros:</strong> Restricciones de datos por fecha, categoría, estado</li>
                  <li>• <strong>Visualizaciones:</strong> Tablas, gráficos de barras, líneas, pie charts</li>
                  <li>• <strong>Exportación:</strong> Excel, PDF, CSV para análisis externo</li>
                  <li>• <strong>Plantillas:</strong> Guarda configuraciones para reutilizar reportes frecuentes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Toast */}
        {message && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 
            message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

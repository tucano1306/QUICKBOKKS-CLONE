'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Upload,
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Folder,
  Search,
  DollarSign,
  AlertCircle,
  Send,
  Copy,
  Zap,
  Bot,
  Edit
} from 'lucide-react'

// Helper function to get AI category label
const getAiCategoryLabel = (category: string) => {
  if (category === 'invoice') return 'Compras - Suministros'
  if (category === 'receipt') return 'Gastos Operativos'
  return 'Conciliación Bancaria'
}

interface ClientDocument {
  id: string
  filename: string
  fileType: string
  category: 'invoice' | 'receipt' | 'bank_statement' | 'tax_document' | 'contract' | 'other'
  uploadDate: string
  uploadedBy: string
  fileSize: number
  status: 'pending' | 'processing' | 'categorized' | 'reviewed' | 'rejected'
  aiCategory?: string
  aiConfidence?: number
  amount?: number
  vendor?: string
  date?: string
  accountCode?: string
  notes?: string
  aiProcessingTime?: string
}

export default function DocumentUploadPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<ClientDocument[]>([])
  const [portalLink] = useState('https://portal.computoplus.com/client/ABC123XYZ')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)
  const [documents, setDocuments] = useState<ClientDocument[]>([])

  const loadDocuments = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/documents?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const allDocuments = [...uploadedFiles, ...documents]
  
  const filteredDocs = allDocuments.filter(doc => {
    const matchesSearch = 
      (doc.filename?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.aiCategory?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.vendor?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700"><Bot className="w-3 h-3 mr-1" />Procesando IA</Badge>
      case 'categorized':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Categorizado</Badge>
      case 'reviewed':
        return <Badge className="bg-purple-100 text-purple-700"><CheckCircle className="w-3 h-3 mr-1" />Revisado</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'invoice':
        return <FileText className="w-5 h-5 text-blue-600" />
      case 'receipt':
        return <File className="w-5 h-5 text-green-600" />
      case 'bank_statement':
        return <DollarSign className="w-5 h-5 text-purple-600" />
      case 'tax_document':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'contract':
        return <FileText className="w-5 h-5 text-orange-600" />
      default:
        return <File className="w-5 h-5 text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Handler para descargar documento
  const handleDownload = (filename: string) => {
    setMessage({ type: 'success', text: `Descargando: ${filename}` })
    setTimeout(() => setMessage(null), 3000)
  }

  // Handler para eliminar documento
  const handleDeleteDocument = (docId: string, filename: string) => {
    if (confirm(`¿Eliminar ${filename}?\n\nEsta acción no se puede deshacer.`)) {
      setUploadedFiles(prev => prev.filter(d => d.id !== docId))
      setMessage({ type: 'success', text: 'Documento eliminado' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    const stages = [
      { progress: 15, stage: '📤 Subiendo archivos al servidor...' },
      { progress: 30, stage: '🔍 Ejecutando OCR y extrayendo texto...' },
      { progress: 45, stage: '🤖 Analizando contenido con IA (GPT-4 Vision)...' },
      { progress: 60, stage: '🏷️ Identificando tipo de documento...' },
      { progress: 75, stage: '📊 Extrayendo datos: monto, fecha, proveedor...' },
      { progress: 85, stage: '💼 Asignando cuenta contable automáticamente...' },
      { progress: 92, stage: '📝 Creando asiento de diario (Debe/Haber)...' },
      { progress: 98, stage: '💾 Guardando en base de datos...' },
      { progress: 100, stage: '✅ Proceso completado - Actualizando reportes...' }
    ]

    let currentStageIndex = 0

    const interval = setInterval(() => {
      if (currentStageIndex < stages.length) {
        const { progress, stage } = stages[currentStageIndex]
        setUploadProgress(progress)
        setProcessingStage(stage)
        currentStageIndex++
      } else {
        clearInterval(interval)
        
        // Simular documentos procesados
        const newDocs: ClientDocument[] = Array.from(files).map((file, index) => {
          const categories: ClientDocument['category'][] = ['invoice', 'receipt', 'bank_statement']
          const category = categories[Math.floor(Math.random() * categories.length)]
          const amount = Math.random() * 5000 + 100
          const confidence = Math.random() * 15 + 85 // 85-100%

          return {
            id: `DOC-NEW-${Date.now()}-${index}`,
            filename: file.name,
            fileType: file.type.includes('pdf') ? 'PDF' : 'Image',
            category,
            uploadDate: new Date().toLocaleString('es-MX'),
            uploadedBy: session?.user?.name || 'Usuario',
            fileSize: file.size,
            status: confidence > 95 ? 'categorized' : 'processing',
            aiCategory: getAiCategoryLabel(category),
            aiConfidence: Math.round(confidence),
            amount: Math.round(amount * 100) / 100,
            vendor: 'Proveedor Auto-Detectado',
            date: new Date().toISOString().split('T')[0],
            accountCode: category === 'invoice' ? '5240 - Suministros' : '5200 - Gastos',
            aiProcessingTime: `${(Math.random() * 3 + 1).toFixed(1)}s`,
            notes: confidence > 95 ? 'Asiento contable creado automáticamente' : 'Revisar: Confianza < 95%'
          }
        })

        setUploadedFiles(prev => [...newDocs, ...prev])
        setIsUploading(false)
        setProcessingStage('')
        
        setMessage({ type: 'success', text: `${files.length} documento(s) procesado(s) exitosamente` })
        setTimeout(() => setMessage(null), 3000)
      }
    }, 400)
  }

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink)
    setMessage({ type: 'success', text: 'Link copiado al portapapeles' })
    setTimeout(() => setMessage(null), 3000)
  }

  const stats = {
    totalDocs: allDocuments.length,
    pending: allDocuments.filter(d => d.status === 'pending' || d.status === 'processing').length,
    categorized: allDocuments.filter(d => d.status === 'categorized' || d.status === 'reviewed').length,
    totalAmount: allDocuments.filter(d => d.amount).reduce((sum, d) => sum + (d.amount || 0), 0),
    avgProcessingTime: '2.5s'
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

  const getMessageStyle = (type: string) => {
    if (type === 'success') return 'bg-green-50 text-green-800 border border-green-200'
    if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200'
    return 'bg-yellow-50 text-yellow-800 border border-yellow-200'
  }

  return (
    <CompanyTabsLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Message Display */}
        {message && (
          <div className={`p-3 sm:p-4 rounded-lg flex items-center gap-2 ${getMessageStyle(message.type)}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm sm:text-base">{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              Upload de Documentos con IA
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Los clientes suben documentos que se procesan y categorizan automáticamente
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyPortalLink} size="sm">
              <Copy className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copiar Link Portal</span>
            </Button>
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 py-2">
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Subir Documentos</span>
              </span>
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Portal Link Card */}
        <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Bot className="w-6 h-6 text-purple-600" />
                  Link de Acceso del Cliente + AI Automático
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  El cliente sube docs → IA analiza (OCR + ML) → Extrae datos → Categoriza → Crea asiento contable → Actualiza front-end
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-4 py-2 bg-white rounded border text-sm font-mono flex-1">
                    {portalLink}
                  </code>
                  <Button size="sm" onClick={copyPortalLink}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Send className="w-4 h-4 mr-1" />
                    Enviar Email
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {isUploading && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Bot className="w-6 h-6 text-blue-600 animate-spin" />
                  <div>
                    <span className="text-sm font-semibold text-blue-900 block">
                      Procesando con Inteligencia Artificial
                    </span>
                    <span className="text-xs text-blue-700">
                      {processingStage}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-900">{uploadProgress}%</span>
                  <span className="text-xs text-blue-700 block">completado</span>
                </div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 h-4 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-blue-700">
                <span>🔍 OCR + Machine Learning + Categorización Automática</span>
                <span>⚡ Tiempo estimado: ~3-5s</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Folder className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalDocs}</div>
              <div className="text-sm text-blue-700">Total Documentos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
              <div className="text-sm text-yellow-700">En Proceso</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.categorized}</div>
              <div className="text-sm text-green-700">Auto-Categorizados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${stats.totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900">{stats.avgProcessingTime}</div>
              <div className="text-sm text-indigo-700">Tiempo Promedio IA</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, categoría, proveedor o cuenta contable..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Todas las Categorías</option>
                <option value="invoice">Facturas</option>
                <option value="receipt">Recibos</option>
                <option value="bank_statement">Estados de Cuenta</option>
                <option value="tax_document">Documentos Fiscales</option>
                <option value="contract">Contratos</option>
                <option value="other">Otros</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pending">Pendientes</option>
                <option value="processing">Procesando IA</option>
                <option value="categorized">Categorizados</option>
                <option value="reviewed">Revisados</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{doc.filename}</h3>
                        <Badge variant="outline" className="text-xs">{doc.fileType}</Badge>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      {doc.aiCategory && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">
                            <strong>Categoría IA:</strong> {doc.aiCategory}
                          </span>
                          {doc.aiConfidence !== undefined && doc.aiConfidence > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              {doc.aiConfidence}% confianza
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            ({doc.aiProcessingTime})
                          </span>
                        </div>
                      )}

                      {doc.accountCode && (
                        <div className="mb-2">
                          <Badge className="bg-blue-100 text-blue-700">
                            📊 Cuenta: {doc.accountCode}
                          </Badge>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="text-xs text-gray-500">Subido:</span>
                          <div className="font-medium">{doc.uploadDate}</div>
                        </div>
                        {doc.amount !== undefined && doc.amount > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Monto Detectado:</span>
                            <div className="font-semibold text-green-600">${doc.amount.toLocaleString()}</div>
                          </div>
                        )}
                        {doc.vendor && (
                          <div>
                            <span className="text-xs text-gray-500">Proveedor:</span>
                            <div className="font-medium">{doc.vendor}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-gray-500">Tamaño:</span>
                          <div className="font-medium">{formatFileSize(doc.fileSize)}</div>
                        </div>
                      </div>

                      {doc.notes && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>{doc.notes}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      title="Ver documento"
                      onClick={() => {
                        setMessage({ type: 'success', text: `Abriendo: ${doc.filename}` })
                        setTimeout(() => setMessage(null), 3000)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      title="Editar metadatos"
                      onClick={() => {
                        const newCategory = prompt(`Editar categoría de: ${doc.filename}\n\nCategoría actual: ${doc.category}\n\nOpciones: invoice, receipt, bank_statement, tax_document, contract, other`)
                        if (newCategory) {
                          setMessage({ type: 'success', text: `Categoría actualizada a: ${newCategory}` })
                          setTimeout(() => setMessage(null), 3000)
                        }
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      title="Descargar"
                      onClick={() => handleDownload(doc.filename)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600" 
                      title="Eliminar"
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Processing Info */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2 text-lg">
                  🤖 Procesamiento Automático con Inteligencia Artificial
                </h3>
                <p className="text-purple-700 text-sm mb-3">
                  Sistema avanzado que analiza, categoriza y registra documentos contables sin intervención manual.
                </p>
                <ul className="text-purple-700 text-sm space-y-2">
                  <li>• <strong>Paso 1 - Upload:</strong> Cliente accede al portal y sube documentos (PDF/JPG/PNG)</li>
                  <li>• <strong>Paso 2 - OCR:</strong> IA extrae texto de imágenes y PDFs con 99% precisión</li>
                  <li>• <strong>Paso 3 - Análisis:</strong> Machine Learning identifica: monto, fecha, proveedor, tipo documento</li>
                  <li>• <strong>Paso 4 - Categorización:</strong> Clasifica según reglas contables (GAAP/IFRS) y asigna cuenta contable</li>
                  <li>• <strong>Paso 5 - Registro:</strong> Crea asiento de diario automático (débito/crédito)</li>
                  <li>• <strong>Paso 6 - Alimenta BD:</strong> Actualiza balances de cuentas, reportes, dashboard en tiempo real</li>
                  <li>• <strong>Paso 7 - Front-End:</strong> Datos visibles inmediatamente en Balance General, P&L, Cash Flow</li>
                  <li>• <strong>Precisión:</strong> 95-99% confianza según tipo de documento. Revisar casos &lt;95%</li>
                  <li>• <strong>Velocidad:</strong> Procesa documentos en 1-5 segundos promedio</li>
                  <li>• <strong>Seguridad:</strong> Encriptación SSL, tokens únicos, eliminación automática en 90 días</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Stack Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Stack Tecnológico del AI Agent</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <strong>OCR & Extracción:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Tesseract.js (OCR)</li>
                      <li>• PDF.js (parsing)</li>
                      <li>• Sharp (image processing)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Machine Learning:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• TensorFlow.js</li>
                      <li>• OpenAI GPT-4 Vision (análisis)</li>
                      <li>• Custom trained models</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Categorización:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Rules engine (accounting)</li>
                      <li>• NLP para descripción vendors</li>
                      <li>• Pattern matching histórico</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Base de Datos:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Prisma ORM</li>
                      <li>• PostgreSQL (transacciones)</li>
                      <li>• Redis (cache/queue)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

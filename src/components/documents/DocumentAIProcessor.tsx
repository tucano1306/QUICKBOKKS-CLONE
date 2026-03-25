'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'

// Tipos
interface DocumentAnalysis {
  documentType: string
  confidence: number
  extractedData: {
    amount: number | null
    date: string | null
    dueDate: string | null
    vendor: string | null
    invoiceNumber: string | null
    description: string | null
    taxAmount: number | null
    subtotal: number | null
    lineItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      amount: number
    }>
  }
  suggestedAccount: {
    id: string
    code: string
    name: string
  } | null
  suggestedCategory: string
  journalEntry: {
    description: string
    lines: Array<{
      accountCode: string
      accountName: string
      debit: number
      credit: number
    }>
  } | null
  vendor: {
    id: string
    name: string
    confidence: number
    isNew: boolean
  } | null
  processingTime: number
}

interface ProcessingLog {
  id: string
  stage: string
  status: 'SUCCESS' | 'ERROR' | 'WARNING'
  message: string
  duration: number
  createdAt: string
}

interface UploadedDocument {
  id: string
  filename: string
  originalFilename: string
  mimeType: string
  fileSize: number
  status: 'PENDING' | 'PROCESSING' | 'ANALYZED' | 'APPROVED' | 'REJECTED' | 'ERROR'
  documentType: string | null
  ocrText: string | null
  ocrConfidence: number | null
  aiAnalysis: DocumentAnalysis | null
  extractedData: DocumentAnalysis['extractedData'] | null
  suggestedCategory: string | null
  suggestedAccount: {
    id: string
    code: string
    name: string
  } | null
  aiConfidence: number | null
  amount: number | null
  documentDate: string | null
  invoiceNumber: string | null
  description: string | null
  vendor: {
    id: string
    name: string
  } | null
  journalEntry: {
    id: string
    entryNumber: string
    description: string
  } | null
  processingLogs: ProcessingLog[]
  processingTime: number | null
  errorMessage: string | null
  createdAt: string
  uploadedBy: {
    name: string
    email: string
  }
}

interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  ANALYZED: { label: 'Analyzed', color: 'bg-purple-100 text-purple-800', icon: Brain },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const documentTypeConfig: Record<string, { label: string; color: string }> = {
  INVOICE: { label: 'Invoice', color: 'bg-blue-500' },
  RECEIPT: { label: 'Receipt', color: 'bg-green-500' },
  BANK_STATEMENT: { label: 'Bank Statement', color: 'bg-purple-500' },
  TAX_DOCUMENT: { label: 'Tax Document', color: 'bg-orange-500' },
  CONTRACT: { label: 'Contract', color: 'bg-gray-500' },
  EXPENSE_REPORT: { label: 'Expense Report', color: 'bg-yellow-500' },
  PAYROLL: { label: 'Payroll', color: 'bg-pink-500' },
  OTHER: { label: 'Other', color: 'bg-gray-400' },
}

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('image')) return ImageIcon
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return File
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-500'
  if (confidence >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatValue(value: unknown, key: string): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
    return formatCurrency(value)
  }
  return String(value as string | number | boolean)
}

type DOMFileConstructor = new (parts: BlobPart[], filename: string, options?: FilePropertyBag) => File

function blobToFile(blob: Blob | null, fallback: File, outputName: string): File {
  if (!blob) return fallback
  return new (File as unknown as DOMFileConstructor)([blob], outputName, { type: 'image/jpeg' })
}

async function compressImage(file: File): Promise<File> {
  const MAX_PX = 1200
  const QUALITY = 0.78
  const serial = String(Math.floor(10000 + Math.random() * 90000))
  const outputName = `${serial}.jpg`

  try {
    // createImageBitmap sin opciones de resize — compatible con todos los browsers
    // (las opciones de resize no están soportadas en iOS < 15.4)
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Escalar manualmente al tamaño objetivo
    const scale = Math.min(1, MAX_PX / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    // El canvas es pequeño (~5MB RAM) aunque el bitmap sea grande
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close() // liberar GPU memory

    return await new Promise<File>((resolve) => {
      canvas.toBlob((blob) => resolve(blobToFile(blob, file, outputName)), 'image/jpeg', QUALITY)
    })
  } catch (err) {
    console.error('Error al comprimir imagen, se usará el archivo original:', err)
    return file
  }
}

export default function DocumentAIProcessor() {
  const { activeCompany } = useCompany()
  const { update: refreshSession } = useSession()
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [autoProcess, setAutoProcess] = useState(true)
  const [autoCreateJournalEntry, setAutoCreateJournalEntry] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [filter, setFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Estados editables para el diálogo de aprobación
  const [editAmount, setEditAmount] = useState<string>('')
  const [editVendor, setEditVendor] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')
  const [editReference, setEditReference] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      let url = '/api/documents/process-ai'
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (activeCompany?.id) params.set('companyId', activeCompany.id)
      const qs = params.toString()
      if (qs) url += '?' + qs

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        console.error('[loadDocuments] Error:', data?.error)
        setUploadError(data?.error || 'Error cargando documentos')
        return
      }
      if (data.documents) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter, activeCompany?.id])

  const loadAccounts = useCallback(async () => {
    try {
      const accountsQuery = activeCompany?.id ? `?companyId=${activeCompany.id}` : ''
      const response = await fetch(`/api/accounts${accountsQuery}`)
      const data = await response.json()
      const list: ChartOfAccount[] = Array.isArray(data) ? data as ChartOfAccount[] : (data.accounts ?? []) as ChartOfAccount[]
      setAccounts(list)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }, [activeCompany?.id])

  // Cargar documentos y cuentas en paralelo
  useEffect(() => {
    void Promise.all([loadDocuments(), loadAccounts()])
  }, [loadDocuments, loadAccounts])

  // Upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Refrescar sesión antes de subir (resuelve falsos 401 en Android tras cámara)
    await refreshSession()

    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('autoProcess', String(autoProcess))
      formData.append('autoCreateJournalEntry', String(autoCreateJournalEntry))
      if (activeCompany?.id) {
        formData.append('companyId', activeCompany.id)
      }

      try {
        setUploadProgress(((i + 0.5) / acceptedFiles.length) * 100)

        const response = await fetch('/api/documents/process-ai', {
          method: 'POST',
          body: formData
        })

        if (response.status === 401) {
          // Sesión expirada — intentar refetch y reintentar una vez
          await refreshSession()
          const retry = await fetch('/api/documents/process-ai', { method: 'POST', body: formData })
          if (!retry.ok) {
            setUploadError('Sesión expirada. Por favor recarga la página e intenta de nuevo.')
            setIsUploading(false)
            return
          }
          const retryData = await retry.json()
          if (retryData.document) {
            setUploadError(null)
            setDocuments(prev => [retryData.document, ...prev])
          }
          continue
        }

        const data = await response.json()

        if (!response.ok || !data.success) {
          const msg = data?.error || `Error subiendo ${file.name}`
          console.error('[Upload]', msg, data)
          setUploadError(msg)
          continue
        } else if (data.document) {
          setUploadError(null)
          setDocuments(prev => [data.document, ...prev])
        }

        setUploadProgress(((i + 1) / acceptedFiles.length) * 100)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido'
        console.error('Error uploading file:', error)
        setUploadError(msg)
      }
    }

    setIsUploading(false)
    setUploadProgress(0)
    // Refresh list from DB to ensure consistency
    loadDocuments()
  }, [autoProcess, autoCreateJournalEntry, activeCompany, loadDocuments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { onDrop(files) },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  // Inicializar valores editables cuando se selecciona un documento
  const initEditableValues = (doc: UploadedDocument) => {
    // Dejar monto vacío para que el usuario ingrese el real
    setEditAmount('')
    setEditVendor(doc.aiAnalysis?.extractedData?.vendor || '')
    setEditDate(doc.aiAnalysis?.extractedData?.date || new Date().toISOString().split('T')[0])
    setEditReference(doc.aiAnalysis?.extractedData?.invoiceNumber || '')
    setEditDescription(doc.aiAnalysis?.extractedData?.description || doc.description || doc.originalFilename || '')
  }

  // Document actions
  const handleApprove = async (doc: UploadedDocument, accountId?: string) => {
    if (!activeCompany?.id) {
      alert('No hay empresa activa seleccionada')
      return
    }

    // Validar monto
    const parsedAmount = Number.parseFloat(editAmount.replaceAll(',', ''))
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0')
      return
    }

    try {
      const response = await fetch('/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'approve',
          companyId: activeCompany.id,
          accountId: accountId || doc.suggestedAccount?.id,
          journalEntryData: doc.aiAnalysis?.journalEntry,
          createExpense: true, // Crear transacción automáticamente
          expenseData: {
            amount: parsedAmount, // Usar el valor editado
            date: editDate || new Date().toISOString().split('T')[0],
            description: editDescription || doc.originalFilename,
            category: doc.aiAnalysis?.suggestedCategory || 'Gastos Generales',
            vendor: editVendor || undefined,
            reference: editReference || undefined
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(prev =>
          prev.map(d => d.id === doc.id ? data.document : d)
        )
        setIsApproveDialogOpen(false)

        // Mostrar mensaje de éxito
        if (data.transaction) {
          alert(`✅ Documento aprobado y gasto creado por $${data.transaction.amount.toFixed(2)}`)
        }
      }
    } catch (error) {
      console.error('Error approving document:', error)
      alert('Error al aprobar el documento')
    }
  }

  const handleReject = async (doc: UploadedDocument) => {
    try {
      const response = await fetch('/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'reject'
        })
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(prev =>
          prev.map(d => d.id === doc.id ? data.document : d)
        )
      }
    } catch (error) {
      console.error('Error rejecting document:', error)
    }
  }

  const handleReprocess = async (doc: UploadedDocument) => {
    try {
      const response = await fetch('/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'reprocess'
        })
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(prev =>
          prev.map(d => d.id === doc.id ? data.document : d)
        )
      }
    } catch (error) {
      console.error('Error reprocessing document:', error)
    }
  }

  const handleDelete = async (doc: UploadedDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/process-ai?id=${doc.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== doc.id))
        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(null)
          setIsDetailOpen(false)
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const viewDocumentDetail = async (doc: UploadedDocument) => {
    try {
      const response = await fetch(`/api/documents/process-ai?id=${doc.id}`)
      const data = await response.json()
      if (data.document) {
        setSelectedDocument(data.document)
        setIsDetailOpen(true)
      }
    } catch (error) {
      console.error('Error loading document details:', error)
    }
  }

  // Stats
  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING').length,
    analyzed: documents.filter(d => d.status === 'ANALYZED').length,
    approved: documents.filter(d => d.status === 'APPROVED').length,
    errors: documents.filter(d => d.status === 'ERROR' || d.status === 'REJECTED').length
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            AI Document Processor
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Upload documents for automatic OCR analysis and accounting categorization
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" className="self-start sm:self-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 flex items-center justify-between text-sm">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-4 font-bold text-red-600 hover:text-red-800">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analyzed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Errors/Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Drag and drop files or click to upload. AI will automatically analyze and categorize your documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Settings */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-process"
                  checked={autoProcess}
                  onCheckedChange={setAutoProcess}
                />
                <Label htmlFor="auto-process">Auto-process with AI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-journal"
                  checked={autoCreateJournalEntry}
                  onCheckedChange={setAutoCreateJournalEntry}
                  disabled={!autoProcess}
                />
                <Label htmlFor="auto-journal" className={autoProcess ? '' : 'text-muted-foreground'}>
                  Auto-create journal entries
                </Label>
              </div>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                isUploading && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the files here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Drag & drop files here</p>
                  <p className="text-muted-foreground">or click to select files</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supports: PDF, Images (PNG, JPG, TIFF), Excel, CSV • Max 10MB
                  </p>
                </>
              )}
            </div>

            {/* Camera Capture Button - Especialmente útil en móviles */}
            <div className="flex justify-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="camera-capture"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) {
                    void Promise.all(Array.from(files).map(compressImage)).then(onDrop)
                  }
                  e.target.value = '' // Reset para permitir capturar la misma imagen
                }}
                disabled={isUploading}
              />
              <label htmlFor="camera-capture">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Camera className="h-5 w-5" />
                    Tomar Foto con Cámara
                  </span>
                </Button>
              </label>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading and processing...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Processed Documents</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="ANALYZED">Analyzed</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && documents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
              <p className="text-sm">Upload some documents to get started</p>
            </div>
          )}
          {!isLoading && documents.length > 0 && (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const FileIcon = getFileIcon(doc.mimeType)
                  const StatusIcon = statusConfig[doc.status]?.icon || Clock
                  const docType = documentTypeConfig[doc.documentType || 'OTHER'] || documentTypeConfig.OTHER
                  let amountDisplay: React.ReactNode
                  if (doc.status === 'ANALYZED') {
                    amountDisplay = <span className="text-orange-500 text-xs italic">Pendiente verificar</span>
                  } else {
                    amountDisplay = doc.amount ? formatCurrency(doc.amount) : '-'
                  }

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium truncate max-w-[200px]" title={doc.originalFilename}>
                              {doc.originalFilename.length > 22
                                ? `${doc.originalFilename.slice(0, 10)}…${doc.originalFilename.slice(-8)}`
                                : doc.originalFilename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.documentType && (
                          <Badge variant="outline" className={cn('text-white', docType.color)}>
                            {docType.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[doc.status]?.color}>
                          <StatusIcon className={cn(
                            'h-3 w-3 mr-1',
                            doc.status === 'PROCESSING' && 'animate-spin'
                          )} />
                          {statusConfig[doc.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {amountDisplay}
                      </TableCell>
                      <TableCell>
                        {doc.vendor?.name ||
                         doc.extractedData?.vendor ||
                         '-'}
                      </TableCell>
                      <TableCell>
                        {doc.suggestedCategory || '-'}
                      </TableCell>
                      <TableCell>
                        {doc.aiConfidence ? (
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              getConfidenceColor(doc.aiConfidence)
                            )} />
                            {doc.aiConfidence}%
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewDocumentDetail(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status === 'ANALYZED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedDocument(doc)
                                  setSelectedAccount(doc.suggestedAccount?.id || '')
                                  initEditableValues(doc)
                                  setIsApproveDialogOpen(true)
                                }}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleReject(doc)}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(doc.status === 'ERROR' || doc.status === 'REJECTED') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReprocess(doc)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate text-sm sm:text-base">{selectedDocument?.originalFilename}</span>
            </DialogTitle>
            <DialogDescription>
              Document details and AI analysis results
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <Tabs defaultValue="overview" className="w-full flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">Overview</TabsTrigger>
                <TabsTrigger value="extracted" className="text-xs sm:text-sm px-1 sm:px-3">Datos</TabsTrigger>
                <TabsTrigger value="journal" className="text-xs sm:text-sm px-1 sm:px-3">Asiento</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs sm:text-sm px-1 sm:px-3">Logs</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[55dvh] sm:h-[500px] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  {/* Status & Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge className={statusConfig[selectedDocument.status]?.color}>
                          {statusConfig[selectedDocument.status]?.label}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Document Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline">
                          {documentTypeConfig[selectedDocument.documentType || 'OTHER']?.label}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">AI Confidence</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedDocument.aiConfidence || 0} className="flex-1" />
                          <span className="font-medium">{selectedDocument.aiConfidence || 0}%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Processing Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <span className="font-medium">
                          {selectedDocument.processingTime
                            ? `${selectedDocument.processingTime}ms`
                            : '-'}
                        </span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Key Fields */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Key Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{formatCurrency(selectedDocument.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">
                          {selectedDocument.documentDate
                            ? new Date(selectedDocument.documentDate).toLocaleDateString()
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Vendor:</span>
                        <span className="font-medium">
                          {selectedDocument.vendor?.name ||
                           selectedDocument.extractedData?.vendor ||
                           '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">{selectedDocument.suggestedCategory || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Suggested Account */}
                  {selectedDocument.suggestedAccount && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Suggested Account
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {selectedDocument.suggestedAccount.code}
                          </Badge>
                          <span>{selectedDocument.suggestedAccount.name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Error Message */}
                  {selectedDocument.errorMessage && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Error
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-red-600">{selectedDocument.errorMessage}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="extracted" className="space-y-4">
                  {selectedDocument.extractedData ? (
                    <>
                      {/* Main Data */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Extracted Fields</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(selectedDocument.extractedData as Record<string, unknown>)
                              .filter(([key, value]) => value !== null && key !== 'lineItems')
                              .map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-0.5 py-2 border-b last:border-0">
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {key.replaceAll(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <span className="font-medium text-sm break-words">
                                    {formatValue(value, key)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Line Items */}
                      {selectedDocument.extractedData?.lineItems?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Line Items</CardTitle>
                          </CardHeader>
                          <CardContent className="px-2 sm:px-6">
                            <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Unit Price</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedDocument.extractedData.lineItems.map((item, i) => (
                                  <TableRow key={`${item.description}-${i}`}>
                                    <TableCell className="text-xs sm:text-sm">{item.description}</TableCell>
                                    <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                                    <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(item.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* OCR Text */}
                      {selectedDocument.ocrText && (
                        <Collapsible>
                          <Card>
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50">
                                <CardTitle className="text-sm flex items-center justify-between">
                                  Raw OCR Text
                                  <ChevronDown className="h-4 w-4" />
                                </CardTitle>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent>
                                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap">
                                  {selectedDocument.ocrText}
                                </pre>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No extracted data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="journal" className="space-y-4">
                  {selectedDocument.aiAnalysis?.journalEntry && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Suggested Journal Entry</CardTitle>
                        <CardDescription>
                          {selectedDocument.aiAnalysis.journalEntry.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDocument.aiAnalysis.journalEntry.lines.map((line) => (
                              <TableRow key={`${line.accountCode}-${line.accountName}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{line.accountCode}</Badge>
                                    {line.accountName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  selectedDocument.aiAnalysis.journalEntry.lines.reduce((sum, l) => sum + l.debit, 0)
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  selectedDocument.aiAnalysis.journalEntry.lines.reduce((sum, l) => sum + l.credit, 0)
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                  {!selectedDocument.aiAnalysis?.journalEntry && selectedDocument.journalEntry && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Journal Entry Created
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <Badge>{selectedDocument.journalEntry.entryNumber}</Badge>
                          <span>{selectedDocument.journalEntry.description}</span>
                          <Button variant="link" size="sm">
                            View Entry <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!selectedDocument.aiAnalysis?.journalEntry && !selectedDocument.journalEntry && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No journal entry suggestion available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                  {selectedDocument.processingLogs?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDocument.processingLogs.map((log) => (
                        <Card key={log.id} className={cn(
                          log.status === 'ERROR' && 'border-red-200',
                          log.status === 'WARNING' && 'border-yellow-200'
                        )}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {log.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {log.status === 'ERROR' && <XCircle className="h-4 w-4 text-red-500" />}
                                {log.status === 'WARNING' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                                <Badge variant="outline">{log.stage}</Badge>
                                <span>{log.message}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{log.duration}ms</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No processing logs available</p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}

          <DialogFooter className="flex-shrink-0">
            {selectedDocument?.status === 'ANALYZED' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleReject(selectedDocument)}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedAccount(selectedDocument.suggestedAccount?.id || '')
                    initEditableValues(selectedDocument)
                    setIsApproveDialogOpen(true)
                    setIsDetailOpen(false)
                  }}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Aprobar Documento y Crear Gasto
            </DialogTitle>
            <DialogDescription>
              Verifica y corrige los datos antes de crear el gasto.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              {/* Archivo */}
              <div className="bg-gray-50 p-2 rounded text-sm">
                <span className="text-gray-500">Archivo:</span>{' '}
                <span className="font-medium truncate">{selectedDocument.originalFilename}</span>
              </div>

              {/* Monto - EDITABLE */}
              <div>
                <Label htmlFor="edit-amount" className="text-sm font-medium">
                  Monto Real <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="edit-amount"
                    type="text"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="pl-7 text-lg font-bold border-2 border-blue-400 focus:border-blue-600"
                    placeholder="Ingresa el monto real (ej: 29.13)"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  ⚠️ La IA no puede leer el monto real. Ingresa el monto correcto del documento.
                </p>
              </div>

              {/* Proveedor - EDITABLE */}
              <div>
                <Label htmlFor="edit-vendor" className="text-sm font-medium">Proveedor</Label>
                <Input
                  id="edit-vendor"
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="mt-1"
                  placeholder="Nombre del proveedor"
                />
              </div>

              {/* Fecha - EDITABLE */}
              <div>
                <Label htmlFor="edit-date" className="text-sm font-medium">Fecha</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Referencia - EDITABLE */}
              <div>
                <Label htmlFor="edit-reference" className="text-sm font-medium">Referencia / Nº Factura</Label>
                <Input
                  id="edit-reference"
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="mt-1"
                  placeholder="INV-001"
                />
              </div>

              {/* Descripción - EDITABLE */}
              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium">Descripción</Label>
                <Input
                  id="edit-description"
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Descripción del gasto"
                />
              </div>

              {/* Cuenta contable */}
              <div>
                <Label>Cuenta contable</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDocument.suggestedAccount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    IA sugiere: {selectedDocument.suggestedAccount.code} - {selectedDocument.suggestedAccount.name}
                  </p>
                )}
              </div>

              {activeCompany && (
                <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs text-blue-700">
                  <strong>Empresa:</strong> {activeCompany.name}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedDocument && handleApprove(selectedDocument, selectedAccount)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprobar y Crear Gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

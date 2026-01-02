'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Eye,
  Trash2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  AlertCircle,
  ChevronDown,
  Brain,
  Sparkles,
  DollarSign,
  Calendar,
  Building2,
  Tag,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

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

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('image')) return ImageIcon
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
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
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
    return formatCurrency(value)
  }
  return String(value)
}

export default function DocumentAIProcessor() {
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

  // Cargar documentos
  useEffect(() => {
    loadDocuments()
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const loadDocuments = async () => {
    try {
      setIsLoading(true)
      const url = filter === 'all' 
        ? '/api/documents/process-ai'
        : `/api/documents/process-ai?status=${filter}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.documents) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (data.accounts) {
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  // Upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('autoProcess', String(autoProcess))
      formData.append('autoCreateJournalEntry', String(autoCreateJournalEntry))

      try {
        setUploadProgress(((i + 0.5) / acceptedFiles.length) * 100)
        
        const response = await fetch('/api/documents/process-ai', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (data.success && data.document) {
          setDocuments(prev => [data.document, ...prev])
        }

        setUploadProgress(((i + 1) / acceptedFiles.length) * 100)
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setIsUploading(false)
    setUploadProgress(0)
  }, [autoProcess, autoCreateJournalEntry])

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

  // Document actions
  const handleApprove = async (doc: UploadedDocument, accountId?: string) => {
    try {
      const response = await fetch('/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'approve',
          accountId: accountId || doc.suggestedAccount?.id,
          journalEntryData: doc.aiAnalysis?.journalEntry
        })
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(prev => 
          prev.map(d => d.id === doc.id ? data.document : d)
        )
        setIsApproveDialogOpen(false)
      }
    } catch (error) {
      console.error('Error approving document:', error)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-500" />
            AI Document Processor
          </h1>
          <p className="text-muted-foreground">
            Upload documents for automatic OCR analysis and accounting categorization
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

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
            <div className="flex items-center gap-6">
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
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {doc.originalFilename}
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
                        {formatCurrency(doc.amount)}
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
          )}
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.originalFilename}
            </DialogTitle>
            <DialogDescription>
              Document details and AI analysis results
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
                <TabsTrigger value="journal">Journal Entry</TabsTrigger>
                <TabsTrigger value="logs">Processing Logs</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[500px] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  {/* Status & Info */}
                  <div className="grid grid-cols-2 gap-4">
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
                    <CardContent className="grid grid-cols-2 gap-4">
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
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(selectedDocument.extractedData as Record<string, unknown>)
                              .filter(([key, value]) => value !== null && key !== 'lineItems')
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replaceAll(/([A-Z])/g, ' $1').trim()}:
                                  </span>
                                  <span className="font-medium">
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
                          <CardContent>
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
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
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
                  {selectedDocument.aiAnalysis?.journalEntry ? (
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
          
          <DialogFooter>
            {selectedDocument?.status === 'ANALYZED' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleReject(selectedDocument)}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedAccount(selectedDocument.suggestedAccount?.id || '')
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Confirm the account categorization and create the journal entry.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <Label>Document</Label>
                <p className="text-sm font-medium">{selectedDocument.originalFilename}</p>
              </div>
              
              <div>
                <Label>Amount</Label>
                <p className="text-lg font-bold">{formatCurrency(selectedDocument.amount)}</p>
              </div>
              
              <div>
                <Label>Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
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
                    AI suggested: {selectedDocument.suggestedAccount.code} - {selectedDocument.suggestedAccount.name}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedDocument && handleApprove(selectedDocument, selectedAccount)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Paperclip,
  Upload,
  Download,
  X,
  Image as ImageIcon,
  File
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  createdAt: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  category: string
  description: string | null
  amount: number
  date: string
  status: string
  notes: string | null
  reference?: string | null
  createdAt: string
  updatedAt: string
}

export default function TransactionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const transactionId = params.id as string

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && transactionId) {
      loadTransaction()
      loadAttachments()
    }
  }, [status, transactionId])

  const loadAttachments = useCallback(async () => {
    if (!activeCompany?.id || !transactionId) return
    try {
      const res = await fetch(`/api/attachments?companyId=${activeCompany.id}&transactionId=${transactionId}`)
      if (res.ok) {
        const data = await res.json()
        setAttachments(data)
      }
    } catch (err) {
      console.error('Error loading attachments:', err)
    }
  }, [activeCompany?.id, transactionId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !activeCompany?.id) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })

        const res = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: activeCompany.id,
            transactionId: transactionId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            url: base64 // In production, this would be uploaded to cloud storage
          })
        })

        if (res.ok) {
          toast.success(`${file.name} uploaded`)
        }
      }
      loadAttachments()
    } catch (err) {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const res = await fetch(`/api/attachments?id=${attachmentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Attachment deleted')
        loadAttachments()
      }
    } catch (err) {
      toast.error('Failed to delete attachment')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon
    return File
  }

  const loadTransaction = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}`)
      
      if (response.ok) {
        const data = await response.json()
        setTransaction(data)
      } else if (response.status === 404) {
        setError('Transacción no encontrada')
      } else {
        setError('Error al cargar la transacción')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/company/transactions')
      } else {
        setError('Error al eliminar la transacción')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al eliminar la transacción')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      COMPLETED: { label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      RECONCILED: { label: 'Conciliada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    }
    return configs[status] || configs.PENDING
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  if (error) {
    return (
      <CompanyTabsLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
            <Button onClick={() => router.push('/company/transactions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a transacciones
            </Button>
          </Card>
        </div>
      </CompanyTabsLayout>
    )
  }

  if (!transaction) {
    return null
  }

  const statusConfig = getStatusConfig(transaction.status)
  const StatusIcon = statusConfig.icon
  const isIncome = transaction.type === 'INCOME'

  return (
    <CompanyTabsLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/company/transactions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalle de Transacción
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                ID: {transaction.id.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/company/transactions/${transaction.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className={isIncome ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className={isIncome ? 'bg-green-50' : 'bg-red-50'}>
                <CardTitle className="flex items-center gap-2">
                  {isIncome ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {isIncome ? 'Ingreso' : 'Gasto'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Descripción</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {transaction.description || transaction.category}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Monto
                    </label>
                    <p className={`text-3xl font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncome ? '+' : '-'}${transaction.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha
                    </label>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Categoría
                  </label>
                  <Badge variant="secondary" className="mt-1 text-sm">
                    {transaction.category}
                  </Badge>
                </div>

                {transaction.reference && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referencia</label>
                    <p className="text-gray-900">{transaction.reference}</p>
                  </div>
                )}

                {transaction.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Notas
                    </label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">
                      {transaction.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Adjuntos ({attachments.length})
                </CardTitle>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Subiendo...' : 'Subir'}
                    </span>
                  </Button>
                </label>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay adjuntos</p>
                    <p className="text-xs mt-1">Sube recibos, facturas u otros documentos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(att => {
                      const FileIcon = getFileIcon(att.fileType)
                      return (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium truncate max-w-[150px]">{att.fileName}</p>
                              <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={att.url} download={att.fileName} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteAttachment(att.id)}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Status & Meta */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color}`}>
                  <StatusIcon className="h-5 w-5" />
                  <span className="font-semibold">{statusConfig.label}</span>
                </div>
              </CardContent>
            </Card>

            {/* Type Card */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Transacción</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isIncome ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span className="font-semibold">{isIncome ? 'Ingreso' : 'Gasto'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Meta Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Registro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado</span>
                  <span>{new Date(transaction.createdAt).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actualizado</span>
                  <span>{new Date(transaction.updatedAt).toLocaleDateString('es-MX')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

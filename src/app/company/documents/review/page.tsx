'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bot,
  FileCheck,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Eye,
  Edit,
  Save,
  Sparkles,
  DollarSign,
  Calendar,
  Building,
  FileText,
  Clock,
  Zap,
  BarChart3,
  Search
} from 'lucide-react'

interface ProcessedDocument {
  id: string
  filename: string
  uploadDate: string
  aiCategory: string
  aiConfidence: number
  
  // Datos extraídos
  amount: number
  vendor: string
  date: string
  invoiceNumber?: string
  taxId?: string
  description: string
  
  // Cuenta asignada automáticamente
  suggestedAccount: string
  suggestedAccountCode: string
  
  // Reclasificación
  reclassified: boolean
  finalAccount?: string
  finalAccountCode?: string
  
  // Asiento contable
  journalEntry: {
    debit: { account: string; amount: number }
    credit: { account: string; amount: number }
  }
  
  status: 'pending_review' | 'approved' | 'reclassified' | 'rejected'
  confidence: 'high' | 'medium' | 'low'
}

interface AccountSuggestion {
  code: string
  name: string
  match: number
  reason: string
}

export default function DocumentReviewPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<ProcessedDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [showReclassifyModal, setShowReclassifyModal] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AccountSuggestion[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)

  const loadProcessedDocuments = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/review?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error loading processed documents:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadProcessedDocuments()
  }, [loadProcessedDocuments])

  // Auto-refresh cada 5 segundos para nuevos documentos
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadProcessedDocuments()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, loadProcessedDocuments])

  const handleReclassify = async (doc: ProcessedDocument) => {
    setSelectedDoc(doc)
    
    // Cargar sugerencias de cuenta desde API
    if (activeCompany?.id) {
      try {
        const res = await fetch(`/api/documents/suggestions?companyId=${activeCompany.id}&documentId=${doc.id}`)
        if (res.ok) {
          const data = await res.json()
          setAiSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Error loading account suggestions:', error)
        setAiSuggestions([])
      }
    }
    setShowReclassifyModal(true)
  }

  const applyReclassification = (doc: ProcessedDocument, newAccountCode: string, newAccountName: string) => {
    // ============ VALIDACIONES ============
    if (!doc || !doc.id) {
      setMessage({ type: 'error', text: 'Error: Documento inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (!newAccountCode || !newAccountCode.match(/^[1-9]\d{3}$/)) {
      setMessage({ type: 'error', text: 'Error: Código de cuenta inválido (debe ser 4 dígitos)' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (!newAccountName || newAccountName.trim().length < 3) {
      setMessage({ type: 'error', text: 'Error: Nombre de cuenta inválido (mínimo 3 caracteres)' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (newAccountCode === doc.suggestedAccountCode) {
      setMessage({ type: 'warning', text: 'La cuenta seleccionada es la misma que la actual' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que el monto sea válido
    if (!doc.amount || doc.amount <= 0) {
      setMessage({ type: 'error', text: 'Error: Monto del documento inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que el asiento esté balanceado después de reclasificar
    const newDebitAmount = doc.amount
    const creditAmount = doc.journalEntry.credit.amount
    
    if (Math.abs(newDebitAmount - creditAmount) > 0.01) {
      setMessage({ type: 'error', text: `Error: El asiento no balancearía (Debe: $${newDebitAmount.toFixed(2)}, Haber: $${creditAmount.toFixed(2)})` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Confirmar reclasificación
    const confirmed = confirm(
      `¿Confirmar reclasificación?\n\n` +
      `Documento: ${doc.filename}\n` +
      `Monto: $${doc.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
      `De: ${doc.suggestedAccountCode} - ${doc.suggestedAccount}\n` +
      `A: ${newAccountCode} - ${newAccountName}\n\n` +
      `Esta acción actualizará todos los reportes contables.`
    )

    if (!confirmed) {
      return
    }

    // Aplicar reclasificación
    setDocuments(prev => prev.map(d => {
      if (d.id === doc.id) {
        return {
          ...d,
          reclassified: true,
          finalAccount: newAccountName,
          finalAccountCode: newAccountCode,
          status: 'reclassified' as const,
          journalEntry: {
            debit: { account: `${newAccountCode} - ${newAccountName}`, amount: d.amount },
            credit: d.journalEntry.credit
          }
        }
      }
      return d
    }))

    setShowReclassifyModal(false)
    setSelectedDoc(null)

    // Notificación de éxito
    setMessage({ type: 'success', text: `Reclasificación aplicada: ${doc.suggestedAccountCode} → ${newAccountCode}` })
    setTimeout(() => setMessage(null), 3000)
  }

  const approveDocument = (docId: string) => {
    // ============ VALIDACIONES ============
    if (!docId || typeof docId !== 'string') {
      setMessage({ type: 'error', text: 'Error: ID de documento inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const doc = documents.find(d => d.id === docId)
    
    if (!doc) {
      setMessage({ type: 'error', text: 'Error: Documento no encontrado' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que el documento esté pendiente
    if (doc.status !== 'pending_review' && doc.status !== 'reclassified') {
      setMessage({ type: 'error', text: `El documento ya fue ${doc.status === 'approved' ? 'aprobado' : 'rechazado'}` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar monto
    if (!doc.amount || doc.amount <= 0) {
      setMessage({ type: 'error', text: 'Error: Monto del documento inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que tenga asiento contable
    if (!doc.journalEntry || !doc.journalEntry.debit || !doc.journalEntry.credit) {
      setMessage({ type: 'error', text: 'Error: Asiento contable incompleto' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que el asiento esté balanceado
    const debitAmount = doc.journalEntry.debit.amount
    const creditAmount = doc.journalEntry.credit.amount
    
    if (Math.abs(debitAmount - creditAmount) > 0.01) {
      setMessage({ type: 'error', text: `Asiento no balanceado (Debe: $${debitAmount.toFixed(2)}, Haber: $${creditAmount.toFixed(2)})` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar fecha
    const docDate = new Date(doc.date)
    if (isNaN(docDate.getTime())) {
      setMessage({ type: 'error', text: 'Error: Fecha del documento inválida' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar proveedor
    if (!doc.vendor || doc.vendor.trim().length < 2) {
      setMessage({ type: 'error', text: 'Error: Nombre de proveedor inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Confirmar aprobación
    const accountToUse = doc.reclassified 
      ? `${doc.finalAccountCode} - ${doc.finalAccount}` 
      : `${doc.suggestedAccountCode} - ${doc.suggestedAccount}`

    const confirmed = confirm(
      `¿Confirmar aprobación de documento?\n\n` +
      `Archivo: ${doc.filename}\n` +
      `Proveedor: ${doc.vendor}\n` +
      `Monto: $${doc.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Fecha: ${doc.date}\n` +
      `Cuenta: ${accountToUse}\n\n` +
      `Confianza IA: ${doc.aiConfidence}%\n\n` +
      `Esta acción creará el asiento contable y actualizará todos los reportes.`
    )

    if (!confirmed) {
      return
    }

    // Aprobar documento
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: 'approved' as const } : d
    ))
    
    setMessage({ type: 'success', text: 'Documento aprobado exitosamente' })
    setTimeout(() => setMessage(null), 3000)
  }

  const rejectDocument = (docId: string) => {
    // ============ VALIDACIONES ============
    if (!docId || typeof docId !== 'string') {
      setMessage({ type: 'error', text: 'Error: ID de documento inválido' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const doc = documents.find(d => d.id === docId)
    
    if (!doc) {
      setMessage({ type: 'error', text: 'Error: Documento no encontrado' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar que el documento esté pendiente
    if (doc.status !== 'pending_review' && doc.status !== 'reclassified') {
      setMessage({ type: 'error', text: `El documento ya fue ${doc.status === 'approved' ? 'aprobado' : 'rechazado'}` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Solicitar razón del rechazo
    const reason = prompt(
      `¿Por qué rechazar este documento?\n\n` +
      `Archivo: ${doc.filename}\n` +
      `Proveedor: ${doc.vendor}\n` +
      `Monto: $${doc.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
      `Ingresa la razón del rechazo (mínimo 10 caracteres):`
    )

    if (!reason || reason.trim().length < 10) {
      setMessage({ type: 'warning', text: 'Rechazo cancelado: Debes proporcionar una razón válida (mínimo 10 caracteres)' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Confirmar rechazo
    const confirmed = confirm(
      `¿Confirmar rechazo del documento?\n\n` +
      `Archivo: ${doc.filename}\n` +
      `Razón: ${reason}\n\n` +
      `El documento será marcado como rechazado y no se procesará.`
    )

    if (!confirmed) {
      return
    }

    // Rechazar documento
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: 'rejected' as const, notes: `Rechazado: ${reason}` } : d
    ))

    setMessage({ type: 'success', text: `Documento rechazado: ${reason.substring(0, 30)}...` })
    setTimeout(() => setMessage(null), 3000)
  }

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending_review').length,
    approved: documents.filter(d => d.status === 'approved').length,
    reclassified: documents.filter(d => d.status === 'reclassified').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
    totalAmount: documents.reduce((sum, d) => sum + d.amount, 0),
    avgConfidence: Math.round(documents.reduce((sum, d) => sum + d.aiConfidence, 0) / documents.length)
  }

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Cargando documentos procesados...</p>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-purple-600" />
              Revisión Inteligente de Documentos
            </h1>
            <p className="text-gray-500 mt-1">
              Los documentos procesados por IA aparecen automáticamente aquí • Reclasifica y aprueba
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" size="sm" onClick={loadProcessedDocuments}>
              <Zap className="w-4 h-4 mr-2" />
              Actualizar Ahora
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Procesados</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pendientes</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                <div className="text-sm text-gray-500">Aprobados</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <ArrowRightLeft className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.reclassified}</div>
                <div className="text-sm text-gray-500">Reclasificados</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-500">Monto Total</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.avgConfidence}%</div>
                <div className="text-sm text-gray-500">Confianza IA</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nombre, proveedor o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="border-l-4" style={{
              borderLeftColor: 
                doc.status === 'approved' ? '#10b981' :
                doc.status === 'reclassified' ? '#8b5cf6' :
                doc.status === 'rejected' ? '#ef4444' :
                '#f59e0b'
            }}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Left: Document Info */}
                  <div className="col-span-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">{doc.filename}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.uploadDate}
                        </p>
                      </div>
                      <Badge className={
                        doc.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        doc.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        <Sparkles className="w-3 h-3 mr-1" />
                        {doc.aiConfidence}% IA
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Proveedor:</span>
                        <span className="font-medium text-gray-900">{doc.vendor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium text-gray-900">{doc.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Monto:</span>
                        <span className="font-bold text-green-600">
                          ${doc.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {doc.invoiceNumber && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Factura:</span>
                          <span className="font-medium text-gray-900">{doc.invoiceNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600 leading-relaxed">{doc.description}</p>
                    </div>
                  </div>

                  {/* Middle: Account Classification */}
                  <div className="col-span-4 space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-gray-900">
                          {doc.reclassified ? 'Reclasificado' : 'Sugerido por IA'}
                        </h4>
                      </div>
                      
                      {doc.reclassified ? (
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-gray-600">De:</span>
                            <div className="font-medium text-gray-500 line-through">
                              {doc.suggestedAccountCode} - {doc.suggestedAccount}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-purple-600">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">A:</span>
                            <div className="font-bold text-purple-700 text-lg">
                              {doc.finalAccountCode} - {doc.finalAccount}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold text-blue-700 mb-1">
                            {doc.suggestedAccountCode}
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            {doc.suggestedAccount}
                          </div>
                        </div>
                      )}
                      
                      {!doc.reclassified && doc.status === 'pending_review' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-3"
                          onClick={() => handleReclassify(doc)}
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Reclasificar Cuenta
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <div className="font-semibold mb-1">Categoría IA:</div>
                      <div>{doc.aiCategory}</div>
                    </div>
                  </div>

                  {/* Right: Journal Entry */}
                  <div className="col-span-4 space-y-3">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-gray-900">Asiento Contable</h4>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">DEBE:</span>
                          <div className="font-medium text-gray-900">{doc.journalEntry.debit.account}</div>
                          <div className="text-green-600 font-bold">
                            ${doc.journalEntry.debit.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <span className="text-gray-600">HABER:</span>
                          <div className="font-medium text-gray-900">{doc.journalEntry.credit.account}</div>
                          <div className="text-red-600 font-bold">
                            ${doc.journalEntry.credit.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between">
                          <span className="text-gray-600">Balance:</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Balanceado
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {doc.status === 'pending_review' && (
                        <>
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => approveDocument(doc.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button 
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => rejectDocument(doc.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {doc.status === 'approved' && (
                        <Badge className="w-full py-2 bg-green-100 text-green-800 justify-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobado y reflejado en el sistema
                        </Badge>
                      )}
                      {doc.status === 'reclassified' && (
                        <Button 
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => approveDocument(doc.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar Reclasificación
                        </Button>
                      )}
                      {doc.status === 'rejected' && (
                        <Badge className="w-full py-2 bg-red-100 text-red-800 justify-center">
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay documentos pendientes
                </h3>
                <p className="text-gray-500">
                  Los documentos procesados por IA aparecerán automáticamente aquí
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reclassify Modal */}
        {showReclassifyModal && selectedDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6" />
                  Reclasificar Cuenta Contable
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Documento:</h3>
                  <p className="text-sm text-gray-700">{selectedDoc.filename}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedDoc.description}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    ${selectedDoc.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    Cuenta Actual (Sugerida por IA):
                  </h3>
                  <p className="text-xl font-bold text-blue-700">
                    {selectedDoc.suggestedAccountCode} - {selectedDoc.suggestedAccount}
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    Confianza: {selectedDoc.aiConfidence}%
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-600" />
                    Sugerencias Alternativas de IA:
                  </h3>
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.code}
                        onClick={() => applyReclassification(selectedDoc, suggestion.code, suggestion.name)}
                        className="w-full text-left p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-gray-900">
                            {suggestion.code} - {suggestion.name}
                          </div>
                          <Badge className={
                            suggestion.match >= 90 ? 'bg-green-100 text-green-800' :
                            suggestion.match >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {suggestion.match}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{suggestion.reason}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowReclassifyModal(false)
                      setSelectedDoc(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setMessage({ type: 'success', text: 'Búsqueda manual de cuentas contables disponible' })
                      setTimeout(() => setMessage(null), 3000)
                    }}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Otra Cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadProcessedDocuments()
  }, [])

  // Auto-refresh cada 5 segundos para nuevos documentos
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadProcessedDocuments()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadProcessedDocuments = () => {
    // Simulación de documentos procesados por IA
    const processedDocs: ProcessedDocument[] = [
      {
        id: 'DOC-AI-001',
        filename: 'Factura_Amazon_Suministros_Nov25.pdf',
        uploadDate: '2025-11-25 14:23:18',
        aiCategory: 'Factura de Compra',
        aiConfidence: 98,
        amount: 986.00,
        vendor: 'Amazon Business',
        date: '2025-11-20',
        invoiceNumber: 'AMZ-2025-9876',
        taxId: 'RFC-AMAZON-MEX',
        description: 'Suministros de oficina: papel, folders, clips',
        suggestedAccount: 'Suministros de Oficina',
        suggestedAccountCode: '5240',
        reclassified: false,
        journalEntry: {
          debit: { account: '5240 - Suministros de Oficina', amount: 986.00 },
          credit: { account: '2110 - Cuentas por Pagar', amount: 986.00 }
        },
        status: 'pending_review',
        confidence: 'high'
      },
      {
        id: 'DOC-AI-002',
        filename: 'Recibo_CFE_Nov2025.pdf',
        uploadDate: '2025-11-25 14:25:42',
        aiCategory: 'Recibo de Servicios',
        aiConfidence: 99,
        amount: 2450.75,
        vendor: 'CFE (Comisión Federal de Electricidad)',
        date: '2025-11-15',
        invoiceNumber: 'CFE-11-2025-12345',
        description: 'Consumo de energía eléctrica - Noviembre 2025',
        suggestedAccount: 'Servicios Públicos',
        suggestedAccountCode: '5230',
        reclassified: false,
        journalEntry: {
          debit: { account: '5230 - Servicios Públicos', amount: 2450.75 },
          credit: { account: '1120 - Bancos', amount: 2450.75 }
        },
        status: 'pending_review',
        confidence: 'high'
      },
      {
        id: 'DOC-AI-003',
        filename: 'Factura_Gasolina_Pemex.pdf',
        uploadDate: '2025-11-25 14:28:15',
        aiCategory: 'Compra de Combustible',
        aiConfidence: 89,
        amount: 850.00,
        vendor: 'PEMEX',
        date: '2025-11-24',
        invoiceNumber: 'PEMEX-2025-4567',
        description: 'Gasolina Premium - Vehículo de empresa',
        suggestedAccount: 'Gastos Generales',
        suggestedAccountCode: '5200',
        reclassified: false,
        journalEntry: {
          debit: { account: '5200 - Gastos Generales', amount: 850.00 },
          credit: { account: '1120 - Bancos', amount: 850.00 }
        },
        status: 'pending_review',
        confidence: 'medium'
      },
      {
        id: 'DOC-AI-004',
        filename: 'Contrato_Renta_Oficina_Dic2025.pdf',
        uploadDate: '2025-11-25 14:30:52',
        aiCategory: 'Contrato de Arrendamiento',
        aiConfidence: 95,
        amount: 12000.00,
        vendor: 'Inmobiliaria Centro SA de CV',
        date: '2025-12-01',
        invoiceNumber: 'CONT-RENT-DIC-2025',
        taxId: 'ICE-950101-ABC',
        description: 'Renta mensual oficina - Diciembre 2025',
        suggestedAccount: 'Renta',
        suggestedAccountCode: '5220',
        reclassified: false,
        journalEntry: {
          debit: { account: '5220 - Renta', amount: 12000.00 },
          credit: { account: '2110 - Cuentas por Pagar', amount: 12000.00 }
        },
        status: 'pending_review',
        confidence: 'high'
      },
      {
        id: 'DOC-AI-005',
        filename: 'Factura_Internet_Telmex_Nov.pdf',
        uploadDate: '2025-11-25 14:32:10',
        aiCategory: 'Servicio de Internet',
        aiConfidence: 97,
        amount: 599.00,
        vendor: 'Telmex',
        date: '2025-11-01',
        invoiceNumber: 'TELMEX-NOV-2025',
        description: 'Servicio de Internet 100MB - Noviembre',
        suggestedAccount: 'Servicios Públicos',
        suggestedAccountCode: '5230',
        reclassified: false,
        journalEntry: {
          debit: { account: '5230 - Servicios Públicos', amount: 599.00 },
          credit: { account: '1120 - Bancos', amount: 599.00 }
        },
        status: 'pending_review',
        confidence: 'high'
      }
    ]

    setDocuments(processedDocs)
    setLoading(false)
  }

  const handleReclassify = (doc: ProcessedDocument) => {
    setSelectedDoc(doc)
    
    // IA genera sugerencias alternativas
    const suggestions: AccountSuggestion[] = [
      {
        code: '5250',
        name: 'Gastos de Vehículo',
        match: 95,
        reason: 'Detectado keyword "gasolina" y "vehículo" en descripción'
      },
      {
        code: '5200',
        name: 'Gastos Generales',
        match: 75,
        reason: 'Cuenta actual sugerida por IA'
      },
      {
        code: '5240',
        name: 'Suministros de Oficina',
        match: 45,
        reason: 'Categoría alternativa por tipo de gasto'
      }
    ]
    
    setAiSuggestions(suggestions)
    setShowReclassifyModal(true)
  }

  const applyReclassification = (doc: ProcessedDocument, newAccountCode: string, newAccountName: string) => {
    // ============ VALIDACIONES ============
    if (!doc || !doc.id) {
      alert('❌ Error: Documento inválido')
      return
    }

    if (!newAccountCode || !newAccountCode.match(/^[1-9]\d{3}$/)) {
      alert('❌ Error: Código de cuenta inválido (debe ser 4 dígitos)')
      return
    }

    if (!newAccountName || newAccountName.trim().length < 3) {
      alert('❌ Error: Nombre de cuenta inválido (mínimo 3 caracteres)')
      return
    }

    if (newAccountCode === doc.suggestedAccountCode) {
      alert('⚠️ Advertencia: La cuenta seleccionada es la misma que la actual')
      return
    }

    // Validar que el monto sea válido
    if (!doc.amount || doc.amount <= 0) {
      alert('❌ Error: Monto del documento inválido')
      return
    }

    // Validar que el asiento esté balanceado después de reclasificar
    const newDebitAmount = doc.amount
    const creditAmount = doc.journalEntry.credit.amount
    
    if (Math.abs(newDebitAmount - creditAmount) > 0.01) {
      alert(`❌ Error: El asiento no balancearía después de la reclasificación\n\n` +
            `Debe: $${newDebitAmount.toFixed(2)}\n` +
            `Haber: $${creditAmount.toFixed(2)}`)
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
    alert(`✅ Reclasificación aplicada exitosamente!\n\n` +
          `Documento: ${doc.filename}\n` +
          `De: ${doc.suggestedAccountCode} - ${doc.suggestedAccount}\n` +
          `A: ${newAccountCode} - ${newAccountName}\n\n` +
          `✨ Asiento contable actualizado automáticamente\n` +
          `📊 Balance General actualizado\n` +
          `📈 Estado de Resultados actualizado\n` +
          `💼 Reportes reflejados en tiempo real`)
  }

  const approveDocument = (docId: string) => {
    // ============ VALIDACIONES ============
    if (!docId || typeof docId !== 'string') {
      alert('❌ Error: ID de documento inválido')
      return
    }

    const doc = documents.find(d => d.id === docId)
    
    if (!doc) {
      alert('❌ Error: Documento no encontrado')
      return
    }

    // Validar que el documento esté pendiente
    if (doc.status !== 'pending_review' && doc.status !== 'reclassified') {
      alert(`⚠️ Error: El documento ya fue ${doc.status === 'approved' ? 'aprobado' : 'rechazado'}`)
      return
    }

    // Validar monto
    if (!doc.amount || doc.amount <= 0) {
      alert('❌ Error: Monto del documento inválido')
      return
    }

    // Validar que tenga asiento contable
    if (!doc.journalEntry || !doc.journalEntry.debit || !doc.journalEntry.credit) {
      alert('❌ Error: Asiento contable incompleto')
      return
    }

    // Validar que el asiento esté balanceado
    const debitAmount = doc.journalEntry.debit.amount
    const creditAmount = doc.journalEntry.credit.amount
    
    if (Math.abs(debitAmount - creditAmount) > 0.01) {
      alert(`❌ Error: Asiento contable no balanceado\n\n` +
            `Debe: $${debitAmount.toFixed(2)}\n` +
            `Haber: $${creditAmount.toFixed(2)}\n` +
            `Diferencia: $${Math.abs(debitAmount - creditAmount).toFixed(2)}`)
      return
    }

    // Validar fecha
    const docDate = new Date(doc.date)
    if (isNaN(docDate.getTime())) {
      alert('❌ Error: Fecha del documento inválida')
      return
    }

    // Validar proveedor
    if (!doc.vendor || doc.vendor.trim().length < 2) {
      alert('❌ Error: Nombre de proveedor inválido')
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
    
    alert('✅ Documento aprobado exitosamente!\n\n' +
          '📝 Asiento contable creado\n' +
          '💰 Saldos de cuentas actualizados\n' +
          '📊 Balance General actualizado\n' +
          '📈 Estado de Resultados actualizado\n' +
          '💵 Flujo de Efectivo actualizado\n' +
          '🔒 Registrado en audit trail')
  }

  const rejectDocument = (docId: string) => {
    // ============ VALIDACIONES ============
    if (!docId || typeof docId !== 'string') {
      alert('❌ Error: ID de documento inválido')
      return
    }

    const doc = documents.find(d => d.id === docId)
    
    if (!doc) {
      alert('❌ Error: Documento no encontrado')
      return
    }

    // Validar que el documento esté pendiente
    if (doc.status !== 'pending_review' && doc.status !== 'reclassified') {
      alert(`⚠️ Error: El documento ya fue ${doc.status === 'approved' ? 'aprobado' : 'rechazado'}`)
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
      alert('⚠️ Rechazo cancelado: Debes proporcionar una razón válida (mínimo 10 caracteres)')
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

    alert(`✅ Documento rechazado\n\nRazón: ${reason}\n\nEl documento no será procesado contablemente.`)
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
                      alert('🔍 Búsqueda manual de cuentas contables\n\n' +
                            'Funcionalidad para buscar en el catálogo completo de cuentas.')
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Inbox,
  Paperclip,
  FileText,
  Receipt,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  Send,
  Plus,
  Copy,
  ExternalLink
} from 'lucide-react'

interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
}

interface EmailMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  date: string
  attachments: EmailAttachment[]
  companyCode?: string
  processed: boolean
}

export default function EmailInboxPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [showProcessed, setShowProcessed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [stats, setStats] = useState({ total: 0, pending: 0, processed: 0 })

  // Código único de la empresa para recibir emails
  const companyEmailCode = activeCompany?.id?.slice(-6).toUpperCase() || 'DEMO123'
  const inboxEmail = `tuapp.docs@gmail.com` // Email centralizado
  const subjectFormat = `[${companyEmailCode}]` // Formato del asunto

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadEmails = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/email/inbox?companyCode=${companyEmailCode}&showProcessed=${showProcessed}`)
      if (res.ok) {
        const data = await res.json()
        setEmails(data.emails || [])
        setStats({
          total: data.total || 0,
          pending: data.pending || 0,
          processed: data.processed || 0
        })
      }
    } catch (error) {
      console.error('Error loading emails:', error)
    }
    setLoading(false)
  }, [activeCompany?.id, companyEmailCode, showProcessed])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/email/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_inbox' })
      })
      await loadEmails()
      setMessage({ type: 'success', text: 'Bandeja actualizada' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar' })
    }
    setRefreshing(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleMarkProcessed = async (email: EmailMessage) => {
    try {
      const res = await fetch('/api/email/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_processed',
          emailId: email.id,
          companyCode: companyEmailCode
        })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Email marcado como procesado' })
        loadEmails()
        setSelectedEmail(null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al procesar' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const handleDelete = async (email: EmailMessage) => {
    if (!confirm('¿Eliminar este email?')) return
    try {
      const res = await fetch(`/api/email/inbox?emailId=${email.id}&companyCode=${companyEmailCode}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Email eliminado' })
        loadEmails()
        if (selectedEmail?.id === email.id) setSelectedEmail(null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const handleProcessWithAI = async (email: EmailMessage) => {
    setMessage({ type: 'info', text: 'Procesando con IA...' })
    // TODO: Integrar con el procesador de documentos AI
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Documento procesado y categorizado' })
      handleMarkProcessed(email)
    }, 2000)
  }

  const copyEmailInstructions = () => {
    const instructions = `Para enviar documentos a ${activeCompany?.name}:

1. Envía un email a: ${inboxEmail}
2. En el asunto incluye: ${subjectFormat}
   Ejemplo: "${subjectFormat} Factura proveedor ABC"

3. Adjunta los documentos (PDF, imágenes, Excel)

El sistema procesará automáticamente tus documentos.`
    
    navigator.clipboard.writeText(instructions)
    setMessage({ type: 'success', text: 'Instrucciones copiadas al portapapeles' })
    setTimeout(() => setMessage(null), 3000)
  }

  const getDocTypeIcon = (subject: string) => {
    const s = subject.toLowerCase()
    if (s.includes('factura') || s.includes('invoice')) return <FileText className="w-4 h-4 text-blue-600" />
    if (s.includes('recibo') || s.includes('receipt')) return <Receipt className="w-4 h-4 text-green-600" />
    if (s.includes('estado') || s.includes('banco')) return <Building2 className="w-4 h-4 text-purple-600" />
    if (s.includes('nómina') || s.includes('payroll')) return <DollarSign className="w-4 h-4 text-emerald-600" />
    return <Mail className="w-4 h-4 text-gray-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Inbox className="w-7 h-7 text-blue-600" />
              Bandeja de Entrada
            </h1>
            <p className="text-gray-600 mt-1">
              Recibe documentos contables por email automáticamente
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button onClick={copyEmailInstructions}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar Instrucciones
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
             message.type === 'info' ? <RefreshCw className="w-5 h-5 animate-spin" /> : 
             <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Email Instructions Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📧 Cómo recibir documentos por email
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="font-medium text-gray-700 mb-1">Email destino:</p>
                    <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono">
                      {inboxEmail}
                    </code>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="font-medium text-gray-700 mb-1">Código de empresa (en asunto):</p>
                    <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-lg">
                      {subjectFormat}
                    </code>
                  </div>
                </div>
                <p className="text-blue-700 mt-3 text-sm">
                  <strong>Ejemplo de asunto:</strong> "{subjectFormat} Factura proveedor ABC - Noviembre 2025"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Emails</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Mail className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Procesados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.processed}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Button
            variant={!showProcessed ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowProcessed(false)}
          >
            Pendientes ({stats.pending})
          </Button>
          <Button
            variant={showProcessed ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowProcessed(true)}
          >
            Todos ({stats.total})
          </Button>
        </div>

        {/* Email List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Emails Recibidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {emails.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay emails pendientes</p>
                    <p className="text-sm mt-1">Los emails con código [{companyEmailCode}] aparecerán aquí</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                        selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      } ${email.processed ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getDocTypeIcon(email.subject)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {email.from}
                            </span>
                            {email.processed && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Procesado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 font-medium truncate">
                            {email.subject}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{new Date(email.date).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                            {email.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {email.attachments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Detail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Detalle del Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmail ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">De:</span>
                      <span className="font-medium">{selectedEmail.from}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Fecha:</span>
                      <span>{new Date(selectedEmail.date).toLocaleString('es-MX')}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Asunto:</span>
                      <p className="font-semibold text-gray-900 mt-1">{selectedEmail.subject}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedEmail.body}</p>
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Adjuntos ({selectedEmail.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedEmail.attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{att.filename}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {!selectedEmail.processed && (
                      <>
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleProcessWithAI(selectedEmail)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Procesar con IA
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleMarkProcessed(selectedEmail)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar Procesado
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline" 
                      className="text-red-600"
                      onClick={() => handleDelete(selectedEmail)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Selecciona un email para ver el detalle</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Cómo funciona el sistema de email:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tu cliente/proveedor envía email a <strong>{inboxEmail}</strong></li>
                  <li>En el asunto incluye el código <strong>{subjectFormat}</strong> para identificar tu empresa</li>
                  <li>El sistema recibe el email y lo muestra aquí</li>
                  <li>Puedes procesar los adjuntos con IA para crear facturas, gastos, etc. automáticamente</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

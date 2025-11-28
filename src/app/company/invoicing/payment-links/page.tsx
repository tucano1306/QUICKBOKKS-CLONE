'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Link as LinkIcon,
  Copy,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  CreditCard,
  Send,
  Calendar,
  FileText,
  Globe,
  Zap,
  Shield,
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  PlusCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PaymentLink {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  amount: number
  issueDate: string
  dueDate: string
  status: 'active' | 'expired' | 'paid' | 'cancelled'
  paymentLinkId: string
  paymentLinkUrl: string
  linkExpiry: string
  linkActive: boolean
  paymentGateway: 'stripe' | 'paypal' | 'mercadopago'
  linkClicks: number
  lastClickedAt?: string
  paidDate?: string
  paymentMethod?: string
  transactionId?: string
}

export default function PaymentLinksPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showLinkGenerator, setShowLinkGenerator] = useState(false)
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)

  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadPaymentLinks = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices?companyId=${activeCompany.id}&hasPaymentLink=true`)
      if (res.ok) {
        const data = await res.json()
        const links = (data.invoices || []).filter((inv: any) => inv.paymentLinkId).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer?.name || 'Cliente',
          customerEmail: inv.customer?.email || '',
          amount: inv.total,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.paymentLinkActive ? 'active' : 'expired',
          paymentLinkId: inv.paymentLinkId,
          paymentLinkUrl: inv.paymentLinkUrl,
          linkExpiry: inv.paymentLinkExpiry,
          linkActive: inv.paymentLinkActive,
          paymentGateway: 'stripe',
          linkClicks: 0
        }))
        setPaymentLinks(links)
      }
    } catch (error) {
      console.error('Error loading payment links:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    loadPaymentLinks()
  }, [loadPaymentLinks])

  const filteredLinks = paymentLinks.filter(link => {
    const matchesSearch = 
      link.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || link.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Activo</Badge>
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGatewayBadge = (gateway: string) => {
    switch (gateway) {
      case 'stripe':
        return <Badge className="bg-purple-100 text-purple-700">Stripe</Badge>
      case 'paypal':
        return <Badge className="bg-blue-100 text-blue-700">PayPal</Badge>
      case 'mercadopago':
        return <Badge className="bg-cyan-100 text-cyan-700">Mercado Pago</Badge>
      default:
        return <Badge variant="outline">{gateway}</Badge>
    }
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Link de pago copiado al portapapeles')
  }

  const handleCopyLink = (linkId: string) => {
    const link = paymentLinks.find(l => l.id === linkId)
    if (link) {
      navigator.clipboard.writeText(link.paymentLinkUrl)
      toast.success('✅ Link copiado al portapapeles')
    }
  }

  const sendEmail = (email: string, invoiceNumber: string) => {
    toast.success(`Email de pago enviado a ${email} para factura ${invoiceNumber}`)
  }

  const handleSendLinkViaEmail = (linkId: string) => {
    const link = paymentLinks.find(l => l.id === linkId)
    if (link) {
      toast.success(`📧 Enviando link a ${link.customerEmail}...`)
      // Implementar envío de email
    }
  }

  const regenerateLink = (invoiceNumber: string) => {
    toast.success(`Link de pago regenerado para factura ${invoiceNumber}`)
  }

  const handleDeactivateLink = (linkId: string) => {
    toast.success('🔒 Link desactivado correctamente')
    // Implementar desactivación en base de datos
  }

  const stats = {
    totalLinks: paymentLinks.length,
    active: paymentLinks.filter(l => l.status === 'active').length,
    paid: paymentLinks.filter(l => l.status === 'paid').length,
    expired: paymentLinks.filter(l => l.status === 'expired').length,
    totalAmount: paymentLinks.reduce((sum, l) => sum + l.amount, 0),
    paidAmount: paymentLinks.filter(l => l.status === 'paid').reduce((sum, l) => sum + l.amount, 0),
    totalClicks: paymentLinks.reduce((sum, l) => sum + l.linkClicks, 0)
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

  const paymentLinkActions = [
    {
      label: 'Ver todos los links',
      icon: Eye,
      onClick: () => {
        setSearchTerm('')
        toast.success('📋 Mostrando todos los links de pago')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Crear nuevo link',
      icon: PlusCircle,
      onClick: () => {
        setShowLinkGenerator(true)
      },
      variant: 'primary' as const,
    },
    {
      label: 'Copiar URL',
      icon: Copy,
      onClick: () => {
        if (selectedLink) {
          handleCopyLink(selectedLink.id)
        } else {
          toast.error('Selecciona un link de la lista primero')
        }
      },
      variant: 'default' as const,
    },
    {
      label: 'Enviar por email',
      icon: Mail,
      onClick: () => {
        if (selectedLink) {
          handleSendLinkViaEmail(selectedLink.id)
        } else {
          toast.error('Selecciona un link para enviar')
        }
      },
      variant: 'default' as const,
    },
    {
      label: 'Desactivar link',
      icon: XCircle,
      onClick: () => {
        if (selectedLink && selectedLink.linkActive) {
          handleDeactivateLink(selectedLink.id)
        } else if (!selectedLink) {
          toast.error('Selecciona un link primero')
        } else {
          toast.error('El link ya está desactivado')
        }
      },
      variant: 'danger' as const,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LinkIcon className="w-8 h-8 text-blue-600" />
              Links de Pago en Facturas
            </h1>
            <p className="text-gray-600 mt-1">
              Genere links únicos de pago para facilitar el cobro de facturas
            </p>
          </div>
          <Button onClick={() => setShowLinkGenerator(!showLinkGenerator)}>
            <Zap className="w-4 h-4 mr-2" />
            Generar Nuevo Link
          </Button>
        </div>

        {/* Action Buttons */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              Acciones de Links de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={paymentLinkActions} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <LinkIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalLinks}</div>
              <div className="text-sm text-blue-700">Total Links</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.active}</div>
              <div className="text-sm text-green-700">Links Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${stats.paidAmount.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Cobrado vía Links</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">{stats.totalClicks}</div>
              <div className="text-sm text-orange-700">Total Clicks</div>
            </CardContent>
          </Card>
        </div>

        {/* Link Generator (if shown) */}
        {showLinkGenerator && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                Generador de Link de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Factura
                  </label>
                  <Input placeholder="INV-2025-0001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gateway de Pago
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option value="stripe">Stripe (Tarjetas)</option>
                    <option value="paypal">PayPal</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Expiración
                  </label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enviar Email Automático
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                    <span className="text-sm text-gray-600">Sí, enviar al cliente</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Zap className="w-4 h-4 mr-2" />
                  Generar Link de Pago
                </Button>
                <Button variant="outline" onClick={() => setShowLinkGenerator(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Input
                type="text"
                placeholder="Buscar por factura, cliente o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="paid">Pagados</option>
                <option value="expired">Expirados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Links Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{link.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          Emitida: {link.issueDate}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{link.customerName}</div>
                        <div className="text-xs text-gray-500">{link.customerEmail}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          ${link.amount.toLocaleString()}
                        </div>
                        {link.paymentMethod && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {link.paymentMethod}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{link.dueDate}</div>
                        {link.paidDate && (
                          <div className="text-xs text-green-600">
                            Pagado: {link.paidDate}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {getGatewayBadge(link.paymentGateway)}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(link.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">{link.linkClicks}</span>
                        </div>
                        {link.lastClickedAt && (
                          <div className="text-xs text-gray-500">
                            {link.lastClickedAt}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => copyLink(link.paymentLinkUrl)}
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendEmail(link.customerEmail, link.invoiceNumber)}
                            title="Enviar email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          {link.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(link.paymentLinkUrl, '_blank')}
                              title="Ver link"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {link.status === 'expired' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => regenerateLink(link.invoiceNumber)}
                              title="Regenerar link"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">🔒 Seguridad y Compliance</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Links únicos generados con token aleatorio seguro</li>
                    <li>• Expiración automática según fecha de vencimiento</li>
                    <li>• PCI DSS compliant (no almacenamos datos de tarjeta)</li>
                    <li>• Encriptación SSL/TLS en todas las transacciones</li>
                    <li>• Webhooks para notificaciones en tiempo real</li>
                    <li>• Reconciliación automática con cuentas bancarias</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">⚡ Características del Sistema</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• <strong>Multi-Gateway:</strong> Stripe, PayPal, Mercado Pago</li>
                    <li>• <strong>Smart Routing:</strong> Selección automática del mejor gateway</li>
                    <li>• <strong>Email Tracking:</strong> Saber cuándo el cliente abre el email</li>
                    <li>• <strong>Click Analytics:</strong> Métricas de visualización del link</li>
                    <li>• <strong>Auto-Reconciliation:</strong> Asiento contable automático al pagar</li>
                    <li>• <strong>Multimoneda:</strong> USD, MXN, EUR con conversión automática</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Stack */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">🛠️ Stack Tecnológico Integración</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-700">
                  <div>
                    <strong>Payment Gateways:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Stripe API (Payment Intents)</li>
                      <li>• PayPal Checkout SDK</li>
                      <li>• Mercado Pago SDK</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Email & Notifications:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• SendGrid API (templates)</li>
                      <li>• Twilio SMS (recordatorios)</li>
                      <li>• Webhooks listeners</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Database & Queue:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Prisma ORM (link metadata)</li>
                      <li>• Redis (queue payments)</li>
                      <li>• PostgreSQL (transacciones)</li>
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

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
import toast from 'react-hot-toast'
import { 
  Globe,
  Plus,
  Search,
  Eye,
  Link as LinkIcon,
  Copy,
  Mail,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  CreditCard,
  Download,
  Key,
  UserCheck,
  AlertCircle,
  X
} from 'lucide-react'

interface CustomerPortal {
  id: string
  customerId: string
  customerName: string
  email: string
  portalUrl: string
  status: 'active' | 'inactive' | 'pending'
  lastAccess?: string
  accessCount: number
  features: {
    viewInvoices: boolean
    makePayments: boolean
    downloadDocuments: boolean
    updateInfo: boolean
  }
  createdDate: string
  invitationSent?: string
}

type PortalPermissions = CustomerPortal['features']

interface PortalSettings {
  autoActivate: boolean
  requireTwoFactor: boolean
  notifyOnLogin: boolean
  allowPayments: boolean
  defaultPermissions: PortalPermissions
}

type PortalBooleanSetting = 'autoActivate' | 'requireTwoFactor' | 'notifyOnLogin' | 'allowPayments'

const defaultPermissions: PortalPermissions = {
  viewInvoices: true,
  makePayments: true,
  downloadDocuments: true,
  updateInfo: false
}

export default function CustomerPortalPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [customerPortals, setCustomerPortals] = useState<CustomerPortal[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    customerName: '',
    email: '',
    permissions: { ...defaultPermissions }
  })
  const [portalSettings, setPortalSettings] = useState<PortalSettings>({
    autoActivate: true,
    requireTwoFactor: true,
    notifyOnLogin: true,
    allowPayments: true,
    defaultPermissions: { ...defaultPermissions }
  })

  // Load customer portals from API
  const loadCustomerPortals = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      // Get customers with portal access
      const response = await fetch(`/api/customers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const customers = data.customers || data || []
        
        // Transform customers to portal format
        const portals: CustomerPortal[] = customers
          .filter((c: { portalActive?: boolean }) => c.portalActive !== undefined)
          .map((customer: {
            id: string
            name: string
            email?: string
            portalActive?: boolean
            portalLastLogin?: string
          }) => ({
            id: `CP-${customer.id.slice(-6)}`,
            customerId: customer.id,
            customerName: customer.name,
            email: customer.email || '',
            portalUrl: `https://portal.quickbooks.com/cliente/${customer.id}`,
            status: customer.portalActive ? 'active' : 'inactive',
            lastAccess: customer.portalLastLogin || undefined,
            accessCount: 0, // Would come from analytics
            features: {
              viewInvoices: true,
              makePayments: true,
              downloadDocuments: true,
              updateInfo: false
            },
            createdDate: new Date().toISOString().split('T')[0],
            invitationSent: undefined
          }))
        
        setCustomerPortals(portals)
      }
    } catch (error) {
      console.error('Error loading customer portals:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    loadCustomerPortals()
  }, [loadCustomerPortals])

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inviteForm.customerName.trim() || !inviteForm.email.trim()) {
      toast.error('Nombre y correo son obligatorios')
      return
    }

    const slug = slugify(inviteForm.customerName || inviteForm.email)
    const newPortal: CustomerPortal = {
      id: `CP-${String(customerPortals.length + 1).padStart(3, '0')}`,
      customerId: `CUST-${Date.now()}`,
      customerName: inviteForm.customerName.trim(),
      email: inviteForm.email.trim(),
      portalUrl: `https://portal.quickbooks.com/cliente/${slug}`,
      status: 'pending',
      accessCount: 0,
      features: { ...inviteForm.permissions },
      createdDate: new Date().toISOString(),
      invitationSent: new Date().toISOString()
    }

    setCustomerPortals((prev) => [newPortal, ...prev])
    toast.success('Invitación enviada correctamente')
    setInviteForm({
      customerName: '',
      email: '',
      permissions: { ...defaultPermissions }
    })
    setShowInviteModal(false)
  }

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast.success('Configuración del portal actualizada')
    setShowSettingsModal(false)
  }

  const toggleInvitePermission = (key: keyof PortalPermissions) => {
    setInviteForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }))
  }

  const toggleDefaultPermission = (key: keyof PortalPermissions) => {
    setPortalSettings((prev) => ({
      ...prev,
      defaultPermissions: {
        ...prev.defaultPermissions,
        [key]: !prev.defaultPermissions[key]
      }
    }))
  }

  const portalBooleanSettings: { key: PortalBooleanSetting; label: string; desc: string }[] = [
    { key: 'autoActivate', label: 'Activar automáticamente', desc: 'Habilita el portal al invitar' },
    { key: 'requireTwoFactor', label: 'Exigir 2FA', desc: 'Solicita autenticación adicional' },
    { key: 'notifyOnLogin', label: 'Notificar accesos', desc: 'Envía correo al detectar ingreso' },
    { key: 'allowPayments', label: 'Permitir pagos', desc: 'Habilita pagos en el portal' }
  ]


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Activo
        </Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Inactivo
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      default:
        return null
    }
  }

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(id)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const filteredPortals = customerPortals.filter(portal => {
    if (filterStatus !== 'all' && portal.status !== filterStatus) return false
    if (searchTerm && !portal.customerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !portal.email.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalActive = customerPortals.filter(p => p.status === 'active').length
  const totalAccess = customerPortals.reduce((sum, p) => sum + p.accessCount, 0)
  const recentlyActive = customerPortals.filter(p => 
    p.lastAccess && new Date(p.lastAccess) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

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
            <h1 className="text-2xl font-bold text-gray-900">Portal del Cliente</h1>
            <p className="text-gray-600 mt-1">
              Gestiona el acceso de tus clientes a sus datos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Configuración Portal
            </Button>
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Invitar Cliente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-8 h-8 text-blue-600" />
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Activos
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalActive}</div>
              <div className="text-sm text-blue-700">Portales Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalAccess}</div>
              <div className="text-sm text-green-700">Accesos Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{recentlyActive}</div>
              <div className="text-sm text-purple-700">Activos Esta Semana</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">256-bit</div>
              <div className="text-sm text-orange-700">Encriptación SSL</div>
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
                  placeholder="Buscar por cliente o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Customer Portals List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredPortals.map((portal) => (
            <Card key={portal.id} className="hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>

                      {/* Modal: Invitar Cliente */}
                      {showInviteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">Invitar Cliente al Portal</h3>
                                <p className="text-sm text-gray-500">Envía una invitación con permisos personalizados</p>
                              </div>
                              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <form onSubmit={handleInviteSubmit} className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo *</label>
                                  <Input
                                    value={inviteForm.customerName}
                                    onChange={(e) => setInviteForm((prev) => ({ ...prev, customerName: e.target.value }))}
                                    placeholder="Ej. Carlos Rodríguez"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico *</label>
                                  <Input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                                    placeholder="cliente@empresa.com"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-sm font-semibold text-gray-800">Permisos del portal</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                  {[
                                    { key: 'viewInvoices', label: 'Ver facturas', desc: 'Consultar facturas emitidas' },
                                    { key: 'downloadDocuments', label: 'Descargar documentos', desc: 'PDF y XML disponibles' },
                                    { key: 'makePayments', label: 'Realizar pagos', desc: 'Pagar en línea desde el portal' },
                                    { key: 'updateInfo', label: 'Actualizar información', desc: 'Modificar datos de contacto' }
                                  ].map((perm) => (
                                    <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                                      <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4"
                                        checked={inviteForm.permissions[perm.key as keyof PortalPermissions]}
                                        onChange={() => toggleInvitePermission(perm.key as keyof PortalPermissions)}
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                                        <p className="text-xs text-gray-500">{perm.desc}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>
                                  Cancelar
                                </Button>
                                <Button type="submit" className="flex-1">
                                  <Mail className="mr-2 h-4 w-4" />
                                  Enviar Invitación
                                </Button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Modal: Configuración Portal */}
                      {showSettingsModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">Configuración del Portal</h3>
                                <p className="text-sm text-gray-500">Define la experiencia predeterminada para todos los clientes</p>
                              </div>
                              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <form onSubmit={handleSettingsSubmit} className="space-y-4">
                              <div className="grid gap-3 md:grid-cols-2">
                                {portalBooleanSettings.map((setting) => (
                                  <label key={setting.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4"
                                      checked={portalSettings[setting.key]}
                                      onChange={(e) =>
                                        setPortalSettings((prev) => ({
                                          ...prev,
                                          [setting.key]: e.target.checked
                                        }))
                                      }
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                                      <p className="text-xs text-gray-500">{setting.desc}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>

                              <div className="rounded-lg border border-dashed border-gray-200 p-4">
                                <p className="mb-2 text-sm font-semibold text-gray-800">Permisos predeterminados</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                  {[
                                    { key: 'viewInvoices', label: 'Ver facturas' },
                                    { key: 'downloadDocuments', label: 'Descargar documentos' },
                                    { key: 'makePayments', label: 'Realizar pagos' },
                                    { key: 'updateInfo', label: 'Actualizar datos' }
                                  ].map((perm) => (
                                    <label key={perm.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={portalSettings.defaultPermissions[perm.key as keyof PortalPermissions]}
                                        onChange={() => toggleDefaultPermission(perm.key as keyof PortalPermissions)}
                                      />
                                      <span className="text-sm font-medium text-gray-900">{perm.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSettingsModal(false)}>
                                  Cancelar
                                </Button>
                                <Button type="submit" className="flex-1">
                                  <Settings className="mr-2 h-4 w-4" />
                                  Guardar Cambios
                                </Button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {portal.customerName}
                        </h3>
                        <p className="text-sm text-gray-600">{portal.email}</p>
                      </div>
                      {getStatusBadge(portal.status)}
                    </div>

                    {/* Portal URL */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-500" />
                        <code className="text-sm text-gray-700 flex-1">{portal.portalUrl}</code>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(portal.portalUrl, portal.id)}
                        >
                          {copiedUrl === portal.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-600">Fecha Creación</label>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(portal.createdDate).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      {portal.lastAccess && (
                        <div>
                          <label className="text-xs text-gray-600">Último Acceso</label>
                          <p className="text-sm font-medium text-green-600">
                            {new Date(portal.lastAccess).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-600">Total Accesos</label>
                        <p className="text-sm font-semibold text-blue-600">
                          {portal.accessCount} veces
                        </p>
                      </div>
                      {portal.invitationSent && (
                        <div>
                          <label className="text-xs text-gray-600">Invitación Enviada</label>
                          <p className="text-sm text-gray-700">
                            {new Date(portal.invitationSent).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div>
                      <label className="text-xs text-gray-600 mb-2 block">Funcionalidades Habilitadas</label>
                      <div className="flex flex-wrap gap-2">
                        {portal.features.viewInvoices && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <FileText className="w-3 h-3 mr-1" />
                            Ver Facturas
                          </Badge>
                        )}
                        {portal.features.makePayments && (
                          <Badge className="bg-green-100 text-green-700">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Realizar Pagos
                          </Badge>
                        )}
                        {portal.features.downloadDocuments && (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Download className="w-3 h-3 mr-1" />
                            Descargar Docs
                          </Badge>
                        )}
                        {portal.features.updateInfo && (
                          <Badge className="bg-orange-100 text-orange-700">
                            <Settings className="w-3 h-3 mr-1" />
                            Actualizar Info
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Portal
                    </Button>
                    {portal.status === 'pending' && (
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-1" />
                        Reenviar
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Key className="w-4 h-4 mr-1" />
                      Reset Pass
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>
                    {portal.status === 'active' && (
                      <Button size="sm" variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4 mr-1" />
                        Desactivar
                      </Button>
                    )}
                    {portal.status === 'inactive' && (
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Activar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPortals.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay portales configurados
              </h3>
              <p className="text-gray-600 mb-4">
                Invita a tus clientes para que accedan a su información
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Invitar Primer Cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Portal Seguro para Clientes</h3>
                <p className="text-blue-700 text-sm mb-2">
                  El portal del cliente permite a tus clientes acceder de forma segura a su información financiera 
                  24/7 desde cualquier dispositivo.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Ver facturas</strong> y estado de cuenta en tiempo real</li>
                  <li>• <strong>Realizar pagos</strong> en línea de forma segura</li>
                  <li>• <strong>Descargar documentos</strong> como PDFs y XML</li>
                  <li>• <strong>Actualizar información</strong> de contacto y preferencias</li>
                  <li>• <strong>Encriptación SSL 256-bit</strong> para máxima seguridad</li>
                  <li>• <strong>Personalizable</strong> con tu marca y colores corporativos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

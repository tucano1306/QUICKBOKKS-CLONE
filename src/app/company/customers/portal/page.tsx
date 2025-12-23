'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  X,
  Loader2
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
  features: PortalPermissions
  createdDate: string
  invitationSent?: string
}

interface PortalPermissions {
  viewInvoices: boolean
  makePayments: boolean
  downloadDocuments: boolean
  updateInfo: boolean
}

interface PortalSettings {
  autoActivate: boolean
  requireTwoFactor: boolean
  notifyOnLogin: boolean
  allowPayments: boolean
  defaultPermissions: PortalPermissions
}

const defaultPermissions: PortalPermissions = {
  viewInvoices: true,
  makePayments: true,
  downloadDocuments: true,
  updateInfo: false
}

export default function CustomerPortalPage() {
  const router = useRouter()
  const sessionHook = useSession()
  const companyHook = useCompany()
  
  const authStatus = sessionHook?.status || 'loading'
  const activeCompany = companyHook?.activeCompany

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
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
      const response = await fetch(`/api/customers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const customers = Array.isArray(data) ? data : (data.customers || [])
        
        const portals: CustomerPortal[] = customers.map((customer: any) => ({
          id: `CP-${(customer.id || '').slice(-6)}`,
          customerId: customer.id,
          customerName: customer.name || 'Sin nombre',
          email: customer.email || '',
          portalUrl: `https://portal.computoplus.com/cliente/${customer.id}`,
          status: customer.portalActive ? 'active' : 'inactive',
          lastAccess: customer.portalLastLogin || undefined,
          accessCount: customer.portalAccessCount || 0,
          features: {
            viewInvoices: true,
            makePayments: true,
            downloadDocuments: true,
            updateInfo: false
          },
          createdDate: customer.createdAt || new Date().toISOString(),
          invitationSent: customer.portalInvitedAt || undefined
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
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [authStatus, router])

  useEffect(() => {
    loadCustomerPortals()
  }, [loadCustomerPortals])

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(?:^-+|-+$)/g, '')

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inviteForm.customerName.trim() || !inviteForm.email.trim()) {
      alert('Nombre y correo son obligatorios')
      return
    }

    setProcessing(true)
    try {
      // Crear cliente con acceso al portal
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          name: inviteForm.customerName.trim(),
          email: inviteForm.email.trim(),
          portalActive: true,
          portalInvitedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        const newCustomer = await response.json()
        
        const slug = slugify(inviteForm.customerName || inviteForm.email)
        const newPortal: CustomerPortal = {
          id: `CP-${(newCustomer.id || Date.now().toString()).slice(-6)}`,
          customerId: newCustomer.id || `CUST-${Date.now()}`,
          customerName: inviteForm.customerName.trim(),
          email: inviteForm.email.trim(),
          portalUrl: `https://portal.computoplus.com/cliente/${slug}`,
          status: 'pending',
          accessCount: 0,
          features: { ...inviteForm.permissions },
          createdDate: new Date().toISOString(),
          invitationSent: new Date().toISOString()
        }

        setCustomerPortals(prev => [newPortal, ...prev])
        alert('✅ Invitación enviada correctamente')
        setInviteForm({
          customerName: '',
          email: '',
          permissions: { ...defaultPermissions }
        })
        setShowInviteModal(false)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo enviar la invitación'}`)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Error de conexión al enviar invitación')
    } finally {
      setProcessing(false)
    }
  }

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    alert('✅ Configuración del portal actualizada')
    setShowSettingsModal(false)
  }

  const toggleInvitePermission = (key: keyof PortalPermissions) => {
    setInviteForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }))
  }

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(id)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Activo
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> Inactivo
          </span>
        )
      default:
        return null
    }
  }

  const filteredPortals = customerPortals.filter(portal => {
    if (filterStatus !== 'all' && portal.status !== filterStatus) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        portal.customerName.toLowerCase().includes(search) ||
        portal.email.toLowerCase().includes(search)
      )
    }
    return true
  })

  const totalActive = customerPortals.filter(p => p.status === 'active').length
  const totalPending = customerPortals.filter(p => p.status === 'pending').length
  const totalAccess = customerPortals.reduce((sum, p) => sum + p.accessCount, 0)

  if (authStatus === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
            <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Invitar Cliente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <Globe className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-blue-900">{totalActive}</div>
              <div className="text-sm text-blue-700">Portales Activos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-3xl font-bold text-yellow-900">{totalPending}</div>
              <div className="text-sm text-yellow-700">Invitaciones Pendientes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <UserCheck className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-green-900">{totalAccess}</div>
              <div className="text-sm text-green-700">Total Accesos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Shield className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-3xl font-bold text-purple-900">{customerPortals.length}</div>
              <div className="text-sm text-purple-700">Total Clientes</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="pending">Pendientes</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Customer Portals List */}
        {filteredPortals.length > 0 ? (
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
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{portal.customerName}</h3>
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

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-xs text-gray-600">Creado</span>
                          <p className="text-sm font-medium">
                            {new Date(portal.createdDate).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        {portal.lastAccess && (
                          <div>
                            <span className="text-xs text-gray-600">Último Acceso</span>
                            <p className="text-sm font-medium text-green-600">
                              {new Date(portal.lastAccess).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-gray-600">Accesos</span>
                          <p className="text-sm font-semibold text-blue-600">{portal.accessCount}</p>
                        </div>
                        {portal.invitationSent && (
                          <div>
                            <span className="text-xs text-gray-600">Invitación</span>
                            <p className="text-sm text-gray-700">
                              {new Date(portal.invitationSent).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {portal.features.viewInvoices && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            <FileText className="w-3 h-3" /> Ver Facturas
                          </span>
                        )}
                        {portal.features.makePayments && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                            <CreditCard className="w-3 h-3" /> Pagos
                          </span>
                        )}
                        {portal.features.downloadDocuments && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                            <Download className="w-3 h-3" /> Descargas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" /> Ver
                      </Button>
                      {portal.status === 'pending' && (
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4 mr-1" /> Reenviar
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Key className="w-4 h-4 mr-1" /> Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay portales configurados
              </h3>
              <p className="text-gray-600 mb-4">
                Invita a tus clientes para que accedan a su información
              </p>
              <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Invitar Primer Cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Portal Seguro para Clientes</h3>
                <p className="text-blue-700 text-sm mb-2">
                  El portal permite a tus clientes acceder de forma segura a su información 24/7.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Ver facturas</strong> y estado de cuenta</li>
                  <li>• <strong>Realizar pagos</strong> en línea</li>
                  <li>• <strong>Descargar documentos</strong> PDF y XML</li>
                  <li>• <strong>Encriptación SSL</strong> para seguridad</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Invitar Cliente */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Invitar Cliente al Portal</h3>
                <p className="text-sm text-gray-500">Envía una invitación con acceso personalizado</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="customer-name" className="mb-1 block text-sm font-medium text-gray-700">Nombre completo *</label>
                  <Input
                    id="customer-name"
                    value={inviteForm.customerName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Ej. Carlos Rodríguez"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="customer-email" className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico *</label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
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
                    { key: 'makePayments', label: 'Realizar pagos', desc: 'Pagar en línea' },
                    { key: 'updateInfo', label: 'Actualizar información', desc: 'Modificar datos' }
                  ].map((perm) => (
                    <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50" aria-label={perm.label}>
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
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar Invitación
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configuración Portal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Configuración del Portal</h3>
                <p className="text-sm text-gray-500">Define la configuración predeterminada</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { key: 'autoActivate', label: 'Activar automáticamente', desc: 'Activar portal al enviar invitación' },
                  { key: 'requireTwoFactor', label: 'Autenticación 2FA', desc: 'Requerir verificación adicional' },
                  { key: 'notifyOnLogin', label: 'Notificar accesos', desc: 'Email al detectar inicio de sesión' },
                  { key: 'allowPayments', label: 'Permitir pagos', desc: 'Habilitar pagos en línea' }
                ].map((setting) => (
                  <label key={setting.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50" aria-label={setting.label}>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={portalSettings[setting.key as keyof Omit<PortalSettings, 'defaultPermissions'>]}
                      onChange={(e) =>
                        setPortalSettings(prev => ({
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
                    { key: 'updateInfo', label: 'Actualizar información' }
                  ].map((perm) => (
                    <label key={perm.key} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={portalSettings.defaultPermissions[perm.key as keyof PortalPermissions]}
                        onChange={() =>
                          setPortalSettings(prev => ({
                            ...prev,
                            defaultPermissions: {
                              ...prev.defaultPermissions,
                              [perm.key]: !prev.defaultPermissions[perm.key as keyof PortalPermissions]
                            }
                          }))
                        }
                      />
                      <span className="text-sm text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSettingsModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Settings className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

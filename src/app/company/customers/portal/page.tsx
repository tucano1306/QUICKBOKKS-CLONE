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
  AlertCircle
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

export default function CustomerPortalPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const customerPortals: CustomerPortal[] = [
    {
      id: 'CP-001',
      customerId: 'CUST-001',
      customerName: 'Juan Pérez García',
      email: 'juan.perez@email.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/juan-perez-001',
      status: 'active',
      lastAccess: '2025-11-24',
      accessCount: 47,
      features: {
        viewInvoices: true,
        makePayments: true,
        downloadDocuments: true,
        updateInfo: true
      },
      createdDate: '2025-01-15',
      invitationSent: '2025-01-15'
    },
    {
      id: 'CP-002',
      customerId: 'CUST-002',
      customerName: 'María López Hernández',
      email: 'maria.lopez@empresa.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/maria-lopez-002',
      status: 'active',
      lastAccess: '2025-11-25',
      accessCount: 89,
      features: {
        viewInvoices: true,
        makePayments: true,
        downloadDocuments: true,
        updateInfo: false
      },
      createdDate: '2025-02-20',
      invitationSent: '2025-02-20'
    },
    {
      id: 'CP-003',
      customerId: 'CUST-003',
      customerName: 'Carlos Ramírez Sánchez',
      email: 'carlos.ramirez@mail.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/carlos-ramirez-003',
      status: 'pending',
      accessCount: 0,
      features: {
        viewInvoices: true,
        makePayments: true,
        downloadDocuments: true,
        updateInfo: true
      },
      createdDate: '2025-11-23',
      invitationSent: '2025-11-23'
    },
    {
      id: 'CP-004',
      customerId: 'CUST-004',
      customerName: 'Empresa ABC Corp',
      email: 'contacto@abccorp.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/abc-corp-004',
      status: 'active',
      lastAccess: '2025-11-22',
      accessCount: 156,
      features: {
        viewInvoices: true,
        makePayments: true,
        downloadDocuments: true,
        updateInfo: true
      },
      createdDate: '2024-11-01',
      invitationSent: '2024-11-01'
    },
    {
      id: 'CP-005',
      customerId: 'CUST-005',
      customerName: 'TechStart S.A.',
      email: 'admin@techstart.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/techstart-005',
      status: 'inactive',
      lastAccess: '2025-09-15',
      accessCount: 23,
      features: {
        viewInvoices: true,
        makePayments: false,
        downloadDocuments: true,
        updateInfo: false
      },
      createdDate: '2025-06-10',
      invitationSent: '2025-06-10'
    },
    {
      id: 'CP-006',
      customerId: 'CUST-006',
      customerName: 'Contadores Asociados',
      email: 'info@contadoresasoc.com',
      portalUrl: 'https://portal.quickbooks.com/cliente/contadores-006',
      status: 'active',
      lastAccess: '2025-11-25',
      accessCount: 134,
      features: {
        viewInvoices: true,
        makePayments: true,
        downloadDocuments: true,
        updateInfo: true
      },
      createdDate: '2025-03-05',
      invitationSent: '2025-03-05'
    }
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
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configuración Portal
            </Button>
            <Button>
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

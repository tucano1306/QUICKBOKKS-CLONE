'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Building2,
  Plus,
  Eye,
  Settings,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Globe,
  Shield,
  Database,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react'

interface Company {
  id: string
  name: string
  industry: string
  taxId: string
  currency: string
  fiscalYearEnd: string
  status: 'active' | 'inactive' | 'archived'
  createdDate: string
  users: number
  revenue: number
  expenses: number
  logo?: string
  isPrimary?: boolean
}

export default function MultiCompanyPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeCompanyId, setActiveCompanyId] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        const formattedCompanies = (data.companies || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          industry: c.industry || 'General',
          taxId: c.rfc || c.taxId || '',
          currency: c.currency || 'USD',
          fiscalYearEnd: c.fiscalYearEnd || new Date().toISOString().split('T')[0],
          status: c.status || 'active',
          createdDate: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
          users: c._count?.users || 0,
          revenue: c.totalRevenue || 0,
          expenses: c.totalExpenses || 0,
          isPrimary: c.isPrimary || false
        }))
        setCompanies(formattedCompanies)
        if (formattedCompanies.length > 0 && !activeCompanyId) {
          setActiveCompanyId(formattedCompanies[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
    setLoading(false)
  }, [activeCompanyId])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Activa</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 mr-1" />Inactiva</Badge>
      case 'archived':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Archivada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const switchCompany = (companyId: string) => {
    setActiveCompanyId(companyId)
    const company = companies.find(c => c.id === companyId)
    setMessage({ type: 'success', text: `Cambiado a: ${company?.name}. Todos los datos se filtrarán por esta empresa.` })
    setTimeout(() => setMessage(null), 3000)
  }

  const stats = {
    totalCompanies: companies.length,
    active: companies.filter(c => c.status === 'active').length,
    totalRevenue: companies.reduce((sum, c) => sum + c.revenue, 0),
    totalUsers: companies.reduce((sum, c) => sum + c.users, 0)
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
        {/* Message Display */}
        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              Gestión Multi-Empresa
            </h1>
            <p className="text-gray-600 mt-1">
              Administre múltiples empresas desde una sola cuenta
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalCompanies}</div>
              <div className="text-sm text-blue-700">Total Empresas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.active}</div>
              <div className="text-sm text-green-700">Empresas Activas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${(stats.totalRevenue / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-purple-700">Revenue Consolidado</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">{stats.totalUsers}</div>
              <div className="text-sm text-orange-700">Usuarios Totales</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Form (if shown) */}
        {showCreateForm && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                Crear Nueva Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Empresa
                  </label>
                  <Input placeholder="Mi Nueva Empresa S.A." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industria / Giro
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option>Technology / Software</option>
                    <option>Retail / E-Commerce</option>
                    <option>Professional Services</option>
                    <option>Manufacturing</option>
                    <option>Healthcare</option>
                    <option>Real Estate</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC / Tax ID
                  </label>
                  <Input placeholder="RFC-XXXX123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moneda Base
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option>USD - Dólares</option>
                    <option>MXN - Pesos Mexicanos</option>
                    <option>EUR - Euros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cierre de Ejercicio Fiscal
                  </label>
                  <Input type="date" defaultValue="2025-12-31" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Inicial
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option>Activa</option>
                    <option>Inactiva</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Empresa
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className={`hover:shadow-lg transition-shadow ${
                company.id === activeCompanyId ? 'border-2 border-blue-500 bg-blue-50' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg text-white font-bold text-xl">
                      {company.name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {company.name}
                        {company.isPrimary && <Crown className="w-5 h-5 text-yellow-500" aria-label="Empresa Principal" />}
                        {company.id === activeCompanyId && <Badge className="bg-blue-600 text-white">ACTIVA</Badge>}
                      </h3>
                      <p className="text-sm text-gray-600">{company.industry}</p>
                    </div>
                  </div>
                  {getStatusBadge(company.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-xs text-gray-500">RFC:</span>
                    <div className="font-medium text-gray-900">{company.taxId}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Moneda:</span>
                    <div className="font-medium text-gray-900">{company.currency}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Cierre Fiscal:</span>
                    <div className="font-medium text-gray-900">{company.fiscalYearEnd}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Usuarios:</span>
                    <div className="font-medium text-gray-900">{company.users} activos</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 mb-1">Revenue</div>
                    <div className="font-bold text-green-700">${(company.revenue / 1000).toFixed(0)}K</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-600 mb-1">Expenses</div>
                    <div className="font-bold text-red-700">${(company.expenses / 1000).toFixed(0)}K</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => switchCompany(company.id)}
                    disabled={company.id === activeCompanyId}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Cambiar a Esta
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Dashboard
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">🔒 Aislamiento de Datos</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• <strong>Row-Level Security:</strong> Cada empresa tiene sus datos aislados</li>
                    <li>• <strong>CompanyId Filter:</strong> Todas las queries filtran por companyId</li>
                    <li>• <strong>Shared Users:</strong> Un usuario puede acceder a múltiples empresas</li>
                    <li>• <strong>Permissions:</strong> Roles y permisos por empresa</li>
                    <li>• <strong>Data Export:</strong> Exportar datos de una empresa específica</li>
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
                  <h3 className="font-semibold text-green-900 mb-2">⚡ Características Multi-Company</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• <strong>Company Switcher:</strong> Cambio rápido en navbar</li>
                    <li>• <strong>Consolidated Reports:</strong> Reportes consolidados de todas las empresas</li>
                    <li>• <strong>Inter-Company Transactions:</strong> Movimientos entre empresas</li>
                    <li>• <strong>Different Currencies:</strong> Cada empresa con su moneda</li>
                    <li>• <strong>Different Fiscal Years:</strong> Cierres fiscales independientes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

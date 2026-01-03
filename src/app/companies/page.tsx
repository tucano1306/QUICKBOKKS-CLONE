'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Building, Check, Trash2, X, AlertTriangle, ArrowRight, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCompany } from '@/contexts/CompanyContext'

interface CompanyDetailed {
  id: string
  name: string
  legalName: string | null
  taxId: string | null
  logo: string | null
  industry: string | null
  subscription: string
  status: string
}

interface NewCompanyForm {
  name: string
  legalName: string
  taxId: string
  industry: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  email: string
  website: string
}

export default function CompaniesPage() {
  const router = useRouter()
  const { status } = useSession()
  const { companies, activeCompany, setActiveCompany, refreshCompanies } = useCompany()
  const [isLoading, setIsLoading] = useState(false)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<CompanyDetailed | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState<NewCompanyForm>({
    name: '',
    legalName: '',
    taxId: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'México',
    phone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.legalName || !formData.taxId) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          subscription: 'BASIC',
          status: 'ACTIVE',
        }),
      })

      if (response.ok) {
        toast.success('Empresa creada exitosamente')
        setShowNewCompanyForm(false)
        setFormData({
          name: '',
          legalName: '',
          taxId: '',
          industry: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'México',
          phone: '',
          email: '',
          website: '',
        })
        refreshCompanies()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al crear empresa')
      }
    } catch (error) {
      console.error('Error creating company:', error)
      toast.error('Error al crear empresa')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getSubscriptionBadgeColor = (subscription: string) => {
    switch (subscription) {
      case 'PROFESSIONAL':
        return 'bg-purple-100 text-purple-800'
      case 'ENTERPRISE':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEnterCompany = (e: React.MouseEvent, company: any) => {
    e.stopPropagation()
    setActiveCompany(company)
    toast.success(`Entrando a ${company.name}...`)
    router.push('/company/dashboard')
  }

  const handleDeleteClick = (e: React.MouseEvent, company: CompanyDetailed) => {
    e.stopPropagation()
    setCompanyToDelete(company)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!companyToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/companies/${companyToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Empresa "${companyToDelete.name}" eliminada exitosamente`)
        setShowDeleteModal(false)
        setCompanyToDelete(null)
        refreshCompanies()
        
        // Si la empresa eliminada era la activa, limpiar la selección
        if (activeCompany?.id === companyToDelete.id) {
          setActiveCompany(null as any)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar la empresa')
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error('Error al eliminar la empresa')
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
            <p className="text-gray-600 mt-1">
              Administra todas tus empresas
            </p>
          </div>
          <Button
            onClick={() => setShowNewCompanyForm(!showNewCompanyForm)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </Button>
        </div>

        {showNewCompanyForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial *
                    </label>
                    <Input
                      id="company-name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="company-legalName" className="block text-sm font-medium text-gray-700 mb-1">
                      Razón Social *
                    </label>
                    <Input
                      id="company-legalName"
                      name="legalName"
                      value={formData.legalName}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa S.A. de C.V."
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="company-taxId" className="block text-sm font-medium text-gray-700 mb-1">
                      RFC *
                    </label>
                    <Input
                      id="company-taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      placeholder="ABC123456XYZ"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="company-industry" className="block text-sm font-medium text-gray-700 mb-1">
                      Industria
                    </label>
                    <Input
                      id="company-industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      placeholder="Tecnología"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      id="company-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      id="company-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-address" className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <Input
                      id="company-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Calle Principal #123"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-city" className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <Input
                      id="company-city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Ciudad de México"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-state" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <Input
                      id="company-state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <Input
                      id="company-zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="01000"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-country" className="block text-sm font-medium text-gray-700 mb-1">
                      País
                    </label>
                    <Input
                      id="company-country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="México"
                    />
                  </div>
                  <div>
                    <label htmlFor="company-website" className="block text-sm font-medium text-gray-700 mb-1">
                      Sitio Web
                    </label>
                    <Input
                      id="company-website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://empresa.com"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCompanyForm(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creando...' : 'Crear Empresa'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card
              key={company.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeCompany?.id === company.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => {
                setActiveCompany(company)
                router.push('/company/dashboard')
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {company.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {getInitials(company.name)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.legalName}</p>
                    </div>
                  </div>
                  {activeCompany?.id === company.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {company.taxId && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="w-4 h-4" />
                      <span>RFC: {company.taxId}</span>
                    </div>
                  )}
                  {company.industry && (
                    <p className="text-gray-600">Industria: {company.industry}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Badge className={getSubscriptionBadgeColor(company.subscription)}>
                    {company.subscription}
                  </Badge>
                  <Badge variant={company.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {company.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => handleEnterCompany(e, company)}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, company as CompanyDetailed)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay empresas
              </h3>
              <p className="text-gray-600 mb-4">
                Crea tu primera empresa para comenzar
              </p>
              <Button onClick={() => setShowNewCompanyForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Empresa
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && companyToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar Empresa</h3>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); setCompanyToDelete(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  ¿Estás seguro de que deseas eliminar la empresa <strong>"{companyToDelete.name}"</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                    <li>Todos los clientes de esta empresa</li>
                    <li>Todas las facturas y transacciones</li>
                    <li>Todos los empleados y nóminas</li>
                    <li>Todos los documentos y reportes</li>
                  </ul>
                  <p className="text-sm text-red-800 mt-2 font-semibold">
                    Esta acción NO se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setCompanyToDelete(null); }}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Empresa'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

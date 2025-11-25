'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Building, Edit, Check } from 'lucide-react'
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
  const { data: session, status } = useSession()
  const { companies, activeCompany, setActiveCompany, refreshCompanies } = useCompany()
  const [isLoading, setIsLoading] = useState(false)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial *
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón Social *
                    </label>
                    <Input
                      name="legalName"
                      value={formData.legalName}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa S.A. de C.V."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RFC *
                    </label>
                    <Input
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      placeholder="ABC123456XYZ"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industria
                    </label>
                    <Input
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      placeholder="Tecnología"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Calle Principal #123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Ciudad de México"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <Input
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <Input
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="01000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      País
                    </label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="México"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sitio Web
                    </label>
                    <Input
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
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Mail, Phone, Building, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  createdAt: string
  _count: {
    invoices: number
  }
}

export default function CustomersListPage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchCustomers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeCompany, router])

  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCustomers(filtered)
    setCurrentPage(1) // Reset página cuando cambia el filtro
  }, [searchTerm, customers])

  // Datos paginados
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCustomers.slice(start, start + pageSize)
  }, [filteredCustomers, currentPage, pageSize])

  const totalPages = Math.ceil(filteredCustomers.length / pageSize)

  const fetchCustomers = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/customers?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setCustomers(Array.isArray(data) ? data : [])
        setFilteredCustomers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!activeCompany || !confirm('¿Estás seguro de eliminar este cliente?')) return

    try {
      const response = await fetch(`/api/customers/${id}?companyId=${activeCompany.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Cliente eliminado')
        fetchCustomers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al eliminar cliente')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Error al eliminar cliente')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#2CA01C] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Cargando clientes...</span>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2942] flex items-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#2CA01C]" />
              Clientes
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Gestiona tu directorio de clientes
            </p>
          </div>
          <Button 
            onClick={() => router.push('/company/customers/new')} 
            className="bg-[#2CA01C] hover:bg-[#108000] shadow-lg shadow-green-500/25 w-full sm:w-auto"
            size="sm"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo</span> Cliente
          </Button>
        </div>

        <Card className="shadow-md border-0">
          <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-[#0D2942] text-base sm:text-lg">Lista de Clientes ({filteredCustomers.length})</CardTitle>
              <div className="relative w-full sm:w-auto sm:max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Vista Móvil - Cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No se encontraron clientes</p>
                </div>
              ) : (
                paginatedCustomers.map((customer) => (
                  <div key={customer.id} className="p-4 hover:bg-green-50/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-[#0D2942]">{customer.name}</p>
                        {customer.company && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building className="w-3 h-3" /> {customer.company}
                          </p>
                        )}
                      </div>
                      <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-500 mb-3">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" /> {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-gray-500">{customer._count.invoices} facturas</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Vista Desktop - Table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-[#0D2942]">Nombre</TableHead>
                  <TableHead className="font-semibold text-[#0D2942] hidden lg:table-cell">Empresa</TableHead>
                  <TableHead className="font-semibold text-[#0D2942] hidden xl:table-cell">Contacto</TableHead>
                  <TableHead className="font-semibold text-[#0D2942]">Facturas</TableHead>
                  <TableHead className="font-semibold text-[#0D2942]">Estado</TableHead>
                  <TableHead className="text-right font-semibold text-[#0D2942]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-green-50/50 transition-colors">
                      <TableCell className="font-medium text-[#0D2942]">{customer.name}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {customer.company && (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-[#2CA01C]" />
                            {customer.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer._count.invoices}</TableCell>
                      <TableCell>
                        <Badge
                          variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}
                        >
                          {customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>

            {/* Paginación */}
            {filteredCustomers.length > 0 && (
              <div className="p-3 sm:p-0 sm:pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCustomers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setCurrentPage(1)
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

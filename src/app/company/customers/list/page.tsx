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
import { Plus, Search, Edit, Trash2, Mail, Phone, Building } from 'lucide-react'
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2942]">Clientes</h1>
            <p className="text-gray-500 mt-1">
              Gestiona tu directorio de clientes
            </p>
          </div>
          <Button className="flex items-center gap-2 bg-[#2CA01C] hover:bg-[#108000] shadow-lg shadow-green-500/25">
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#0D2942]">Lista de Clientes</CardTitle>
              <div className="flex items-center gap-2 max-w-sm">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-[#0D2942]">Nombre</TableHead>
                  <TableHead className="font-semibold text-[#0D2942]">Empresa</TableHead>
                  <TableHead className="font-semibold text-[#0D2942]">Contacto</TableHead>
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
                      <TableCell>
                        {customer.company && (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-[#2CA01C]" />
                            {customer.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
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

            {/* Paginación */}
            {filteredCustomers.length > 0 && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

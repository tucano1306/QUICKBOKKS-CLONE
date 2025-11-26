'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import QuickAccessBar from '@/components/ui/quick-access-bar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, LayoutDashboard, Package, FolderOpen, BarChart3, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCompany } from '@/contexts/CompanyContext'

interface Product {
  id: string
  name: string
  type: string
  sku: string | null
  price: number
  category: string | null
  status: string
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const productsLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
    { label: 'Productos', href: '/products', icon: Package, color: 'green' },
    { label: 'Categorías', href: '/company/products/categories', icon: FolderOpen, color: 'purple' },
    { label: 'Inventario', href: '/company/products/inventory', icon: BarChart3, color: 'orange' },
    { label: 'Reportes', href: '/reports', icon: FileText, color: 'indigo' }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchProducts()
    }
  }, [status, activeCompany])

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const fetchProducts = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/products?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        // Manejar tanto respuestas con paginación como arrays directos
        const data = result.data || result
        setProducts(Array.isArray(data) ? data : [])
        setFilteredProducts(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error al cargar productos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!activeCompany || !confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`/api/products/${id}?companyId=${activeCompany.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Producto eliminado')
        fetchProducts()
      } else {
        toast.error('Error al eliminar producto')
      }
    } catch (error) {
      toast.error('Error al eliminar producto')
    }
  }

  if (status === 'loading' || isLoading) {
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
        <QuickAccessBar title="Navegación Productos" links={productsLinks} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos y Servicios</h1>
            <p className="text-gray-600 mt-1">
              Gestiona tu catálogo de productos y servicios
            </p>
          </div>
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {product.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>${product.price.toLocaleString('es-MX')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}
                        >
                          {product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

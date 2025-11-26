'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Upload, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  vendor: string
  status: string
  createdAt: string
}

export default function ExpensesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated' && activeCompany) {
      fetchExpenses()
    }
  }, [status, activeCompany])

  useEffect(() => {
    let filtered = expenses

    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.category === categoryFilter)
    }

    setFilteredExpenses(filtered)
  }, [searchTerm, categoryFilter, expenses])

  const fetchExpenses = async () => {
    if (!activeCompany) return
    
    try {
      const response = await fetch(`/api/expenses?companyId=${activeCompany.id}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setExpenses(Array.isArray(data) ? data : [])
        setFilteredExpenses(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Error al cargar gastos')
    } finally {
      setIsLoading(false)
    }
  }

  const stats = [
    {
      label: 'Total Gastado (Mes)',
      value: `$${filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`,
      color: 'blue'
    },
    {
      label: 'Gastos Aprobados',
      value: filteredExpenses.filter(exp => exp.status === 'APPROVED').length,
      color: 'green'
    },
    {
      label: 'Gastos Pendientes',
      value: filteredExpenses.filter(exp => exp.status === 'PENDING').length,
      color: 'orange'
    },
    {
      label: 'Gastos Rechazados',
      value: filteredExpenses.filter(exp => exp.status === 'REJECTED').length,
      color: 'red'
    }
  ]

  const categories = ['all', 'Oficina', 'Transporte', 'Comida', 'Software', 'Marketing', 'Otros']

  if (status === 'loading' || isLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
            <p className="text-gray-600 mt-1">
              Registro y seguimiento de gastos empresariales
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => alert('📷 Escanear Recibo\n\nUsando cámara/scanner para capturar recibo')}>
              <Camera className="w-4 h-4" />
              Escanear Recibo
            </Button>
            <Button className="flex items-center gap-2" onClick={() => alert('📄 Nuevo Gasto\n\nRegistrar nuevo gasto\nPOST /api/expenses')}>
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold text-${stat.color}-600`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Subir Recibo</h3>
              <p className="text-sm text-gray-600">Arrastra o selecciona archivos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Camera className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Capturar Foto</h3>
              <p className="text-sm text-gray-600">Usa tu cámara para escanear</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Receipt className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Registro Manual</h3>
              <p className="text-sm text-gray-600">Crear gasto manualmente</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Historial de Gastos</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'Todas las categorías' : cat}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar gastos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No hay gastos registrados</p>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Registrar primer gasto
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(expense.date).toLocaleDateString('es-MX')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        -${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          expense.status === 'APPROVED' ? 'default' : 
                          expense.status === 'PENDING' ? 'secondary' : 
                          'destructive'
                        }>
                          {expense.status === 'APPROVED' ? 'Aprobado' :
                           expense.status === 'PENDING' ? 'Pendiente' :
                           'Rechazado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-600" />
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
    </CompanyTabsLayout>
  )
}

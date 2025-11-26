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
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Edit,
  Trash2,
  Upload
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  category: string
  description: string
  account: string
  amount: number
  reference?: string
  status: 'pending' | 'completed' | 'cancelled'
  attachments: number
}

export default function TransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState('month')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const transactions: Transaction[] = [
    {
      id: 'TXN-001',
      date: '2025-11-24',
      type: 'income',
      category: 'Ventas de Servicios',
      description: 'Pago de cliente - Factura #12345',
      account: 'Banco BBVA - 4567',
      amount: 15000,
      reference: 'FAC-12345',
      status: 'completed',
      attachments: 2
    },
    {
      id: 'TXN-002',
      date: '2025-11-23',
      type: 'expense',
      category: 'Renta',
      description: 'Pago de renta mensual - Oficina Centro',
      account: 'Banco BBVA - 4567',
      amount: 8000,
      reference: 'RENT-NOV',
      status: 'completed',
      attachments: 1
    },
    {
      id: 'TXN-003',
      date: '2025-11-23',
      type: 'expense',
      category: 'Sueldos y Salarios',
      description: 'Nómina quincenal - 2da Nov',
      account: 'Banco BBVA - 4567',
      amount: 14000,
      reference: 'NOM-NOV-02',
      status: 'completed',
      attachments: 0
    },
    {
      id: 'TXN-004',
      date: '2025-11-22',
      type: 'income',
      category: 'Ventas de Productos',
      description: 'Venta de productos - Cliente ABC Corp',
      account: 'Banco BBVA - 4567',
      amount: 45000,
      reference: 'FAC-12344',
      status: 'completed',
      attachments: 3
    },
    {
      id: 'TXN-005',
      date: '2025-11-21',
      type: 'expense',
      category: 'Servicios Públicos',
      description: 'Pago de electricidad - Oficina',
      account: 'Banco BBVA - 4567',
      amount: 1200,
      reference: 'CFE-NOV',
      status: 'completed',
      attachments: 1
    },
    {
      id: 'TXN-006',
      date: '2025-11-20',
      type: 'expense',
      category: 'Marketing',
      description: 'Campaña Facebook Ads - Noviembre',
      account: 'Tarjeta Crédito - 8901',
      amount: 5000,
      reference: 'MKT-NOV',
      status: 'pending',
      attachments: 0
    },
    {
      id: 'TXN-007',
      date: '2025-11-19',
      type: 'transfer',
      category: 'Transferencia Interna',
      description: 'Transferencia entre cuentas',
      account: 'Banco BBVA → Santander',
      amount: 20000,
      reference: 'TRANS-001',
      status: 'completed',
      attachments: 0
    },
    {
      id: 'TXN-008',
      date: '2025-11-18',
      type: 'income',
      category: 'Ventas de Servicios',
      description: 'Contrato anual - Empresa XYZ',
      account: 'Banco BBVA - 4567',
      amount: 120000,
      reference: 'CONT-2025-001',
      status: 'completed',
      attachments: 5
    },
    {
      id: 'TXN-009',
      date: '2025-11-17',
      type: 'expense',
      category: 'Suministros de Oficina',
      description: 'Papelería y materiales',
      account: 'Tarjeta Crédito - 8901',
      amount: 850,
      reference: 'SUP-NOV',
      status: 'completed',
      attachments: 1
    },
    {
      id: 'TXN-010',
      date: '2025-11-16',
      type: 'expense',
      category: 'Internet y Telefonía',
      description: 'Pago mensual Telmex - Internet 500MB',
      account: 'Banco BBVA - 4567',
      amount: 899,
      reference: 'TEL-NOV',
      status: 'completed',
      attachments: 1
    }
  ]

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const netCashFlow = totalIncome - totalExpense

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'expense': return <ArrowDownRight className="w-4 h-4 text-red-600" />
      default: return <ArrowUpRight className="w-4 h-4 text-blue-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600'
      case 'expense': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
            <p className="text-gray-600 mt-1">
              Historial completo de movimientos financieros
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowUpRight className="w-8 h-8 text-green-600" />
                <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full font-medium">
                  Ingresos
                </span>
              </div>
              <div className="text-3xl font-bold text-green-900">
                ${totalIncome.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Total del Período</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowDownRight className="w-8 h-8 text-red-600" />
                <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                  Gastos
                </span>
              </div>
              <div className="text-3xl font-bold text-red-900">
                ${totalExpense.toLocaleString()}
              </div>
              <div className="text-sm text-red-700">Total del Período</div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netCashFlow >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-8 h-8 text-blue-600" />
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Neto
                </span>
              </div>
              <div className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                ${Math.abs(netCashFlow).toLocaleString()}
              </div>
              <div className={`text-sm ${netCashFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                Flujo Neto {netCashFlow >= 0 ? 'Positivo' : 'Negativo'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 relative w-full">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por descripción, referencia o cuenta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="transfer">Transferencias</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Año</option>
                <option value="custom">Personalizado</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Transacciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Adjuntos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
                            {transaction.type === 'income' ? 'Ingreso' : 
                             transaction.type === 'expense' ? 'Gasto' : 'Transferencia'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transaction.description}</div>
                        {transaction.reference && (
                          <div className="text-xs text-gray-500">Ref: {transaction.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transaction.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transaction.account}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${getTypeColor(transaction.type)}`}>
                          ${transaction.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusBadge(transaction.status)}>
                          {transaction.status === 'completed' ? 'Completada' :
                           transaction.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {transaction.attachments > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            📎 {transaction.attachments}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

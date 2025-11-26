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
  ArrowRightLeft,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface Transfer {
  id: string
  transferId: string
  date: string
  fromAccount: string
  fromAccountId: string
  toAccount: string
  toAccountId: string
  amount: number
  fromCurrency: string
  toCurrency: string
  exchangeRate?: number
  convertedAmount?: number
  type: 'internal' | 'external' | 'international'
  description: string
  reference?: string
  status: 'completed' | 'pending' | 'scheduled' | 'failed' | 'cancelled'
  scheduledDate?: string
  completedDate?: string
  fee?: number
}

export default function BankTransfersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const transfers: Transfer[] = [
    {
      id: 'TRF-001',
      transferId: 'TRF-2025-001',
      date: '2025-11-25',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Nómina',
      toAccountId: 'ACC-003',
      amount: 250000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'internal',
      description: 'Transferencia para pago de nómina quincena 2',
      reference: 'PAY-2025-Q2',
      status: 'completed',
      completedDate: '2025-11-25'
    },
    {
      id: 'TRF-002',
      transferId: 'TRF-2025-002',
      date: '2025-11-24',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta de Ahorros Empresarial',
      toAccountId: 'ACC-002',
      amount: 500000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'internal',
      description: 'Transferencia a cuenta de ahorros - Ahorro mensual',
      reference: 'SAV-NOV-2025',
      status: 'completed',
      completedDate: '2025-11-24'
    },
    {
      id: 'TRF-003',
      transferId: 'TRF-2025-003',
      date: '2025-11-23',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Externa - Proveedor Internacional',
      toAccountId: 'EXT-001',
      amount: 85000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'external',
      description: 'Pago a proveedor externo - Servicios de hosting',
      reference: 'BILL-EXT-2025-012',
      status: 'completed',
      completedDate: '2025-11-23',
      fee: 150
    },
    {
      id: 'TRF-004',
      transferId: 'TRF-2025-004',
      date: '2025-11-22',
      fromAccount: 'Cuenta USD Internacional',
      fromAccountId: 'ACC-005',
      toAccount: 'Cuenta Principal Operativa',
      toAccountId: 'ACC-001',
      amount: 5000,
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      exchangeRate: 17.45,
      convertedAmount: 87250,
      type: 'internal',
      description: 'Conversión USD a MXN - Cambio de divisas',
      reference: 'FX-NOV-2025-001',
      status: 'completed',
      completedDate: '2025-11-22',
      fee: 200
    },
    {
      id: 'TRF-005',
      transferId: 'TRF-2025-005',
      date: '2025-11-21',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Fiscal - Impuestos',
      toAccountId: 'ACC-007',
      amount: 150000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'internal',
      description: 'Transferencia para provisión de impuestos',
      reference: 'TRF-FISCAL-NOV',
      status: 'completed',
      completedDate: '2025-11-21'
    },
    {
      id: 'TRF-006',
      transferId: 'TRF-2025-006',
      date: '2025-11-20',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Banco Internacional - Wire Transfer',
      toAccountId: 'INT-001',
      amount: 100000,
      fromCurrency: 'MXN',
      toCurrency: 'USD',
      exchangeRate: 17.50,
      convertedAmount: 5714.29,
      type: 'international',
      description: 'Transferencia internacional a proveedor USA',
      reference: 'WIRE-2025-003',
      status: 'pending',
      fee: 850
    },
    {
      id: 'TRF-007',
      transferId: 'TRF-2025-007',
      date: '2025-11-27',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Nómina',
      toAccountId: 'ACC-003',
      amount: 254798,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'internal',
      description: 'Transferencia programada - Nómina quincena 1 Diciembre',
      reference: 'PAY-2025-DIC-Q1',
      status: 'scheduled',
      scheduledDate: '2025-11-27'
    },
    {
      id: 'TRF-008',
      transferId: 'TRF-2025-008',
      date: '2025-11-18',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Externa - Banco Azteca',
      toAccountId: 'EXT-002',
      amount: 45000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'external',
      description: 'Pago proveedor servicios generales',
      reference: 'BILL-2025-045',
      status: 'completed',
      completedDate: '2025-11-18',
      fee: 100
    },
    {
      id: 'TRF-009',
      transferId: 'TRF-2025-009',
      date: '2025-11-17',
      fromAccount: 'Cuenta de Ahorros Empresarial',
      fromAccountId: 'ACC-002',
      toAccount: 'Fondo de Inversión',
      toAccountId: 'ACC-006',
      amount: 300000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'internal',
      description: 'Inversión mensual a fondo de inversión',
      reference: 'INV-NOV-2025',
      status: 'completed',
      completedDate: '2025-11-17'
    },
    {
      id: 'TRF-010',
      transferId: 'TRF-2025-010',
      date: '2025-11-15',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Externa - HSBC',
      toAccountId: 'EXT-003',
      amount: 120000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'external',
      description: 'Transferencia SPEI - Pago servicios profesionales',
      reference: 'BILL-2025-040',
      status: 'completed',
      completedDate: '2025-11-15',
      fee: 8
    },
    {
      id: 'TRF-011',
      transferId: 'TRF-2025-011',
      date: '2025-11-14',
      fromAccount: 'Cuenta USD Internacional',
      fromAccountId: 'ACC-005',
      toAccount: 'Proveedor Internacional USA',
      toAccountId: 'INT-002',
      amount: 3500,
      fromCurrency: 'USD',
      toCurrency: 'USD',
      type: 'international',
      description: 'Pago internacional - Software licenses',
      reference: 'INV-INT-2025-018',
      status: 'completed',
      completedDate: '2025-11-14',
      fee: 45
    },
    {
      id: 'TRF-012',
      transferId: 'TRF-2025-012',
      date: '2025-11-13',
      fromAccount: 'Cuenta Principal Operativa',
      fromAccountId: 'ACC-001',
      toAccount: 'Cuenta Externa - Error de ruta',
      toAccountId: 'EXT-999',
      amount: 25000,
      fromCurrency: 'MXN',
      toCurrency: 'MXN',
      type: 'external',
      description: 'Transferencia fallida - Cuenta destino incorrecta',
      reference: 'BILL-2025-ERR',
      status: 'failed'
    }
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'internal':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Interna
        </Badge>
      case 'external':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <ArrowRightLeft className="w-3 h-3" /> Externa
        </Badge>
      case 'international':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Internacional
        </Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completada
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Programada
        </Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Fallida
        </Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Cancelada
        </Badge>
      default:
        return null
    }
  }

  const filteredTransfers = transfers.filter(trf => {
    if (filterType !== 'all' && trf.type !== filterType) return false
    if (filterStatus !== 'all' && trf.status !== filterStatus) return false
    if (searchTerm && !trf.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.transferId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.fromAccount.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !trf.toAccount.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalTransfers = transfers.length
  const completedTransfers = transfers.filter(t => t.status === 'completed').length
  const totalAmount = transfers
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => {
      if (t.fromCurrency === 'MXN') return sum + t.amount
      if (t.fromCurrency === 'USD' && t.exchangeRate) return sum + (t.amount * t.exchangeRate)
      return sum
    }, 0)
  const scheduledTransfers = transfers.filter(t => t.status === 'scheduled').length

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
            <h1 className="text-2xl font-bold text-gray-900">Transferencias Bancarias</h1>
            <p className="text-gray-600 mt-1">
              Gestiona transferencias entre cuentas y hacia terceros
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transferencia
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ArrowRightLeft className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalTransfers}</div>
              <div className="text-sm text-blue-700">Total Transferencias</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{completedTransfers}</div>
              <div className="text-sm text-green-700">Completadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{scheduledTransfers}</div>
              <div className="text-sm text-orange-700">Programadas</div>
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
                  placeholder="Buscar transferencias..."
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
                <option value="internal">Internas</option>
                <option value="external">Externas</option>
                <option value="international">Internacionales</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="pending">Pendientes</option>
                <option value="scheduled">Programadas</option>
                <option value="failed">Fallidas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Transferencias ({filteredTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transferencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta Origen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(transfer.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        {transfer.scheduledDate && (
                          <div className="text-xs text-orange-600 mt-1">
                            Progr: {new Date(transfer.scheduledDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {transfer.transferId}
                        </div>
                        {transfer.reference && (
                          <div className="text-xs text-gray-500">
                            Ref: {transfer.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transfer.fromAccount}</div>
                        <div className="text-xs text-gray-500">{transfer.fromCurrency}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transfer.toAccount}</div>
                        <div className="text-xs text-gray-500">{transfer.toCurrency}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        {transfer.description}
                        {transfer.exchangeRate && (
                          <div className="text-xs text-purple-600 mt-1">
                            TC: {transfer.exchangeRate} → {transfer.toCurrency} ${transfer.convertedAmount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getTypeBadge(transfer.type)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {transfer.fromCurrency} ${transfer.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        {transfer.fee && transfer.fee > 0 && (
                          <div className="text-xs text-orange-600">
                            Comisión: ${transfer.fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transfer.status)}
                        {transfer.completedDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(transfer.completedDate).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {transfer.status === 'scheduled' && (
                            <Button size="sm" variant="outline" className="text-red-600">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
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

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Transferencias Bancarias</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema completo para gestionar transferencias entre cuentas propias, externas e internacionales.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Transferencias Internas:</strong> Entre cuentas propias, sin comisión, inmediatas</li>
                  <li>• <strong>Transferencias Externas:</strong> SPEI a terceros, comisión mínima, mismo día</li>
                  <li>• <strong>Transferencias Internacionales:</strong> Wire transfers, conversión de divisas automática</li>
                  <li>• <strong>Programación:</strong> Agenda transferencias futuras (nómina, pagos recurrentes)</li>
                  <li>• <strong>Tipo de cambio:</strong> Conversión automática MXN-USD con TC en tiempo real</li>
                  <li>• <strong>Comisiones:</strong> Registro automático de costos bancarios por servicio</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

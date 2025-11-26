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
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2
} from 'lucide-react'

interface Payable {
  id: string
  billNumber: string
  vendor: string
  vendorId: string
  date: string
  dueDate: string
  amount: number
  paidAmount: number
  balance: number
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  description: string
  category: string
  reference?: string
  terms: string
}

export default function VendorPayablesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVendor, setFilterVendor] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [showNewPayableModal, setShowNewPayableModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const payables: Payable[] = [
    {
      id: 'PAY-001',
      billNumber: 'BILL-2025-001',
      vendor: 'Distribuidora Tech Solutions',
      vendorId: 'VEND-001',
      date: '2025-11-10',
      dueDate: '2025-12-10',
      amount: 25000,
      paidAmount: 0,
      balance: 25000,
      status: 'unpaid',
      description: 'Equipos de cómputo - Orden #12345',
      category: 'Tecnología',
      reference: 'PO-2025-010',
      terms: 'Net 30'
    },
    {
      id: 'PAY-002',
      billNumber: 'BILL-2025-002',
      vendor: 'Papelería Moderna S.A.',
      vendorId: 'VEND-002',
      date: '2025-11-15',
      dueDate: '2025-11-30',
      amount: 8500,
      paidAmount: 0,
      balance: 8500,
      status: 'unpaid',
      description: 'Suministros de oficina - Noviembre',
      category: 'Suministros',
      reference: 'PO-2025-011',
      terms: 'Net 15'
    },
    {
      id: 'PAY-003',
      billNumber: 'BILL-2025-003',
      vendor: 'Inmobiliaria del Centro',
      vendorId: 'VEND-004',
      date: '2025-11-01',
      dueDate: '2025-11-05',
      amount: 60000,
      paidAmount: 60000,
      balance: 0,
      status: 'paid',
      description: 'Renta mensual - Noviembre 2025',
      category: 'Arrendamiento',
      terms: 'Net 5'
    },
    {
      id: 'PAY-004',
      billNumber: 'BILL-2025-004',
      vendor: 'Transportes Express México',
      vendorId: 'VEND-005',
      date: '2025-11-12',
      dueDate: '2025-11-27',
      amount: 12000,
      paidAmount: 0,
      balance: 12000,
      status: 'unpaid',
      description: 'Servicios de envío - Octubre',
      category: 'Logística',
      reference: 'FAC-TEM-4567',
      terms: 'Net 15'
    },
    {
      id: 'PAY-005',
      billNumber: 'BILL-2025-005',
      vendor: 'Consultoría Legal Pérez & Asociados',
      vendorId: 'VEND-006',
      date: '2025-11-05',
      dueDate: '2025-12-05',
      amount: 35000,
      paidAmount: 0,
      balance: 35000,
      status: 'unpaid',
      description: 'Asesoría legal - Octubre 2025',
      category: 'Servicios Profesionales',
      terms: 'Net 30'
    },
    {
      id: 'PAY-006',
      billNumber: 'BILL-2025-006',
      vendor: 'Internet y Telefonía Global',
      vendorId: 'VEND-008',
      date: '2025-11-18',
      dueDate: '2025-12-03',
      amount: 7800,
      paidAmount: 0,
      balance: 7800,
      status: 'unpaid',
      description: 'Servicios de internet y telefonía - Noviembre',
      category: 'Telecomunicaciones',
      reference: 'ITG-NOV-2025',
      terms: 'Net 15'
    },
    {
      id: 'PAY-007',
      billNumber: 'BILL-2025-007',
      vendor: 'Distribuidora Tech Solutions',
      vendorId: 'VEND-001',
      date: '2025-10-15',
      dueDate: '2025-11-14',
      amount: 45000,
      paidAmount: 45000,
      balance: 0,
      status: 'paid',
      description: 'Software licencias anuales',
      category: 'Tecnología',
      reference: 'PO-2025-008',
      terms: 'Net 30'
    },
    {
      id: 'PAY-008',
      billNumber: 'BILL-2025-008',
      vendor: 'Servicios de Limpieza ProClean',
      vendorId: 'VEND-003',
      date: '2025-10-01',
      dueDate: '2025-10-08',
      amount: 5500,
      paidAmount: 5500,
      balance: 0,
      status: 'paid',
      description: 'Servicios de limpieza - Septiembre',
      category: 'Servicios',
      terms: 'Net 7'
    },
    {
      id: 'PAY-009',
      billNumber: 'BILL-2025-009',
      vendor: 'Papelería Moderna S.A.',
      vendorId: 'VEND-002',
      date: '2025-10-20',
      dueDate: '2025-11-10',
      amount: 12000,
      paidAmount: 5000,
      balance: 7000,
      status: 'partial',
      description: 'Mobiliario de oficina',
      category: 'Suministros',
      reference: 'PO-2025-009',
      terms: 'Net 15'
    },
    {
      id: 'PAY-010',
      billNumber: 'BILL-2025-010',
      vendor: 'Transportes Express México',
      vendorId: 'VEND-005',
      date: '2025-10-01',
      dueDate: '2025-10-16',
      amount: 8500,
      paidAmount: 0,
      balance: 8500,
      status: 'overdue',
      description: 'Servicios de envío - Septiembre',
      category: 'Logística',
      reference: 'FAC-TEM-4321',
      terms: 'Net 15'
    }
  ]

  const getStatusBadge = (status: string, dueDate: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Pagado
        </Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pago Parcial
        </Badge>
      case 'unpaid':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Por Pagar
        </Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Vencido
        </Badge>
      default:
        return null
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`
    if (diffDays === 0) return 'Vence hoy'
    if (diffDays === 1) return 'Vence mañana'
    return `Vence en ${diffDays} días`
  }

  const filteredPayables = payables.filter(pay => {
    if (filterStatus !== 'all' && pay.status !== filterStatus) return false
    if (filterVendor !== 'all' && pay.vendorId !== filterVendor) return false
    if (searchTerm && !pay.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pay.vendor.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pay.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    if (dateRange !== 'all') {
      const dueDate = new Date(pay.dueDate)
      const now = new Date()
      const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dateRange === 'overdue' && daysDiff >= 0) return false
      if (dateRange === 'week' && (daysDiff < 0 || daysDiff > 7)) return false
      if (dateRange === 'month' && (daysDiff < 0 || daysDiff > 30)) return false
    }
    
    return true
  })

  const uniqueVendors = Array.from(new Set(payables.map(p => p.vendor)))
    .map(name => payables.find(p => p.vendor === name)!)

  const totalPayables = payables
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.balance, 0)
  const overdueAmount = payables
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.balance, 0)
  const dueThisWeek = payables.filter(p => {
    if (p.status === 'paid') return false
    const dueDate = new Date(p.dueDate)
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    return dueDate <= weekFromNow && dueDate >= new Date()
  }).reduce((sum, p) => sum + p.balance, 0)
  const totalPaid = payables
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Cuentas por Pagar</h1>
            <p className="text-gray-600 mt-1">
              Facturas pendientes de proveedores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const csv = 'Factura,Proveedor,Fecha,Vencimiento,Monto,Pagado,Balance,Estado\n' + 
                filteredPayables.map(p => 
                  `${p.billNumber},"${p.vendor}",${p.date},${p.dueDate},$${p.amount},$${p.paidAmount},$${p.balance},${p.status}`
                ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `cuentas-por-pagar-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewPayableModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Factura
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${totalPayables.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Total Por Pagar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${overdueAmount.toLocaleString()}
              </div>
              <div className="text-sm text-red-700">Facturas Vencidas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${dueThisWeek.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Vence Esta Semana</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Pagado Este Mes</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar facturas..."
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
                <option value="unpaid">Por Pagar</option>
                <option value="partial">Pago Parcial</option>
                <option value="overdue">Vencidos</option>
                <option value="paid">Pagados</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="all">Todos los Proveedores</option>
                {uniqueVendors.map(vendor => (
                  <option key={vendor.vendorId} value={vendor.vendorId}>
                    {vendor.vendor}
                  </option>
                ))}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">Todos los Vencimientos</option>
                <option value="overdue">Vencidas</option>
                <option value="week">Vencen Esta Semana</option>
                <option value="month">Vencen Este Mes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Payables Table */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas por Pagar ({filteredPayables.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayables.map((payable) => (
                    <tr key={payable.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {payable.billNumber}
                        </div>
                        {payable.reference && (
                          <div className="text-xs text-gray-500">
                            Ref: {payable.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {payable.vendor}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payable.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {payable.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(payable.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(payable.dueDate).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                        {payable.status !== 'paid' && (
                          <div className={`text-xs ${
                            payable.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {getDaysUntilDue(payable.dueDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ${payable.amount.toLocaleString()}
                        </div>
                        {payable.paidAmount > 0 && payable.status === 'partial' && (
                          <div className="text-xs text-green-600">
                            Pagado: ${payable.paidAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payable.balance > 0 ? (
                          <div className="text-sm font-semibold text-orange-600">
                            ${payable.balance.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(payable.status, payable.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {payable.status !== 'paid' && (
                            <Button size="sm" variant="outline">
                              <CreditCard className="w-4 h-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4" />
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
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Gestión de Cuentas por Pagar</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Controla todas tus obligaciones con proveedores y mantén un flujo de pagos ordenado.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Visibilidad total:</strong> Conoce en tiempo real tus obligaciones de pago</li>
                  <li>• <strong>Priorización:</strong> Identifica facturas vencidas y próximas a vencer</li>
                  <li>• <strong>Términos de pago:</strong> Respeta los acuerdos comerciales con cada proveedor</li>
                  <li>• <strong>Planificación:</strong> Programa pagos según tu flujo de efectivo</li>
                  <li>• <strong>Historial:</strong> Mantén registro completo de pagos realizados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Registrar Factura */}
        {showNewPayableModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewPayableModal(false)}>
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Registrar Factura de Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Proveedor</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Acme Corp</option>
                      <option>Office Supplies Co.</option>
                      <option>Servicios de Limpieza</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Número de Factura</label>
                    <Input placeholder="BILL-001" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Fecha de Factura</label>
                    <Input type="date" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Vencimiento</label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input placeholder="Suministros de oficina - Noviembre 2025" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Suministros</option>
                      <option>Servicios</option>
                      <option>Arrendamiento</option>
                      <option>Gastos Generales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Términos</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Net 30</option>
                      <option>Net 15</option>
                      <option>Due on Receipt</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Subtotal</label>
                    <Input type="number" placeholder="10000.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">IVA (16%)</label>
                    <Input type="number" placeholder="1600.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    <Input type="number" placeholder="11600.00" className="font-bold" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Referencia (Opcional)</label>
                  <Input placeholder="PO-12345" />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowNewPayableModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    alert('✅ Factura registrada exitosamente\n\nEn producción, esto enviaría:\nPOST /api/vendors/payables')
                    setShowNewPayableModal(false)
                  }}>
                    Registrar Factura
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

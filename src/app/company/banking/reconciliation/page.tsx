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
  CheckCircle,
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface ReconciliationItem {
  id: string
  transactionId: string
  date: string
  description: string
  amount: number
  systemBalance?: number
  statementBalance?: number
  type: 'deposit' | 'withdrawal' | 'fee' | 'interest'
  status: 'matched' | 'missing-system' | 'missing-statement' | 'discrepancy'
  notes?: string
}

interface ReconciliationPeriod {
  accountId: string
  accountName: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  statementBalance: number
  difference: number
  totalDeposits: number
  totalWithdrawals: number
  reconciledItems: number
  pendingItems: number
  status: 'in-progress' | 'completed' | 'needs-review'
}

export default function BankReconciliationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedAccount, setSelectedAccount] = useState<string>('ACC-001')
  const [showNewModal, setShowNewModal] = useState(false)
  const [reconciledItems, setReconciledItems] = useState<Set<string>>(new Set())
  const [autoReconciling, setAutoReconciling] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const reconciliationPeriod: ReconciliationPeriod = {
    accountId: 'ACC-001',
    accountName: 'Cuenta Principal Operativa - BBVA',
    periodStart: '2025-11-01',
    periodEnd: '2025-11-30',
    openingBalance: 980450,
    closingBalance: 1250000,
    statementBalance: 1248500,
    difference: 1500,
    totalDeposits: 453187.50,
    totalWithdrawals: 183637.50,
    reconciledItems: 12,
    pendingItems: 3,
    status: 'needs-review'
  }

  const reconciliationItems: ReconciliationItem[] = [
    {
      id: 'REC-001',
      transactionId: 'DEP-2025-001',
      date: '2025-11-25',
      description: 'Pago factura INV-2025-042 - Acme Corp',
      amount: 145000,
      systemBalance: 145000,
      statementBalance: 145000,
      type: 'deposit',
      status: 'matched'
    },
    {
      id: 'REC-002',
      transactionId: 'WTH-2025-012',
      date: '2025-11-24',
      description: 'Pago Distribuidora Tech Solutions - BILL-2025-001',
      amount: -25000,
      systemBalance: -25000,
      statementBalance: -25000,
      type: 'withdrawal',
      status: 'matched'
    },
    {
      id: 'REC-003',
      transactionId: 'DEP-2025-002',
      date: '2025-11-22',
      description: 'Pago factura INV-2025-038 - GlobalTech Inc',
      amount: 85000,
      systemBalance: 85000,
      statementBalance: 85000,
      type: 'deposit',
      status: 'matched'
    },
    {
      id: 'REC-004',
      transactionId: 'FEE-2025-004',
      date: '2025-11-20',
      description: 'Comisión por manejo de cuenta - Noviembre 2025',
      amount: -450,
      systemBalance: -450,
      statementBalance: -450,
      type: 'fee',
      status: 'matched'
    },
    {
      id: 'REC-005',
      transactionId: 'WTH-2025-014',
      date: '2025-11-17',
      description: 'Pago renta oficina - Noviembre 2025',
      amount: -60000,
      systemBalance: -60000,
      statementBalance: -60000,
      type: 'withdrawal',
      status: 'matched'
    },
    {
      id: 'REC-006',
      transactionId: 'DEP-2025-004',
      date: '2025-11-15',
      description: 'Pago factura INV-2025-035 - Innovatech',
      amount: 120000,
      systemBalance: 120000,
      statementBalance: 120000,
      type: 'deposit',
      status: 'matched'
    },
    {
      id: 'REC-007',
      transactionId: 'TRF-2025-009',
      date: '2025-11-14',
      description: 'Transferencia a cuenta fiscal para impuestos',
      amount: -150000,
      systemBalance: -150000,
      statementBalance: -150000,
      type: 'withdrawal',
      status: 'matched'
    },
    {
      id: 'REC-008',
      transactionId: 'WTH-2025-016',
      date: '2025-11-13',
      description: 'Pago servicios de limpieza - Octubre 2025',
      amount: -5500,
      systemBalance: -5500,
      statementBalance: -5500,
      type: 'withdrawal',
      status: 'matched'
    },
    {
      id: 'REC-009',
      transactionId: 'DEP-2025-005',
      date: '2025-11-12',
      description: 'Pago factura INV-2025-033 - MegaCorp',
      amount: 95000,
      systemBalance: 95000,
      statementBalance: 95000,
      type: 'deposit',
      status: 'matched'
    },
    {
      id: 'REC-010',
      transactionId: 'DEP-2025-006',
      date: '2025-11-10',
      description: 'Depósito no registrado en sistema',
      amount: 8500,
      statementBalance: 8500,
      type: 'deposit',
      status: 'missing-system',
      notes: 'Revisar con departamento de cobranza'
    },
    {
      id: 'REC-011',
      transactionId: 'FEE-2025-005',
      date: '2025-11-08',
      description: 'Comisión por transferencia internacional',
      amount: -850,
      statementBalance: -850,
      type: 'fee',
      status: 'missing-system',
      notes: 'Registrar comisión en sistema'
    },
    {
      id: 'REC-012',
      transactionId: 'WTH-2025-018',
      date: '2025-11-05',
      description: 'Pago proveedor servicios - Registrado sin reflejar en banco',
      amount: -12000,
      systemBalance: -12000,
      type: 'withdrawal',
      status: 'missing-statement',
      notes: 'Verificar si transacción fue procesada'
    },
    {
      id: 'REC-013',
      transactionId: 'DEP-2025-007',
      date: '2025-11-03',
      description: 'Depósito cliente - Discrepancia en monto',
      amount: 45000,
      systemBalance: 45000,
      statementBalance: 43500,
      type: 'deposit',
      status: 'discrepancy',
      notes: 'Sistema: $45,000 | Estado: $43,500 | Diferencia: $1,500'
    },
    {
      id: 'REC-014',
      transactionId: 'INT-2025-001',
      date: '2025-11-01',
      description: 'Intereses generados - Octubre 2025',
      amount: 2687.50,
      systemBalance: 2687.50,
      statementBalance: 2687.50,
      type: 'interest',
      status: 'matched'
    },
    {
      id: 'REC-015',
      transactionId: 'DEP-2025-008',
      date: '2025-11-01',
      description: 'Depósito inicial del mes',
      amount: 75000,
      systemBalance: 75000,
      statementBalance: 75000,
      type: 'deposit',
      status: 'matched'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conciliada
        </Badge>
      case 'missing-system':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Falta en Sistema
        </Badge>
      case 'missing-statement':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Falta en Estado
        </Badge>
      case 'discrepancy':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Discrepancia
        </Badge>
      default:
        return null
    }
  }

  const getReconciliationStatusBadge = (status: string) => {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> En Proceso
        </Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Completada
        </Badge>
      case 'needs-review':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Requiere Revisión
        </Badge>
      default:
        return null
    }
  }

  const filteredItems = reconciliationItems.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.transactionId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const matchedItems = reconciliationItems.filter(i => i.status === 'matched').length
  const discrepancyItems = reconciliationItems.filter(i => i.status === 'discrepancy' || i.status === 'missing-system' || i.status === 'missing-statement').length
  const reconciliationProgress = (matchedItems / reconciliationItems.length) * 100

  // Función para conciliación automática
  const autoReconcile = () => {
    setAutoReconciling(true)
    setTimeout(() => {
      const matchedIds = reconciliationItems
        .filter(item => item.status === 'matched')
        .map(item => item.id)
      setReconciledItems(new Set(matchedIds))
      setAutoReconciling(false)
      alert(`✅ Conciliación Automática Completada\n\n📊 Resultados:\n• Items conciliados: ${matchedIds.length}\n• Items con discrepancia: ${discrepancyItems}\n• Progreso: ${reconciliationProgress.toFixed(1)}%\n\n${discrepancyItems > 0 ? '⚠️ Revisa los items con discrepancia manualmente' : '🎉 Todas las transacciones están conciliadas'}`)
    }, 1500)
  }

  // Función para marcar/desmarcar item como conciliado
  const toggleReconciled = (itemId: string) => {
    const newSet = new Set(reconciledItems)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setReconciledItems(newSet)
  }

  // Función para finalizar conciliación
  const finishReconciliation = () => {
    const totalReconciled = reconciledItems.size
    const totalItems = reconciliationItems.length
    const reconciledPercentage = (totalReconciled / totalItems) * 100
    
    if (reconciledPercentage < 100) {
      const confirmed = confirm(`⚠️ Conciliación Incompleta\n\nHas conciliado ${totalReconciled} de ${totalItems} items (${reconciledPercentage.toFixed(1)}%)\n\n¿Deseas finalizar la conciliación de todos modos?\n\nItems pendientes podrán revisarse posteriormente.`)
      if (!confirmed) return
    }

    alert(`✅ Conciliación Bancaria Finalizada\n\n📊 Resumen:\n• Cuenta: ${reconciliationPeriod.accountName}\n• Periodo: ${reconciliationPeriod.periodStart} al ${reconciliationPeriod.periodEnd}\n• Items conciliados: ${totalReconciled}/${totalItems}\n• Saldo Sistema: $${reconciliationPeriod.closingBalance.toLocaleString()}\n• Saldo Estado: $${reconciliationPeriod.statementBalance.toLocaleString()}\n• Diferencia: $${reconciliationPeriod.difference.toLocaleString()}\n\nLa conciliación se ha guardado exitosamente.`)
  }

  const exportReport = () => {
    const headers = ['Fecha', 'ID Transacción', 'Descripción', 'Monto', 'Sistema', 'Estado Cuenta', 'Estado']
    const rows = reconciliationItems.map(item => [
      item.date,
      item.transactionId,
      item.description,
      item.amount,
      item.systemBalance || '-',
      item.statementBalance || '-',
      item.status
    ])
    const summary = [
      ['REPORTE DE CONCILIACIÓN BANCARIA'],
      ['Cuenta', reconciliationPeriod.accountName],
      ['Período', `${reconciliationPeriod.periodStart} - ${reconciliationPeriod.periodEnd}`],
      ['Saldo Sistema', reconciliationPeriod.closingBalance],
      ['Saldo Estado', reconciliationPeriod.statementBalance],
      ['Diferencia', reconciliationPeriod.difference],
      ['Progreso', `${reconciliationProgress.toFixed(1)}%`],
      ['']
    ]
    const csvContent = [...summary, headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation_report_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
            <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Reconcilia tus cuentas con los estados de cuenta bancarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={autoReconcile}
              disabled={autoReconciling}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoReconciling ? 'animate-spin' : ''}`} />
              Conciliar Auto
            </Button>
            <Button 
              variant="outline" 
              onClick={finishReconciliation}
              disabled={reconciledItems.size === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finalizar ({reconciledItems.size}/{reconciliationItems.length})
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => {
              alert('📄 Cargar Estado de Cuenta\n\nFormatos soportados:\n• CSV\n• Excel (.xlsx)\n• PDF (con OCR)\n• QFX/OFX\n\nEn producción, esto abriría un selector de archivos.')
            }}>
              <FileText className="w-4 h-4 mr-2" />
              Cargar Estado
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Conciliación
            </Button>
          </div>
        </div>

        {/* Reconciliation Period Summary */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{reconciliationPeriod.accountName}</h3>
                <p className="text-blue-100">
                  Período: {new Date(reconciliationPeriod.periodStart).toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'long',
                    year: 'numeric'
                  })} - {new Date(reconciliationPeriod.periodEnd).toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {getReconciliationStatusBadge(reconciliationPeriod.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Inicial</div>
                <div className="text-xl font-bold">
                  ${reconciliationPeriod.openingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Sistema</div>
                <div className="text-xl font-bold">
                  ${reconciliationPeriod.closingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Saldo Estado</div>
                <div className="text-xl font-bold">
                  ${reconciliationPeriod.statementBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className={`backdrop-blur-sm rounded-lg p-4 ${
                Math.abs(reconciliationPeriod.difference) < 100 ? 'bg-green-500/30' : 'bg-red-500/30'
              }`}>
                <div className="text-sm text-blue-100 mb-1">Diferencia</div>
                <div className="text-xl font-bold">
                  ${Math.abs(reconciliationPeriod.difference).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-1">Progreso</div>
                <div className="text-xl font-bold">
                  {reconciliationProgress.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{matchedItems}</div>
              <div className="text-sm text-green-700">Transacciones Conciliadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{discrepancyItems}</div>
              <div className="text-sm text-orange-700">Discrepancias</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${reconciliationPeriod.totalDeposits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-blue-700">Total Depósitos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${reconciliationPeriod.totalWithdrawals.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-700">Total Retiros</div>
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
                  placeholder="Buscar transacciones..."
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
                <option value="matched">Conciliadas</option>
                <option value="missing-system">Faltan en Sistema</option>
                <option value="missing-statement">Faltan en Estado</option>
                <option value="discrepancy">Discrepancias</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Conciliación ({filteredItems.length} transacciones)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID Transacción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sistema</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Estado Cuenta</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${
                      item.status === 'discrepancy' ? 'bg-red-50' :
                      item.status === 'missing-system' ? 'bg-orange-50' :
                      item.status === 'missing-statement' ? 'bg-blue-50' : ''
                    }`}>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(item.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {item.transactionId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {item.description}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-orange-600 mt-1">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.amount >= 0 ? '+' : ''}${Math.abs(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.systemBalance !== undefined ? (
                          `$${Math.abs(item.systemBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-orange-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.statementBalance !== undefined ? (
                          `$${Math.abs(item.statementBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-blue-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {item.status !== 'matched' && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
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
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Conciliación Bancaria</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Proceso sistemático para verificar que los registros contables coincidan con los estados de cuenta bancarios.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Matching Automático:</strong> El sistema compara transacciones por fecha, monto y descripción</li>
                  <li>• <strong>Conciliadas:</strong> Transacciones que coinciden perfectamente entre sistema y estado</li>
                  <li>• <strong>Faltan en Sistema:</strong> Movimientos en estado de cuenta no registrados (comisiones, intereses)</li>
                  <li>• <strong>Faltan en Estado:</strong> Transacciones registradas pero no reflejadas en banco (cheques pendientes)</li>
                  <li>• <strong>Discrepancias:</strong> Diferencias en montos que requieren investigación</li>
                  <li>• <strong>Resolución:</strong> Ajusta entradas, registra faltantes, investiga diferencias hasta cuadrar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Reconciliation Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Nueva Conciliación Bancaria</CardTitle>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>Cerrar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option value="ACC-001">Cuenta Principal Operativa - BBVA</option>
                      <option value="ACC-002">Cuenta de Ahorros Empresarial - Santander</option>
                      <option value="ACC-003">Cuenta Nómina - Banorte</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha Inicio del Período</label>
                      <Input type="date" defaultValue="2025-11-01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha Fin del Período</label>
                      <Input type="date" defaultValue="2025-11-30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Final según Estado de Cuenta</label>
                    <Input type="number" placeholder="1,248,500.00" />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">📋 Información</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      El proceso de conciliación comparará automáticamente:
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• Transacciones registradas en el sistema</li>
                      <li>• Movimientos del estado de cuenta bancario</li>
                      <li>• Identificará discrepancias y diferencias</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" onClick={() => { alert('✅ Conciliación iniciada\n\n📊 Analizando transacciones...\n🔍 Buscando coincidencias automáticas...'); setShowNewModal(false); }}>Iniciar Conciliación</Button>
                    <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

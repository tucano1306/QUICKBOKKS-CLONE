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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  FileCheck,
  Download,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react'

interface BankAccount {
  id: string
  name: string
  accountNumber: string
  bankBalance: number
  bookBalance: number
  lastReconciled: string
  status: 'reconciled' | 'pending' | 'unreconciled'
}

interface ReconciliationItem {
  id: string
  date: string
  description: string
  type: 'debit' | 'credit'
  amount: number
  status: 'matched' | 'unmatched' | 'pending'
  bankStatement: boolean
  bookRecord: boolean
  reference?: string
}

export default function ReconciliationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string>('1')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [selectedAccount])

  const bankAccounts: BankAccount[] = [
    {
      id: '1',
      name: 'BBVA Empresarial',
      accountNumber: '**** 4567',
      bankBalance: 44450,
      bookBalance: 45200,
      lastReconciled: '2025-10-31',
      status: 'pending'
    },
    {
      id: '2',
      name: 'Santander Negocios',
      accountNumber: '**** 8901',
      bankBalance: 28500,
      bookBalance: 28500,
      lastReconciled: '2025-11-20',
      status: 'reconciled'
    },
    {
      id: '3',
      name: 'Banorte Empresas',
      accountNumber: '**** 2345',
      bankBalance: 15200,
      bookBalance: 14800,
      lastReconciled: '2025-09-30',
      status: 'unreconciled'
    }
  ]

  const reconciliationItems: ReconciliationItem[] = [
    {
      id: 'REC-001',
      date: '2025-11-24',
      description: 'Depósito - Pago Cliente ABC Corp',
      type: 'credit',
      amount: 15000,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'DEP-12345'
    },
    {
      id: 'REC-002',
      date: '2025-11-23',
      description: 'Transferencia - Pago Renta Oficina',
      type: 'debit',
      amount: 8000,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'TRF-8901'
    },
    {
      id: 'REC-003',
      date: '2025-11-22',
      description: 'Cargo - Comisión Bancaria',
      type: 'debit',
      amount: 150,
      status: 'unmatched',
      bankStatement: true,
      bookRecord: false,
      reference: 'COM-NOV'
    },
    {
      id: 'REC-004',
      date: '2025-11-21',
      description: 'Depósito - Venta Productos',
      type: 'credit',
      amount: 45000,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'DEP-12346'
    },
    {
      id: 'REC-005',
      date: '2025-11-20',
      description: 'Cheque #12345 - Proveedor XYZ',
      type: 'debit',
      amount: 12500,
      status: 'pending',
      bankStatement: false,
      bookRecord: true,
      reference: 'CHQ-12345'
    },
    {
      id: 'REC-006',
      date: '2025-11-19',
      description: 'Transferencia - Nómina Quincenal',
      type: 'debit',
      amount: 14000,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'NOM-NOV-02'
    },
    {
      id: 'REC-007',
      date: '2025-11-18',
      description: 'Depósito - Anticipo Cliente',
      type: 'credit',
      amount: 8000,
      status: 'unmatched',
      bankStatement: true,
      bookRecord: false
    },
    {
      id: 'REC-008',
      date: '2025-11-17',
      description: 'Cargo Automático - Servicios Cloud',
      type: 'debit',
      amount: 1200,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'AWS-NOV'
    },
    {
      id: 'REC-009',
      date: '2025-11-16',
      description: 'Ajuste por Redondeo',
      type: 'credit',
      amount: 0.50,
      status: 'unmatched',
      bankStatement: true,
      bookRecord: false
    },
    {
      id: 'REC-010',
      date: '2025-11-15',
      description: 'Pago Factura #9876',
      type: 'debit',
      amount: 3500,
      status: 'matched',
      bankStatement: true,
      bookRecord: true,
      reference: 'FAC-9876'
    }
  ]

  const currentAccount = bankAccounts.find(acc => acc.id === selectedAccount)!
  const difference = currentAccount.bookBalance - currentAccount.bankBalance

  const matchedCount = reconciliationItems.filter(i => i.status === 'matched').length
  const unmatchedCount = reconciliationItems.filter(i => i.status === 'unmatched').length
  const pendingCount = reconciliationItems.filter(i => i.status === 'pending').length

  const filteredItems = reconciliationItems.filter(item => {
    if (showOnlyUnmatched && item.status === 'matched') return false
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const exportReport = () => {
    const currentAccount = bankAccounts.find(acc => acc.id === selectedAccount)!
    const headers = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Estado Banco', 'Estado Libros', 'Estado']
    const rows = reconciliationItems.map(item => [
      item.date,
      item.description,
      item.type,
      item.amount,
      item.bankStatement ? 'Sí' : 'No',
      item.bookRecord ? 'Sí' : 'No',
      item.status
    ])
    const summary = [
      [''],
      ['RESUMEN DE CONCILIACIÓN'],
      ['Cuenta', currentAccount.name],
      ['Saldo Bancario', currentAccount.bankBalance],
      ['Saldo en Libros', currentAccount.bookBalance],
      ['Diferencia', Math.abs(currentAccount.bookBalance - currentAccount.bankBalance)]
    ]
    const csvContent = [...summary, [''], headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation_${currentAccount.name}_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Conciliado
        </Badge>
      case 'unmatched':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Sin Conciliar
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendiente
        </Badge>
      default:
        return null
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
            <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
            <p className="text-gray-600 mt-1">
              Reconcilia tus cuentas bancarias con tus registros contables
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Conciliación
            </Button>
          </div>
        </div>

        {/* Account Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card 
              key={account.id}
              className={`cursor-pointer transition ${
                selectedAccount === account.id 
                  ? 'ring-2 ring-blue-600 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedAccount(account.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  {account.status === 'reconciled' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {account.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  {account.status === 'unreconciled' && <XCircle className="w-5 h-5 text-red-600" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{account.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{account.accountNumber}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo Banco:</span>
                    <span className="font-semibold">${account.bankBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo Libros:</span>
                    <span className="font-semibold">${account.bookBalance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  Última conciliación: {new Date(account.lastReconciled).toLocaleDateString('es-MX')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reconciliation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${currentAccount.bankBalance.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Saldo Bancario</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${currentAccount.bookBalance.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Saldo en Libros</div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${Math.abs(difference) === 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                {Math.abs(difference) === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${Math.abs(difference) === 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${Math.abs(difference).toLocaleString()}
              </div>
              <div className={`text-sm ${Math.abs(difference) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                Diferencia
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-900 mb-1">
                  {matchedCount}/{reconciliationItems.length}
                </div>
                <div className="text-sm text-orange-700">Transacciones Conciliadas</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{matchedCount}</div>
                    <div className="text-sm text-gray-600">Conciliadas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{unmatchedCount}</div>
                    <div className="text-sm text-gray-600">Sin Conciliar</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                    <div className="text-sm text-gray-600">Pendientes</div>
                  </div>
                </div>
              </div>
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
                  placeholder="Buscar transacción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUnmatched}
                  onChange={(e) => setShowOnlyUnmatched(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Solo sin conciliar</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Items */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones para Conciliar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado Banco</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado Libros</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(item.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.reference && (
                          <div className="text-xs text-gray-500">Ref: {item.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.type === 'credit' ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-xs font-medium">Crédito</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <ArrowDownRight className="w-4 h-4" />
                            <span className="text-xs font-medium">Débito</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          item.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${item.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.bankStatement ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.bookRecord ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status !== 'matched' && (
                          <Button size="sm" variant="outline">
                            Conciliar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Proceso de Conciliación Bancaria</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Paso 1:</strong> Importa o ingresa tu estado de cuenta bancario</li>
                  <li>• <strong>Paso 2:</strong> Verifica que las transacciones coincidan con tus registros</li>
                  <li>• <strong>Paso 3:</strong> Marca las transacciones que coinciden</li>
                  <li>• <strong>Paso 4:</strong> Investiga y ajusta las diferencias encontradas</li>
                  <li>• <strong>Paso 5:</strong> Confirma la conciliación cuando los saldos coincidan</li>
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
                  <CardTitle>Nueva Conciliación</CardTitle>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>Cerrar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} - {acc.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                    <Input type="date" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha Fin</label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Final del Estado de Cuenta</label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" onClick={() => { alert('✅ Conciliación iniciada'); setShowNewModal(false); }}>Iniciar Conciliación</Button>
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

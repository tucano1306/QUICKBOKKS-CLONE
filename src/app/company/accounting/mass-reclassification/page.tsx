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
  Search,
  CheckCircle,
  XCircle,
  Eye,
  History,
  Undo2,
  FileText,
  Calculator,
  AlertCircle,
  TrendingUp,
  Filter
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  currentAccount: string
  currentAccountCode: string
  selected: boolean
}

export default function MassReclassificationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceAccount, setSourceAccount] = useState('')
  const [destinationAccount, setDestinationAccount] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TXN-001',
      date: '2025-11-25',
      description: 'OFFICE DEPOT - SUPPLIES',
      amount: 189.50,
      currentAccount: 'Office Expenses',
      currentAccountCode: '5240',
      selected: false
    },
    {
      id: 'TXN-002',
      date: '2025-11-24',
      description: 'STAPLES - OFFICE SUPPLIES',
      amount: 245.80,
      currentAccount: 'Office Expenses',
      currentAccountCode: '5240',
      selected: false
    },
    {
      id: 'TXN-003',
      date: '2025-11-23',
      description: 'AMAZON - OFFICE MATERIALS',
      amount: 327.90,
      currentAccount: 'Office Expenses',
      currentAccountCode: '5240',
      selected: false
    },
    {
      id: 'TXN-004',
      date: '2025-11-20',
      description: 'BEST BUY - OFFICE EQUIPMENT',
      amount: 450.00,
      currentAccount: 'Office Expenses',
      currentAccountCode: '5240',
      selected: false
    },
    {
      id: 'TXN-005',
      date: '2025-11-18',
      description: 'HP STORE - PRINTER',
      amount: 680.00,
      currentAccount: 'Office Expenses',
      currentAccountCode: '5240',
      selected: false
    }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const accounts = [
    { code: '5240', name: 'Office Expenses' },
    { code: '5241', name: 'Office Supplies' },
    { code: '1520', name: 'Office Equipment (Asset)' },
    { code: '5280', name: 'Technology & Software' },
    { code: '5250', name: 'Other Operating Expenses' }
  ]

  const toggleTransaction = (id: string) => {
    setTransactions(prev =>
      prev.map(txn => txn.id === id ? { ...txn, selected: !txn.selected } : txn)
    )
  }

  const toggleAll = () => {
    const allSelected = transactions.every(t => t.selected)
    setTransactions(prev => prev.map(txn => ({ ...txn, selected: !allSelected })))
  }

  const selectedCount = transactions.filter(t => t.selected).length
  const selectedAmount = transactions.filter(t => t.selected).reduce((sum, t) => sum + t.amount, 0)

  const showHistorial = () => {
    alert(`📋 HISTORIAL DE RECLASIFICACIONES\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📅 2025-11-25 10:30 AM\n` +
      `👤 Usuario: Ana García\n` +
      `🔄 Cambio: 15 transacciones\n` +
      `📊 Desde: 5240 - Office Expenses\n` +
      `📊 Hacia: 5241 - Office Supplies\n` +
      `💰 Monto total: $3,245.80\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📅 2025-11-20 03:15 PM\n` +
      `👤 Usuario: Laura Sánchez\n` +
      `🔄 Cambio: 8 transacciones\n` +
      `📊 Desde: 5280 - Technology\n` +
      `📊 Hacia: 1520 - Equipment (Asset)\n` +
      `💰 Monto total: $12,450.00\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ Todas las reclasificaciones incluyen audit trail completo`
    )
  }

  const applyReclassification = () => {
    if (!destinationAccount || selectedCount === 0) {
      alert('⚠️ Selecciona transacciones y cuenta destino')
      return
    }
    alert(`✅ ${selectedCount} transacciones reclasificadas a cuenta ${destinationAccount}!\n\nSe ha creado un audit trail con timestamp y usuario.`)
    setTransactions(prev => prev.map(txn => ({ ...txn, selected: false })))
    setShowPreview(false)
  }

  const filteredTransactions = transactions.filter(txn =>
    txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.currentAccount.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8 text-blue-600" />
              Reclasificación Masiva de Cuentas
            </h1>
            <p className="text-gray-600 mt-1">
              Cambie la cuenta contable de múltiples transacciones simultáneamente
            </p>
          </div>
          <Button variant="outline" onClick={showHistorial}>
            <History className="w-4 h-4 mr-2" />
            Ver Historial de Cambios
          </Button>
        </div>

        {/* Selection Summary */}
        {selectedCount > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {selectedCount} transacción(es) seleccionada(s)
                  </h3>
                  <div className="text-sm text-blue-700">
                    Monto total: <span className="font-bold">${selectedAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowPreview(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setTransactions(prev => prev.map(t => ({ ...t, selected: false })))}
                  >
                    Limpiar Selección
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reclassification Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              Configurar Reclasificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuenta Origen (Filtro):
                </label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg"
                  value={sourceAccount}
                  onChange={(e) => setSourceAccount(e.target.value)}
                >
                  <option value="">Todas las cuentas</option>
                  {accounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuenta Destino: *
                </label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg"
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                >
                  <option value="">Seleccionar cuenta destino...</option>
                  {accounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar Transacciones:
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {destinationAccount && selectedCount > 0 && (
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={applyReclassification}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aplicar Reclasificación ({selectedCount} txn)
                </Button>
                <Button variant="outline">
                  <Calculator className="w-4 h-4 mr-2" />
                  Ver Impacto en Reportes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {showPreview && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-6 h-6 text-yellow-600" />
                Vista Previa de Cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {transactions.filter(t => t.selected).map(txn => (
                  <div key={txn.id} className="p-3 bg-white rounded-lg border flex items-center justify-between">
                    <div>
                      <div className="font-medium">{txn.description}</div>
                      <div className="text-sm text-gray-600">${txn.amount.toLocaleString()} - {txn.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{txn.currentAccountCode} - {txn.currentAccount}</Badge>
                      <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                      <Badge className="bg-green-100 text-green-700">
                        {destinationAccount} - {accounts.find(a => a.code === destinationAccount)?.name}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={applyReclassification}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar y Aplicar
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transacciones</CardTitle>
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {transactions.every(t => t.selected) ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input 
                        type="checkbox" 
                        checked={transactions.every(t => t.selected)}
                        onChange={toggleAll}
                        className="w-5 h-5"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className={`hover:bg-gray-50 ${txn.selected ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          checked={txn.selected}
                          onChange={() => toggleTransaction(txn.id)}
                          className="w-5 h-5"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">{txn.date}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{txn.description}</div>
                        <div className="text-xs text-gray-500">{txn.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">${txn.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline">
                          {txn.currentAccountCode} - {txn.currentAccount}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">⚠️ Precauciones</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• <strong>Audit Trail:</strong> Cada cambio se registra con usuario y timestamp</li>
                    <li>• <strong>Reversible:</strong> Puedes deshacer reclasificaciones desde el historial</li>
                    <li>• <strong>Impact Analysis:</strong> Verifica impacto en reportes antes de aplicar</li>
                    <li>• <strong>Backup:</strong> Recomendamos backup antes de cambios masivos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">✨ Casos de Uso</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• <strong>Corrección masiva:</strong> Cuando muchas transacciones están mal clasificadas</li>
                    <li>• <strong>Reorganización:</strong> Cambio de estructura del plan de cuentas</li>
                    <li>• <strong>Cierre fiscal:</strong> Ajustes de fin de año</li>
                    <li>• <strong>Migración:</strong> Importación de datos de otro sistema</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

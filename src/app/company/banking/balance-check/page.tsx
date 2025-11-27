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
  Scale,
  Building2,
  Search,
  Download,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  Edit,
  X,
  Loader2,
  Plus,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  bankName?: string
  accountNumber?: string
  balance: number
  currency: string
}

interface BalanceCheck {
  accountId: string
  accountName: string
  bankName: string
  systemBalance: number
  lastStatementBalance?: number
  statementDate?: string
  difference: number
  status: 'balanced' | 'discrepancy' | 'pending'
  unreconciledTransactions: number
  pendingDeposits: number
  pendingWithdrawals: number
}

interface Discrepancy {
  id: string
  accountId: string
  date: string
  description: string
  systemAmount: number
  statementAmount?: number
  difference: number
  type: 'missing-in-bank' | 'missing-in-system' | 'amount-difference'
  status: 'open' | 'resolved' | 'investigating'
}

export default function BalanceCheckPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  
  // Real data from API
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [balanceChecks, setBalanceChecks] = useState<BalanceCheck[]>([])
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [detailedCheck, setDetailedCheck] = useState<any>(null)
  
  // Adjustment form
  const [adjustmentForm, setAdjustmentForm] = useState({
    accountId: '',
    targetBalance: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, router])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadAccounts(), loadBalanceCheck()])
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/banking/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        if (data.accounts?.length > 0) {
          setSelectedAccount(data.accounts[0].id)
          setAdjustmentForm(prev => ({ ...prev, accountId: data.accounts[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadBalanceCheck = async (accountId?: string) => {
    try {
      let url = '/api/banking/balance-check'
      if (accountId) url += `?accountId=${accountId}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        
        if (data.accounts) {
          // Summary view
          const checks: BalanceCheck[] = data.accounts.map((acc: any) => ({
            accountId: acc.id,
            accountName: acc.accountName,
            bankName: acc.bankName || '',
            systemBalance: parseFloat(acc.balance) || 0,
            lastStatementBalance: parseFloat(acc.lastReconciliation?.statementBalance) || 0,
            statementDate: acc.lastReconciliation?.endDate,
            difference: acc.unreconciledAmount || 0,
            status: acc.unreconciledCount === 0 ? 'balanced' : 
                   Math.abs(acc.unreconciledAmount || 0) > 0 ? 'discrepancy' : 'pending',
            unreconciledTransactions: acc.unreconciledCount || 0,
            pendingDeposits: 0,
            pendingWithdrawals: 0
          }))
          setBalanceChecks(checks)
        }
        
        if (data.detailedCheck) {
          setDetailedCheck(data.detailedCheck)
          // Extract discrepancies
          if (data.detailedCheck.discrepancies) {
            const disc: Discrepancy[] = data.detailedCheck.discrepancies.map((d: any, i: number) => ({
              id: `DISC-${i + 1}`,
              accountId: accountId || '',
              date: d.date,
              description: d.description,
              systemAmount: d.systemAmount,
              statementAmount: d.expectedAmount,
              difference: d.discrepancy,
              type: 'amount-difference',
              status: 'open'
            }))
            setDiscrepancies(disc)
          }
        }
      }
    } catch (error) {
      console.error('Error loading balance check:', error)
    }
  }

  const runBalanceCheck = async (accountId: string) => {
    setProcessing(true)
    try {
      await loadBalanceCheck(accountId)
      alert('✅ Verificación de saldo completada')
    } catch (error) {
      console.error('Error running balance check:', error)
      alert('Error al verificar saldos')
    } finally {
      setProcessing(false)
    }
  }

  const createAdjustment = async () => {
    if (!adjustmentForm.accountId || !adjustmentForm.targetBalance) {
      alert('Seleccione cuenta y especifique el saldo objetivo')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/banking/balance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: adjustmentForm.accountId,
          targetBalance: adjustmentForm.targetBalance,
          description: adjustmentForm.description || 'Ajuste de saldo',
          date: adjustmentForm.date
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Ajuste registrado exitosamente\n\nMonto del ajuste: ${formatCurrency(data.adjustment.amount)}\nNuevo saldo: ${formatCurrency(data.newBalance)}`)
        setShowAdjustmentModal(false)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear ajuste')
      }
    } catch (error) {
      console.error('Error creating adjustment:', error)
      alert('Error al crear ajuste')
    } finally {
      setProcessing(false)
    }
  }

  const generateReport = async () => {
    try {
      const response = await fetch('/api/banking/reports/reconciliation?type=all-accounts')
      if (response.ok) {
        const data = await response.json()
        
        // Generate CSV
        const headers = ['Cuenta', 'Banco', 'Saldo Sistema', 'Último Estado', 'Diferencia', 'Estado', 'Trans. Pendientes']
        const rows = balanceChecks.map(check => [
          check.accountName,
          check.bankName,
          check.systemBalance.toFixed(2),
          (check.lastStatementBalance || 0).toFixed(2),
          check.difference.toFixed(2),
          check.status,
          check.unreconciledTransactions
        ])
        
        const csvContent = [
          ['REPORTE DE CUADRE DE SALDOS'],
          [`Generado: ${new Date().toLocaleString('es-MX')}`],
          [''],
          headers.join(','),
          ...rows.map(r => r.join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cuadre-saldos-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        
        alert('📥 Reporte de cuadre de saldos exportado')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar reporte')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Stats
  const totalAccounts = balanceChecks.length || accounts.length
  const balancedAccounts = balanceChecks.filter(c => c.status === 'balanced').length
  const discrepancyAccounts = balanceChecks.filter(c => c.status === 'discrepancy').length
  const totalDifference = balanceChecks.reduce((sum, c) => sum + Math.abs(c.difference), 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Cuadrar Saldos</h1>
            <p className="text-gray-600 mt-1">
              Compara saldos contables vs bancarios y detecta discrepancias
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => loadData()}
              disabled={processing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" onClick={generateReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button onClick={() => setShowAdjustmentModal(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Crear Ajuste
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-600">{totalAccounts}</Badge>
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalAccounts}</div>
              <div className="text-sm text-blue-700">Cuentas Totales</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-600">{balancedAccounts}</Badge>
              </div>
              <div className="text-3xl font-bold text-green-900">{balancedAccounts}</div>
              <div className="text-sm text-green-700">Cuentas Cuadradas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <Badge className="bg-orange-600">{discrepancyAccounts}</Badge>
              </div>
              <div className="text-3xl font-bold text-orange-900">{discrepancyAccounts}</div>
              <div className="text-sm text-orange-700">Con Discrepancias</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">{formatCurrency(totalDifference)}</div>
              <div className="text-sm text-red-700">Diferencia Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Account Selector for Detailed Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Verificación Detallada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Seleccionar Cuenta</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Todas las cuentas</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} - {acc.bankName} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <Button 
                onClick={() => runBalanceCheck(selectedAccount)}
                disabled={processing}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Verificar Saldos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Balance Check Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Saldos por Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Banco</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo Sistema</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Último Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Diferencia</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Pendientes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceChecks.length === 0 && accounts.length > 0 && accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{acc.accountName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{acc.bankName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(acc.balance)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">-</td>
                      <td className="px-4 py-3 text-right text-gray-500">-</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-gray-100 text-gray-700">Pendiente</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">-</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedAccount(acc.id)
                          runBalanceCheck(acc.id)
                        }}>
                          <Scale className="w-4 h-4 mr-1" />
                          Verificar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {balanceChecks.map((check) => (
                    <tr key={check.accountId} className={`hover:bg-gray-50 ${
                      check.status === 'discrepancy' ? 'bg-red-50' : 
                      check.status === 'balanced' ? 'bg-green-50' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{check.accountName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{check.bankName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(check.systemBalance)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {check.lastStatementBalance ? (
                          <>
                            {formatCurrency(check.lastStatementBalance)}
                            {check.statementDate && (
                              <div className="text-xs text-gray-500">
                                {new Date(check.statementDate).toLocaleDateString('es-MX')}
                              </div>
                            )}
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          check.difference === 0 ? 'text-green-600' : 
                          check.difference > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {check.difference === 0 ? '✓' : formatCurrency(check.difference)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {check.status === 'balanced' && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Cuadrada
                          </Badge>
                        )}
                        {check.status === 'discrepancy' && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Discrepancia
                          </Badge>
                        )}
                        {check.status === 'pending' && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {check.unreconciledTransactions > 0 ? (
                          <Badge className="bg-orange-100 text-orange-700">
                            {check.unreconciledTransactions}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">0</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedAccount(check.accountId)
                            runBalanceCheck(check.accountId)
                          }}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          {check.status === 'discrepancy' && (
                            <Button size="sm" variant="outline" className="text-orange-600" onClick={() => {
                              setAdjustmentForm({
                                ...adjustmentForm,
                                accountId: check.accountId,
                                targetBalance: check.lastStatementBalance || check.systemBalance
                              })
                              setShowAdjustmentModal(true)
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Discrepancies Section */}
        {discrepancies.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Discrepancias Detectadas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sistema</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Estado Cuenta</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Diferencia</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {discrepancies.map((disc) => (
                      <tr key={disc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(disc.date).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{disc.description}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(disc.systemAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {disc.statementAmount !== undefined ? formatCurrency(disc.statementAmount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatCurrency(disc.difference)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-orange-100 text-orange-700">
                            {disc.type === 'missing-in-bank' ? 'Falta en Banco' :
                             disc.type === 'missing-in-system' ? 'Falta en Sistema' :
                             'Diferencia Monto'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline">
                            Investigar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Cuadrar Saldos Bancarios</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Proceso para verificar que los saldos contables coincidan con los estados de cuenta bancarios.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Comparar Saldos:</strong> Sistema vs Estado de Cuenta bancario</li>
                  <li>• <strong>Detectar Discrepancias:</strong> Identifica diferencias automáticamente</li>
                  <li>• <strong>Transacciones Pendientes:</strong> Movimientos no conciliados</li>
                  <li>• <strong>Ajustes:</strong> Crea ajustes contables para cuadrar diferencias</li>
                  <li>• <strong>Reportes:</strong> Genera reportes de cuadre de saldos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Modal */}
        {showAdjustmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Crear Ajuste de Saldo
                  </CardTitle>
                  <Button variant="outline" onClick={() => setShowAdjustmentModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuenta Bancaria</label>
                    <select
                      value={adjustmentForm.accountId}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, accountId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} - {formatCurrency(acc.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {adjustmentForm.accountId && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Saldo Actual:</span>
                        <span className="font-semibold">
                          {formatCurrency(accounts.find(a => a.id === adjustmentForm.accountId)?.balance || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center text-gray-400 my-2">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Saldo Objetivo (según estado de cuenta)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10"
                        value={adjustmentForm.targetBalance}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, targetBalance: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha del Ajuste</label>
                    <Input
                      type="date"
                      value={adjustmentForm.date}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción del Ajuste</label>
                    <Input
                      placeholder="Ej: Ajuste por comisiones bancarias no registradas"
                      value={adjustmentForm.description}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                    />
                  </div>

                  {adjustmentForm.accountId && adjustmentForm.targetBalance > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold">Ajuste a realizar:</p>
                          <p>
                            {(() => {
                              const currentBalance = accounts.find(a => a.id === adjustmentForm.accountId)?.balance || 0
                              const diff = adjustmentForm.targetBalance - currentBalance
                              return diff >= 0 
                                ? `+${formatCurrency(diff)} (incremento)` 
                                : `${formatCurrency(diff)} (decremento)`
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1" 
                      onClick={createAdjustment}
                      disabled={processing}
                    >
                      {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar Ajuste
                    </Button>
                    <Button variant="outline" onClick={() => setShowAdjustmentModal(false)}>
                      Cancelar
                    </Button>
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

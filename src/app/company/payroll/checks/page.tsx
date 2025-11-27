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
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Building2,
  FileText,
  Save,
  Eye,
  Edit,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface PayrollCheck {
  id: string
  checkNumber: string
  employeeName: string
  employeeId: string
  periodStart: string
  periodEnd: string
  checkDate: string
  grossPay: number
  deductions: number
  netPay: number
  paymentMethod: string
  status: 'pending' | 'issued' | 'cleared' | 'voided' | 'stopped'
  memo?: string
}

export default function PayrollChecksPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewCheckModal, setShowNewCheckModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [nextCheckNumber, setNextCheckNumber] = useState('10001')
  const [processing, setProcessing] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [checkAmount, setCheckAmount] = useState('')
  const [checkMemo, setCheckMemo] = useState('')
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([
    { id: 'EMP-001', name: 'Sarah Johnson' },
    { id: 'EMP-002', name: 'Michael Chen' },
    { id: 'EMP-003', name: 'Emily Rodriguez' },
    { id: 'EMP-004', name: 'David Kim' },
    { id: 'EMP-005', name: 'Jessica Martinez' },
    { id: 'EMP-006', name: 'Robert Taylor' },
    { id: 'EMP-007', name: 'Amanda White' }
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

  const checks: PayrollCheck[] = [
    {
      id: 'CHK-001',
      checkNumber: '10001',
      employeeName: 'Sarah Johnson',
      employeeId: 'EMP-001',
      periodStart: '2025-11-01',
      periodEnd: '2025-11-15',
      checkDate: '2025-11-16',
      grossPay: 3200,
      deductions: 640,
      netPay: 2560,
      paymentMethod: 'Check',
      status: 'cleared',
      memo: 'Regular payroll - Bi-weekly'
    },
    {
      id: 'CHK-002',
      checkNumber: '10002',
      employeeName: 'Michael Chen',
      employeeId: 'EMP-002',
      periodStart: '2025-11-01',
      periodEnd: '2025-11-15',
      checkDate: '2025-11-16',
      grossPay: 2800,
      deductions: 560,
      netPay: 2240,
      paymentMethod: 'Check',
      status: 'cleared'
    },
    {
      id: 'CHK-003',
      checkNumber: '10003',
      employeeName: 'Emily Rodriguez',
      employeeId: 'EMP-003',
      periodStart: '2025-11-01',
      periodEnd: '2025-11-15',
      checkDate: '2025-11-16',
      grossPay: 2400,
      deductions: 480,
      netPay: 1920,
      paymentMethod: 'Check',
      status: 'issued',
      memo: 'Pending bank clearance'
    },
    {
      id: 'CHK-004',
      checkNumber: '10004',
      employeeName: 'David Kim',
      employeeId: 'EMP-004',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      checkDate: '2025-12-01',
      grossPay: 3500,
      deductions: 700,
      netPay: 2800,
      paymentMethod: 'Check',
      status: 'pending',
      memo: 'Ready to print'
    },
    {
      id: 'CHK-005',
      checkNumber: '10005',
      employeeName: 'Jessica Martinez',
      employeeId: 'EMP-005',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      checkDate: '2025-12-01',
      grossPay: 2600,
      deductions: 520,
      netPay: 2080,
      paymentMethod: 'Direct Deposit',
      status: 'issued',
      memo: 'ACH transfer initiated'
    },
    {
      id: 'CHK-006',
      checkNumber: '10006',
      employeeName: 'Robert Taylor',
      employeeId: 'EMP-006',
      periodStart: '2025-11-16',
      periodEnd: '2025-11-30',
      checkDate: '2025-12-01',
      grossPay: 4200,
      deductions: 840,
      netPay: 3360,
      paymentMethod: 'Check',
      status: 'pending'
    },
    {
      id: 'CHK-007',
      checkNumber: '10007',
      employeeName: 'Amanda White',
      employeeId: 'EMP-007',
      periodStart: '2025-10-16',
      periodEnd: '2025-10-31',
      checkDate: '2025-11-01',
      grossPay: 2200,
      deductions: 440,
      netPay: 1760,
      paymentMethod: 'Check',
      status: 'voided',
      memo: 'Incorrect amount - voided and reissued'
    }
  ]

  const filteredChecks = checks.filter(check => {
    const matchesSearch = 
      check.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || check.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>
      case 'issued':
        return <Badge className="bg-blue-100 text-blue-700">Emitido</Badge>
      case 'cleared':
        return <Badge className="bg-green-100 text-green-700">Cobrado</Badge>
      case 'voided':
        return <Badge className="bg-red-100 text-red-700">Anulado</Badge>
      case 'stopped':
        return <Badge className="bg-orange-100 text-orange-700">Stop Payment</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const stats = {
    totalChecks: checks.length,
    pendingChecks: checks.filter(c => c.status === 'pending').length,
    issuedChecks: checks.filter(c => c.status === 'issued').length,
    totalAmount: checks.reduce((sum, c) => sum + c.netPay, 0)
  }

  const openNewCheckModal = () => {
    const maxCheckNum = Math.max(...checks.map(c => parseInt(c.checkNumber)))
    setNextCheckNumber(String(maxCheckNum + 1))
    setSelectedEmployee('')
    setCheckAmount('')
    setCheckMemo('')
    setShowNewCheckModal(true)
  }

  const closeNewCheckModal = () => {
    setShowNewCheckModal(false)
    setSelectedEmployee('')
    setCheckAmount('')
    setCheckMemo('')
  }

  const createNewCheck = async () => {
    if (!selectedEmployee || !checkAmount) {
      setMessage({ type: 'error', text: 'Por favor selecciona un empleado e ingresa el monto' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setProcessing(true)
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const employee = employees.find(e => e.id === selectedEmployee)
      console.log('Nuevo cheque creado:', {
        checkNumber: nextCheckNumber,
        employee: employee?.name,
        amount: checkAmount,
        memo: checkMemo
      })
      
      setMessage({ type: 'success', text: `Cheque #${nextCheckNumber} creado exitosamente para ${employee?.name}` })
      setTimeout(() => setMessage(null), 3000)
      closeNewCheckModal()
    } catch (error) {
      console.error('Error al crear cheque:', error)
      setMessage({ type: 'error', text: 'Error al crear el cheque' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setProcessing(false)
    }
  }

  const printBatch = () => {
    const pendingChecks = checks.filter(c => c.status === 'pending')
    if (pendingChecks.length === 0) {
      setMessage({ type: 'error', text: 'No hay cheques pendientes para imprimir' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    // Simular impresión
    console.log('Imprimiendo lote de cheques:', pendingChecks)
    window.print()
  }

  const exportChecks = () => {
    let csvContent = 'Número de Cheque,Empleado,ID Empleado,Fecha,Salario Bruto,Deducciones,Pago Neto,Método,Estado,Notas\n'
    
    filteredChecks.forEach(check => {
      csvContent += `${check.checkNumber},${check.employeeName},${check.employeeId},${check.checkDate},${check.grossPay},${check.deductions},${check.netPay},${check.paymentMethod},${check.status},"${check.memo || ''}"\n`
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cheques-nomina-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-8 h-8 text-blue-600" />
              Cheques de Nómina
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión y emisión de cheques de pago a empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportChecks}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={printBatch}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Lote
            </Button>
            <Button onClick={openNewCheckModal}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cheque
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats.totalChecks}
              </div>
              <div className="text-sm text-blue-700">Total Cheques</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {stats.pendingChecks}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {stats.issuedChecks}
              </div>
              <div className="text-sm text-green-700">Emitidos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${stats.totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Check Number Settings */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Configuración de Numeración</h3>
                <p className="text-sm text-blue-700">
                  Próximo número de cheque disponible: <strong className="font-mono text-lg">{nextCheckNumber}</strong>
                </p>
              </div>
              <Button size="sm" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Cambiar Numeración
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por número de cheque o empleado..."
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
                <option value="pending">Pendientes</option>
                <option value="issued">Emitidos</option>
                <option value="cleared">Cobrados</option>
                <option value="voided">Anulados</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Checks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Cheques ({filteredChecks.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cheque #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Período</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha Cheque</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Salario Bruto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deducciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Neto a Pagar</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Método</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChecks.map((check) => (
                    <tr key={check.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-blue-600">
                          {check.checkNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{check.employeeName}</div>
                            <div className="text-xs text-gray-500">{check.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {new Date(check.periodStart).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(check.periodEnd).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Calendar className="w-3 h-3" />
                          {new Date(check.checkDate).toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">
                          ${check.grossPay.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-red-600">
                          -${check.deductions.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-green-600">
                          ${check.netPay.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {check.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(check.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Printer className="w-3 h-3" />
                          </Button>
                          {check.status === 'pending' && (
                            <Button size="sm">
                              Emitir
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

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sobre los Cheques de Nómina</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema completo de emisión y seguimiento de cheques para pagos de nómina con numeración secuencial.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Numeración Automática:</strong> Cada cheque recibe un número único secuencial</li>
                  <li>• <strong>Estados del Cheque:</strong> Pendiente → Emitido → Cobrado / Anulado</li>
                  <li>• <strong>Métodos de Pago:</strong> Cheque físico o Depósito Directo (ACH)</li>
                  <li>• <strong>Stop Payment:</strong> Capacidad de detener pago en cheques no cobrados</li>
                  <li>• <strong>Reconciliación:</strong> Tracking automático cuando el cheque es cobrado</li>
                  <li>• <strong>Reimpresión:</strong> Generar duplicados para registros o cheques perdidos</li>
                  <li>• <strong>Auditoría:</strong> Registro completo de emisión, anulación y cobros</li>
                  <li>• <strong>Cumplimiento:</strong> Retiene información fiscal requerida por IRS</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nuevo Cheque */}
        {showNewCheckModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Nuevo Cheque</h2>
                    <p className="text-sm text-gray-500">Cheque #{nextCheckNumber}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={closeNewCheckModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto del Cheque
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={checkAmount}
                      onChange={(e) => setCheckAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas / Memo
                  </label>
                  <textarea
                    value={checkMemo}
                    onChange={(e) => setCheckMemo(e.target.value)}
                    placeholder="Descripción opcional..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Número de cheque:</span>
                    <span className="font-semibold">#{nextCheckNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Fecha de emisión:</span>
                    <span className="font-semibold">{new Date().toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={closeNewCheckModal}>
                  Cancelar
                </Button>
                <Button onClick={createNewCheck} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Crear Cheque
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

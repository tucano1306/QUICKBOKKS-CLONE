'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Receipt,
  Printer,
  Plus,
  Edit,
  Trash2,
  Download,
  XCircle,
  CheckCircle,
  Hash,
  DollarSign,
  FileText,
  RefreshCw,
} from 'lucide-react'

interface PayrollCheck {
  id: string
  checkNumber: string
  amount: number
  checkDate: string
  memo: string | null
  bankAccount: string | null
  status: string
  printedAt: string | null
  voidedAt: string | null
  voidReason: string | null
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNumber: string
    department: string | null
  }
  payroll?: {
    id: string
    periodStart: string
    periodEnd: string
  }
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNumber: string
}

export default function ChecksPage() {
  const { status } = useSession()
  const [checks, setChecks] = useState<PayrollCheck[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, pending: 0, printed: 0, issued: 0, voided: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCheck, setSelectedCheck] = useState<PayrollCheck | null>(null)
  const [selectedChecks, setSelectedChecks] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: '',
    employeeId: '',
    startDate: '',
    endDate: ''
  })
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: 0,
    checkDate: new Date().toISOString().split('T')[0],
    memo: '',
    bankAccount: '',
    checkNumber: ''
  })
  const [newCheckNumber, setNewCheckNumber] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/auth/login')
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') loadData()
  }, [status, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const empRes = await fetch('/api/employees?status=ACTIVE')
      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(empData.data || empData)
      }

      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const res = await fetch(`/api/payroll/checks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setChecks(data.checks || [])
        setStats(data.stats || { total: 0, totalAmount: 0, pending: 0, printed: 0, issued: 0, voided: 0 })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/payroll/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        resetForm()
        loadData()
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error creating check:', error)
      alert('Error al crear cheque')
    }
  }

  const handleAction = async (id: string, action: string, voidReason?: string) => {
    try {
      const res = await fetch('/api/payroll/checks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, voidReason })
      })
      if (res.ok) loadData()
      else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleAssignNumber = async () => {
    if (!selectedCheck || !newCheckNumber) return
    try {
      const res = await fetch('/api/payroll/checks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCheck.id, action: 'assign_number', checkNumber: newCheckNumber })
      })
      if (res.ok) {
        setShowAssignModal(false)
        setSelectedCheck(null)
        setNewCheckNumber('')
        loadData()
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleBatchPrint = async () => {
    if (selectedChecks.length === 0) {
      alert('Seleccione cheques para imprimir')
      return
    }
    try {
      const res = await fetch('/api/payroll/checks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIds: selectedChecks, action: 'print' })
      })
      if (res.ok) {
        const result = await res.json()
        alert(`${result.processed} cheques procesados`)
        setSelectedChecks([])
        loadData()
        
        // Generar ventana de impresión
        if (result.printData) {
          printChecks(result.printData)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const printChecks = (printData: any[]) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cheques de Nómina</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .check { 
            border: 2px solid #000; 
            padding: 20px; 
            margin: 20px; 
            page-break-after: always;
            width: 800px;
          }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .amount { font-size: 24px; font-weight: bold; }
          .pay-to { margin: 20px 0; font-size: 18px; }
          .amount-words { margin: 10px 0; font-style: italic; }
          .signature { margin-top: 40px; border-top: 1px solid #000; width: 200px; text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin: 20px;">
          <button onclick="window.print()">🖨️ Imprimir</button>
          <button onclick="window.close()">❌ Cerrar</button>
        </div>
        ${printData.map(check => `
          <div class="check">
            <div class="header">
              <div>
                <strong>Mi Empresa S.A.</strong><br>
                123 Calle Principal<br>
                Ciudad, Estado 12345
              </div>
              <div style="text-align: right;">
                <strong>Cheque #${check.checkNumber}</strong><br>
                Fecha: ${check.date}
              </div>
            </div>
            <div class="pay-to">
              <strong>Páguese a la orden de:</strong><br>
              <span style="font-size: 20px;">${check.payTo}</span>
            </div>
            <div class="amount">
              $${check.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <div class="amount-words">
              ${check.amountInWords}
            </div>
            <div style="margin-top: 20px;">
              <strong>Memo:</strong> ${check.memo}
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
              <div class="signature">Firma Autorizada</div>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cheque?')) return
    try {
      const res = await fetch(`/api/payroll/checks?id=${id}`, { method: 'DELETE' })
      if (res.ok) loadData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleVoid = async (id: string) => {
    const reason = prompt('Razón de anulación:')
    if (reason) {
      handleAction(id, 'void', reason)
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      amount: 0,
      checkDate: new Date().toISOString().split('T')[0],
      memo: '',
      bankAccount: '',
      checkNumber: ''
    })
  }

  const toggleSelectCheck = (id: string) => {
    setSelectedChecks(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const selectAllPending = () => {
    const pendingIds = checks.filter(c => c.status === 'PENDING').map(c => c.id)
    setSelectedChecks(pendingIds)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PRINTED: 'bg-blue-100 text-blue-800',
      ISSUED: 'bg-green-100 text-green-800',
      CASHED: 'bg-purple-100 text-purple-800',
      VOIDED: 'bg-red-100 text-red-800'
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      PRINTED: 'Impreso',
      ISSUED: 'Emitido',
      CASHED: 'Cobrado',
      VOIDED: 'Anulado'
    }
    return <Badge className={styles[status]}>{labels[status]}</Badge>
  }

  if (status === 'loading' || loading) {
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🧾 Cheques de Pago</h1>
            <p className="text-gray-600">Gestión de cheques de nómina</p>
          </div>
          <div className="flex gap-2">
            {selectedChecks.length > 0 && (
              <Button onClick={handleBatchPrint} className="bg-blue-600">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Lote ({selectedChecks.length})
              </Button>
            )}
            <Button variant="outline" onClick={selectAllPending}>
              Seleccionar Pendientes
            </Button>
            <Button onClick={() => { resetForm(); setShowModal(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cheque
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Cheques</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Monto Total</p>
                  <p className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Impresos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.printed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Emitidos</p>
                <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium">Estado</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="PRINTED">Impreso</option>
                  <option value="ISSUED">Emitido</option>
                  <option value="VOIDED">Anulado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                >
                  <option value="">Todos</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={loadData} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay cheques registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 w-8">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) selectAllPending()
                            else setSelectedChecks([])
                          }}
                        />
                      </th>
                      <th className="text-left py-2">No. Cheque</th>
                      <th className="text-left py-2">Empleado</th>
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-right py-2">Monto</th>
                      <th className="text-left py-2">Estado</th>
                      <th className="text-right py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr key={check.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedChecks.includes(check.id)}
                            onChange={() => toggleSelectCheck(check.id)}
                            disabled={check.status === 'VOIDED'}
                          />
                        </td>
                        <td className="py-3 font-mono">{check.checkNumber}</td>
                        <td className="py-3">
                          <div className="font-medium">{check.employee.firstName} {check.employee.lastName}</div>
                          <div className="text-sm text-gray-500">{check.employee.employeeNumber}</div>
                        </td>
                        <td className="py-3">{new Date(check.checkDate).toLocaleDateString()}</td>
                        <td className="py-3 text-right font-medium">${check.amount.toLocaleString()}</td>
                        <td className="py-3">{getStatusBadge(check.status)}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {check.status === 'PENDING' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleAction(check.id, 'print')} title="Imprimir">
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedCheck(check); setShowAssignModal(true) }} title="Asignar número">
                                  <Hash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {check.status === 'PRINTED' && (
                              <Button size="sm" variant="outline" onClick={() => handleAction(check.id, 'issue')} title="Emitir">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {check.status !== 'VOIDED' && (
                              <Button size="sm" variant="outline" onClick={() => handleVoid(check.id)} title="Anular">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                            {check.status === 'PENDING' && (
                              <Button size="sm" variant="outline" onClick={() => handleDelete(check.id)} title="Eliminar">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Nuevo Cheque */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">📝 Nuevo Cheque</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Empleado</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto</label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <Input
                    type="date"
                    value={formData.checkDate}
                    onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">No. Cheque (opcional)</label>
                  <Input
                    value={formData.checkNumber}
                    onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                    placeholder="Se genera automáticamente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Memo</label>
                  <Input
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="Pago de Nómina"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Cheque</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Asignar Número */}
        {showAssignModal && selectedCheck && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">🔢 Asignar Número de Cheque</h2>
              <p className="text-gray-600 mb-4">
                Cheque actual: <strong>{selectedCheck.checkNumber}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nuevo Número</label>
                <Input
                  value={newCheckNumber}
                  onChange={(e) => setNewCheckNumber(e.target.value)}
                  placeholder="Ej: 001234"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowAssignModal(false); setSelectedCheck(null) }}>
                  Cancelar
                </Button>
                <Button onClick={handleAssignNumber}>
                  Asignar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

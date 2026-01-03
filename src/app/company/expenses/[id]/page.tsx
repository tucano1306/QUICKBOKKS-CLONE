'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Receipt,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle
} from 'lucide-react'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  vendor: string | null
  paymentMethod: string
  status: string
  taxDeductible: boolean
  taxAmount: number
  reference: string | null
  notes: string | null
  category: {
    id: string
    name: string
    type: string
  }
  employee?: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export default function ExpenseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const expenseId = params.id as string

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && expenseId) {
      loadExpense()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, expenseId])

  const loadExpense = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expenses/${expenseId}`)
      
      if (response.ok) {
        const data = await response.json()
        setExpense(data)
      } else if (response.status === 404) {
        setError('Gasto no encontrado')
      } else {
        setError('Error al cargar el gasto')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/company/expenses/list')
      } else {
        setError('Error al eliminar el gasto')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al eliminar el gasto')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
      PAID: { label: 'Pagado', color: 'bg-blue-100 text-blue-800', icon: DollarSign }
    }
    return configs[status] || configs.PENDING
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      CHECK: 'Cheque',
      CREDIT_CARD: 'Tarjeta de Crédito',
      DEBIT_CARD: 'Tarjeta de Débito',
      TRANSFER: 'Transferencia',
      MULTIPLE: 'Múltiples Métodos',
      OTHER: 'Otro'
    }
    return labels[method] || method
  }

  // Parsear payment splits de las notas si existen
  const getPaymentSplits = () => {
    if (!expense?.notes) return null
    try {
      const data = JSON.parse(expense.notes)
      if (data.paymentSplits && Array.isArray(data.paymentSplits)) {
        return data.paymentSplits
      }
    } catch {
      // No es JSON
    }
    return null
  }

  const getNotesText = () => {
    if (!expense?.notes) return null
    try {
      const data = JSON.parse(expense.notes)
      return data.text || null
    } catch {
      return expense.notes
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  if (error) {
    return (
      <CompanyTabsLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
            <Button onClick={() => router.push('/company/expenses/list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la lista
            </Button>
          </Card>
        </div>
      </CompanyTabsLayout>
    )
  }

  if (!expense) {
    return null
  }

  const statusConfig = getStatusConfig(expense.status)
  const StatusIcon = statusConfig.icon

  return (
    <CompanyTabsLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/company/expenses/list')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalle del Gasto
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                ID: {expense.id.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/company/expenses/${expense.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600" />
                  Información del Gasto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Descripción</span>
                  <p className="text-lg font-semibold text-gray-900">{expense.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Monto
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha
                    </label>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(expense.date).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Categoría
                    </label>
                    <Badge variant="secondary" className="mt-1">
                      {expense.category.name}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Proveedor
                    </label>
                    <p className="text-gray-900">{expense.vendor || 'No especificado'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      Método de Pago
                    </label>
                    <p className="text-gray-900">{getPaymentMethodLabel(expense.paymentMethod)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Referencia</span>
                    <p className="text-gray-900">{expense.reference || 'Sin referencia'}</p>
                  </div>
                </div>

                {/* Desglose de pagos múltiples */}
                {getPaymentSplits() && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                      <CreditCard className="h-4 w-4" />
                      Desglose de Pagos
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                      {getPaymentSplits()!.map((split: { method: string; amount: number; reference?: string }) => (
                        <div key={`${split.method}-${split.amount}`} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {getPaymentMethodLabel(split.method)}
                            {split.reference && (
                              <span className="text-gray-500 ml-2">({split.reference})</span>
                            )}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${split.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getNotesText() && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Notas
                    </label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">
                      {getNotesText()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Status & Meta */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color}`}>
                  <StatusIcon className="h-5 w-5" />
                  <span className="font-semibold">{statusConfig.label}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tax Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Deducible de impuestos</span>
                  <Badge variant={expense.taxDeductible ? 'default' : 'secondary'}>
                    {expense.taxDeductible ? 'Sí' : 'No'}
                  </Badge>
                </div>
                {expense.taxAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Monto de impuesto</span>
                    <span className="font-semibold">
                      ${expense.taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Card */}
            {expense.employee && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Empleado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{expense.employee.name}</p>
                </CardContent>
              </Card>
            )}

            {/* Meta Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Registro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado</span>
                  <span>{new Date(expense.createdAt).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actualizado</span>
                  <span>{new Date(expense.updatedAt).toLocaleDateString('es-MX')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

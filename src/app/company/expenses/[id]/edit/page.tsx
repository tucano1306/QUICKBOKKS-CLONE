'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Save,
  Receipt,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Folder
} from 'lucide-react'

interface PaymentSplit {
  id: string
  method: string
  amount: string
  reference: string
}

interface Category {
  id: string
  name: string
  type: string
}

interface Employee {
  id: string
  name: string
}

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
  categoryId: string
  employeeId: string | null
  category: {
    id: string
    name: string
  }
}

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  const expenseId = params.id as string

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    vendor: '',
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
    taxDeductible: true,
    taxAmount: '',
    employeeId: '',
    status: 'PENDING'
  })

  // Estado para múltiples métodos de pago
  const [useMultiplePayments, setUseMultiplePayments] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    { id: '1', method: 'CASH', amount: '', reference: '' }
  ])

  // Funciones para manejar múltiples pagos
  const addPaymentSplit = () => {
    setPaymentSplits([...paymentSplits, {
      id: Date.now().toString(),
      method: 'CASH',
      amount: '',
      reference: ''
    }])
  }

  const removePaymentSplit = (id: string) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter(s => s.id !== id))
    }
  }

  const updatePaymentSplit = (id: string, field: keyof PaymentSplit, value: string) => {
    setPaymentSplits(paymentSplits.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const getTotalPayments = () => {
    return paymentSplits.reduce((sum, split) => sum + (Number.parseFloat(split.amount) || 0), 0)
  }

  const getPaymentDifference = () => {
    const total = Number.parseFloat(formData.amount) || 0
    return total - getTotalPayments()
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && expenseId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, expenseId])

  const parsePaymentSplits = (notes: string | null) => {
    if (!notes) return { parsedNotes: '', paymentSplits: null }
    
    try {
      const notesData = JSON.parse(notes)
      if (notesData.paymentSplits && Array.isArray(notesData.paymentSplits)) {
        const splits = notesData.paymentSplits.map((s: { method: string; amount: number; reference?: string }, idx: number) => ({
          id: (idx + 1).toString(),
          method: s.method,
          amount: s.amount.toString(),
          reference: s.reference || ''
        }))
        return { parsedNotes: notesData.text || '', paymentSplits: splits }
      }
    } catch {
      // No es JSON, son notas normales
    }
    return { parsedNotes: notes, paymentSplits: null }
  }

  const loadExpenseData = async (expense: Expense) => {
    const { parsedNotes, paymentSplits } = parsePaymentSplits(expense.notes)
    
    if (paymentSplits) {
      setUseMultiplePayments(paymentSplits.length > 1)
      setPaymentSplits(paymentSplits)
    }
    
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date.split('T')[0],
      categoryId: expense.categoryId,
      vendor: expense.vendor || '',
      paymentMethod: expense.paymentMethod,
      reference: expense.reference || '',
      notes: parsedNotes,
      taxDeductible: expense.taxDeductible,
      taxAmount: expense.taxAmount?.toString() || '',
      employeeId: expense.employeeId || '',
      status: expense.status
    })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [expenseRes, categoriesRes, employeesRes] = await Promise.all([
        fetch(`/api/expenses/${expenseId}`),
        fetch('/api/expenses/categories'),
        fetch('/api/employees')
      ])

      if (expenseRes.ok) {
        const expense: Expense = await expenseRes.json()
        await loadExpenseData(expense)
      } else {
        setMessage({ type: 'error', text: 'Gasto no encontrado' })
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(Array.isArray(data) ? data : [])
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json()
        const employeesArray = Array.isArray(data) ? data : data.employees || []
        setEmployees(employeesArray)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Error al cargar los datos' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Validaciones
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'La descripción es requerida' })
      setSaving(false)
      return
    }

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'El monto debe ser mayor a 0' })
      setSaving(false)
      return
    }

    if (!formData.categoryId) {
      setMessage({ type: 'error', text: 'Selecciona una categoría' })
      setSaving(false)
      return
    }

    // Validar pagos múltiples si está activo
    if (useMultiplePayments) {
      const invalidSplits = paymentSplits.some(s => !s.amount || Number.parseFloat(s.amount) <= 0)
      if (invalidSplits) {
        setMessage({ type: 'error', text: 'Todos los métodos de pago deben tener un monto válido' })
        setSaving(false)
        return
      }
      
      const difference = Math.abs(getPaymentDifference())
      if (difference > 0.01) {
        setMessage({ type: 'error', text: `La suma de los pagos debe ser igual al monto total. Diferencia: $${difference.toFixed(2)}` })
        setSaving(false)
        return
      }
    }

    try {
      // Preparar notas con paymentSplits si hay múltiples pagos
      let notesToSave = formData.notes
      if (useMultiplePayments && paymentSplits.length > 0) {
        const notesData = {
          text: formData.notes,
          paymentSplits: paymentSplits.map(s => ({
            method: s.method,
            amount: Number.parseFloat(s.amount),
            reference: s.reference || undefined
          }))
        }
        notesToSave = JSON.stringify(notesData)
      }

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
          taxAmount: formData.taxAmount ? Number.parseFloat(formData.taxAmount) : 0,
          employeeId: formData.employeeId || null,
          notes: notesToSave,
          paymentMethod: useMultiplePayments ? 'MULTIPLE' : formData.paymentMethod
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Gasto actualizado exitosamente' })
        setTimeout(() => {
          router.push(`/company/expenses/${expenseId}`)
        }, 1500)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al actualizar el gasto' })
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const paymentMethods = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CHECK', label: 'Cheque' },
    { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
    { value: 'DEBIT_CARD', label: 'Tarjeta de Débito' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'OTHER', label: 'Otro' }
  ]

  const statuses = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'APPROVED', label: 'Aprobado' },
    { value: 'REJECTED', label: 'Rechazado' },
    { value: 'PAID', label: 'Pagado' }
  ]

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/company/expenses/${expenseId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Editar Gasto
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Modifica los datos del gasto
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                Información del Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descripción *
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descripción del gasto"
                  required
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monto *
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replaceAll(',', '.');
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        handleChange({ target: { name: 'amount', value: val } } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha *
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Category and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="categoryId" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoría *
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/company/expenses/categories')}
                      className="text-xs"
                    >
                      <Folder className="h-3 w-3 mr-1" />
                      Gestionar
                    </Button>
                  </div>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor and Payment Method */}
              <div className="space-y-4">
                {/* Proveedor */}
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Proveedor
                  </Label>
                  <Input
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                {/* Toggle para múltiples métodos de pago */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Usar múltiples métodos de pago</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseMultiplePayments(!useMultiplePayments)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useMultiplePayments ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useMultiplePayments ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Método de pago único */}
                {!useMultiplePayments && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Método de Pago
                    </Label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {paymentMethods.map(pm => (
                        <option key={pm.value} value={pm.value}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Múltiples métodos de pago */}
                {useMultiplePayments && (
                  <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Desglose de Pagos
                    </Label>
                    
                    {paymentSplits.map((split, index) => (
                      <div key={split.id} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">Método {index + 1}</Label>
                          <select
                            value={split.method}
                            onChange={(e) => updatePaymentSplit(split.id, 'method', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            {paymentMethods.map(pm => (
                              <option key={pm.value} value={pm.value}>{pm.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-28">
                          <Label className="text-xs text-gray-500">Monto</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={split.amount}
                            onChange={(e) => {
                              const val = e.target.value.replaceAll(',', '.');
                              if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                updatePaymentSplit(split.id, 'amount', val);
                              }
                            }}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">Referencia</Label>
                          <Input
                            type="text"
                            value={split.reference}
                            onChange={(e) => updatePaymentSplit(split.id, 'reference', e.target.value)}
                            placeholder="Núm. cheque, etc."
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePaymentSplit(split.id)}
                          disabled={paymentSplits.length === 1}
                          className="mt-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPaymentSplit}
                      className="w-full mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar otro método de pago
                    </Button>

                    {/* Resumen de pagos */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monto Total del Gasto:</span>
                        <span className="font-medium">${Number.parseFloat(formData.amount || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Suma de Pagos:</span>
                        <span className={`font-medium ${Math.abs(getPaymentDifference()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                          ${getTotalPayments().toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(getPaymentDifference()) >= 0.01 && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-red-600 font-medium">Diferencia:</span>
                          <span className="text-red-600 font-medium">${getPaymentDifference().toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reference and Employee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder="Número de factura, recibo, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Empleado</Label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sin asignar</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tax Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxAmount">Monto de Impuesto</Label>
                  <Input
                    id="taxAmount"
                    name="taxAmount"
                    type="text"
                    inputMode="decimal"
                    value={formData.taxAmount}
                    onChange={(e) => {
                      const val = e.target.value.replaceAll(',', '.');
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        handleChange({ target: { name: 'taxAmount', value: val } } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    id="taxDeductible"
                    name="taxDeductible"
                    type="checkbox"
                    checked={formData.taxDeductible}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 rounded border-gray-300"
                  />
                  <Label htmlFor="taxDeductible" className="cursor-pointer">
                    Deducible de impuestos
                  </Label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/company/expenses/${expenseId}`)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </CompanyTabsLayout>
  )
}

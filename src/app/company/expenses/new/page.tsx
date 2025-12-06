'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Upload,
  X,
  Plus,
  Trash2,
  SplitSquareVertical
} from 'lucide-react'

interface Category {
  id: string
  name: string
  type: string
}

interface Employee {
  id: string
  name: string
}

interface PaymentSplit {
  id: string
  method: string
  amount: string
  reference: string
}

export default function NewExpensePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [useMultiplePayments, setUseMultiplePayments] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    { id: '1', method: 'CASH', amount: '', reference: '' }
  ])
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    vendor: '',
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
    taxDeductible: true,
    employeeId: ''
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load categories and employees
  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Load categories
      const categoriesRes = await fetch('/api/expenses/categories')
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(Array.isArray(data) ? data : [])
      }

      // Load employees
      const employeesRes = await fetch('/api/employees')
      if (employeesRes.ok) {
        const data = await employeesRes.json()
        const employeesArray = Array.isArray(data) ? data : data.employees || []
        setEmployees(employeesArray)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Funciones para manejar múltiples pagos
  const addPaymentSplit = () => {
    setPaymentSplits([
      ...paymentSplits,
      { id: Date.now().toString(), method: 'CASH', amount: '', reference: '' }
    ])
  }

  const removePaymentSplit = (id: string) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter(p => p.id !== id))
    }
  }

  const updatePaymentSplit = (id: string, field: keyof PaymentSplit, value: string) => {
    setPaymentSplits(paymentSplits.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const getTotalPayments = () => {
    return paymentSplits.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }

  const getPaymentDifference = () => {
    const total = parseFloat(formData.amount) || 0
    const payments = getTotalPayments()
    return total - payments
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
    setLoading(true)
    setMessage(null)

    // Validaciones
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'La descripción es requerida' })
      setLoading(false)
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'El monto debe ser mayor a 0' })
      setLoading(false)
      return
    }

    if (!formData.categoryId) {
      setMessage({ type: 'error', text: 'Selecciona una categoría' })
      setLoading(false)
      return
    }

    // Validar pagos múltiples si está activo
    if (useMultiplePayments) {
      const diff = getPaymentDifference()
      if (Math.abs(diff) > 0.01) {
        setMessage({ 
          type: 'error', 
          text: `La suma de los pagos ($${getTotalPayments().toFixed(2)}) no coincide con el monto total ($${formData.amount}). Diferencia: $${diff.toFixed(2)}` 
        })
        setLoading(false)
        return
      }
    }

    try {
      // Preparar datos para enviar
      const paymentData = useMultiplePayments ? {
        paymentMethod: 'MULTIPLE',
        notes: JSON.stringify({
          originalNotes: formData.notes,
          paymentSplits: paymentSplits.map(p => ({
            method: p.method,
            amount: parseFloat(p.amount),
            reference: p.reference
          }))
        })
      } : {
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...paymentData,
          amount: parseFloat(formData.amount),
          employeeId: formData.employeeId || null
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Gasto creado exitosamente' })
        setTimeout(() => {
          router.push('/company/expenses/list')
        }, 1500)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear el gasto' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setLoading(false)
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

  if (status === 'loading' || loadingData) {
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
              onClick={() => router.push('/company/expenses/list')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Nuevo Gasto
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Registrar un nuevo gasto de la empresa
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />
            }
            {message.text}
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Información del Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Ej: Compra de suministros de oficina"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Monto <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="amount"
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      value={formData.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '.');
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          handleChange({ target: { name: 'amount', value: val } } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                      placeholder="0.00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">
                    Fecha <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="categoryId">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type})
                      </option>
                    ))}
                  </select>
                </div>
                {categories.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No hay categorías. <a href="/company/expenses/categories" className="underline">Crear una categoría</a>
                  </p>
                )}
              </div>

              {/* Proveedor */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Proveedor</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    placeholder="Nombre del proveedor"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Método de Pago - Simple o Múltiple */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Método de Pago</Label>
                  <button
                    type="button"
                    onClick={() => setUseMultiplePayments(!useMultiplePayments)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      useMultiplePayments 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <SplitSquareVertical className="h-4 w-4" />
                    {useMultiplePayments ? 'Pago Múltiple Activo' : 'Dividir Pago'}
                  </button>
                </div>

                {!useMultiplePayments ? (
                  /* Pago Simple */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        id="paymentMethod"
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700"
                      >
                        {paymentMethods.map(pm => (
                          <option key={pm.value} value={pm.value}>{pm.label}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder="Referencia / Número de Recibo"
                    />
                  </div>
                ) : (
                  /* Pagos Múltiples */
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Divide el pago en diferentes métodos</span>
                      <span className={`font-medium ${Math.abs(getPaymentDifference()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(getPaymentDifference()) < 0.01 
                          ? '✓ Cuadrado' 
                          : `Diferencia: $${getPaymentDifference().toFixed(2)}`
                        }
                      </span>
                    </div>

                    {paymentSplits.map((split, index) => (
                      <div key={split.id} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                        <select
                          value={split.method}
                          onChange={(e) => updatePaymentSplit(split.id, 'method', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900"
                        >
                          {paymentMethods.map(pm => (
                            <option key={pm.value} value={pm.value}>{pm.label}</option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Monto"
                            value={split.amount}
                            onChange={(e) => {
                              const val = e.target.value.replace(/,/g, '.');
                              if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                updatePaymentSplit(split.id, 'amount', val);
                              }
                            }}
                            className="pl-8 text-sm"
                          />
                        </div>
                        <Input
                          placeholder="Referencia"
                          value={split.reference}
                          onChange={(e) => updatePaymentSplit(split.id, 'reference', e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePaymentSplit(split.id)}
                          disabled={paymentSplits.length === 1}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                        <span className="font-medium">${parseFloat(formData.amount || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Suma de Pagos:</span>
                        <span className={`font-medium ${Math.abs(getPaymentDifference()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                          ${getTotalPayments().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Empleado */}
              <div className="space-y-2">
                <Label htmlFor="employeeId">Empleado Asignado</Label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700"
                >
                  <option value="">Sin empleado asignado</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Detalles adicionales sobre el gasto..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700 resize-none"
                />
              </div>

              {/* Tax Deductible */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="taxDeductible"
                  name="taxDeductible"
                  checked={formData.taxDeductible}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <Label htmlFor="taxDeductible" className="font-medium">
                    Deducible de Impuestos
                  </Label>
                  <p className="text-sm text-gray-500">
                    Marcar si este gasto es deducible para efectos fiscales
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/company/expenses/list')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Gasto
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

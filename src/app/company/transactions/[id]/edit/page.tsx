'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import {
  ArrowLeft,
  Save,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  category: string
  description: string | null
  amount: number
  date: string
  status: string
  notes: string | null
  reference?: string | null
}

export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const transactionId = params.id as string

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    category: '',
    description: '',
    amount: '',
    date: '',
    status: 'PENDING',
    notes: '',
    reference: ''
  })

  const categories = {
    INCOME: [
      'Ventas',
      'Servicios',
      'Intereses',
      'Inversiones',
      'Otros Ingresos'
    ],
    EXPENSE: [
      'Suministros',
      'Servicios Públicos',
      'Alquiler',
      'Nómina',
      'Marketing',
      'Transporte',
      'Mantenimiento',
      'Otros Gastos'
    ]
  }

  const statuses = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
    { value: 'RECONCILED', label: 'Conciliada' }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && transactionId) {
      loadTransaction()
    }
  }, [status, transactionId])

  const loadTransaction = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}`)
      
      if (response.ok) {
        const data: Transaction = await response.json()
        setFormData({
          type: data.type as 'INCOME' | 'EXPENSE',
          category: data.category || '',
          description: data.description || '',
          amount: data.amount.toString(),
          date: data.date.split('T')[0],
          status: data.status || 'PENDING',
          notes: data.notes || '',
          reference: data.reference || ''
        })
      } else {
        setMessage({ type: 'error', text: 'Transacción no encontrada' })
      }
    } catch (error) {
      console.error('Error loading transaction:', error)
      setMessage({ type: 'error', text: 'Error al cargar la transacción' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Reset category when type changes
    if (name === 'type') {
      setFormData(prev => ({ 
        ...prev, 
        type: value as 'INCOME' | 'EXPENSE', 
        category: '' 
      }))
    } else if (name === 'category' || name === 'description' || name === 'amount' || 
               name === 'date' || name === 'status' || name === 'notes' || name === 'reference') {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Validaciones
    if (!formData.category) {
      setMessage({ type: 'error', text: 'Selecciona una categoría' })
      setSaving(false)
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'El monto debe ser mayor a 0' })
      setSaving(false)
      return
    }

    if (!formData.date) {
      setMessage({ type: 'error', text: 'La fecha es requerida' })
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Transacción actualizada exitosamente' })
        setTimeout(() => {
          router.push(`/company/transactions/${transactionId}`)
        }, 1500)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al actualizar la transacción' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const isIncome = formData.type === 'INCOME'

  return (
    <CompanyTabsLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/company/transactions/${transactionId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Editar Transacción
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Modifica los datos de la transacción
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
                {isIncome ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                Información de la Transacción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type */}
              <div className="space-y-2">
                <Label>Tipo de Transacción</Label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.type === 'INCOME' 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="INCOME"
                      checked={formData.type === 'INCOME'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">Ingreso</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.type === 'EXPENSE' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-gray-200 hover:border-red-300'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="EXPENSE"
                      checked={formData.type === 'EXPENSE'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-medium">Gasto</span>
                  </label>
                </div>
              </div>

              {/* Category and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categoría *
                  </Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories[formData.type].map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha *
                  </Label>
                  <DatePicker
                    value={formData.date}
                    onChange={(date: string) => setFormData({ ...formData, date })}
                    placeholder="Selecciona una fecha"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descripción
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descripción de la transacción"
                />
              </div>

              {/* Reference */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/company/transactions/${transactionId}`)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className={isIncome ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
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

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
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
  TrendingDown,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X
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

// ── Category persistence (compartido con "Nueva Transacción") ─────────────────
const DEFAULT_INCOME_CATEGORIES = [
  'Ventas',
  'Servicios',
  'Consultoría',
  'Intereses',
  'Comisiones',
  'Otros Ingresos'
]

const DEFAULT_EXPENSE_CATEGORIES = [
  'Suministros de Oficina',
  'Servicios Públicos',
  'Alquiler',
  'Nómina',
  'Marketing',
  'Viajes',
  'Seguros',
  'Mantenimiento',
  'Otros Gastos'
]

const LS_KEY_INCOME = 'custom_income_categories'
const LS_KEY_EXPENSE = 'custom_expense_categories'

function loadCategories(type: 'INCOME' | 'EXPENSE'): string[] {
  const key = type === 'INCOME' ? LS_KEY_INCOME : LS_KEY_EXPENSE
  const stored = globalThis.localStorage?.getItem(key)
  if (stored) {
    try { return JSON.parse(stored) } catch { /* ignore */ }
  }
  return type === 'INCOME' ? [...DEFAULT_INCOME_CATEGORIES] : [...DEFAULT_EXPENSE_CATEGORIES]
}

function saveCategories(type: 'INCOME' | 'EXPENSE', cats: string[]) {
  const key = type === 'INCOME' ? LS_KEY_INCOME : LS_KEY_EXPENSE
  globalThis.localStorage?.setItem(key, JSON.stringify(cats))
}

export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()
  const { activeCompany } = useCompany()
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

  // Gestión de categorías (localStorage, igual que en "Nueva Transacción")
  const [incomeCategories, setIncomeCategories] = useState<string[]>([])
  const [expenseCategories, setExpenseCategories] = useState<string[]>([])
  const [showCatManager, setShowCatManager] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const statuses = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
    { value: 'RECONCILED', label: 'Conciliada' }
  ]

  // Cargar categorías guardadas al montar
  useEffect(() => {
    setIncomeCategories(loadCategories('INCOME'))
    setExpenseCategories(loadCategories('EXPENSE'))
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && transactionId && activeCompany?.id) {
      loadTransaction()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, transactionId, activeCompany?.id])

  const currentType: 'INCOME' | 'EXPENSE' = formData.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  const baseCategories = currentType === 'INCOME' ? incomeCategories : expenseCategories

  // Incluir la categoría actual del registro aunque no esté en la lista guardada,
  // para que el desplegable siempre muestre el valor existente.
  const categories = formData.category && !baseCategories.includes(formData.category)
    ? [formData.category, ...baseCategories]
    : baseCategories

  const setCategories = (cats: string[]) => {
    if (currentType === 'INCOME') {
      setIncomeCategories(cats)
    } else {
      setExpenseCategories(cats)
    }
    saveCategories(currentType, cats)
  }

  const addCategory = () => {
    const trimmed = newCatName.trim()
    if (!trimmed || baseCategories.includes(trimmed)) return
    setCategories([...baseCategories, trimmed])
    setNewCatName('')
  }

  const deleteCategory = (cat: string) => {
    setCategories(baseCategories.filter(c => c !== cat))
    if (formData.category === cat) setFormData(f => ({ ...f, category: '' }))
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingValue(baseCategories[index])
  }

  const confirmEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingValue.trim()
    if (!trimmed) return
    const oldName = baseCategories[editingIndex]
    const updated = baseCategories.map((c, i) => i === editingIndex ? trimmed : c)
    setCategories(updated)
    if (formData.category === oldName) setFormData(f => ({ ...f, category: trimmed }))
    setEditingIndex(null)
    setEditingValue('')
  }

  const loadTransaction = async () => {
    if (!activeCompany?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}?companyId=${activeCompany.id}`)

      if (response.ok) {
        const data: Transaction = await response.json()
        setFormData({
          type: data.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
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

    // Al cambiar el tipo, reiniciar la categoría y cerrar el gestor
    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        type: value as 'INCOME' | 'EXPENSE',
        category: ''
      }))
      setShowCatManager(false)
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

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'El monto debe ser mayor a 0' })
      setSaving(false)
      return
    }

    if (!formData.date) {
      setMessage({ type: 'error', text: 'La fecha es requerida' })
      setSaving(false)
      return
    }

    if (!activeCompany?.id) {
      setMessage({ type: 'error', text: 'No hay empresa activa' })
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
          companyId: activeCompany.id
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
      console.error('Update error:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading || !activeCompany) {
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
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/company/transactions/${transactionId}`)}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Editar Transacción
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <label className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
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
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">Ingreso</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
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
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">Gasto</span>
                  </label>
                </div>
              </div>

              {/* Category and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoría *
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowCatManager(v => !v)}
                      className="flex items-center gap-1 text-xs text-[#0077C5] hover:underline"
                    >
                      <Settings2 className="h-3 w-3" />
                      Gestionar categorías
                    </button>
                  </div>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Gestor de categorías */}
                  {showCatManager && (
                    <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Categorías de {currentType === 'INCOME' ? 'Ingresos' : 'Gastos'}
                      </p>

                      {/* Categorías existentes */}
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {baseCategories.map((cat, idx) => (
                          <div key={cat} className="flex items-center gap-2">
                            {editingIndex === idx ? (
                              <>
                                <Input
                                  autoFocus
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmEdit() } if (e.key === 'Escape') setEditingIndex(null) }}
                                  className="h-7 text-sm flex-1"
                                />
                                <button type="button" onClick={confirmEdit} className="text-green-600 hover:text-green-800">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => setEditingIndex(null)} className="text-gray-400 hover:text-gray-600">
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm text-gray-800">{cat}</span>
                                <button type="button" onClick={() => startEdit(idx)} className="text-blue-500 hover:text-blue-700">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Agregar nueva categoría */}
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <Input
                          placeholder="Nueva categoría..."
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                          className="h-8 text-sm flex-1"
                        />
                        <Button type="button" size="sm" onClick={addCategory} className="h-8 bg-[#0077C5] hover:bg-[#005fa3]">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
                    type="text"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replaceAll(',', '.');
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        setFormData(prev => ({ ...prev, amount: val }));
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

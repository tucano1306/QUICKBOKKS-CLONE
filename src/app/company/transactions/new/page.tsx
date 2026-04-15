'use client'

import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompany } from "@/contexts/CompanyContext"
import { ArrowLeft, Check, Pencil, Plus, Save, Settings2, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function NewTransactionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeCompany } = useCompany()

  const typeParam = searchParams.get('type') || 'INCOME'

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: typeParam as 'INCOME' | 'EXPENSE',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    reference: ''
  })

  // Category management state
  const [incomeCategories, setIncomeCategories] = useState<string[]>([])
  const [expenseCategories, setExpenseCategories] = useState<string[]>([])
  const [showCatManager, setShowCatManager] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // Load from localStorage after mount
  useEffect(() => {
    setIncomeCategories(loadCategories('INCOME'))
    setExpenseCategories(loadCategories('EXPENSE'))
  }, [])

  const currentType = formData.type
  const categories = currentType === 'INCOME' ? incomeCategories : expenseCategories

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
    if (!trimmed || categories.includes(trimmed)) return
    const updated = [...categories, trimmed]
    setCategories(updated)
    setNewCatName('')
  }

  const deleteCategory = (index: number) => {
    const cat = categories[index]
    const updated = categories.filter((_, i) => i !== index)
    setCategories(updated)
    if (formData.category === cat) setFormData(f => ({ ...f, category: '' }))
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingValue(categories[index])
  }

  const confirmEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingValue.trim()
    if (!trimmed) return
    const oldName = categories[editingIndex]
    const updated = categories.map((c, i) => i === editingIndex ? trimmed : c)
    setCategories(updated)
    if (formData.category === oldName) setFormData(f => ({ ...f, category: trimmed }))
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeCompany?.id) {
      alert('No hay empresa activa')
      return
    }

    if (!formData.amount || !formData.category) {
      alert('Completa los campos requeridos')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
          companyId: activeCompany.id,
          status: 'COMPLETED',
          createJournalEntry: true
        })
      })

      if (res.ok) {
        alert(`${formData.type === 'INCOME' ? 'Ingreso' : 'Gasto'} registrado exitosamente`)
        router.push('/company/transactions')
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'No se pudo guardar'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CompanyTabsLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" onClick={() => router.back()} size="sm" className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {formData.type === 'INCOME' ? (
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  Nuevo Ingreso
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                  Nuevo Gasto
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Transacción</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={formData.type === 'INCOME' ? 'default' : 'outline'}
                  className={formData.type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => { setFormData({ ...formData, type: 'INCOME', category: '' }); setShowCatManager(false) }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'EXPENSE' ? 'default' : 'outline'}
                  className={formData.type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => { setFormData({ ...formData, type: 'EXPENSE', category: '' }); setShowCatManager(false) }}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Gasto
                </Button>
              </div>

              {/* Monto */}
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replaceAll(',', '.');
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        setFormData({ ...formData, amount: val });
                      }
                    }}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              {/* Categoría + Gestionar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="category">Categoría *</Label>
                  <button
                    type="button"
                    onClick={() => setShowCatManager(!showCatManager)}
                    className="flex items-center gap-1 text-xs text-[#0077C5] hover:underline"
                  >
                    <Settings2 className="h-3 w-3" />
                    Gestionar categorías
                  </button>
                </div>

                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Category manager panel */}
                {showCatManager && (
                  <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Categorías de {currentType === 'INCOME' ? 'Ingresos' : 'Gastos'}
                    </p>

                    {/* Existing categories */}
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {categories.map((cat, idx) => (
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
                              <button type="button" onClick={() => deleteCategory(idx)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add new category */}
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

              {/* Fecha */}
              <div>
                <Label htmlFor="date">Fecha *</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(date: string) => setFormData({ ...formData, date })}
                  placeholder="Selecciona una fecha"
                />
              </div>

              {/* Descripción */}
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Describe la transacción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Referencia */}
              <div>
                <Label htmlFor="reference">Referencia / Número de Factura</Label>
                <Input
                  id="reference"
                  placeholder="Ej: FAC-001, REC-123"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas adicionales</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Información adicional..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${formData.type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

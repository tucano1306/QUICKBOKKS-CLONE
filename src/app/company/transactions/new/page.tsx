'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, TrendingUp, TrendingDown } from 'lucide-react'
import { useCompany } from "@/contexts/CompanyContext"
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'

const INCOME_CATEGORIES = [
  'Ventas',
  'Servicios', 
  'Consultoría',
  'Intereses',
  'Comisiones',
  'Otros Ingresos'
]

const EXPENSE_CATEGORIES = [
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

  const categories = formData.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

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
          amount: parseFloat(formData.amount),
          companyId: activeCompany.id,
          status: 'COMPLETED',
          createJournalEntry: true // Para que cree el journal entry automáticamente
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
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
                  onClick={() => setFormData({ ...formData, type: 'INCOME', category: '' })}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'EXPENSE' ? 'default' : 'outline'}
                  className={formData.type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: '' })}
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
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <Label htmlFor="category">Categoría *</Label>
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
              </div>

              {/* Fecha */}
              <div>
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
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

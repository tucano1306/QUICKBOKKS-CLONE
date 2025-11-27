'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  X,
  Save,
  Briefcase,
  ShoppingCart,
  DollarSign,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string | null
  type: string
  taxRate: number
  _count?: {
    expenses: number
  }
}

export default function CategoriesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OPERATING',
    taxRate: 16
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadCategories()
    }
  }, [status])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/expenses/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(Array.isArray(data) ? data : [])
      } else {
        setCategories([])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingCategory
        ? `/api/expenses/categories?id=${editingCategory.id}`
        : '/api/expenses/categories'

      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadCategories()
        handleCloseModal()
        setMessage({ type: 'success', text: editingCategory ? 'Categoría actualizada' : 'Categoría creada exitosamente' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Error al guardar la categoría' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error al guardar la categoría' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      type: category.type,
      taxRate: category.taxRate
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Los gastos asociados quedarán sin categoría.')) return

    try {
      const response = await fetch(`/api/expenses/categories?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id))
        setMessage({ type: 'success', text: 'Categoría eliminada' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Error al eliminar la categoría' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error al eliminar la categoría' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      type: 'OPERATING',
      taxRate: 16
    })
  }

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'OPERATING':
        return <Briefcase className="h-5 w-5" />
      case 'ADMINISTRATIVE':
        return <Settings className="h-5 w-5" />
      case 'SALES':
        return <ShoppingCart className="h-5 w-5" />
      case 'FINANCIAL':
        return <DollarSign className="h-5 w-5" />
      default:
        return <FolderOpen className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OPERATING: 'Operativo',
      ADMINISTRATIVE: 'Administrativo',
      SALES: 'Ventas',
      FINANCIAL: 'Financiero',
      OTHER: 'Otro'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      OPERATING: 'bg-blue-100 text-blue-800',
      ADMINISTRATIVE: 'bg-purple-100 text-purple-800',
      SALES: 'bg-green-100 text-green-800',
      FINANCIAL: 'bg-orange-100 text-orange-800',
      OTHER: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors.OTHER
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Cargando categorías...</div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Categorías de Gastos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Organiza tus gastos por tipo y configura tasas de impuestos
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!Array.isArray(categories) || categories.length === 0 ? (
            <Card className="col-span-full p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No hay categorías registradas</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Categoría
              </Button>
            </Card>
          ) : (
            categories.map(category => (
              <Card key={category.id} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(category.type)} bg-opacity-20`}>
                      {getCategoryIcon(category.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(category.type)}`}>
                        {getTypeLabel(category.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t text-sm">
                  <span className="text-gray-500">
                    {category._count?.expenses || 0} gastos
                  </span>
                  <span className="font-medium text-gray-900">
                    IVA {category.taxRate}%
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Categoría <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Papelería y Suministros"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe el tipo de gastos que incluye esta categoría"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Gasto <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="OPERATING">Operativo</option>
                      <option value="ADMINISTRATIVE">Administrativo</option>
                      <option value="SALES">Ventas</option>
                      <option value="FINANCIAL">Financiero</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Clasifica según el área contable correspondiente
                    </p>
                  </div>

                  {/* Tax Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tasa de IVA <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.taxRate}
                        onChange={e => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tasa de IVA aplicable en México (generalmente 16% o 0%)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingCategory ? 'Actualizar' : 'Crear Categoría'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

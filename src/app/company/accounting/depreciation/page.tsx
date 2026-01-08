'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Car,
  Plus,
  TrendingDown,
  Calendar,
  DollarSign,
  FileText,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Calculator,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Asset {
  id: string
  assetNumber: string
  name: string
  description: string | null
  category: string
  purchaseDate: string
  purchasePrice: number
  salvageValue: number
  usefulLife: number
  depreciationMethod: string
  status: string
  accumulatedDepreciation: number
  bookValue: number
  disposalDate: string | null
  createdAt: string
  depreciations: AssetDepreciation[]
}

interface AssetDepreciation {
  id: string
  period: string
  depreciationAmount: number
  accumulatedDepreciation: number
  bookValue: number
}

export default function VehicleDepreciationPage() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // New asset form
  const [newAsset, setNewAsset] = useState({
    name: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    salvageValue: '',
    usefulLife: '5'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadAssets()
    }
  }, [status])

  useEffect(() => {
    let filtered = assets.filter(a => a.category === 'VEHICLE')
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(a => a.status === statusFilter)
    }
    
    setFilteredAssets(filtered)
  }, [assets, statusFilter])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/accounting/assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/accounting/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAsset,
          category: 'VEHICLE',
          depreciationMethod: 'STRAIGHT_LINE',
          purchasePrice: parseFloat(newAsset.purchasePrice),
          salvageValue: parseFloat(newAsset.salvageValue || '0'),
          usefulLife: parseInt(newAsset.usefulLife)
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Vehículo agregado exitosamente' })
        setShowAddModal(false)
        setNewAsset({
          name: '',
          description: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePrice: '',
          salvageValue: '',
          usefulLife: '5'
        })
        loadAssets()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Error al agregar vehículo' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error adding asset:', error)
      setMessage({ type: 'error', text: 'Error al agregar vehículo' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const calculateMonthlyDepreciation = (asset: Asset) => {
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    const monthlyRate = depreciableAmount / (asset.usefulLife * 12)
    return monthlyRate
  }

  const calculateRemainingValue = (asset: Asset) => {
    return asset.bookValue
  }

  const calculateDepreciationPercentage = (asset: Asset) => {
    if (asset.purchasePrice === 0) return 0
    return ((asset.accumulatedDepreciation / asset.purchasePrice) * 100).toFixed(1)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      DISPOSED: 'bg-gray-100 text-gray-700 border-gray-200',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      RETIRED: 'bg-red-100 text-red-700 border-red-200'
    }
    const labels = {
      ACTIVE: 'Activo',
      DISPOSED: 'Vendido',
      UNDER_MAINTENANCE: 'En Mantenimiento',
      RETIRED: 'Retirado'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  // Calculate stats
  const stats = {
    totalVehicles: filteredAssets.length,
    activeVehicles: filteredAssets.filter(a => a.status === 'ACTIVE').length,
    totalValue: filteredAssets.reduce((sum, a) => sum + a.purchasePrice, 0),
    currentValue: filteredAssets.reduce((sum, a) => sum + a.bookValue, 0),
    totalDepreciation: filteredAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
    monthlyDepreciation: filteredAssets.reduce((sum, a) => sum + calculateMonthlyDepreciation(a), 0)
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Car className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              Depreciación de Vehículos
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Gestiona la depreciación de tus vehículos
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => {}}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Agregar Vehículo</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Vehículos</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalVehicles}</p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {stats.activeVehicles} activos
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Valor Actual</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  ${stats.currentValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Valor en libros
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 col-span-2 lg:col-span-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-red-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                  <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Depreciación Total</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  ${stats.totalDepreciation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                    ${stats.monthlyDepreciation.toFixed(2)}/mes
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filtros:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
              <option value="DISPOSED">Vendidos</option>
              <option value="RETIRED">Retirados</option>
            </select>
          </div>
        </Card>

        {/* Vehicles List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredAssets.length === 0 ? (
            <Card className="p-12 text-center">
              <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay vehículos registrados</h3>
              <p className="text-gray-600 mb-4">Comienza agregando tu primer vehículo</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Vehículo
              </Button>
            </Card>
          ) : (
            filteredAssets.map((asset) => (
              <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Vehicle Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                          <p className="text-sm text-gray-600">{asset.description}</p>
                          <p className="text-xs text-gray-500 mt-1">#{asset.assetNumber}</p>
                        </div>
                        {getStatusBadge(asset.status)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Fecha de Compra</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(asset.purchaseDate).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Precio de Compra</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ${asset.purchasePrice.toLocaleString('es-MX')}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Vida Útil</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {asset.usefulLife} años
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Valor Residual</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ${asset.salvageValue.toLocaleString('es-MX')}
                          </p>
                        </div>
                      </div>

                      {/* Depreciation Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Depreciación</span>
                          <span className="font-semibold text-gray-900">
                            {calculateDepreciationPercentage(asset)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${calculateDepreciationPercentage(asset)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Depreciación Acumulada: ${asset.accumulatedDepreciation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          <span>Valor en Libros: ${asset.bookValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="lg:w-64 space-y-2">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">DEPRECIACIÓN MENSUAL</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">
                          ${calculateMonthlyDepreciation(asset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-900">VALOR ACTUAL</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-900">
                          ${calculateRemainingValue(asset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-6 h-6 text-blue-600" />
                  Agregar Nuevo Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddAsset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Vehículo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder="Ej: Camioneta Ford F-150 2023"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={newAsset.description}
                      onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                      placeholder="Detalles adicionales del vehículo"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Compra *
                      </label>
                      <input
                        type="date"
                        required
                        value={newAsset.purchaseDate}
                        onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio de Compra *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={newAsset.purchasePrice}
                        onChange={(e) => setNewAsset({ ...newAsset, purchasePrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Residual
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newAsset.salvageValue}
                        onChange={(e) => setNewAsset({ ...newAsset, salvageValue: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vida Útil (años) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newAsset.usefulLife}
                        onChange={(e) => setNewAsset({ ...newAsset, usefulLife: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Método de Depreciación</p>
                        <p className="text-blue-700">
                          Se utilizará el método de <strong>Línea Recta</strong> para calcular la depreciación mensual.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Vehículo
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

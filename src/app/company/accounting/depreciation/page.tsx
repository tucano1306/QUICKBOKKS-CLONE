'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  AlertCircle,
  Gauge,
  Save
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
  // Campos de millas para vehículos
  currentMileage: number | null
  purchaseMileage: number | null
  estimatedLifetimeMiles: number | null
  lastMileageUpdate: string | null
  yearModel: number | null
  vin: string | null
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
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMileageModal, setShowMileageModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [updatingMileage, setUpdatingMileage] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // New asset form
  const [newAsset, setNewAsset] = useState({
    name: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    salvageValue: '',
    usefulLife: '5',
    // Campos de millas
    currentMileage: '',
    purchaseMileage: '',
    estimatedLifetimeMiles: '200000',
    yearModel: new Date().getFullYear().toString(),
    vin: ''
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

  // Memoize filtered assets to prevent unnecessary recalculations
  const filteredAssets = useMemo(() => {
    let filtered = assets.filter(a => a.category === 'VEHICLE')
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(a => a.status === statusFilter)
    }
    
    return filtered
  }, [assets, statusFilter])

  const loadAssets = useCallback(async () => {
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
  }, [])

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
          usefulLife: parseInt(newAsset.usefulLife),
          // Campos de millas
          currentMileage: newAsset.currentMileage ? parseInt(newAsset.currentMileage) : null,
          purchaseMileage: newAsset.purchaseMileage ? parseInt(newAsset.purchaseMileage) : null,
          estimatedLifetimeMiles: newAsset.estimatedLifetimeMiles ? parseInt(newAsset.estimatedLifetimeMiles) : 200000,
          yearModel: newAsset.yearModel ? parseInt(newAsset.yearModel) : null,
          vin: newAsset.vin || null
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
          usefulLife: '5',
          currentMileage: '',
          purchaseMileage: '',
          estimatedLifetimeMiles: '200000',
          yearModel: new Date().getFullYear().toString(),
          vin: ''
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

  // Función para actualizar millaje rápidamente
  const handleUpdateMileage = async (assetId: string, newMileage: number, newLifetimeMiles?: number, purchaseMileage?: number) => {
    setUpdatingMileage(true)
    try {
      const updateData: any = { 
        currentMileage: newMileage
      }
      if (newLifetimeMiles !== undefined && newLifetimeMiles > 0) {
        updateData.estimatedLifetimeMiles = newLifetimeMiles
      }
      if (purchaseMileage !== undefined && purchaseMileage >= 0) {
        updateData.purchaseMileage = purchaseMileage
      }
      
      console.log('📤 Enviando actualización de millaje:', updateData)
      
      const response = await fetch(`/api/accounting/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedAsset = await response.json()
        console.log('✅ Respuesta del servidor:', updatedAsset)
        setMessage({ type: 'success', text: `✅ Millaje actualizado a ${newMileage.toLocaleString()} millas` })
        await loadAssets() // Recargar datos
        setShowMileageModal(false)
        setSelectedAsset(null)
        setTimeout(() => setMessage(null), 5000)
      } else {
        const error = await response.json()
        console.error('❌ Error del servidor:', error)
        setMessage({ type: 'error', text: error.error || 'Error al actualizar millaje' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      console.error('❌ Error updating mileage:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setUpdatingMileage(false)
    }
  }

  // Porcentajes de valor residual según tipo de activo (estándares IRS/GAAP)
  const RESIDUAL_VALUE_PERCENTAGES: Record<string, number> = {
    VEHICLE: 0.10,        // 10% para vehículos
    EQUIPMENT: 0.05,      // 5% para equipos
    FURNITURE: 0.05,      // 5% para muebles
    COMPUTER: 0.00,       // 0% para computadoras (obsolescencia)
    BUILDING: 0.20,       // 20% para edificios
    MACHINERY: 0.10,      // 10% para maquinaria
    OTHER: 0.05           // 5% por defecto
  }

  // Calcular valor residual automáticamente
  const calculateSuggestedResidualValue = (purchasePrice: number, category: string = 'VEHICLE') => {
    const percentage = RESIDUAL_VALUE_PERCENTAGES[category] || 0.10
    return Math.round(purchasePrice * percentage * 100) / 100
  }

  // Cuando cambia el precio de compra, actualizar valor residual sugerido
  const handlePurchasePriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    const suggestedResidual = calculateSuggestedResidualValue(price, 'VEHICLE')
    setNewAsset({
      ...newAsset,
      purchasePrice: value,
      salvageValue: suggestedResidual.toString()
    })
  }

  // ============================================
  // FÓRMULAS DE DEPRECIACIÓN DE VEHÍCULOS EN FLORIDA
  // Basado en IRS Publication 946 y MACRS
  // ============================================

  // Tasas de depreciación MACRS para vehículos (5 años) - IRS
  const MACRS_RATES = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576]

  // Verificar si el activo tiene datos de millas válidos
  const hasMileageData = (asset: Asset): boolean => {
    return !!(asset.currentMileage && asset.currentMileage > 0 && 
              asset.estimatedLifetimeMiles && asset.estimatedLifetimeMiles > 0)
  }

  // DEPRECIACIÓN POR MILLA (Unit of Production Method - Florida)
  // Esta función debe estar primero porque otras la usan
  const calculateDepreciationPerMile = (asset: Asset): number => {
    if (!asset.estimatedLifetimeMiles || asset.estimatedLifetimeMiles === 0) return 0
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    return depreciableAmount / asset.estimatedLifetimeMiles
  }

  // DEPRECIACIÓN ACUMULADA POR MILLAS
  // Esta función debe estar antes de las funciones mensuales/semanales
  const calculateMileageBasedDepreciation = (asset: Asset): number => {
    if (!asset.currentMileage) return 0
    const purchaseMileage = asset.purchaseMileage || 0
    const milesUsed = Math.max(0, asset.currentMileage - purchaseMileage)
    const depPerMile = calculateDepreciationPerMile(asset)
    const maxDep = asset.purchasePrice - asset.salvageValue
    return Math.min(milesUsed * depPerMile, maxDep)
  }

  // VALOR ACTUAL POR MILLAS
  const calculateCurrentValueByMileage = (asset: Asset): number => {
    const mileageDepreciation = calculateMileageBasedDepreciation(asset)
    const currentValue = asset.purchasePrice - mileageDepreciation
    return Math.max(currentValue, asset.salvageValue)
  }

  // Calcular meses transcurridos desde la compra
  const calculateMonthsOwned = (purchaseDate: string): number => {
    const purchase = new Date(purchaseDate)
    const now = new Date()
    const months = (now.getFullYear() - purchase.getFullYear()) * 12 + 
                   (now.getMonth() - purchase.getMonth())
    return Math.max(0, months)
  }

  // Calcular años completos de propiedad
  const calculateYearsOwned = (purchaseDate: string): number => {
    const months = calculateMonthsOwned(purchaseDate)
    return Math.floor(months / 12)
  }

  // DEPRECIACIÓN LÍNEA RECTA MENSUAL (Método estándar Florida/IRS)
  // Para vehículos con millas, calcula basado en millas usadas promedio por mes
  const calculateMonthlyDepreciation = (asset: Asset): number => {
    // Si tiene datos de millas, calcular basado en uso mensual promedio
    if (hasMileageData(asset)) {
      const monthsOwned = calculateMonthsOwned(asset.purchaseDate)
      if (monthsOwned === 0) return 0
      const totalMileageDepreciation = calculateMileageBasedDepreciation(asset)
      return totalMileageDepreciation / monthsOwned
    }
    // Fallback: línea recta por tiempo
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    const totalMonths = asset.usefulLife * 12
    if (totalMonths === 0) return 0
    return depreciableAmount / totalMonths
  }

  // DEPRECIACIÓN SEMANAL
  const calculateWeeklyDepreciation = (asset: Asset): number => {
    const monthlyDep = calculateMonthlyDepreciation(asset)
    return monthlyDep / 4.33 // Promedio de semanas por mes
  }

  // DEPRECIACIÓN DIARIA
  const calculateDailyDepreciation = (asset: Asset): number => {
    // Si tiene datos de millas, calcular basado en uso diario promedio
    if (hasMileageData(asset)) {
      const monthsOwned = calculateMonthsOwned(asset.purchaseDate)
      const daysOwned = monthsOwned * 30.44 // Promedio de días por mes
      if (daysOwned === 0) return 0
      const totalMileageDepreciation = calculateMileageBasedDepreciation(asset)
      return totalMileageDepreciation / daysOwned
    }
    // Fallback: línea recta por tiempo
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    const totalDays = asset.usefulLife * 365
    if (totalDays === 0) return 0
    return depreciableAmount / totalDays
  }

  // DEPRECIACIÓN ACUMULADA REAL (basada en tiempo transcurrido)
  const calculateTimeBasedAccumulatedDepreciation = (asset: Asset): number => {
    const monthsOwned = calculateMonthsOwned(asset.purchaseDate)
    const totalMonths = asset.usefulLife * 12
    const monthsToDepreciate = Math.min(monthsOwned, totalMonths)
    
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    const accumulatedDep = (depreciableAmount / totalMonths) * monthsToDepreciate
    
    return Math.min(accumulatedDep, depreciableAmount) // No exceder el monto depreciable
  }

  // DEPRECIACIÓN ACUMULADA - USA MILLAS SI ESTÁN DISPONIBLES
  const calculateRealAccumulatedDepreciation = (asset: Asset): number => {
    // Para vehículos con datos de millas, usar depreciación por millas
    if (hasMileageData(asset)) {
      return calculateMileageBasedDepreciation(asset)
    }
    // Fallback a depreciación por tiempo
    return calculateTimeBasedAccumulatedDepreciation(asset)
  }

  // VALOR EN LIBROS REAL (calculado) - USA MILLAS SI ESTÁN DISPONIBLES
  const calculateRealBookValue = (asset: Asset): number => {
    // Para vehículos con datos de millas, usar valor por millas
    if (hasMileageData(asset)) {
      return calculateCurrentValueByMileage(asset)
    }
    // Fallback a valor por tiempo
    const accumulatedDep = calculateTimeBasedAccumulatedDepreciation(asset)
    const bookValue = asset.purchasePrice - accumulatedDep
    return Math.max(bookValue, asset.salvageValue) // No menor al valor residual
  }

  // PORCENTAJE DE DEPRECIACIÓN REAL
  const calculateRealDepreciationPercentage = (asset: Asset): string => {
    if (asset.purchasePrice === 0) return '0.0'
    const accumulatedDep = calculateRealAccumulatedDepreciation(asset)
    const depreciableAmount = asset.purchasePrice - asset.salvageValue
    if (depreciableAmount === 0) return '100.0'
    return ((accumulatedDep / depreciableAmount) * 100).toFixed(1)
  }

  // DEPRECIACIÓN MACRS (Acelerada - IRS para vehículos de negocio)
  const calculateMACRSDepreciation = (asset: Asset): number => {
    const yearsOwned = calculateYearsOwned(asset.purchaseDate)
    if (yearsOwned >= MACRS_RATES.length) return asset.purchasePrice - asset.salvageValue
    
    let totalDep = 0
    for (let i = 0; i <= yearsOwned && i < MACRS_RATES.length; i++) {
      totalDep += asset.purchasePrice * MACRS_RATES[i]
    }
    return Math.min(totalDep, asset.purchasePrice - asset.salvageValue)
  }

  // VALOR RESIDUAL CON MACRS
  const calculateMACRSBookValue = (asset: Asset): number => {
    const macrsDep = calculateMACRSDepreciation(asset)
    return Math.max(asset.purchasePrice - macrsDep, asset.salvageValue)
  }

  // VALOR EN LIBROS (usar el real calculado, no el de BD)
  const calculateRemainingValue = (asset: Asset): number => {
    return calculateRealBookValue(asset)
  }

  // PORCENTAJE DE DEPRECIACIÓN (usar el real)
  const calculateDepreciationPercentage = (asset: Asset): string => {
    return calculateRealDepreciationPercentage(asset)
  }

  // TIEMPO RESTANTE DE VIDA ÚTIL
  const calculateRemainingLifeMonths = (asset: Asset): number => {
    const monthsOwned = calculateMonthsOwned(asset.purchaseDate)
    const totalMonths = asset.usefulLife * 12
    return Math.max(0, totalMonths - monthsOwned)
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

  // Calculate stats - using REAL calculated depreciation values (not DB values)
  // Memoized to prevent unnecessary recalculations on each render
  const stats = useMemo(() => ({
    totalVehicles: filteredAssets.length,
    activeVehicles: filteredAssets.filter(a => a.status === 'ACTIVE').length,
    totalValue: filteredAssets.reduce((sum, a) => sum + a.purchasePrice, 0),
    // Use real calculated book value (not DB value which is always 0)
    currentValue: filteredAssets.reduce((sum, a) => sum + calculateRealBookValue(a), 0),
    // Use real calculated accumulated depreciation
    totalDepreciation: filteredAssets.reduce((sum, a) => sum + calculateRealAccumulatedDepreciation(a), 0),
    monthlyDepreciation: filteredAssets.reduce((sum, a) => sum + calculateMonthlyDepreciation(a), 0),
    weeklyDepreciation: filteredAssets.reduce((sum, a) => sum + calculateWeeklyDepreciation(a), 0)
  }), [filteredAssets])

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
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Depreciación</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  ${stats.monthlyDepreciation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}<span className="text-sm font-normal text-gray-500">/mes</span>
                </p>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                    ${stats.weeklyDepreciation.toFixed(2)}/sem
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                    Total: ${stats.totalDepreciation.toFixed(2)}
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
                    <div className="lg:w-72 space-y-2">
                      {/* Millas - SIEMPRE VISIBLE con botón de actualizar */}
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-900">MILLAJE ACTUAL</span>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                          {(asset.currentMileage || 0).toLocaleString('es-MX')} mi
                        </p>
                        <div className="flex justify-between text-xs text-purple-700 mt-1">
                          <span>Compra: {(asset.purchaseMileage || 0).toLocaleString()} mi</span>
                          <span>Usadas: {((asset.currentMileage || 0) - (asset.purchaseMileage || 0)).toLocaleString()} mi</span>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Vida útil: {(asset.estimatedLifetimeMiles || 200000).toLocaleString()} mi
                        </p>
                        {asset.lastMileageUpdate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Última actualización: {new Date(asset.lastMileageUpdate).toLocaleDateString('es-MX')}
                          </p>
                        )}
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">DEPRECIACIÓN</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">
                          ${calculateMonthlyDepreciation(asset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}<span className="text-xs font-normal">/mes</span>
                        </p>
                        <p className="text-sm font-semibold text-orange-600">
                          ${calculateWeeklyDepreciation(asset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}<span className="text-xs font-normal">/semana</span>
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

                      {/* Botón Actualizar Millaje */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 shadow-md"
                        onClick={() => {
                          setSelectedAsset(asset)
                          setShowMileageModal(true)
                        }}
                      >
                        <Gauge className="w-4 h-4 mr-2" />
                        📍 Actualizar Millas Hoy
                      </Button>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedAsset(asset)
                            setShowViewModal(true)
                          }}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedAsset(asset)
                            setShowEditModal(true)
                          }}
                          title="Editar vehículo"
                        >
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
                        onChange={(e) => handlePurchasePriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Residual (10% automático)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={newAsset.salvageValue}
                          onChange={(e) => setNewAsset({ ...newAsset, salvageValue: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {newAsset.purchasePrice && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            Sugerido: ${calculateSuggestedResidualValue(parseFloat(newAsset.purchasePrice) || 0, 'VEHICLE').toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Se calcula automáticamente (10% del precio para vehículos según IRS)
                      </p>
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

                  {/* Sección de Millas */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Gauge className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-900">Información de Millaje (Opcional)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Millas al Comprar
                        </label>
                        <input
                          type="number"
                          value={newAsset.purchaseMileage}
                          onChange={(e) => setNewAsset({ ...newAsset, purchaseMileage: e.target.value, currentMileage: e.target.value })}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Millas Actuales
                        </label>
                        <input
                          type="number"
                          value={newAsset.currentMileage}
                          onChange={(e) => setNewAsset({ ...newAsset, currentMileage: e.target.value })}
                          placeholder="Ej: 125000"
                          min="0"
                          max="999999"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vida Útil (millas)
                        </label>
                        <input
                          type="number"
                          value={newAsset.estimatedLifetimeMiles}
                          onChange={(e) => setNewAsset({ ...newAsset, estimatedLifetimeMiles: e.target.value })}
                          placeholder="200000"
                          min="0"
                          max="999999"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      💡 Con las millas podemos calcular depreciación por uso real del vehículo
                    </p>
                  </div>

                  {/* VIN y Año */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Año del Modelo
                      </label>
                      <input
                        type="number"
                        value={newAsset.yearModel}
                        onChange={(e) => setNewAsset({ ...newAsset, yearModel: e.target.value })}
                        placeholder="2024"
                        min="1900"
                        max="2100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        VIN (Número de Serie)
                      </label>
                      <input
                        type="text"
                        value={newAsset.vin}
                        onChange={(e) => setNewAsset({ ...newAsset, vin: e.target.value.toUpperCase() })}
                        placeholder="1GNSCBKD8PR351862"
                        maxLength={17}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Método de Depreciación</p>
                        <p className="text-blue-700">
                          Se utilizará el método de <strong>Línea Recta</strong> para calcular la depreciación mensual y semanal.
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

        {/* VIEW MODAL - Ver Detalles de Depreciación */}
        {showViewModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-6 h-6 text-blue-600" />
                    {selectedAsset.name}
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedAsset(null)
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedAsset.description}</p>
              </CardHeader>
              <CardContent className="p-6">
                {/* Información General */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Fecha de Compra</span>
                      <p className="font-semibold">{new Date(selectedAsset.purchaseDate).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Meses de Uso</span>
                      <p className="font-semibold">{calculateMonthsOwned(selectedAsset.purchaseDate)} meses</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Años de Uso</span>
                      <p className="font-semibold">{calculateYearsOwned(selectedAsset.purchaseDate)} años</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Vida Útil</span>
                      <p className="font-semibold">{selectedAsset.usefulLife} años</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Vida Útil Restante</span>
                      <p className="font-semibold">{calculateRemainingLifeMonths(selectedAsset)} meses</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">Estado</span>
                      <p className="font-semibold capitalize">{selectedAsset.status === 'ACTIVE' ? 'Activo' : selectedAsset.status}</p>
                    </div>
                  </div>
                </div>

                {/* Valores Financieros */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Valores Financieros
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-xs text-blue-600 font-medium">PRECIO DE COMPRA</span>
                      <p className="text-xl font-bold text-blue-900">
                        ${selectedAsset.purchasePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-xs text-amber-600 font-medium">DEPRECIACIÓN ACUM.</span>
                      <p className="text-xl font-bold text-amber-900">
                        ${calculateRealAccumulatedDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-xs text-emerald-600 font-medium">VALOR ACTUAL</span>
                      <p className="text-xl font-bold text-emerald-900">
                        ${calculateRealBookValue(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-xs text-gray-600 font-medium">VALOR RESIDUAL</span>
                      <p className="text-xl font-bold text-gray-900">
                        ${selectedAsset.salvageValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tasas de Depreciación */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    Tasas de Depreciación (Línea Recta - Florida/IRS)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <span className="text-xs text-red-600 font-medium block mb-1">% DEPRECIADO</span>
                      <p className="text-3xl font-bold text-red-700">
                        {calculateRealDepreciationPercentage(selectedAsset)}%
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                      <span className="text-xs text-orange-600 font-medium block mb-1">MENSUAL</span>
                      <p className="text-lg font-bold text-orange-700">
                        ${calculateMonthlyDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <span className="text-xs text-yellow-700 font-medium block mb-1">SEMANAL</span>
                      <p className="text-lg font-bold text-yellow-700">
                        ${calculateWeeklyDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-lime-50 border border-lime-200 rounded-lg text-center">
                      <span className="text-xs text-lime-700 font-medium block mb-1">DIARIA</span>
                      <p className="text-lg font-bold text-lime-700">
                        ${calculateDailyDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Depreciación por Millas (si aplica) */}
                {selectedAsset.estimatedLifetimeMiles && selectedAsset.estimatedLifetimeMiles > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-purple-600" />
                      Depreciación por Millas (Unit of Production)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <span className="text-xs text-purple-600 font-medium">POR MILLA</span>
                        <p className="text-lg font-bold text-purple-900">
                          ${calculateDepreciationPerMile(selectedAsset).toFixed(3)}
                        </p>
                      </div>
                      <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                        <span className="text-xs text-violet-600 font-medium">MILLAS USADAS</span>
                        <p className="text-lg font-bold text-violet-900">
                          {((selectedAsset.currentMileage || 0) - (selectedAsset.purchaseMileage || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-lg">
                        <span className="text-xs text-fuchsia-600 font-medium">DEP. POR MILLAS</span>
                        <p className="text-lg font-bold text-fuchsia-900">
                          ${calculateMileageBasedDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                        <span className="text-xs text-pink-600 font-medium">VALOR (MILLAS)</span>
                        <p className="text-lg font-bold text-pink-900">
                          ${calculateCurrentValueByMileage(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Depreciación MACRS */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    Depreciación MACRS (IRS Acelerada - 5 años)
                  </h3>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-indigo-600 font-medium">TASAS MACRS</span>
                        <p className="text-sm text-indigo-700">
                          Año 1: 20% | Año 2: 32% | Año 3: 19.2%<br/>
                          Año 4: 11.52% | Año 5: 11.52% | Año 6: 5.76%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-indigo-600 font-medium">DEP. ACUM. MACRS</span>
                        <p className="text-xl font-bold text-indigo-900">
                          ${calculateMACRSDepreciation(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-indigo-600 font-medium">VALOR MACRS</span>
                        <p className="text-xl font-bold text-indigo-900">
                          ${calculateMACRSBookValue(selectedAsset).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-indigo-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>El método MACRS es utilizado por el IRS para depreciación acelerada de vehículos de negocio. Permite deducciones mayores en los primeros años.</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedAsset(null)
                    }}
                    className="flex-1"
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowViewModal(false)
                      setShowEditModal(true)
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Vehículo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EDIT MODAL - Editar Vehículo */}
        {showEditModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-6 h-6 text-amber-600" />
                    Editar Vehículo
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedAsset(null)
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    
                    try {
                      const response = await fetch(`/api/accounting/assets/${selectedAsset.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: formData.get('name'),
                          description: formData.get('description'),
                          currentMileage: parseInt(formData.get('currentMileage') as string) || null,
                          purchaseMileage: parseInt(formData.get('purchaseMileage') as string) || null,
                          estimatedLifetimeMiles: parseInt(formData.get('estimatedLifetimeMiles') as string) || 200000,
                          salvageValue: parseFloat(formData.get('salvageValue') as string) || 0,
                          status: formData.get('status'),
                          usefulLife: parseInt(formData.get('usefulLife') as string) || 5
                        })
                      })
                      
                      if (response.ok) {
                        setMessage({ type: 'success', text: 'Vehículo actualizado exitosamente' })
                        loadAssets()
                        setShowEditModal(false)
                        setSelectedAsset(null)
                      } else {
                        const error = await response.json()
                        setMessage({ type: 'error', text: error.error || 'Error al actualizar el vehículo' })
                      }
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Error de conexión' })
                    }
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Vehículo *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={selectedAsset.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="description"
                      defaultValue={selectedAsset.description || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Millaje Actual
                      </label>
                      <input
                        type="number"
                        name="currentMileage"
                        defaultValue={selectedAsset.currentMileage || ''}
                        min="0"
                        max="999999"
                        placeholder="Ej: 125000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Millas del odómetro actual</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Millaje de Compra
                      </label>
                      <input
                        type="number"
                        name="purchaseMileage"
                        defaultValue={selectedAsset.purchaseMileage || ''}
                        min="0"
                        max="999999"
                        placeholder="Ej: 50000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Millas al momento de compra</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Millas de Vida Útil
                      </label>
                      <input
                        type="number"
                        name="estimatedLifetimeMiles"
                        defaultValue={selectedAsset.estimatedLifetimeMiles || 200000}
                        min="0"
                        max="999999"
                        placeholder="200000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Total millas esperadas del vehículo</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Residual
                      </label>
                      <input
                        type="number"
                        name="salvageValue"
                        defaultValue={selectedAsset.salvageValue}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vida Útil (años)
                      </label>
                      <select
                        name="usefulLife"
                        defaultValue={selectedAsset.usefulLife}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="3">3 años</option>
                        <option value="5">5 años (IRS estándar)</option>
                        <option value="7">7 años</option>
                        <option value="10">10 años</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        name="status"
                        defaultValue={selectedAsset.status}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="ACTIVE">Activo</option>
                        <option value="DISPOSED">Vendido/Desechado</option>
                        <option value="FULLY_DEPRECIATED">Totalmente Depreciado</option>
                      </select>
                    </div>
                  </div>

                  {/* Información de solo lectura */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Información Original (Solo Lectura)</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Fecha de Compra:</span>
                        <span className="ml-2 font-medium">{new Date(selectedAsset.purchaseDate).toLocaleDateString('es-MX')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Precio de Compra:</span>
                        <span className="ml-2 font-medium">${selectedAsset.purchasePrice.toLocaleString('es-MX')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false)
                        setSelectedAsset(null)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MILEAGE UPDATE MODAL - Actualización Rápida de Millaje */}
        {showMileageModal && selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-md my-2 sm:my-4 max-h-[95vh] overflow-y-auto">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-violet-50 p-3 sm:p-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Gauge className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    Actualizar Millaje
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowMileageModal(false)
                      setSelectedAsset(null)
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{selectedAsset.name}</p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const newMileage = parseInt(formData.get('currentMileage') as string) || 0
                    const newLifetimeMiles = parseInt(formData.get('estimatedLifetimeMiles') as string) || undefined
                    const newPurchaseMileage = parseInt(formData.get('purchaseMileage') as string) || undefined
                    
                    console.log('Form Data:', {
                      currentMileage: newMileage,
                      estimatedLifetimeMiles: newLifetimeMiles,
                      purchaseMileage: newPurchaseMileage
                    })
                    
                    await handleUpdateMileage(selectedAsset.id, newMileage, newLifetimeMiles, newPurchaseMileage)
                  }} 
                  className="space-y-3 sm:space-y-4"
                >
                  {/* Información actual - Compacta en móvil */}
                  <div className="p-2 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2 text-xs sm:text-sm">📊 Valores Actuales</h4>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] sm:text-xs">Millaje Actual</span>
                        <span className="font-bold text-purple-700">
                          {selectedAsset.currentMileage?.toLocaleString() || '0'} mi
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] sm:text-xs">Vida Útil</span>
                        <span className="font-bold text-purple-700">
                          {selectedAsset.estimatedLifetimeMiles?.toLocaleString() || '200,000'} mi
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] sm:text-xs">Compra</span>
                        <span className="font-medium">
                          {selectedAsset.purchaseMileage?.toLocaleString() || '0'} mi
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] sm:text-xs">Usadas</span>
                        <span className="font-medium">
                          {((selectedAsset.currentMileage || 0) - (selectedAsset.purchaseMileage || 0)).toLocaleString()} mi
                        </span>
                      </div>
                    </div>
                    {selectedAsset.lastMileageUpdate && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-2 border-t pt-2">
                        🕐 {new Date(selectedAsset.lastMileageUpdate).toLocaleDateString('es-MX', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Título de actualización - Más compacto */}
                  <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-2 sm:p-3 rounded-lg text-center">
                    <p className="font-semibold text-sm sm:text-base">📍 Millaje de Hoy</p>
                    <p className="text-[10px] sm:text-xs opacity-90">{new Date().toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>

                  {/* Campo principal de millaje */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      🚗 Odómetro *
                    </label>
                    <input
                      type="number"
                      name="currentMileage"
                      defaultValue={selectedAsset.currentMileage || ''}
                      placeholder="Ej: 125000"
                      min="0"
                      max="999999"
                      required
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xl sm:text-2xl font-bold text-center"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">Millas exactas (ej: 112500)</p>
                  </div>

                  {/* Campos secundarios */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                        Compra
                      </label>
                      <input
                        type="number"
                        name="purchaseMileage"
                        defaultValue={selectedAsset.purchaseMileage || 0}
                        placeholder="50000"
                        min="0"
                        max="999999"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                        Vida Útil
                      </label>
                      <input
                        type="number"
                        name="estimatedLifetimeMiles"
                        defaultValue={selectedAsset.estimatedLifetimeMiles || 200000}
                        placeholder="200000"
                        min="0"
                        max="999999"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Vista previa - Más compacta */}
                  <div className="p-2 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                      <div className="text-xs sm:text-sm text-green-900">
                        <p className="font-semibold">✓ Se recalculará automáticamente</p>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2 pt-2 sm:pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowMileageModal(false)
                        setSelectedAsset(null)
                      }}
                      className="flex-1 text-sm sm:text-base py-2 sm:py-3"
                      disabled={updatingMileage}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold shadow-lg text-sm sm:text-base py-2 sm:py-3"
                      disabled={updatingMileage}
                    >
                      {updatingMileage ? (
                        <>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          💾 Guardar
                        </>
                      )}
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

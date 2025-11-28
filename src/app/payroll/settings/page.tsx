'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Settings,
  Save,
  DollarSign,
  Percent,
  Building2,
  Users,
  Clock,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react'

interface PayrollConfig {
  // Tax rates
  isrRate: number
  imssEmployeeRate: number
  imssEmployerRate: number
  infonavitRate: number
  
  // Working hours
  regularHoursPerWeek: number
  overtimeMultiplier: number
  holidayMultiplier: number
  
  // Pay periods
  defaultPayPeriod: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEMIMONTHLY'
  payDayOfWeek: number // 0-6 for weekly, 1-31 for monthly
  
  // Benefits
  vacationDaysPerYear: number
  christmasBonusDays: number
  
  // Company info
  companyName: string
  rfc: string
  imssRegistro: string
}

interface DeductionType {
  id: string
  name: string
  type: 'FIXED' | 'PERCENTAGE'
  value: number
  isActive: boolean
}

export default function PayrollSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'taxes' | 'deductions' | 'company'>('general')
  
  const [config, setConfig] = useState<PayrollConfig>({
    isrRate: 0.10,
    imssEmployeeRate: 0.03,
    imssEmployerRate: 0.07,
    infonavitRate: 0.05,
    regularHoursPerWeek: 48,
    overtimeMultiplier: 2,
    holidayMultiplier: 3,
    defaultPayPeriod: 'BIWEEKLY',
    payDayOfWeek: 15,
    vacationDaysPerYear: 12,
    christmasBonusDays: 15,
    companyName: '',
    rfc: '',
    imssRegistro: ''
  })

  const [deductions, setDeductions] = useState<DeductionType[]>([])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payroll/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.config) setConfig(data.config)
        if (data.deductions) setDeductions(data.deductions)
      }
    } catch (error) {
      console.error('Error loading payroll settings:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const [showNewDeduction, setShowNewDeduction] = useState(false)
  const [newDeduction, setNewDeduction] = useState({
    name: '',
    type: 'PERCENTAGE' as const,
    value: 0
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/payroll/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          deductions
        })
      })
      
      if (response.ok) {
        alert('Configuración guardada exitosamente')
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      alert('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const addDeduction = () => {
    if (!newDeduction.name || newDeduction.value <= 0) {
      alert('Por favor complete todos los campos')
      return
    }

    const deduction: DeductionType = {
      id: Date.now().toString(),
      name: newDeduction.name,
      type: newDeduction.type,
      value: newDeduction.value,
      isActive: true
    }

    setDeductions(prev => [...prev, deduction])
    setNewDeduction({ name: '', type: 'PERCENTAGE', value: 0 })
    setShowNewDeduction(false)
  }

  const toggleDeduction = (id: string) => {
    setDeductions(prev => prev.map(d => 
      d.id === id ? { ...d, isActive: !d.isActive } : d
    ))
  }

  const deleteDeduction = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta deducción?')) {
      setDeductions(prev => prev.filter(d => d.id !== id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'taxes', label: 'Impuestos', icon: Percent },
    { id: 'deductions', label: 'Deducciones', icon: DollarSign },
    { id: 'company', label: 'Empresa', icon: Building2 },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/payroll')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración de Nómina</h1>
              <p className="text-sm text-gray-500">
                Configura impuestos, deducciones y parámetros de nómina
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horario de Trabajo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Horas por Semana
                  </label>
                  <Input
                    type="number"
                    value={config.regularHoursPerWeek}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      regularHoursPerWeek: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Multiplicador Tiempo Extra
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.overtimeMultiplier}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      overtimeMultiplier: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El tiempo extra se paga {config.overtimeMultiplier}x
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Multiplicador Día Festivo
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.holidayMultiplier}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      holidayMultiplier: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Período de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Frecuencia de Pago
                  </label>
                  <select
                    value={config.defaultPayPeriod}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      defaultPayPeriod: e.target.value as any 
                    }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quincenal</option>
                    <option value="SEMIMONTHLY">Catorcenal</option>
                    <option value="MONTHLY">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Día de Pago
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={config.payDayOfWeek}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      payDayOfWeek: parseInt(e.target.value) || 1 
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Día del mes para pago
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Prestaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Días de Vacaciones por Año
                  </label>
                  <Input
                    type="number"
                    value={config.vacationDaysPerYear}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      vacationDaysPerYear: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo legal: 12 días el primer año
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Días de Aguinaldo
                  </label>
                  <Input
                    type="number"
                    value={config.christmasBonusDays}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      christmasBonusDays: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo legal: 15 días
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Taxes Tab */}
        {activeTab === 'taxes' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ISR (Impuesto Sobre la Renta)</CardTitle>
                <CardDescription>
                  Retención de impuesto sobre la renta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tasa de Retención (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={config.isrRate * 100}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        isrRate: (parseFloat(e.target.value) || 0) / 100
                      }))}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tasa simplificada. Para cálculo real usar tablas del SAT.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>IMSS (Seguro Social)</CardTitle>
                <CardDescription>
                  Cuotas obrero-patronales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cuota Trabajador (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={config.imssEmployeeRate * 100}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        imssEmployeeRate: (parseFloat(e.target.value) || 0) / 100
                      }))}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cuota Patrón (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={config.imssEmployerRate * 100}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        imssEmployerRate: (parseFloat(e.target.value) || 0) / 100
                      }))}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>INFONAVIT</CardTitle>
                <CardDescription>
                  Aportaciones patronales para vivienda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Aportación Patrón (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={config.infonavitRate * 100}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        infonavitRate: (parseFloat(e.target.value) || 0) / 100
                      }))}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tasa legal: 5% del salario integrado
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Resumen de Tasas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ISR Trabajador:</span>
                    <span className="font-bold">{(config.isrRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMSS Trabajador:</span>
                    <span className="font-bold">{(config.imssEmployeeRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMSS Patrón:</span>
                    <span className="font-bold">{(config.imssEmployerRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>INFONAVIT Patrón:</span>
                    <span className="font-bold">{(config.infonavitRate * 100).toFixed(2)}%</span>
                  </div>
                  <hr className="my-2 border-blue-200" />
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>Total Deducción Trabajador:</span>
                    <span>{((config.isrRate + config.imssEmployeeRate) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>Total Carga Patronal:</span>
                    <span>{((config.imssEmployerRate + config.infonavitRate) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deductions Tab */}
        {activeTab === 'deductions' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tipos de Deducciones</CardTitle>
                  <CardDescription>
                    Configura las deducciones disponibles para nómina
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewDeduction(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Deducción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deductions.map(deduction => (
                  <div 
                    key={deduction.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      deduction.isActive ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleDeduction(deduction.id)}
                        className={`p-1 rounded-full ${
                          deduction.isActive 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {deduction.isActive ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <p className={`font-medium ${!deduction.isActive && 'text-gray-400'}`}>
                          {deduction.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {deduction.type === 'PERCENTAGE' 
                            ? `${deduction.value}% del salario`
                            : formatCurrency(deduction.value) + ' fijo'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        deduction.type === 'PERCENTAGE' 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }>
                        {deduction.type === 'PERCENTAGE' ? 'Porcentaje' : 'Fijo'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteDeduction(deduction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* New Deduction Modal */}
              {showNewDeduction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Nueva Deducción</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <Input
                          placeholder="Nombre de la deducción"
                          value={newDeduction.name}
                          onChange={(e) => setNewDeduction(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <select
                          value={newDeduction.type}
                          onChange={(e) => setNewDeduction(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="PERCENTAGE">Porcentaje</option>
                          <option value="FIXED">Monto Fijo</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {newDeduction.type === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto ($)'}
                        </label>
                        <Input
                          type="number"
                          step={newDeduction.type === 'PERCENTAGE' ? '0.01' : '1'}
                          value={newDeduction.value}
                          onChange={(e) => setNewDeduction(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="outline" onClick={() => setShowNewDeduction(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={addDeduction}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Company Tab */}
        {activeTab === 'company' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Datos fiscales para recibos de nómina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Razón Social
                </label>
                <Input
                  value={config.companyName}
                  onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  RFC
                </label>
                <Input
                  value={config.rfc}
                  onChange={(e) => setConfig(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                  placeholder="RFC de la empresa"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Registro Patronal IMSS
                </label>
                <Input
                  value={config.imssRegistro}
                  onChange={(e) => setConfig(prev => ({ ...prev, imssRegistro: e.target.value }))}
                  placeholder="Ej: Y12-34567-8"
                />
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Importante</h4>
                    <p className="text-sm text-yellow-700">
                      Esta información aparecerá en los recibos de nómina y declaraciones.
                      Asegúrese de que los datos sean correctos.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

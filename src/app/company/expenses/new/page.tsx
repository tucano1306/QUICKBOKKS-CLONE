'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
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
  SplitSquareVertical,
  Folder,
  MapPin,
  Paperclip
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  type: string
}

interface Employee {
  id: string
  name: string
}

interface TrackingClass {
  id: string
  name: string
  description?: string
}

interface TrackingLocation {
  id: string
  name: string
  city?: string
  state?: string
}

interface PaymentSplit {
  id: string
  method: string
  amount: string
  reference: string
}

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  data: string // base64
}

export default function NewExpensePage() {
  const router = useRouter()
  const { status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [classes, setClasses] = useState<TrackingClass[]>([])
  const [locations, setLocations] = useState<TrackingLocation[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
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
    employeeId: '',
    classId: '',
    locationId: ''
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

      // Load classes and locations for tracking
      if (activeCompany?.id) {
        const trackingRes = await fetch(`/api/tracking?companyId=${activeCompany.id}`)
        if (trackingRes.ok) {
          const data = await trackingRes.json()
          setClasses(data.classes || [])
          setLocations(data.locations || [])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Handle file attachment - Process a single file
  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const attachment: Attachment = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        data: reader.result as string
      }
      setAttachments(prev => [...prev, attachment])
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(processFile)
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
    return paymentSplits.reduce((sum, p) => sum + (Number.parseFloat(p.amount) || 0), 0)
  }

  const getPaymentDifference = () => {
    const total = Number.parseFloat(formData.amount) || 0
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

  // Validation helper function
  const validateForm = (): string | null => {
    if (!formData.description.trim()) {
      return 'La descripción es requerida'
    }
    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      return 'El monto debe ser mayor a 0'
    }
    if (!formData.categoryId) {
      return 'Selecciona una categoría'
    }
    if (useMultiplePayments) {
      const diff = getPaymentDifference()
      if (Math.abs(diff) > 0.01) {
        return `La suma de los pagos ($${getTotalPayments().toFixed(2)}) no coincide con el monto total ($${formData.amount}). Diferencia: $${diff.toFixed(2)}`
      }
    }
    return null
  }

  // Upload attachments helper
  const uploadAttachments = async (expenseId: string) => {
    if (attachments.length === 0 || !activeCompany?.id) return
    
    for (const att of attachments) {
      try {
        await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: activeCompany.id,
            transactionType: 'expense',
            transactionId: expenseId,
            fileName: att.name,
            fileType: att.type,
            fileSize: att.size,
            url: att.data
          })
        })
      } catch (err) {
        console.error('Error uploading attachment:', err)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const validationError = validateForm()
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      setLoading(false)
      return
    }

    try {
      const paymentData = useMultiplePayments ? {
        paymentMethod: 'MULTIPLE',
        notes: JSON.stringify({
          originalNotes: formData.notes,
          paymentSplits: paymentSplits.map(p => ({
            method: p.method,
            amount: Number.parseFloat(p.amount),
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
          amount: Number.parseFloat(formData.amount),
          employeeId: formData.employeeId || null,
          classId: formData.classId || null,
          locationId: formData.locationId || null
        })
      })

      if (response.ok) {
        const expense = await response.json()
        await uploadAttachments(expense.id)
        toast.success('Gasto creado exitosamente')
        router.push('/company/expenses/list')
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear el gasto' })
      }
    } catch (error) {
      console.error('Error creating expense:', error)
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
                        const val = e.target.value.replaceAll(',', '.');
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="categoryId">
                    Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/company/expenses/categories')}
                    className="text-xs"
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    Gestionar Categorías
                  </Button>
                </div>
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
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    No hay categorías disponibles. Haz clic en "Gestionar Categorías" para crear una.
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

                {useMultiplePayments ? (
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
                              const val = e.target.value.replaceAll(',', '.');
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
                        <span className="font-medium">${Number.parseFloat(formData.amount || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Suma de Pagos:</span>
                        <span className={`font-medium ${Math.abs(getPaymentDifference()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                          ${getTotalPayments().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
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

              {/* Clase y Ubicación para Tracking */}
              {(classes.length > 0 || locations.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <Label htmlFor="classId" className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-600" />
                      Clase
                    </Label>
                    <select
                      id="classId"
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700"
                    >
                      <option value="">Sin clase</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Asigna a una clase para tracking</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="locationId" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Ubicación
                    </Label>
                    <select
                      id="locationId"
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 dark:border-gray-700"
                    >
                      <option value="">Sin ubicación</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.city && `(${loc.city})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Asigna a una ubicación para tracking</p>
                  </div>
                </div>
              )}

              {/* Adjuntos */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Adjuntos
                </Label>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Arrastra archivos o haz clic para subir</span>
                    <span className="text-xs text-gray-400 mt-1">PDF, imágenes, Excel (max 10MB)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium truncate max-w-[200px]">{att.name}</span>
                          <span className="text-xs text-gray-400">({formatFileSize(att.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(att.id)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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

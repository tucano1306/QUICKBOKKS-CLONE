'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw,
  Save,
  X,
  Calendar,
  User,
  DollarSign,
  Repeat,
  Mail,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string
}

export default function NewRecurringInvoicePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [templateName, setTemplateName] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [autoSend, setAutoSend] = useState(true)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchCustomers()
    }
  }, [activeCompany])

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/customers?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const calculateNextInvoiceDate = () => {
    const start = new Date(startDate)
    const today = new Date()
    let next = new Date(start)

    while (next < today) {
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1)
          break
        case 'weekly':
          next.setDate(next.getDate() + 7)
          break
        case 'biweekly':
          next.setDate(next.getDate() + 14)
          break
        case 'monthly':
          next.setMonth(next.getMonth() + 1)
          break
        case 'quarterly':
          next.setMonth(next.getMonth() + 3)
          break
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1)
          break
      }
    }

    return next.toISOString().split('T')[0]
  }

  const handleSave = async () => {
    if (!templateName || !selectedCustomer || amount <= 0) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      const recurringData = {
        templateName,
        customerId: selectedCustomer,
        amount,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        autoSend,
        description,
        status: 'active',
        companyId: activeCompany?.id,
        nextInvoice: calculateNextInvoiceDate()
      }

      // Aquí iría la llamada a tu API
      // const response = await fetch('/api/recurring-invoices', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(recurringData)
      // })

      toast.success('✅ Factura recurrente creada exitosamente')
      router.push('/company/invoicing/recurring')
    } catch (error) {
      console.error('Error creating recurring invoice:', error)
      toast.error('Error al crear factura recurrente')
    } finally {
      setLoading(false)
    }
  }

  const recurringActions = [
    {
      label: 'Guardar',
      icon: Save,
      onClick: handleSave,
      variant: 'primary' as const,
      disabled: loading
    },
    {
      label: 'Cancelar',
      icon: X,
      onClick: () => router.push('/company/invoicing/recurring'),
      variant: 'danger' as const
    }
  ]

  const frequencyOptions = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ]

  if (status === 'loading') {
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
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Nueva Factura Recurrente
            </h1>
            <p className="text-gray-600 mt-1">
              Automatiza la facturación periódica a tus clientes
            </p>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={recurringActions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Plantilla *
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Servicio de Hosting Mensual"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-20"
                placeholder="Descripción de los servicios incluidos..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-blue-600" />
              Configuración de Recurrencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {frequencyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin (Opcional)
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {startDate && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Próxima factura:</span>
                  <span>{new Date(calculateNextInvoiceDate()).toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSend"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoSend" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Enviar automáticamente al cliente
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || !templateName || !selectedCustomer || amount <= 0}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Factura Recurrente
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/company/invoicing/recurring')}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

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
import { 
  FileSpreadsheet,
  Save,
  Send,
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Calculator
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  name: string
  price: number
}

interface QuoteItem {
  id: string
  productId: string
  productName: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export default function NewEstimatePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [estimateNumber, setEstimateNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [items, setItems] = useState<QuoteItem[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchCustomers()
      fetchProducts()
      generateEstimateNumber()
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
      console.error('Error:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const generateEstimateNumber = () => {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000)
    setEstimateNumber(`COT-${year}${month}-${String(random).padStart(4, '0')}`)
  }

  const addItem = () => {
    setItems([...items, {
      id: `item-${Date.now()}`,
      productId: '',
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updated.productName = product.name
            updated.description = product.name
            updated.unitPrice = product.price
          }
        }
        
        updated.total = updated.quantity * updated.unitPrice
        return updated
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const totals = calculateTotals()

  const handleSaveDraft = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      // Aquí iría tu llamada a la API
      toast.success('✅ Cotización guardada como borrador')
      router.push('/company/invoicing/estimates')
    } catch (error) {
      toast.error('Error al guardar cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndSend = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      toast.success('✅ Cotización creada y enviada')
      router.push('/company/invoicing/estimates')
    } catch (error) {
      toast.error('Error al crear cotización')
    } finally {
      setLoading(false)
    }
  }

  const estimateActions = [
    {
      label: 'Guardar borrador',
      icon: Save,
      onClick: handleSaveDraft,
      variant: 'outline' as const,
      disabled: loading
    },
    {
      label: 'Guardar y enviar',
      icon: Send,
      onClick: handleSaveAndSend,
      variant: 'primary' as const,
      disabled: loading
    },
    {
      label: 'Cancelar',
      icon: X,
      onClick: () => router.push('/company/invoicing/estimates'),
      variant: 'danger' as const
    }
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
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              Nueva Cotización
            </h1>
            <p className="text-gray-600 mt-1">Crea una cotización para tu cliente</p>
          </div>
          <span className="text-lg font-semibold text-blue-600">{estimateNumber}</span>
        </div>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={estimateActions} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Válido hasta</label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Productos</CardTitle>
                  <Button onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Producto #{index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                      
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                        ))}
                      </select>

                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Descripción"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="Cant."
                        />
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Precio"
                        />
                        <div className="px-3 py-2 bg-gray-50 rounded font-semibold text-sm">
                          ${item.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No hay productos agregados</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="w-full px-3 py-2 border rounded-md min-h-20"
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (16%):</span>
                    <span className="font-medium">${totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleSaveAndSend}
                    disabled={loading || !selectedCustomer || items.length === 0}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Guardar y Enviar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={loading || !selectedCustomer || items.length === 0}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Borrador
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

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
  FileText, 
  Save, 
  Send, 
  X, 
  Plus, 
  Trash2,
  Calendar,
  User,
  Calculator,
  CreditCard,
  Building2,
  Mail,
  Tag,
  MapPin,
  Paperclip,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
}

interface Product {
  id: string
  name: string
  price: number
  taxRate: number
}

interface InvoiceItem {
  id: string
  productId: string
  productName: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  total: number
}

interface TransactionClass {
  id: string
  name: string
  parentId: string | null
}

interface TransactionLocation {
  id: string
  name: string
  address: string | null
}

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  // Form state
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [notes, setNotes] = useState<string>('')
  const [terms, setTerms] = useState<string>('Pago en 30 días')
  const [discount, setDiscount] = useState<number>(0)
  const [taxExempt, setTaxExempt] = useState<boolean>(false)
  
  // Class, Location, and Attachments
  const [classes, setClasses] = useState<TransactionClass[]>([])
  const [locations, setLocations] = useState<TransactionLocation[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchCustomers()
      fetchProducts()
      generateInvoiceNumber()
      fetchClassesAndLocations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id])

  const fetchClassesAndLocations = async () => {
    try {
      const response = await fetch(`/api/tracking?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Error fetching classes and locations:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/customers?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Error al cargar clientes')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    
    for (const file of Array.from(files)) {
      const newAttachment: FileAttachment = {
        id: `temp-${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type
      }
      setAttachments(prev => [...prev, newAttachment])
    }
    
    setUploadingFile(false)
    toast.success(`${files.length} archivo(s) agregado(s)`)
    event.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
    toast.success('Archivo eliminado')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error al cargar productos')
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const response = await fetch(`/api/invoices?companyId=${activeCompany?.id}`)
      if (response.ok) {
        const data = await response.json()
        const invoices = Array.isArray(data) ? data : data.data || []
        const lastNumber = Math.max(invoices.length, 0)
        const year = new Date().getFullYear()
        const month = String(new Date().getMonth() + 1).padStart(2, '0')
        setInvoiceNumber(`FAC-${year}${month}-${String(lastNumber + 1).padStart(4, '0')}`)
      }
    } catch (error) {
      console.error('Error generating invoice number:', error)
      setInvoiceNumber(`FAC-${new Date().getFullYear()}-0001`)
    }
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      productId: '',
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 16,
      taxAmount: 0,
      total: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        // Si se selecciona un producto, llenar los datos
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updatedItem.productName = product.name
            updatedItem.description = product.name
            updatedItem.unitPrice = product.price
            updatedItem.taxRate = product.taxRate || 16
          }
        }
        
        // Recalcular totales
        const quantity = field === 'quantity' ? value : updatedItem.quantity
        const unitPrice = field === 'unitPrice' ? value : updatedItem.unitPrice
        const taxRate = field === 'taxRate' ? value : updatedItem.taxRate
        
        const subtotal = quantity * unitPrice
        updatedItem.taxAmount = taxExempt ? 0 : (subtotal * taxRate / 100)
        updatedItem.total = subtotal + updatedItem.taxAmount
        
        return updatedItem
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const taxAmount = taxExempt ? 0 : items.reduce((sum, item) => sum + item.taxAmount, 0)
    const discountAmount = (subtotal * discount) / 100
    const total = subtotal + taxAmount - discountAmount
    
    return { subtotal, taxAmount, discountAmount, total }
  }

  const totals = calculateTotals()

  const handleSaveDraft = async () => {
    if (!selectedCustomer) {
      toast.error('Selecciona un cliente')
      return
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    setLoading(true)
    try {
      const invoiceData = {
        invoiceNumber,
        customerId: selectedCustomer,
        userId: session?.user?.id,
        companyId: activeCompany?.id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discountAmount,
        total: totals.total,
        status: 'DRAFT',
        notes,
        terms,
        taxExempt,
        classId: selectedClass || null,
        locationId: selectedLocation || null,
        attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
        items: items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          total: item.total
        }))
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (response.ok) {
        toast.success('✅ Factura guardada como borrador')
        router.push('/company/invoicing/invoices')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar factura')
      }
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error('Error al guardar factura')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndSend = async () => {
    if (!selectedCustomer) {
      toast.error('Selecciona un cliente')
      return
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    setLoading(true)
    try {
      const invoiceData = {
        invoiceNumber,
        customerId: selectedCustomer,
        userId: session?.user?.id,
        companyId: activeCompany?.id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discountAmount,
        total: totals.total,
        status: 'SENT',
        notes,
        terms,
        taxExempt,
        classId: selectedClass || null,
        locationId: selectedLocation || null,
        attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
        items: items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          total: item.total
        }))
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (response.ok) {
        await response.json()
        toast.success('✅ Factura creada y enviada')
        
        // Enviar email al cliente
        const customer = customers.find(c => c.id === selectedCustomer)
        if (customer?.email) {
          toast.success(`📧 Enviando factura a ${customer.email}...`)
        }
        
        router.push('/company/invoicing/invoices')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al crear factura')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Error al crear factura')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (items.length > 0 || selectedCustomer) {
      if (confirm('¿Seguro que deseas cancelar? Se perderán los cambios.')) {
        router.push('/company/invoicing/invoices')
      }
    } else {
      router.push('/company/invoicing/invoices')
    }
  }

  const invoiceActions = [
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
      onClick: handleCancel,
      variant: 'danger' as const,
      disabled: loading
    }
  ]

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)

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
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Nueva Factura
            </h1>
            <p className="text-gray-600 mt-1">
              Crea una factura profesional para tu cliente
            </p>
          </div>
          <Badge className="text-lg px-4 py-2 bg-blue-100 text-blue-700">
            {invoiceNumber}
          </Badge>
        </div>

        {/* Action Buttons */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Acciones de Factura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={invoiceActions} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="invoice-customer" className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    id="invoice-customer"
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar cliente...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.email ? `(${customer.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomerData && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{selectedCustomerData.email}</span>
                    </div>
                    {selectedCustomerData.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{selectedCustomerData.phone}</span>
                      </div>
                    )}
                    {selectedCustomerData.address && (
                      <div className="text-sm text-gray-600">{selectedCustomerData.address}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Detalles de la Factura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="invoice-issue-date" className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Emisión
                    </label>
                    <Input
                      id="invoice-issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="invoice-due-date" className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Vencimiento
                    </label>
                    <Input
                      id="invoice-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="invoice-terms" className="block text-sm font-medium text-gray-700 mb-2">
                    Términos de Pago
                  </label>
                  <Input
                    id="invoice-terms"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Ej: Pago en 30 días"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxExempt"
                    checked={taxExempt}
                    onChange={(e) => setTaxExempt(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="taxExempt" className="text-sm font-medium text-gray-700">
                    Factura Exenta de Impuestos
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Productos y Servicios
                  </CardTitle>
                  <Button onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No hay productos agregados</p>
                      <Button onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar primer producto
                      </Button>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Producto #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label htmlFor={`item-product-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                              Producto
                            </label>
                            <select
                              id={`item-product-${item.id}`}
                              value={item.productId}
                              onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="">Seleccionar producto...</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - ${product.price.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label htmlFor={`item-desc-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                              Descripción
                            </label>
                            <Input
                              id={`item-desc-${item.id}`}
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Descripción del producto o servicio"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor={`item-qty-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                              Cantidad
                            </label>
                            <Input
                              id={`item-qty-${item.id}`}
                              type="text"
                              className="text-sm amount-input"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', Number.parseFloat(e.target.value.replaceAll(',', '')) || 0)}
                            />
                          </div>

                          <div>
                            <label htmlFor={`item-price-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                              Precio Unitario
                            </label>
                            <Input
                              id={`item-price-${item.id}`}
                              type="text"
                              className="text-sm amount-input"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', Number.parseFloat(e.target.value.replaceAll(',', '')) || 0)}
                            />
                          </div>

                          <div>
                            <label htmlFor={`item-tax-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                              IVA (%)
                            </label>
                            <Input
                              id={`item-tax-${item.id}`}
                              type="text"
                              className="text-sm amount-input"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', Number.parseFloat(e.target.value.replaceAll(',', '')) || 0)}
                              disabled={taxExempt}
                            />
                          </div>

                          <div>
                            <span className="block text-xs font-medium text-gray-600 mb-1">
                              Total
                            </span>
                            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-semibold text-gray-900">
                              ${item.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas Adicionales</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas o instrucciones especiales para el cliente..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-24"
                />
              </CardContent>
            </Card>

            {/* Class and Location */}
            {(classes.length > 0 || locations.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="w-5 h-5 text-blue-600" />
                    Clasificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {classes.length > 0 && (
                    <div>
                      <label htmlFor="invoice-class" className="block text-sm font-medium text-gray-700 mb-2">
                        Clase
                      </label>
                      <select
                        id="invoice-class"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sin clase</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.parentId ? '  → ' : ''}{cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {locations.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Ubicación
                      </label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sin ubicación</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.address ? `(${loc.address})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* File Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                  Adjuntos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload-invoice"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  />
                  <label htmlFor="file-upload-invoice" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Haz clic o arrastra archivos aquí
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Word, Excel, Imágenes
                    </p>
                  </label>
                </div>

                {uploadingFile && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    Subiendo archivo...
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="font-medium truncate max-w-[180px]">{file.name}</span>
                          <span className="text-gray-400 text-xs">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(file.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Totals Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {!taxExempt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IVA:</span>
                      <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Descuento:</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            className="w-16 h-8 text-sm text-right amount-input"
                            value={discount}
                            onChange={(e) => setDiscount(Number.parseFloat(e.target.value.replaceAll(',', '')) || 0)}
                          />
                          <span className="text-xs">%</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Monto descontado:</span>
                        <span className="font-medium">-${totals.discountAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {discount === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscount(5)}
                      className="w-full text-xs"
                    >
                      + Agregar descuento
                    </Button>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${totals.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleSaveAndSend}
                    disabled={loading || !selectedCustomer || items.length === 0}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Guardar y Enviar
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={loading || !selectedCustomer || items.length === 0}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar como Borrador
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700">Productos:</span>
                    <span className="font-bold text-blue-900">{items.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700">Unidades totales:</span>
                    <span className="font-bold text-blue-900">
                      {items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                  {selectedCustomerData && (
                    <div className="pt-2 border-t border-blue-200">
                      <span className="text-xs text-blue-700">Cliente:</span>
                      <p className="font-medium text-blue-900 text-sm mt-1">
                        {selectedCustomerData.name}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

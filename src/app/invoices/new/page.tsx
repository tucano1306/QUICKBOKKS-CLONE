'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string | null
}

interface Product {
  id: string
  name: string
  price: number
}

interface InvoiceItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export default function NewInvoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([])
  
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    terms: ''
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCustomers()
      fetchProducts()
      generateInvoiceNumber()
    }
  }, [status])

  if (status === 'loading') {
    return <DashboardLayout><div>Cargando...</div></DashboardLayout>
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login')
    return null
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const generateInvoiceNumber = () => {
    const number = `INV-${Date.now()}`
    setFormData(prev => ({ ...prev, invoiceNumber: number }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const addItem = () => {
    if (products.length === 0) {
      toast.error('No hay productos disponibles')
      return
    }
    
    const firstProduct = products[0]
    setItems([...items, {
      productId: firstProduct.id,
      productName: firstProduct.name,
      quantity: 1,
      price: firstProduct.price,
      total: firstProduct.price
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    const item = newItems[index]
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        item.productId = product.id
        item.productName = product.name
        item.price = product.price
        item.total = product.price * item.quantity
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value)
      item.total = item.price * item.quantity
    } else if (field === 'price') {
      item.price = Number(value)
      item.total = item.price * item.quantity
    }
    
    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customerId) {
      toast.error('Selecciona un cliente')
      return
    }
    
    if (items.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    
    setIsLoading(true)

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          })),
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          total: calculateTotal()
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la factura')
      }

      toast.success('Factura creada exitosamente')
      router.push('/invoices')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear la factura')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Nueva Factura</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="customerId" className="text-sm font-medium">
                    Cliente *
                  </label>
                  <select
                    id="customerId"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="invoiceNumber" className="text-sm font-medium">
                    Número de Factura *
                  </label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleChange}
                    required
                    placeholder="INV-001"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="issueDate" className="text-sm font-medium">
                    Fecha de Emisión *
                  </label>
                  <Input
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="dueDate" className="text-sm font-medium">
                    Fecha de Vencimiento
                  </label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Productos/Servicios</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5 space-y-2">
                      <label className="text-sm font-medium">Producto</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <label className="text-sm font-medium">Cantidad</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <label className="text-sm font-medium">Precio</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <label className="text-sm font-medium">Total</label>
                      <Input
                        type="text"
                        value={`$${item.total.toFixed(2)}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay productos agregados. Haz clic en "Agregar Item" para comenzar.
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (16%):</span>
                        <span className="font-medium">${calculateTax().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                  placeholder="Notas adicionales para el cliente..."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="terms" className="text-sm font-medium">
                  Términos y Condiciones
                </label>
                <textarea
                  id="terms"
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                  placeholder="Términos y condiciones de pago..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/invoices">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Crear Factura'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

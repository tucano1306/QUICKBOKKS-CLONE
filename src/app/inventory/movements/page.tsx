'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft } from 'lucide-react'

interface InventoryItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface Warehouse {
  id: string
  name: string
  code: string
}

export default function MovementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [activeForm, setActiveForm] = useState<'receive' | 'issue' | 'adjust' | 'transfer' | null>(null)

  const [receiveForm, setReceiveForm] = useState({
    inventoryItemId: '',
    quantity: 0,
    unitCost: 0,
    batchNumber: '',
    expirationDate: '',
    referenceType: 'PURCHASE',
    referenceId: '',
    description: '',
  })

  const [issueForm, setIssueForm] = useState({
    inventoryItemId: '',
    quantity: 0,
    referenceType: 'SALE',
    referenceId: '',
    description: '',
  })

  const [adjustForm, setAdjustForm] = useState({
    inventoryItemId: '',
    quantity: 0,
    reason: '',
  })

  const [transferForm, setTransferForm] = useState({
    inventoryItemId: '',
    toWarehouseId: '',
    quantity: 0,
    description: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItems()
      fetchWarehouses()
    }
  }, [status])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory/items')
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/inventory/warehouses')
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/movements/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...receiveForm,
          quantity: Number(receiveForm.quantity),
          unitCost: Number(receiveForm.unitCost),
        }),
      })

      if (response.ok) {
        alert('Recepción registrada exitosamente')
        setReceiveForm({
          inventoryItemId: '',
          quantity: 0,
          unitCost: 0,
          batchNumber: '',
          expirationDate: '',
          referenceType: 'PURCHASE',
          referenceId: '',
          description: '',
        })
        setActiveForm(null)
        await fetchItems()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al registrar recepción')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar recepción')
    } finally {
      setLoading(false)
    }
  }

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/movements/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...issueForm,
          quantity: Number(issueForm.quantity),
        }),
      })

      if (response.ok) {
        alert('Salida registrada exitosamente')
        setIssueForm({
          inventoryItemId: '',
          quantity: 0,
          referenceType: 'SALE',
          referenceId: '',
          description: '',
        })
        setActiveForm(null)
        await fetchItems()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al registrar salida')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar salida')
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/movements/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adjustForm,
          quantity: Number(adjustForm.quantity),
        }),
      })

      if (response.ok) {
        alert('Ajuste registrado exitosamente')
        setAdjustForm({
          inventoryItemId: '',
          quantity: 0,
          reason: '',
        })
        setActiveForm(null)
        await fetchItems()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al registrar ajuste')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar ajuste')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/movements/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          quantity: Number(transferForm.quantity),
        }),
      })

      if (response.ok) {
        alert('Transferencia registrada exitosamente')
        setTransferForm({
          inventoryItemId: '',
          toWarehouseId: '',
          quantity: 0,
          description: '',
        })
        setActiveForm(null)
        await fetchItems()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al registrar transferencia')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar transferencia')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Inventario</h1>
          <p className="text-gray-600 mt-1">Registra entradas, salidas, ajustes y transferencias</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setActiveForm(activeForm === 'receive' ? null : 'receive')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeForm === 'receive'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
            }`}
          >
            <ArrowDownCircle className={`h-8 w-8 mb-2 ${activeForm === 'receive' ? 'text-green-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Recibir Inventario</h3>
            <p className="text-sm text-gray-600 mt-1">Compras y recepciones</p>
          </button>

          <button
            onClick={() => setActiveForm(activeForm === 'issue' ? null : 'issue')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeForm === 'issue'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-500 hover:bg-red-50'
            }`}
          >
            <ArrowUpCircle className={`h-8 w-8 mb-2 ${activeForm === 'issue' ? 'text-red-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Emitir Inventario</h3>
            <p className="text-sm text-gray-600 mt-1">Ventas y salidas</p>
          </button>

          <button
            onClick={() => setActiveForm(activeForm === 'adjust' ? null : 'adjust')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeForm === 'adjust'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
            }`}
          >
            <RefreshCw className={`h-8 w-8 mb-2 ${activeForm === 'adjust' ? 'text-orange-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Ajustar Inventario</h3>
            <p className="text-sm text-gray-600 mt-1">Correcciones manuales</p>
          </button>

          <button
            onClick={() => setActiveForm(activeForm === 'transfer' ? null : 'transfer')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeForm === 'transfer'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <ArrowRightLeft className={`h-8 w-8 mb-2 ${activeForm === 'transfer' ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Transferir</h3>
            <p className="text-sm text-gray-600 mt-1">Entre almacenes</p>
          </button>
        </div>

        {/* Forms */}
        {activeForm === 'receive' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Recibir Inventario</h2>
            <form onSubmit={handleReceive} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={receiveForm.inventoryItemId}
                    onChange={(e) => setReceiveForm({ ...receiveForm, inventoryItemId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm({ ...receiveForm, quantity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Unitario *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={receiveForm.unitCost}
                    onChange={(e) => setReceiveForm({ ...receiveForm, unitCost: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Lote
                  </label>
                  <Input
                    value={receiveForm.batchNumber}
                    onChange={(e) => setReceiveForm({ ...receiveForm, batchNumber: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Expiración
                  </label>
                  <Input
                    type="date"
                    value={receiveForm.expirationDate}
                    onChange={(e) => setReceiveForm({ ...receiveForm, expirationDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia ID
                  </label>
                  <Input
                    value={receiveForm.referenceId}
                    onChange={(e) => setReceiveForm({ ...receiveForm, referenceId: e.target.value })}
                    placeholder="PO-001, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <Input
                    value={receiveForm.description}
                    onChange={(e) => setReceiveForm({ ...receiveForm, description: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Procesando...' : 'Registrar Recepción'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeForm === 'issue' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Emitir Inventario</h2>
            <form onSubmit={handleIssue} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={issueForm.inventoryItemId}
                    onChange={(e) => setIssueForm({ ...issueForm, inventoryItemId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Referencia
                  </label>
                  <select
                    value={issueForm.referenceType}
                    onChange={(e) => setIssueForm({ ...issueForm, referenceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SALE">Venta</option>
                    <option value="PRODUCTION">Producción</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia ID
                  </label>
                  <Input
                    value={issueForm.referenceId}
                    onChange={(e) => setIssueForm({ ...issueForm, referenceId: e.target.value })}
                    placeholder="INV-001, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <Input
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Procesando...' : 'Registrar Salida'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeForm === 'adjust' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Ajustar Inventario</h2>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={adjustForm.inventoryItemId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, inventoryItemId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Ajuste * (+ o -)
                  </label>
                  <Input
                    type="number"
                    required
                    step="0.01"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                    placeholder="Positivo para aumentar, negativo para reducir"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón del Ajuste *
                  </label>
                  <textarea
                    required
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    placeholder="Explicar el motivo del ajuste"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Procesando...' : 'Registrar Ajuste'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeForm === 'transfer' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Transferir Inventario</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    required
                    value={transferForm.inventoryItemId}
                    onChange={(e) => setTransferForm({ ...transferForm, inventoryItemId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Almacén Destino *
                  </label>
                  <select
                    required
                    value={transferForm.toWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <Input
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="Notas de la transferencia"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Procesando...' : 'Registrar Transferencia'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveForm(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!activeForm && (
          <Card className="p-12 text-center">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona un tipo de movimiento
            </h3>
            <p className="text-gray-600">
              Haz clic en una de las opciones arriba para registrar un movimiento de inventario
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

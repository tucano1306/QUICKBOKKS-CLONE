'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Warehouse, AlertTriangle, ShoppingCart, TrendingDown, ArrowRightLeft, Plus, FileText } from 'lucide-react'

export default function InventoryPage() {
  const { status } = useSession()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [warehousesRes, itemsRes, alertsRes] = await Promise.all([
        fetch('/api/inventory/warehouses'),
        fetch('/api/inventory/items'),
        fetch('/api/inventory/alerts'),
      ])

      if (warehousesRes.ok) {
        const data = await warehousesRes.json()
        setWarehouses(data.warehouses || [])
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error loading inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const totalItems = items.length
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.avgCost), 0)
  const lowStockItems = items.filter(item => item.quantity <= item.minStock)
  const outOfStockItems = items.filter(item => item.quantity === 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
            <p className="text-gray-600 mt-1">
              Gestión de almacenes, productos y stock
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/warehouses">
              <Button variant="outline">
                <Warehouse className="h-4 w-4 mr-2" />
                Almacenes
              </Button>
            </Link>
            <Link href="/inventory/items">
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Productos
              </Button>
            </Link>
            <Link href="/inventory/movements">
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Movimientos
              </Button>
            </Link>
            <Link href="/inventory/alerts">
              <Button>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alertas ({alerts.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Almacenes</CardTitle>
                <Warehouse className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{warehouses.length}</p>
              <p className="text-sm text-gray-600 mt-1">Activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Items Totales</CardTitle>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalItems}</p>
              <p className="text-sm text-gray-600 mt-1">Productos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Valor Total</CardTitle>
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">Costo promedio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Alertas</CardTitle>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alerts.length}</p>
              <p className="text-sm text-gray-600 mt-1">Activas</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de Stock */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Alertas de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded"
                  >
                    <div>
                      <p className="font-semibold">{alert.inventoryItem?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
                        {alert.alertType === 'LOW_STOCK' && `Stock bajo: ${alert.inventoryItem?.quantity} unidades`}
                        {alert.alertType === 'OUT_OF_STOCK' && 'Sin stock'}
                        {alert.alertType === 'EXPIRING' && 'Por vencer pronto'}
                        {alert.alertType === 'EXPIRED' && 'Vencido'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Resolver
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Almacenes */}
        <Card>
          <CardHeader>
            <CardTitle>Almacenes</CardTitle>
          </CardHeader>
          <CardContent>
            {warehouses.length === 0 ? (
              <div className="text-center py-12">
                <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay almacenes registrados
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Crea tu primer almacén para comenzar a gestionar tu inventario
                </p>
                <Button onClick={() => alert('Crear almacén - por implementar')}>
                  Crear Primer Almacén
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{warehouse.name}</h4>
                        <p className="text-sm text-gray-600">{warehouse.code}</p>
                      </div>
                      {warehouse.isPrimary && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{warehouse.address}</p>
                    <p className="text-sm text-gray-600">
                      {warehouse._count?.inventoryItems || 0} items
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items de Inventario */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items de Inventario</CardTitle>
              {lowStockItems.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  {lowStockItems.length} con stock bajo
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay items registrados
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Agrega productos a tu inventario
                </p>
                <Button onClick={() => alert('Crear item - por implementar')}>
                  Agregar Primer Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Producto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Almacén</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Stock</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Costo Prom.</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{item.sku}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{item.warehouse?.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={item.quantity <= item.minStock ? 'text-red-600 font-semibold' : ''}>
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">${item.avgCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.quantity === 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              Sin stock
                            </span>
                          ) : item.quantity <= item.minStock ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              Stock bajo
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Calendar, Eye } from 'lucide-react'

interface Receipt {
  id: string
  filename: string
  uploadDate: string
  amount: number
  vendor: string
  status: 'processed' | 'pending' | 'error'
}

export default function ReceiptsHistoryPage() {
  const router = useRouter()
  
  // Sample data
  const [receipts] = useState<Receipt[]>([
    {
      id: '1',
      filename: 'recibo_office_depot.jpg',
      uploadDate: '2024-11-20',
      amount: 1250.50,
      vendor: 'Office Depot',
      status: 'processed'
    },
    {
      id: '2',
      filename: 'factura_gasolina.pdf',
      uploadDate: '2024-11-18',
      amount: 850.00,
      vendor: 'Pemex',
      status: 'processed'
    },
    {
      id: '3',
      filename: 'recibo_restaurant.jpg',
      uploadDate: '2024-11-15',
      amount: 450.75,
      vendor: 'Restaurante La Cocina',
      status: 'pending'
    }
  ])

  const getStatusBadge = (status: string) => {
    const styles = {
      processed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      processed: 'Procesado',
      pending: 'Pendiente',
      error: 'Error'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Recibos</h1>
            <p className="text-gray-600 text-sm">{receipts.length} recibos procesados</p>
          </div>
        </div>
        <Button onClick={() => router.push('/expenses/receipts/upload')}>
          + Subir Nuevo Recibo
        </Button>
      </div>

      {/* Receipts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Subida
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600">No hay recibos en el historial</p>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>{receipt.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(receipt.uploadDate).toLocaleDateString('es-ES')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(receipt.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Ver recibo"
                      >
                        <Eye className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

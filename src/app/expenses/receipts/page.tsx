'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Camera, History, FileText } from 'lucide-react'

export default function ReceiptsPage() {
  const router = useRouter()

  const receiptActions = [
    {
      title: 'Subir Recibo',
      description: 'Sube una imagen o PDF de un recibo',
      icon: Upload,
      color: 'bg-blue-500',
      action: () => router.push('/expenses/receipts/upload')
    },
    {
      title: 'Escanear con OCR',
      description: 'Extrae datos automáticamente del recibo',
      icon: Camera,
      color: 'bg-green-500',
      action: () => router.push('/expenses/receipts/scan')
    },
    {
      title: 'Historial',
      description: 'Ver recibos procesados anteriormente',
      icon: History,
      color: 'bg-purple-500',
      action: () => router.push('/expenses/receipts/history')
    }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Captura de Recibos</h1>
          <p className="text-gray-600 text-sm">Digitaliza y procesa tus recibos de gastos</p>
        </div>
      </div>

      {/* Receipt Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {receiptActions.map((action, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
            onClick={action.action}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`${action.color} p-4 rounded-full text-white`}>
                <action.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <FileText className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona la captura de recibos?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>Subir:</strong> Carga una foto o PDF del recibo desde tu dispositivo</li>
              <li>• <strong>OCR:</strong> Nuestro sistema extrae automáticamente fecha, monto, proveedor y descripción</li>
              <li>• <strong>Revisar:</strong> Verifica y edita la información extraída si es necesario</li>
              <li>• <strong>Guardar:</strong> El gasto se registra automáticamente con el recibo adjunto</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FolderOpen, AlertCircle } from 'lucide-react'

export default function ClassificationPage() {
  const router = useRouter()

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
          <h1 className="text-2xl font-bold text-gray-900">Gastos Por Clasificar</h1>
          <p className="text-gray-600 text-sm">Revisa y clasifica gastos pendientes</p>
        </div>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center">
        <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay gastos pendientes
        </h3>
        <p className="text-gray-600 mb-6">
          Todos tus gastos están clasificados correctamente
        </p>
        <Button onClick={() => router.push('/expenses/list')}>
          Ver Lista de Gastos
        </Button>
      </Card>

      {/* Info */}
      <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Clasificación Automática:</strong> Los gastos importados de tarjetas 
            corporativas o recibos OCR aparecerán aquí si necesitan revisión manual.
          </div>
        </div>
      </Card>
    </div>
  )
}

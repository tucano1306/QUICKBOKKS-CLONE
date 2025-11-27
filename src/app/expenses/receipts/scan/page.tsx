'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Camera } from 'lucide-react'

interface ExtractedData {
  description: string
  amount: string
  date: string
  vendor: string
}

export default function ScanReceiptPage() {
  const router = useRouter()
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    description: 'Compra de material de oficina',
    amount: '1250.50',
    date: new Date().toISOString().split('T')[0],
    vendor: 'Office Depot'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Simulate OCR processing
  useEffect(() => {
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setExtractedData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      router.push('/expenses/list')
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Camera className="h-16 w-16 text-blue-500 animate-pulse mb-4" />
        <div className="text-gray-600">Procesando recibo con OCR...</div>
        <div className="text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
          <h1 className="text-2xl font-bold text-gray-900">Datos Extraídos del Recibo</h1>
          <p className="text-gray-600 text-sm">Verifica y edita la información si es necesario</p>
        </div>
      </div>

      {/* Success Alert */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
        ✓ Recibo procesado exitosamente. Revisa los datos extraídos.
      </div>

      {/* Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <input
              id="description"
              name="description"
              type="text"
              value={extractedData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={extractedData.amount}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={extractedData.date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor
            </label>
            <input
              id="vendor"
              name="vendor"
              type="text"
              value={extractedData.vendor}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
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
        </div>
      </Card>

      {/* OCR Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los datos han sido extraídos automáticamente mediante OCR. 
          Por favor verifica que toda la información sea correcta antes de guardar.
        </p>
      </div>
    </div>
  )
}

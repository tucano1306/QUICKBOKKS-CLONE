'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  Camera,
  FileText,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Download,
  AlertCircle
} from 'lucide-react'

interface Receipt {
  id: string
  filename: string
  uploadDate: string
  processedDate: string | null
  status: 'pending' | 'processed' | 'error'
  amount: number | null
  vendor: string | null
  expenseId: string | null
}

export default function ReceiptsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadReceipts()
    }
  }, [status])

  const loadReceipts = async () => {
    setLoading(true)
    try {
      // Simulación - en producción esto vendría de la base de datos
      const mockReceipts: Receipt[] = [
        {
          id: '1',
          filename: 'recibo_office_depot_2024.jpg',
          uploadDate: new Date().toISOString(),
          processedDate: new Date().toISOString(),
          status: 'processed',
          amount: 1250.50,
          vendor: 'Office Depot',
          expenseId: null
        },
        {
          id: '2',
          filename: 'factura_gasolina.pdf',
          uploadDate: new Date(Date.now() - 86400000).toISOString(),
          processedDate: new Date(Date.now() - 86400000).toISOString(),
          status: 'processed',
          amount: 850.00,
          vendor: 'Pemex',
          expenseId: null
        }
      ]
      setReceipts(Array.isArray(mockReceipts) ? mockReceipts : [])
    } catch (error) {
      console.error('Error loading receipts:', error)
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Por favor sube una imagen (JPG, PNG) o PDF' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El archivo no debe exceder 10MB' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setSelectedFile(file)

    // Crear preview si es imagen
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // En producción, esto enviaría a una API real con OCR
      // const response = await fetch('/api/receipts/upload', {
      //   method: 'POST',
      //   body: formData
      // })

      // Simulación de éxito
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simular procesamiento OCR
      const newReceipt: Receipt = {
        id: Date.now().toString(),
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        processedDate: null,
        status: 'pending',
        amount: null,
        vendor: null,
        expenseId: null
      }

      setReceipts([newReceipt, ...receipts])
      setSelectedFile(null)
      setPreview(null)

      // Simular procesamiento OCR después de 3 segundos
      setTimeout(() => {
        setReceipts(prev =>
          prev.map(r =>
            r.id === newReceipt.id
              ? {
                  ...r,
                  status: 'processed',
                  processedDate: new Date().toISOString(),
                  amount: Math.random() * 1000 + 100,
                  vendor: 'Proveedor Detectado'
                }
              : r
          )
        )
      }, 3000)

      setMessage({ type: 'success', text: '¡Recibo subido exitosamente! Se está procesando con OCR...' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error uploading receipt:', error)
      setMessage({ type: 'error', text: 'Error al subir el recibo' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este recibo?')) return
    setReceipts(receipts.filter(r => r.id !== id))
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    }
    const labels = {
      pending: 'Procesando',
      processed: 'Procesado',
      error: 'Error'
    }
    const icons = {
      pending: <Clock className="h-3 w-3" />,
      processed: <CheckCircle className="h-3 w-3" />,
      error: <XCircle className="h-3 w-3" />
    }
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Cargando...</div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Captura de Recibos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Digitaliza tus recibos con tecnología OCR automática
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subir Recibo</h2>

            {/* Drag and Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile && preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg border"
                  />
                  <div className="text-sm text-gray-600">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
                  <div className="flex gap-3 justify-center">
                    <label htmlFor="file-change">
                      <Button variant="outline" className="cursor-pointer" onClick={() => document.getElementById('file-change')?.click()}>
                        Cambiar
                      </Button>
                      <input
                        id="file-change"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <Button onClick={handleUpload} disabled={uploading}>
                      {uploading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir y Procesar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Arrastra un archivo aquí
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      o haz clic para seleccionar
                    </p>
                    <label htmlFor="file-upload">
                      <Button className="cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar Archivo
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      JPG, PNG, PDF (máximo 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              ¿Cómo funciona el OCR?
            </h2>
            <div className="space-y-4 text-sm text-blue-800">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Sube tu recibo</p>
                  <p className="text-blue-700">Arrastra o selecciona la imagen/PDF del recibo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Procesamiento automático</p>
                  <p className="text-blue-700">
                    Nuestro sistema OCR extrae: fecha, monto, proveedor, descripción
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Revisión y aprobación</p>
                  <p className="text-blue-700">Verifica los datos extraídos y guarda el gasto</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Almacenamiento seguro</p>
                  <p className="text-blue-700">
                    El recibo se guarda vinculado al gasto para auditorías
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Receipts History */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Recibos ({receipts.length})
              </h2>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Ver Todo
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Archivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Subida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!Array.isArray(receipts) || receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No hay recibos subidos aún</p>
                    </td>
                  </tr>
                ) : (
                  receipts.map(receipt => (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{receipt.filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(receipt.uploadDate).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {receipt.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {receipt.amount
                          ? `$${receipt.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver recibo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-800"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(receipt.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

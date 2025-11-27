'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, FileImage, CheckCircle } from 'lucide-react'

export default function UploadReceiptPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    
    // Simulate upload
    setTimeout(() => {
      setUploading(false)
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/expenses/receipts/scan')
      }, 1500)
    }, 2000)
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
          <h1 className="text-2xl font-bold text-gray-900">Subir Recibo</h1>
          <p className="text-gray-600 text-sm">Carga una imagen o PDF de tu recibo</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Recibo subido exitosamente. Redirigiendo al escáner...</span>
        </div>
      )}

      {/* Upload Area */}
      <Card className="p-8">
        {!preview ? (
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-500 transition-colors">
              <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un archivo
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Formatos aceptados: JPG, PNG, PDF (máximo 10MB)
              </p>
              <label htmlFor="file-upload">
                <Button className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar Archivo
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="text-center">
              <img
                src={preview}
                alt="Preview"
                className="max-h-96 mx-auto rounded-lg border-2 border-gray-200"
              />
              <p className="text-sm text-gray-600 mt-3">
                {file?.name} ({(file!.size / 1024).toFixed(2)} KB)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-3">
              <label htmlFor="file-change">
                <Button variant="outline" className="cursor-pointer">
                  Cambiar Archivo
                </Button>
                <input
                  id="file-change"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="min-w-[120px]"
              >
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
        )}
      </Card>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Consejo:</strong> Para mejores resultados, asegúrate de que el recibo esté bien iluminado 
          y todos los datos sean legibles.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Image, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UploadedFile {
  file: File
  preview?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface DragDropUploadProps {
  onFilesSelected?: ((files: File[]) => void) | ((files: File[]) => Promise<void>)
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export default function DragDropUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const processFiles = (selectedFiles: File[]) => {
    // Validar número de archivos
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`⚠️ Máximo ${maxFiles} archivos permitidos`)
      return
    }

    // Validar tamaño y tipo
    const validFiles = selectedFiles.filter(file => {
      const sizeMB = file.size / (1024 * 1024)
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      
      if (sizeMB > maxSizeMB) {
        alert(`❌ ${file.name} excede el tamaño máximo de ${maxSizeMB}MB`)
        return false
      }
      
      if (!acceptedTypes.includes(extension)) {
        alert(`❌ ${file.name} tiene un tipo de archivo no permitido`)
        return false
      }
      
      return true
    })

    // Crear previews para imágenes
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
    if (onFilesSelected) {
      onFilesSelected(validFiles)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-600" />
    if (file.type.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />
    return <File className="w-5 h-5 text-gray-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging 
            ? 'border-blue-600 bg-blue-50 scale-105' 
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
          }
        `}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`
              p-4 rounded-full transition-all
              ${isDragging ? 'bg-blue-600 scale-110' : 'bg-blue-100'}
            `}>
              <Upload className={`w-12 h-12 ${isDragging ? 'text-white' : 'text-blue-600'}`} />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragging ? '¡Suelta los archivos aquí!' : 'Arrastra y suelta archivos'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              o haz clic para seleccionar archivos
            </p>
            <label htmlFor="file-input">
              <Button type="button" onClick={() => document.getElementById('file-input')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar Archivos
              </Button>
            </label>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Formatos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</p>
            <p>Tamaño máximo por archivo: {maxSizeMB}MB | Máximo {maxFiles} archivos</p>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">
            Archivos seleccionados ({files.length})
          </h3>
          {files.map((uploadedFile, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Preview or Icon */}
                  <div className="flex-shrink-0">
                    {uploadedFile.preview ? (
                      <img 
                        src={uploadedFile.preview} 
                        alt={uploadedFile.file.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        {getFileIcon(uploadedFile.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {uploadedFile.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {uploadedFile.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    {uploadedFile.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

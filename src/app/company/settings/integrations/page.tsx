'use client'

import React, { useState, useEffect } from 'react'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  RefreshCw,
  Settings,
  AlertTriangle,
  Info,
  Link2,
  Unlink
} from 'lucide-react'

interface GmailStatus {
  authenticated: boolean
  configured: boolean
}

export default function IntegrationsPage() {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Verificar estado de Gmail al cargar
  useEffect(() => {
    checkGmailStatus()
    
    // Verificar parámetros de URL (callback de OAuth)
    const params = new URLSearchParams(globalThis.location.search)
    if (params.get('gmail_success') === 'true') {
      setSuccessMessage('¡Gmail conectado exitosamente! Ahora puedes recibir documentos por email.')
      // Limpiar URL
      globalThis.history.replaceState({}, '', '/company/settings/integrations')
    }
    if (params.get('gmail_error')) {
      setError(`Error al conectar Gmail: ${params.get('gmail_error')}`)
      globalThis.history.replaceState({}, '', '/company/settings/integrations')
    }
  }, [])

  const checkGmailStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/gmail?action=status')
      const data = await response.json()
      setGmailStatus(data)
    } catch (err) {
      console.error('Error checking Gmail status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGmail = () => {
    // Redirigir a OAuth de Google
    globalThis.location.href = '/api/auth/gmail?action=authorize'
  }

  const handleDisconnectGmail = async () => {
    // Por ahora, solo limpiar el estado local
    // En producción, esto eliminaría los tokens de la base de datos
    setGmailStatus({ authenticated: false, configured: gmailStatus?.configured || false })
    setSuccessMessage('Gmail desconectado. Para reconectar, haz clic en "Conectar Gmail".')
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Integraciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Conecta servicios externos para ampliar las funcionalidades
          </p>
        </div>

        {/* Mensajes de éxito/error */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">Éxito</h3>
              <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 p-4 rounded-lg flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Gmail Integration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Gmail - Bandeja de Documentos</CardTitle>
                  <CardDescription>
                    Recibe facturas y documentos de tus clientes por email
                  </CardDescription>
                </div>
              </div>
              {gmailStatus && (
                <Badge 
                  variant={gmailStatus.authenticated ? "default" : "secondary"}
                  className={gmailStatus.authenticated 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" 
                    : ""
                  }
                >
                  {gmailStatus.authenticated ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      No conectado
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado de configuración */}
            {!loading && gmailStatus && !gmailStatus.configured && (
              <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Configuración Requerida
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-2">
                    Necesitas configurar las credenciales de Gmail API en tu archivo <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">.env.local</code>
                  </p>
                  <a 
                    href="/docs/GMAIL_SETUP.md" 
                    target="_blank"
                    className="inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-200 underline hover:no-underline text-sm"
                  >
                    Ver guía de configuración <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Descripción del servicio */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">
                ¿Cómo funciona?
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <strong>Conectas tu Gmail</strong> - Autorizas la app para leer emails
                </li>
                <li>
                  <strong>Compartes el email</strong> - Tus clientes envían documentos a tu Gmail
                </li>
                <li>
                  <strong>Incluyen código de empresa</strong> - En el asunto: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">[CODIGO]</code>
                </li>
                <li>
                  <strong>Documentos clasificados</strong> - Aparecen organizados en la bandeja de cada empresa
                </li>
              </ol>
            </div>

            {/* Ejemplo de uso */}
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Ejemplo de email de cliente
              </h4>
              <div className="bg-white dark:bg-gray-900 border rounded p-3 font-mono text-sm">
                <p><span className="text-gray-500">Para:</span> tuempresa.docs@gmail.com</p>
                <p><span className="text-gray-500">Asunto:</span> <span className="text-blue-600 dark:text-blue-400">[ABC123]</span> Factura proveedor noviembre</p>
                <p className="text-gray-400 mt-2">Adjunto: factura.pdf</p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              {loading && (
                <Button disabled>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </Button>
              )}
              {!loading && gmailStatus?.authenticated && (
                <>
                  <Button variant="outline" onClick={checkGmailStatus}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar conexión
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnectGmail}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                  <Button asChild>
                    <a href="/company/documents/inbox">
                      <Mail className="h-4 w-4 mr-2" />
                      Ver bandeja de entrada
                    </a>
                  </Button>
                </>
              )}
              {!loading && !gmailStatus?.authenticated && (
                <>
                  <Button 
                    onClick={handleConnectGmail}
                    disabled={!gmailStatus?.configured}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Conectar Gmail
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://github.com/tuusuario/computoplus/blob/main/docs/GMAIL_SETUP.md" 
                      target="_blank"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Guía de configuración
                    </a>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Otras integraciones futuras */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Settings className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-500">Más integraciones próximamente</CardTitle>
                <CardDescription>
                  Dropbox, Google Drive, OneDrive, y más
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Estamos trabajando en más integraciones para facilitar la gestión de documentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

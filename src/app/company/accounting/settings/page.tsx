'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings,
  Sliders,
  Database,
  BarChart3,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Brain,
  Building2,
  FileText,
  Download,
  Calendar,
  Shield,
  Activity
} from 'lucide-react'

interface BankConnection {
  id: string
  bankName: string
  accountNumber: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string
  transactionsCount: number
}

interface ClassificationRule {
  id: string
  name: string
  condition: string
  category: string
  confidence: number
  isActive: boolean
}

export default function AccountingSettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  // Datos de ejemplo
  const bankConnections: BankConnection[] = [
    {
      id: '1',
      bankName: 'BBVA Empresarial',
      accountNumber: '**** 4567',
      status: 'connected',
      lastSync: '2025-11-26 10:30',
      transactionsCount: 1245
    },
    {
      id: '2',
      bankName: 'Santander Negocios',
      accountNumber: '**** 8901',
      status: 'connected',
      lastSync: '2025-11-26 09:15',
      transactionsCount: 892
    },
    {
      id: '3',
      bankName: 'Banorte Empresas',
      accountNumber: '**** 2345',
      status: 'error',
      lastSync: '2025-11-20 14:20',
      transactionsCount: 567
    }
  ]

  const classificationRules: ClassificationRule[] = [
    {
      id: '1',
      name: 'Servicios Públicos',
      condition: 'Descripción contiene "CFE", "ELECTRIC", "GAS"',
      category: '5230 - Servicios Públicos',
      confidence: 98,
      isActive: true
    },
    {
      id: '2',
      name: 'Pagos PayPal',
      condition: 'Proveedor = "PAYPAL"',
      category: '4010 - Ingresos por Servicios',
      confidence: 99,
      isActive: true
    },
    {
      id: '3',
      name: 'Combustible',
      condition: 'Descripción contiene "GASOLINERA", "PEMEX"',
      category: '5210 - Combustibles',
      confidence: 95,
      isActive: true
    },
    {
      id: '4',
      name: 'Renta de Oficina',
      condition: 'Descripción contiene "RENTA", "RENT"',
      category: '5110 - Renta',
      confidence: 92,
      isActive: false
    }
  ]

  const handleBackup = () => {
    const backupData = {
      company: activeCompany?.name || 'Mi Empresa',
      date: new Date().toISOString(),
      accounts: 150,
      transactions: 2704,
      invoices: 245,
      expenses: 1890,
      bankConnections: bankConnections.length,
      classificationRules: classificationRules.length
    }

    const json = JSON.stringify(backupData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${activeCompany?.name || 'empresa'}-${new Date().toISOString().split('T')[0]}.json`
    a.click()

    setMessage({ type: 'success', text: 'Respaldo descargado exitosamente' })
    setTimeout(() => setMessage(null), 3000)
  }

  // Botones de acción de Configuración
  const settingsActions = [
    {
      label: 'Configurar reglas IA',
      icon: Sliders,
      onClick: () => {
        router.push('/company/accounting/ai-categorization?action=rules')
      },
      variant: 'primary' as const,
    },
    {
      label: 'Conexiones bancarias',
      icon: Database,
      onClick: () => {
        router.push('/company/accounting/bank-sync?action=manage')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Ver reportes',
      icon: BarChart3,
      onClick: () => {
        router.push('/company/reports')
      },
      variant: 'default' as const,
    },
    {
      label: 'Descargar respaldo',
      icon: HardDrive,
      onClick: handleBackup,
      variant: 'success' as const,
    },
  ]

  const connectedBanks = bankConnections.filter(b => b.status === 'connected').length
  const totalTransactions = bankConnections.reduce((sum, b) => sum + b.transactionsCount, 0)
  const activeRules = classificationRules.filter(r => r.isActive).length

  if (loading) {
    return (
      <CompanyTabsLayout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando configuración...</p>
          </div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-gray-700" />
              Configuración Contable
            </h1>
            <p className="text-gray-600 mt-1">
              Administra las configuraciones de tu sistema contable
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <Card className="border-gray-300 bg-gray-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Acciones de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={settingsActions} />
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{connectedBanks}</div>
              <div className="text-sm text-blue-700">Bancos Conectados</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalTransactions.toLocaleString()}</div>
              <div className="text-sm text-green-700">Transacciones Sincronizadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{activeRules}</div>
              <div className="text-sm text-purple-700">Reglas IA Activas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">100%</div>
              <div className="text-sm text-orange-700">Datos Protegidos</div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Conexiones Bancarias
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/company/accounting/bank-sync')}
              >
                Administrar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bankConnections.map((bank) => (
                <div 
                  key={bank.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <Building2 className="w-10 h-10 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">{bank.bankName}</h4>
                      <p className="text-sm text-gray-600">{bank.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {bank.transactionsCount.toLocaleString()} transacciones
                      </p>
                      <p className="text-xs text-gray-500">
                        Última sincronización: {bank.lastSync}
                      </p>
                    </div>
                    {bank.status === 'connected' && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                    {bank.status === 'error' && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Classification Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Reglas de Clasificación IA
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/company/accounting/ai-categorization?action=rules')}
              >
                Configurar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classificationRules.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-4 border rounded-lg ${
                    rule.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                        <Badge className={
                          rule.isActive 
                            ? 'bg-green-100 text-green-700 text-xs' 
                            : 'bg-gray-100 text-gray-600 text-xs'
                        }>
                          {rule.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Condición:</strong> {rule.condition}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Categoría:</strong> {rule.category}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {rule.confidence}%
                      </div>
                      <div className="text-xs text-gray-500">Confianza</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition cursor-pointer" onClick={() => router.push('/company/reports')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reportes Contables</h3>
                  <p className="text-sm text-gray-600">
                    Balance General, Estado de Resultados, Flujo de Efectivo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition cursor-pointer" onClick={handleBackup}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <HardDrive className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Respaldo de Datos</h3>
                  <p className="text-sm text-gray-600">
                    Descarga un respaldo completo de tu información contable
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyTabsLayout>
  )
}

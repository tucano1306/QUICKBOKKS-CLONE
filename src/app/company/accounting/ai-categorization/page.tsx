'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bot,
  Brain,
  Zap,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  TrendingUp,
  Target,
  Activity,
  Settings,
  Download,
  Upload
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  status: 'pending' | 'categorized' | 'reviewed' | 'rejected'
  aiCategory?: string
  aiAccount?: string
  aiConfidence?: number
  aiProcessingTime?: string
  suggestedCategories?: { category: string; account: string; confidence: number }[]
  manualCategory?: string
  reviewedBy?: string
  reviewedAt?: string
}

export default function AICategorizationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [autoMode, setAutoMode] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const transactions: Transaction[] = [
    {
      id: 'TXN-001',
      date: '2025-11-25',
      description: 'ELECTRIC COMPANY - MONTHLY SERVICE',
      amount: 450.25,
      type: 'debit',
      status: 'categorized',
      aiCategory: 'Utilities - Electricity',
      aiAccount: '5230 - Servicios Públicos',
      aiConfidence: 98,
      aiProcessingTime: '0.8s',
      suggestedCategories: [
        { category: 'Utilities - Electricity', account: '5230 - Servicios Públicos', confidence: 98 },
        { category: 'Office Expenses', account: '5240 - Suministros de Oficina', confidence: 12 }
      ]
    },
    {
      id: 'TXN-002',
      date: '2025-11-24',
      description: 'PAYPAL - PAYMENT FROM CLIENT ABC',
      amount: 2500.00,
      type: 'credit',
      status: 'categorized',
      aiCategory: 'Sales Revenue',
      aiAccount: '4010 - Ingresos por Servicios',
      aiConfidence: 99,
      aiProcessingTime: '0.6s',
      suggestedCategories: [
        { category: 'Sales Revenue', account: '4010 - Ingresos por Servicios', confidence: 99 }
      ]
    },
    {
      id: 'TXN-003',
      date: '2025-11-23',
      description: 'OFFICE DEPOT - SUPPLIES',
      amount: 189.50,
      type: 'debit',
      status: 'categorized',
      aiCategory: 'Office Supplies',
      aiAccount: '5240 - Suministros de Oficina', 
      aiConfidence: 95,
      aiProcessingTime: '0.7s',
      suggestedCategories: [
        { category: 'Office Supplies', account: '5240 - Suministros de Oficina', confidence: 95 },
        { category: 'Equipment', account: '1520 - Equipo de Oficina', confidence: 25 }
      ]
    },
    {
      id: 'TXN-004',
      date: '2025-11-22',
      description: 'UBER - BUSINESS TRIP',
      amount: 45.80,
      type: 'debit',
      status: 'pending',
      aiCategory: 'Travel - Transportation',
      aiAccount: '5260 - Gastos de Viaje',
      aiConfidence: 82,
      aiProcessingTime: '0.9s',
      suggestedCategories: [
        { category: 'Travel - Transportation', account: '5260 - Gastos de Viaje', confidence: 82 },
        { category: 'Auto Expense', account: '5250 - Gastos de Vehículo', confidence: 65 },
        { category: 'Meals & Entertainment', account: '5270 - Comidas y Entretenimiento', confidence: 18 }
      ]
    },
    {
      id: 'TXN-005',
      date: '2025-11-20',
      description: 'AMAZON WEB SERVICES',
      amount: 327.90,
      type: 'debit',
      status: 'categorized',
      aiCategory: 'Technology - Cloud Services',
      aiAccount: '5280 - Software y Suscripciones',
      aiConfidence: 100,
      aiProcessingTime: '0.5s',
      suggestedCategories: [
        { category: 'Technology - Cloud Services', account: '5280 - Software y Suscripciones', confidence: 100 }
      ]
    },
    {
      id: 'TXN-006',
      date: '2025-11-18',
      description: 'STARBUCKS #4567',
      amount: 28.50,
      type: 'debit',
      status: 'pending',
      aiCategory: 'Meals & Entertainment',
      aiAccount: '5270 - Comidas y Entretenimiento',
      aiConfidence: 75,
      aiProcessingTime: '1.1s',
      suggestedCategories: [
        { category: 'Meals & Entertainment', account: '5270 - Comidas y Entretenimiento', confidence: 75 },
        { category: 'Office Expenses', account: '5240 - Suministros de Oficina', confidence: 45 }
      ]
    },
    {
      id: 'TXN-007',
      date: '2025-11-15',
      description: 'STRIPE TRANSFER - CLIENT XYZ',
      amount: 4500.00,
      type: 'credit',
      status: 'reviewed',
      aiCategory: 'Sales Revenue',
      aiAccount: '4010 - Ingresos por Servicios',
      aiConfidence: 100,
      aiProcessingTime: '0.4s',
      manualCategory: '4010 - Ingresos por Servicios',
      reviewedBy: 'John Doe (Contador)',
      reviewedAt: '2025-11-15 10:30 AM'
    }
  ]

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = 
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.aiCategory?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || txn.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pendiente Revisión</Badge>
      case 'categorized':
        return <Badge className="bg-green-100 text-green-700"><Bot className="w-3 h-3 mr-1" />Auto-Categorizado</Badge>
      case 'reviewed':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" />Revisado</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null
    if (confidence >= 90) {
      return <Badge className="bg-green-100 text-green-700">{confidence}% Alta</Badge>
    } else if (confidence >= 75) {
      return <Badge className="bg-yellow-100 text-yellow-700">{confidence}% Media</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-700">{confidence}% Baja</Badge>
    }
  }

  const approveCategory = (id: string) => {
    alert(`✅ Categoría aprobada para transacción ${id}`)
  }

  const rejectCategory = (id: string) => {
    alert(`❌ Categoría rechazada para transacción ${id}. Reasignar manualmente.`)
  }

  const reprocessTransaction = (id: string) => {
    alert(`🔄 Re-procesando transacción ${id} con IA...`)
  }

  const stats = {
    totalTransactions: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    categorized: transactions.filter(t => t.status === 'categorized').length,
    reviewed: transactions.filter(t => t.status === 'reviewed').length,
    avgConfidence: Math.round(
      transactions.filter(t => t.aiConfidence).reduce((sum, t) => sum + (t.aiConfidence || 0), 0) / 
      transactions.filter(t => t.aiConfidence).length
    ),
    highConfidence: transactions.filter(t => (t.aiConfidence || 0) >= 90).length,
    avgProcessingTime: '0.7s'
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <Bot className="w-8 h-8 text-purple-600" />
              Auto-Categorización con IA
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema inteligente que clasifica transacciones automáticamente
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Modo Automático:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoMode} 
                  onChange={(e) => setAutoMode(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Importar Transacciones
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalTransactions}</div>
              <div className="text-sm text-blue-700">Total Transacciones</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bot className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.categorized}</div>
              <div className="text-sm text-green-700">Auto-Categorizadas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">{stats.avgConfidence}%</div>
              <div className="text-sm text-purple-700">Confianza Promedio</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">{stats.avgProcessingTime}</div>
              <div className="text-sm text-orange-700">Tiempo Promedio</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Input
                type="text"
                placeholder="Buscar por descripción o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="pending">Pendientes</option>
                <option value="categorized">Auto-Categorizados</option>
                <option value="reviewed">Revisados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.map((txn) => (
            <Card key={txn.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{txn.description}</h3>
                      {getStatusBadge(txn.status)}
                      {getConfidenceBadge(txn.aiConfidence)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="text-xs text-gray-500">Fecha:</span>
                        <div className="font-medium">{txn.date}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Monto:</span>
                        <div className={`font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Categoría IA:</span>
                        <div className="font-medium">{txn.aiCategory}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Tiempo IA:</span>
                        <div className="font-medium">{txn.aiProcessingTime}</div>
                      </div>
                    </div>

                    {txn.aiAccount && (
                      <div className="mb-3">
                        <Badge className="bg-blue-100 text-blue-700">
                          📊 Cuenta: {txn.aiAccount}
                        </Badge>
                      </div>
                    )}

                    {txn.suggestedCategories && txn.suggestedCategories.length > 1 && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Sugerencias Alternativas:
                        </div>
                        <div className="space-y-1">
                          {txn.suggestedCategories.slice(1).map((suggestion, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm text-purple-700">
                              <span>{suggestion.category} → {suggestion.account}</span>
                              <Badge variant="outline" className="text-xs">{suggestion.confidence}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {txn.reviewedBy && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <div>
                            <strong>Revisado por:</strong> {txn.reviewedBy} el {txn.reviewedAt}
                            {txn.manualCategory && <div className="text-xs">Categoría final: {txn.manualCategory}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {txn.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600"
                          onClick={() => approveCategory(txn.id)}
                          title="Aprobar categoría"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => rejectCategory(txn.id)}
                          title="Rechazar categoría"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {txn.status === 'categorized' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => approveCategory(txn.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Revisar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => reprocessTransaction(txn.id)}
                      title="Re-procesar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" title="Ver detalles">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2 text-lg flex items-center gap-2">
                  🤖 Motor de Inteligencia Artificial
                </h3>
                <p className="text-purple-700 text-sm mb-3">
                  Algoritmo avanzado que aprende de tus patrones históricos y categoriza automáticamente nuevas transacciones.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Tecnología:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• <strong>ML Model:</strong> TensorFlow + Custom Rules Engine</li>
                      <li>• <strong>NLP:</strong> Procesamiento de descripciones</li>
                      <li>• <strong>Pattern Matching:</strong> Histórico de transacciones</li>
                      <li>• <strong>Confidence Scoring:</strong> 0-100% basado en coincidencia</li>
                      <li>• <strong>Learning:</strong> Mejora con cada categorización manual</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Reglas de Categorización:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• <strong>Vendor Matching:</strong> Identifica proveedores conocidos</li>
                      <li>• <strong>Amount Patterns:</strong> Montos recurrentes (ej. nómina)</li>
                      <li>• <strong>Keyword Detection:</strong> Palabras clave en descripción</li>
                      <li>• <strong>Time-based:</strong> Periodicidad (mensual, semanal)</li>
                      <li>• <strong>Manual Override:</strong> Siempre puedes corregir manualmente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-3">⚙️ Configuración de Auto-Categorización</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Aprobación Automática (Alta Confianza)</div>
                      <div className="text-sm text-blue-700">Categorías con ≥90% confianza se aprueban automáticamente</div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Queue de Revisión (Baja Confianza)</div>
                      <div className="text-sm text-blue-700">Categorías con &lt;75% confianza requieren revisión manual</div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Notificaciones Diarias</div>
                      <div className="text-sm text-blue-700">Email con resumen de transacciones pendientes</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

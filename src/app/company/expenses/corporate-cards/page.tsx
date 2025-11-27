'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Plus,
  RefreshCw,
  Users,
  TrendingUp,
  Settings,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface CorporateCard {
  id: string
  cardNumber: string
  cardHolder: string
  employeeId: string | null
  bankName: string
  cardType: 'CREDIT' | 'DEBIT'
  limit: number
  balance: number
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  lastSync: string | null
}

export default function CorporateCardsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [cards, setCards] = useState<CorporateCard[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingCard, setSyncingCard] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [stats, setStats] = useState({
    totalCards: 0,
    activeCards: 0,
    totalSpent: 0,
    availableCredit: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const calculateStats = (data: CorporateCard[]) => {
    const totalSpent = data.reduce((sum, c) => sum + (c.limit - c.balance), 0)
    const availableCredit = data.reduce((sum, c) => sum + c.balance, 0)

    setStats({
      totalCards: data.length,
      activeCards: data.filter(c => c.status === 'ACTIVE').length,
      totalSpent,
      availableCredit
    })
  }

  const loadCards = useCallback(async () => {
    if (!activeCompany) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/expenses/corporate-cards?companyId=${activeCompany.id}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar tarjetas')
      }

      const data = await response.json()
      const cardsData = data.cards || []
      setCards(cardsData)
      
      if (data.stats) {
        setStats(data.stats)
      } else {
        calculateStats(cardsData)
      }
    } catch (error) {
      console.error('Error loading cards:', error)
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'authenticated' && activeCompany) {
      loadCards()
    }
  }, [status, activeCompany, loadCards])

  const handleSync = async (cardId: string) => {
    setSyncingCard(cardId)
    try {
      const response = await fetch('/api/expenses/corporate-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, sync: true })
      })
      
      if (response.ok) {
        setCards(cards.map(c => c.id === cardId ? { ...c, lastSync: new Date().toISOString() } : c))
        setMessage({ type: 'success', text: 'Transacciones sincronizadas exitosamente' })
      } else {
        throw new Error('Error en la respuesta')
      }
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error syncing card:', error)
      setMessage({ type: 'error', text: 'Error al sincronizar la tarjeta' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSyncingCard(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      BLOCKED: 'bg-red-100 text-red-800'
    }
    const labels = {
      ACTIVE: 'Activa',
      INACTIVE: 'Inactiva',
      BLOCKED: 'Bloqueada'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getCardTypeLabel = (type: string) => {
    return type === 'CREDIT' ? 'Crédito' : 'Débito'
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Cargando tarjetas...</div>
        </div>
      </CompanyTabsLayout>
    )
  }

  return (
    <CompanyTabsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tarjetas Corporativas</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona tarjetas empresariales y sincroniza transacciones automáticamente
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tarjeta
          </Button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Tarjetas</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalCards}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.activeCards} activas</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-600">Gastado Este Mes</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  ${stats.totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-purple-600 mt-1">Consumido</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-600">Crédito Disponible</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  ${stats.availableCredit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 mt-1">Disponible</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-orange-600">Última Sincronización</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {cards.length > 0 ? 'Hoy' : '-'}
                </p>
                <p className="text-xs text-orange-600 mt-1">Actualizado</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Info Alert */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Sincronización Automática</p>
              <p className="text-blue-700">
                Conecta tus tarjetas corporativas con bancos mexicanos (BBVA, Santander, Banorte, etc.) 
                para importar transacciones automáticamente y clasificarlas como gastos.
              </p>
            </div>
          </div>
        </Card>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!Array.isArray(cards) || cards.length === 0 ? (
            <Card className="col-span-full p-12 text-center">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No hay tarjetas corporativas registradas</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primera Tarjeta
              </Button>
            </Card>
          ) : (
            cards.map(card => (
              <Card key={card.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{card.bankName}</h3>
                      <p className="text-sm text-gray-600">{card.cardNumber}</p>
                    </div>
                  </div>
                  {getStatusBadge(card.status)}
                </div>

                {/* Card Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Titular</span>
                    <span className="text-sm font-medium text-gray-900">{card.cardHolder}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tipo</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getCardTypeLabel(card.cardType)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Límite</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${card.limit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Disponible</span>
                    <span className="text-sm font-semibold text-green-600">
                      ${card.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Consumido</span>
                    <span>{(((card.limit - card.balance) / card.limit) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${((card.limit - card.balance) / card.limit) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Last Sync */}
                {card.lastSync && (
                  <p className="text-xs text-gray-500 mb-4">
                    Última sincronización:{' '}
                    {new Date(card.lastSync).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSync(card.id)}
                    disabled={syncingCard === card.id}
                  >
                    {syncingCard === card.id ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                  <button
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Ver transacciones"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Asignar a Empleados</h3>
                <p className="text-sm text-gray-600">Controla quien usa cada tarjeta</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Reglas de Clasificación</h3>
                <p className="text-sm text-gray-600">Automatiza categorización</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Análisis de Gastos</h3>
                <p className="text-sm text-gray-600">Reportes por tarjeta</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Agregar Tarjeta Corporativa</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              
              const newCard: CorporateCard = {
                id: Date.now().toString(),
                cardNumber: formData.get('cardNumber') as string,
                cardHolder: formData.get('cardHolder') as string,
                employeeId: null,
                bankName: formData.get('bankName') as string,
                cardType: formData.get('cardType') as 'CREDIT' | 'DEBIT',
                limit: parseFloat(formData.get('limit') as string),
                balance: parseFloat(formData.get('limit') as string), // Initial balance = limit
                status: 'ACTIVE',
                lastSync: null
              }

              setCards(prev => [...prev, newCard])
              calculateStats([...cards, newCard])
              setShowAddModal(false)
              
              // Reset form
              e.currentTarget.reset()
              
              setMessage({ type: 'success', text: 'Tarjeta agregada exitosamente' })
              setTimeout(() => setMessage(null), 3000)
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Número de Tarjeta *
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      required
                      placeholder="**** **** **** 1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Últimos 4 dígitos o formato completo
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Titular de la Tarjeta *
                    </label>
                    <input
                      type="text"
                      name="cardHolder"
                      required
                      placeholder="Nombre del empleado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Banco *
                    </label>
                    <select
                      name="bankName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar banco</option>
                      <option value="BBVA">BBVA</option>
                      <option value="Santander">Santander</option>
                      <option value="Banorte">Banorte</option>
                      <option value="Citibanamex">Citibanamex</option>
                      <option value="HSBC">HSBC</option>
                      <option value="Scotiabank">Scotiabank</option>
                      <option value="Inbursa">Inbursa</option>
                      <option value="Banco Azteca">Banco Azteca</option>
                      <option value="American Express">American Express</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tipo de Tarjeta *
                    </label>
                    <select
                      name="cardType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="CREDIT">Crédito</option>
                      <option value="DEBIT">Débito</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Límite de Crédito / Saldo Inicial *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      name="limit"
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Para tarjetas de crédito: límite máximo. Para débito: saldo disponible
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Próximos pasos:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Configura la sincronización automática con tu banco</li>
                        <li>Asigna la tarjeta a un empleado específico</li>
                        <li>Establece reglas de clasificación de gastos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tarjeta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CompanyTabsLayout>
  )
}

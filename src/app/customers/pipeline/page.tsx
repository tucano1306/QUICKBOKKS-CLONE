'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  X,
  ArrowRight,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  value: number
  stage: 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
  probability: number
  expectedCloseDate: string
  lastContact: string
  assignedTo: string
  source: string
}

export default function PipelinePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  const stages = [
    { key: 'LEAD', label: 'Lead', color: 'bg-gray-500', probability: 10 },
    { key: 'QUALIFIED', label: 'Calificado', color: 'bg-blue-500', probability: 30 },
    { key: 'PROPOSAL', label: 'Propuesta', color: 'bg-purple-500', probability: 50 },
    { key: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500', probability: 70 },
    { key: 'CLOSED_WON', label: 'Ganado', color: 'bg-green-500', probability: 100 },
    { key: 'CLOSED_LOST', label: 'Perdido', color: 'bg-red-500', probability: 0 }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    try {
      const res = await fetch('/api/customers/pipeline')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
  }

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const stage = stages.find(s => s.key === newStage)
        return {
          ...lead,
          stage: newStage as any,
          probability: stage?.probability || lead.probability
        }
      }
      return lead
    }))

    toast.success('Etapa actualizada')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLeadsByStage = (stageKey: string) => {
    return filteredLeads.filter(lead => lead.stage === stageKey)
  }

  const getTotalValue = (stageKey: string) => {
    return getLeadsByStage(stageKey).reduce((sum, lead) => sum + lead.value, 0)
  }

  const getWeightedValue = (stageKey: string) => {
    return getLeadsByStage(stageKey).reduce((sum, lead) => sum + (lead.value * lead.probability / 100), 0)
  }

  const totalPipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0)
  const weightedPipelineValue = leads.reduce((sum, lead) => sum + (lead.value * lead.probability / 100), 0)

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipeline de Clientes</h1>
              <p className="text-gray-600 mt-1">
                Gestiona tus oportunidades de venta
              </p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Lead
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Total Pipeline</p>
                  <p className="text-2xl font-bold">
                    ${(totalPipelineValue / 1000).toFixed(0)}K
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Ponderado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(weightedPipelineValue / 1000).toFixed(0)}K
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Oportunidades</p>
                  <p className="text-2xl font-bold">{leads.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ganados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {leads.filter(l => l.stage === 'CLOSED_WON').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar oportunidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Pipeline Board */}
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
          {stages.map(stage => {
            const stageLeads = getLeadsByStage(stage.key)
            const stageValue = getTotalValue(stage.key)
            const weightedValue = getWeightedValue(stage.key)

            return (
              <Card
                key={stage.key}
                className="border-t-4"
                style={{ borderTopColor: stage.color.replace('bg-', '#').replace('500', '') }}
                onDrop={(e) => handleDrop(e, stage.key)}
                onDragOver={handleDragOver}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">${(stageValue / 1000).toFixed(0)}K</div>
                    <div className="text-gray-500">Pond: ${(weightedValue / 1000).toFixed(0)}K</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                  {!Array.isArray(stageLeads) || stageLeads.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4">
                      Sin oportunidades
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow"
                      >
                        <h4 className="font-semibold text-sm mb-1">{lead.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{lead.company}</p>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-green-600">
                            ${(lead.value / 1000).toFixed(0)}K
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {lead.probability}%
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(lead.expectedCloseDate), 'dd MMM', { locale: es })}
                          </div>
                          <div className="truncate">{lead.assignedTo}</div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}

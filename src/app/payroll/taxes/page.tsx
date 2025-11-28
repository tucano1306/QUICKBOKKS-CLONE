'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Building2,
  FileText,
  Upload,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Send,
  Calculator,
  FileCheck
} from 'lucide-react'

interface TaxFiling {
  id: string
  type: string
  period: string
  dueDate: string
  amount: number
  status: 'PENDING' | 'FILED' | 'PAID' | 'OVERDUE'
  filedDate?: string
  paidDate?: string
  reference?: string
}

interface TaxSummary {
  isrTotal: number
  imssTotal: number
  infonavitTotal: number
  otherTaxes: number
  pendingFilings: number
  overdueFilings: number
}

export default function PayrollTaxesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filings, setFilings] = useState<TaxFiling[]>([])
  const [summary, setSummary] = useState<TaxSummary>({
    isrTotal: 0,
    imssTotal: 0,
    infonavitTotal: 0,
    otherTaxes: 0,
    pendingFilings: 0,
    overdueFilings: 0
  })
  
  // Filters
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showNewFiling, setShowNewFiling] = useState(false)
  
  // New filing form
  const [newFiling, setNewFiling] = useState({
    type: 'ISR',
    period: '',
    dueDate: '',
    amount: 0
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch payrolls to calculate tax totals
      const response = await fetch(`/api/payroll?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        const payrolls = data.payrolls || data
        
        // Calculate tax summary from payrolls
        let isrTotal = 0
        let imssTotal = 0
        
        payrolls.forEach((p: any) => {
          // Assuming ISR is 10% and IMSS is 3% of base salary
          isrTotal += p.baseSalary * 0.10
          imssTotal += p.baseSalary * 0.03
        })
        
        // Generate mock filings based on actual data
        const generatedFilings: TaxFiling[] = []
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        
        const currentMonth = new Date().getMonth()
        
        for (let i = 0; i <= currentMonth; i++) {
          const monthlyIsr = isrTotal / (currentMonth + 1)
          const monthlyImss = imssTotal / (currentMonth + 1)
          
          // ISR Filing
          generatedFilings.push({
            id: `isr-${year}-${i}`,
            type: 'ISR',
            period: `${months[i]} ${year}`,
            dueDate: new Date(year, i + 1, 17).toISOString(),
            amount: monthlyIsr,
            status: i < currentMonth - 1 ? 'PAID' : i < currentMonth ? 'FILED' : 'PENDING',
            filedDate: i < currentMonth ? new Date(year, i + 1, 15).toISOString() : undefined,
            paidDate: i < currentMonth - 1 ? new Date(year, i + 1, 16).toISOString() : undefined,
            reference: i < currentMonth - 1 ? `ISR-${year}${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : undefined
          })
          
          // IMSS Filing
          generatedFilings.push({
            id: `imss-${year}-${i}`,
            type: 'IMSS',
            period: `${months[i]} ${year}`,
            dueDate: new Date(year, i + 1, 20).toISOString(),
            amount: monthlyImss,
            status: i < currentMonth - 1 ? 'PAID' : i < currentMonth ? 'FILED' : 'PENDING',
            filedDate: i < currentMonth ? new Date(year, i + 1, 18).toISOString() : undefined,
            paidDate: i < currentMonth - 1 ? new Date(year, i + 1, 19).toISOString() : undefined,
            reference: i < currentMonth - 1 ? `IMSS-${year}${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : undefined
          })
        }
        
        setFilings(generatedFilings)
        
        setSummary({
          isrTotal,
          imssTotal,
          infonavitTotal: 0,
          otherTaxes: 0,
          pendingFilings: generatedFilings.filter(f => f.status === 'PENDING').length,
          overdueFilings: generatedFilings.filter(f => f.status === 'OVERDUE').length
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileFiling = async (filing: TaxFiling) => {
    try {
      const response = await fetch(`/api/payroll/taxes/${filing.id}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        setFilings(prev => prev.map(f => 
          f.id === filing.id 
            ? { ...f, status: 'FILED' as const, filedDate: new Date().toISOString() }
            : f
        ))
        alert(`Declaración ${filing.type} de ${filing.period} presentada exitosamente`)
      }
    } catch (error) {
      console.error('Error filing:', error)
    }
  }

  const handlePayFiling = async (filing: TaxFiling) => {
    try {
      const response = await fetch(`/api/payroll/taxes/${filing.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const reference = data.reference || `${filing.type}-PAY-${Date.now().toString(36).toUpperCase()}`
        setFilings(prev => prev.map(f => 
          f.id === filing.id 
            ? { ...f, status: 'PAID' as const, paidDate: new Date().toISOString(), reference }
            : f
        ))
        alert(`Pago de ${filing.type} de ${filing.period} registrado. Referencia: ${reference}`)
      }
    } catch (error) {
      console.error('Error paying filing:', error)
    }
  }

  const handleNewFiling = async () => {
    if (!newFiling.period || !newFiling.dueDate || newFiling.amount <= 0) {
      alert('Por favor complete todos los campos')
      return
    }

    setSubmitting(true)
    try {
      const filing: TaxFiling = {
        id: `custom-${Date.now()}`,
        type: newFiling.type,
        period: newFiling.period,
        dueDate: newFiling.dueDate,
        amount: newFiling.amount,
        status: 'PENDING'
      }
      
      setFilings(prev => [filing, ...prev])
      setShowNewFiling(false)
      setNewFiling({ type: 'ISR', period: '', dueDate: '', amount: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-700">Pagado</Badge>
      case 'FILED':
        return <Badge className="bg-blue-100 text-blue-700">Presentado</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-700">Vencido</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ISR': return <Building2 className="h-4 w-4" />
      case 'IMSS': return <FileCheck className="h-4 w-4" />
      case 'INFONAVIT': return <Building2 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const filteredFilings = filings.filter(f => {
    const matchesType = filterType === 'all' || f.type === filterType
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus
    return matchesType && matchesStatus
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/payroll')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Impuestos de Nómina</h1>
              <p className="text-sm text-gray-500">
                Gestión de declaraciones y pagos de impuestos
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewFiling(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            Nueva Declaración
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">ISR Retenido</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.isrTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">IMSS/INFONAVIT</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.imssTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-xl font-bold">{summary.pendingFilings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vencidos</p>
                  <p className="text-xl font-bold">{summary.overdueFilings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Año</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                >
                  {[2024, 2023, 2022, 2021].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">Todos</option>
                  <option value="ISR">ISR</option>
                  <option value="IMSS">IMSS</option>
                  <option value="INFONAVIT">INFONAVIT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="FILED">Presentado</option>
                  <option value="PAID">Pagado</option>
                  <option value="OVERDUE">Vencido</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Declaraciones y Pagos</CardTitle>
            <CardDescription>
              {filteredFilings.length} registros para {year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Período</th>
                      <th className="text-left py-3 px-4">Fecha Límite</th>
                      <th className="text-right py-3 px-4">Monto</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-left py-3 px-4">Referencia</th>
                      <th className="text-right py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFilings.map(filing => (
                      <tr key={filing.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(filing.type)}
                            <span className="font-medium">{filing.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{filing.period}</td>
                        <td className="py-3 px-4">
                          {new Date(filing.dueDate).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatCurrency(filing.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(filing.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-500">
                          {filing.reference || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {filing.status === 'PENDING' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleFileFiling(filing)}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Presentar
                              </Button>
                            )}
                            {filing.status === 'FILED' && (
                              <Button 
                                size="sm"
                                onClick={() => handlePayFiling(filing)}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Pagar
                              </Button>
                            )}
                            {filing.status === 'PAID' && (
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Recibo
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">ISR Retenciones</h4>
                <p className="text-sm text-blue-700">
                  Día 17 de cada mes siguiente al período
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Cuotas IMSS</h4>
                <p className="text-sm text-green-700">
                  Día 17 del mes siguiente (bimestral para algunos)
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">INFONAVIT</h4>
                <p className="text-sm text-purple-700">
                  Bimestral, junto con las cuotas del IMSS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Filing Modal */}
        {showNewFiling && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Nueva Declaración</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Impuesto</label>
                  <select
                    value={newFiling.type}
                    onChange={(e) => setNewFiling(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ISR">ISR</option>
                    <option value="IMSS">IMSS</option>
                    <option value="INFONAVIT">INFONAVIT</option>
                    <option value="ISN">ISN (Impuesto Sobre Nómina)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Período</label>
                  <Input
                    placeholder="Ej: Enero 2024"
                    value={newFiling.period}
                    onChange={(e) => setNewFiling(prev => ({ ...prev, period: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Límite</label>
                  <Input
                    type="date"
                    value={newFiling.dueDate}
                    onChange={(e) => setNewFiling(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Monto a Pagar</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newFiling.amount}
                    onChange={(e) => setNewFiling(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowNewFiling(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleNewFiling} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear Declaración
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

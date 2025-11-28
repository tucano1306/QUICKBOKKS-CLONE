'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Building2,
  Receipt
} from 'lucide-react'

interface TaxRecord {
  id: string
  employee: string
  employeeId: string
  period: string
  periodStart: string
  periodEnd: string
  grossPay: number
  isrWithheld: number
  imssEmployee: number
  imssEmployer: number
  infonavitEmployee: number
  infonavitEmployer: number
  taxableIncome: number
  exemptIncome: number
  totalWithholdings: number
  employerContributions: number
  status: 'pending' | 'calculated' | 'filed' | 'paid'
}

interface TaxSummary {
  period: string
  totalISR: number
  totalIMSSEmployee: number
  totalIMSSEmployer: number
  totalINFONAVITEmployee: number
  totalINFONAVITEmployer: number
  totalWithholdings: number
  totalEmployerContributions: number
  employees: number
}

export default function PayrollTaxesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'individual' | 'summary'>('summary')

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([])
  const [taxSummaries, setTaxSummaries] = useState<TaxSummary[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadTaxData = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/taxes?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setTaxRecords(data.records || [])
        setTaxSummaries(data.summaries || [])
      }
    } catch (error) {
      console.error('Error loading tax data:', error)
    }
    setLoading(false)
  }, [activeCompany?.id])

  useEffect(() => {
    loadTaxData()
  }, [loadTaxData])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Pendiente
        </Badge>
      case 'calculated':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Calculado
        </Badge>
      case 'filed':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Declarado
        </Badge>
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Pagado
        </Badge>
      default:
        return null
    }
  }

  const filteredTaxes = taxRecords.filter(tax => {
    if (filterStatus !== 'all' && tax.status !== filterStatus) return false
    if (searchTerm && !tax.employee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tax.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const taxSummary: TaxSummary = taxSummaries[0] || {
    period: 'Período Actual',
    totalISR: taxRecords.reduce((sum, t) => sum + t.isrWithheld, 0),
    totalIMSSEmployee: taxRecords.reduce((sum, t) => sum + t.imssEmployee, 0),
    totalIMSSEmployer: taxRecords.reduce((sum, t) => sum + t.imssEmployer, 0),
    totalINFONAVITEmployee: taxRecords.reduce((sum, t) => sum + t.infonavitEmployee, 0),
    totalINFONAVITEmployer: taxRecords.reduce((sum, t) => sum + t.infonavitEmployer, 0),
    totalWithholdings: taxRecords.reduce((sum, t) => sum + t.totalWithholdings, 0),
    totalEmployerContributions: taxRecords.reduce((sum, t) => sum + t.employerContributions, 0),
    employees: taxRecords.length
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
            <h1 className="text-2xl font-bold text-gray-900">Impuestos de Nómina</h1>
            <p className="text-gray-600 mt-1">
              Gestiona retenciones y aportaciones patronales
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Generar Declaración
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${taxSummary.totalISR.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-700">ISR Retenido</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${taxSummary.totalIMSSEmployee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-blue-700">IMSS Obrero</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${taxSummary.totalIMSSEmployer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">IMSS Patronal</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ${(taxSummary.totalINFONAVITEmployee + taxSummary.totalINFONAVITEmployer).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-orange-700">INFONAVIT Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Employer vs Employee Contributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700 mb-1">Total Retenciones (Empleados)</div>
                  <div className="text-3xl font-bold text-green-900">
                    ${taxSummary.totalWithholdings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-600 mt-2">
                    ISR + IMSS + INFONAVIT descontado a empleados
                  </div>
                </div>
                <TrendingDown className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-indigo-700 mb-1">Aportaciones Patronales</div>
                  <div className="text-3xl font-bold text-indigo-900">
                    ${taxSummary.totalEmployerContributions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-indigo-600 mt-2">
                    IMSS + INFONAVIT aportado por empresa
                  </div>
                </div>
                <TrendingUp className="w-12 h-12 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-700">
                  Período: <strong>16 Nov - 30 Nov 2025</strong> (Quincena 2)
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  Resumen
                </Button>
                <Button 
                  variant={viewMode === 'individual' ? 'default' : 'outline'}
                  onClick={() => setViewMode('individual')}
                >
                  Individual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'summary' ? (
          /* Summary View */
          <>
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Impuestos y Aportaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* ISR Section */}
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">ISR (Impuesto Sobre la Renta)</h3>
                      <span className="text-2xl font-bold text-red-600">
                        ${taxSummary.totalISR.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Retención mensual según Art. 96 LISR - {taxSummary.employees} empleados
                    </p>
                  </div>

                  {/* IMSS Section */}
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">IMSS (Instituto Mexicano del Seguro Social)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-700 mb-1">Cuota Obrera (Empleados)</div>
                        <div className="text-xl font-bold text-blue-900">
                          ${taxSummary.totalIMSSEmployee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">~3.0% del salario base</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-purple-700 mb-1">Cuota Patronal (Empresa)</div>
                        <div className="text-xl font-bold text-purple-900">
                          ${taxSummary.totalIMSSEmployer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">~8.0% del salario base</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Incluye: Enfermedades y Maternidad, Invalidez y Vida, Retiro, Cesantía, Vejez (LSS Art. 25, 106, 107, 168)
                    </p>
                  </div>

                  {/* INFONAVIT Section */}
                  <div className="pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">INFONAVIT (Fondo Nacional de Vivienda)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm text-orange-700 mb-1">Descuento Obrero (Créditos)</div>
                        <div className="text-xl font-bold text-orange-900">
                          ${taxSummary.totalINFONAVITEmployee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">5% sobre salario (con crédito)</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-700 mb-1">Aportación Patronal</div>
                        <div className="text-xl font-bold text-green-900">
                          ${taxSummary.totalINFONAVITEmployer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-green-600 mt-1">5% sobre salario base</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Aportación patronal mensual obligatoria (Ley INFONAVIT Art. 29)
                    </p>
                  </div>

                  {/* Total Summary */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total a Retener</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${taxSummary.totalWithholdings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Patronal</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${taxSummary.totalEmployerContributions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Costo Total Nómina</div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${(taxSummary.totalWithholdings + taxSummary.totalEmployerContributions).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Individual View */
          <>
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar empleado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select 
                    className="px-4 py-2 border rounded-lg"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="pending">Pendientes</option>
                    <option value="calculated">Calculados</option>
                    <option value="filed">Declarados</option>
                    <option value="paid">Pagados</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Individual Tax Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle por Empleado ({filteredTaxes.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sueldo Bruto</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ISR</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">IMSS Obrero</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">IMSS Patronal</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">INFONAVIT Obrero</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">INFONAVIT Patronal</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTaxes.map((tax) => (
                        <tr key={tax.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm text-gray-900">{tax.employee}</div>
                            <div className="text-xs text-gray-500">{tax.employeeId}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                            ${tax.grossPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                            ${tax.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                            ${tax.imssEmployee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-purple-600">
                            ${tax.imssEmployer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-orange-600">
                            ${tax.infonavitEmployee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                            ${tax.infonavitEmployer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(tax.status)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Impuestos y Contribuciones de Nómina</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Sistema de cálculo automático de retenciones y aportaciones según la legislación fiscal y de seguridad social mexicana.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>ISR:</strong> Retención mensual según tablas Art. 96 LISR - Obligación del patrón como retenedor</li>
                  <li>• <strong>IMSS Obrero:</strong> ~3.0% cuota trabajador (Enf/Mat, IyV, RCV) - LSS Art. 25, 106, 168</li>
                  <li>• <strong>IMSS Patronal:</strong> ~8.0% cuota empresa - Complemento obligatorio de seguridad social</li>
                  <li>• <strong>INFONAVIT Obrero:</strong> 5% descuento a empleados con crédito hipotecario vigente</li>
                  <li>• <strong>INFONAVIT Patronal:</strong> 5% aportación mensual sobre salario base - Ley INFONAVIT Art. 29</li>
                  <li>• <strong>Declaración mensual:</strong> Presentación vía SUA/IDSE para IMSS e INFONAVIT</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

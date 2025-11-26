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
  Plus,
  Search,
  Download,
  Eye,
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Edit
} from 'lucide-react'

interface TimeEntry {
  id: string
  projectId: string
  projectCode: string
  projectName: string
  employee: string
  employeeId: string
  date: string
  hoursWorked: number
  hourlyRate: number
  totalAmount: number
  taskDescription: string
  taskCategory: 'development' | 'design' | 'testing' | 'meetings' | 'documentation' | 'support'
  billable: boolean
  billingStatus: 'pending' | 'invoiced' | 'paid' | 'non-billable'
  approvalStatus: 'draft' | 'submitted' | 'approved' | 'rejected'
  approvedBy?: string
  invoiceId?: string
  notes?: string
}

export default function BillableTimePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBillable, setFilterBillable] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  const timeEntries: TimeEntry[] = [
    {
      id: 'TIME-001',
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      employee: 'Juan Pérez',
      employeeId: 'EMP-001',
      date: '2025-11-24',
      hoursWorked: 8,
      hourlyRate: 750,
      totalAmount: 6000,
      taskDescription: 'Desarrollo módulo de contabilidad - Configuración inicial',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'María González'
    },
    {
      id: 'TIME-002',
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      employee: 'Ana Martínez',
      employeeId: 'EMP-002',
      date: '2025-11-24',
      hoursWorked: 6,
      hourlyRate: 850,
      totalAmount: 5100,
      taskDescription: 'Diseño UI/UX dashboard principal',
      taskCategory: 'design',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'María González'
    },
    {
      id: 'TIME-003',
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      employee: 'Carlos Ramírez',
      employeeId: 'EMP-003',
      date: '2025-11-23',
      hoursWorked: 8,
      hourlyRate: 800,
      totalAmount: 6400,
      taskDescription: 'Desarrollo carrito de compras y checkout',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'invoiced',
      approvalStatus: 'approved',
      approvedBy: 'Carlos Ramírez',
      invoiceId: 'INV-2025-045'
    },
    {
      id: 'TIME-004',
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      employee: 'Laura Hernández',
      employeeId: 'EMP-004',
      date: '2025-11-23',
      hoursWorked: 4,
      hourlyRate: 700,
      totalAmount: 2800,
      taskDescription: 'Pruebas de integración pasarela de pagos',
      taskCategory: 'testing',
      billable: true,
      billingStatus: 'invoiced',
      approvalStatus: 'approved',
      approvedBy: 'Carlos Ramírez',
      invoiceId: 'INV-2025-045'
    },
    {
      id: 'TIME-005',
      projectId: 'PROJ-003',
      projectCode: 'APP-2025-008',
      projectName: 'App Móvil Fintech - Innovatech',
      employee: 'Roberto Silva',
      employeeId: 'EMP-005',
      date: '2025-11-22',
      hoursWorked: 7,
      hourlyRate: 900,
      totalAmount: 6300,
      taskDescription: 'Desarrollo API transacciones financieras',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'paid',
      approvalStatus: 'approved',
      approvedBy: 'Ana Martínez',
      invoiceId: 'INV-2025-038'
    },
    {
      id: 'TIME-006',
      projectId: 'PROJ-003',
      projectCode: 'APP-2025-008',
      projectName: 'App Móvil Fintech - Innovatech',
      employee: 'Patricia Morales',
      employeeId: 'EMP-006',
      date: '2025-11-22',
      hoursWorked: 2,
      hourlyRate: 750,
      totalAmount: 0,
      taskDescription: 'Reunión interna equipo - Planning Sprint',
      taskCategory: 'meetings',
      billable: false,
      billingStatus: 'non-billable',
      approvalStatus: 'approved',
      approvedBy: 'Ana Martínez',
      notes: 'Reunión interna no facturable'
    },
    {
      id: 'TIME-007',
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      employee: 'Diego Torres',
      employeeId: 'EMP-007',
      date: '2025-11-21',
      hoursWorked: 6,
      hourlyRate: 700,
      totalAmount: 4200,
      taskDescription: 'Documentación técnica módulo inventarios',
      taskCategory: 'documentation',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'María González'
    },
    {
      id: 'TIME-008',
      projectId: 'PROJ-004',
      projectCode: 'INF-2025-015',
      projectName: 'Migración Cloud - Distribuidora Tech',
      employee: 'Sandra Ruiz',
      employeeId: 'EMP-008',
      date: '2025-11-20',
      hoursWorked: 8,
      hourlyRate: 850,
      totalAmount: 6800,
      taskDescription: 'Configuración infraestructura AWS y migración BD',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'Laura Hernández'
    },
    {
      id: 'TIME-009',
      projectId: 'PROJ-004',
      projectCode: 'INF-2025-015',
      projectName: 'Migración Cloud - Distribuidora Tech',
      employee: 'Fernando Castro',
      employeeId: 'EMP-009',
      date: '2025-11-20',
      hoursWorked: 5,
      hourlyRate: 800,
      totalAmount: 4000,
      taskDescription: 'Pruebas de carga y rendimiento',
      taskCategory: 'testing',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'submitted'
    },
    {
      id: 'TIME-010',
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      employee: 'Lucía Fernández',
      employeeId: 'EMP-010',
      date: '2025-11-19',
      hoursWorked: 6,
      hourlyRate: 750,
      totalAmount: 4500,
      taskDescription: 'Diseño responsive páginas producto',
      taskCategory: 'design',
      billable: true,
      billingStatus: 'invoiced',
      approvalStatus: 'approved',
      approvedBy: 'Carlos Ramírez',
      invoiceId: 'INV-2025-042'
    },
    {
      id: 'TIME-011',
      projectId: 'PROJ-005',
      projectCode: 'IOT-2025-004',
      projectName: 'Plataforma IoT Industrial - ManufactureTech',
      employee: 'Miguel Ángel Suárez',
      employeeId: 'EMP-011',
      date: '2025-11-18',
      hoursWorked: 8,
      hourlyRate: 950,
      totalAmount: 7600,
      taskDescription: 'Desarrollo protocolo comunicación sensores IoT',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'paid',
      approvalStatus: 'approved',
      approvedBy: 'Patricia Morales',
      invoiceId: 'INV-2025-035'
    },
    {
      id: 'TIME-012',
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      employee: 'Juan Pérez',
      employeeId: 'EMP-001',
      date: '2025-11-17',
      hoursWorked: 7,
      hourlyRate: 750,
      totalAmount: 5250,
      taskDescription: 'Integración módulo contabilidad con reportes',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'María González'
    },
    {
      id: 'TIME-013',
      projectId: 'PROJ-003',
      projectCode: 'APP-2025-008',
      projectName: 'App Móvil Fintech - Innovatech',
      employee: 'Roberto Silva',
      employeeId: 'EMP-005',
      date: '2025-11-16',
      hoursWorked: 3,
      hourlyRate: 900,
      totalAmount: 0,
      taskDescription: 'Capacitación cliente uso plataforma',
      taskCategory: 'support',
      billable: false,
      billingStatus: 'non-billable',
      approvalStatus: 'approved',
      approvedBy: 'Ana Martínez',
      notes: 'Capacitación incluida en contrato'
    },
    {
      id: 'TIME-014',
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      employee: 'Carlos Ramírez',
      employeeId: 'EMP-003',
      date: '2025-11-15',
      hoursWorked: 5,
      hourlyRate: 800,
      totalAmount: 4000,
      taskDescription: 'Optimización SEO y performance',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'invoiced',
      approvalStatus: 'approved',
      approvedBy: 'Carlos Ramírez',
      invoiceId: 'INV-2025-042'
    },
    {
      id: 'TIME-015',
      projectId: 'PROJ-004',
      projectCode: 'INF-2025-015',
      projectName: 'Migración Cloud - Distribuidora Tech',
      employee: 'Sandra Ruiz',
      employeeId: 'EMP-008',
      date: '2025-11-14',
      hoursWorked: 6,
      hourlyRate: 850,
      totalAmount: 5100,
      taskDescription: 'Configuración CI/CD pipeline',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'draft',
      notes: 'Pendiente revisión PM'
    },
    {
      id: 'TIME-016',
      projectId: 'PROJ-005',
      projectCode: 'IOT-2025-004',
      projectName: 'Plataforma IoT Industrial - ManufactureTech',
      employee: 'Miguel Ángel Suárez',
      employeeId: 'EMP-011',
      date: '2025-11-13',
      hoursWorked: 4,
      hourlyRate: 950,
      totalAmount: 3800,
      taskDescription: 'Pruebas integración dashboard tiempo real',
      taskCategory: 'testing',
      billable: true,
      billingStatus: 'paid',
      approvalStatus: 'approved',
      approvedBy: 'Patricia Morales',
      invoiceId: 'INV-2025-035'
    },
    {
      id: 'TIME-017',
      projectId: 'PROJ-001',
      projectCode: 'ERP-2025-001',
      projectName: 'Implementación Sistema ERP - GlobalTech',
      employee: 'Ana Martínez',
      employeeId: 'EMP-002',
      date: '2025-11-12',
      hoursWorked: 7,
      hourlyRate: 850,
      totalAmount: 5950,
      taskDescription: 'Diseño módulo recursos humanos',
      taskCategory: 'design',
      billable: true,
      billingStatus: 'pending',
      approvalStatus: 'approved',
      approvedBy: 'María González'
    },
    {
      id: 'TIME-018',
      projectId: 'PROJ-002',
      projectCode: 'WEB-2025-012',
      projectName: 'Portal E-commerce Acme Corp',
      employee: 'Laura Hernández',
      employeeId: 'EMP-004',
      date: '2025-11-11',
      hoursWorked: 8,
      hourlyRate: 700,
      totalAmount: 5600,
      taskDescription: 'Desarrollo sistema gestión inventario',
      taskCategory: 'development',
      billable: true,
      billingStatus: 'invoiced',
      approvalStatus: 'approved',
      approvedBy: 'Carlos Ramírez',
      invoiceId: 'INV-2025-040'
    }
  ]

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Borrador
        </Badge>
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Enviado
        </Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Aprobado
        </Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rechazado
        </Badge>
      default:
        return null
    }
  }

  const getBillingBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-orange-300 text-orange-600">Pendiente</Badge>
      case 'invoiced':
        return <Badge variant="outline" className="border-blue-300 text-blue-600">Facturado</Badge>
      case 'paid':
        return <Badge variant="outline" className="border-green-300 text-green-600">Pagado</Badge>
      case 'non-billable':
        return <Badge variant="outline" className="border-gray-300 text-gray-600">No Facturable</Badge>
      default:
        return null
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      development: 'Desarrollo',
      design: 'Diseño',
      testing: 'Pruebas',
      meetings: 'Reuniones',
      documentation: 'Documentación',
      support: 'Soporte'
    }
    return labels[category] || category
  }

  const filteredEntries = timeEntries.filter(entry => {
    if (filterBillable !== 'all') {
      if (filterBillable === 'billable' && !entry.billable) return false
      if (filterBillable === 'non-billable' && entry.billable) return false
    }
    if (filterStatus !== 'all' && entry.approvalStatus !== filterStatus) return false
    if (filterProject !== 'all' && entry.projectId !== filterProject) return false
    if (searchTerm && !entry.taskDescription.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !entry.employee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !entry.projectName.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hoursWorked, 0)
  const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + e.hoursWorked, 0)
  const totalBillableAmount = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + e.totalAmount, 0)
  const pendingApproval = timeEntries.filter(e => e.approvalStatus === 'submitted' || e.approvalStatus === 'draft').length
  const avgHourlyRate = totalBillableAmount / (billableHours || 1)

  const uniqueProjects = Array.from(new Set(timeEntries.map(e => e.projectId)))

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
            <h1 className="text-2xl font-bold text-gray-900">Tiempo Facturable</h1>
            <p className="text-gray-600 mt-1">
              Registra y gestiona las horas trabajadas en proyectos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Entrada
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{totalHours}h</div>
              <div className="text-sm text-blue-700">Total Horas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{billableHours}h</div>
              <div className="text-sm text-green-700">Horas Facturables</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${(totalBillableAmount / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-purple-700">Monto Facturable</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900">{pendingApproval}</div>
              <div className="text-sm text-orange-700">Pendientes Aprobar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900">
                ${avgHourlyRate.toFixed(0)}
              </div>
              <div className="text-sm text-indigo-700">Tarifa Promedio/h</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por tarea, empleado o proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">Todos los Proyectos</option>
                {uniqueProjects.map(projectId => {
                  const project = timeEntries.find(e => e.projectId === projectId)
                  return (
                    <option key={projectId} value={projectId}>
                      {project?.projectCode}
                    </option>
                  )
                })}
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterBillable}
                onChange={(e) => setFilterBillable(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="billable">Facturable</option>
                <option value="non-billable">No Facturable</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="draft">Borrador</option>
                <option value="submitted">Enviado</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Tiempo ({filteredEntries.length} entradas)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proyecto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tarea</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Horas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tarifa/h</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Aprobación</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Facturación</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${
                      !entry.billable ? 'bg-gray-50' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(entry.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{entry.employee}</div>
                            <div className="text-xs text-gray-500">{entry.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-blue-600">
                          {entry.projectCode}
                        </div>
                        <div className="text-xs text-gray-500 max-w-[150px] truncate">
                          {entry.projectName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {entry.taskDescription}
                        </div>
                        {entry.notes && (
                          <div className="text-xs text-orange-600 mt-1">
                            {entry.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(entry.taskCategory)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-gray-900">
                          {entry.hoursWorked}h
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        ${entry.hourlyRate.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold ${
                          entry.billable ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          ${entry.totalAmount.toLocaleString('es-MX')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getApprovalBadge(entry.approvalStatus)}
                        {entry.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.approvedBy}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getBillingBadge(entry.billingStatus)}
                        {entry.invoiceId && (
                          <div className="text-xs text-blue-600 mt-1 font-mono">
                            {entry.invoiceId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          {entry.approvalStatus === 'draft' && (
                            <button className="p-1 text-gray-600 hover:bg-gray-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-900">
                      TOTALES:
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {totalHours}h
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      ${totalBillableAmount.toLocaleString('es-MX')}
                    </td>
                    <td colSpan={3} className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sistema de Tiempo Facturable</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Gestión completa de horas trabajadas con workflow de aprobación y facturación integrada.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Registro de Tiempo:</strong> Empleados registran horas diarias por proyecto y tarea específica</li>
                  <li>• <strong>Categorías:</strong> Desarrollo, Diseño, Pruebas, Reuniones, Documentación, Soporte</li>
                  <li>• <strong>Facturable vs No Facturable:</strong> Distingue horas cobrables al cliente de tiempo interno</li>
                  <li>• <strong>Workflow de Aprobación:</strong> Borrador → Enviado → Aprobado/Rechazado por PM</li>
                  <li>• <strong>Estados de Facturación:</strong> Pendiente → Facturado → Pagado (vinculado a invoices)</li>
                  <li>• <strong>Tarifas Personalizadas:</strong> Cada empleado tiene tarifa horaria según experiencia y rol</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

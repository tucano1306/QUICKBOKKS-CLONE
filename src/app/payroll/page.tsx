'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  LayoutDashboard, 
  FileText, 
  Calculator, 
  Clock,
  UserPlus,
  ClipboardList,
  CreditCard,
  Receipt,
  Banknote,
  BarChart3,
  Settings,
  ChevronRight,
  Plus,
  Search,
  CheckCircle,
  Edit,
  Download,
  Eye,
  FileCheck,
  Cog,
  Building2,
  Wallet,
  FileSpreadsheet,
  Printer,
  Hash,
  History,
  Send,
  FileBadge,
  PieChart,
  TrendingDown,
  Shield,
  UserCog,
  Briefcase,
  Table2,
  FileOutput,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import QuickAccessBar from '@/components/ui/quick-access-bar'

interface PayrollRun {
  id: string
  periodStart: string
  periodEnd: string
  grossSalary: number
  netSalary: number
  status: string
  paymentDate: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNumber: string
  }
}

export default function PayrollPage() {
  const { status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({ employees: 0, monthlyPayroll: 0, payrolls: 0 })
  const [recentPayrolls, setRecentPayrolls] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)

  const payrollLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
    { label: 'Empleados', href: '/payroll/employees', icon: Users, color: 'purple' },
    { label: 'Nóminas', href: '/payroll', icon: DollarSign, color: 'green' },
    { label: 'Reportes', href: '/company/payroll/reports', icon: FileText, color: 'orange' },
    { label: 'Impuestos', href: '/company/payroll/tax-filings', icon: Calculator, color: 'red' },
    { label: 'Horas', href: '/company/payroll/time-tracking', icon: Clock, color: 'indigo' }
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
      const [empRes, payrollRes] = await Promise.all([
        fetch('/api/employees?status=ACTIVE'),
        fetch('/api/payroll/runs'),
      ])

      if (empRes.ok) {
        const empData = await empRes.json()
        const employees = empData.data || empData
        const monthlyTotal = employees.reduce((sum: number, emp: any) => {
          if (emp.salaryType === 'MONTHLY') return sum + emp.salary
          if (emp.salaryType === 'YEARLY') return sum + emp.salary / 12
          if (emp.salaryType === 'BIWEEKLY') return sum + (emp.salary * 26) / 12
          if (emp.salaryType === 'WEEKLY') return sum + (emp.salary * 52) / 12
          return sum
        }, 0)

        setStats((prev) => ({
          ...prev,
          employees: employees.length,
          monthlyPayroll: monthlyTotal,
        }))
      }

      if (payrollRes.ok) {
        const payrollData = await payrollRes.json()
        setRecentPayrolls(payrollData.slice(0, 5))
        setStats((prev) => ({ ...prev, payrolls: payrollData.length }))
      }
    } catch (error) {
      console.error('Error loading payroll data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      APPROVED: 'bg-blue-500',
      PAID: 'bg-green-500',
      CANCELLED: 'bg-red-500',
    }
    return (
      <Badge className={colors[status] || 'bg-gray-500'}>
        {status}
      </Badge>
    )
  }

  if (status === 'loading' || loading) {
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
        <QuickAccessBar title="Navegación Nómina" links={payrollLinks} />
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💼 Gestión de Nómina</h1>
            <p className="text-gray-600 mt-1">
              Administra empleados, nóminas, impuestos y reportes
            </p>
          </div>
          <div className="space-x-2">
            <Link href="/payroll/employees">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Empleados
              </Button>
            </Link>
            <Link href="/payroll/runs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Nómina
              </Button>
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Empleados Activos</CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.employees}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Nómina Mensual</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${stats.monthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Nóminas Procesadas</CardTitle>
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.payrolls}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Impuestos YTD</CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$0</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu de Opciones Principal */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/employees">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Registro de Personal</h3>
                    <p className="text-sm text-gray-500">Gestionar empleados</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/time-tracking">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Control de Horas</h3>
                    <p className="text-sm text-gray-500">Registro de tiempo</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/runs/new">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calculator className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Cálculo de Nómina</h3>
                    <p className="text-sm text-gray-500">Procesar pagos</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/payments">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Procesar Pagos</h3>
                    <p className="text-sm text-gray-500">Transferencias y depósitos</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/checks">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Cheques de Pago</h3>
                    <p className="text-sm text-gray-500">Generar y gestionar</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/taxes">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Banknote className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Impuestos de Nómina</h3>
                    <p className="text-sm text-gray-500">ISR, IMSS, Infonavit</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/reports">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Reportes de Nómina</h3>
                    <p className="text-sm text-gray-500">Resúmenes y análisis</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/labor-costs">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-pink-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Análisis de Costos</h3>
                    <p className="text-sm text-gray-500">Costos laborales</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payroll/settings">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Settings className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Configuración</h3>
                    <p className="text-sm text-gray-500">Ajustes de nómina</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Sección: Registro de Personal */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Users className="h-5 w-5" />
              📋 Registro de Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/employees?action=new">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-blue-50">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  📋 Formulario de alta
                </Button>
              </Link>
              <Link href="/payroll/employees/documents">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  📄 Documentos requeridos
                </Button>
              </Link>
              <Link href="/payroll/employees?action=validate">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-blue-50">
                  <Search className="h-4 w-4 text-blue-600" />
                  🔍 Validar datos
                </Button>
              </Link>
              <Link href="/payroll/employees/approvals">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  ✅ Aprobación de registro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Control de Horas */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Clock className="h-5 w-5" />
              ⏱️ Control de Horas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/time-tracking/clock">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-purple-50">
                  <Clock className="h-4 w-4 text-purple-600" />
                  🕒 Registrar entrada/salida
                </Button>
              </Link>
              <Link href="/payroll/time-tracking">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-purple-50">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  📊 Ver horas trabajadas
                </Button>
              </Link>
              <Link href="/payroll/time-tracking/edit">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-purple-50">
                  <Edit className="h-4 w-4 text-purple-600" />
                  ✏️ Editar registros
                </Button>
              </Link>
              <Link href="/payroll/time-tracking/export">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-purple-50">
                  <Download className="h-4 w-4 text-purple-600" />
                  📤 Exportar horas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Cálculo de Nómina */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calculator className="h-5 w-5" />
              💵 Cálculo de Nómina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/settings/rules">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-green-50">
                  <Cog className="h-4 w-4 text-green-600" />
                  ⚙️ Configurar reglas de pago
                </Button>
              </Link>
              <Link href="/payroll/runs/new">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-green-50">
                  <Calculator className="h-4 w-4 text-green-600" />
                  📊 Calcular nómina
                </Button>
              </Link>
              <Link href="/payroll/runs/preview">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-green-50">
                  <Eye className="h-4 w-4 text-green-600" />
                  🔍 Previsualizar cálculo
                </Button>
              </Link>
              <Link href="/payroll/runs/confirm">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-green-50">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  ✅ Confirmar nómina
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Transferencia Bancaria / Pagos */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Building2 className="h-5 w-5" />
              🏦 Transferencia Bancaria y Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/payments/transfer">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-orange-50">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  🏦 Transferencia bancaria
                </Button>
              </Link>
              <Link href="/payroll/payments/cash">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-orange-50">
                  <Wallet className="h-4 w-4 text-orange-600" />
                  💵 Pago en efectivo
                </Button>
              </Link>
              <Link href="/payroll/payments/receipt">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-orange-50">
                  <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                  📑 Generar comprobante
                </Button>
              </Link>
              <Link href="/payroll/payments/history">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-orange-50">
                  <History className="h-4 w-4 text-orange-600" />
                  🔍 Historial de pagos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Cheques de Pago */}
        <Card className="border-cyan-200 bg-cyan-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-800">
              <Receipt className="h-5 w-5" />
              🧾 Cheques de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/checks/new">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-cyan-50">
                  <Edit className="h-4 w-4 text-cyan-600" />
                  📝 Emitir cheque
                </Button>
              </Link>
              <Link href="/payroll/checks/assign">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-cyan-50">
                  <Hash className="h-4 w-4 text-cyan-600" />
                  🔢 Asignar número de cheque
                </Button>
              </Link>
              <Link href="/payroll/checks/print">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-cyan-50">
                  <Printer className="h-4 w-4 text-cyan-600" />
                  📤 Imprimir cheque
                </Button>
              </Link>
              <Link href="/payroll/checks/history">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-cyan-50">
                  <History className="h-4 w-4 text-cyan-600" />
                  📊 Historial de cheques
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Impuestos de Nómina */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Banknote className="h-5 w-5" />
              🏛️ Impuestos de Nómina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Link href="/payroll/tax-filings/rt6">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <FileBadge className="h-4 w-4 text-red-600" />
                  📄 Formulario RT-6
                </Button>
              </Link>
              <Link href="/payroll/tax-filings/941">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <FileBadge className="h-4 w-4 text-red-600" />
                  📄 Formulario 941
                </Button>
              </Link>
              <Link href="/payroll/tax-filings/940">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <FileBadge className="h-4 w-4 text-red-600" />
                  📄 Formulario 940
                </Button>
              </Link>
              <Link href="/payroll/tax-filings/w2">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <FileBadge className="h-4 w-4 text-red-600" />
                  📄 Formulario W-2
                </Button>
              </Link>
              <Link href="/payroll/tax-filings/1099">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <FileBadge className="h-4 w-4 text-red-600" />
                  📄 Formulario 1099
                </Button>
              </Link>
              <Link href="/payroll/tax-filings/submit">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-red-50">
                  <Send className="h-4 w-4 text-red-600" />
                  📤 Enviar reportes fiscales
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Reportes de Nómina */}
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <FileText className="h-5 w-5" />
              📊 Reportes de Nómina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Link href="/payroll/reports/monthly">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-indigo-50">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  📊 Resumen mensual
                </Button>
              </Link>
              <Link href="/payroll/reports/annual">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-indigo-50">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  📊 Resumen anual
                </Button>
              </Link>
              <Link href="/payroll/reports/by-employee">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-indigo-50">
                  <Users className="h-4 w-4 text-indigo-600" />
                  📊 Reporte por empleado
                </Button>
              </Link>
              <Link href="/payroll/reports/by-department">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-indigo-50">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  📊 Reporte por departamento
                </Button>
              </Link>
              <Link href="/payroll/reports/export">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-indigo-50">
                  <FileOutput className="h-4 w-4 text-indigo-600" />
                  📤 Exportar a Excel/PDF
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Análisis de Costos Laborales */}
        <Card className="border-pink-200 bg-pink-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-800">
              <PieChart className="h-5 w-5" />
              📈 Análisis de Costos Laborales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/payroll/labor-costs/by-employee">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-pink-50">
                  <Users className="h-4 w-4 text-pink-600" />
                  📊 Costo por empleado
                </Button>
              </Link>
              <Link href="/payroll/labor-costs/by-department">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-pink-50">
                  <Building2 className="h-4 w-4 text-pink-600" />
                  📊 Costo por departamento
                </Button>
              </Link>
              <Link href="/payroll/labor-costs/comparison">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-pink-50">
                  <TrendingDown className="h-4 w-4 text-pink-600" />
                  📊 Comparativo mensual/anual
                </Button>
              </Link>
              <Link href="/payroll/labor-costs/projections">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-pink-50">
                  <TrendingUp className="h-4 w-4 text-pink-600" />
                  📊 Proyecciones de costos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Configuración / Administración */}
        <Card className="border-gray-300 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Settings className="h-5 w-5" />
              ⚙️ Configuración / Administración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Link href="/payroll/settings/users">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-gray-100">
                  <UserCog className="h-4 w-4 text-gray-600" />
                  👤 Usuarios y permisos
                </Button>
              </Link>
              <Link href="/payroll/settings/company">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-gray-100">
                  <Briefcase className="h-4 w-4 text-gray-600" />
                  💼 Parámetros de empresa
                </Button>
              </Link>
              <Link href="/payroll/settings/salary-tables">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-gray-100">
                  <Table2 className="h-4 w-4 text-gray-600" />
                  💵 Tablas salariales
                </Button>
              </Link>
              <Link href="/payroll/settings/templates">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-600" />
                  📄 Plantillas de reportes
                </Button>
              </Link>
              <Link href="/payroll/settings/security">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-gray-100">
                  <Lock className="h-4 w-4 text-gray-600" />
                  🔒 Seguridad y auditoría
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas Empleados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              👥 Empleados - Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/payroll/employees?action=new">
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  ➕ Agregar empleado
                </Button>
              </Link>
              <Link href="/payroll/employees">
                <Button variant="outline" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  📋 Ver lista
                </Button>
              </Link>
              <Link href="/payroll/employees">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  📂 Perfiles
                </Button>
              </Link>
              <Link href="/payroll/employees">
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  📑 Historial laboral
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Nóminas Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Nóminas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayrolls.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay nóminas procesadas
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Crea tu primera nómina para empezar a procesar pagos de empleados.
                </p>
                <Link href="/payroll/runs/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nómina
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Empleado</th>
                      <th className="text-left py-2">Período</th>
                      <th className="text-right py-2">Bruto</th>
                      <th className="text-right py-2">Neto</th>
                      <th className="text-left py-2">Fecha Pago</th>
                      <th className="text-left py-2">Estado</th>
                      <th className="text-right py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayrolls.map((payroll) => (
                      <tr key={payroll.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {payroll.employee.firstName} {payroll.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payroll.employee.employeeNumber}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
                            {new Date(payroll.periodEnd).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="text-right py-3">
                          ${payroll.grossSalary.toFixed(2)}
                        </td>
                        <td className="text-right py-3 font-medium">
                          ${payroll.netSalary.toFixed(2)}
                        </td>
                        <td className="py-3">
                          {payroll.paymentDate
                            ? new Date(payroll.paymentDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="py-3">{getStatusBadge(payroll.status)}</td>
                        <td className="text-right py-3">
                          <Link href={`/payroll/runs/${payroll.id}`}>
                            <Button size="sm" variant="outline">
                              Ver
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

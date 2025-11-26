'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Calendar, TrendingUp, LayoutDashboard, FileText, Calculator, PieChart, Clock } from 'lucide-react'
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
    { label: 'Empleados', href: '/company/payroll/employees', icon: Users, color: 'purple' },
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
        fetch('/api/payroll/employees?status=ACTIVE'),
        fetch('/api/payroll/runs'),
      ])

      if (empRes.ok) {
        const empData = await empRes.json()
        const monthlyTotal = empData.reduce((sum: number, emp: any) => {
          if (emp.salaryType === 'MONTHLY') return sum + emp.salary
          if (emp.salaryType === 'YEARLY') return sum + emp.salary / 12
          if (emp.salaryType === 'BIWEEKLY') return sum + (emp.salary * 26) / 12
          if (emp.salaryType === 'WEEKLY') return sum + (emp.salary * 52) / 12
          return sum
        }, 0)

        setStats((prev) => ({
          ...prev,
          employees: empData.length,
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
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-600 mt-1">
              Manage employees, payroll runs, and tax withholdings
            </p>
          </div>
          <div className="space-x-2">
            <Link href="/payroll/runs/new">
              <Button>New Payroll Run</Button>
            </Link>
            <Link href="/payroll/employees">
              <Button variant="outline">Manage Employees</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Employees</CardTitle>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.employees}</p>
              <p className="text-sm text-gray-600 mt-1">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Monthly Payroll</CardTitle>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${stats.monthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-gray-600 mt-1">Estimated monthly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payroll Runs</CardTitle>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.payrolls}</p>
              <p className="text-sm text-gray-600 mt-1">Total payroll runs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">YTD Taxes</CardTitle>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-gray-600 mt-1">Tax withholdings</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayrolls.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Payroll Runs Yet
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Create your first payroll run to start processing employee payments.
                </p>
                <Link href="/payroll/runs/new">
                  <Button>Create Payroll Run</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Employee</th>
                      <th className="text-left py-2">Period</th>
                      <th className="text-right py-2">Gross</th>
                      <th className="text-right py-2">Net</th>
                      <th className="text-left py-2">Payment Date</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Actions</th>
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
                              View
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

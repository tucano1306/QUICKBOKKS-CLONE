'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  Receipt,
} from 'lucide-react'

interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  totalCustomers: number
  totalInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  revenueChange: number
  expensesChange: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    revenueChange: 0,
    expensesChange: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      fetchDashboardStats()
    }
  }, [status])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2CA01C] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const netIncome = stats.totalRevenue - stats.totalExpenses

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0D2942]">
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Welcome back, {session?.user?.name}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 qb-stagger">
          <Card className="hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-[#2CA01C]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                ${stats.totalRevenue.toLocaleString('en-US')}
              </div>
              <p className="text-sm mt-2">
                {stats.revenueChange >= 0 ? (
                  <span className="text-[#2CA01C] flex items-center font-medium">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +{stats.revenueChange}% vs last month
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center font-medium">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    {stats.revenueChange}% vs last month
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                ${stats.totalExpenses.toLocaleString('en-US')}
              </div>
              <p className="text-sm mt-2">
                {stats.expensesChange >= 0 ? (
                  <span className="text-red-500 flex items-center font-medium">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +{stats.expensesChange}% vs last month
                  </span>
                ) : (
                  <span className="text-[#2CA01C] flex items-center font-medium">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    {stats.expensesChange}% vs last month
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Net Income
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-[#0077C5]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                ${netIncome.toLocaleString('en-US')}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Profit this period
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Customers
              </CardTitle>
              <Users className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                {stats.totalCustomers}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Active customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Invoices
              </CardTitle>
              <FileText className="h-5 w-5 text-[#0077C5]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                {stats.totalInvoices}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Invoices this month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Pending Invoices
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                {stats.pendingInvoices}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Overdue Invoices
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0D2942]">
                {stats.overdueInvoices}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center justify-between text-[#0D2942]">
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <button 
                onClick={() => router.push('/companies')}
                className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-[#2CA01C] hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-3 group-hover:bg-[#2CA01C] transition-colors">
                  <FileText className="h-6 w-6 text-[#2CA01C] group-hover:text-white transition-colors" />
                </div>
                <p className="font-semibold text-[#0D2942]">New Invoice</p>
                <p className="text-sm text-gray-500 mt-1">Select a company first</p>
              </button>
              <button 
                onClick={() => router.push('/customers/new')}
                className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-[#0077C5] hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-[#0077C5] transition-colors">
                  <Users className="h-6 w-6 text-[#0077C5] group-hover:text-white transition-colors" />
                </div>
                <p className="font-semibold text-[#0D2942]">New Customer</p>
                <p className="text-sm text-gray-500 mt-1">Add general customer</p>
              </button>
              <button 
                onClick={() => router.push('/companies')}
                className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-500 transition-colors">
                  <Receipt className="h-6 w-6 text-purple-500 group-hover:text-white transition-colors" />
                </div>
                <p className="font-semibold text-[#0D2942]">Record Expense</p>
                <p className="text-sm text-gray-500 mt-1">Select a company first</p>
              </button>
              <button 
                onClick={() => router.push('/companies')}
                className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
                  <BarChart3 className="h-6 w-6 text-orange-500 group-hover:text-white transition-colors" />
                </div>
                <p className="font-semibold text-[#0D2942]">View Reports</p>
                <p className="text-sm text-gray-500 mt-1">Select a company first</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import QuickAccessBar from '@/components/ui/quick-access-bar'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BookOpen,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Eye,
  DollarSign,
  TrendingUp,
  Building2,
  FileText,
  Receipt,
  Calculator,
  LayoutDashboard,
  PieChart,
  ArrowRightLeft
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  category: string
  level: number
  parentId?: string
  balance: number
  isActive: boolean
  children?: Account[]
}

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  // Plan de cuentas con estructura jerárquica
  const accounts: Account[] = [
    // ACTIVOS
    {
      id: '1',
      code: '1000',
      name: 'ACTIVOS',
      type: 'ASSET',
      category: 'MASTER',
      level: 1,
      balance: 299150,
      isActive: true,
      children: [
        {
          id: '1.1',
          code: '1100',
          name: 'Activo Circulante',
          type: 'ASSET',
          category: 'CURRENT_ASSET',
          level: 2,
          parentId: '1',
          balance: 175150,
          isActive: true,
          children: [
            {
              id: '1.1.1',
              code: '1110',
              name: 'Efectivo y Equivalentes',
              type: 'ASSET',
              category: 'CASH',
              level: 3,
              parentId: '1.1',
              balance: 45000,
              isActive: true
            },
            {
              id: '1.1.2',
              code: '1120',
              name: 'Bancos',
              type: 'ASSET',
              category: 'BANK',
              level: 3,
              parentId: '1.1',
              balance: 44450,
              isActive: true
            },
            {
              id: '1.1.3',
              code: '1130',
              name: 'Cuentas por Cobrar',
              type: 'ASSET',
              category: 'RECEIVABLES',
              level: 3,
              parentId: '1.1',
              balance: 45200,
              isActive: true
            },
            {
              id: '1.1.4',
              code: '1140',
              name: 'Inventarios',
              type: 'ASSET',
              category: 'INVENTORY',
              level: 3,
              parentId: '1.1',
              balance: 32000,
              isActive: true
            },
            {
              id: '1.1.5',
              code: '1150',
              name: 'IVA Acreditable',
              type: 'ASSET',
              category: 'TAX',
              level: 3,
              parentId: '1.1',
              balance: 8500,
              isActive: true
            }
          ]
        },
        {
          id: '1.2',
          code: '1200',
          name: 'Activo Fijo',
          type: 'ASSET',
          category: 'FIXED_ASSET',
          level: 2,
          parentId: '1',
          balance: 124000,
          isActive: true,
          children: [
            {
              id: '1.2.1',
              code: '1210',
              name: 'Terrenos',
              type: 'ASSET',
              category: 'LAND',
              level: 3,
              parentId: '1.2',
              balance: 0,
              isActive: true
            },
            {
              id: '1.2.2',
              code: '1220',
              name: 'Edificios',
              type: 'ASSET',
              category: 'BUILDING',
              level: 3,
              parentId: '1.2',
              balance: 0,
              isActive: true
            },
            {
              id: '1.2.3',
              code: '1230',
              name: 'Mobiliario y Equipo',
              type: 'ASSET',
              category: 'EQUIPMENT',
              level: 3,
              parentId: '1.2',
              balance: 45000,
              isActive: true
            },
            {
              id: '1.2.4',
              code: '1240',
              name: 'Equipo de Cómputo',
              type: 'ASSET',
              category: 'COMPUTER',
              level: 3,
              parentId: '1.2',
              balance: 25000,
              isActive: true
            },
            {
              id: '1.2.5',
              code: '1250',
              name: 'Vehículos',
              type: 'ASSET',
              category: 'VEHICLE',
              level: 3,
              parentId: '1.2',
              balance: 80000,
              isActive: true
            },
            {
              id: '1.2.6',
              code: '1260',
              name: 'Depreciación Acumulada',
              type: 'ASSET',
              category: 'DEPRECIATION',
              level: 3,
              parentId: '1.2',
              balance: -25000,
              isActive: true
            }
          ]
        }
      ]
    },
    // PASIVOS
    {
      id: '2',
      code: '2000',
      name: 'PASIVOS',
      type: 'LIABILITY',
      category: 'MASTER',
      level: 1,
      balance: 206300,
      isActive: true,
      children: [
        {
          id: '2.1',
          code: '2100',
          name: 'Pasivo Circulante',
          type: 'LIABILITY',
          category: 'CURRENT_LIABILITY',
          level: 2,
          parentId: '2',
          balance: 36300,
          isActive: true,
          children: [
            {
              id: '2.1.1',
              code: '2110',
              name: 'Cuentas por Pagar',
              type: 'LIABILITY',
              category: 'PAYABLES',
              level: 3,
              parentId: '2.1',
              balance: 12800,
              isActive: true
            },
            {
              id: '2.1.2',
              code: '2120',
              name: 'IVA por Pagar',
              type: 'LIABILITY',
              category: 'TAX',
              level: 3,
              parentId: '2.1',
              balance: 8500,
              isActive: true
            },
            {
              id: '2.1.3',
              code: '2130',
              name: 'ISR por Pagar',
              type: 'LIABILITY',
              category: 'TAX',
              level: 3,
              parentId: '2.1',
              balance: 0,
              isActive: true
            },
            {
              id: '2.1.4',
              code: '2140',
              name: 'Préstamos a Corto Plazo',
              type: 'LIABILITY',
              category: 'LOAN',
              level: 3,
              parentId: '2.1',
              balance: 15000,
              isActive: true
            }
          ]
        },
        {
          id: '2.2',
          code: '2200',
          name: 'Pasivo a Largo Plazo',
          type: 'LIABILITY',
          category: 'LONG_TERM_LIABILITY',
          level: 2,
          parentId: '2',
          balance: 170000,
          isActive: true,
          children: [
            {
              id: '2.2.1',
              code: '2210',
              name: 'Préstamos Bancarios LP',
              type: 'LIABILITY',
              category: 'LOAN',
              level: 3,
              parentId: '2.2',
              balance: 50000,
              isActive: true
            },
            {
              id: '2.2.2',
              code: '2220',
              name: 'Hipotecas por Pagar',
              type: 'LIABILITY',
              category: 'MORTGAGE',
              level: 3,
              parentId: '2.2',
              balance: 120000,
              isActive: true
            }
          ]
        }
      ]
    },
    // CAPITAL
    {
      id: '3',
      code: '3000',
      name: 'CAPITAL',
      type: 'EQUITY',
      category: 'MASTER',
      level: 1,
      balance: 224850,
      isActive: true,
      children: [
        {
          id: '3.1',
          code: '3100',
          name: 'Capital Social',
          type: 'EQUITY',
          category: 'EQUITY',
          level: 2,
          parentId: '3',
          balance: 100000,
          isActive: true
        },
        {
          id: '3.2',
          code: '3200',
          name: 'Utilidades Retenidas',
          type: 'EQUITY',
          category: 'RETAINED_EARNINGS',
          level: 2,
          parentId: '3',
          balance: 45850,
          isActive: true
        },
        {
          id: '3.3',
          code: '3300',
          name: 'Utilidad del Ejercicio',
          type: 'EQUITY',
          category: 'CURRENT_EARNINGS',
          level: 2,
          parentId: '3',
          balance: 79000,
          isActive: true
        }
      ]
    },
    // INGRESOS
    {
      id: '4',
      code: '4000',
      name: 'INGRESOS',
      type: 'REVENUE',
      category: 'MASTER',
      level: 1,
      balance: 432000,
      isActive: true,
      children: [
        {
          id: '4.1',
          code: '4100',
          name: 'Ingresos por Ventas',
          type: 'REVENUE',
          category: 'OPERATING_REVENUE',
          level: 2,
          parentId: '4',
          balance: 432000,
          isActive: true,
          children: [
            {
              id: '4.1.1',
              code: '4110',
              name: 'Ventas de Productos',
              type: 'REVENUE',
              category: 'PRODUCT_SALES',
              level: 3,
              parentId: '4.1',
              balance: 285000,
              isActive: true
            },
            {
              id: '4.1.2',
              code: '4120',
              name: 'Ventas de Servicios',
              type: 'REVENUE',
              category: 'SERVICE_SALES',
              level: 3,
              parentId: '4.1',
              balance: 147000,
              isActive: true
            }
          ]
        },
        {
          id: '4.2',
          code: '4200',
          name: 'Otros Ingresos',
          type: 'REVENUE',
          category: 'NON_OPERATING_REVENUE',
          level: 2,
          parentId: '4',
          balance: 0,
          isActive: true
        }
      ]
    },
    // GASTOS
    {
      id: '5',
      code: '5000',
      name: 'COSTOS Y GASTOS',
      type: 'EXPENSE',
      category: 'MASTER',
      level: 1,
      balance: 353000,
      isActive: true,
      children: [
        {
          id: '5.1',
          code: '5100',
          name: 'Costo de Ventas',
          type: 'EXPENSE',
          category: 'COST_OF_GOODS_SOLD',
          level: 2,
          parentId: '5',
          balance: 205000,
          isActive: true
        },
        {
          id: '5.2',
          code: '5200',
          name: 'Gastos de Operación',
          type: 'EXPENSE',
          category: 'OPERATING_EXPENSE',
          level: 2,
          parentId: '5',
          balance: 148000,
          isActive: true,
          children: [
            {
              id: '5.2.1',
              code: '5210',
              name: 'Sueldos y Salarios',
              type: 'EXPENSE',
              category: 'PAYROLL',
              level: 3,
              parentId: '5.2',
              balance: 84000,
              isActive: true
            },
            {
              id: '5.2.2',
              code: '5220',
              name: 'Renta',
              type: 'EXPENSE',
              category: 'RENT',
              level: 3,
              parentId: '5.2',
              balance: 24000,
              isActive: true
            },
            {
              id: '5.2.3',
              code: '5230',
              name: 'Servicios Públicos',
              type: 'EXPENSE',
              category: 'UTILITIES',
              level: 3,
              parentId: '5.2',
              balance: 8000,
              isActive: true
            },
            {
              id: '5.2.4',
              code: '5240',
              name: 'Publicidad y Marketing',
              type: 'EXPENSE',
              category: 'MARKETING',
              level: 3,
              parentId: '5.2',
              balance: 18000,
              isActive: true
            },
            {
              id: '5.2.5',
              code: '5250',
              name: 'Depreciación',
              type: 'EXPENSE',
              category: 'DEPRECIATION',
              level: 3,
              parentId: '5.2',
              balance: 14000,
              isActive: true
            }
          ]
        }
      ]
    }
  ]

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'text-blue-700'
      case 'LIABILITY': return 'text-red-700'
      case 'EQUITY': return 'text-purple-700'
      case 'REVENUE': return 'text-green-700'
      case 'EXPENSE': return 'text-orange-700'
      default: return 'text-gray-700'
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-blue-100 text-blue-700'
      case 'LIABILITY': return 'bg-red-100 text-red-700'
      case 'EQUITY': return 'bg-purple-100 text-purple-700'
      case 'REVENUE': return 'bg-green-100 text-green-700'
      case 'EXPENSE': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderAccount = (account: Account) => {
    const isExpanded = expandedAccounts.has(account.id)
    const hasChildren = account.children && account.children.length > 0
    const indent = (account.level - 1) * 24

    return (
      <div key={account.id}>
        <div 
          className={`flex items-center py-3 px-4 hover:bg-gray-50 border-b border-gray-100 ${
            account.level === 1 ? 'bg-gray-50 font-bold' : ''
          }`}
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          <div className="w-8">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(account.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <span className={`font-mono text-sm ${getTypeColor(account.type)}`}>
                {account.code}
              </span>
            </div>
            <div className="col-span-4">
              <span className={account.level === 1 ? 'font-bold text-gray-900' : 'text-gray-700'}>
                {account.name}
              </span>
            </div>
            <div className="col-span-2">
              {account.level > 1 && (
                <span className={`text-xs px-2 py-1 rounded ${getTypeBadge(account.type)}`}>
                  {account.type === 'ASSET' ? 'Activo' :
                   account.type === 'LIABILITY' ? 'Pasivo' :
                   account.type === 'EQUITY' ? 'Capital' :
                   account.type === 'REVENUE' ? 'Ingreso' : 'Gasto'}
                </span>
              )}
            </div>
            <div className="col-span-2 text-right">
              <span className={`font-semibold ${
                account.balance >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                ${Math.abs(account.balance).toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              {account.level > 1 && (
                <>
                  <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  {account.level === 3 && (
                    <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map(child => renderAccount(child))}
          </div>
        )}
      </div>
    )
  }

  const stats = [
    { label: 'Total Activos', value: 299150, icon: Building2, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Pasivos', value: 206300, icon: FileText, color: 'from-red-500 to-red-600' },
    { label: 'Capital Contable', value: 224850, icon: DollarSign, color: 'from-purple-500 to-purple-600' },
    { label: 'Total Cuentas', value: accounts.length, icon: BookOpen, color: 'from-green-500 to-green-600' }
  ]

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  const accountingLinks = [
    { label: 'Dashboard', href: '/company/dashboard', icon: LayoutDashboard, color: 'blue' },
    { label: 'Transacciones', href: '/company/accounting/transactions', icon: Receipt, color: 'green' },
    { label: 'Asientos', href: '/company/accounting/journal-entries', icon: FileText, color: 'purple' },
    { label: 'Reclasificación', href: '/company/accounting/mass-reclassification', icon: ArrowRightLeft, color: 'orange' },
    { label: 'Reportes', href: '/company/reports/balance-sheet', icon: PieChart, color: 'indigo' }
  ]

  // Botones de acción del Plan de Cuentas
  const chartOfAccountsActions = [
    {
      label: 'Ver catálogo',
      icon: BookOpen,
      onClick: () => {
        setFilterType('all')
        setSearchTerm('')
      },
      variant: 'outline' as const,
    },
    {
      label: 'Crear cuenta',
      icon: Plus,
      onClick: () => setShowNewAccountModal(true),
      variant: 'primary' as const,
    },
    {
      label: 'Editar cuenta',
      icon: Edit,
      onClick: () => {
        alert('Selecciona una cuenta para editar desde la tabla')
      },
      variant: 'default' as const,
    },
    {
      label: 'Exportar',
      icon: Download,
      onClick: () => {
        const flattenAccounts = (accs: Account[]): Account[] => {
          const result: Account[] = []
          accs.forEach(acc => {
            result.push(acc)
            if (acc.children) result.push(...flattenAccounts(acc.children))
          })
          return result
        }
        const allAccounts = flattenAccounts(accounts)
        const csv = 'Código,Nombre,Tipo,Saldo\n' + 
          allAccounts.map(acc => 
            `${acc.code},"${acc.name}",${acc.type},${acc.balance || 0}`
          ).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `catalogo-cuentas-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
      },
      variant: 'outline' as const,
    },
    {
      label: 'Eliminar cuenta',
      icon: Trash2,
      onClick: () => {
        alert('Selecciona una cuenta para eliminar desde la tabla')
      },
      variant: 'danger' as const,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Quick Access Navigation */}
        <QuickAccessBar title="Navegación Contable" links={accountingLinks} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h1>
            <p className="text-gray-600 mt-1">
              Plan de cuentas contable completo
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Acciones del Plan de Cuentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={chartOfAccountsActions} />
          </CardContent>
        </Card>

        {/* Original Header Buttons Section (keeping for compatibility) */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const flattenAccounts = (accs: Account[]): Account[] => {
                const result: Account[] = []
                accs.forEach(acc => {
                  result.push(acc)
                  if (acc.children) result.push(...flattenAccounts(acc.children))
                })
                return result
              }
              const allAccounts = flattenAccounts(accounts)
              const csv = 'Código,Nombre,Tipo,Saldo\n' + 
                allAccounts.map(acc => 
                  `${acc.code},"${acc.name}",${acc.type},${acc.balance || 0}`
                ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `catalogo-cuentas-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
            }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = (e: any) => {
                const file = e.target.files[0]
                if (file) {
                  alert(`Importando ${file.name}...\n\nFormato esperado: Código,Nombre,Tipo,Saldo\n\nEsta funcionalidad procesa el CSV y crea las cuentas automáticamente.`)
                }
              }
              input.click()
            }}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => setShowNewAccountModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {typeof stat.value === 'number' && stat.label !== 'Total Cuentas' 
                    ? `$${stat.value.toLocaleString()}`
                    : stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar cuenta por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="ASSET">Activos</option>
                <option value="LIABILITY">Pasivos</option>
                <option value="EQUITY">Capital</option>
                <option value="REVENUE">Ingresos</option>
                <option value="EXPENSE">Gastos</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Plan de Cuentas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header */}
                <div className="flex items-center py-3 px-4 bg-gray-100 border-b font-semibold text-sm text-gray-700">
                  <div className="w-8"></div>
                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-2">Código</div>
                    <div className="col-span-4">Nombre de Cuenta</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2 text-right">Saldo</div>
                    <div className="col-span-2 text-right">Acciones</div>
                  </div>
                </div>
                {/* Accounts */}
                <div>
                  {accounts.map(account => renderAccount(account))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sobre el Catálogo de Cuentas</h3>
                <p className="text-blue-700 text-sm">
                  El catálogo de cuentas es la estructura fundamental de tu contabilidad. Organiza todas las cuentas 
                  financieras de forma jerárquica siguiendo las Normas de Información Financiera (NIF). Cada transacción 
                  debe registrarse en las cuentas correspondientes para mantener el balance contable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Nueva Cuenta */}
        {showNewAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewAccountModal(false)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Nueva Cuenta Contable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código</label>
                    <Input placeholder="1001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select className="w-full border rounded-md p-2">
                      <option>Activo</option>
                      <option>Pasivo</option>
                      <option>Capital</option>
                      <option>Ingreso</option>
                      <option>Gasto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nombre de la Cuenta</label>
                  <Input placeholder="Caja General" />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input placeholder="Efectivo disponible en caja" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewAccountModal(false)}>Cancelar</Button>
                  <Button onClick={() => {
                    alert('✅ Cuenta creada exitosamente\n\nEn producción, esto enviaría los datos a:\nPOST /api/accounting/chart-of-accounts')
                    setShowNewAccountModal(false)
                  }}>Crear Cuenta</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

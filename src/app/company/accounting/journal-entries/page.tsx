'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import ActionButtonsGroup from '@/components/ui/action-buttons-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  History
} from 'lucide-react'

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  reference?: string
  status: 'draft' | 'posted' | 'reversed'
  createdBy: string
  totalDebit: number
  totalCredit: number
  lines: JournalLine[]
}

interface JournalLine {
  id: string
  accountCode: string
  accountName: string
  description: string
  debit: number
  credit: number
}

export default function JournalEntriesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  
  // Estados para nueva póliza
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [newEntryRef, setNewEntryRef] = useState('')
  const [newEntryDesc, setNewEntryDesc] = useState('')
  const [newEntryLines, setNewEntryLines] = useState<JournalLine[]>([
    { id: '1', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }, [])

  // Funciones para manejar la nueva póliza
  const addNewLine = () => {
    const newId = (newEntryLines.length + 1).toString()
    setNewEntryLines([...newEntryLines, { 
      id: newId, 
      accountCode: '', 
      accountName: '', 
      description: '', 
      debit: 0, 
      credit: 0 
    }])
  }

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setNewEntryLines(newEntryLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ))
  }

  const removeLine = (id: string) => {
    if (newEntryLines.length > 2) {
      setNewEntryLines(newEntryLines.filter(line => line.id !== id))
    }
  }

  const calculateTotals = () => {
    const totalDebit = newEntryLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const totalCredit = newEntryLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    return { totalDebit, totalCredit, balanced: totalDebit === totalCredit && totalDebit > 0 }
  }

  const createJournalEntry = () => {
    const { totalDebit, totalCredit, balanced } = calculateTotals()
    
    if (!newEntryDesc) {
      alert('❌ Falta la descripción de la póliza')
      return
    }

    if (!balanced) {
      alert(`❌ La póliza no está balanceada:\n\nTotal Cargos: $${totalDebit.toFixed(2)}\nTotal Abonos: $${totalCredit.toFixed(2)}\nDiferencia: $${Math.abs(totalDebit - totalCredit).toFixed(2)}\n\n⚠️ Los cargos y abonos deben ser iguales.`)
      return
    }

    // Validar que todas las líneas tengan cuenta
    const invalidLines = newEntryLines.filter(line => !line.accountCode || (!line.debit && !line.credit))
    if (invalidLines.length > 0) {
      alert('❌ Todas las partidas deben tener código de cuenta y monto (cargo o abono)')
      return
    }

    alert(`✅ Póliza Contable Creada Exitosamente\n\n📋 Número: JE-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(3, '0')}\n📅 Fecha: ${newEntryDate}\n💰 Total Cargos: $${totalDebit.toLocaleString()}\n💰 Total Abonos: $${totalCredit.toLocaleString()}\n✅ Estado: Borrador\n\nEn producción, esto se guardaría en la base de datos y se reflejaría en el balance y estado de resultados.`)
    
    // Reset form
    setShowNewModal(false)
    setNewEntryDesc('')
    setNewEntryRef('')
    setNewEntryLines([
      { id: '1', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
      { id: '2', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
    ])
  }

  const journalEntries: JournalEntry[] = [
    {
      id: 'JE-001',
      entryNumber: 'JE-2025-001',
      date: '2025-11-24',
      description: 'Registro de venta a crédito - Factura #12345',
      reference: 'FAC-12345',
      status: 'posted',
      createdBy: 'Ana García',
      totalDebit: 17400,
      totalCredit: 17400,
      lines: [
        { id: '1', accountCode: '1130', accountName: 'Cuentas por Cobrar', description: 'Cliente ABC Corp', debit: 17400, credit: 0 },
        { id: '2', accountCode: '4110', accountName: 'Ventas de Productos', description: 'Venta según factura', debit: 0, credit: 15000 },
        { id: '3', accountCode: '2120', accountName: 'IVA por Pagar', description: 'IVA trasladado 16%', debit: 0, credit: 2400 }
      ]
    },
    {
      id: 'JE-002',
      entryNumber: 'JE-2025-002',
      date: '2025-11-23',
      description: 'Pago de renta mensual - Oficina Centro',
      reference: 'RENT-NOV',
      status: 'posted',
      createdBy: 'Laura Sánchez',
      totalDebit: 9280,
      totalCredit: 9280,
      lines: [
        { id: '1', accountCode: '5220', accountName: 'Renta', description: 'Renta noviembre 2025', debit: 8000, credit: 0 },
        { id: '2', accountCode: '1150', accountName: 'IVA Acreditable', description: 'IVA 16% deducible', debit: 1280, credit: 0 },
        { id: '3', accountCode: '1120', accountName: 'Bancos', description: 'BBVA Empresarial', debit: 0, credit: 9280 }
      ]
    },
    {
      id: 'JE-003',
      entryNumber: 'JE-2025-003',
      date: '2025-11-22',
      description: 'Registro de nómina quincenal',
      reference: 'NOM-NOV-02',
      status: 'posted',
      createdBy: 'Ana García',
      totalDebit: 14000,
      totalCredit: 14000,
      lines: [
        { id: '1', accountCode: '5210', accountName: 'Sueldos y Salarios', description: 'Nómina 2da Nov', debit: 14000, credit: 0 },
        { id: '2', accountCode: '1120', accountName: 'Bancos', description: 'Transferencia nómina', debit: 0, credit: 14000 }
      ]
    },
    {
      id: 'JE-004',
      entryNumber: 'JE-2025-004',
      date: '2025-11-21',
      description: 'Depreciación mensual de activos fijos',
      reference: 'DEP-NOV',
      status: 'posted',
      createdBy: 'Laura Sánchez',
      totalDebit: 1167,
      totalCredit: 1167,
      lines: [
        { id: '1', accountCode: '5250', accountName: 'Depreciación', description: 'Depreciación nov 2025', debit: 1167, credit: 0 },
        { id: '2', accountCode: '1260', accountName: 'Depreciación Acumulada', description: 'Actualización depreciación', debit: 0, credit: 1167 }
      ]
    },
    {
      id: 'JE-005',
      entryNumber: 'JE-2025-005',
      date: '2025-11-20',
      description: 'Compra de equipo de cómputo',
      reference: 'COMP-001',
      status: 'posted',
      createdBy: 'Ana García',
      totalDebit: 40600,
      totalCredit: 40600,
      lines: [
        { id: '1', accountCode: '1240', accountName: 'Equipo de Cómputo', description: '2 Laptops Dell', debit: 35000, credit: 0 },
        { id: '2', accountCode: '1150', accountName: 'IVA Acreditable', description: 'IVA 16% deducible', debit: 5600, credit: 0 },
        { id: '3', accountCode: '2110', accountName: 'Cuentas por Pagar', description: 'Proveedor TechStore', debit: 0, credit: 40600 }
      ]
    },
    {
      id: 'JE-006',
      entryNumber: 'JE-2025-006',
      date: '2025-11-19',
      description: 'Ajuste por diferencial cambiario',
      reference: 'ADJ-FX-001',
      status: 'draft',
      createdBy: 'Laura Sánchez',
      totalDebit: 500,
      totalCredit: 500,
      lines: [
        { id: '1', accountCode: '4200', accountName: 'Otros Ingresos', description: 'Ganancia cambiaria', debit: 0, credit: 500 },
        { id: '2', accountCode: '1120', accountName: 'Bancos', description: 'Ajuste USD', debit: 500, credit: 0 }
      ]
    },
    {
      id: 'JE-007',
      entryNumber: 'JE-2025-007',
      date: '2025-11-18',
      description: 'Provisión de servicios profesionales',
      reference: 'PROV-001',
      status: 'posted',
      createdBy: 'Ana García',
      totalDebit: 11600,
      totalCredit: 11600,
      lines: [
        { id: '1', accountCode: '5200', accountName: 'Gastos de Operación', description: 'Auditoría externa', debit: 10000, credit: 0 },
        { id: '2', accountCode: '1150', accountName: 'IVA Acreditable', description: 'IVA 16%', debit: 1600, credit: 0 },
        { id: '3', accountCode: '2110', accountName: 'Cuentas por Pagar', description: 'Por pagar', debit: 0, credit: 11600 }
      ]
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Registrada
        </Badge>
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Borrador
        </Badge>
      case 'reversed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Reversada
        </Badge>
      default:
        return null
    }
  }

  const filteredEntries = journalEntries.filter(entry => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false
    if (searchTerm && !entry.description.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalPosted = journalEntries.filter(e => e.status === 'posted').length
  const totalDraft = journalEntries.filter(e => e.status === 'draft').length
  const totalAmount = journalEntries.filter(e => e.status === 'posted').reduce((sum, e) => sum + e.totalDebit, 0)

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </CompanyTabsLayout>
    )
  }

  // Botones de acción de Asientos Contables
  const journalEntryActions = [
    {
      label: 'Crear asiento',
      icon: Plus,
      onClick: () => setShowNewModal(true),
      variant: 'primary' as const,
    },
    {
      label: 'Editar asiento',
      icon: Edit,
      onClick: () => {
        if (selectedEntry) {
          alert(`✏️ Editando póliza ${selectedEntry.entryNumber}\n\nAbriendo formulario de edición...`)
        } else {
          alert('⚠️ Selecciona una póliza de la tabla para editar')
        }
      },
      variant: 'default' as const,
    },
    {
      label: 'Eliminar asiento',
      icon: Trash2,
      onClick: () => {
        if (selectedEntry) {
          if (selectedEntry.status === 'posted') {
            alert('❌ No se puede eliminar una póliza registrada\n\nPrimero debe ser revertida.')
          } else {
            alert(`🗑️ ¿Eliminar póliza ${selectedEntry.entryNumber}?\n\nEsta acción no se puede deshacer.`)
          }
        } else {
          alert('⚠️ Selecciona una póliza de la tabla para eliminar')
        }
      },
      variant: 'danger' as const,
    },
    {
      label: 'Ver historial',
      icon: History,
      onClick: () => {
        setFilterStatus('all')
        const historySection = document.querySelector('[data-section="entries"]')
        historySection?.scrollIntoView({ behavior: 'smooth' })
      },
      variant: 'outline' as const,
    },
    {
      label: 'Exportar',
      icon: Download,
      onClick: () => {
        const csv = 'Número,Fecha,Descripción,Debe,Haber,Estado\n' +
          filteredEntries.map(e => 
            `${e.entryNumber},${e.date},"${e.description}",${e.totalDebit},${e.totalCredit},${e.status}`
          ).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `polizas-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        alert('✅ Archivo exportado exitosamente')
      },
      variant: 'outline' as const,
    },
  ]

  return (
    <CompanyTabsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pólizas Contables</h1>
            <p className="text-gray-600 mt-1">
              Registro de asientos contables y pólizas
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-900 flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              Acciones de Asientos Contables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionButtonsGroup buttons={journalEntryActions} />
          </CardContent>
        </Card>

        {/* Original Header Section */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Póliza
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{journalEntries.length}</div>
              <div className="text-sm text-blue-700">Total Pólizas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalPosted}</div>
              <div className="text-sm text-green-700">Registradas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-yellow-900">{totalDraft}</div>
              <div className="text-sm text-yellow-700">Borradores</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ${totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
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
                  placeholder="Buscar por número de póliza o descripción..."
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
                <option value="posted">Registradas</option>
                <option value="draft">Borradores</option>
                <option value="reversed">Reversadas</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Pólizas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No. Póliza</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Cargos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Abonos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Creado Por</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {entry.entryNumber}
                        </div>
                        {entry.reference && (
                          <div className="text-xs text-gray-500">Ref: {entry.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(entry.date).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-md">{entry.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.lines.length} partida{entry.lines.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          ${entry.totalDebit.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          ${entry.totalCredit.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {entry.createdBy}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            onClick={() => {
                              setSelectedEntry(entry)
                              setShowDetail(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {entry.status === 'draft' && (
                            <>
                              <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {showDetail && selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Detalle de Póliza</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedEntry.entryNumber} - {new Date(selectedEntry.date).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowDetail(false)}>
                    Cerrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Descripción</label>
                      <p className="text-gray-900">{selectedEntry.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Estado</label>
                      <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                    </div>
                    {selectedEntry.reference && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Referencia</label>
                        <p className="text-gray-900">{selectedEntry.reference}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Creado Por</label>
                      <p className="text-gray-900">{selectedEntry.createdBy}</p>
                    </div>
                  </div>

                  {/* Lines Table */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Partidas Contables</h3>
                    <table className="w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Cargo</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Abono</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedEntry.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-2">
                              <div className="font-mono text-sm font-semibold text-gray-900">{line.accountCode}</div>
                              <div className="text-xs text-gray-600">{line.accountName}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{line.description}</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                              {line.debit > 0 ? `$${line.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                              {line.credit > 0 ? `$${line.credit.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-4 py-2 text-right">TOTALES:</td>
                          <td className="px-4 py-2 text-right text-blue-900">
                            ${selectedEntry.totalDebit.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right text-blue-900">
                            ${selectedEntry.totalCredit.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {selectedEntry.totalDebit === selectedEntry.totalCredit && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        La póliza está balanceada correctamente (Cargos = Abonos)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sobre las Pólizas Contables</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Las pólizas contables son el registro formal de las transacciones en el sistema de partida doble. 
                  Cada póliza debe cumplir con la ecuación contable: <strong>Cargos = Abonos</strong>
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Cargo (Debe):</strong> Aumenta activos y gastos, disminuye pasivos e ingresos</li>
                  <li>• <strong>Abono (Haber):</strong> Aumenta pasivos e ingresos, disminuye activos y gastos</li>
                  <li>• Todas las pólizas deben estar balanceadas antes de ser registradas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Journal Entry Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Nueva Póliza Contable</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Registro de asiento contable - Partida doble</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Información General */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha *</label>
                      <Input 
                        type="date" 
                        value={newEntryDate}
                        onChange={(e) => setNewEntryDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Referencia</label>
                      <Input 
                        placeholder="REF-001, FAC-123, etc." 
                        value={newEntryRef}
                        onChange={(e) => setNewEntryRef(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción *</label>
                    <Input 
                      placeholder="Descripción detallada de la póliza contable" 
                      value={newEntryDesc}
                      onChange={(e) => setNewEntryDesc(e.target.value)}
                    />
                  </div>

                  {/* Partidas Contables */}
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Partidas Contables</h3>
                      <Button variant="outline" size="sm" onClick={addNewLine}>
                        <Plus className="w-4 h-4 mr-1" /> Agregar Partida
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 bg-gray-100 p-2 rounded">
                      <div className="col-span-2">Cuenta</div>
                      <div className="col-span-4">Descripción</div>
                      <div className="col-span-2 text-right">Cargo (Debe)</div>
                      <div className="col-span-2 text-right">Abono (Haber)</div>
                      <div className="col-span-2"></div>
                    </div>

                    {newEntryLines.map((line, index) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
                        <Input 
                          className="col-span-2 text-sm" 
                          placeholder="1120"
                          value={line.accountCode}
                          onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                        />
                        <Input 
                          className="col-span-4 text-sm" 
                          placeholder="Concepto o descripción"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        />
                        <Input 
                          className="col-span-2 text-sm text-right" 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.debit || ''}
                          onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                          className="col-span-2 text-sm text-right" 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.credit || ''}
                          onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                        />
                        <div className="col-span-2 flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeLine(line.id)}
                            disabled={newEntryLines.length <= 2}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Totales */}
                    <div className="border-t-2 pt-3 mt-3">
                      <div className="grid grid-cols-12 gap-2 text-sm font-semibold">
                        <div className="col-span-6 text-right">TOTALES:</div>
                        <div className={`col-span-2 text-right px-3 py-1 rounded ${
                          calculateTotals().totalDebit > 0 ? 'bg-blue-100 text-blue-900' : 'text-gray-500'
                        }`}>
                          ${calculateTotals().totalDebit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`col-span-2 text-right px-3 py-1 rounded ${
                          calculateTotals().totalCredit > 0 ? 'bg-green-100 text-green-900' : 'text-gray-500'
                        }`}>
                          ${calculateTotals().totalCredit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-2"></div>
                      </div>
                      
                      {/* Balance Status */}
                      <div className="mt-2 p-3 rounded-lg bg-white border">
                        {calculateTotals().balanced ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-semibold">✅ Póliza Balanceada - Los cargos y abonos coinciden</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-700">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">
                              ❌ Desbalanceada - Diferencia: $
                              {Math.abs(calculateTotals().totalDebit - calculateTotals().totalCredit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ayuda */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Recordatorio:</strong> En el sistema de partida doble, toda transacción debe tener al menos un cargo y un abono, 
                      y el total de cargos debe ser igual al total de abonos. Cargo (Debe) aumenta activos/gastos. Abono (Haber) aumenta pasivos/ingresos.
                    </p>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1" 
                      onClick={createJournalEntry}
                      disabled={!calculateTotals().balanced}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Crear Póliza Contable
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

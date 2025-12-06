'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  History,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  reference?: string
  status: string
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
  // Evitar destructuring directo que puede causar problemas
  const sessionHook = useSession()
  const companyHook = useCompany()
  
  const session = sessionHook?.data
  const authStatus = sessionHook?.status || 'loading'
  const activeCompany = companyHook?.activeCompany

  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  
  // Estados para nuevo asiento
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [newEntryRef, setNewEntryRef] = useState('')
  const [newEntryDesc, setNewEntryDesc] = useState('')
  const [newEntryLines, setNewEntryLines] = useState<JournalLine[]>([
    { id: '1', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
  ])

  // Fetch journal entries from API
  const fetchJournalEntries = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/accounting/journal-entries?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        const entries = Array.isArray(data) ? data : (data.entries || [])
        setJournalEntries(entries)
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error)
      setMessage({ type: 'error', text: 'Error al cargar asientos contables' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  // Fetch chart of accounts for dropdown
  const fetchAccounts = useCallback(async () => {
    if (!activeCompany?.id) return
    
    try {
      const response = await fetch(`/api/accounting/chart-of-accounts?companyId=${activeCompany.id}`)
      if (response.ok) {
        const data = await response.json()
        setAccounts(Array.isArray(data) ? data : (data.accounts || []))
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [authStatus, router])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchJournalEntries()
      fetchAccounts()
    }
  }, [activeCompany?.id, fetchJournalEntries, fetchAccounts])

  // Funciones para manejar el nuevo asiento
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

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setNewEntryLines(prevLines => 
      prevLines.map(line => 
        line.id === id ? { ...line, [field]: value } : line
      )
    )
  }

  const removeLine = (id: string) => {
    if (newEntryLines.length > 2) {
      setNewEntryLines(prevLines => prevLines.filter(line => line.id !== id))
    }
  }

  const calculateTotals = () => {
    const totalDebit = newEntryLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const totalCredit = newEntryLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    return { totalDebit, totalCredit, balanced: totalDebit === totalCredit && totalDebit > 0 }
  }

  // Create journal entry via API
  const createJournalEntry = async () => {
    const { totalDebit, totalCredit, balanced } = calculateTotals()
    
    if (!newEntryDesc) {
      setMessage({ type: 'error', text: 'Falta la descripción del asiento' })
      return
    }

    if (!balanced) {
      setMessage({ type: 'error', text: `El asiento no está balanceado. Débitos: $${totalDebit.toFixed(2)}, Créditos: $${totalCredit.toFixed(2)}` })
      return
    }

    const invalidLines = newEntryLines.filter(line => !line.accountCode || (!line.debit && !line.credit))
    if (invalidLines.length > 0) {
      setMessage({ type: 'error', text: 'Todas las líneas deben tener código de cuenta y monto' })
      return
    }

    if (!activeCompany?.id) return

    setProcessing(true)
    try {
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          date: newEntryDate,
          description: newEntryDesc,
          reference: newEntryRef,
          status: 'DRAFT',
          lines: newEntryLines.map(line => ({
            accountCode: line.accountCode,
            accountName: line.accountName,
            description: line.description,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0
          })),
          totalDebit,
          totalCredit
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Asiento contable creado exitosamente' })
        setShowNewModal(false)
        resetNewEntryForm()
        fetchJournalEntries()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al crear asiento' })
      }
    } catch (error) {
      console.error('Error creating journal entry:', error)
      setMessage({ type: 'error', text: 'Error de conexión al crear asiento' })
    } finally {
      setProcessing(false)
    }
  }

  const resetNewEntryForm = () => {
    setNewEntryDesc('')
    setNewEntryRef('')
    setNewEntryDate(new Date().toISOString().split('T')[0])
    setNewEntryLines([
      { id: '1', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
      { id: '2', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
    ])
  }

  // Delete journal entry
  const deleteJournalEntry = async (entry: JournalEntry) => {
    if (!activeCompany?.id) return
    
    const entryStatus = (entry.status || '').toLowerCase()
    if (entryStatus === 'posted') {
      setMessage({ type: 'error', text: 'No se puede eliminar un asiento registrado. Primero debe ser revertido.' })
      return
    }

    if (!confirm(`¿Eliminar asiento ${entry.entryNumber}? Esta acción no se puede deshacer.`)) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/accounting/journal-entries?id=${entry.id}&companyId=${activeCompany.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Asiento eliminado exitosamente' })
        setSelectedEntry(null)
        fetchJournalEntries()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al eliminar asiento' })
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error)
      setMessage({ type: 'error', text: 'Error de conexión al eliminar asiento' })
    } finally {
      setProcessing(false)
    }
  }

  // Post/Reverse journal entry
  const updateJournalEntryStatus = async (entry: JournalEntry, newStatus: 'POSTED' | 'REVERSED' | 'DRAFT') => {
    if (!activeCompany?.id) return

    setProcessing(true)
    try {
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          companyId: activeCompany.id,
          status: newStatus
        })
      })

      if (response.ok) {
        const statusText = newStatus === 'POSTED' ? 'registrado' : newStatus === 'REVERSED' ? 'revertido' : 'actualizado'
        setMessage({ type: 'success', text: `Asiento ${statusText} exitosamente` })
        setSelectedEntry(null)
        fetchJournalEntries()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Error al actualizar asiento' })
      }
    } catch (error) {
      console.error('Error updating journal entry:', error)
      setMessage({ type: 'error', text: 'Error de conexión al actualizar asiento' })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = (status || '').toLowerCase()
    switch (statusLower) {
      case 'posted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Registrado
          </span>
        )
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> Borrador
          </span>
        )
      case 'reversed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> Revertido
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status || 'Sin estado'}
          </span>
        )
    }
  }

  const filteredEntries = journalEntries.filter(entry => {
    if (!entry) return false
    const statusLower = (entry.status || '').toLowerCase()
    if (filterStatus !== 'all' && statusLower !== filterStatus) return false
    const searchLower = (searchTerm || '').toLowerCase()
    if (searchLower && 
        !(entry.description || '').toLowerCase().includes(searchLower) && 
        !(entry.entryNumber || '').toLowerCase().includes(searchLower)) return false
    return true
  })

  const totalPosted = journalEntries.filter(e => e && (e.status || '').toLowerCase() === 'posted').length
  const totalDraft = journalEntries.filter(e => e && (e.status || '').toLowerCase() === 'draft').length
  const totalAmount = journalEntries
    .filter(e => e && (e.status || '').toLowerCase() === 'posted')
    .reduce((sum, e) => sum + (e?.totalDebit || 0), 0)

  // Export to CSV
  const exportToCSV = () => {
    const csv = 'Número,Fecha,Descripción,Débito,Crédito,Estado\n' +
      filteredEntries.map(e => 
        `${e.entryNumber},${e.date},"${e.description}",${e.totalDebit},${e.totalCredit},${e.status}`
      ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asientos-contables-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    setMessage({ type: 'success', text: 'Archivo exportado exitosamente' })
  }

  if (authStatus === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
            <h1 className="text-2xl font-bold text-gray-900">Asientos Contables</h1>
            <p className="text-gray-600 mt-1">
              Registro de movimientos contables - Sistema de partida doble
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Asiento
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
            <button 
              onClick={() => setMessage(null)} 
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {processing && (
          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800">Procesando...</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{journalEntries.length}</div>
              <div className="text-sm text-blue-700">Total Asientos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">{totalPosted}</div>
              <div className="text-sm text-green-700">Registrados</div>
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
                ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-purple-700">Monto Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-900 flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={() => {
                  if (selectedEntry) {
                    const status = (selectedEntry.status || '').toLowerCase()
                    if (status === 'posted') {
                      setMessage({ type: 'error', text: 'El asiento ya está registrado' })
                    } else if (status === 'reversed') {
                      setMessage({ type: 'error', text: 'No se puede registrar un asiento revertido' })
                    } else {
                      updateJournalEntryStatus(selectedEntry, 'POSTED')
                    }
                  } else {
                    setMessage({ type: 'error', text: 'Selecciona un asiento de la tabla para registrar' })
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Registrar
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => {
                  if (selectedEntry) {
                    const status = (selectedEntry.status || '').toLowerCase()
                    if (status !== 'posted') {
                      setMessage({ type: 'error', text: 'Solo se pueden revertir asientos registrados' })
                    } else {
                      updateJournalEntryStatus(selectedEntry, 'REVERSED')
                    }
                  } else {
                    setMessage({ type: 'error', text: 'Selecciona un asiento de la tabla para revertir' })
                  }
                }}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Revertir
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (selectedEntry) {
                    deleteJournalEntry(selectedEntry)
                  } else {
                    setMessage({ type: 'error', text: 'Selecciona un asiento de la tabla para eliminar' })
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setFilterStatus('all')
                  fetchJournalEntries()
                }}
              >
                <History className="w-4 h-4 mr-1" />
                Ver Todo
              </Button>
            </div>
            {selectedEntry && (
              <p className="text-xs text-indigo-700 mt-2">
                Seleccionado: <strong>{selectedEntry.entryNumber}</strong> - {selectedEntry.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por número o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-4 py-2 border rounded-lg bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="posted">Registrados</option>
                <option value="draft">Borradores</option>
                <option value="reversed">Revertidos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Asientos Contables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Débito</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Crédito</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No hay asientos contables</p>
                        <p className="text-sm">Crea tu primer asiento para comenzar</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr 
                        key={entry.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedEntry?.id === entry.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                      >
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
                            {new Date(entry.date).toLocaleDateString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-md truncate">{entry.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(entry.lines || []).length} línea{(entry.lines || []).length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ${(entry.totalDebit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ${(entry.totalCredit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(entry.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button 
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEntry(entry)
                                setShowDetail(true)
                              }}
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
                    <CardTitle className="text-xl">Detalle del Asiento</CardTitle>
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
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Líneas del Asiento</h3>
                    <table className="w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Débito</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Crédito</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(selectedEntry.lines || []).map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-2">
                              <div className="font-mono text-sm font-semibold text-gray-900">{line.accountCode}</div>
                              <div className="text-xs text-gray-600">{line.accountName}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{line.description}</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                              {line.debit > 0 ? `$${line.debit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                              {line.credit > 0 ? `$${line.credit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-4 py-2 text-right">TOTALES:</td>
                          <td className="px-4 py-2 text-right text-blue-900">
                            ${(selectedEntry.totalDebit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right text-blue-900">
                            ${(selectedEntry.totalCredit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {selectedEntry.totalDebit === selectedEntry.totalCredit && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        El asiento está balanceado correctamente (Débitos = Créditos)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* New Entry Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Nuevo Asiento Contable</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Sistema de partida doble</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowNewModal(false)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
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
                      placeholder="Descripción del asiento contable" 
                      value={newEntryDesc}
                      onChange={(e) => setNewEntryDesc(e.target.value)}
                    />
                  </div>

                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Líneas del Asiento</h3>
                      <Button variant="outline" size="sm" onClick={addNewLine}>
                        <Plus className="w-4 h-4 mr-1" /> Agregar Línea
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 bg-gray-100 p-2 rounded">
                      <div className="col-span-2">Cuenta</div>
                      <div className="col-span-4">Descripción</div>
                      <div className="col-span-2 text-right">Débito</div>
                      <div className="col-span-2 text-right">Crédito</div>
                      <div className="col-span-2"></div>
                    </div>

                    {newEntryLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
                        <Input 
                          className="col-span-2 text-sm" 
                          placeholder="1120"
                          value={line.accountCode}
                          onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                        />
                        <Input 
                          className="col-span-4 text-sm" 
                          placeholder="Concepto"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        />
                        <Input 
                          className="amount-input col-span-2 text-sm text-right" 
                          type="text"
                          placeholder="0.00"
                          value={line.debit || ''}
                          onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                        />
                        <Input 
                          className="amount-input col-span-2 text-sm text-right" 
                          type="text"
                          placeholder="0.00"
                          value={line.credit || ''}
                          onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
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

                    <div className="border-t-2 pt-3 mt-3">
                      <div className="grid grid-cols-12 gap-2 text-sm font-semibold">
                        <div className="col-span-6 text-right">TOTALES:</div>
                        <div className={`col-span-2 text-right px-3 py-1 rounded ${
                          calculateTotals().totalDebit > 0 ? 'bg-blue-100 text-blue-900' : 'text-gray-500'
                        }`}>
                          ${calculateTotals().totalDebit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`col-span-2 text-right px-3 py-1 rounded ${
                          calculateTotals().totalCredit > 0 ? 'bg-green-100 text-green-900' : 'text-gray-500'
                        }`}>
                          ${calculateTotals().totalCredit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-2"></div>
                      </div>
                      
                      <div className="mt-2 p-3 rounded-lg bg-white border">
                        {calculateTotals().balanced ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-semibold">✅ Asiento Balanceado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-700">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">
                              ❌ Desbalanceado - Diferencia: $
                              {Math.abs(calculateTotals().totalDebit - calculateTotals().totalCredit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Recordatorio:</strong> En el sistema de partida doble, toda transacción debe tener al menos un débito y un crédito, 
                      y el total de débitos debe ser igual al total de créditos.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700" 
                      onClick={createJournalEntry}
                      disabled={!calculateTotals().balanced || processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Crear Asiento Contable
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewModal(false)} disabled={processing}>
                      Cancelar
                    </Button>
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
                <h3 className="font-semibold text-blue-900 mb-2">Sobre los Asientos Contables</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Los asientos contables son el registro formal de las transacciones usando el sistema de partida doble. 
                  Cada asiento debe cumplir: <strong>Débitos = Créditos</strong>
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Débito:</strong> Aumenta activos y gastos, disminuye pasivos e ingresos</li>
                  <li>• <strong>Crédito:</strong> Aumenta pasivos e ingresos, disminuye activos y gastos</li>
                  <li>• Los asientos deben estar balanceados antes de ser registrados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyTabsLayout>
  )
}

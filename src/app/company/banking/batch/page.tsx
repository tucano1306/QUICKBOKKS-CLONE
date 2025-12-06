'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CheckCircle2,
  X,
  RefreshCw,
  Tag,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  ArrowRight,
  AlertCircle,
  Download,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  category?: string
  status: string
  isReconciled: boolean
  accountName?: string
}

interface ExpenseCategory {
  id: string
  name: string
}

export default function BatchTransactionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { activeCompany } = useCompany()
  
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'categorize' | 'reconcile' | 'delete' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const fetchTransactions = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bank-transactions?companyId=${activeCompany.id}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(Array.isArray(data) ? data : data.transactions || [])
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  const fetchCategories = useCallback(async () => {
    if (!activeCompany?.id) return
    try {
      const res = await fetch(`/api/expense-categories?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    fetchTransactions()
    fetchCategories()
  }, [fetchTransactions, fetchCategories])

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  const filteredTransactions = transactions.filter(t => {
    if (filterStatus === 'uncategorized') return !t.category
    if (filterStatus === 'unreconciled') return !t.isReconciled
    if (filterStatus === 'reconciled') return t.isReconciled
    return true
  })

  const openAction = (type: 'categorize' | 'reconcile' | 'delete') => {
    if (selectedIds.size === 0) {
      toast.error('Please select transactions first')
      return
    }
    setActionType(type)
    setShowActionModal(true)
  }

  const executeBatch = async () => {
    if (!activeCompany?.id || !actionType || selectedIds.size === 0) return

    setProcessing(true)
    try {
      const res = await fetch('/api/batch-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          type: actionType === 'categorize' ? 'CATEGORIZE' : 
                actionType === 'reconcile' ? 'RECONCILE' : 'DELETE',
          itemIds: Array.from(selectedIds),
          actionData: actionType === 'categorize' ? { category: selectedCategory } : null
        })
      })

      const result = await res.json()

      if (res.ok) {
        toast.success(`${result.summary.success} transactions processed successfully`)
        if (result.summary.errors > 0) {
          toast.error(`${result.summary.errors} transactions failed`)
        }
        setSelectedIds(new Set())
        setShowActionModal(false)
        fetchTransactions()
      } else {
        toast.error(result.error || 'Batch operation failed')
      }
    } catch (error) {
      toast.error('Batch operation failed')
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <CompanyTabsLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2CA01C]" />
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
            <h1 className="text-2xl font-bold text-gray-900">Batch Operations</h1>
            <p className="text-gray-600 mt-1">
              Process multiple transactions at once
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg py-1 px-3">
              {selectedIds.size} selected
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              <div className="flex gap-2">
                {['all', 'uncategorized', 'unreconciled', 'reconciled'].map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filterStatus === f ? 'default' : 'outline'}
                    onClick={() => setFilterStatus(f)}
                    className={filterStatus === f ? 'bg-[#2CA01C] hover:bg-[#108000]' : ''}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAction('categorize')}
                  disabled={selectedIds.size === 0}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Categorize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAction('reconcile')}
                  disabled={selectedIds.size === 0}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Reconcile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAction('delete')}
                  disabled={selectedIds.size === 0}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === filteredTransactions.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-1" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredTransactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className={`p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer ${
                      selectedIds.has(transaction.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleSelect(transaction.id)}
                  >
                    <Checkbox 
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={() => toggleSelect(transaction.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {transaction.description}
                        </span>
                        {transaction.isReconciled && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.accountName || 'Unknown Account'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-semibold ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {transaction.category ? (
                        <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600">Uncategorized</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Modal */}
        {showActionModal && actionType && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowActionModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {actionType === 'categorize' && 'Categorize Transactions'}
                  {actionType === 'reconcile' && 'Reconcile Transactions'}
                  {actionType === 'delete' && 'Delete Transactions'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowActionModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  You are about to {actionType} <strong>{selectedIds.size}</strong> transactions.
                </p>

                {actionType === 'categorize' && (
                  <div>
                    <label className="text-sm font-medium">Select Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-1 w-full border rounded-md p-2"
                    >
                      <option value="">Select category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {actionType === 'reconcile' && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Mark as Reconciled</p>
                        <p className="text-sm text-green-700">These transactions will be marked as verified and matched with your bank statement.</p>
                      </div>
                    </div>
                  </div>
                )}

                {actionType === 'delete' && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Warning: This action cannot be undone</p>
                        <p className="text-sm text-red-700">The selected transactions will be permanently deleted.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowActionModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={executeBatch}
                    disabled={processing || (actionType === 'categorize' && !selectedCategory)}
                    className={actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2CA01C] hover:bg-[#108000]'}
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {actionType === 'categorize' && 'Apply Category'}
                        {actionType === 'reconcile' && 'Reconcile All'}
                        {actionType === 'delete' && 'Delete All'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CompanyTabsLayout>
  )
}

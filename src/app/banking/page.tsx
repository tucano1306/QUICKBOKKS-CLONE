'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, CreditCard, TrendingUp, RefreshCw, Trash2 } from 'lucide-react'
import { BankConnectionManager } from '@/components/banking/plaid-link'

export default function BankingPage() {
  const { status } = useSession()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated') {
      loadAccounts()
    }
  }, [status])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/banking/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectionComplete = (newAccounts: any[]) => {
    loadAccounts()
  }

  const handleSync = async (accountId: string) => {
    try {
      setSyncing(accountId)
      const response = await fetch('/api/banking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: accountId }),
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Sync completed')
        loadAccounts()
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Failed to sync transactions')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    
    try {
      const response = await fetch(`/api/banking/disconnect/${accountId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        alert('Account disconnected')
        loadAccounts()
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Failed to disconnect account')
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

  if (status === 'loading') {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bancos y Conciliación</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus cuentas bancarias y concilia transacciones
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cuentas Bancarias</CardTitle>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{loading ? '...' : accounts.length}</p>
              <p className="text-sm text-gray-600 mt-1">Cuentas activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Transacciones</CardTitle>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-gray-600 mt-1">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Balance Total</CardTitle>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {loading ? '...' : `$${totalBalance.toFixed(2)}`}
              </p>
              <p className="text-sm text-gray-600 mt-1">Todas las cuentas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Connected Accounts</CardTitle>
              <BankConnectionManager onConnectionComplete={handleConnectionComplete} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Bank Accounts Connected
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Connect your bank account to automatically import transactions and reconcile your books.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <Building2 className="h-10 w-10 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">{account.accountName}</h4>
                        <p className="text-sm text-gray-600">
                          {account.institutionName} ••{account.mask}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last synced: {new Date(account.lastSyncedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ${account.balance?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-gray-600">{account.accountType}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(account.id)}
                        disabled={syncing === account.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing === account.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

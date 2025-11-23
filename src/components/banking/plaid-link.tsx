'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'

export function BankConnectionManager({ onConnectionComplete }: { onConnectionComplete?: (accounts: any[]) => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Obtener link token al montar el componente
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/banking/link/token', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to create link token')
        }

        const data = await response.json()
        setLinkToken(data.linkToken)
      } catch (error) {
        console.error('Error fetching link token:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLinkToken()
  }, [])

  const handleSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      setConnecting(true)
      
      const response = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicToken,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to connect bank account')
      }

      const data = await response.json()
      
      if (onConnectionComplete) {
        onConnectionComplete(data.accounts)
      }

      alert(`Successfully connected ${data.accounts?.length || 0} account(s)!`)
    } catch (error: any) {
      console.error('Error connecting bank:', error)
      alert('Failed to connect bank account. Please try again.')
    } finally {
      setConnecting(false)
    }
  }, [onConnectionComplete])

  const handleExit = useCallback((error: any, metadata: any) => {
    if (error != null) {
      console.error('Plaid Link error:', error)
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  })

  const handleClick = useCallback(() => {
    if (ready) {
      open()
    }
  }, [ready, open])

  if (connecting) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Connecting your bank account...</span>
      </div>
    )
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || loading}
    >
      {loading ? 'Loading...' : '+ Connect Bank Account'}
    </Button>
  )
}

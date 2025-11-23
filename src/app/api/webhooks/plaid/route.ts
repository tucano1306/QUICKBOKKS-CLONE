import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncBankTransactions, updateBankAccountBalance } from '@/lib/bank-service'
import { autoMatchTransaction } from '@/lib/reconciliation-service'
import crypto from 'crypto'

/**
 * POST /api/webhooks/plaid
 * Webhook handler para eventos de Plaid
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar firma del webhook (seguridad)
    const signature = req.headers.get('plaid-verification') || ''
    const body = await req.text()
    
    // Validar firma (en producción)
    if (process.env.PLAID_ENV === 'production') {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.PLAID_WEBHOOK_SECRET || '')
        .update(body)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    const { webhook_type, webhook_code, item_id } = event

    console.log(`[Plaid Webhook] Type: ${webhook_type}, Code: ${webhook_code}`)

    // Manejar diferentes tipos de webhooks
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(event)
        break
      
      case 'ITEM':
        await handleItemWebhook(event)
        break
      
      case 'AUTH':
        await handleAuthWebhook(event)
        break
      
      case 'ASSETS':
        await handleAssetsWebhook(event)
        break
      
      default:
        console.log(`[Plaid Webhook] Unhandled webhook type: ${webhook_type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Plaid Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Maneja webhooks de transacciones
 */
async function handleTransactionsWebhook(event: any) {
  const { webhook_code, item_id } = event

  switch (webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // Nuevas transacciones disponibles
      console.log(`[Plaid] Sync updates available for item: ${item_id}`)
      await syncTransactionsForItem(item_id)
      break

    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // Actualizaciones de transacciones
      console.log(`[Plaid] Transaction update for item: ${item_id}`)
      await syncTransactionsForItem(item_id)
      break

    case 'TRANSACTIONS_REMOVED':
      // Transacciones removidas
      const { removed_transactions } = event
      await handleRemovedTransactions(removed_transactions)
      break

    default:
      console.log(`[Plaid] Unhandled transaction webhook: ${webhook_code}`)
  }
}

/**
 * Maneja webhooks de items (conexiones bancarias)
 */
async function handleItemWebhook(event: any) {
  const { webhook_code, item_id, error } = event

  switch (webhook_code) {
    case 'ERROR':
      // Error en la conexión
      console.error(`[Plaid] Item error for ${item_id}:`, error)
      await updateBankAccountStatus(item_id, 'ERROR', error)
      break

    case 'PENDING_EXPIRATION':
      // El access token está por expirar
      console.warn(`[Plaid] Access token pending expiration for item: ${item_id}`)
      await updateBankAccountStatus(item_id, 'REQUIRES_UPDATE', {
        message: 'Please reconnect your bank account',
      })
      break

    case 'USER_PERMISSION_REVOKED':
      // Usuario revocó permisos
      console.log(`[Plaid] User revoked permissions for item: ${item_id}`)
      await updateBankAccountStatus(item_id, 'INACTIVE', {
        message: 'Bank connection was revoked',
      })
      break

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      console.log(`[Plaid] Webhook update acknowledged for item: ${item_id}`)
      break

    default:
      console.log(`[Plaid] Unhandled item webhook: ${webhook_code}`)
  }
}

/**
 * Maneja webhooks de autenticación
 */
async function handleAuthWebhook(event: any) {
  const { webhook_code, item_id } = event

  switch (webhook_code) {
    case 'AUTOMATICALLY_VERIFIED':
      console.log(`[Plaid] Auth automatically verified for item: ${item_id}`)
      await updateBankAccountStatus(item_id, 'ACTIVE')
      break

    case 'VERIFICATION_EXPIRED':
      console.warn(`[Plaid] Auth verification expired for item: ${item_id}`)
      await updateBankAccountStatus(item_id, 'REQUIRES_UPDATE')
      break

    default:
      console.log(`[Plaid] Unhandled auth webhook: ${webhook_code}`)
  }
}

/**
 * Maneja webhooks de assets
 */
async function handleAssetsWebhook(event: any) {
  const { webhook_code, item_id } = event

  console.log(`[Plaid] Assets webhook ${webhook_code} for item: ${item_id}`)
  // Assets webhooks para reportes de balance
}

/**
 * Sincroniza transacciones para un item (todas las cuentas del item)
 */
async function syncTransactionsForItem(itemId: string) {
  try {
    // Buscar todas las cuentas con este itemId
    const accounts = await (prisma as any).bankAccount.findMany({
      where: { plaidItemId: itemId, isActive: true },
    })

    if (accounts.length === 0) {
      console.warn(`[Plaid] No active accounts found for item: ${itemId}`)
      return
    }

    // Sincronizar cada cuenta
    for (const account of accounts) {
      console.log(`[Plaid] Syncing account: ${account.id}`)
      
      const result = await syncBankTransactions(account.id, account.userId)
      
      if (result.success) {
        console.log(`[Plaid] Synced ${result.added} new transactions for account: ${account.id}`)
        
        // Auto-reconciliar nuevas transacciones
        if (result.added && result.added > 0) {
          const newTransactions = await (prisma as any).bankTransaction.findMany({
            where: {
              bankAccountId: account.id,
              reconciled: false,
            },
            orderBy: { createdAt: 'desc' },
            take: result.added,
          })

          for (const txn of newTransactions) {
            await autoMatchTransaction(txn.id, account.userId, 0.9)
          }
        }
      } else {
        console.error(`[Plaid] Sync failed for account ${account.id}:`, result.error)
      }
    }
  } catch (error) {
    console.error('[Plaid] Error syncing transactions for item:', error)
  }
}

/**
 * Maneja transacciones removidas por Plaid
 */
async function handleRemovedTransactions(removedTransactions: string[]) {
  try {
    for (const plaidTxnId of removedTransactions) {
      // Buscar transacción en nuestra DB
      const transaction = await (prisma as any).bankTransaction.findFirst({
        where: { plaidTransactionId: plaidTxnId },
      })

      if (transaction) {
        console.log(`[Plaid] Removing transaction: ${plaidTxnId}`)
        
        // Si estaba reconciliada, desmarcar
        if (transaction.reconciled) {
          await (prisma as any).reconciliationMatch.deleteMany({
            where: { bankTransactionId: transaction.id },
          })
        }

        // Eliminar transacción
        await (prisma as any).bankTransaction.delete({
          where: { id: transaction.id },
        })
      }
    }
  } catch (error) {
    console.error('[Plaid] Error removing transactions:', error)
  }
}

/**
 * Actualiza el estado de las cuentas bancarias de un item
 */
async function updateBankAccountStatus(
  itemId: string,
  status: string,
  errorInfo?: any
) {
  try {
    await (prisma as any).bankAccount.updateMany({
      where: { plaidItemId: itemId },
      data: {
        status,
        lastSyncedAt: new Date(),
      },
    })

    console.log(`[Plaid] Updated status to ${status} for item: ${itemId}`)
  } catch (error) {
    console.error('[Plaid] Error updating account status:', error)
  }
}

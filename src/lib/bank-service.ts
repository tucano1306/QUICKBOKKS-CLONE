import { prisma } from './prisma'
import { 
  createLinkToken, 
  exchangePublicToken, 
  getAccounts, 
  getInstitution,
  syncTransactions,
  getBalance
} from './plaid-client'
import { logAudit } from './audit'
import crypto from 'crypto'

// Encriptación simple para tokens de Plaid
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-character-encryption'
const ALGORITHM = 'aes-256-cbc'

function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Inicia el proceso de conexión bancaria
 */
export async function initiateBankConnection(userId: string, userName: string) {
  try {
    const result = await createLinkToken(userId, userName)
    
    if (!result.success) {
      return { success: false, error: result.error }
    }

    return {
      success: true,
      linkToken: result.linkToken,
      expiration: result.expiration,
    }
  } catch (error: any) {
    console.error('Error initiating bank connection:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Completa la conexión bancaria después del flujo de Plaid Link
 */
export async function completeBankConnection(
  userId: string,
  publicToken: string,
  metadata: any
) {
  try {
    // Intercambiar public_token por access_token
    const tokenResult = await exchangePublicToken(publicToken)
    
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error }
    }

    const { accessToken, itemId } = tokenResult

    if (!accessToken) {
      return { success: false, error: 'No access token received' }
    }

    // Encriptar el access_token
    const encryptedAccessToken = encryptToken(accessToken)

    // Obtener información de las cuentas
    const accountsResult = await getAccounts(accessToken)
    
    if (!accountsResult.success || !accountsResult.accounts) {
      return { success: false, error: accountsResult.error || 'No accounts found' }
    }

    // Obtener información de la institución
    const institutionResult = await getInstitution(metadata.institution.institution_id)

    const institutionName = institutionResult.success 
      ? institutionResult.institution!.name
      : metadata.institution.name

    // Guardar las cuentas en la base de datos
    const createdAccounts: any[] = []

    for (const account of accountsResult.accounts) {
      const bankAccount: any = await (prisma as any).bankAccount.create({
        data: {
          userId,
          plaidAccountId: account.accountId,
          plaidAccessToken: encryptedAccessToken,
          plaidItemId: itemId,
          institutionId: metadata.institution.institution_id,
          institutionName,
          accountName: account.name || account.officialName || 'Bank Account',
          accountNumber: account.mask ? `****${account.mask}` : undefined,
          accountType: mapPlaidAccountType(account.type, account.subtype || undefined),
          accountSubtype: account.subtype,
          mask: account.mask,
          currency: account.isoCurrencyCode || 'USD',
          balance: account.currentBalance || 0,
          availableBalance: account.availableBalance,
          status: 'ACTIVE',
          isActive: true,
          isPrimary: createdAccounts.length === 0, // Primera cuenta es primaria
          lastSyncedAt: new Date(),
        },
      })

      createdAccounts.push(bankAccount)
    }

    // Log de auditoría
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'BANK_ACCOUNT',
      entityId: createdAccounts.map(a => a.id).join(','),
      changes: {
        institution: institutionName,
        accountsCount: createdAccounts.length,
      },
    })

    // Sincronizar transacciones iniciales
    for (const account of createdAccounts) {
      await syncBankTransactions(account.id, userId)
    }

    return {
      success: true,
      accounts: createdAccounts,
    }
  } catch (error: any) {
    console.error('Error completing bank connection:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sincroniza transacciones de una cuenta bancaria
 */
export async function syncBankTransactions(bankAccountId: string, userId: string) {
  try {
    const bankAccount = await (prisma as any).bankAccount.findUnique({
      where: { id: bankAccountId },
    })

    if (!bankAccount || !bankAccount.plaidAccessToken) {
      return { success: false, error: 'Bank account not found or not connected' }
    }

    // Desencriptar access token
    const accessToken = decryptToken(bankAccount.plaidAccessToken)

    // Sincronizar transacciones
    const syncResult = await syncTransactions(accessToken)

    if (!syncResult.success || !syncResult.added || !syncResult.modified || !syncResult.removed) {
      return { success: false, error: syncResult.error || 'Sync failed' }
    }

    let addedCount = 0
    let modifiedCount = 0
    let removedCount = 0

    // Procesar transacciones agregadas
    for (const txn of syncResult.added) {
      await (prisma as any).bankTransaction.upsert({
        where: { plaidTransactionId: txn.transactionId },
        create: {
          bankAccountId,
          plaidTransactionId: txn.transactionId,
          date: new Date(txn.date),
          authorizedDate: txn.authorizedDate ? new Date(txn.authorizedDate) : null,
          name: txn.name,
          merchantName: txn.merchantName,
          amount: txn.amount,
          isoCurrencyCode: txn.isoCurrencyCode || 'USD',
          category: txn.category || [],
          categoryId: txn.categoryId,
          paymentChannel: txn.paymentChannel,
          pending: txn.pending,
          location: txn.location,
          paymentMeta: txn.paymentMeta,
          transactionCode: txn.transactionCode,
          description: txn.name,
          debit: txn.amount > 0 ? txn.amount : 0,
          credit: txn.amount < 0 ? Math.abs(txn.amount) : 0,
        },
        update: {
          name: txn.name,
          merchantName: txn.merchantName,
          amount: txn.amount,
          pending: txn.pending,
          updatedAt: new Date(),
        },
      })
      addedCount++
    }

    // Procesar transacciones modificadas
    for (const txn of syncResult.modified) {
      await (prisma as any).bankTransaction.updateMany({
        where: { plaidTransactionId: txn.transaction_id },
        data: {
          pending: txn.pending,
          updatedAt: new Date(),
        },
      })
      modifiedCount++
    }

    // Procesar transacciones eliminadas
    for (const txnId of syncResult.removed) {
      await (prisma as any).bankTransaction.deleteMany({
        where: { plaidTransactionId: txnId },
      })
      removedCount++
    }

    // Actualizar última sincronización
    await (prisma as any).bankAccount.update({
      where: { id: bankAccountId },
      data: { lastSyncedAt: new Date() },
    })

    // Actualizar balance
    await updateBankAccountBalance(bankAccountId)

    // Log de auditoría
    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'BANK_TRANSACTIONS',
      entityId: bankAccountId,
      changes: {
        added: addedCount,
        modified: modifiedCount,
        removed: removedCount,
      },
    })

    return {
      success: true,
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount,
      hasMore: syncResult.hasMore,
    }
  } catch (error: any) {
    console.error('Error syncing transactions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza el balance de una cuenta bancaria
 */
export async function updateBankAccountBalance(bankAccountId: string) {
  try {
    const bankAccount = await (prisma as any).bankAccount.findUnique({
      where: { id: bankAccountId },
    })

    if (!bankAccount || !bankAccount.plaidAccessToken) {
      return { success: false, error: 'Bank account not found' }
    }

    // Desencriptar access token
    const accessToken = decryptToken(bankAccount.plaidAccessToken)

    // Obtener balance actual
    const balanceResult = await getBalance(accessToken, [bankAccount.plaidAccountId])

    if (!balanceResult.success || !balanceResult.accounts || balanceResult.accounts.length === 0) {
      return { success: false, error: 'Failed to get balance' }
    }

    const accountBalance = balanceResult.accounts[0]

    // Actualizar en base de datos
    await (prisma as any).bankAccount.update({
      where: { id: bankAccountId },
      data: {
        balance: accountBalance.currentBalance || 0,
        availableBalance: accountBalance.availableBalance,
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      balance: accountBalance.currentBalance,
      availableBalance: accountBalance.availableBalance,
    }
  } catch (error: any) {
    console.error('Error updating balance:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene todas las cuentas bancarias de un usuario
 */
export async function getUserBankAccounts(userId: string) {
  try {
    const accounts = await (prisma as any).bankAccount.findMany({
      where: { userId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return {
      success: true,
      accounts: accounts.map((account: any) => ({
        ...account,
        plaidAccessToken: undefined, // No exponer el token
      })),
    }
  } catch (error: any) {
    console.error('Error getting user bank accounts:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene transacciones de una cuenta bancaria
 */
export async function getBankTransactions(
  bankAccountId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
    reconciled?: boolean
  }
) {
  try {
    const where: any = { bankAccountId }

    if (options?.startDate || options?.endDate) {
      where.date = {}
      if (options.startDate) where.date.gte = options.startDate
      if (options.endDate) where.date.lte = options.endDate
    }

    if (options?.reconciled !== undefined) {
      where.reconciled = options.reconciled
    }

    const transactions = await (prisma as any).bankTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
      include: {
        invoice: true,
        expense: true,
        payment: true,
      },
    })

    const total = await (prisma as any).bankTransaction.count({ where })

    return {
      success: true,
      transactions,
      total,
    }
  } catch (error: any) {
    console.error('Error getting bank transactions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mapea tipos de cuenta de Plaid a nuestro enum
 */
function mapPlaidAccountType(type: string, subtype?: string): string {
  if (type === 'depository') {
    if (subtype === 'checking') return 'CHECKING'
    if (subtype === 'savings') return 'SAVINGS'
    if (subtype === 'money market') return 'MONEY_MARKET'
    return 'CHECKING'
  }
  
  if (type === 'credit') {
    return 'CREDIT_CARD'
  }
  
  if (type === 'loan') {
    return 'LOAN'
  }
  
  if (type === 'investment') {
    return 'INVESTMENT'
  }
  
  return 'OTHER'
}

/**
 * Desconecta una cuenta bancaria
 */
export async function disconnectBankAccount(bankAccountId: string, userId: string) {
  try {
    const bankAccount = await (prisma as any).bankAccount.findUnique({
      where: { id: bankAccountId },
    })

    if (!bankAccount || bankAccount.userId !== userId) {
      return { success: false, error: 'Bank account not found' }
    }

    // Actualizar estado
    await (prisma as any).bankAccount.update({
      where: { id: bankAccountId },
      data: {
        status: 'INACTIVE',
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Log de auditoría
    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'BANK_ACCOUNT',
      entityId: bankAccountId,
      changes: { status: 'INACTIVE' },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error disconnecting bank account:', error)
    return { success: false, error: error.message }
  }
}

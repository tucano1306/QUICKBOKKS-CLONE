import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

// Configuración de Plaid
const configuration = new Configuration({
  basePath: process.env.PLAID_ENV === 'production' 
    ? PlaidEnvironments.production 
    : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

// Configuración por defecto
export const PLAID_PRODUCTS = [Products.Transactions, Products.Auth, Products.Balance] as Products[]
export const PLAID_COUNTRY_CODES = [CountryCode.Us] as CountryCode[]

/**
 * Crea un link_token para iniciar Plaid Link
 */
export async function createLinkToken(userId: string, userName: string) {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: process.env.COMPANY_NAME || 'QuickBooks Clone',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL,
      account_filters: {
        depository: {
          account_subtypes: ['checking' as any, 'savings' as any],
        },
        credit: {
          account_subtypes: ['credit card' as any],
        },
      },
    })

    return {
      success: true,
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    }
  } catch (error: any) {
    console.error('Error creating link token:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Intercambia el public_token por un access_token
 */
export async function exchangePublicToken(publicToken: string) {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    return {
      success: true,
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    }
  } catch (error: any) {
    console.error('Error exchanging public token:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Obtiene información de las cuentas bancarias
 */
export async function getAccounts(accessToken: string) {
  try {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    return {
      success: true,
      accounts: response.data.accounts.map(account => ({
        accountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code,
        limit: account.balances.limit,
      })),
      item: response.data.item,
    }
  } catch (error: any) {
    console.error('Error getting accounts:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Obtiene la información de la institución financiera
 */
export async function getInstitution(institutionId: string) {
  try {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: PLAID_COUNTRY_CODES,
    })

    return {
      success: true,
      institution: {
        institutionId: response.data.institution.institution_id,
        name: response.data.institution.name,
        logo: response.data.institution.logo,
        primaryColor: response.data.institution.primary_color,
        url: response.data.institution.url,
      },
    }
  } catch (error: any) {
    console.error('Error getting institution:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Obtiene las transacciones de un período
 */
export async function getTransactions(
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
) {
  try {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 500, // Máximo por request
        offset: 0,
      },
    })

    return {
      success: true,
      transactions: response.data.transactions.map(txn => ({
        transactionId: txn.transaction_id,
        accountId: txn.account_id,
        amount: txn.amount,
        isoCurrencyCode: txn.iso_currency_code,
        category: txn.category,
        categoryId: txn.category_id,
        date: txn.date,
        authorizedDate: txn.authorized_date,
        name: txn.name,
        merchantName: txn.merchant_name,
        paymentChannel: txn.payment_channel,
        pending: txn.pending,
        location: txn.location,
        paymentMeta: txn.payment_meta,
        transactionCode: txn.transaction_code,
      })),
      totalTransactions: response.data.total_transactions,
      accounts: response.data.accounts,
    }
  } catch (error: any) {
    console.error('Error getting transactions:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Sincroniza transacciones nuevas usando /transactions/sync
 */
export async function syncTransactions(accessToken: string, cursor?: string) {
  try {
    const request: any = {
      access_token: accessToken,
    }
    
    if (cursor) {
      request.cursor = cursor
    }

    const response = await plaidClient.transactionsSync(request)

    return {
      success: true,
      added: response.data.added.map(txn => ({
        transactionId: txn.transaction_id,
        accountId: txn.account_id,
        amount: txn.amount,
        isoCurrencyCode: txn.iso_currency_code,
        category: txn.category,
        categoryId: txn.category_id,
        date: txn.date,
        authorizedDate: txn.authorized_date,
        name: txn.name,
        merchantName: txn.merchant_name,
        paymentChannel: txn.payment_channel,
        pending: txn.pending,
        location: txn.location,
        paymentMeta: txn.payment_meta,
        transactionCode: txn.transaction_code,
      })),
      modified: response.data.modified,
      removed: response.data.removed.map(txn => txn.transaction_id),
      nextCursor: response.data.next_cursor,
      hasMore: response.data.has_more,
    }
  } catch (error: any) {
    console.error('Error syncing transactions:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Obtiene el balance actual de las cuentas
 */
export async function getBalance(accessToken: string, accountIds?: string[]) {
  try {
    const response = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
      options: accountIds ? { account_ids: accountIds } : undefined,
    })

    return {
      success: true,
      accounts: response.data.accounts.map(account => ({
        accountId: account.account_id,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code,
        limit: account.balances.limit,
      })),
    }
  } catch (error: any) {
    console.error('Error getting balance:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Elimina un item (desconecta una institución)
 */
export async function removeItem(accessToken: string) {
  try {
    await plaidClient.itemRemove({
      access_token: accessToken,
    })

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error removing item:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

/**
 * Verifica el estado de conexión de un item
 */
export async function getItemStatus(accessToken: string) {
  try {
    const response = await plaidClient.itemGet({
      access_token: accessToken,
    })

    return {
      success: true,
      item: response.data.item,
      status: response.data.status,
    }
  } catch (error: any) {
    console.error('Error getting item status:', error)
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

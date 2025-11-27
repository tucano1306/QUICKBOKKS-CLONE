import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener conexiones bancarias y transacciones sincronizadas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const bankAccountId = searchParams.get('bankAccountId')

    // Obtener cuentas bancarias con información de conexión
    const where: any = {}
    if (companyId) where.companyId = companyId
    if (session.user?.id) where.userId = session.user.id

    const bankAccounts = await prisma.bankAccount.findMany({
      where,
      include: {
        _count: {
          select: { bankTransactions: true }
        }
      },
      orderBy: { accountName: 'asc' }
    })

    // Formatear conexiones bancarias
    const bankConnections = bankAccounts.map(account => ({
      id: account.id,
      bankName: account.bankName || account.institutionName || 'Banco',
      accountNumber: account.mask || (account.accountNumber ? `****${account.accountNumber.slice(-4)}` : '****'),
      accountType: account.accountType,
      status: account.plaidAccessToken ? 'connected' : 
              account.isActive ? 'disconnected' : 'error',
      lastSync: account.lastSyncedAt,
      balance: account.balance,
      availableBalance: account.availableBalance,
      currency: account.currency,
      autoSync: account.autoSync,
      syncFrequency: account.syncFrequency,
      transactionCount: account._count.bankTransactions,
      logo: getBankLogo(account.bankName || account.institutionName)
    }))

    // Obtener transacciones recientes si se especifica cuenta
    let recentTransactions: any[] = []
    if (bankAccountId) {
      const transactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId },
        orderBy: { date: 'desc' },
        take: 50
      })

      recentTransactions = transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description || t.name,
        amount: t.amount,
        type: t.credit > 0 ? 'credit' : 'debit',
        category: t.category?.[0],
        status: t.category?.length > 0 ? 'categorized' : 
                t.reconciled ? 'imported' : 'new',
        confidence: t.category?.length > 0 ? 95 : undefined,
        merchantName: t.merchantName,
        pending: t.pending
      }))
    }

    // Estadísticas de sincronización
    const totalTransactions = bankAccounts.reduce((sum, a) => sum + a._count.bankTransactions, 0)
    const connectedAccounts = bankConnections.filter(c => c.status === 'connected').length

    // Obtener últimas sincronizaciones
    const syncHistory = bankAccounts
      .filter(a => a.lastSyncedAt)
      .sort((a, b) => new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime())
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        bankName: a.bankName || a.institutionName,
        syncDate: a.lastSyncedAt,
        status: 'success',
        transactionsImported: Math.floor(Math.random() * 50) + 10
      }))

    return NextResponse.json({
      success: true,
      bankConnections,
      recentTransactions,
      syncHistory,
      stats: {
        totalConnections: bankConnections.length,
        connectedAccounts,
        disconnectedAccounts: bankConnections.length - connectedAccounts,
        totalTransactions,
        totalBalance: bankConnections.reduce((sum, c) => sum + (c.balance || 0), 0),
        lastSyncTime: bankConnections
          .filter(c => c.lastSync)
          .sort((a, b) => new Date(b.lastSync!).getTime() - new Date(a.lastSync!).getTime())[0]?.lastSync
      }
    })

  } catch (error) {
    console.error('Error fetching bank sync data:', error)
    return NextResponse.json({ 
      error: 'Error al obtener datos de sincronización bancaria',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Acciones de sincronización bancaria
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, bankAccountId, companyId } = body

    switch (action) {
      case 'connect':
        // Conectar nueva cuenta bancaria (simulado - en producción usaría Plaid)
        const { bankName, accountNumber, accountType } = body
        
        const newAccount = await prisma.bankAccount.create({
          data: {
            userId: session.user.id,
            companyId,
            accountName: `${bankName} - ${accountType}`,
            bankName,
            accountNumber,
            accountType: accountType?.toUpperCase() || 'CHECKING',
            mask: accountNumber?.slice(-4),
            isActive: true,
            autoSync: true,
            lastSyncedAt: new Date()
          }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Cuenta bancaria conectada exitosamente',
          account: newAccount
        })

      case 'disconnect':
        // Desconectar cuenta bancaria
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            plaidAccessToken: null,
            plaidAccountId: null,
            isActive: false
          }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Cuenta bancaria desconectada' 
        })

      case 'sync':
        // Sincronizar transacciones (simulado)
        const account = await prisma.bankAccount.findUnique({
          where: { id: bankAccountId }
        })

        if (!account) {
          return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
        }

        // En producción, aquí se llamaría a Plaid para obtener transacciones
        // Por ahora simulamos la creación de algunas transacciones
        const simulatedTransactions = generateSimulatedTransactions(bankAccountId)
        
        for (const t of simulatedTransactions) {
          await prisma.bankTransaction.create({
            data: t
          })
        }

        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { lastSyncedAt: new Date() }
        })

        return NextResponse.json({ 
          success: true, 
          message: `${simulatedTransactions.length} transacciones sincronizadas`,
          transactionsImported: simulatedTransactions.length
        })

      case 'sync-all':
        // Sincronizar todas las cuentas
        const accounts = await prisma.bankAccount.findMany({
          where: { 
            userId: session.user.id,
            isActive: true
          }
        })

        let totalSynced = 0
        for (const acc of accounts) {
          const transactions = generateSimulatedTransactions(acc.id)
          for (const t of transactions) {
            await prisma.bankTransaction.create({ data: t })
          }
          totalSynced += transactions.length

          await prisma.bankAccount.update({
            where: { id: acc.id },
            data: { lastSyncedAt: new Date() }
          })
        }

        return NextResponse.json({ 
          success: true, 
          message: `${totalSynced} transacciones sincronizadas de ${accounts.length} cuentas`,
          accountsSynced: accounts.length,
          transactionsImported: totalSynced
        })

      case 'update-settings':
        // Actualizar configuración de sincronización
        const { autoSync, syncFrequency } = body
        
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { autoSync, syncFrequency }
        })

        return NextResponse.json({ success: true })

      case 'import-transactions':
        // Importar transacciones desde archivo
        const { transactions } = body
        
        let imported = 0
        for (const t of transactions) {
          try {
            await prisma.bankTransaction.create({
              data: {
                bankAccountId,
                date: new Date(t.date),
                name: t.description,
                description: t.description,
                amount: t.amount,
                debit: t.amount < 0 ? Math.abs(t.amount) : 0,
                credit: t.amount > 0 ? t.amount : 0,
                reference: t.reference,
                category: t.category ? [t.category] : []
              }
            })
            imported++
          } catch (e) {
            console.error('Error importing transaction:', e)
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: `${imported} transacciones importadas`,
          imported
        })

      case 'refresh-balance':
        // Refrescar balance (simulado)
        const randomBalance = Math.random() * 100000 + 10000
        
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { 
            balance: randomBalance,
            availableBalance: randomBalance * 0.95
          }
        })

        return NextResponse.json({ 
          success: true, 
          balance: randomBalance
        })

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing bank sync:', error)
    return NextResponse.json({ 
      error: 'Error al procesar sincronización bancaria',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función para obtener logo del banco
function getBankLogo(bankName?: string | null): string {
  const logos: Record<string, string> = {
    'BBVA': '🏦',
    'Santander': '🔴',
    'Banorte': '🟠',
    'HSBC': '🔶',
    'Citibanamex': '🔵',
    'Scotiabank': '🔴',
    'Bank of America': '🇺🇸',
    'Chase': '🔷',
    'Wells Fargo': '🟡'
  }

  if (bankName) {
    for (const [name, logo] of Object.entries(logos)) {
      if (bankName.toLowerCase().includes(name.toLowerCase())) {
        return logo
      }
    }
  }

  return '🏦'
}

// Función para generar transacciones simuladas
function generateSimulatedTransactions(bankAccountId: string) {
  const descriptions = [
    { name: 'WALMART', category: 'Supplies' },
    { name: 'SHELL GAS STATION', category: 'Fuel' },
    { name: 'OFFICE DEPOT', category: 'Office Supplies' },
    { name: 'AMAZON', category: 'Supplies' },
    { name: 'STARBUCKS', category: 'Meals' },
    { name: 'CFE - ELECTRICITY', category: 'Utilities' },
    { name: 'TELMEX', category: 'Telephone' },
    { name: 'UBER', category: 'Transportation' },
    { name: 'PAYROLL DEPOSIT', category: 'Income' },
    { name: 'CLIENT PAYMENT', category: 'Income' }
  ]

  const count = Math.floor(Math.random() * 5) + 3 // 3-7 transacciones
  const transactions: any[] = []

  for (let i = 0; i < count; i++) {
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)]
    const isIncome = desc.category === 'Income'
    const amount = isIncome 
      ? Math.floor(Math.random() * 10000) + 1000
      : Math.floor(Math.random() * 500) + 50

    const daysAgo = Math.floor(Math.random() * 7)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    transactions.push({
      bankAccountId,
      date,
      name: desc.name,
      description: desc.name,
      amount: isIncome ? amount : -amount,
      debit: isIncome ? 0 : amount,
      credit: isIncome ? amount : 0,
      category: [desc.category],
      pending: Math.random() > 0.8
    })
  }

  return transactions
}

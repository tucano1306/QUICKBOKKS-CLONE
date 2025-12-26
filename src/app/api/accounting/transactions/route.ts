import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener transacciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // income, expense, transfer
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accountId = searchParams.get('accountId')
    const search = searchParams.get('search')

    // Obtener transacciones bancarias
    const bankWhere: any = {}
    if (companyId) bankWhere.companyId = companyId
    if (startDate && endDate) {
      bankWhere.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    if (accountId) bankWhere.bankAccountId = accountId
    if (search) {
      bankWhere.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { merchantName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    const bankTransactions = await prisma.bankTransaction.findMany({
      where: bankWhere,
      include: {
        bankAccount: true,
        expense: { include: { category: true } },
        invoice: { include: { customer: true } }
      },
      orderBy: { date: 'desc' },
      take: 100
    })

    // Obtener gastos
    const expenseWhere: any = {}
    if (companyId) expenseWhere.companyId = companyId
    if (startDate && endDate) {
      expenseWhere.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    if (search) {
      expenseWhere.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } }
      ]
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: true
      },
      orderBy: { date: 'desc' },
      take: 100
    })

    // Obtener facturas pagadas (ingresos)
    const invoiceWhere: any = { status: 'PAID' }
    if (companyId) invoiceWhere.companyId = companyId
    if (startDate && endDate) {
      invoiceWhere.paidDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const paidInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        customer: true
      },
      orderBy: { paidDate: 'desc' },
      take: 100
    })

    // Combinar y formatear transacciones
    const transactions = [
      ...bankTransactions.map(t => ({
        id: t.id,
        date: t.date,
        type: t.credit > 0 ? 'income' : 'expense',
        category: t.category?.[0] || 'Sin categoría',
        description: t.description || t.name,
        account: t.bankAccount?.accountName || 'Cuenta bancaria',
        amount: Math.abs(t.credit > 0 ? t.credit : t.debit),
        reference: t.reference,
        status: t.reconciled ? 'completed' : 'pending',
        source: 'bank',
        attachments: 0
      })),
      ...expenses.map(e => ({
        id: e.id,
        date: e.date,
        type: 'expense',
        category: e.category?.name || 'Sin categoría',
        description: e.description,
        account: 'Gastos',
        amount: Number(e.amount),
        reference: e.reference,
        status: e.status?.toLowerCase() || 'completed',
        source: 'expense',
        attachments: e.attachments?.length || 0
      })),
      ...paidInvoices.map(i => ({
        id: i.id,
        date: i.paidDate || i.issueDate,
        type: 'income',
        category: 'Ventas',
        description: `Factura ${i.invoiceNumber} - ${i.customer?.name}`,
        account: 'Ingresos',
        amount: Number(i.total),
        reference: i.invoiceNumber,
        status: 'completed',
        source: 'invoice',
        attachments: 0
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Filtrar por tipo si se especifica
    const filteredTransactions = type && type !== 'all' 
      ? transactions.filter(t => t.type === type)
      : transactions

    // Calcular estadísticas
    const stats = {
      totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      pendingCount: transactions.filter(t => t.status === 'pending').length,
      completedCount: transactions.filter(t => t.status === 'completed').length,
      totalCount: transactions.length
    }

    return NextResponse.json({
      success: true,
      transactions: filteredTransactions,
      stats
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ 
      error: 'Error al obtener transacciones',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Importar transacciones
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, transactions, bankAccountId, companyId } = body

    switch (action) {
      case 'import':
        // Importar transacciones desde archivo
        const importedCount = await importTransactions(transactions, bankAccountId, companyId)
        return NextResponse.json({ 
          success: true, 
          message: `${importedCount} transacciones importadas`,
          count: importedCount
        })

      case 'categorize':
        // Categorizar transacción manualmente
        const { transactionId, categoryId, accountId } = body
        await prisma.bankTransaction.update({
          where: { id: transactionId },
          data: { 
            categoryId,
            category: [categoryId]
          }
        })
        return NextResponse.json({ success: true })

      case 'match':
        // Vincular transacción con gasto o factura
        const { matchType, matchId } = body
        const updateData: any = {}
        if (matchType === 'expense') updateData.matchedExpenseId = matchId
        if (matchType === 'invoice') updateData.matchedInvoiceId = matchId
        
        await prisma.bankTransaction.update({
          where: { id: body.transactionId },
          data: updateData
        })
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing transaction:', error)
    return NextResponse.json({ 
      error: 'Error al procesar transacción',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función auxiliar para importar transacciones
async function importTransactions(transactions: any[], bankAccountId: string, companyId: string) {
  let count = 0
  
  for (const t of transactions) {
    try {
      await prisma.bankTransaction.create({
        data: {
          bankAccountId,
          companyId,
          date: new Date(t.date),
          description: t.description,
          name: t.name || t.description,
          amount: t.amount,
          debit: t.amount < 0 ? Math.abs(t.amount) : 0,
          credit: t.amount > 0 ? t.amount : 0,
          reference: t.reference,
          merchantName: t.merchantName,
          category: t.category ? [t.category] : []
        }
      })
      count++
    } catch (e) {
      console.error('Error importing transaction:', e)
    }
  }
  
  return count
}

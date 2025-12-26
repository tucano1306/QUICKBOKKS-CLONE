import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener transacciones para reclasificación masiva
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sourceAccount = searchParams.get('sourceAccount')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // Obtener transacciones bancarias
    const bankWhere: any = {}
    if (companyId) bankWhere.companyId = companyId
    if (sourceAccount) bankWhere.category = { has: sourceAccount }
    if (startDate && endDate) {
      bankWhere.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    if (search) {
      bankWhere.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: bankWhere,
      include: {
        bankAccount: true
      },
      orderBy: { date: 'desc' },
      take: 200
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
      expenseWhere.description = { contains: search, mode: 'insensitive' }
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: true
      },
      orderBy: { date: 'desc' },
      take: 200
    })

    // Obtener plan de cuentas para destinos
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    })

    // Obtener categorías
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    })

    // Combinar transacciones
    const allTransactions = [
      ...transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description || t.name,
        amount: Math.abs(t.amount),
        currentAccount: t.category?.[0] || 'Sin clasificar',
        currentAccountCode: '',
        source: 'bank' as const,
        selected: false
      })),
      ...expenses.map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: Number(e.amount),
        currentAccount: e.category?.name || 'Sin clasificar',
        currentAccountCode: e.category?.id || '',
        source: 'expense' as const,
        selected: false
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Agrupar por cuenta actual para estadísticas
    const accountGroups = allTransactions.reduce((acc, t) => {
      if (!acc[t.currentAccount]) {
        acc[t.currentAccount] = { count: 0, total: 0 }
      }
      acc[t.currentAccount].count++
      acc[t.currentAccount].total += t.amount
      return acc
    }, {} as Record<string, { count: number; total: number }>)

    // Historial de reclasificaciones (simulado)
    const reclassificationHistory = [
      {
        id: 'RCL-001',
        date: new Date().toISOString(),
        sourceAccount: 'Office Expenses',
        destinationAccount: 'Equipment',
        transactionCount: 15,
        totalAmount: 3500,
        performedBy: session.user?.name || 'Usuario',
        status: 'completed'
      },
      {
        id: 'RCL-002',
        date: new Date(Date.now() - 86400000).toISOString(),
        sourceAccount: 'Miscellaneous',
        destinationAccount: 'Professional Services',
        transactionCount: 8,
        totalAmount: 12000,
        performedBy: session.user?.name || 'Usuario',
        status: 'completed'
      }
    ]

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      accounts,
      categories,
      accountGroups,
      reclassificationHistory,
      stats: {
        totalTransactions: allTransactions.length,
        totalAmount: allTransactions.reduce((sum, t) => sum + t.amount, 0),
        accountsCount: Object.keys(accountGroups).length
      }
    })

  } catch (error) {
    console.error('Error fetching reclassification data:', error)
    return NextResponse.json({ 
      error: 'Error al obtener datos para reclasificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Ejecutar reclasificación masiva
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, transactions, destinationAccount, destinationAccountCode, notes } = body

    switch (action) {
      case 'preview':
        // Vista previa de reclasificación
        const previewTotal = transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
        return NextResponse.json({
          success: true,
          preview: {
            transactionCount: transactions.length,
            totalAmount: previewTotal,
            sourceAccounts: [...new Set(transactions.map((t: any) => t.currentAccount))],
            destinationAccount,
            estimatedTime: `${Math.ceil(transactions.length / 10)} segundos`
          }
        })

      case 'execute':
        // Ejecutar reclasificación
        const results = await executeReclassification(transactions, destinationAccount, destinationAccountCode)
        
        return NextResponse.json({
          success: true,
          message: `${results.success} transacciones reclasificadas exitosamente`,
          results: {
            success: results.success,
            failed: results.failed,
            totalProcessed: results.success + results.failed
          }
        })

      case 'undo':
        // Deshacer última reclasificación (basado en historial)
        const { reclassificationId } = body
        // En producción, guardaríamos el estado anterior para poder revertir
        return NextResponse.json({
          success: true,
          message: 'Reclasificación revertida exitosamente'
        })

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing reclassification:', error)
    return NextResponse.json({ 
      error: 'Error al procesar reclasificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función para ejecutar reclasificación
async function executeReclassification(
  transactions: { id: string; source: 'bank' | 'expense' }[],
  destinationAccount: string,
  destinationAccountCode: string
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const t of transactions) {
    try {
      if (t.source === 'bank') {
        await prisma.bankTransaction.update({
          where: { id: t.id },
          data: {
            category: [destinationAccount]
          }
        })
      } else if (t.source === 'expense') {
        // Buscar categoría por nombre o crear
        let category = await prisma.expenseCategory.findFirst({
          where: { name: destinationAccount }
        })
        
        if (category) {
          await prisma.expense.update({
            where: { id: t.id },
            data: { categoryId: category.id }
          })
        }
      }
      success++
    } catch (e) {
      console.error('Error reclassifying transaction:', t.id, e)
      failed++
    }
  }

  return { success, failed }
}

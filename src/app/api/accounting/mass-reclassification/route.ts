import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  executeReclassification,
  resolveCategory,
  resolveTargets,
} from '@/lib/mass-reclassification'

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

    // Combinar transacciones.
    //
    // Los nombres de campo son los que pinta la tabla en
    // company/accounting/mass-reclassification/page.tsx: `type`,
    // `currentCategory` y `currentCategoryId`. Antes se devolvian como
    // `currentAccount`, `currentAccountCode` y `source`, que no coincidian con
    // nada, asi que la columna de categoria salia vacia y TODAS las filas se
    // pintaban como gasto en rojo (`t.type === 'income'` era siempre falso
    // sobre undefined), incluidos los ingresos.
    //
    // El signo del importe bancario sigue la convencion del resto del repo
    // (ver banking/reconciliation/import): positivo es deposito, negativo
    // retiro.
    const allTransactions = [
      ...transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description || t.name,
        amount: Math.abs(t.amount),
        type: (t.amount > 0 ? 'income' : 'expense') as 'income' | 'expense',
        currentCategory: t.category?.[0] || 'Sin clasificar',
        currentCategoryId: '',
        source: 'bank' as const,
        selected: false
      })),
      ...expenses.map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: Number(e.amount),
        type: 'expense' as const,
        currentCategory: e.category?.name || 'Sin clasificar',
        currentCategoryId: e.category?.id || '',
        source: 'expense' as const,
        selected: false
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Agrupar por cuenta actual para estadísticas
    const accountGroups = allTransactions.reduce((acc, t) => {
      if (!acc[t.currentCategory]) {
        acc[t.currentCategory] = { count: 0, total: 0 }
      }
      acc[t.currentCategory].count++
      acc[t.currentCategory].total += t.amount
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
    const { action, transactionIds, newCategoryId, destinationAccount, companyId } = body

    // La pantalla manda `transactionIds` (ids sueltos) y `newCategoryId` (id de
    // ExpenseCategory). Antes esto desestructuraba `transactions` y
    // `destinationAccount`, que nunca llegaban: `transactions` quedaba
    // undefined y tanto el `.reduce` de la vista previa como el `for...of` de
    // la ejecucion lanzaban TypeError. El try/catch lo convertia en un 500 y la
    // pantalla, que solo miraba `response.ok`, no reclasificaba nada sin decir
    // por que.
    //
    // `destinationAccount` (nombre) se sigue aceptando como alternativa a
    // `newCategoryId` para no romper llamadas por nombre; se resuelve con
    // findCategoryByName, insensible a mayusculas y acentos y filtrada por
    // empresa.
    if (action !== 'preview' && action !== 'execute') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'No se recibió ninguna transacción para reclasificar' },
        { status: 400 }
      )
    }

    const category = await resolveCategory(companyId ?? null, newCategoryId, destinationAccount)

    if (!category) {
      return NextResponse.json(
        { error: 'No se encontró la categoría de destino' },
        { status: 400 }
      )
    }

    const targets = await resolveTargets(transactionIds, companyId ?? null)

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'Las transacciones seleccionadas ya no existen' },
        { status: 404 }
      )
    }

    if (action === 'preview') {
      // La pantalla hace `setPreviewResult(data)` directamente, asi que la
      // respuesta ES el resultado: nada de envolverlo en { preview: ... }.
      return NextResponse.json({
        totalTransactions: targets.length,
        totalAmount: targets.reduce((sum, t) => sum + t.amount, 0),
        affected: targets.map((t) => ({
          id: t.id,
          description: t.description,
          oldCategory: t.currentCategory,
          newCategory: category.name,
        })),
      })
    }

    const results = await executeReclassification(targets, category)

    return NextResponse.json({
      success: true,
      message: `${results.success} transacciones reclasificadas exitosamente`,
      results: {
        success: results.success,
        failed: results.failed,
        totalProcessed: results.success + results.failed
      }
    })

  } catch (error) {
    console.error('Error processing reclassification:', error)
    return NextResponse.json({ 
      error: 'Error al procesar reclasificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 5000) : 100

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Verify user has access to this company
    const hasAccess = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId }
    })
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const where: any = { companyId }
    if (type && type !== 'ALL') {
      where.type = type
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, category, amount, date, description, reference, notes, companyId, status } = body

    if (!type || !category || !amount || !description || !companyId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify user has access to this company
    const hasAccess = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId }
    })
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        category,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description,
        reference: reference || null,
        notes: notes || null,
        status: status || 'COMPLETED',
        companyId,
      }
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/transactions  (bulk delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs' }, { status: 400 })
    }

    // Verify all transactions belong to a company the user has access to
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: ids } },
      select: { id: true, companyId: true },
    })

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Transacciones no encontradas' }, { status: 404 })
    }

    const companyIds = [...new Set(transactions.map(t => t.companyId))]
    for (const companyId of companyIds) {
      const hasAccess = await prisma.companyUser.findFirst({
        where: { userId: session.user.id, companyId },
      })
      if (!hasAccess) {
        return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
      }
    }

    const validIds = transactions.map(t => t.id)
    await prisma.transaction.deleteMany({ where: { id: { in: validIds } } })

    return NextResponse.json({ success: true, deleted: validIds.length })
  } catch (error) {
    console.error('Error bulk deleting transactions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

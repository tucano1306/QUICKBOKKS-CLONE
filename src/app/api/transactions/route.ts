import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  createIncomeJournalEntry, 
  createExpenseJournalEntry,
  deleteTransactionWithReversal 
} from '@/lib/accounting-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // 'INCOME' | 'EXPENSE' | 'TRANSFER'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    const where: any = { companyId }
    
    if (type) {
      where.type = type
    }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100
    })

    // Calcular totales
    const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0)
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0)

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        count: transactions.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, category, description, amount, date, notes } = body

    if (!companyId || !type || !amount) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Usar transacción de BD para atomicidad (si falla el journal entry, revertir todo)
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type,
          category: category || (type === 'INCOME' ? 'Ingreso General' : 'Gasto General'),
          description,
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          status: 'COMPLETED',
          notes
        }
      })

      return transaction;
    });

    // Crear asiento contable automáticamente (Partida Doble)
    // Nota: Esto está fuera de la transacción porque usa funciones separadas
    // Si falla, la transacción existe pero sin journal entry - se puede crear manualmente
    const txDate = date ? new Date(date) : new Date();
    const txAmount = parseFloat(amount);
    const txDescription = description || category || (type === 'INCOME' ? 'Ingreso' : 'Gasto');
    
    try {
      if (type === 'INCOME') {
        await createIncomeJournalEntry(companyId, txAmount, txDescription, txDate, result.id, session.user.id);
      } else if (type === 'EXPENSE') {
        await createExpenseJournalEntry(companyId, txAmount, txDescription, category || 'General', txDate, result.id, session.user.id);
      }
    } catch (journalError) {
      console.error('Error creating journal entry (transaction saved):', journalError);
      // No revertir la transacción, solo loguear
    }

    return NextResponse.json({ success: true, transaction: result })
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      // Intentar leer IDs del body para eliminación múltiple
      const body = await request.json().catch(() => null)
      if (body?.ids && Array.isArray(body.ids)) {
        // Eliminar cada transacción con reversión de asiento contable
        for (const txId of body.ids) {
          await deleteTransactionWithReversal(txId, session.user.id);
        }
        return NextResponse.json({ success: true, deleted: body.ids.length })
      }
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    // Eliminar con reversión de asiento contable
    await deleteTransactionWithReversal(id, session.user.id);

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

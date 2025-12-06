import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteTransactionWithReversal } from '@/lib/accounting-service'

// GET - Obtener una transacción específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la compañía del usuario
    const userCompany = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    })

    if (!userCompany) {
      return NextResponse.json({ error: 'No tienes una empresa asociada' }, { status: 403 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        companyId: userCompany.companyId
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json({ error: 'Error al obtener la transacción' }, { status: 500 })
  }
}

// PUT - Actualizar una transacción
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la compañía del usuario
    const userCompany = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    })

    if (!userCompany) {
      return NextResponse.json({ error: 'No tienes una empresa asociada' }, { status: 403 })
    }

    // Verificar que la transacción existe y pertenece a la empresa
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        companyId: userCompany.companyId
      }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const {
      type,
      category,
      description,
      amount,
      date,
      status,
      notes,
      reference
    } = body

    // Validaciones básicas
    if (!category?.trim()) {
      return NextResponse.json({ error: 'La categoría es requerida' }, { status: 400 })
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
    }

    // Parsear fecha correctamente (formato americano MM/DD/YYYY)
    let parsedDate: Date;
    if (date.includes('-')) {
      const [year, month, day] = date.split('-').map(Number);
      parsedDate = new Date(year, month - 1, day, 12, 0, 0);
    } else if (date.includes('/')) {
      const [month, day, year] = date.split('/').map(Number);
      parsedDate = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      parsedDate = new Date(date);
    }

    const newAmount = parseFloat(amount);

    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        type: type || existingTransaction.type,
        category,
        description: description || null,
        amount: newAmount,
        date: parsedDate,
        status: status || existingTransaction.status,
        notes: notes || null
      }
    })

    // =====================================================
    // SINCRONIZAR JOURNAL ENTRY ASOCIADO
    // El P&L usa los JE, así que DEBEMOS sincronizarlos
    // =====================================================
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { reference: params.id },
      include: { lines: true }
    });

    if (journalEntry) {
      // Actualizar fecha del JE
      await prisma.journalEntry.update({
        where: { id: journalEntry.id },
        data: { date: parsedDate }
      });

      // Actualizar montos de las líneas del JE
      for (const line of journalEntry.lines) {
        await prisma.journalEntryLine.update({
          where: { id: line.id },
          data: {
            debit: line.debit > 0 ? newAmount : 0,
            credit: line.credit > 0 ? newAmount : 0
          }
        });
      }
      console.log(`✅ Journal Entry ${journalEntry.entryNumber} sincronizado con transacción`);
    }

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Error al actualizar la transacción' }, { status: 500 })
  }
}

// DELETE - Eliminar una transacción
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la compañía del usuario
    const userCompany = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    })

    if (!userCompany) {
      return NextResponse.json({ error: 'No tienes una empresa asociada' }, { status: 403 })
    }

    // Verificar que la transacción existe y pertenece a la empresa
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        companyId: userCompany.companyId
      }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    // Eliminar con reversión de Journal Entry
    await deleteTransactionWithReversal(params.id, session.user.id)

    return NextResponse.json({ success: true, message: 'Transacción eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Error al eliminar la transacción' }, { status: 500 })
  }
}

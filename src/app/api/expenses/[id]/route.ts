import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteExpenseWithReversal } from '@/lib/accounting-service';

// GET - Obtener un gasto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const expense = await prisma.expense.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
      include: {
        category: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 });
  }
}

// PUT - Actualizar un gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, amount, date, description, vendor, paymentMethod, status, notes } = body;

    // Verificar que el gasto existe y pertenece al usuario
    const existing = await prisma.expense.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    // Parsear fecha correctamente
    let parsedDate: Date | undefined;
    if (date) {
      // Si viene en formato YYYY-MM-DD (de input type="date")
      if (date.includes('-')) {
        const [year, month, day] = date.split('-').map(Number);
        parsedDate = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas de timezone
      } 
      // Si viene en formato DD/MM/YYYY
      else if (date.includes('/')) {
        const [day, month, year] = date.split('/').map(Number);
        parsedDate = new Date(year, month - 1, day, 12, 0, 0);
      }
      // Fallback
      else {
        parsedDate = new Date(date);
      }
    }

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        categoryId,
        amount: amount ? parseFloat(amount) : undefined,
        date: parsedDate,
        description,
        vendor,
        paymentMethod,
        status,
        notes,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 });
  }
}

// DELETE - Eliminar un gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el gasto existe y pertenece al usuario
    const existing = await prisma.expense.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    // Eliminar con reversión de Journal Entry
    await deleteExpenseWithReversal(params.id, session.user.id);

    return NextResponse.json({ success: true, message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 });
  }
}

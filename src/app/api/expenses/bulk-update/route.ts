import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/expenses/bulk-update
 * Actualizar estado de múltiples gastos
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { ids, status } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requieren IDs de gastos' }, { status: 400 });
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Estado inválido. Debe ser: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Verificar que todos los gastos pertenecen al usuario
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      }
    });

    if (expenses.length !== ids.length) {
      return NextResponse.json({ 
        error: 'Algunos gastos no fueron encontrados o no te pertenecen' 
      }, { status: 404 });
    }

    // Actualizar todos los gastos
    const result = await prisma.expense.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      },
      data: {
        status: status
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} gasto(s) actualizado(s) a "${status}"`,
      updatedCount: result.count
    });

  } catch (error) {
    console.error('Error updating expenses:', error);
    return NextResponse.json(
      { error: 'Error al actualizar gastos' },
      { status: 500 }
    );
  }
}

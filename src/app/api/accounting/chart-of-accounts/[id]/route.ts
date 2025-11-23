import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const account = await prisma.chartOfAccounts.findUnique({
      where: { id: params.id },
      include: {
        parent: true,
        children: true,
        journalEntries: {
          include: {
            journalEntry: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        budgets: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json({ error: 'Error al obtener cuenta' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isActive, parentId } = body;

    const account = await prisma.chartOfAccounts.update({
      where: { id: params.id },
      data: {
        name,
        description,
        isActive,
        parentId,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Error al actualizar cuenta' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si tiene transacciones
    const hasTransactions = await prisma.journalEntryLine.count({
      where: { accountId: params.id },
    });

    if (hasTransactions > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una cuenta con transacciones' },
        { status: 400 }
      );
    }

    await prisma.chartOfAccounts.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Cuenta eliminada' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 });
  }
}

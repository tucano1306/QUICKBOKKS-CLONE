import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (type) where.type = type;
    if (isActive) where.isActive = isActive === 'true';

    const accounts = await prisma.chartOfAccounts.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            journalEntries: true,
            budgets: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json({ error: 'Error al obtener plan de cuentas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, type, category, parentId, description } = body;

    // Verificar si el código ya existe
    const existing = await prisma.chartOfAccounts.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: 'El código de cuenta ya existe' }, { status: 400 });
    }

    // Calcular el nivel basado en el padre
    let level = 1;
    if (parentId) {
      const parent = await prisma.chartOfAccounts.findUnique({
        where: { id: parentId },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const account = await prisma.chartOfAccounts.create({
      data: {
        code,
        name,
        type,
        category,
        parentId,
        description,
        level,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 });
  }
}

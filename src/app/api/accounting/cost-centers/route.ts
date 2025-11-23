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

    const costCenters = await prisma.costCenter.findMany({
      where: { isActive: true },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            journalEntries: true,
            budgets: true,
            expenses: true,
            assets: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(costCenters);
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    return NextResponse.json({ error: 'Error al obtener centros de costo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, description, parentId, managerId } = body;

    // Verificar si el código ya existe
    const existing = await prisma.costCenter.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 });
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        code,
        name,
        description,
        parentId,
        managerId,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json(costCenter, { status: 201 });
  } catch (error) {
    console.error('Error creating cost center:', error);
    return NextResponse.json({ error: 'Error al crear centro de costo' }, { status: 500 });
  }
}

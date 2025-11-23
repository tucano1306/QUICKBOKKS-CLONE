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
    const fiscalYear = searchParams.get('fiscalYear');
    const status = searchParams.get('status');

    const where: any = {};
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
    if (status) where.status = status;

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        account: true,
        costCenter: true,
        periods: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Error al obtener presupuestos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, fiscalYear, startDate, endDate, accountId, costCenterId, amount, periods } = body;

    const budget = await prisma.budget.create({
      data: {
        name,
        fiscalYear,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        accountId,
        costCenterId,
        amount,
        remaining: amount,
        periods: periods ? {
          create: periods.map((period: any) => ({
            period: period.period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            budgetAmount: period.budgetAmount,
          })),
        } : undefined,
      },
      include: {
        account: true,
        costCenter: true,
        periods: true,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 });
  }
}

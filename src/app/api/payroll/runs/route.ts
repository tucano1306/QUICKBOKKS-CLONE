import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPayrollRun, getPayrollSummary } from '@/lib/payroll-service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { periodStart, periodEnd, paymentDate, employeeIds } = body;

    if (!periodStart || !periodEnd || !paymentDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createPayrollRun({
      userId: session.user.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      paymentDate: new Date(paymentDate),
      employeeIds,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Create payroll run error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const status = searchParams.get('status');

    const whereClause: any = {
      employee: {
        userId: session.user.id,
      },
    };

    if (periodStart) {
      whereClause.periodStart = { gte: new Date(periodStart) };
    }

    if (periodEnd) {
      whereClause.periodEnd = { lte: new Date(periodEnd) };
    }

    if (status) {
      whereClause.status = status;
    }

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        deductionItems: true,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    return NextResponse.json(payrolls);
  } catch (error: any) {
    console.error('Get payroll runs error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

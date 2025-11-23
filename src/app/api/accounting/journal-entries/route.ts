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
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
            currency: true,
          },
        },
        costCenter: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Error al obtener asientos contables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { date, description, reference, lines, costCenterId } = body;

    // Validar que los débitos y créditos cuadren
    const totalDebits = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Los débitos y créditos no cuadran' },
        { status: 400 }
      );
    }

    // Generar número de asiento
    const lastEntry = await prisma.journalEntry.findFirst({
      orderBy: { entryNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastEntry) {
      const lastNumber = parseInt(lastEntry.entryNumber.replace('JE-', ''));
      nextNumber = lastNumber + 1;
    }

    const entryNumber = `JE-${nextNumber}`;

    // Crear asiento con sus líneas
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(date),
        description,
        reference,
        costCenterId,
        createdBy: session.user.id,
        lines: {
          create: lines.map((line: any, index: number) => ({
            accountId: line.accountId,
            description: line.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            currencyId: line.currencyId,
            exchangeRate: line.exchangeRate || 1,
            lineNumber: index + 1,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
            currency: true,
          },
        },
        costCenter: true,
      },
    });

    // Actualizar balances de cuentas
    for (const line of lines) {
      const amount = (line.debit || 0) - (line.credit || 0);
      await prisma.chartOfAccounts.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: 'Error al crear asiento contable' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

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
    const { date, description, reference, lines, costCenterId, companyId } = body;

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

    // Resolver accountId desde accountCode si es necesario
    const resolvedLines = await Promise.all(
      lines.map(async (line: any, index: number) => {
        let accountId = line.accountId;
        
        // Si no hay accountId pero hay accountCode, buscar la cuenta
        if (!accountId && line.accountCode) {
          const account = await prisma.chartOfAccounts.findFirst({
            where: { code: line.accountCode },
          });
          if (account) {
            accountId = account.id;
          } else {
            // Crear cuenta temporal si no existe
            const newAccount = await prisma.chartOfAccounts.create({
              data: {
                code: line.accountCode,
                name: line.accountName || `Cuenta ${line.accountCode}`,
                type: 'ASSET',
                balance: 0,
              },
            });
            accountId = newAccount.id;
          }
        }

        return {
          accountId,
          description: line.description,
          debit: line.debit || 0,
          credit: line.credit || 0,
          currencyId: line.currencyId,
          exchangeRate: line.exchangeRate || 1,
          lineNumber: index + 1,
        };
      })
    );

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
          create: resolvedLines,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, description, reference } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Verificar que existe el asiento
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Asiento no encontrado' }, { status: 404 });
    }

    // Actualizar asiento
    const updateData: any = {};
    if (status) updateData.status = status;
    if (description) updateData.description = description;
    if (reference !== undefined) updateData.reference = reference;

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating journal entry:', error);
    return NextResponse.json({ error: 'Error al actualizar asiento contable' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Verificar que existe el asiento
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Asiento no encontrado' }, { status: 404 });
    }

    // No permitir eliminar asientos registrados
    if (existingEntry.status === 'POSTED') {
      return NextResponse.json({ error: 'No se puede eliminar un asiento registrado' }, { status: 400 });
    }

    // Eliminar líneas primero
    await prisma.journalEntryLine.deleteMany({
      where: { journalEntryId: id },
    });

    // Eliminar asiento
    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Asiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json({ error: 'Error al eliminar asiento contable' }, { status: 500 });
  }
}

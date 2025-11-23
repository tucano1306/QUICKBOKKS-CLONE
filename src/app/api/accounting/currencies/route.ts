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

    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      include: {
        exchangeRates: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Error al obtener monedas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, symbol, exchangeRate, isBaseCurrency, decimalPlaces } = body;

    const currency = await prisma.currency.create({
      data: {
        code,
        name,
        symbol,
        exchangeRate: exchangeRate || 1,
        isBaseCurrency: isBaseCurrency || false,
        decimalPlaces: decimalPlaces || 2,
        exchangeRates: {
          create: {
            date: new Date(),
            rate: exchangeRate || 1,
            source: 'Manual',
          },
        },
      },
      include: {
        exchangeRates: true,
      },
    });

    return NextResponse.json(currency, { status: 201 });
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json({ error: 'Error al crear moneda' }, { status: 500 });
  }
}

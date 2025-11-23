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

    const where: any = {};
    if (status) where.status = status;

    const assets = await prisma.asset.findMany({
      where,
      include: {
        costCenter: true,
        depreciations: {
          orderBy: { period: 'desc' },
          take: 12,
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Error al obtener activos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      purchaseDate,
      purchasePrice,
      salvageValue,
      usefulLife,
      depreciationMethod,
      accountId,
      locationId,
      costCenterId,
    } = body;

    // Generar número de activo
    const lastAsset = await prisma.asset.findFirst({
      orderBy: { assetNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastAsset) {
      const lastNumber = parseInt(lastAsset.assetNumber.replace('ASSET-', ''));
      nextNumber = lastNumber + 1;
    }

    const assetNumber = `ASSET-${nextNumber}`;
    const bookValue = purchasePrice;

    const asset = await prisma.asset.create({
      data: {
        assetNumber,
        name,
        description,
        category,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        salvageValue: salvageValue || 0,
        usefulLife,
        depreciationMethod,
        accountId,
        locationId,
        costCenterId,
        bookValue,
      },
      include: {
        costCenter: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Error al crear activo' }, { status: 500 });
  }
}

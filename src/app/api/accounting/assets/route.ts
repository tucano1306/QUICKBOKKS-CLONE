import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userCanAccessCompany } from '@/lib/company-access';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const companyId = searchParams.get('companyId');

    // Sin companyId esto devolvia los activos de TODAS las empresas a cualquiera
    // con sesion. Ahora es obligatorio y hay que pertenecer a la empresa.
    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere companyId' }, { status: 400 });
    }
    if (!(await userCanAccessCompany(session.user.id, companyId))) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 });
    }

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    // Un activo sin empresa es compartido por diseno: el esquema declara el
    // campo opcional y esas filas se consideran visibles para todos.
    where.OR = [{ companyId }, { companyId: null }];

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
    if (!session?.user?.id) {
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
      // Campos de millas para vehículos
      currentMileage,
      purchaseMileage,
      estimatedLifetimeMiles,
      yearModel,
      vin,
      companyId,
    } = body;

    // Sin esto el activo nacia sin empresa, y un activo sin empresa lo ve todo
    // el mundo. Se exige y se comprueba la pertenencia.
    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere companyId' }, { status: 400 });
    }
    if (!(await userCanAccessCompany(session.user.id, companyId))) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 });
    }

    // Generar número de activo
    const lastAsset = await prisma.asset.findFirst({
      orderBy: { assetNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastAsset) {
      const lastNumber = Number.parseInt(lastAsset.assetNumber.replace('ASSET-', ''));
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
        companyId,
        bookValue,
        // Campos de millas
        currentMileage: currentMileage || null,
        purchaseMileage: purchaseMileage || null,
        estimatedLifetimeMiles: estimatedLifetimeMiles || null,
        lastMileageUpdate: currentMileage ? new Date() : null,
        yearModel: yearModel || null,
        vin: vin || null,
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

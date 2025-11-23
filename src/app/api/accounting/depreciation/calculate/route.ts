import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { period } = body; // Formato: YYYY-MM

    const periodDate = new Date(period);

    // Obtener todos los activos activos
    const assets = await prisma.asset.findMany({
      where: {
        status: 'ACTIVE',
        purchaseDate: {
          lt: periodDate,
        },
      },
    });

    const depreciations = [];

    for (const asset of assets) {
      // Verificar si ya existe depreciación para este período
      const existing = await prisma.assetDepreciation.findFirst({
        where: {
          assetId: asset.id,
          period: periodDate,
        },
      });

      if (existing) {
        continue;
      }

      let depreciationAmount = 0;

      // Calcular depreciación según el método
      if (asset.depreciationMethod === 'STRAIGHT_LINE') {
        // Línea recta: (Costo - Valor Residual) / Vida Útil / 12 meses
        depreciationAmount = (asset.purchasePrice - asset.salvageValue) / asset.usefulLife / 12;
      } else if (asset.depreciationMethod === 'DECLINING_BALANCE') {
        // Saldo declinante: Valor en Libros * (2 / Vida Útil) / 12
        const rate = 2 / asset.usefulLife / 12;
        depreciationAmount = asset.bookValue * rate;
      }

      // Calcular nueva depreciación acumulada
      const newAccumulatedDepreciation = asset.accumulatedDepreciation + depreciationAmount;
      const newBookValue = asset.purchasePrice - newAccumulatedDepreciation;

      // No depreciar más allá del valor residual
      if (newBookValue < asset.salvageValue) {
        depreciationAmount = asset.bookValue - asset.salvageValue;
      }

      if (depreciationAmount > 0) {
        // Crear registro de depreciación
        const depreciation = await prisma.assetDepreciation.create({
          data: {
            assetId: asset.id,
            period: periodDate,
            depreciationAmount,
            accumulatedDepreciation: asset.accumulatedDepreciation + depreciationAmount,
            bookValue: asset.bookValue - depreciationAmount,
          },
        });

        // Actualizar activo
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            accumulatedDepreciation: {
              increment: depreciationAmount,
            },
            bookValue: {
              decrement: depreciationAmount,
            },
          },
        });

        depreciations.push(depreciation);
      }
    }

    return NextResponse.json({
      message: `Calculadas ${depreciations.length} depreciaciones`,
      depreciations,
    });
  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return NextResponse.json({ error: 'Error al calcular depreciación' }, { status: 500 });
  }
}

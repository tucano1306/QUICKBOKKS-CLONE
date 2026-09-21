import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVehicleEconomics } from '@/lib/vehicle-economics-service'

export const dynamic = 'force-dynamic'

/**
 * Economia completa de un vehiculo: libros, mercado, prestamo, coste y avisos.
 *
 * Sin `assetId` devuelve todos los activos de la empresa ya calculados, que es
 * lo que pinta la pantalla de listado.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const companyId = searchParams.get('companyId')

    if (assetId) {
      const economics = await getVehicleEconomics(assetId)
      if (!economics) {
        return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ vehicles: [economics] })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere assetId o companyId' }, { status: 400 })
    }

    const assets = await prisma.asset.findMany({
      where: { companyId, category: 'VEHICLE', status: { not: 'DISPOSED' } },
      select: { id: true },
      orderBy: { purchaseDate: 'desc' },
    })

    const vehicles = (await Promise.all(assets.map((a) => getVehicleEconomics(a.id)))).filter(
      (v): v is NonNullable<typeof v> => v !== null
    )

    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error('Error calculando economia del vehiculo:', error)
    return NextResponse.json(
      {
        error: 'Error al calcular la economía del vehículo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

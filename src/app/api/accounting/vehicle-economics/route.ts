import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVehicleEconomics } from '@/lib/vehicle-economics-service'
import { resolveAssetAccess, userCanAccessCompany } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

/**
 * Economia completa de un vehiculo: libros, mercado, prestamo, coste y avisos.
 *
 * Sin `assetId` devuelve todos los activos de la empresa ya calculados, que es
 * lo que pinta la pantalla de listado.
 *
 * Cuando la empresa activa no tiene vehiculos se devuelve ademas `otherCompanies`:
 * las OTRAS empresas del usuario que si tienen alguno. Sin ese dato la pantalla
 * queda en un callejon sin salida que invita a dar de alta un vehiculo que ya
 * existe en otra empresa, y acabas con el mismo activo duplicado.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const companyId = searchParams.get('companyId')

    if (assetId) {
      const access = await resolveAssetAccess(userId, assetId)
      if (access.status !== 200) {
        return NextResponse.json(
          { error: access.status === 404 ? 'Activo no encontrado' : 'No tienes acceso a este activo' },
          { status: access.status }
        )
      }
      const economics = await getVehicleEconomics(assetId)
      if (!economics) {
        return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ vehicles: [economics] })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere assetId o companyId' }, { status: 400 })
    }
    if (!(await userCanAccessCompany(userId, companyId))) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const assets = await prisma.asset.findMany({
      where: { companyId, category: 'VEHICLE', status: { not: 'DISPOSED' } },
      select: { id: true },
      orderBy: { purchaseDate: 'desc' },
    })

    const vehicles = (await Promise.all(assets.map((a) => getVehicleEconomics(a.id)))).filter(
      (v): v is NonNullable<typeof v> => v !== null
    )

    if (vehicles.length > 0) {
      return NextResponse.json({ vehicles })
    }

    return NextResponse.json({ vehicles, otherCompanies: await vehiclesElsewhere(userId, companyId) })
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

/**
 * Otras empresas del usuario que si tienen vehiculos, con cuantos.
 * Solo mira empresas donde el usuario es miembro: no revela nada ajeno.
 */
async function vehiclesElsewhere(userId: string, currentCompanyId: string) {
  const memberships = await prisma.companyUser.findMany({
    where: { userId, companyId: { not: currentCompanyId } },
    select: { company: { select: { id: true, name: true } } },
  })

  const found = await Promise.all(
    memberships
      .map((m) => m.company)
      .filter((c): c is { id: string; name: string } => c !== null)
      .map(async (c) => ({
        id: c.id,
        name: c.name,
        vehicleCount: await prisma.asset.count({
          where: { companyId: c.id, category: 'VEHICLE', status: { not: 'DISPOSED' } },
        }),
      }))
  )

  return found.filter((c) => c.vehicleCount > 0)
}

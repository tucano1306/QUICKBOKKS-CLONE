import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  resolveAssetAccess,
  userCanAccessCompany,
  vehiclesInOtherCompanies,
} from '@/lib/company-access'
import { getVehicleMaintenance } from '@/lib/vehicle-maintenance-service'

export const dynamic = 'force-dynamic'

/**
 * Control de millas: estado del cambio de aceite, historial y proyeccion.
 *
 * Sin `assetId` devuelve todos los vehiculos de la empresa, que es lo que
 * pinta la pantalla de listado.
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
          {
            error:
              access.status === 404 ? 'Activo no encontrado' : 'No tienes acceso a este activo',
          },
          { status: access.status }
        )
      }
      const data = await getVehicleMaintenance(assetId)
      if (!data) {
        return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ vehicles: [data] })
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

    const vehicles = (await Promise.all(assets.map((a) => getVehicleMaintenance(a.id)))).filter(
      (v): v is NonNullable<typeof v> => v !== null
    )

    if (vehicles.length > 0) {
      return NextResponse.json({ vehicles })
    }

    return NextResponse.json({
      vehicles,
      otherCompanies: await vehiclesInOtherCompanies(userId, companyId),
    })
  } catch (error) {
    console.error('Error cargando el control de millas:', error)
    return NextResponse.json(
      {
        error: 'Error al cargar el control de millas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

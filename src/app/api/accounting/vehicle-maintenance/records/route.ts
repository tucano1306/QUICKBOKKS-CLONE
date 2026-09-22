import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAssetAccess } from '@/lib/company-access'
import { runOilChangeAlerts } from '@/lib/vehicle-alerts-service'

export const dynamic = 'force-dynamic'

/**
 * Registro de un servicio: cambio de aceite y demas.
 *
 * Lo que se guarda es la LECTURA DEL ODOMETRO, que es lo unico observable. Las
 * millas del motor se derivan despues a partir de la linea base; guardarlas
 * tambien seria duplicar un dato que puede acabar contradiciendose.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, odometer, date, cost, vendor, oilType, photoUrl, notes, type } = body

    if (!assetId || odometer == null) {
      return NextResponse.json(
        { error: 'Se requieren assetId y la lectura del odómetro' },
        { status: 400 }
      )
    }

    const reading = Number(odometer)
    if (!Number.isFinite(reading) || reading < 0) {
      return NextResponse.json({ error: 'La lectura del odómetro no es válida' }, { status: 400 })
    }

    const access = await resolveAssetAccess(session.user.id, assetId)
    if (access.status !== 200) {
      return NextResponse.json(
        {
          error: access.status === 404 ? 'Activo no encontrado' : 'No tienes acceso a este activo',
        },
        { status: access.status }
      )
    }

    const record = await prisma.vehicleServiceRecord.create({
      data: {
        assetId,
        companyId: access.companyId,
        type: typeof type === 'string' && type.trim() ? type.trim() : 'OIL_CHANGE',
        odometer: Math.round(reading),
        date: date ? new Date(date) : new Date(),
        cost: cost != null && cost !== '' ? Number(cost) : null,
        vendor: vendor || null,
        oilType: oilType || null,
        photoUrl: photoUrl || null,
        notes: notes || null,
      },
    })

    // Un servicio es una lectura fiable del odometro. Si va por delante de la
    // guardada se adelanta el odometro del vehiculo: de lo contrario el control
    // diria que faltan millas que en realidad ya se hicieron.
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { currentMileage: true },
    })
    if (asset && (asset.currentMileage ?? 0) < record.odometer) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { currentMileage: record.odometer, lastMileageUpdate: record.date },
      })
    }

    // Un cambio registrado reinicia el contador: se reevaluan los avisos en
    // el acto para que no quede encendido uno que ya no aplica.
    await runOilChangeAlerts().catch((e) =>
      console.error('No se pudieron reevaluar los avisos:', e)
    )

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error guardando el servicio:', error)
    return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Se requiere el id del servicio' }, { status: 400 })
    }

    // Comprobar de quien es la fila antes de borrarla: el id viene de la URL.
    const row = await prisma.vehicleServiceRecord.findUnique({
      where: { id },
      select: { assetId: true },
    })
    if (!row) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const access = await resolveAssetAccess(session.user.id, row.assetId)
    if (access.status !== 200) {
      return NextResponse.json(
        { error: access.status === 404 ? 'No encontrado' : 'No tienes acceso a este activo' },
        { status: access.status }
      )
    }

    await prisma.vehicleServiceRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error borrando el servicio:', error)
    return NextResponse.json({ error: 'Error al borrar el servicio' }, { status: 500 })
  }
}

/** Cambiar cada cuantas millas toca el servicio en este vehiculo. */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { assetId, serviceIntervalMiles } = await request.json()
    if (!assetId || serviceIntervalMiles == null) {
      return NextResponse.json(
        { error: 'Se requieren assetId y serviceIntervalMiles' },
        { status: 400 }
      )
    }

    const interval = Number(serviceIntervalMiles)
    if (!Number.isFinite(interval) || interval <= 0) {
      return NextResponse.json({ error: 'El intervalo debe ser mayor que cero' }, { status: 400 })
    }

    const access = await resolveAssetAccess(session.user.id, assetId)
    if (access.status !== 200) {
      return NextResponse.json(
        {
          error: access.status === 404 ? 'Activo no encontrado' : 'No tienes acceso a este activo',
        },
        { status: access.status }
      )
    }

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: { serviceIntervalMiles: Math.round(interval) },
    })

    return NextResponse.json({ serviceIntervalMiles: asset.serviceIntervalMiles })
  } catch (error) {
    console.error('Error guardando el intervalo:', error)
    return NextResponse.json({ error: 'Error al guardar el intervalo' }, { status: 500 })
  }
}

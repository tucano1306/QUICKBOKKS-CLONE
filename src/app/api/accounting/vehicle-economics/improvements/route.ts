import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAssetAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

/**
 * Mejoras de capital.
 *
 * Distintas de un gasto de mantenimiento: cambiar el motor no es gasto del
 * ejercicio, sube el valor del activo y alarga su vida util (IRS §1.263(a)-3,
 * "restoration"). `addsLifetimeMiles` es el parametro que mas mueve el valor en
 * libros, asi que conviene que lo valide un contador; se acepta 0 para
 * registrar el coste sin tocar la vida util.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, label, date, cost, addsLifetimeMiles, notes } = body

    if (!assetId || !label || cost == null) {
      return NextResponse.json(
        { error: 'Se requieren assetId, label y cost' },
        { status: 400 }
      )
    }
    if (Number(cost) < 0) {
      return NextResponse.json({ error: 'El coste no puede ser negativo' }, { status: 400 })
    }

    const access = await resolveAssetAccess(session.user.id, assetId)
    if (access.status !== 200) {
      return NextResponse.json(
        { error: access.status === 404 ? 'Activo no encontrado' : 'No tienes acceso a este activo' },
        { status: access.status }
      )
    }

    const improvement = await prisma.assetImprovement.create({
      data: {
        assetId,
        companyId: access.companyId,
        label: String(label).trim(),
        date: date ? new Date(date) : new Date(),
        cost: Number(cost),
        addsLifetimeMiles: Math.max(0, Number(addsLifetimeMiles) || 0),
        notes: notes || null,
      },
    })

    return NextResponse.json(improvement, { status: 201 })
  } catch (error) {
    console.error('Error guardando mejora:', error)
    return NextResponse.json({ error: 'Error al guardar la mejora' }, { status: 500 })
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
      return NextResponse.json({ error: 'Se requiere el id de la mejora' }, { status: 400 })
    }

    // Comprobar de quien es la fila antes de borrarla: el id viene de la URL.
    const row = await prisma.assetImprovement.findUnique({ where: { id }, select: { assetId: true } })
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

    await prisma.assetImprovement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error borrando mejora:', error)
    return NextResponse.json({ error: 'Error al borrar la mejora' }, { status: 500 })
  }
}

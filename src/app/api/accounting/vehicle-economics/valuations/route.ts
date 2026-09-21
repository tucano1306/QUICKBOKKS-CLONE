import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Tasaciones de mercado.
 *
 * Es el dato que ninguna formula puede producir: lo que un dealer o CarMax
 * pagaria de verdad. Lo entra el usuario a partir de una oferta real, y se
 * guarda con el millaje del momento para poder extrapolar cuando envejece.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, date, value, mileage, source, notes } = body

    if (!assetId || value == null || mileage == null || !source) {
      return NextResponse.json(
        { error: 'Se requieren assetId, value, mileage y source' },
        { status: 400 }
      )
    }
    if (Number(value) < 0 || Number(mileage) < 0) {
      return NextResponse.json({ error: 'El valor y el millaje no pueden ser negativos' }, { status: 400 })
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { companyId: true } })
    if (!asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    const valuation = await prisma.assetValuation.create({
      data: {
        assetId,
        companyId: asset.companyId,
        date: date ? new Date(date) : new Date(),
        value: Number(value),
        mileage: Number(mileage),
        source: String(source).trim(),
        notes: notes || null,
      },
    })

    return NextResponse.json(valuation, { status: 201 })
  } catch (error) {
    console.error('Error guardando tasacion:', error)
    return NextResponse.json({ error: 'Error al guardar la tasación' }, { status: 500 })
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
      return NextResponse.json({ error: 'Se requiere el id de la tasación' }, { status: 400 })
    }

    await prisma.assetValuation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error borrando tasacion:', error)
    return NextResponse.json({ error: 'Error al borrar la tasación' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { customerId, portalActive } = await req.json()

    if (!customerId || typeof portalActive !== 'boolean') {
      return NextResponse.json({ 
        error: 'customerId y portalActive son requeridos' 
      }, { status: 400 })
    }

    // Actualizar estado del portal
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { portalActive }
    })

    return NextResponse.json({ 
      message: portalActive ? 'Portal activado' : 'Portal desactivado',
      customer 
    })
  } catch (error) {
    console.error('Error toggling portal access:', error)
    return NextResponse.json(
      { error: 'Error al cambiar estado del portal' },
      { status: 500 }
    )
  }
}

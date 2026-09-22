import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Avisos del usuario que ha iniciado sesion.
 *
 * Siempre filtrados por su propio id: nunca se acepta un userId de la peticion,
 * que seria dejar leer la bandeja de cualquiera cambiando un parametro.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const onlyUnread = searchParams.get('unread') === 'true'

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error cargando los avisos:', error)
    return NextResponse.json({ error: 'Error al cargar los avisos' }, { status: 500 })
  }
}

/** Marcar como leidos: uno concreto, o todos. */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, all } = await request.json().catch(() => ({ id: null, all: false }))

    // El userId del filtro sale de la sesion, asi que marcar por id ajeno no
    // afecta a nada.
    const where = all
      ? { userId: session.user.id, readAt: null }
      : { userId: session.user.id, id: String(id ?? '') }

    if (!all && !id) {
      return NextResponse.json({ error: 'Se requiere id o all' }, { status: 400 })
    }

    const res = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    })

    return NextResponse.json({ updated: res.count })
  } catch (error) {
    console.error('Error marcando los avisos:', error)
    return NextResponse.json({ error: 'Error al marcar los avisos' }, { status: 500 })
  }
}

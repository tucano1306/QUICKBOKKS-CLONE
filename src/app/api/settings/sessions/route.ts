import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Get active sessions for company users
    const companyUsers = await prisma.companyUser.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            sessions: {
              orderBy: { expires: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    const activeSessions = companyUsers
      .filter(cu => cu.user.sessions.length > 0)
      .map(cu => {
        const lastSession = cu.user.sessions[0]
        const now = new Date()
        const lastActivityTime = cu.lastAccessAt || cu.joinedAt
        const minutesSinceActivity = Math.floor((now.getTime() - lastActivityTime.getTime()) / 60000)
        
        return {
          id: lastSession.id,
          user: cu.user.email,
          device: 'Web Browser',
          browser: 'Chrome',
          ipAddress: 'N/A',
          location: 'N/A',
          loginTime: cu.lastAccessAt?.toISOString().replace('T', ' ').slice(0, 16) || 'N/A',
          lastActivity: lastActivityTime.toISOString().replace('T', ' ').slice(0, 16),
          status: minutesSinceActivity < 15 ? 'Active' : 'Idle'
        }
      })

    return NextResponse.json(activeSessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json([])
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Error al eliminar sesión' }, { status: 500 })
  }
}

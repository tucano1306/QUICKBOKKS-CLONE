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
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Get audit logs from AuditLog table
    const auditLogs = await prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    // Get user info for logs that have userId
    const userIds = [...new Set(auditLogs.filter(l => l.userId).map(l => l.userId!))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true }
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    const formattedLogs = auditLogs.map(log => {
      const user = log.userId ? userMap.get(log.userId) : null
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString().replace('T', ' ').slice(0, 19),
        user: user?.email || 'Sistema',
        action: log.action,
        category: log.entityType,
        ipAddress: log.ipAddress || 'N/A',
        device: log.userAgent || 'Desconocido',
        status: 'Success' as const,
        details: typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes || {})
      }
    })

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    // Return empty array if table doesn't exist or other error
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, action, entityType, entityId, changes, ipAddress, userAgent } = body

    if (!companyId || !action) {
      return NextResponse.json(
        { error: 'companyId y action son requeridos' },
        { status: 400 }
      )
    }

    const log = await prisma.auditLog.create({
      data: {
        companyId,
        userId: session.user?.id,
        action,
        entityType: entityType || 'System',
        entityId: entityId || null,
        changes: changes || {},
        ipAddress,
        userAgent
      }
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({ error: 'Error al crear log' }, { status: 500 })
  }
}

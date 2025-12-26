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

    // Get company users with their roles
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            image: true
          }
        },
        role: true
      },
      orderBy: { joinedAt: 'desc' }
    })

    const users = companyUsers.map(cu => ({
      id: cu.user.id,
      name: cu.user.name || 'Sin nombre',
      email: cu.user.email,
      role: cu.role.name,
      roleId: cu.role.id,
      department: (cu.permissions as Record<string, unknown>)?.department || 'General',
      status: cu.isActive ? 'Active' : 'Inactive',
      lastLogin: cu.lastAccessAt?.toISOString() || 'Nunca',
      joinedDate: cu.joinedAt.toISOString().split('T')[0],
      permissions: (cu.role.permissions as string[]) || [],
      phone: cu.user.phone,
      title: (cu.permissions as Record<string, unknown>)?.title || '',
      isOwner: cu.isOwner
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, email, roleId, permissions, title, department } = body

    if (!companyId || !email || !roleId) {
      return NextResponse.json(
        { error: 'companyId, email y roleId son requeridos' },
        { status: 400 }
      )
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      // Create invitation instead
      const invitation = await prisma.companyInvitation.create({
        data: {
          companyId,
          email,
          roleId,
          invitedBy: session.user?.id || '',
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })

      return NextResponse.json({
        status: 'invited',
        invitation,
        message: 'Invitación enviada al usuario'
      })
    }

    // Add existing user to company
    const companyUser = await prisma.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        roleId,
        permissions: { title, department },
        joinedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        role: true
      }
    })

    return NextResponse.json({
      id: companyUser.user.id,
      name: companyUser.user.name,
      email: companyUser.user.email,
      role: companyUser.role.name,
      roleId: companyUser.role.id,
      department: department || 'General',
      status: 'Active',
      joinedDate: companyUser.joinedAt.toISOString().split('T')[0],
      phone: companyUser.user.phone,
      title: title || ''
    })
  } catch (error) {
    console.error('Error adding user:', error)
    return NextResponse.json({ error: 'Error al agregar usuario' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, userId, roleId, isActive, permissions, title, department } = body

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'companyId y userId son requeridos' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (roleId) updateData.roleId = roleId
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (permissions || title || department) {
      updateData.permissions = { ...permissions, title, department }
    }

    const companyUser = await prisma.companyUser.update({
      where: {
        companyId_userId: { companyId, userId }
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        role: true
      }
    })

    return NextResponse.json({
      id: companyUser.user.id,
      name: companyUser.user.name,
      email: companyUser.user.email,
      role: companyUser.role.name,
      roleId: companyUser.role.id,
      status: companyUser.isActive ? 'Active' : 'Inactive'
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const userId = searchParams.get('userId')

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'companyId y userId son requeridos' },
        { status: 400 }
      )
    }

    // Check if user is owner
    const companyUser = await prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId, userId } }
    })

    if (companyUser?.isOwner) {
      return NextResponse.json(
        { error: 'No se puede eliminar al propietario de la empresa' },
        { status: 400 }
      )
    }

    await prisma.companyUser.delete({
      where: { companyId_userId: { companyId, userId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}

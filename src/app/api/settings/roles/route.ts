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

    const roles = await prisma.companyRole.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      userCount: role._count.members,
      permissions: role.permissions,
      isSystem: role.isSystem
    }))

    return NextResponse.json(formattedRoles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, name, description, permissions } = body

    if (!companyId || !name) {
      return NextResponse.json(
        { error: 'companyId y name son requeridos' },
        { status: 400 }
      )
    }

    const role = await prisma.companyRole.create({
      data: {
        companyId,
        name,
        description,
        permissions: permissions || [],
        isSystem: false
      }
    })

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: 0,
      permissions: role.permissions,
      isSystem: role.isSystem
    })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({ error: 'Error al crear rol' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, description, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Check if role is system role
    const existingRole = await prisma.companyRole.findUnique({ where: { id } })
    if (existingRole?.isSystem) {
      return NextResponse.json(
        { error: 'No se pueden modificar roles del sistema' },
        { status: 400 }
      )
    }

    const role = await prisma.companyRole.update({
      where: { id },
      data: {
        name,
        description,
        permissions
      },
      include: {
        _count: { select: { members: true } }
      }
    })

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.members,
      permissions: role.permissions,
      isSystem: role.isSystem
    })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Error al actualizar rol' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Check if role is system role
    const role = await prisma.companyRole.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } }
    })

    if (role?.isSystem) {
      return NextResponse.json(
        { error: 'No se pueden eliminar roles del sistema' },
        { status: 400 }
      )
    }

    if (role && role._count.members > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un rol con usuarios asignados' },
        { status: 400 }
      )
    }

    await prisma.companyRole.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Error al eliminar rol' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List classes and locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // 'class' or 'location'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    if (type === 'class') {
      const classes = await prisma.transactionClass.findMany({
        where: { companyId },
        include: { children: true, parent: true },
        orderBy: { name: 'asc' }
      })
      return NextResponse.json(classes)
    } else if (type === 'location') {
      const locations = await prisma.transactionLocation.findMany({
        where: { companyId },
        orderBy: { name: 'asc' }
      })
      return NextResponse.json(locations)
    } else {
      // Return both
      const [classes, locations] = await Promise.all([
        prisma.transactionClass.findMany({
          where: { companyId },
          include: { children: true },
          orderBy: { name: 'asc' }
        }),
        prisma.transactionLocation.findMany({
          where: { companyId },
          orderBy: { name: 'asc' }
        })
      ])
      return NextResponse.json({ classes, locations })
    }
  } catch (error) {
    console.error('Error fetching tracking categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create class or location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, name, description, parentId, address, city, state, country } = body

    if (!companyId || !type || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'class') {
      const transactionClass = await prisma.transactionClass.create({
        data: {
          companyId,
          name,
          description: description || null,
          parentId: parentId || null
        }
      })
      return NextResponse.json(transactionClass, { status: 201 })
    } else if (type === 'location') {
      const location = await prisma.transactionLocation.create({
        data: {
          companyId,
          name,
          address: address || null,
          city: city || null,
          state: state || null,
          country: country || null
        }
      })
      return NextResponse.json(location, { status: 201 })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error creating tracking category:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update class or location
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, ...updateData } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 })
    }

    if (type === 'class') {
      const transactionClass = await prisma.transactionClass.update({
        where: { id },
        data: updateData
      })
      return NextResponse.json(transactionClass)
    } else if (type === 'location') {
      const location = await prisma.transactionLocation.update({
        where: { id },
        data: updateData
      })
      return NextResponse.json(location)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating tracking category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete class or location
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 })
    }

    if (type === 'class') {
      await prisma.transactionClass.delete({ where: { id } })
    } else if (type === 'location') {
      await prisma.transactionLocation.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tracking category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

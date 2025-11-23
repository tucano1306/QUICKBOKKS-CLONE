import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createInventoryItem } from '@/lib/inventory-service'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/inventory/items
 * Lista items de inventario con filtros
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const warehouseId = searchParams.get('warehouseId')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')

    const where: any = {
      userId: session.user.id,
      isActive: true,
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (category) {
      where.category = category
    }

    if (lowStock) {
      where.quantity = {
        lte: (prisma as any).raw('min_stock'),
      }
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await (prisma as any).inventoryItem.findMany({
      where,
      include: {
        warehouse: true,
        _count: {
          select: {
            batches: true,
            serialNumbers: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error getting inventory items:', error)
    return NextResponse.json({ error: 'Failed to get items' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/items
 * Crea un nuevo item de inventario
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const result = await createInventoryItem(session.user.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      item: result.item,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

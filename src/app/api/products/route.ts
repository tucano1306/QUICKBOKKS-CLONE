import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET all products
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId') || 'default-company-001'

    const products = await prisma.product.findMany({
      where: {
        companyId,
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST new product
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      type,
      sku,
      price,
      cost,
      taxable,
      taxRate,
      category,
      unit,
      companyId,
    } = body

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Nombre y precio son requeridos' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        companyId: companyId || 'default-company-001',
        name,
        description,
        type: type || 'SERVICE',
        sku,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : null,
        taxable: taxable !== false,
        taxRate: taxRate || 16,
        category,
        unit,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}

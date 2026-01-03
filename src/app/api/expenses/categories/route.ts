import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Revalidar cada 2 minutos - las categorías cambian poco frecuentemente
export const revalidate = 120

// GET expense categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const categories = await prisma.expenseCategory.findMany({
      include: {
        children: true,
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

// POST new expense category
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, taxRate, parentId } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nombre y tipo son requeridos' },
        { status: 400 }
      )
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        description,
        type,
        taxRate: taxRate || 16,
        parentId,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating expense category:', error)
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    )
  }
}

// PUT update expense category
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de categoría requerido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, type, taxRate, parentId } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nombre y tipo son requeridos' },
        { status: 400 }
      )
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name,
        description,
        type,
        taxRate: taxRate || 16,
        parentId,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating expense category:', error)
    return NextResponse.json(
      { error: 'Error al actualizar categoría' },
      { status: 500 }
    )
  }
}

// DELETE expense category
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de categoría requerido' },
        { status: 400 }
      )
    }

    // Verificar si tiene gastos asociados
    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            expenses: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    if (category._count.expenses > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Hay ${category._count.expenses} gasto(s) usando esta categoría` },
        { status: 400 }
      )
    }

    await prisma.expenseCategory.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Categoría eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting expense category:', error)
    return NextResponse.json(
      { error: 'Error al eliminar categoría' },
      { status: 500 }
    )
  }
}

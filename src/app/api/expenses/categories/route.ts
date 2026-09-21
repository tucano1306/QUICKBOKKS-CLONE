import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanCategoryName } from '@/lib/category-name'
import { findCategoryByName } from '@/lib/expense-category'

// Revalidar cada 2 minutos - las categorías cambian poco frecuentemente
export const revalidate = 120

// GET expense categories - filtradas por companyId
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Filtrar categorías por companyId si se proporciona
    const categories = await prisma.expenseCategory.findMany({
      where: companyId ? { companyId } : undefined,
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
    const { name, description, type, taxRate, parentId, companyId } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nombre y tipo son requeridos' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Se requiere seleccionar una empresa' },
        { status: 400 }
      )
    }

    // Causa raiz de las categorias duplicadas en los reportes: aqui se creaba
    // con el `name` tal cual, sin comprobar si ya existia. Como
    // `ExpenseCategory.name` no tiene `@unique`, dar de alta "compras internet"
    // teniendo ya "Compras internet" creaba una segunda fila, y el gasto
    // quedaba partido entre las dos.
    const cleanName = cleanCategoryName(name)

    if (!cleanName) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacío', message: 'El nombre no puede estar vacío' },
        { status: 400 }
      )
    }

    const existing = await findCategoryByName(companyId, cleanName)

    if (existing) {
      const msg = `Ya existe la categoría «${existing.name}». Usa esa en lugar de crear una variante, o renómbrala si quieres cambiar cómo se escribe.`
      return NextResponse.json({ error: msg, message: msg, existing }, { status: 409 })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: cleanName,
        description,
        type,
        taxRate: taxRate || 16,
        parentId,
        companyId,
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

    // Renombrar tambien puede crear un duplicado: pasar "Compras internet" a
    // "compras internet" cuando ya existe la otra variante deja las dos filas.
    const cleanName = cleanCategoryName(name)

    if (!cleanName) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacío', message: 'El nombre no puede estar vacío' },
        { status: 400 }
      )
    }

    const current = await prisma.expenseCategory.findUnique({ where: { id } })

    if (!current) {
      return NextResponse.json(
        { error: 'Categoría no encontrada', message: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    const clash = await findCategoryByName(current.companyId, cleanName)

    // Cambiar solo mayusculas o acentos de la propia categoria si vale: el
    // choque solo es real si la coincidencia es con OTRA fila.
    if (clash && clash.id !== id) {
      const msg = `Ya existe la categoría «${clash.name}». Renombrar esta así dejaría las dos separadas en los reportes.`
      return NextResponse.json({ error: msg, message: msg, existing: clash }, { status: 409 })
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name: cleanName,
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

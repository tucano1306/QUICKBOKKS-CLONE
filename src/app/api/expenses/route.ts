import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateExpenseRequest, validatePagination } from '@/lib/validation-middleware'
import { deleteExpenseWithReversal } from '@/lib/accounting-service'
import { crearAsientoDeGasto } from '@/lib/expense-journal'

export const dynamic = 'force-dynamic'

/**
 * Normalizar método de pago al enum válido de Prisma
 */
function normalizePaymentMethod(method: string | null | undefined): 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'OTHER' {
  const map: Record<string, 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'OTHER'> = {
    CASH: 'CASH',
    TRANSFER: 'TRANSFER',
    CARD: 'CARD',
    CHECK: 'CHECK',
    OTHER: 'OTHER',
    CREDIT_CARD: 'CARD',
    DEBIT_CARD: 'CARD',
    MULTIPLE: 'OTHER',
  }
  return map[(method ?? '').toUpperCase()] ?? 'OTHER'
}

/**
 * Parsear fecha correctamente desde diferentes formatos
 * YYYY-MM-DD (input type="date") o MM/DD/YYYY (formato americano)
 */
function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // Si viene en formato YYYY-MM-DD (de input type="date")
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas de timezone
  } 
  // Si viene en formato MM/DD/YYYY (formato americano)
  else if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  // Fallback
  return new Date(dateStr);
}

// GET all expenses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const companyIdParam = searchParams.get('companyId')
    
    // Validate pagination
    const { page, limit, error: paginationError } = validatePagination(request)
    if (paginationError) return paginationError

    const skip = (page - 1) * limit

    // Construir filtro base - SIEMPRE filtrar por companyId si está disponible
    // para evitar cruce de datos entre empresas
    let companyId = companyIdParam
    if (!companyId) {
      // Buscar la compañía del usuario actual
      const userCompany = await prisma.companyUser.findFirst({
        where: { userId: session.user.id },
        select: { companyId: true }
      })
      companyId = userCompany?.companyId || null
    }

    // Si se proporciona companyId, verificar que el usuario tenga acceso
    if (companyId) {
      const hasAccess = await prisma.companyUser.findFirst({
        where: {
          userId: session.user.id,
          companyId: companyId
        }
      })
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
      }
    }

    // Construir where clause con aislamiento de datos por empresa
    // Si hay companyId, filtrar por empresa (NO por userId individual)
    // para que muestre TODOS los gastos de la empresa
    const whereClause = {
      ...(companyId ? { companyId } : { userId: session.user.id }), // CRÍTICO: filtrar por empresa o por usuario
      ...(status && { status: status as any }),
      ...(categoryId && { categoryId }),
    }
    
    console.log('🔍 Expenses API - whereClause:', JSON.stringify(whereClause))
    console.log('🔍 Expenses API - limit:', limit, 'skip:', skip)

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: {
          category: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({
        where: whereClause,
      }),
    ])

    console.log('✅ Expenses API - Resultados:', expenses.length, 'de', total, 'total')

    return NextResponse.json({
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Error al obtener gastos' },
      { status: 500 }
    )
  }
}

// POST new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validate request data
    const { data: body, error: validationError } = await validateExpenseRequest(request)
    if (validationError) return validationError

    const {
      categoryId,
      amount,
      date,
      description,
      vendor,
      paymentMethod,
      reference,
      taxDeductible,
      taxAmount,
      notes,
      attachments,
      companyId: requestCompanyId, // Acepta companyId explícito del frontend
    } = body

    // Usar companyId del request o buscar del usuario
    let companyId = requestCompanyId
    if (!companyId) {
      const userCompany = await prisma.companyUser.findFirst({
        where: { userId: session.user.id },
        select: { companyId: true }
      })
      companyId = userCompany?.companyId || null
    }

    // ATÓMICO: Crear gasto Y journal entry en la misma transacción de BD
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el gasto
      const expense = await tx.expense.create({
        data: {
          userId: session.user.id,
          companyId: companyId || null,
          categoryId,
          amount: Number.parseFloat(amount),
          date: parseDate(date),
          description,
          vendor,
          paymentMethod: normalizePaymentMethod(paymentMethod),
          reference,
          taxDeductible: taxDeductible !== false,
          taxAmount: taxAmount ? Number.parseFloat(taxAmount) : 0,
          notes,
          attachments: attachments || [],
          status: 'PENDING',
        },
        include: {
          category: true,
        },
      });

      // 2. Si hay companyId, crear Journal Entry (opcional, no bloqueante)
      if (companyId) {
        try {
          const entryNumber = await crearAsientoDeGasto(tx, {
            expenseId: expense.id,
            companyId,
            userId: session.user.id,
            amount: Number.parseFloat(amount),
            date: parseDate(date),
            description,
            categoryName: expense.category?.name,
          });
          if (entryNumber) console.log(`✅ Gasto ${expense.id} creado con JE ${entryNumber}`);
        } catch (jeError) {
          console.error('⚠️ Error creando journal entry, pero gasto fue creado:', jeError);
          // No lanzar error, el gasto ya fue creado exitosamente
        }
      }

      return expense;
    });

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Error al crear gasto' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar gastos (individual o múltiple) CON REVERSIÓN DE ASIENTOS
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si viene un ID por query param (eliminación individual)
    const { searchParams } = new URL(request.url)
    const singleId = searchParams.get('id')

    if (singleId) {
      // Eliminación individual con reversión de asiento contable
      const existing = await prisma.expense.findFirst({
        where: { id: singleId, userId: session.user.id }
      })

      if (!existing) {
        return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
      }

      await deleteExpenseWithReversal(singleId, session.user.id);

      return NextResponse.json({ 
        success: true, 
        message: 'Gasto eliminado y asiento contable revertido exitosamente'
      })
    }

    // Eliminación múltiple (batch) - requiere body con ids
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Se requiere un ID o un array de IDs' }, { status: 400 })
    }

    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs' }, { status: 400 })
    }

    // Verificar que los gastos pertenecen al usuario
    const expenses = await prisma.expense.findMany({
      where: { 
        id: { in: ids },
        userId: session.user.id
      }
    });

    // Eliminar cada gasto con reversión de asiento contable
    for (const expense of expenses) {
      await deleteExpenseWithReversal(expense.id, session.user.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${expenses.length} gasto(s) eliminado(s) y asientos revertidos exitosamente`,
      deletedCount: expenses.length
    })
  } catch (error) {
    console.error('Error deleting expenses:', error)
    return NextResponse.json({ error: 'Error al eliminar gastos' }, { status: 500 })
  }
}

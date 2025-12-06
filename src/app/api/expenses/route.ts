import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateExpenseRequest, validatePagination } from '@/lib/validation-middleware'
import { deleteExpenseWithReversal } from '@/lib/accounting-service'

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
    
    // Validate pagination
    const { page, limit, error: paginationError } = validatePagination(request)
    if (paginationError) return paginationError

    const skip = (page - 1) * limit

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          ...(status && { status: status as any }),
          ...(categoryId && { categoryId }),
        },
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({
        where: {
          userId: session.user.id,
          ...(status && { status: status as any }),
          ...(categoryId && { categoryId }),
        },
      }),
    ])

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
    } = body

    // Buscar companyId del usuario
    const userCompany = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    });

    // ATÓMICO: Crear gasto Y journal entry en la misma transacción de BD
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el gasto
      const expense = await tx.expense.create({
        data: {
          userId: session.user.id,
          companyId: userCompany?.companyId || null,
          categoryId,
          amount: parseFloat(amount),
          date: parseDate(date),
          description,
          vendor,
          paymentMethod: paymentMethod || 'CASH',
          reference,
          taxDeductible: taxDeductible !== false,
          taxAmount: taxAmount ? parseFloat(taxAmount) : 0,
          notes,
          attachments: attachments || [],
          status: 'PENDING',
        },
        include: {
          category: true,
        },
      });

      // 2. Si hay companyId, crear Journal Entry
      if (userCompany?.companyId) {
        const companyId = userCompany.companyId;
        const expDate = parseDate(date);
        const categoryName = expense.category?.name || 'General';
        const expAmount = parseFloat(amount);

        // Buscar cuenta de caja
        const cashAccount = await tx.chartOfAccounts.findFirst({
          where: { 
            code: '1000',
            OR: [{ companyId }, { companyId: null }]
          }
        });

        if (!cashAccount) {
          throw new Error('Cuenta de Caja (1000) no encontrada');
        }

        // Mapear categoría a cuenta de gasto
        const categoryLower = categoryName.toLowerCase();
        let expenseAccountCode = '5900'; // Otros Gastos por defecto
        
        if (categoryLower.includes('salario') || categoryLower.includes('chofer') || categoryLower.includes('sueldo')) {
          expenseAccountCode = '5100';
        } else if (categoryLower.includes('alquiler') || categoryLower.includes('rent')) {
          expenseAccountCode = '5200';
        } else if (categoryLower.includes('servicio') || categoryLower.includes('luz') || categoryLower.includes('agua')) {
          expenseAccountCode = '5300';
        }

        const expenseAccount = await tx.chartOfAccounts.findFirst({
          where: { 
            code: expenseAccountCode,
            OR: [{ companyId }, { companyId: null }]
          }
        });

        if (!expenseAccount) {
          throw new Error(`Cuenta de gastos (${expenseAccountCode}) no encontrada`);
        }

        // Generar número de asiento
        const jeCount = await tx.journalEntry.count({ where: { companyId } });
        const year = new Date().getFullYear();
        const entryNumber = `JE-${year}-${String(jeCount + 1).padStart(6, '0')}`;

        // Crear Journal Entry
        await tx.journalEntry.create({
          data: {
            entryNumber,
            date: expDate,
            description: `Gasto: ${description || categoryName}`,
            reference: expense.id,
            companyId,
            createdBy: session.user.id,
            status: 'POSTED',
            lines: {
              create: [
                { accountId: expenseAccount.id, debit: expAmount, credit: 0, description: description || categoryName, lineNumber: 1 },
                { accountId: cashAccount.id, debit: 0, credit: expAmount, description: 'Pago de gasto', lineNumber: 2 }
              ]
            }
          }
        });

        console.log(`✅ Gasto ${expense.id} creado con JE ${entryNumber}`);
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

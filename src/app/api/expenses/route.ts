import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateExpenseRequest, validatePagination, createErrorResponse } from '@/lib/validation-middleware'
import { validateExpense } from '@/lib/validation'

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

    // Additional validation
    const validation = validateExpense({
      userId: session.user.id,
      categoryId,
      amount,
      date: date || new Date(),
      description,
      paymentMethod,
    })

    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
    }

    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        categoryId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
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
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Error al crear gasto' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createExpenseWithJE } from '@/lib/accounting-service'

// GET all receipts (expenses with attachments)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Get expenses that have attachments (receipts)
    const where: any = {
      attachments: {
        isEmpty: false
      }
    }

    if (companyId) {
      where.companyId = companyId
    }

    if (status) {
      where.status = status
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ])

    // Transform to receipt format
    const receipts = expenses.flatMap(expense => 
      expense.attachments.map((attachment, index) => ({
        id: `${expense.id}-${index}`,
        expenseId: expense.id,
        filename: attachment.split('/').pop() || attachment,
        url: attachment,
        uploadDate: expense.createdAt.toISOString(),
        processedDate: expense.status === 'APPROVED' ? expense.updatedAt.toISOString() : null,
        status: expense.status === 'APPROVED' ? 'processed' : 
                expense.status === 'REJECTED' ? 'error' : 'pending',
        amount: expense.amount,
        vendor: expense.vendor,
        category: expense.category?.name || null,
        description: expense.description
      }))
    )

    // Calculate stats
    const stats = {
      total: receipts.length,
      pending: receipts.filter(r => r.status === 'pending').length,
      processed: receipts.filter(r => r.status === 'processed').length,
      errors: receipts.filter(r => r.status === 'error').length,
      totalAmount: receipts.reduce((sum, r) => sum + (r.amount || 0), 0)
    }

    return NextResponse.json({
      receipts,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: 'Error al obtener recibos' },
      { status: 500 }
    )
  }
}

// POST - Create expense from receipt upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string
    const vendor = formData.get('vendor') as string
    const amount = parseFloat(formData.get('amount') as string || '0')
    const categoryId = formData.get('categoryId') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // In production, upload to cloud storage (S3, etc.)
    // For now, we'll store the filename as a placeholder
    const filename = `receipts/${Date.now()}-${file.name}`
    
    // Get or create default category
    let category = null
    if (categoryId) {
      category = await prisma.expenseCategory.findUnique({
        where: { id: categoryId }
      })
    }
    
    if (!category) {
      category = await prisma.expenseCategory.findFirst({
        where: { name: 'Otros' }
      })
    }

    if (!category) {
      category = await prisma.expenseCategory.create({
        data: {
          name: 'Otros',
          description: 'Gastos varios',
          type: 'OTHER'
        }
      })
    }

    // Create expense with JE atomically
    const { expense } = await createExpenseWithJE({
      companyId,
      userId: session.user.id,
      categoryId: category.id,
      categoryName: category.name,
      amount: amount || 0,
      description: description || `Recibo: ${file.name}`,
      vendor: vendor || 'Sin especificar',
      paymentMethod: 'CASH',
      attachments: [filename]
    })

    return NextResponse.json({
      receipt: {
        id: `${expense.id}-0`,
        expenseId: expense.id,
        filename: file.name,
        url: filename,
        uploadDate: expense.createdAt.toISOString(),
        processedDate: null,
        status: 'pending',
        amount: expense.amount,
        vendor: expense.vendor
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading receipt:', error)
    return NextResponse.json(
      { error: 'Error al subir recibo' },
      { status: 500 }
    )
  }
}

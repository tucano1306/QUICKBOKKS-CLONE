import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateInvoiceRequest, validatePagination, createErrorResponse } from '@/lib/validation-middleware'
import { validateInvoice } from '@/lib/validation'
import { createInvoiceJournalEntry } from '@/lib/accounting-service'

export const dynamic = 'force-dynamic'

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    
    // Validate pagination
    const { page, limit, error: paginationError } = validatePagination(request)
    if (paginationError) return paginationError

    const skip = (page - 1) * limit

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          userId: session.user.id,
          ...(status && { status: status as any }),
          ...(customerId && { customerId }),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({
        where: {
          userId: session.user.id,
          ...(status && { status: status as any }),
          ...(customerId && { customerId }),
        },
      }),
    ])

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Error al obtener facturas' },
      { status: 500 }
    )
  }
}

// POST new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validate request data
    const { data: body, error: validationError } = await validateInvoiceRequest(request)
    if (validationError) return validationError

    const {
      customerId,
      issueDate,
      dueDate,
      items,
      notes,
      terms,
      discount,
    } = body

    // Additional validation for invoice data
    const validation = validateInvoice({
      customerId,
      userId: session.user.id,
      issueDate,
      dueDate,
      items,
      subtotal: 0, // Will be calculated
      taxAmount: 0, // Will be calculated
      total: 0, // Will be calculated
      discount,
    })

    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
    }

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0

    items.forEach((item: any) => {
      const itemTotal = item.quantity * item.unitPrice
      subtotal += itemTotal
      taxAmount += itemTotal * item.taxRate
    })

    const discountAmount = discount || 0
    const total = subtotal + taxAmount - discountAmount

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    const invoiceNumber = lastInvoice
      ? `INV-${parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1}`
      : 'INV-1'

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        userId: session.user.id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxAmount,
        discount: discountAmount,
        total,
        status: 'DRAFT',
        notes,
        terms,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            taxRate: parseFloat(item.taxRate),
            taxAmount: (item.quantity * item.unitPrice * item.taxRate) / 100,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // IMPORTANTE: Solo crear asiento contable si la factura NO es DRAFT
    // Las facturas DRAFT no deben reconocer ingresos (GAAP)
    // El asiento se crea cuando la factura se ENVÍA o cuando el status es diferente de DRAFT
    const userCompany = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    });
    
    // Solo crear asiento si status != DRAFT (por defecto es DRAFT, así que normalmente no se crea aquí)
    if (userCompany?.companyId && invoice.status !== 'DRAFT') {
      const customerName = invoice.customer?.name || 'Cliente';
      await createInvoiceJournalEntry(
        userCompany.companyId,
        total,
        invoiceNumber,
        customerName,
        new Date(issueDate),
        session.user.id
      );
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Error al crear factura' },
      { status: 500 }
    )
  }
}

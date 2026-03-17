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
    const companyIdParam = searchParams.get('companyId')
    
    // Validate pagination
    const { page, limit, error: paginationError } = validatePagination(request)
    if (paginationError) return paginationError

    const skip = (page - 1) * limit

    // Obtener companyId del usuario si no se proporciona
    let companyId = companyIdParam
    if (!companyId) {
      const userCompany = await prisma.companyUser.findFirst({
        where: { userId: session.user.id },
        select: { companyId: true }
      })
      companyId = userCompany?.companyId || null
    }

    // Verificar que el usuario tenga acceso a esta empresa
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...(companyId ? { companyId } : { userId: session.user.id }),
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
          ...(companyId ? { companyId } : { userId: session.user.id }),
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
      companyId: bodyCompanyId,
      status: bodyStatus,
      invoiceNumber: bodyInvoiceNumber,
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

    // Generate invoice number (scoped to company if available)
    const lastInvoice = await prisma.invoice.findFirst({
      where: bodyCompanyId ? { companyId: bodyCompanyId } : { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    const invoiceNumber = bodyInvoiceNumber || (lastInvoice
      ? `INV-${parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '') || '0') + 1}`
      : 'INV-1')

    // Resolve companyId
    const finalCompanyId = bodyCompanyId || (await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    }))?.companyId || null

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        userId: session.user.id,
        ...(finalCompanyId ? { companyId: finalCompanyId } : {}),
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxAmount,
        discount: discountAmount,
        total,
        status: (bodyStatus as any) || 'DRAFT',
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
    if (finalCompanyId && invoice.status !== 'DRAFT') {
      const customerName = invoice.customer?.name || 'Cliente';
      await createInvoiceJournalEntry(
        finalCompanyId,
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

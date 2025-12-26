import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentReceivedJournalEntry, createInvoiceJournalEntry } from '@/lib/accounting-service'

export const dynamic = 'force-dynamic'

// GET all payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}

    if (companyId) {
      where.companyId = companyId
    }

    if (method) {
      where.paymentMethod = method
    }

    if (dateFrom || dateTo) {
      where.paymentDate = {}
      if (dateFrom) {
        where.paymentDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.paymentDate.lte = new Date(dateTo)
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: {
          paymentDate: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ])

    // Transform to match frontend expectations
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      customerName: payment.invoice.customer.name,
      amount: payment.amount,
      paymentDate: payment.paymentDate.toISOString(),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || '',
      status: 'COMPLETED', // Payments are completed by nature
      notes: payment.notes
    }))

    // Calculate stats
    const stats = {
      totalReceived: payments.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: payments.length,
      averagePayment: payments.length > 0 
        ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length 
        : 0,
      byMethod: payments.reduce((acc: any, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount
        return acc
      }, {})
    }

    return NextResponse.json({
      payments: transformedPayments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Error al obtener pagos' },
      { status: 500 }
    )
  }
}

// POST new payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, amount, paymentMethod, reference, notes, companyId } = body

    if (!invoiceId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Factura, monto y método de pago son requeridos' },
        { status: 400 }
      )
    }

    // Verify invoice exists and get current balance
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remainingBalance = invoice.total - totalPaid

    if (amount > remainingBalance) {
      return NextResponse.json(
        { error: `El pago excede el saldo pendiente de $${remainingBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        paymentMethod,
        reference,
        notes,
        companyId,
        paymentDate: new Date()
      },
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Update invoice status if fully paid
    const newTotalPaid = totalPaid + amount
    if (newTotalPaid >= invoice.total) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: 'PAID',
          paidDate: new Date()
        }
      })
    } else if (invoice.status === 'SENT' || invoice.status === 'OVERDUE' || invoice.status === 'VIEWED') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PARTIAL' }
      })
    }

    // CREAR ASIENTO CONTABLE PARA EL COBRO (Partida Doble)
    // Débito: Banco (activo aumenta)
    // Crédito: Cuentas por Cobrar (activo disminuye)
    if (companyId) {
      const customerName = payment.invoice.customer?.name || 'Cliente';
      await createPaymentReceivedJournalEntry(
        companyId,
        amount,
        invoice.invoiceNumber,
        customerName,
        new Date(),
        session.user.id
      );
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoice.invoiceNumber,
        customerName: payment.invoice.customer.name,
        amount: payment.amount,
        paymentDate: payment.paymentDate.toISOString(),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        status: 'COMPLETED'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Error al crear pago' },
      { status: 500 }
    )
  }
}

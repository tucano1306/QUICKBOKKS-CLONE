import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Get invoices that are marked as recurring (using notes or metadata)
    // In a full implementation, we'd have a separate RecurringInvoice model
    const invoices = await prisma.invoice.findMany({
      where: { 
        companyId,
        OR: [
          { notes: { contains: 'RECURRING:' } },
          { notes: { contains: 'PLANTILLA:' } }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse recurring invoice data from notes metadata
    const recurringInvoices = invoices.map((inv, index) => {
      // Parse metadata from notes (format: "RECURRING:frequency|autoSend|startDate")
      const noteParts = inv.notes?.split('RECURRING:') || []
      const metadata = noteParts[1]?.split('|') || []
      const templateName = noteParts[0]?.trim() || `Factura recurrente ${index + 1}`
      
      return {
        id: `REC-${String(index + 1).padStart(3, '0')}`,
        templateName,
        customer: inv.customer?.name || 'Sin cliente',
        customerId: inv.customerId,
        amount: inv.total,
        frequency: metadata[0] || 'monthly',
        startDate: inv.createdAt.toISOString().split('T')[0],
        nextInvoice: inv.dueDate?.toISOString().split('T')[0] || '',
        status: inv.status === 'PAID' ? 'completed' : 'active',
        totalGenerated: 1,
        lastGenerated: inv.createdAt.toISOString().split('T')[0],
        autoSend: metadata[1] === 'true'
      }
    })

    // If no recurring invoices found, return sample structure
    if (recurringInvoices.length === 0) {
      // Return empty array - the UI will show empty state
      return NextResponse.json([])
    }

    return NextResponse.json(recurringInvoices)
  } catch (error) {
    console.error('Error fetching recurring invoices:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, customerId, templateName, amount, frequency, startDate, autoSend } = body

    if (!companyId || !customerId || !amount) {
      return NextResponse.json(
        { error: 'companyId, customerId y amount son requeridos' },
        { status: 400 }
      )
    }

    // Create an invoice marked as recurring template
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        customerId,
        invoiceNumber: `RECT-${Date.now()}`,
        subtotal: amount,
        taxAmount: amount * 0.16, // 16% IVA
        total: amount * 1.16,
        status: 'DRAFT',
        issueDate: new Date(startDate),
        dueDate: new Date(startDate),
        notes: `${templateName} RECURRING:${frequency}|${autoSend}|${startDate}`,
        userId: session.user?.id || ''
      }
    })

    return NextResponse.json({
      id: invoice.id,
      templateName,
      amount,
      frequency,
      startDate,
      status: 'active',
      autoSend
    })
  } catch (error) {
    console.error('Error creating recurring invoice:', error)
    return NextResponse.json({ error: 'Error al crear factura recurrente' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, autoSend } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Update invoice status to simulate pause/resume/complete
    const invoiceStatus = status === 'completed' ? 'PAID' : 
                         status === 'paused' ? 'OVERDUE' : 'SENT'

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: invoiceStatus }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating recurring invoice:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    await prisma.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring invoice:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

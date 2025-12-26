
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Use invoices with specific status for estimates (DRAFT or notes containing ESTIMATE)
    const whereClause: Record<string, unknown> = { 
      companyId,
      OR: [
        { status: 'DRAFT' },
        { notes: { contains: 'ESTIMATE' } }
      ]
    }
    
    if (status && status !== 'all') {
      const statusMap: Record<string, string> = {
        'draft': 'DRAFT',
        'sent': 'SENT',
        'accepted': 'PAID',
        'declined': 'CANCELLED',
        'expired': 'OVERDUE'
      }
      whereClause.status = statusMap[status] || status.toUpperCase()
      delete whereClause.OR
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Transform invoices to estimates format
    const estimates = invoices.map(inv => ({
      id: inv.id,
      estimateNumber: `COT-${inv.invoiceNumber.replace('INV-', '')}`,
      customer: inv.customer?.name || 'Unknown',
      date: inv.issueDate.toISOString().split('T')[0],
      expiryDate: inv.dueDate.toISOString().split('T')[0],
      items: inv.items.length,
      subtotal: inv.subtotal,
      tax: inv.taxAmount,
      total: inv.total,
      status: mapStatus(inv.status),
      notes: inv.notes || ''
    }))

    // Calculate summary stats
    const summary = {
      total: estimates.length,
      draft: estimates.filter(e => e.status === 'draft').length,
      sent: estimates.filter(e => e.status === 'sent').length,
      accepted: estimates.filter(e => e.status === 'accepted').length,
      declined: estimates.filter(e => e.status === 'declined').length,
      expired: estimates.filter(e => e.status === 'expired').length,
      totalValue: estimates.reduce((sum, e) => sum + e.total, 0),
      acceptedValue: estimates.filter(e => e.status === 'accepted').reduce((sum, e) => sum + e.total, 0)
    }

    return NextResponse.json({ estimates, summary })

  } catch (error) {
    console.error('Error fetching estimates:', error)
    return NextResponse.json({ error: 'Error fetching estimates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, items, notes, expiryDate, companyId } = body

    if (!customerId || !companyId) {
      return NextResponse.json({ error: 'Customer ID and Company ID required' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items?.reduce((sum: number, item: { quantity: number; unitPrice: number }) => 
      sum + (item.quantity * item.unitPrice), 0) || 0
    const taxAmount = subtotal * 0.16
    const total = subtotal + taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        customerId,
        invoiceNumber: `EST-${Date.now()}`,
        subtotal,
        taxAmount,
        total,
        status: 'DRAFT',
        issueDate: new Date(),
        dueDate: new Date(expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `ESTIMATE:${notes || ''}`,
        userId: session.user?.id || '',
        items: items ? {
          create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        } : undefined
      },
      include: {
        customer: true,
        items: true
      }
    })

    return NextResponse.json({ estimate: invoice }, { status: 201 })

  } catch (error) {
    console.error('Error creating estimate:', error)
    return NextResponse.json({ error: 'Error creating estimate' }, { status: 500 })
  }
}

function mapStatus(status: string): 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' {
  switch (status) {
    case 'DRAFT': return 'draft'
    case 'SENT': return 'sent'
    case 'PAID': return 'accepted'
    case 'CANCELLED': return 'declined'
    case 'OVERDUE': return 'expired'
    default: return 'draft'
  }
}


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

    // Get invoices that have payment URLs (simulated via notes containing PAYMENT_LINK)
    const whereClause: Record<string, unknown> = { 
      companyId,
      notes: { contains: 'PAYMENT_LINK' }
    }
    
    if (status && status !== 'all') {
      const statusMap: Record<string, string> = {
        'active': 'SENT',
        'paid': 'PAID',
        'expired': 'OVERDUE',
        'cancelled': 'CANCELLED'
      }
      whereClause.status = statusMap[status] || status.toUpperCase()
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Transform invoices to payment links format
    const paymentLinks = invoices.map(inv => {
      // Parse payment link metadata from notes
      const notesParts = inv.notes?.split('|') || []
      const gateway = notesParts[1] || 'stripe'
      const clicks = parseInt(notesParts[2] || '0')
      
      const isExpired = new Date(inv.dueDate) < new Date()
      const isPaid = inv.status === 'PAID'
      
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || 'Unknown',
        customerEmail: inv.customer?.email || '',
        amount: inv.total,
        issueDate: inv.issueDate.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        status: isPaid ? 'paid' : (isExpired ? 'expired' : (inv.status === 'CANCELLED' ? 'cancelled' : 'active')),
        paymentLinkId: `pl_${inv.id.slice(0, 12)}`,
        paymentLinkUrl: `https://pay.example.com/pl_${inv.id.slice(0, 12)}`,
        linkExpiry: inv.dueDate.toISOString().split('T')[0],
        linkActive: !isPaid && !isExpired && inv.status !== 'CANCELLED',
        paymentGateway: gateway as 'stripe' | 'paypal' | 'mercadopago',
        linkClicks: clicks,
        lastClickedAt: clicks > 0 ? inv.updatedAt.toISOString() : undefined,
        paidDate: isPaid ? inv.updatedAt.toISOString().split('T')[0] : undefined
      }
    })

    // Summary stats
    const summary = {
      total: paymentLinks.length,
      active: paymentLinks.filter(p => p.status === 'active').length,
      paid: paymentLinks.filter(p => p.status === 'paid').length,
      expired: paymentLinks.filter(p => p.status === 'expired').length,
      cancelled: paymentLinks.filter(p => p.status === 'cancelled').length,
      totalAmount: paymentLinks.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: paymentLinks.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
    }

    return NextResponse.json({ paymentLinks, summary })

  } catch (error) {
    console.error('Error fetching payment links:', error)
    return NextResponse.json({ error: 'Error fetching payment links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, gateway, companyId } = body

    if (!invoiceId || !companyId) {
      return NextResponse.json({ error: 'Invoice ID and Company ID required' }, { status: 400 })
    }

    // Update invoice to mark it as having a payment link
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        notes: `PAYMENT_LINK|${gateway || 'stripe'}|0`,
        status: 'SENT'
      },
      include: {
        customer: true
      }
    })

    const paymentLink = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || 'Unknown',
      paymentLinkId: `pl_${invoice.id.slice(0, 12)}`,
      paymentLinkUrl: `https://pay.example.com/pl_${invoice.id.slice(0, 12)}`,
      status: 'active'
    }

    return NextResponse.json({ paymentLink }, { status: 201 })

  } catch (error) {
    console.error('Error creating payment link:', error)
    return NextResponse.json({ error: 'Error creating payment link' }, { status: 500 })
  }
}

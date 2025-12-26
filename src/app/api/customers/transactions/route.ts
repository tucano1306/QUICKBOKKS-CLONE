
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
    const customerId = searchParams.get('customerId')
    const type = searchParams.get('type')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { companyId }
    if (customerId) {
      whereClause.customerId = customerId
    }

    // Get invoices as transactions
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Get payments
    const payments = await prisma.payment.findMany({
      where: { companyId },
      include: {
        invoice: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' },
      take: 100
    })

    // Transform to unified transaction format
    const transactions = [
      ...invoices.map(inv => ({
        id: inv.id,
        type: 'invoice' as const,
        date: inv.issueDate.toISOString().split('T')[0],
        customer: inv.customer?.name || 'Unknown',
        customerId: inv.customerId,
        reference: inv.invoiceNumber,
        description: `Factura ${inv.invoiceNumber}`,
        amount: inv.total,
        balance: inv.total - inv.payments.reduce((sum, p) => sum + p.amount, 0),
        status: inv.status
      })),
      ...payments.map(pay => ({
        id: pay.id,
        type: 'payment' as const,
        date: pay.paymentDate.toISOString().split('T')[0],
        customer: pay.invoice?.customer?.name || 'Unknown',
        customerId: pay.invoice?.customerId,
        reference: pay.reference || `PAY-${pay.id.slice(0, 8)}`,
        description: `Pago por ${pay.paymentMethod}`,
        amount: pay.amount,
        balance: 0,
        status: 'COMPLETED'
      }))
    ]

    // Filter by type if specified
    const filteredTransactions = type && type !== 'all'
      ? transactions.filter(t => t.type === type)
      : transactions

    // Sort by date descending
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Summary
    const summary = {
      totalTransactions: filteredTransactions.length,
      totalInvoices: transactions.filter(t => t.type === 'invoice').length,
      totalPayments: transactions.filter(t => t.type === 'payment').length,
      totalInvoiced: transactions.filter(t => t.type === 'invoice').reduce((s, t) => s + t.amount, 0),
      totalReceived: transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0),
      outstandingBalance: transactions.filter(t => t.type === 'invoice').reduce((s, t) => s + t.balance, 0)
    }

    return NextResponse.json({ 
      transactions: filteredTransactions,
      summary
    })

  } catch (error) {
    console.error('Error fetching customer transactions:', error)
    return NextResponse.json({ error: 'Error fetching transactions' }, { status: 500 })
  }
}

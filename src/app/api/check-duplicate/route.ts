import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/check-duplicate
 * Verifica si ya existe un registro similar antes de guardarlo.
 * Evita entradas duplicadas de gastos y pagos.
 *
 * Body:
 *   type: 'expense' | 'payment'
 *   companyId: string
 *   amount: number
 *   date: string (YYYY-MM-DD)
 *   vendor?: string          (para gastos)
 *   reference?: string       (para gastos o pagos)
 *   invoiceId?: string       (para pagos)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, companyId, amount, date, vendor, reference, invoiceId } = body

    if (!type || !companyId || !amount || !date) {
      return NextResponse.json({ duplicates: [] })
    }

    // Verificar acceso a la empresa
    const hasAccess = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId }
    })
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const parsedAmount = Number(amount)
    const targetDate = new Date(date)
    // Ventana de ±3 días para detectar duplicados de fecha
    const dateFrom = new Date(targetDate)
    dateFrom.setDate(dateFrom.getDate() - 3)
    const dateTo = new Date(targetDate)
    dateTo.setDate(dateTo.getDate() + 3)

    // Tolerancia de monto: ±1%
    const amountMin = parsedAmount * 0.99
    const amountMax = parsedAmount * 1.01

    if (type === 'expense') {
      const conditions: any[] = [
        // Coincidencia por monto + fecha + proveedor
        {
          companyId,
          amount: { gte: amountMin, lte: amountMax },
          date: { gte: dateFrom, lte: dateTo },
          ...(vendor?.trim() ? { vendor: { contains: vendor.trim(), mode: 'insensitive' } } : {})
        }
      ]

      // Coincidencia exacta por referencia (si se proporcionó)
      if (reference?.trim()) {
        conditions.push({
          companyId,
          reference: { equals: reference.trim(), mode: 'insensitive' }
        })
      }

      const duplicates = await prisma.expense.findMany({
        where: { OR: conditions },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          vendor: true,
          reference: true,
          status: true,
          category: { select: { name: true } }
        },
        orderBy: { date: 'desc' },
        take: 5
      })

      return NextResponse.json({
        duplicates: duplicates.map(d => ({
          id: d.id,
          label: d.description,
          amount: d.amount,
          date: d.date.toISOString().split('T')[0],
          vendor: d.vendor ?? '',
          reference: d.reference ?? '',
          category: d.category?.name ?? '',
          status: d.status,
          url: `/company/expenses/${d.id}`
        }))
      })
    }

    if (type === 'payment') {
      const conditions: any[] = [
        // Coincidencia por monto + fecha + factura
        {
          companyId,
          amount: { gte: amountMin, lte: amountMax },
          paymentDate: { gte: dateFrom, lte: dateTo },
          ...(invoiceId ? { invoiceId } : {})
        }
      ]

      // Coincidencia exacta por referencia
      if (reference?.trim()) {
        conditions.push({
          companyId,
          reference: { equals: reference.trim(), mode: 'insensitive' }
        })
      }

      const duplicates = await prisma.payment.findMany({
        where: { OR: conditions },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          reference: true,
          paymentMethod: true,
          invoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { name: true } }
            }
          }
        },
        orderBy: { paymentDate: 'desc' },
        take: 5
      })

      return NextResponse.json({
        duplicates: duplicates.map(d => ({
          id: d.id,
          label: `Factura ${d.invoice?.invoiceNumber ?? ''} — ${d.invoice?.customer?.name ?? ''}`,
          amount: d.amount,
          date: d.paymentDate.toISOString().split('T')[0],
          reference: d.reference ?? '',
          paymentMethod: d.paymentMethod,
          url: `/company/invoicing/payments`
        }))
      })
    }

    return NextResponse.json({ duplicates: [] })
  } catch (error) {
    console.error('Error en check-duplicate:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

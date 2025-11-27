import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PayableStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  validatePagination,
  validateVendorPayableRequest,
} from '@/lib/validation-middleware'
import {
  calculateRemainingBalance,
  recalculateVendorFinancials,
  resolvePayableStatus,
} from '@/lib/vendor-service'

const DEFAULT_COMPANY_ID = 'default-company-001'

function normalizeStatus(status?: string | null): PayableStatus | undefined {
  if (!status) return undefined
  const normalized = status.toUpperCase()
  if (['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'].includes(normalized)) {
    return normalized as PayableStatus
  }
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { page, limit, error } = validatePagination(request)
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId') || DEFAULT_COMPANY_ID
    const vendorId = searchParams.get('vendorId')
    const status = normalizeStatus(searchParams.get('status'))
    const term = searchParams.get('q') || searchParams.get('search')
    const dueBefore = searchParams.get('dueBefore')
    const dueAfter = searchParams.get('dueAfter')

    const where: Record<string, any> = { companyId }

    if (vendorId) {
      where.vendorId = vendorId
    }

    if (status) {
      where.status = status
    }

    if (term) {
      where.OR = [
        { billNumber: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
      ]
    }

    if (dueBefore) {
      where.dueDate = { ...(where.dueDate || {}), lte: new Date(dueBefore) }
    }

    if (dueAfter) {
      where.dueDate = { ...(where.dueDate || {}), gte: new Date(dueAfter) }
    }

    const skip = (page - 1) * limit

    const [payables, total, metrics] = await Promise.all([
      prisma.vendorPayable.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        include: {
          vendor: {
            select: { id: true, name: true, vendorNumber: true, category: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.vendorPayable.count({ where }),
      prisma.vendorPayable.groupBy({
        by: ['status'],
        where: { companyId },
        _sum: { balance: true },
      }),
    ])

    const metricsMap = metrics.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._sum.balance || 0
      return acc
    }, {})

    return NextResponse.json({
      data: payables,
      metrics: {
        unpaid: metricsMap.UNPAID || 0,
        partial: metricsMap.PARTIAL || 0,
        overdue: metricsMap.OVERDUE || 0,
        paid: metricsMap.PAID || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payables:', error)
    return NextResponse.json(
      { error: 'Error al obtener cuentas por pagar' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: body, error } = await validateVendorPayableRequest(request)
    if (error) return error

    const companyId = body.companyId || DEFAULT_COMPANY_ID

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: body.vendorId,
        companyId,
      },
    })

    if (!vendor) {
      return createErrorResponse('Proveedor inválido', 400)
    }

    const subtotal = body.subtotal !== undefined ? Number(body.subtotal) : 0
    const taxAmount = body.taxAmount !== undefined ? Number(body.taxAmount) : 0
    const total = Number(body.total)
    const paidAmount = body.paidAmount !== undefined ? Number(body.paidAmount) : 0
    const dueDate = new Date(body.dueDate)
    const status = resolvePayableStatus(total, paidAmount, dueDate)
    const balance = calculateRemainingBalance(total, paidAmount)
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    const payable = await prisma.vendorPayable.create({
      data: {
        companyId,
        vendorId: vendor.id,
        billNumber: body.billNumber,
        description: body.description,
        category: body.category,
        terms: body.terms,
        reference: body.reference,
        issueDate: new Date(body.issueDate),
        dueDate,
        subtotal,
        taxAmount,
        total,
        paidAmount,
        balance,
        status,
        attachments,
        notes: body.notes,
      },
      include: {
        vendor: {
          select: { id: true, name: true, vendorNumber: true, category: true },
        },
      },
    })

    await recalculateVendorFinancials(vendor.id)

    return NextResponse.json(payable, { status: 201 })
  } catch (error) {
    console.error('Error creating payable:', error)
    return NextResponse.json(
      { error: 'Error al registrar la factura' },
      { status: 500 }
    )
  }
}

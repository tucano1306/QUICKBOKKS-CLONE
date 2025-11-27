import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { VendorStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  validatePagination,
  validateVendorRequest,
  createErrorResponse,
} from '@/lib/validation-middleware'
import { generateVendorNumber } from '@/lib/vendor-service'

const DEFAULT_COMPANY_ID = 'default-company-001'

function normalizeStatus(status?: string | null): VendorStatus | undefined {
  if (!status) {
    return undefined
  }
  const normalized = status.toUpperCase()
  if (['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(normalized)) {
    return normalized as VendorStatus
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
    const query = searchParams.get('q') || searchParams.get('search')
    const status = normalizeStatus(searchParams.get('status'))
    const category = searchParams.get('category')

    const where: Record<string, any> = { companyId }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { vendorNumber: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { contactName: { contains: query, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { payables: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ])

    return NextResponse.json({
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
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

    const { data: body, error } = await validateVendorRequest(request)
    if (error) return error

    const companyId = body.companyId || DEFAULT_COMPANY_ID
    let vendorNumber = body.vendorNumber?.trim()

    if (vendorNumber) {
      const existing = await prisma.vendor.findUnique({ where: { vendorNumber } })
      if (existing) {
        return createErrorResponse('El código de proveedor ya existe', 400)
      }
    } else {
      vendorNumber = await generateVendorNumber(companyId)
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyId,
        vendorNumber,
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country || 'México',
        taxId: body.taxId,
        paymentTerms: body.paymentTerms || 'Net 30',
        category: body.category,
        status: normalizeStatus(body.status) || 'ACTIVE',
        notes: body.notes,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    )
  }
}

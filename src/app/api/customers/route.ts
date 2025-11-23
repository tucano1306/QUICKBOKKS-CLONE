import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateCustomerRequest, validatePagination, createErrorResponse } from '@/lib/validation-middleware'
import { validateCustomer } from '@/lib/validation'

// GET all customers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Validate pagination
    const { page, limit, error: paginationError } = validatePagination(request)
    if (paginationError) return paginationError

    const skip = (page - 1) * limit

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: {
          ...(status && { status: status as any }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.customer.count({
        where: {
          ...(status && { status: status as any }),
        },
      }),
    ])

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}

// POST new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validate request data
    const { data: body, error: validationError } = await validateCustomerRequest(request)
    if (validationError) return validationError

    const {
      name,
      email,
      phone,
      company,
      taxId,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
    } = body

    // Additional validation
    const validation = validateCustomer({
      name,
      email,
      phone,
      taxId,
      country,
    })

    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        company,
        taxId,
        address,
        city,
        state,
        zipCode,
        country: country || 'México',
        notes,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    )
  }
}

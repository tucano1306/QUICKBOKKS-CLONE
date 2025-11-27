import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { VendorStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/validation'
import { createErrorResponse } from '@/lib/validation-middleware'

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get('companyId') || DEFAULT_COMPANY_ID

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        companyId,
      },
      include: {
        payables: true,
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      { error: 'Error al obtener proveedor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const companyId = request.nextUrl.searchParams.get('companyId') || DEFAULT_COMPANY_ID

    const existing = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    const merged = { ...existing, ...body }
    const validation = validateVendor(merged)
    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
    }

    const normalizedVendorNumber = body.vendorNumber?.trim()

    if (normalizedVendorNumber && normalizedVendorNumber !== existing.vendorNumber) {
      const duplicated = await prisma.vendor.findUnique({ where: { vendorNumber: normalizedVendorNumber } })
      if (duplicated) {
        return createErrorResponse('El código de proveedor ya existe', 400)
      }
    }

    const updated = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        companyId: existing.companyId,
        name: body.name ?? existing.name,
        contactName: body.contactName ?? existing.contactName,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        address: body.address ?? existing.address,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        country: body.country ?? existing.country,
        taxId: body.taxId ?? existing.taxId,
        paymentTerms: body.paymentTerms ?? existing.paymentTerms,
        category: body.category ?? existing.category,
        status: normalizeStatus(body.status) || existing.status,
        notes: body.notes ?? existing.notes,
        vendorNumber: normalizedVendorNumber ?? existing.vendorNumber,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get('companyId') || DEFAULT_COMPANY_ID

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    const payablesCount = await prisma.vendorPayable.count({ where: { vendorId: vendor.id } })
    if (payablesCount > 0) {
      return createErrorResponse('No se puede eliminar un proveedor con facturas vinculadas', 400)
    }

    await prisma.vendor.delete({ where: { id: vendor.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    )
  }
}

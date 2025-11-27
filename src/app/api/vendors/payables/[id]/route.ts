import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateVendorPayable } from '@/lib/validation'
import { createErrorResponse } from '@/lib/validation-middleware'
import {
  calculateRemainingBalance,
  recalculateVendorFinancials,
  resolvePayableStatus,
} from '@/lib/vendor-service'

const DEFAULT_COMPANY_ID = 'default-company-001'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get('companyId') || DEFAULT_COMPANY_ID

    const payable = await prisma.vendorPayable.findFirst({
      where: {
        id: params.id,
        companyId,
      },
      include: {
        vendor: {
          select: { id: true, name: true, vendorNumber: true, category: true },
        },
      },
    })

    if (!payable) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    return NextResponse.json(payable)
  } catch (error) {
    console.error('Error fetching payable:', error)
    return NextResponse.json(
      { error: 'Error al obtener la factura' },
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

    const existing = await prisma.vendorPayable.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    const targetVendorId = body.vendorId || existing.vendorId

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: targetVendorId,
        companyId,
      },
    })

    if (!vendor) {
      return createErrorResponse('Proveedor inválido', 400)
    }

    const merged = { ...existing, ...body, vendorId: vendor.id }
    const validation = validateVendorPayable(merged)
    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
    }

    const subtotal = body.subtotal !== undefined ? Number(body.subtotal) : existing.subtotal
    const taxAmount = body.taxAmount !== undefined ? Number(body.taxAmount) : existing.taxAmount
    const total = body.total !== undefined ? Number(body.total) : existing.total
    const paidAmount = body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount
    const issueDate = new Date(body.issueDate || existing.issueDate)
    const dueDate = new Date(body.dueDate || existing.dueDate)
    const status = resolvePayableStatus(total, paidAmount, dueDate)
    const balance = calculateRemainingBalance(total, paidAmount)
    const attachments = Array.isArray(body.attachments) ? body.attachments : existing.attachments

    const updated = await prisma.vendorPayable.update({
      where: { id: params.id },
      data: {
        vendorId: vendor.id,
        billNumber: body.billNumber ?? existing.billNumber,
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        terms: body.terms ?? existing.terms,
        reference: body.reference ?? existing.reference,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        total,
        paidAmount,
        balance,
        status,
        attachments,
        notes: body.notes ?? existing.notes,
      },
      include: {
        vendor: {
          select: { id: true, name: true, vendorNumber: true, category: true },
        },
      },
    })

    await recalculateVendorFinancials(vendor.id)
    if (vendor.id !== existing.vendorId) {
      await recalculateVendorFinancials(existing.vendorId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating payable:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la factura' },
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

    const existing = await prisma.vendorPayable.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    await prisma.vendorPayable.delete({ where: { id: existing.id } })
    await recalculateVendorFinancials(existing.vendorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payable:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la factura' },
      { status: 500 }
    )
  }
}

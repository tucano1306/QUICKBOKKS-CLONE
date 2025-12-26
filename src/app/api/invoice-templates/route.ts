import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List invoice templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const templates = await prisma.invoiceTemplate.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })

    // If no templates, create a default one
    if (templates.length === 0) {
      const defaultTemplate = await prisma.invoiceTemplate.create({
        data: {
          companyId,
          name: 'Standard Template',
          isDefault: true,
          headerColor: '#2CA01C',
          accentColor: '#0077C5',
          fontFamily: 'Inter',
          showLogo: true,
          showCompanyAddress: true,
          showCustomerAddress: true,
          showDueDate: true,
          showPaymentTerms: true,
          showNotes: true,
          showTaxBreakdown: true,
          showPaymentInfo: true,
          footerText: 'Thank you for your business!',
          termsText: 'Payment is due within the terms specified above.'
        }
      })
      return NextResponse.json([defaultTemplate])
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching invoice templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new invoice template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, name, ...templateData } = body

    if (!companyId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (templateData.isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const template = await prisma.invoiceTemplate.create({
      data: {
        companyId,
        name,
        isDefault: templateData.isDefault || false,
        logoUrl: templateData.logoUrl || null,
        headerColor: templateData.headerColor || '#2CA01C',
        accentColor: templateData.accentColor || '#0077C5',
        fontFamily: templateData.fontFamily || 'Inter',
        showLogo: templateData.showLogo !== false,
        showCompanyAddress: templateData.showCompanyAddress !== false,
        showCustomerAddress: templateData.showCustomerAddress !== false,
        showDueDate: templateData.showDueDate !== false,
        showPaymentTerms: templateData.showPaymentTerms !== false,
        showNotes: templateData.showNotes !== false,
        showTaxBreakdown: templateData.showTaxBreakdown !== false,
        showPaymentInfo: templateData.showPaymentInfo !== false,
        footerText: templateData.footerText || null,
        termsText: templateData.termsText || null,
        customFields: templateData.customFields || null
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update invoice template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, companyId, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault && companyId) {
      await prisma.invoiceTemplate.updateMany({
        where: { companyId, isDefault: true, NOT: { id } },
        data: { isDefault: false }
      })
    }

    const template = await prisma.invoiceTemplate.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating invoice template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete invoice template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Check if it's the default template
    const template = await prisma.invoiceTemplate.findUnique({ where: { id } })
    if (template?.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default template' }, { status: 400 })
    }

    await prisma.invoiceTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

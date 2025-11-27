'use server'

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

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get saved custom reports from audit log
    const savedReports = await prisma.auditLog.findMany({
      where: {
        companyId,
        action: 'custom_report_saved'
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    })

    // Get available data sources
    const [invoiceCount, expenseCount, customerCount, productCount] = await Promise.all([
      prisma.invoice.count({ where: { companyId } }),
      prisma.expense.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } })
    ])

    // Available report templates
    const templates = [
      {
        id: 'TPL-001',
        name: 'Reporte de Ventas por Cliente',
        description: 'Desglose de ventas por cliente con totales',
        dataSource: 'invoices',
        fields: ['customer', 'total', 'status', 'date'],
        groupBy: 'customer',
        aggregations: ['sum', 'count']
      },
      {
        id: 'TPL-002',
        name: 'Análisis de Gastos',
        description: 'Gastos agrupados por categoría',
        dataSource: 'expenses',
        fields: ['category', 'amount', 'date', 'vendor'],
        groupBy: 'category',
        aggregations: ['sum', 'average']
      },
      {
        id: 'TPL-003',
        name: 'Rentabilidad por Producto',
        description: 'Ingresos y margen por producto',
        dataSource: 'products',
        fields: ['name', 'price', 'cost', 'margin'],
        groupBy: 'category',
        aggregations: ['sum', 'average']
      },
      {
        id: 'TPL-004',
        name: 'Antigüedad de Cuentas',
        description: 'Cuentas por cobrar por antigüedad',
        dataSource: 'invoices',
        fields: ['customer', 'total', 'dueDate', 'daysOverdue'],
        groupBy: 'aging',
        aggregations: ['sum', 'count']
      }
    ]

    // Parse saved custom reports
    const customReports = savedReports.map(r => {
      const changes = r.changes as Record<string, unknown> | null
      return {
        id: r.id,
        name: changes?.name || 'Reporte Personalizado',
        description: changes?.description || '',
        createdAt: r.timestamp.toISOString(),
        lastRun: changes?.lastRun || null,
        config: changes?.config || {}
      }
    })

    return NextResponse.json({ 
      templates,
      savedReports: customReports,
      dataSources: {
        invoices: invoiceCount,
        expenses: expenseCount,
        customers: customerCount,
        products: productCount
      }
    })

  } catch (error) {
    console.error('Error fetching custom reports:', error)
    return NextResponse.json({ error: 'Error fetching reports' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, dataSource, fields, groupBy, filters, companyId } = body

    if (!companyId || !name) {
      return NextResponse.json({ error: 'Company ID and name required' }, { status: 400 })
    }

    // Save report configuration via audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user?.id,
        action: 'custom_report_saved',
        entityType: 'custom_report',
        entityId: `CR-${Date.now()}`,
        changes: {
          name,
          description,
          config: {
            dataSource,
            fields,
            groupBy,
            filters
          }
        },
        companyId
      }
    })

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('Error saving custom report:', error)
    return NextResponse.json({ error: 'Error saving report' }, { status: 500 })
  }
}

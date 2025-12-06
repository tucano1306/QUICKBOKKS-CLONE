import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ImportType, ImportStatus } from '@prisma/client'

// GET - List import jobs
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

    const importJobs = await prisma.importJob.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(importJobs)
  } catch (error) {
    console.error('Error fetching import jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new import and process data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, data, mapping } = body

    if (!companyId || !type || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create import job
    const importJob = await prisma.importJob.create({
      data: {
        companyId,
        userId: session.user.id,
        type: type as ImportType,
        fileName: body.fileName || 'import.csv',
        fileSize: JSON.stringify(data).length,
        status: ImportStatus.PROCESSING,
        totalRows: data.length,
        mapping: mapping || null,
        startedAt: new Date()
      }
    })

    let successRows = 0
    let errorRows = 0
    const errors: { row: number; message: string }[] = []

    // Process based on type
    switch (type) {
      case 'CUSTOMERS':
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i]
            await prisma.customer.create({
              data: {
                companyId,
                name: row.name || row.nombre || `Customer ${i + 1}`,
                email: row.email || row.correo || null,
                phone: row.phone || row.telefono || null,
                company: row.company || row.empresa || null,
                taxId: row.taxId || row.rfc || null,
                address: row.address || row.direccion || null,
                city: row.city || row.ciudad || null,
                state: row.state || row.estado || null,
                zipCode: row.zipCode || row.codigoPostal || null,
                country: row.country || row.pais || 'US',
                notes: row.notes || row.notas || null,
                status: 'ACTIVE'
              }
            })
            successRows++
          } catch (err: any) {
            errorRows++
            errors.push({ row: i + 1, message: err.message || 'Unknown error' })
          }
        }
        break

      case 'VENDORS':
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i]
            const vendorNumber = `VND-${Date.now()}-${i}`
            await prisma.vendor.create({
              data: {
                companyId,
                vendorNumber,
                name: row.name || row.nombre || `Vendor ${i + 1}`,
                contactName: row.contactName || row.contacto || null,
                email: row.email || row.correo || null,
                phone: row.phone || row.telefono || null,
                address: row.address || row.direccion || null,
                city: row.city || row.ciudad || null,
                state: row.state || row.estado || null,
                country: row.country || row.pais || 'US',
                taxId: row.taxId || row.rfc || null,
                paymentTerms: row.paymentTerms || 'Net 30',
                category: row.category || row.categoria || null,
                notes: row.notes || row.notas || null,
                status: 'ACTIVE'
              }
            })
            successRows++
          } catch (err: any) {
            errorRows++
            errors.push({ row: i + 1, message: err.message || 'Unknown error' })
          }
        }
        break

      case 'PRODUCTS':
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i]
            const sku = row.sku || `SKU-${Date.now()}-${i}`
            await prisma.product.create({
              data: {
                companyId,
                name: row.name || row.nombre || `Product ${i + 1}`,
                description: row.description || row.descripcion || null,
                type: row.type === 'INVENTORY' ? 'INVENTORY' : 'SERVICE',
                sku,
                price: parseFloat(row.price || row.precio || '0'),
                cost: row.cost || row.costo ? parseFloat(row.cost || row.costo) : null,
                taxable: row.taxable !== false,
                taxRate: parseFloat(row.taxRate || row.impuesto || '0'),
                category: row.category || row.categoria || null,
                unit: row.unit || row.unidad || null,
                stock: parseInt(row.stock || row.inventario || '0'),
                reorderLevel: row.reorderLevel ? parseInt(row.reorderLevel) : null,
                status: 'ACTIVE'
              }
            })
            successRows++
          } catch (err: any) {
            errorRows++
            errors.push({ row: i + 1, message: err.message || 'Unknown error' })
          }
        }
        break

      case 'CHART_OF_ACCOUNTS':
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i]
            await prisma.chartOfAccounts.create({
              data: {
                companyId,
                accountNumber: row.accountNumber || row.numero || `${1000 + i}`,
                name: row.name || row.nombre || `Account ${i + 1}`,
                type: row.type || row.tipo || 'EXPENSE',
                subType: row.subType || null,
                description: row.description || row.descripcion || null,
                balance: parseFloat(row.balance || row.saldo || '0'),
                isActive: true
              }
            })
            successRows++
          } catch (err: any) {
            errorRows++
            errors.push({ row: i + 1, message: err.message || 'Unknown error' })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Unsupported import type' }, { status: 400 })
    }

    // Update import job with results
    const updatedJob = await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: errorRows === data.length ? ImportStatus.FAILED : ImportStatus.COMPLETED,
        processedRows: data.length,
        successRows,
        errorRows,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      importJob: updatedJob,
      summary: {
        total: data.length,
        success: successRows,
        errors: errorRows
      }
    })
  } catch (error) {
    console.error('Error processing import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

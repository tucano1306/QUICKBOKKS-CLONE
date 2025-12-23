import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ImportType, ImportStatus, AccountType } from '@prisma/client'

// Helper types
type ImportRow = Record<string, unknown>
type ImportError = { row: number; message: string }
type ImportResult = { successRows: number; errorRows: number; errors: ImportError[] }

// Safe number parsing helpers - handles primitives only
function safeParseFloat(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return defaultValue
  const num = Number.parseFloat(value)
  return Number.isNaN(num) ? defaultValue : num
}

function safeParseInt(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value !== 'string') return defaultValue
  const num = Number.parseInt(value, 10)
  return Number.isNaN(num) ? defaultValue : num
}

// Valid account types
const validAccountTypes = new Set<AccountType>(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])

function parseAccountType(value: unknown): AccountType {
  if (value === null || value === undefined) return 'EXPENSE'
  if (typeof value !== 'string') return 'EXPENSE'
  const strValue = value.toUpperCase()
  return validAccountTypes.has(strValue as AccountType) ? strValue as AccountType : 'EXPENSE'
}

// Helper function to process customers import
async function processCustomersImport(companyId: string, data: ImportRow[]): Promise<ImportResult> {
  let successRows = 0
  let errorRows = 0
  const errors: ImportError[] = []

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i]
      await prisma.customer.create({
        data: {
          companyId,
          name: (row.name || row.nombre || `Customer ${i + 1}`) as string,
          email: (row.email || row.correo || null) as string | null,
          phone: (row.phone || row.telefono || null) as string | null,
          company: (row.company || row.empresa || null) as string | null,
          taxId: (row.taxId || row.rfc || null) as string | null,
          address: (row.address || row.direccion || null) as string | null,
          city: (row.city || row.ciudad || null) as string | null,
          state: (row.state || row.estado || null) as string | null,
          zipCode: (row.zipCode || row.codigoPostal || null) as string | null,
          country: (row.country || row.pais || 'US') as string,
          notes: (row.notes || row.notas || null) as string | null,
          status: 'ACTIVE'
        }
      })
      successRows++
    } catch (err: unknown) {
      errorRows++
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ row: i + 1, message })
    }
  }

  return { successRows, errorRows, errors }
}

// Helper function to process vendors import
async function processVendorsImport(companyId: string, data: ImportRow[]): Promise<ImportResult> {
  let successRows = 0
  let errorRows = 0
  const errors: ImportError[] = []

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i]
      const vendorNumber = `VND-${Date.now()}-${i}`
      await prisma.vendor.create({
        data: {
          companyId,
          vendorNumber,
          name: (row.name || row.nombre || `Vendor ${i + 1}`) as string,
          contactName: (row.contactName || row.contacto || null) as string | null,
          email: (row.email || row.correo || null) as string | null,
          phone: (row.phone || row.telefono || null) as string | null,
          address: (row.address || row.direccion || null) as string | null,
          city: (row.city || row.ciudad || null) as string | null,
          state: (row.state || row.estado || null) as string | null,
          country: (row.country || row.pais || 'US') as string,
          taxId: (row.taxId || row.rfc || null) as string | null,
          paymentTerms: (row.paymentTerms || 'Net 30') as string,
          category: (row.category || row.categoria || null) as string | null,
          notes: (row.notes || row.notas || null) as string | null,
          status: 'ACTIVE'
        }
      })
      successRows++
    } catch (err: unknown) {
      errorRows++
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ row: i + 1, message })
    }
  }

  return { successRows, errorRows, errors }
}

// Helper function to process products import
async function processProductsImport(companyId: string, data: ImportRow[]): Promise<ImportResult> {
  let successRows = 0
  let errorRows = 0
  const errors: ImportError[] = []

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i]
      const sku = (row.sku || `SKU-${Date.now()}-${i}`) as string
      await prisma.product.create({
        data: {
          companyId,
          name: (row.name || row.nombre || `Product ${i + 1}`) as string,
          description: (row.description || row.descripcion || null) as string | null,
          type: row.type === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
          sku,
          price: safeParseFloat(row.price ?? row.precio),
          cost: row.cost ?? row.costo ? safeParseFloat(row.cost ?? row.costo) : null,
          taxable: row.taxable !== false,
          taxRate: safeParseFloat(row.taxRate ?? row.impuesto),
          category: (row.category || row.categoria || null) as string | null,
          unit: (row.unit || row.unidad || null) as string | null,
          stock: safeParseInt(row.stock ?? row.inventario),
          reorderLevel: row.reorderLevel ? safeParseInt(row.reorderLevel) : null,
          status: 'ACTIVE'
        }
      })
      successRows++
    } catch (err: unknown) {
      errorRows++
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ row: i + 1, message })
    }
  }

  return { successRows, errorRows, errors }
}

// Helper function to process chart of accounts import
async function processChartOfAccountsImport(companyId: string, data: ImportRow[]): Promise<ImportResult> {
  let successRows = 0
  let errorRows = 0
  const errors: ImportError[] = []

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i]
      await prisma.chartOfAccounts.create({
        data: {
          companyId,
          code: (row.code || row.accountNumber || row.numero || `${1000 + i}`) as string,
          name: (row.name || row.nombre || `Account ${i + 1}`) as string,
          type: parseAccountType(row.type ?? row.tipo),
          description: (row.description || row.descripcion || null) as string | null,
          balance: safeParseFloat(row.balance ?? row.saldo),
          isActive: true
        }
      })
      successRows++
    } catch (err: unknown) {
      errorRows++
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ row: i + 1, message })
    }
  }

  return { successRows, errorRows, errors }
}

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

    // Process based on type using helper functions
    let result: ImportResult

    switch (type) {
      case 'CUSTOMERS':
        result = await processCustomersImport(companyId, data)
        break
      case 'VENDORS':
        result = await processVendorsImport(companyId, data)
        break
      case 'PRODUCTS':
        result = await processProductsImport(companyId, data)
        break
      case 'CHART_OF_ACCOUNTS':
        result = await processChartOfAccountsImport(companyId, data)
        break
      default:
        return NextResponse.json({ error: 'Unsupported import type' }, { status: 400 })
    }

    const { successRows, errorRows, errors } = result

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

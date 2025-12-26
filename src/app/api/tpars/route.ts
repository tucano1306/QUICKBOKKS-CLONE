import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TPARSStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - Get TPARS report for a fiscal year
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const fiscalYear = searchParams.get('fiscalYear')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    if (fiscalYear) {
      // Get specific year report
      const report = await prisma.tPARSReport.findUnique({
        where: {
          companyId_fiscalYear: {
            companyId,
            fiscalYear: parseInt(fiscalYear)
          }
        }
      })
      return NextResponse.json(report || null)
    } else {
      // Get all reports
      const reports = await prisma.tPARSReport.findMany({
        where: { companyId },
        orderBy: { fiscalYear: 'desc' }
      })
      return NextResponse.json(reports)
    }
  } catch (error) {
    console.error('Error fetching TPARS report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate TPARS report for a fiscal year
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, fiscalYear } = body

    if (!companyId || !fiscalYear) {
      return NextResponse.json({ error: 'Company ID and fiscal year required' }, { status: 400 })
    }

    const year = parseInt(fiscalYear)
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    // Get all vendor payables for the fiscal year
    const payables = await prisma.vendorPayable.findMany({
      where: {
        companyId,
        issueDate: {
          gte: startDate,
          lte: endDate
        },
        status: { in: ['PAID', 'PARTIAL'] }
      },
      include: {
        vendor: true
      }
    })

    // Get all expenses with vendors
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        },
        vendor: { not: null },
        status: 'APPROVED'
      }
    })

    // Aggregate by vendor
    const vendorPayments: Record<string, {
      vendorId: string
      vendorName: string
      taxId: string | null
      totalPayments: number
      totalGST: number
      totalWithheld: number
      paymentCount: number
    }> = {}

    // Process payables
    for (const payable of payables) {
      const vendorId = payable.vendorId
      if (!vendorPayments[vendorId]) {
        vendorPayments[vendorId] = {
          vendorId,
          vendorName: payable.vendor.name,
          taxId: payable.vendor.taxId,
          totalPayments: 0,
          totalGST: 0,
          totalWithheld: 0,
          paymentCount: 0
        }
      }
      vendorPayments[vendorId].totalPayments += payable.paidAmount
      vendorPayments[vendorId].totalGST += payable.taxAmount
      vendorPayments[vendorId].paymentCount++
    }

    // Process expenses (group by vendor name if no vendor ID)
    for (const expense of expenses) {
      const vendorName = expense.vendor || 'Unknown Vendor'
      const key = `expense_${vendorName}`
      if (!vendorPayments[key]) {
        vendorPayments[key] = {
          vendorId: key,
          vendorName,
          taxId: null,
          totalPayments: 0,
          totalGST: 0,
          totalWithheld: 0,
          paymentCount: 0
        }
      }
      vendorPayments[key].totalPayments += expense.amount
      vendorPayments[key].totalGST += expense.taxAmount
      vendorPayments[key].paymentCount++
    }

    // Calculate totals
    const vendorList = Object.values(vendorPayments)
    const totalPayments = vendorList.reduce((sum, v) => sum + v.totalPayments, 0)
    const totalGST = vendorList.reduce((sum, v) => sum + v.totalGST, 0)
    const totalWithheld = vendorList.reduce((sum, v) => sum + v.totalWithheld, 0)
    const vendorCount = vendorList.length

    // Upsert the report
    const report = await prisma.tPARSReport.upsert({
      where: {
        companyId_fiscalYear: { companyId, fiscalYear: year }
      },
      create: {
        companyId,
        fiscalYear: year,
        status: TPARSStatus.GENERATED,
        totalPayments,
        totalGST,
        totalWithheld,
        vendorCount,
        reportData: vendorList,
        generatedAt: new Date()
      },
      update: {
        status: TPARSStatus.GENERATED,
        totalPayments,
        totalGST,
        totalWithheld,
        vendorCount,
        reportData: vendorList,
        generatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      report,
      summary: {
        vendorCount,
        totalPayments,
        totalGST,
        totalWithheld
      }
    })
  } catch (error) {
    console.error('Error generating TPARS report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update TPARS report status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 })
    }

    const updateData: any = { status }
    if (status === 'SUBMITTED') {
      updateData.submittedAt = new Date()
    }

    const report = await prisma.tPARSReport.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating TPARS report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

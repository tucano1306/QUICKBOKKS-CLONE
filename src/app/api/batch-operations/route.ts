import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BatchOperationType, BatchStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - List batch operations
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

    const operations = await prisma.batchOperation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(operations)
  } catch (error) {
    console.error('Error fetching batch operations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create and execute batch operation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, itemIds, actionData } = body

    if (!companyId || !type || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create batch operation
    const operation = await prisma.batchOperation.create({
      data: {
        companyId,
        userId: session.user.id,
        type: type as BatchOperationType,
        totalItems: itemIds.length,
        itemIds,
        actionData: actionData || null,
        status: BatchStatus.PROCESSING,
        startedAt: new Date()
      }
    })

    let successItems = 0
    let errorItems = 0
    const results: { id: string; success: boolean; error?: string }[] = []

    // Process based on type
    switch (type) {
      case 'CATEGORIZE':
        // Categorize bank transactions
        const { categoryId, accountId } = actionData || {}
        for (const id of itemIds) {
          try {
            await prisma.bankTransaction.update({
              where: { id },
              data: {
                categoryId: actionData?.categoryId || null
              }
            })
            successItems++
            results.push({ id, success: true })
          } catch (err: any) {
            errorItems++
            results.push({ id, success: false, error: err.message })
          }
        }
        break

      case 'APPROVE':
        // Approve expenses or transactions
        for (const id of itemIds) {
          try {
            await prisma.expense.update({
              where: { id },
              data: { status: 'APPROVED' }
            })
            successItems++
            results.push({ id, success: true })
          } catch (err: any) {
            errorItems++
            results.push({ id, success: false, error: err.message })
          }
        }
        break

      case 'RECONCILE':
        // Mark transactions as reconciled
        for (const id of itemIds) {
          try {
            await prisma.bankTransaction.update({
              where: { id },
              data: { 
                reconciled: true,
                reconciledAt: new Date()
              }
            })
            successItems++
            results.push({ id, success: true })
          } catch (err: any) {
            errorItems++
            results.push({ id, success: false, error: err.message })
          }
        }
        break

      case 'DELETE':
        // Delete transactions (soft delete if possible)
        for (const id of itemIds) {
          try {
            // Try to delete bank transaction
            await prisma.bankTransaction.delete({
              where: { id }
            })
            successItems++
            results.push({ id, success: true })
          } catch (err: any) {
            errorItems++
            results.push({ id, success: false, error: err.message })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Unsupported operation type' }, { status: 400 })
    }

    // Update batch operation with results
    const updatedOperation = await prisma.batchOperation.update({
      where: { id: operation.id },
      data: {
        status: errorItems === itemIds.length ? BatchStatus.FAILED : BatchStatus.COMPLETED,
        processedItems: itemIds.length,
        successItems,
        errorItems,
        results,
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      operation: updatedOperation,
      summary: {
        total: itemIds.length,
        success: successItems,
        errors: errorItems
      }
    })
  } catch (error) {
    console.error('Error processing batch operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

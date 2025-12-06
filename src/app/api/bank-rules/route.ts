import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List bank rules
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

    const rules = await prisma.bankRule.findMany({
      where: { companyId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching bank rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new bank rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, name, conditionField, conditionType, conditionValue, actionType, categoryId, accountId, taxCode, memo, tags, priority, description } = body

    if (!companyId || !name || !conditionField || !conditionType || !conditionValue || !actionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rule = await prisma.bankRule.create({
      data: {
        companyId,
        name,
        description: description || null,
        priority: priority || 0,
        conditionField,
        conditionType,
        conditionValue,
        actionType,
        categoryId: categoryId || null,
        accountId: accountId || null,
        taxCode: taxCode || null,
        memo: memo || null,
        tags: tags || []
      }
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating bank rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update bank rule
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })
    }

    const rule = await prisma.bankRule.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating bank rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete bank rule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })
    }

    await prisma.bankRule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bank rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

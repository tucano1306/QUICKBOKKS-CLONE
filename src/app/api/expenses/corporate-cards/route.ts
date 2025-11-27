import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET all corporate cards
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')

    const where: any = {}

    if (companyId) {
      where.companyId = companyId
    }

    if (status) {
      where.status = status
    }

    const cards = await prisma.corporateCard.findMany({
      where,
      include: {
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to match frontend expectations
    const transformedCards = cards.map(card => ({
      id: card.id,
      cardNumber: `**** **** **** ${card.lastFourDigits}`,
      cardHolder: card.cardHolderName,
      employeeId: null, // Would need relation to Employee
      bankName: card.cardBrand,
      cardType: card.cardType,
      limit: card.creditLimit || 0,
      balance: card.availableCredit || 0,
      currentBalance: card.currentBalance,
      status: card.status,
      lastSync: card.lastSyncedAt?.toISOString() || null,
      recentTransactions: card.transactions.map(t => ({
        id: t.id,
        merchant: t.merchantName,
        amount: t.amount,
        date: t.transactionDate.toISOString(),
        status: t.status
      }))
    }))

    // Calculate stats
    const stats = {
      totalCards: cards.length,
      activeCards: cards.filter(c => c.status === 'ACTIVE').length,
      totalLimit: cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0),
      totalSpent: cards.reduce((sum, c) => sum + c.currentBalance, 0),
      availableCredit: cards.reduce((sum, c) => sum + (c.availableCredit || 0), 0)
    }

    return NextResponse.json({
      cards: transformedCards,
      stats
    })
  } catch (error) {
    console.error('Error fetching corporate cards:', error)
    return NextResponse.json(
      { error: 'Error al obtener tarjetas corporativas' },
      { status: 500 }
    )
  }
}

// POST - Create new corporate card
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      cardNumber,
      cardHolderName,
      cardType,
      cardBrand,
      expiryMonth,
      expiryYear,
      creditLimit,
      companyId,
      department,
      notes
    } = body

    // Extract last 4 digits
    const lastFourDigits = cardNumber.replace(/\s/g, '').slice(-4)

    // Check for duplicate
    const existingCard = await prisma.corporateCard.findFirst({
      where: {
        lastFourDigits,
        companyId
      }
    })

    if (existingCard) {
      return NextResponse.json(
        { error: 'Ya existe una tarjeta con estos últimos 4 dígitos' },
        { status: 400 }
      )
    }

    const card = await prisma.corporateCard.create({
      data: {
        userId: session.user.id,
        companyId,
        cardNumber: `****-****-****-${lastFourDigits}`,
        lastFourDigits,
        cardHolderName,
        cardType: cardType || 'CREDIT',
        cardBrand: cardBrand || 'VISA',
        expiryMonth: parseInt(expiryMonth) || 12,
        expiryYear: parseInt(expiryYear) || new Date().getFullYear() + 3,
        creditLimit: parseFloat(creditLimit) || 0,
        availableCredit: parseFloat(creditLimit) || 0,
        currentBalance: 0,
        status: 'ACTIVE',
        department,
        notes
      }
    })

    return NextResponse.json({
      card: {
        id: card.id,
        cardNumber: `**** **** **** ${card.lastFourDigits}`,
        cardHolder: card.cardHolderName,
        bankName: card.cardBrand,
        cardType: card.cardType,
        limit: card.creditLimit,
        balance: card.availableCredit,
        status: card.status
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating corporate card:', error)
    return NextResponse.json(
      { error: 'Error al crear tarjeta corporativa' },
      { status: 500 }
    )
  }
}

// PUT - Update corporate card
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de tarjeta requerido' },
        { status: 400 }
      )
    }

    const card = await prisma.corporateCard.update({
      where: { id },
      data: {
        cardHolderName: updateData.cardHolderName,
        creditLimit: updateData.creditLimit ? parseFloat(updateData.creditLimit) : undefined,
        status: updateData.status,
        department: updateData.department,
        notes: updateData.notes,
        lastSyncedAt: updateData.sync ? new Date() : undefined
      }
    })

    return NextResponse.json({
      card: {
        id: card.id,
        cardNumber: `**** **** **** ${card.lastFourDigits}`,
        cardHolder: card.cardHolderName,
        bankName: card.cardBrand,
        cardType: card.cardType,
        limit: card.creditLimit,
        balance: card.availableCredit,
        status: card.status,
        lastSync: card.lastSyncedAt?.toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating corporate card:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tarjeta' },
      { status: 500 }
    )
  }
}

// DELETE - Remove corporate card
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de tarjeta requerido' },
        { status: 400 }
      )
    }

    await prisma.corporateCard.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting corporate card:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tarjeta' },
      { status: 500 }
    )
  }
}

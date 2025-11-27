import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener cuenta específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const account = await prisma.bankAccount.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        bankTransactions: {
          orderBy: { date: 'desc' },
          take: 50
        },
        reconciliations: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            bankTransactions: true,
            reconciliations: true
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ error: 'Error al obtener cuenta' }, { status: 500 })
  }
}

// PUT - Actualizar cuenta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      accountName,
      accountNumber,
      bankName,
      accountType,
      currency,
      balance,
      notes,
      isPrimary,
      status
    } = body

    // Verificar que la cuenta pertenece al usuario
    const existing = await prisma.bankAccount.findFirst({
      where: { id: params.id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    // Si es cuenta primaria, quitar primario de otras
    if (isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { userId: session.user.id, isPrimary: true, id: { not: params.id } },
        data: { isPrimary: false }
      })
    }

    const account = await prisma.bankAccount.update({
      where: { id: params.id },
      data: {
        accountName,
        accountNumber,
        bankName,
        accountType,
        currency,
        balance,
        notes,
        isPrimary,
        status,
        institutionName: bankName,
        mask: accountNumber ? accountNumber.slice(-4) : existing.mask
      }
    })

    return NextResponse.json({ account, message: 'Cuenta actualizada exitosamente' })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Error al actualizar cuenta' }, { status: 500 })
  }
}

// DELETE - Eliminar cuenta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cuenta pertenece al usuario
    const existing = await prisma.bankAccount.findFirst({
      where: { id: params.id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    // Eliminar transacciones asociadas primero
    await prisma.bankTransaction.deleteMany({
      where: { bankAccountId: params.id }
    })

    // Eliminar reconciliaciones
    await prisma.bankReconciliation.deleteMany({
      where: { bankAccountId: params.id }
    })

    // Eliminar la cuenta
    await prisma.bankAccount.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Cuenta eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 })
  }
}

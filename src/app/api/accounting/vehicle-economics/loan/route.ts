import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Financiacion del activo.
 *
 * Un activo tiene como mucho un prestamo, asi que va por upsert: la pantalla
 * usa el mismo formulario para crearlo y para actualizarlo tras cada estado de
 * cuenta.
 *
 * `interestPaidLast12` es el interes real que reporta el banco. Comparado con
 * el cuadro teorico delata los pagos tardios: estos contratos llevan interes
 * simple diario, asi que cada dia de retraso corre.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      assetId, lender, amountFinanced, downPayment, apr, termMonths,
      firstPaymentDate, maturityDate, currentBalance, paymentsRemaining,
      interestPaidLast12, statementDate, notes,
    } = body

    if (!assetId || amountFinanced == null || apr == null || !termMonths) {
      return NextResponse.json(
        { error: 'Se requieren assetId, amountFinanced, apr y termMonths' },
        { status: 400 }
      )
    }
    if (Number(termMonths) <= 0) {
      return NextResponse.json({ error: 'El plazo debe ser mayor que cero' }, { status: 400 })
    }
    // Un APR llega a veces como 8.9 en vez de 0.089; se normaliza para que la
    // cuota no salga disparatada por un malentendido de unidades.
    const normalizedApr = Number(apr) > 1 ? Number(apr) / 100 : Number(apr)

    const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { companyId: true } })
    if (!asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    const data = {
      companyId: asset.companyId,
      lender: lender || null,
      amountFinanced: Number(amountFinanced),
      downPayment: Number(downPayment) || 0,
      apr: normalizedApr,
      termMonths: Number(termMonths),
      firstPaymentDate: firstPaymentDate ? new Date(firstPaymentDate) : null,
      maturityDate: maturityDate ? new Date(maturityDate) : null,
      currentBalance: currentBalance != null ? Number(currentBalance) : null,
      paymentsRemaining: paymentsRemaining != null ? Number(paymentsRemaining) : null,
      interestPaidLast12: interestPaidLast12 != null ? Number(interestPaidLast12) : null,
      statementDate: statementDate ? new Date(statementDate) : null,
      notes: notes || null,
    }

    const loan = await prisma.assetLoan.upsert({
      where: { assetId },
      create: { assetId, ...data },
      update: data,
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error guardando financiacion:', error)
    return NextResponse.json({ error: 'Error al guardar la financiación' }, { status: 500 })
  }
}

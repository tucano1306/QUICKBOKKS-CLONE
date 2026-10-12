import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { configFoody } from '@/lib/foody-integration/config'
import { PREFIJO_REFERENCIA } from '@/lib/foody-integration/lote'

export const dynamic = 'force-dynamic'

/** Primer dia del mes en curso, visto desde Miami, como lo guarda Computo (00:00 UTC). */
function inicioDelMes(ahora: Date): { desde: Date; hasta: Date } {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric' })
    .formatToParts(ahora)
  const y = Number(partes.find((p) => p.type === 'year')?.value)
  const m = Number(partes.find((p) => p.type === 'month')?.value)
  return { desde: new Date(Date.UTC(y, m - 1, 1)), hasta: new Date(Date.UTC(y, m, 1)) }
}

/**
 * GET /api/integrations/foody/estado — lo que enseña la tarjeta de Foody en
 * Integraciones: si esta configurada, en que empresa escribe y que ha llegado.
 *
 * Con sesion normal, y solo para quien tiene acceso a esa empresa.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const config = configFoody()
  if (!config) return NextResponse.json({ configurada: false })

  const acceso = await prisma.companyUser.findFirst({
    where: { userId: session.user.id, companyId: config.companyId },
    select: { id: true },
  })
  if (!acceso) return NextResponse.json({ configurada: true, acceso: false })

  const { desde, hasta } = inicioDelMes(new Date())
  const deFoody = { companyId: config.companyId, type: 'EXPENSE' as const, reference: { startsWith: PREFIJO_REFERENCIA } }

  const [empresa, delMes, total, recientes] = await Promise.all([
    prisma.company.findUnique({ where: { id: config.companyId }, select: { id: true, name: true } }),
    prisma.transaction.aggregate({
      where: { ...deFoody, date: { gte: desde, lt: hasta } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: deFoody }),
    prisma.transaction.findMany({
      where: deFoody,
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, description: true, category: true, amount: true, date: true, updatedAt: true },
    }),
  ])

  return NextResponse.json({
    configurada: true,
    acceso: true,
    empresa: empresa ? { id: empresa.id, nombre: empresa.name.trim() } : null,
    delMes: { cantidad: delMes._count._all, total: Math.round((delMes._sum.amount ?? 0) * 100) / 100 },
    total,
    ultimo: recientes[0]?.updatedAt ?? null,
    recientes,
  })
}

/**
 * API de cuentas contables (shortcut para chart-of-accounts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Obtener cuentas del chart of accounts
    const accounts = await prisma.chartOfAccounts.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isActive: true
      }
    })

    return NextResponse.json(accounts)

  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

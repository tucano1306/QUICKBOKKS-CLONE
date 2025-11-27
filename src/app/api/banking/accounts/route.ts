import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserBankAccounts, updateBankAccountBalance } from '@/lib/bank-service'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/banking/accounts
 * Obtiene todas las cuentas bancarias del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try bank-service first, then fallback to direct prisma
    try {
      const result = await getUserBankAccounts(session.user.id)
      if (result.success) {
        return NextResponse.json({
          accounts: result.accounts,
        })
      }
    } catch {
      // Fallback to direct prisma query
    }

    // Direct prisma query
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            bankTransactions: true,
            reconciliations: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      accounts: accounts,
    })
  } catch (error: any) {
    console.error('Error getting bank accounts:', error)
    return NextResponse.json(
      { error: 'Failed to get bank accounts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/banking/accounts
 * Crea una nueva cuenta bancaria
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      accountName,
      accountNumber,
      bankName,
      accountType = 'CHECKING',
      currency = 'USD',
      balance = 0,
      notes,
      isPrimary = false
    } = body

    if (!accountName || !bankName) {
      return NextResponse.json(
        { error: 'Account name and bank name are required' },
        { status: 400 }
      )
    }

    // If this is set as primary, unset other primary accounts
    if (isPrimary) {
      await prisma.bankAccount.updateMany({
        where: {
          userId: session.user.id,
          isPrimary: true
        },
        data: { isPrimary: false }
      })
    }

    // Create the account
    const account = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        accountName,
        accountNumber,
        bankName,
        institutionName: bankName,
        accountType,
        currency,
        balance,
        notes,
        isPrimary,
        mask: accountNumber ? accountNumber.slice(-4) : null,
        status: 'ACTIVE'
      },
      include: {
        _count: {
          select: {
            bankTransactions: true,
            reconciliations: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      account
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating bank account:', error)
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    )
  }
}

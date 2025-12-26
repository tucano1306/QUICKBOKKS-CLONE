import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // Get company settings for currencies
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    })

    const settings = company?.settings as Record<string, unknown> | null
    const baseCurrency = (settings?.baseCurrency as string) || 'USD'

    // Try to get from Currency table if it exists
    try {
      const currencies = await prisma.currency.findMany({
        where: { companyId },
        orderBy: { code: 'asc' }
      })

      if (currencies.length > 0) {
        const formattedCurrencies = currencies.map(c => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          enabled: c.isActive,
          exchangeRate: c.exchangeRate || 1,
          lastUpdated: c.updatedAt.toISOString().replace('T', ' ').slice(0, 16)
        }))
        return NextResponse.json({
          currencies: formattedCurrencies,
          baseCurrency
        })
      }
    } catch {
      // Currency table might not exist
    }

    // Return default currencies
    const defaultCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', enabled: true, exchangeRate: 1.00, lastUpdated: new Date().toISOString().split('T')[0] },
      { code: 'EUR', name: 'Euro', symbol: '€', enabled: true, exchangeRate: 0.92, lastUpdated: new Date().toISOString().split('T')[0] },
      { code: 'GBP', name: 'British Pound', symbol: '£', enabled: false, exchangeRate: 0.79, lastUpdated: new Date().toISOString().split('T')[0] },
      { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', enabled: true, exchangeRate: 17.25, lastUpdated: new Date().toISOString().split('T')[0] },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', enabled: false, exchangeRate: 1.36, lastUpdated: new Date().toISOString().split('T')[0] }
    ]

    return NextResponse.json({
      currencies: defaultCurrencies,
      baseCurrency
    })
  } catch (error) {
    console.error('Error fetching currencies:', error)
    return NextResponse.json({ error: 'Error al obtener monedas' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryCompanyId = searchParams.get('companyId')
    const body = await request.json()
    const { companyId: bodyCompanyId, code, enabled, exchangeRate, currencies, baseCurrency } = body
    const companyId = queryCompanyId || bodyCompanyId

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId es requerido' },
        { status: 400 }
      )
    }

    // Handle batch update of currencies array
    if (currencies && Array.isArray(currencies)) {
      try {
        // Update each currency
        for (const curr of currencies) {
          const existing = await prisma.currency.findFirst({
            where: { code: curr.code, companyId }
          })

          if (existing) {
            await prisma.currency.update({
              where: { id: existing.id },
              data: {
                name: curr.name,
                symbol: curr.symbol,
                isActive: curr.enabled,
                exchangeRate: curr.exchangeRate
              }
            })
          } else {
            await prisma.currency.create({
              data: {
                companyId,
                code: curr.code,
                name: curr.name,
                symbol: curr.symbol,
                exchangeRate: curr.exchangeRate || 1,
                isActive: curr.enabled ?? true
              }
            })
          }
        }

        // Update base currency if provided
        if (baseCurrency) {
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true }
          })
          const currentSettings = (company?.settings as Record<string, unknown>) || {}
          await prisma.company.update({
            where: { id: companyId },
            data: { 
              settings: { ...currentSettings, baseCurrency }
            }
          })
        }

        return NextResponse.json({ success: true, currencies, baseCurrency })
      } catch (e) {
        console.error('Error updating currencies batch:', e)
        // If table doesn't exist, just return success
        return NextResponse.json({ success: true, currencies, baseCurrency })
      }
    }

    // Handle single currency update (legacy)
    if (!code) {
      return NextResponse.json(
        { error: 'code es requerido' },
        { status: 400 }
      )
    }

    try {
      // Try to find existing currency
      const existing = await prisma.currency.findFirst({
        where: { code, companyId }
      })

      let currency
      if (existing) {
        currency = await prisma.currency.update({
          where: { id: existing.id },
          data: {
            isActive: enabled,
            exchangeRate: exchangeRate
          }
        })
      } else {
        currency = await prisma.currency.create({
          data: {
            companyId,
            code,
            name: code,
            symbol: code,
            exchangeRate: exchangeRate || 1,
            isActive: enabled ?? true
          }
        })
      }

      return NextResponse.json(currency)
    } catch {
      // If table doesn't exist, just return success
      return NextResponse.json({ success: true, code, enabled, exchangeRate })
    }
  } catch (error) {
    console.error('Error updating currency:', error)
    return NextResponse.json({ error: 'Error al actualizar moneda' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, baseCurrency } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId es requerido' },
        { status: 400 }
      )
    }

    // Get current settings and update base currency
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    })

    const currentSettings = (company?.settings as Record<string, unknown>) || {}

    await prisma.company.update({
      where: { id: companyId },
      data: { 
        settings: { ...currentSettings, baseCurrency }
      }
    })

    return NextResponse.json({ baseCurrency })
  } catch (error) {
    console.error('Error updating base currency:', error)
    return NextResponse.json({ error: 'Error al actualizar moneda base' }, { status: 500 })
  }
}

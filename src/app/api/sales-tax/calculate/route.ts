import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    const searchParams = req.nextUrl.searchParams
    const zipCode = searchParams.get('zip')
    const county = searchParams.get('county')
    const city = searchParams.get('city')
    
    // Buscar tasa de impuesto por condado (más común)
    if (county) {
      const taxRate = await (prisma as any).salesTaxRate.findFirst({
        where: {
          state: 'FL',
          county: county,
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        orderBy: {
          effectiveDate: 'desc'
        }
      })
      
      if (taxRate) {
        return NextResponse.json({
          state: taxRate.state,
          county: taxRate.county,
          city: taxRate.city,
          zipCode: taxRate.zipCode,
          stateTaxRate: taxRate.stateTaxRate,
          countyTaxRate: taxRate.countyTaxRate,
          cityTaxRate: taxRate.cityTaxRate,
          specialTaxRate: taxRate.specialTaxRate,
          totalTaxRate: taxRate.totalTaxRate,
          description: taxRate.description
        })
      }
    }
    
    // Buscar por código postal (si se implementa mapeo ZIP -> condado)
    if (zipCode) {
      // Por ahora retornar la tasa por defecto de Florida
      // En producción, necesitarías una tabla de mapeo ZIP -> County
      const defaultRate = await (prisma as any).salesTaxRate.findFirst({
        where: {
          state: 'FL',
          county: 'Miami-Dade', // Default
          isActive: true
        }
      })
      
      if (defaultRate) {
        return NextResponse.json({
          state: defaultRate.state,
          county: defaultRate.county,
          totalTaxRate: defaultRate.totalTaxRate,
          note: 'Using default Miami-Dade rate. Implement ZIP->County mapping for accurate rates.'
        })
      }
    }
    
    // Retornar tasa por defecto del estado
    return NextResponse.json({
      state: 'FL',
      stateTaxRate: 0.06,
      countyTaxRate: 0.01,
      totalTaxRate: 0.07,
      description: 'Florida default sales tax rate (6% state + 1% average county)'
    })
    
  } catch (error: any) {
    console.error('Error al calcular impuesto:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

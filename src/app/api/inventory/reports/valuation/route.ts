import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateValuationReport } from '@/lib/valuation-service'

/**
 * GET /api/inventory/reports/valuation
 * Genera reporte de valuación de inventario
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const warehouseId = searchParams.get('warehouseId') || undefined

    const report = await generateValuationReport(session.user.id, warehouseId)

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Error generating valuation report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOverdueInvoicesReport } from '@/lib/us-invoice-service'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    // Obtener reporte de facturas vencidas
    const report = await getOverdueInvoicesReport()
    
    return NextResponse.json(report)
    
  } catch (error: any) {
    console.error('Error al generar reporte de vencimientos:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { USInvoiceService } from '@/lib/us-invoice-service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    const invoiceId = params.id
    const invoiceService = new USInvoiceService()
    
    // Obtener estado de la factura
    const result = await invoiceService.getInvoiceStatus(invoiceId)
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('Error en status:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

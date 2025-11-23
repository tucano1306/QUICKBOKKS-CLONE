import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { USInvoiceService } from '@/lib/us-invoice-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    const invoiceId = params.id
    const body = await req.json()
    const { reason } = body
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Se requiere una razón para cancelar' },
        { status: 400 }
      )
    }
    
    const invoiceService = new USInvoiceService()
    
    // Cancelar factura
    const result = await invoiceService.cancelInvoice(invoiceId, reason)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al cancelar factura' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Error en cancel:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

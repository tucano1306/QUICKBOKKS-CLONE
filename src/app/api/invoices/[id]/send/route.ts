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
    
    const {
      recipientEmail,
      ccEmails,
      subject,
      message
    } = body
    
    const invoiceService = new USInvoiceService()
    
    // Enviar factura por email
    const result = await invoiceService.sendInvoiceByEmail(invoiceId, {
      recipientEmail,
      ccEmails,
      subject,
      message
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al enviar email' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      messageId: result.messageId
    })
    
  } catch (error: any) {
    console.error('Error en send:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

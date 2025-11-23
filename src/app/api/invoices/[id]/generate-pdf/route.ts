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
    const invoiceService = new USInvoiceService()
    
    // Generar PDF de la factura
    const result = await invoiceService.generateInvoicePDF(invoiceId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al generar PDF' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      pdfPath: result.pdfPath,
      eInvoiceId: result.eInvoiceId
    })
    
  } catch (error: any) {
    console.error('Error en generate-pdf:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

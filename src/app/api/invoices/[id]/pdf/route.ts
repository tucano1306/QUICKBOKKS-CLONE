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
    
    // Generar o obtener el PDF
    const result = await invoiceService.generateInvoicePDF(invoiceId)
    
    if (!result.success || !result.pdfBuffer) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener PDF' },
        { status: 500 }
      )
    }
    
    // Devolver el PDF como respuesta
    return new NextResponse(Buffer.from(result.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${result.invoiceNumber}.pdf"`
      }
    })
    
  } catch (error: any) {
    console.error('Error en pdf:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

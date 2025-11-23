import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processInvoice } from '@/lib/us-invoice-service'
import { logAudit } from '@/lib/audit'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    const invoiceId = params.id
    
    // Generar factura USA
    const result = await processInvoice(invoiceId, {
      generatePDF: true,
      sendEmail: false
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    // Log de auditoría
    await logAudit({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'INVOICE_PDF',
      entityId: invoiceId,
      changes: { invoiceNumber: result.invoiceNumber, status: 'GENERATED' }
    })
    
    return NextResponse.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      message: 'Factura generada exitosamente'
    })
    
  } catch (error: any) {
    console.error('Error al timbrar:', error)
    return NextResponse.json(
      { error: 'Error al timbrar la factura' },
      { status: 500 }
    )
  }
}

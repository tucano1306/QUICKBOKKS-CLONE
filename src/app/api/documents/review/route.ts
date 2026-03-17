/**
 * API para revisión de documentos procesados por IA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Por ahora retornar array vacío - en producción integrar con la base de datos
    // Los documentos se manejan en process-ai con almacenamiento en memoria
    return NextResponse.json({
      documents: [],
      total: 0,
      message: 'Use AI Document Processor section to upload and review documents'
    })

  } catch (error) {
    console.error('Error in document review API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents', documents: [] },
      { status: 500 }
    )
  }
}

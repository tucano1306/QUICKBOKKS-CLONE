import { NextRequest, NextResponse } from 'next/server';
import { getClientDocuments, uploadClientDocument } from '@/lib/client-portal-service';

/**
 * GET /api/client-portal/documents?customerId=xxx
 * Obtener documentos del cliente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId requerido' }, { status: 400 });
    }

    // TODO: Verificar autenticación del cliente

    const documents = await getClientDocuments(customerId, { type: type || undefined });
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error obteniendo documentos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/client-portal/documents
 * Subir documento
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const customerId = formData.get('customerId') as string;
    const companyId = formData.get('companyId') as string;
    const file = formData.get('file') as File;

    if (!customerId || !companyId || !file) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
    }

    // TODO: Verificar autenticación del cliente

    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await uploadClientDocument(
      customerId,
      {
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
      },
      companyId
    );

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error subiendo documento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

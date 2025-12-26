import { NextRequest, NextResponse } from 'next/server';
import { getClientDashboardStats, getClientInvoices, generateClientStatement } from '@/lib/client-portal-service';

export const dynamic = 'force-dynamic'

/**
 * GET /api/client-portal/dashboard?customerId=xxx
 * Obtener estadísticas del dashboard del cliente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type') || 'stats';

    if (!customerId) {
      return NextResponse.json({ error: 'customerId requerido' }, { status: 400 });
    }

    // TODO: Verificar autenticación del cliente con JWT

    switch (type) {
      case 'stats': {
        const stats = await getClientDashboardStats(customerId);
        return NextResponse.json(stats);
      }

      case 'invoices': {
        const status = searchParams.get('status') as any;
        const invoices = await getClientInvoices(customerId, { status, limit: 10 });
        return NextResponse.json(invoices);
      }

      case 'statement': {
        const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        const endDate = new Date(searchParams.get('endDate') || new Date());
        const statement = await generateClientStatement(customerId, startDate, endDate);
        return NextResponse.json(statement);
      }

      default:
        return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error en client-portal/dashboard:', error);
    return NextResponse.json({ error: error.message || 'Error obteniendo dashboard' }, { status: 500 });
  }
}

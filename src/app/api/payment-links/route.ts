import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateStripePaymentLink,
  generateManualPaymentLink,
  getPaymentLinkByCode,
  processManualPayment,
  // getInvoicePaymentLinks, // Function returns empty array - commented out
  // deactivatePaymentLink, // Function throws error - commented out
  // getPaymentLinksStats, // Function returns mock data - commented out
  // handleStripeWebhook, // Not exported
} from '@/lib/payment-links-service';

/**
 * GET /api/payment-links?invoiceId=xxx
 * Obtener payment links de una factura
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const shortCode = searchParams.get('code');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      // getPaymentLinksStats returns mock data
      return NextResponse.json({
        totalLinks: 0,
        activeLinks: 0,
        expiredLinks: 0,
        successfulPayments: 0,
        totalRevenue: 0,
        message: 'Payment links feature not fully available'
      });
    }

    if (shortCode) {
      // Endpoint público - no requiere auth
      const link = await getPaymentLinkByCode(shortCode);
      return NextResponse.json(link);
    }

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId o code requerido' }, { status: 400 });
    }

    // getInvoicePaymentLinks returns empty array
    return NextResponse.json([]);
  } catch (error: any) {
    console.error('Error obteniendo payment links:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/payment-links
 * Crear payment link o procesar pago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-stripe': {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const link = await generateStripePaymentLink(body.options);
        return NextResponse.json(link);
      }

      case 'create-manual': {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const link = await generateManualPaymentLink(body.options);
        return NextResponse.json(link);
      }

      case 'process-payment': {
        // Endpoint público
        const { shortCode, paymentDetails } = body;
        if (!shortCode || !paymentDetails) {
          return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
        }

        const result = await processManualPayment(shortCode, paymentDetails);
        return NextResponse.json(result);
      }

      case 'deactivate': {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { linkId } = body;
        if (!linkId) {
          return NextResponse.json({ error: 'linkId requerido' }, { status: 400 });
        }

        // deactivatePaymentLink throws error
        return NextResponse.json({ error: 'Payment link deactivation not available' }, { status: 501 });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error en payment-links:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

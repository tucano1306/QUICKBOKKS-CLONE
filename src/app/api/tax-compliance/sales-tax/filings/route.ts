/**
 * API: Sales Tax Filings
 * GET/POST /api/tax-compliance/sales-tax/filings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getPendingFilings, 
  getFilingHistory, 
  createSalesTaxFiling,
  generateFilingsForPeriod,
  fileSalesTaxReturn,
  markSalesTaxPaid 
} from '@/lib/sales-tax-automation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const state = searchParams.get('state') || undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    if (type === 'pending') {
      const filings = await getPendingFilings(session.user.id);
      return NextResponse.json({ filings, count: filings.length });
    } else {
      const filings = await getFilingHistory(session.user.id, state, year);
      return NextResponse.json({ filings, count: filings.length });
    }
  } catch (error: any) {
    console.error('Error fetching filings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'create') {
      // Create single filing
      const { state, filingPeriod, periodStart, periodEnd, dueDate } = data;
      const filing = await createSalesTaxFiling(
        session.user.id,
        state,
        filingPeriod,
        new Date(periodStart),
        new Date(periodEnd),
        new Date(dueDate)
      );
      return NextResponse.json({ filing });
    } else if (action === 'generate-batch') {
      // Generate filings for all nexus states
      const { period, periodStart, periodEnd } = data;
      const filings = await generateFilingsForPeriod(
        session.user.id,
        period,
        new Date(periodStart),
        new Date(periodEnd)
      );
      return NextResponse.json({ filings, count: filings.length });
    } else if (action === 'file') {
      // Mark as filed
      const { filingId, confirmationNumber } = data;
      const filing = await fileSalesTaxReturn(filingId, confirmationNumber);
      return NextResponse.json({ filing });
    } else if (action === 'mark-paid') {
      // Mark as paid
      const { filingId, paymentProof } = data;
      const filing = await markSalesTaxPaid(filingId, paymentProof);
      return NextResponse.json({ filing });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing filing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

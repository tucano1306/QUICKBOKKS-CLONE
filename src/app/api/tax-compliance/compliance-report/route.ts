/**
 * API: Compliance Report
 * GET /api/tax-compliance/compliance-report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateComplianceReport } from '@/lib/tax-compliance-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());

    const report = await generateComplianceReport(session.user.id, taxYear);
    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

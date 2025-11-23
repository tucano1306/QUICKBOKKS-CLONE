/**
 * API: Generate 1096 Summary
 * POST /api/tax-compliance/1096
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate1096Summary } from '@/lib/tax-compliance-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { taxYear, formType } = body;

    if (!taxYear) {
      return NextResponse.json({ error: 'Tax year required' }, { status: 400 });
    }

    const form1096 = await generate1096Summary(
      session.user.id,
      taxYear,
      formType || '1099-NEC'
    );

    return NextResponse.json({ form1096 });
  } catch (error: any) {
    console.error('Error generating 1096:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

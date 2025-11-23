/**
 * API: W-9 Management
 * GET/POST /api/tax-compliance/w9
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requestW9, checkW9Status, submitW9Information } from '@/lib/tax-compliance-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }

    const w9Status = await checkW9Status(session.user.id, vendorId);
    return NextResponse.json(w9Status);
  } catch (error: any) {
    console.error('Error checking W-9:', error);
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

    if (action === 'request') {
      // Request W-9 from vendor
      const w9 = await requestW9(session.user.id, data);
      return NextResponse.json({ w9, message: 'W-9 request created' });
    } else if (action === 'submit') {
      // Submit W-9 information
      const { w9Id, ...w9Data } = data;
      const w9 = await submitW9Information(w9Id, w9Data);
      return NextResponse.json({ w9, message: 'W-9 submitted successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing W-9:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

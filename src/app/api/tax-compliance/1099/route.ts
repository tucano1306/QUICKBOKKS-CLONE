/**
 * API: List & Manage 1099 Forms
 * GET /api/tax-compliance/1099
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { get1099List, get1099Details, send1099ToRecipient, file1099WithIRS } from '@/lib/tax-compliance-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());
    const status = searchParams.get('status') as any;
    const formId = searchParams.get('id');

    if (formId) {
      // Get specific form
      const form = await get1099Details(formId);
      return NextResponse.json({ form });
    } else {
      // List forms
      const forms = await get1099List(session.user.id, taxYear, status);
      return NextResponse.json({ forms, count: forms.length });
    }
  } catch (error: any) {
    console.error('Error fetching 1099s:', error);
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
    const { action, formId } = body;

    if (action === 'send') {
      const form = await send1099ToRecipient(formId);
      return NextResponse.json({ form, message: 'Form sent to recipient' });
    } else if (action === 'file') {
      const form = await file1099WithIRS(formId);
      return NextResponse.json({ form, message: 'Form filed with IRS' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing 1099:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

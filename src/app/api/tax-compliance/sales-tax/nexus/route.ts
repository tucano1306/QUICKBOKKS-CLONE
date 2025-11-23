/**
 * API: Sales Tax Nexus Analysis
 * GET /api/tax-compliance/sales-tax/nexus
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeNexusForAllStates, updateNexusRecords, getStatesWithNexus } from '@/lib/sales-tax-automation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (action === 'list') {
      // Get states with nexus
      const states = await getStatesWithNexus(session.user.id);
      return NextResponse.json({ states });
    } else {
      // Analyze nexus for all states
      const analyses = await analyzeNexusForAllStates(session.user.id, year);
      
      // Update records in DB
      await updateNexusRecords(session.user.id, analyses);
      
      return NextResponse.json({ analyses, count: analyses.length });
    }
  } catch (error: any) {
    console.error('Error analyzing nexus:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

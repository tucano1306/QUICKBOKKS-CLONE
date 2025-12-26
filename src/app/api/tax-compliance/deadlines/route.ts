/**
 * API: Tax Deadlines
 * GET/POST /api/tax-compliance/deadlines
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getUpcomingDeadlines,
  getOverdueDeadlines,
  updateDeadlineStatuses,
  markDeadlineCompleted,
  seedTaxDeadlines,
  addCustomDeadline,
  getComplianceCalendar,
  getAnnualSummary
} from '@/lib/tax-deadline-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const daysAhead = searchParams.get('daysAhead') ? parseInt(searchParams.get('daysAhead')!) : 90;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Update statuses first
    await updateDeadlineStatuses(session.user.id);

    if (type === 'upcoming') {
      const deadlines = await getUpcomingDeadlines(session.user.id, daysAhead);
      return NextResponse.json({ deadlines, count: deadlines.length });
    } else if (type === 'overdue') {
      const deadlines = await getOverdueDeadlines(session.user.id);
      return NextResponse.json({ deadlines, count: deadlines.length });
    } else if (type === 'calendar' && month !== undefined) {
      const calendar = await getComplianceCalendar(session.user.id, month, year);
      return NextResponse.json({ calendar });
    } else if (type === 'summary') {
      const summary = await getAnnualSummary(session.user.id, year);
      return NextResponse.json({ summary });
    } else {
      // Default: upcoming
      const deadlines = await getUpcomingDeadlines(session.user.id, daysAhead);
      return NextResponse.json({ deadlines, count: deadlines.length });
    }
  } catch (error: any) {
    console.error('Error fetching deadlines:', error);
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

    if (action === 'seed') {
      // Seed federal deadlines
      const year = data.year || new Date().getFullYear();
      const deadlines = await seedTaxDeadlines(session.user.id, year);
      return NextResponse.json({ deadlines, count: deadlines.length, message: 'Deadlines seeded successfully' });
    } else if (action === 'add') {
      // Add custom deadline
      const deadline = await addCustomDeadline(session.user.id, data);
      return NextResponse.json({ deadline });
    } else if (action === 'complete') {
      // Mark as completed
      const { deadlineId } = data;
      const deadline = await markDeadlineCompleted(deadlineId);
      return NextResponse.json({ deadline, message: 'Deadline marked as completed' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing deadline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

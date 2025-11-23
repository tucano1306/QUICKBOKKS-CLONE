import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateCashFlowStatement,
  generateSalesByCustomer,
  generateSalesByProduct,
  generatePayrollSummary,
  generateAgingReport,
  generateInventoryValuation,
} from '@/lib/report-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const asOfDate = searchParams.get('asOfDate');

    if (!type) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    let report;

    switch (type) {
      case 'balance-sheet':
        if (!asOfDate) {
          return NextResponse.json({ error: 'asOfDate is required' }, { status: 400 });
        }
        report = await generateBalanceSheet(session.user.id, new Date(asOfDate));
        break;

      case 'income-statement':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        report = await generateIncomeStatement(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case 'cash-flow':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        report = await generateCashFlowStatement(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case 'sales-by-customer':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        report = await generateSalesByCustomer(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case 'sales-by-product':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        report = await generateSalesByProduct(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case 'payroll-summary':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        report = await generatePayrollSummary(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case 'aging-report':
        const date = asOfDate ? new Date(asOfDate) : new Date();
        report = await generateAgingReport(session.user.id, date);
        break;

      case 'inventory-valuation':
        const valuationDate = asOfDate ? new Date(asOfDate) : new Date();
        report = await generateInventoryValuation(session.user.id, valuationDate);
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

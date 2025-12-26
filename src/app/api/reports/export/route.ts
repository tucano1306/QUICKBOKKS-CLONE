import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateSalesByCustomer,
  generatePayrollSummary,
  generateAgingReport,
} from '@/lib/report-service';
import {
  exportBalanceSheetToPDF,
  exportIncomeStatementToPDF,
  exportSalesByCustomerToPDF,
  exportBalanceSheetToCSV,
  exportIncomeStatementToCSV,
  exportSalesByCustomerToCSV,
  exportAgingReportToCSV,
  exportPayrollSummaryToCSV,
} from '@/lib/export-service';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format'); // 'pdf' or 'csv'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const asOfDate = searchParams.get('asOfDate');

    if (!type || !format) {
      return NextResponse.json(
        { error: 'Report type and format are required' },
        { status: 400 }
      );
    }

    let content: string;
    let contentType: string;
    let filename: string;

    switch (type) {
      case 'balance-sheet': {
        if (!asOfDate) {
          return NextResponse.json({ error: 'asOfDate is required' }, { status: 400 });
        }
        const report = await generateBalanceSheet(session.user.id, new Date(asOfDate));
        
        if (format === 'pdf') {
          content = exportBalanceSheetToPDF(report, { title: 'Balance Sheet' });
          contentType = 'text/html';
          filename = `balance-sheet-${asOfDate}.html`;
        } else {
          content = exportBalanceSheetToCSV(report);
          contentType = 'text/csv';
          filename = `balance-sheet-${asOfDate}.csv`;
        }
        break;
      }

      case 'income-statement': {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        const report = await generateIncomeStatement(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        
        if (format === 'pdf') {
          content = exportIncomeStatementToPDF(report, { title: 'Income Statement' });
          contentType = 'text/html';
          filename = `income-statement-${startDate}-${endDate}.html`;
        } else {
          content = exportIncomeStatementToCSV(report);
          contentType = 'text/csv';
          filename = `income-statement-${startDate}-${endDate}.csv`;
        }
        break;
      }

      case 'sales-by-customer': {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        const report = await generateSalesByCustomer(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        
        if (format === 'pdf') {
          content = exportSalesByCustomerToPDF(report, { title: 'Sales by Customer' });
          contentType = 'text/html';
          filename = `sales-by-customer-${startDate}-${endDate}.html`;
        } else {
          content = exportSalesByCustomerToCSV(report);
          contentType = 'text/csv';
          filename = `sales-by-customer-${startDate}-${endDate}.csv`;
        }
        break;
      }

      case 'aging-report': {
        const date = asOfDate ? new Date(asOfDate) : new Date();
        const report = await generateAgingReport(session.user.id, date);
        
        content = exportAgingReportToCSV(report);
        contentType = 'text/csv';
        filename = `aging-report-${date.toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'payroll-summary': {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }
        const report = await generatePayrollSummary(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );
        
        content = exportPayrollSummaryToCSV(report);
        contentType = 'text/csv';
        filename = `payroll-summary-${startDate}-${endDate}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export report error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

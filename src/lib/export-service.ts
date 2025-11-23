/**
 * Export Service - Export reports to PDF and Excel
 */

import type {
  BalanceSheetReport,
  IncomeStatementReport,
  CashFlowReport,
  SalesByCustomerReport,
  SalesByProductReport,
  PayrollSummaryReport,
  AgingReport,
  InventoryValuationReport,
} from './report-service';

// ==================== PDF EXPORT ====================

export interface PDFExportOptions {
  title: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'letter' | 'a4' | 'legal';
}

/**
 * Export Balance Sheet to PDF-ready HTML
 */
export function exportBalanceSheetToPDF(
  report: BalanceSheetReport,
  options: PDFExportOptions
): string {
  const { title } = options;
  const date = report.asOfDate.toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { text-align: center; color: #333; }
    .date { text-align: center; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .section { font-weight: bold; background: #f9f9f9; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .amount { text-align: right; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="date">As of ${date}</div>
  
  <h2>Assets</h2>
  <table>
    <tr><th>Account</th><th class="amount">Amount</th></tr>
    ${report.assets.currentAssets.map(a => `<tr><td>${a.accountName}</td><td class="amount">$${a.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Current Assets</td><td class="amount">$${report.assets.totalCurrent.toFixed(2)}</td></tr>
    ${report.assets.fixedAssets.map(a => `<tr><td>${a.accountName}</td><td class="amount">$${a.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Fixed Assets</td><td class="amount">$${report.assets.totalFixed.toFixed(2)}</td></tr>
    <tr class="total"><td>Total Assets</td><td class="amount">$${report.assets.totalAssets.toFixed(2)}</td></tr>
  </table>

  <h2>Liabilities</h2>
  <table>
    <tr><th>Account</th><th class="amount">Amount</th></tr>
    ${report.liabilities.currentLiabilities.map(l => `<tr><td>${l.accountName}</td><td class="amount">$${l.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Current Liabilities</td><td class="amount">$${report.liabilities.totalCurrent.toFixed(2)}</td></tr>
    ${report.liabilities.longTermLiabilities.map(l => `<tr><td>${l.accountName}</td><td class="amount">$${l.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Long-Term Liabilities</td><td class="amount">$${report.liabilities.totalLongTerm.toFixed(2)}</td></tr>
    <tr class="total"><td>Total Liabilities</td><td class="amount">$${report.liabilities.totalLiabilities.toFixed(2)}</td></tr>
  </table>

  <h2>Equity</h2>
  <table>
    <tr><th>Account</th><th class="amount">Amount</th></tr>
    <tr><td>Retained Earnings</td><td class="amount">$${report.equity.retainedEarnings.toFixed(2)}</td></tr>
    <tr class="total"><td>Total Equity</td><td class="amount">$${report.equity.totalEquity.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
}

/**
 * Export Income Statement to PDF-ready HTML
 */
export function exportIncomeStatementToPDF(
  report: IncomeStatementReport,
  options: PDFExportOptions
): string {
  const { title } = options;
  const startDate = report.startDate.toLocaleDateString();
  const endDate = report.endDate.toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { text-align: center; color: #333; }
    .date { text-align: center; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .section { font-weight: bold; background: #f9f9f9; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .amount { text-align: right; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="date">${startDate} - ${endDate}</div>
  
  <table>
    <tr><th>Account</th><th class="amount">Amount</th></tr>
    
    <tr class="section"><td colspan="2">Revenue</td></tr>
    ${report.revenue.items.map(r => `<tr><td>${r.accountName}</td><td class="amount">$${r.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Revenue</td><td class="amount">$${report.revenue.total.toFixed(2)}</td></tr>
    
    <tr class="section"><td colspan="2">Cost of Goods Sold</td></tr>
    ${report.costOfGoodsSold.items.map(c => `<tr><td>${c.accountName}</td><td class="amount">$${c.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total COGS</td><td class="amount">$${report.costOfGoodsSold.total.toFixed(2)}</td></tr>
    
    <tr class="total"><td>Gross Profit</td><td class="amount">$${report.grossProfit.toFixed(2)}</td></tr>
    
    <tr class="section"><td colspan="2">Operating Expenses</td></tr>
    ${report.operatingExpenses.items.map(e => `<tr><td>${e.accountName}</td><td class="amount">$${e.amount.toFixed(2)}</td></tr>`).join('')}
    <tr class="section"><td>Total Operating Expenses</td><td class="amount">$${report.operatingExpenses.total.toFixed(2)}</td></tr>
    
    <tr class="total"><td>Net Income</td><td class="amount">$${report.netIncome.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
}

/**
 * Export Sales by Customer to PDF-ready HTML
 */
export function exportSalesByCustomerToPDF(
  report: SalesByCustomerReport,
  options: PDFExportOptions
): string {
  const { title } = options;
  const startDate = report.startDate.toLocaleDateString();
  const endDate = report.endDate.toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { text-align: center; color: #333; }
    .date { text-align: center; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .amount { text-align: right; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="date">${startDate} - ${endDate}</div>
  
  <table>
    <tr>
      <th>Customer</th>
      <th class="amount">Invoices</th>
      <th class="amount">Total Sales</th>
      <th class="amount">Paid</th>
      <th class="amount">Outstanding</th>
    </tr>
    ${report.customers.map(c => `
      <tr>
        <td>${c.customerName}</td>
        <td class="amount">${c.invoiceCount}</td>
        <td class="amount">$${c.totalSales.toFixed(2)}</td>
        <td class="amount">$${c.totalPaid.toFixed(2)}</td>
        <td class="amount">$${c.totalOutstanding.toFixed(2)}</td>
      </tr>
    `).join('')}
    <tr class="total">
      <td>Totals</td>
      <td class="amount">${report.customers.length}</td>
      <td class="amount">$${report.totals.totalSales.toFixed(2)}</td>
      <td class="amount">$${report.totals.totalPaid.toFixed(2)}</td>
      <td class="amount">$${report.totals.totalOutstanding.toFixed(2)}</td>
    </tr>
  </table>
</body>
</html>`;
}

// ==================== EXCEL EXPORT ====================

/**
 * Export Balance Sheet to CSV format (can be opened in Excel)
 */
export function exportBalanceSheetToCSV(report: BalanceSheetReport): string {
  const lines: string[] = [];
  lines.push('Balance Sheet');
  lines.push(`As of: ${report.asOfDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('ASSETS');
  lines.push('Account,Amount');
  
  lines.push('Current Assets');
  report.assets.currentAssets.forEach(a => {
    lines.push(`${a.accountName},${a.amount.toFixed(2)}`);
  });
  lines.push(`Total Current Assets,${report.assets.totalCurrent.toFixed(2)}`);
  lines.push('');
  
  lines.push('Fixed Assets');
  report.assets.fixedAssets.forEach(a => {
    lines.push(`${a.accountName},${a.amount.toFixed(2)}`);
  });
  lines.push(`Total Fixed Assets,${report.assets.totalFixed.toFixed(2)}`);
  lines.push(`TOTAL ASSETS,${report.assets.totalAssets.toFixed(2)}`);
  lines.push('');
  
  lines.push('LIABILITIES');
  lines.push('Current Liabilities');
  report.liabilities.currentLiabilities.forEach(l => {
    lines.push(`${l.accountName},${l.amount.toFixed(2)}`);
  });
  lines.push(`Total Current Liabilities,${report.liabilities.totalCurrent.toFixed(2)}`);
  lines.push('');
  
  lines.push('Long-Term Liabilities');
  report.liabilities.longTermLiabilities.forEach(l => {
    lines.push(`${l.accountName},${l.amount.toFixed(2)}`);
  });
  lines.push(`Total Long-Term Liabilities,${report.liabilities.totalLongTerm.toFixed(2)}`);
  lines.push(`TOTAL LIABILITIES,${report.liabilities.totalLiabilities.toFixed(2)}`);
  lines.push('');
  
  lines.push('EQUITY');
  lines.push(`Retained Earnings,${report.equity.retainedEarnings.toFixed(2)}`);
  lines.push(`TOTAL EQUITY,${report.equity.totalEquity.toFixed(2)}`);
  
  return lines.join('\n');
}

/**
 * Export Income Statement to CSV format
 */
export function exportIncomeStatementToCSV(report: IncomeStatementReport): string {
  const lines: string[] = [];
  lines.push('Income Statement');
  lines.push(`Period: ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('Account,Amount');
  
  lines.push('REVENUE');
  report.revenue.items.forEach(r => {
    lines.push(`${r.accountName},${r.amount.toFixed(2)}`);
  });
  lines.push(`Total Revenue,${report.revenue.total.toFixed(2)}`);
  lines.push('');
  
  lines.push('COST OF GOODS SOLD');
  report.costOfGoodsSold.items.forEach(c => {
    lines.push(`${c.accountName},${c.amount.toFixed(2)}`);
  });
  lines.push(`Total COGS,${report.costOfGoodsSold.total.toFixed(2)}`);
  lines.push('');
  
  lines.push(`GROSS PROFIT,${report.grossProfit.toFixed(2)}`);
  lines.push('');
  
  lines.push('OPERATING EXPENSES');
  report.operatingExpenses.items.forEach(e => {
    lines.push(`${e.accountName},${e.amount.toFixed(2)}`);
  });
  lines.push(`Total Operating Expenses,${report.operatingExpenses.total.toFixed(2)}`);
  lines.push('');
  
  lines.push(`NET INCOME,${report.netIncome.toFixed(2)}`);
  
  return lines.join('\n');
}

/**
 * Export Sales by Customer to CSV format
 */
export function exportSalesByCustomerToCSV(report: SalesByCustomerReport): string {
  const lines: string[] = [];
  lines.push('Sales by Customer Report');
  lines.push(`Period: ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('Customer,Invoice Count,Total Sales,Total Paid,Outstanding');
  
  report.customers.forEach(c => {
    lines.push(
      `${c.customerName},${c.invoiceCount},${c.totalSales.toFixed(2)},${c.totalPaid.toFixed(2)},${c.totalOutstanding.toFixed(2)}`
    );
  });
  
  lines.push('');
  lines.push(
    `TOTALS,${report.customers.length},${report.totals.totalSales.toFixed(2)},${report.totals.totalPaid.toFixed(2)},${report.totals.totalOutstanding.toFixed(2)}`
  );
  
  return lines.join('\n');
}

/**
 * Export Aging Report to CSV format
 */
export function exportAgingReportToCSV(report: AgingReport): string {
  const lines: string[] = [];
  lines.push('Accounts Receivable Aging Report');
  lines.push(`As of: ${report.asOfDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('Customer,Current,1-30 Days,31-60 Days,61-90 Days,Over 90 Days,Total');
  
  report.customers.forEach(c => {
    lines.push(
      `${c.customerName},${c.current.toFixed(2)},${c.days30.toFixed(2)},${c.days60.toFixed(2)},${c.days90.toFixed(2)},${c.over90.toFixed(2)},${c.total.toFixed(2)}`
    );
  });
  
  lines.push('');
  lines.push(
    `TOTALS,${report.totals.current.toFixed(2)},${report.totals.days30.toFixed(2)},${report.totals.days60.toFixed(2)},${report.totals.days90.toFixed(2)},${report.totals.over90.toFixed(2)},${report.totals.total.toFixed(2)}`
  );
  
  return lines.join('\n');
}

/**
 * Export Payroll Summary to CSV format
 */
export function exportPayrollSummaryToCSV(report: PayrollSummaryReport): string {
  const lines: string[] = [];
  lines.push('Payroll Summary Report');
  lines.push(`Period: ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`);
  lines.push('');
  lines.push('Employee,Payroll Count,Gross Pay,Total Taxes,Net Pay');
  
  report.employees.forEach(e => {
    lines.push(
      `${e.employeeName},${e.payrollCount},${e.grossPay.toFixed(2)},${e.totalTaxes.toFixed(2)},${e.netPay.toFixed(2)}`
    );
  });
  
  lines.push('');
  lines.push(
    `TOTALS,${report.employees.length},${report.totals.totalGross.toFixed(2)},${report.totals.totalTaxes.toFixed(2)},${report.totals.totalNet.toFixed(2)}`
  );
  
  return lines.join('\n');
}

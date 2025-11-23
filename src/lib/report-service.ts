/**
 * Report Service - Advanced Reporting System
 * Comprehensive reporting for financial, sales, payroll, and management analytics
 */

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

// ==================== FINANCIAL REPORTS ====================

/**
 * Balance Sheet Report
 * Assets = Liabilities + Equity
 */
export interface BalanceSheetReport {
  asOfDate: Date;
  assets: {
    currentAssets: Array<{ accountName: string; amount: number }>;
    fixedAssets: Array<{ accountName: string; amount: number }>;
    totalCurrent: number;
    totalFixed: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: Array<{ accountName: string; amount: number }>;
    longTermLiabilities: Array<{ accountName: string; amount: number }>;
    totalCurrent: number;
    totalLongTerm: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    currentPeriodIncome: number;
    totalEquity: number;
  };
}

export async function generateBalanceSheet(
  userId: string,
  asOfDate: Date
): Promise<BalanceSheetReport> {
  // Get all journal entry lines up to the date
  const entries = await prisma.journalEntry.findMany({
    where: {
      date: { lte: asOfDate },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  const accountBalances = new Map<string, { name: string; type: string; balance: number }>();

  // Calculate balances for each account
  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const accountId = line.accountId;
      const accountName = line.account.name;
      const accountType = line.account.type;

      if (!accountBalances.has(accountId)) {
        accountBalances.set(accountId, { name: accountName, type: accountType, balance: 0 });
      }

      const account = accountBalances.get(accountId)!;
      account.balance += line.debit - line.credit;
    });
  });

  // Categorize accounts
  const currentAssets: Array<{ accountName: string; amount: number }> = [];
  const fixedAssets: Array<{ accountName: string; amount: number }> = [];
  const currentLiabilities: Array<{ accountName: string; amount: number }> = [];
  const longTermLiabilities: Array<{ accountName: string; amount: number }> = [];

  accountBalances.forEach((account) => {
    if (account.type === 'ASSET') {
      if (account.name.toLowerCase().includes('fixed') || account.name.toLowerCase().includes('property')) {
        fixedAssets.push({ accountName: account.name, amount: account.balance });
      } else {
        currentAssets.push({ accountName: account.name, amount: account.balance });
      }
    } else if (account.type === 'LIABILITY') {
      if (account.name.toLowerCase().includes('long-term') || account.name.toLowerCase().includes('mortgage')) {
        longTermLiabilities.push({ accountName: account.name, amount: account.balance });
      } else {
        currentLiabilities.push({ accountName: account.name, amount: account.balance });
      }
    }
  });

  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
  const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, l) => sum + l.amount, 0);

  // Calculate equity (simplified)
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalEquity = totalAssets - totalLiabilities;

  return {
    asOfDate,
    assets: {
      currentAssets,
      fixedAssets,
      totalCurrent: totalCurrentAssets,
      totalFixed: totalFixedAssets,
      totalAssets,
    },
    liabilities: {
      currentLiabilities,
      longTermLiabilities,
      totalCurrent: totalCurrentLiabilities,
      totalLongTerm: totalLongTermLiabilities,
      totalLiabilities,
    },
    equity: {
      retainedEarnings: totalEquity,
      currentPeriodIncome: 0, // Calculate from income statement
      totalEquity,
    },
  };
}

/**
 * Income Statement (Profit & Loss)
 */
export interface IncomeStatementReport {
  startDate: Date;
  endDate: Date;
  revenue: {
    items: Array<{ accountName: string; amount: number }>;
    total: number;
  };
  costOfGoodsSold: {
    items: Array<{ accountName: string; amount: number }>;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    items: Array<{ accountName: string; amount: number }>;
    total: number;
  };
  operatingIncome: number;
  otherIncome: {
    items: Array<{ accountName: string; amount: number }>;
    total: number;
  };
  otherExpenses: {
    items: Array<{ accountName: string; amount: number }>;
    total: number;
  };
  netIncome: number;
}

export async function generateIncomeStatement(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeStatementReport> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  const revenue: Array<{ accountName: string; amount: number }> = [];
  const cogs: Array<{ accountName: string; amount: number }> = [];
  const expenses: Array<{ accountName: string; amount: number }> = [];
  const otherIncome: Array<{ accountName: string; amount: number }> = [];
  const otherExpenses: Array<{ accountName: string; amount: number }> = [];

  const accountTotals = new Map<string, { name: string; type: string; amount: number }>();

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const key = line.accountId;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, { name: line.account.name, type: line.account.type, amount: 0 });
      }
      const account = accountTotals.get(key)!;
      // For income statement: Revenue is credit, Expenses are debit
      account.amount += line.credit - line.debit;
    });
  });

  accountTotals.forEach((account) => {
    if (account.type === 'REVENUE') {
      revenue.push({ accountName: account.name, amount: account.amount });
    } else if (account.type === 'EXPENSE') {
      if (account.name.toLowerCase().includes('cogs') || account.name.toLowerCase().includes('cost of goods')) {
        cogs.push({ accountName: account.name, amount: Math.abs(account.amount) });
      } else {
        expenses.push({ accountName: account.name, amount: Math.abs(account.amount) });
      }
    }
  });

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalCOGS = cogs.reduce((sum, c) => sum + c.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOtherIncome = otherIncome.reduce((sum, i) => sum + i.amount, 0);
  const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = grossProfit - totalExpenses + totalOtherIncome - totalOtherExpenses;

  return {
    startDate,
    endDate,
    revenue: { items: revenue, total: totalRevenue },
    costOfGoodsSold: { items: cogs, total: totalCOGS },
    grossProfit,
    operatingExpenses: { items: expenses, total: totalExpenses },
    operatingIncome: grossProfit - totalExpenses,
    otherIncome: { items: otherIncome, total: totalOtherIncome },
    otherExpenses: { items: otherExpenses, total: totalOtherExpenses },
    netIncome,
  };
}

/**
 * Cash Flow Statement
 */
export interface CashFlowReport {
  startDate: Date;
  endDate: Date;
  operatingActivities: {
    items: Array<{ description: string; amount: number }>;
    total: number;
  };
  investingActivities: {
    items: Array<{ description: string; amount: number }>;
    total: number;
  };
  financingActivities: {
    items: Array<{ description: string; amount: number }>;
    total: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export async function generateCashFlowStatement(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowReport> {
  // Get transactions from bank accounts
  const transactions = await (prisma as any).transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  const operating: Array<{ description: string; amount: number }> = [];
  const investing: Array<{ description: string; amount: number }> = [];
  const financing: Array<{ description: string; amount: number }> = [];

  transactions.forEach((tx: any) => {
    const amount = tx.amount;
    const category = tx.category?.toLowerCase() || '';

    if (category.includes('revenue') || category.includes('expense') || category.includes('payroll')) {
      operating.push({ description: tx.description, amount });
    } else if (category.includes('asset') || category.includes('investment') || category.includes('equipment')) {
      investing.push({ description: tx.description, amount });
    } else if (category.includes('loan') || category.includes('debt') || category.includes('equity')) {
      financing.push({ description: tx.description, amount });
    } else {
      operating.push({ description: tx.description, amount });
    }
  });

  const totalOperating = operating.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalInvesting = investing.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalFinancing = financing.reduce((sum: number, i: any) => sum + i.amount, 0);
  const netCashFlow = totalOperating + totalInvesting + totalFinancing;

  // Get beginning cash (before startDate)
  const beginningTransactions = await (prisma as any).transaction.findMany({
    where: {
      date: { lt: startDate },
    },
  });
  const beginningCash = beginningTransactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const endingCash = beginningCash + netCashFlow;

  return {
    startDate,
    endDate,
    operatingActivities: { items: operating, total: totalOperating },
    investingActivities: { items: investing, total: totalInvesting },
    financingActivities: { items: financing, total: totalFinancing },
    netCashFlow,
    beginningCash,
    endingCash,
  };
}

// ==================== SALES REPORTS ====================

export interface SalesByCustomerReport {
  startDate: Date;
  endDate: Date;
  customers: Array<{
    customerId: string;
    customerName: string;
    invoiceCount: number;
    totalSales: number;
    totalPaid: number;
    totalOutstanding: number;
  }>;
  totals: {
    totalSales: number;
    totalPaid: number;
    totalOutstanding: number;
  };
}

export async function generateSalesByCustomer(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SalesByCustomerReport> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      issueDate: { gte: startDate, lte: endDate },
    },
    include: {
      customer: true,
      payments: true,
    },
  });

  const customerMap = new Map<string, any>();

  invoices.forEach((invoice) => {
    const customerId = invoice.customerId;
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        customerName: invoice.customer.name,
        invoiceCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      });
    }

    const customer = customerMap.get(customerId)!;
    customer.invoiceCount++;
    customer.totalSales += invoice.total;
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    customer.totalPaid += paid;
    customer.totalOutstanding += invoice.total - paid;
  });

  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSales - a.totalSales);

  const totals = customers.reduce(
    (acc, c) => ({
      totalSales: acc.totalSales + c.totalSales,
      totalPaid: acc.totalPaid + c.totalPaid,
      totalOutstanding: acc.totalOutstanding + c.totalOutstanding,
    }),
    { totalSales: 0, totalPaid: 0, totalOutstanding: 0 }
  );

  return { startDate, endDate, customers, totals };
}

export interface SalesByProductReport {
  startDate: Date;
  endDate: Date;
  products: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
    averagePrice: number;
  }>;
  totalRevenue: number;
}

export async function generateSalesByProduct(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SalesByProductReport> {
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: {
        userId,
        issueDate: { gte: startDate, lte: endDate },
      },
    },
    include: {
      product: true,
      invoice: true,
    },
  });

  const productMap = new Map<string, any>();

  invoiceItems.forEach((item) => {
    if (!item.productId) return;

    const productId = item.productId;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: item.product?.name || 'Unknown',
        quantitySold: 0,
        totalRevenue: 0,
      });
    }

    const product = productMap.get(productId)!;
    product.quantitySold += item.quantity;
    product.totalRevenue += item.total;
  });

  const products = Array.from(productMap.values())
    .map((p) => ({
      ...p,
      averagePrice: p.totalRevenue / p.quantitySold,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);

  return { startDate, endDate, products, totalRevenue };
}

// ==================== PAYROLL REPORTS ====================

export interface PayrollSummaryReport {
  startDate: Date;
  endDate: Date;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    payrollCount: number;
    grossPay: number;
    totalTaxes: number;
    netPay: number;
  }>;
  totals: {
    totalGross: number;
    totalTaxes: number;
    totalNet: number;
  };
}

export async function generatePayrollSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PayrollSummaryReport> {
  const payrolls = await prisma.payroll.findMany({
    where: {
      employee: { userId },
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
      status: 'PAID',
    },
    include: {
      employee: true,
      deductionItems: true,
    },
  });

  const employeeMap = new Map<string, any>();

  payrolls.forEach((payroll) => {
    const empId = payroll.employeeId;
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employeeId: empId,
        employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        payrollCount: 0,
        grossPay: 0,
        totalTaxes: 0,
        netPay: 0,
      });
    }

    const emp = employeeMap.get(empId)!;
    emp.payrollCount++;
    emp.grossPay += payroll.grossSalary;
    emp.totalTaxes += payroll.deductions;
    emp.netPay += payroll.netSalary;
  });

  const employees = Array.from(employeeMap.values());

  const totals = employees.reduce(
    (acc, e) => ({
      totalGross: acc.totalGross + e.grossPay,
      totalTaxes: acc.totalTaxes + e.totalTaxes,
      totalNet: acc.totalNet + e.netPay,
    }),
    { totalGross: 0, totalTaxes: 0, totalNet: 0 }
  );

  return { startDate, endDate, employees, totals };
}

// ==================== AGING REPORTS ====================

export interface AgingReport {
  asOfDate: Date;
  customers: Array<{
    customerId: string;
    customerName: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  }>;
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  };
}

export async function generateAgingReport(userId: string, asOfDate: Date): Promise<AgingReport> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: { not: 'PAID' },
    },
    include: {
      customer: true,
      payments: true,
    },
  });

  const customerMap = new Map<string, any>();

  invoices.forEach((invoice) => {
    const customerId = invoice.customerId;
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        customerName: invoice.customer.name,
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        over90: 0,
        total: 0,
      });
    }

    const customer = customerMap.get(customerId)!;
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.total - paid;

    if (outstanding <= 0) return;

    const daysOverdue = Math.floor(
      (asOfDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 0) {
      customer.current += outstanding;
    } else if (daysOverdue <= 30) {
      customer.days30 += outstanding;
    } else if (daysOverdue <= 60) {
      customer.days60 += outstanding;
    } else if (daysOverdue <= 90) {
      customer.days90 += outstanding;
    } else {
      customer.over90 += outstanding;
    }

    customer.total += outstanding;
  });

  const customers = Array.from(customerMap.values()).sort((a, b) => b.total - a.total);

  const totals = customers.reduce(
    (acc, c) => ({
      current: acc.current + c.current,
      days30: acc.days30 + c.days30,
      days60: acc.days60 + c.days60,
      days90: acc.days90 + c.days90,
      over90: acc.over90 + c.over90,
      total: acc.total + c.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
  );

  return { asOfDate, customers, totals };
}

// ==================== INVENTORY REPORTS ====================

export interface InventoryValuationReport {
  asOfDate: Date;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
  }>;
  totalValue: number;
}

export async function generateInventoryValuation(
  userId: string,
  asOfDate: Date
): Promise<InventoryValuationReport> {
  const products = await (prisma as any).product.findMany({
    where: { userId },
    include: {
      inventory: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  const items = products.map((product: any) => {
    const totalQuantity = product.inventory?.reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0;
    const unitCost = product.cost || 0;
    const totalValue = totalQuantity * unitCost;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku || 'N/A',
      quantity: totalQuantity,
      unitCost,
      totalValue,
    };
  });

  const totalValue = items.reduce((sum: number, item: any) => sum + item.totalValue, 0);

  return { asOfDate, items, totalValue };
}

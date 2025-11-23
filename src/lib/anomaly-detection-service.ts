/**
 * FASE 9: Anomaly Detection Service
 * 
 * Detect unusual patterns and potential fraud
 * - Duplicate transactions
 * - Unusual amounts (outliers)
 * - Suspicious vendors
 * - Spending spikes
 * - Missing receipts
 * - Budget overruns
 */

import { prisma } from './prisma';

interface AnomalyCheck {
  resource: string;
  resourceId: string;
  checks: string[];
}

/**
 * Detect duplicate transactions
 */
export async function detectDuplicateTransactions(companyId: string) {
  // Note: Transaction model doesn't have userId/companyId field
  // Use customerId for filtering or implement with bank transactions
  const recentTransactions: any[] = [];
  /*
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      customerId: companyId, // Or use another relation
      date: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: 'desc' },
  });
  */
  
  const duplicates = [];
  const seen = new Map<string, any>();
  
  for (const tx of recentTransactions) {
    const key = `${tx.description}_${tx.amount}_${tx.date.toDateString()}`;
    
    if (seen.has(key)) {
      const original = seen.get(key);
      
      // Create anomaly record
      await (prisma as any).anomalyDetection.create({
        data: {
          companyId,
          type: 'DUPLICATE_TRANSACTION',
          severity: 'WARNING',
          resource: 'transactions',
          resourceId: tx.id,
          title: 'Potential Duplicate Transaction',
          description: `Transaction "${tx.description}" for $${tx.amount} on ${tx.date.toDateString()} may be a duplicate of transaction ${original.id}`,
          detectedValue: {
            id: tx.id,
            amount: tx.amount.toString(),
            description: tx.description,
            date: tx.date,
          },
          expectedValue: {
            originalId: original.id,
          },
          confidence: 0.85,
        },
      });
      
      duplicates.push({
        transaction: tx,
        possibleDuplicate: original,
      });
    }
    
    seen.set(key, tx);
  }
  
  return duplicates;
}

/**
 * Detect unusual amounts (statistical outliers)
 */
export async function detectUnusualAmounts(companyId: string, resource: 'expenses' | 'invoices' = 'expenses') {
  const table = resource === 'expenses' ? prisma.expense : prisma.invoice;
  
  // @ts-ignore
  const records = await table.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 6 months
      },
    },
  });
  
  if (records.length < 10) {
    return []; // Not enough data
  }
  
  // Calculate statistics
  const amounts = records.map((r: any) => parseFloat(r.amount?.toString() || r.total?.toString() || '0'));
  const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Detect outliers (values > 3 standard deviations from mean)
  const outliers = [];
  
  for (const record of records) {
    const amount = parseFloat((record as any).amount?.toString() || (record as any).total?.toString() || '0');
    const zScore = Math.abs((amount - mean) / stdDev);
    
    if (zScore > 3) {
      const severity = zScore > 5 ? 'CRITICAL' : zScore > 4 ? 'WARNING' : 'INFO';
      
      await (prisma as any).anomalyDetection.create({
        data: {
          companyId,
          type: 'UNUSUAL_AMOUNT',
          severity,
          resource,
          resourceId: (record as any).id,
          title: `Unusual ${resource === 'expenses' ? 'Expense' : 'Invoice'} Amount`,
          description: `Amount $${amount.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from the mean ($${mean.toFixed(2)})`,
          detectedValue: { amount, zScore },
          expectedValue: { mean, stdDev },
          confidence: Math.min(0.99, 0.6 + (zScore - 3) * 0.1),
        },
      });
      
      outliers.push({
        record,
        amount,
        zScore,
        severity,
      });
    }
  }
  
  return outliers;
}

/**
 * Detect spending spikes
 */
export async function detectSpendingSpikes(companyId: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: 'asc' },
  });
  
  // Group by month
  const monthlySpending = new Map<string, number>();
  
  for (const expense of expenses) {
    const monthKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlySpending.get(monthKey) || 0;
    monthlySpending.set(monthKey, current + parseFloat(expense.amount.toString()));
  }
  
  const amounts = Array.from(monthlySpending.values());
  if (amounts.length < 3) {
    return [];
  }
  
  const avgSpending = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const spikes = [];
  
  for (const [month, spending] of monthlySpending) {
    const percentIncrease = ((spending - avgSpending) / avgSpending) * 100;
    
    if (percentIncrease > 50) {
      const severity = percentIncrease > 100 ? 'CRITICAL' : percentIncrease > 75 ? 'WARNING' : 'INFO';
      
      await (prisma as any).anomalyDetection.create({
        data: {
          companyId,
          type: 'SPENDING_SPIKE',
          severity,
          resource: 'expenses',
          resourceId: month,
          title: `Spending Spike Detected for ${month}`,
          description: `Monthly spending of $${spending.toFixed(2)} is ${percentIncrease.toFixed(0)}% higher than average ($${avgSpending.toFixed(2)})`,
          detectedValue: { month, spending, percentIncrease },
          expectedValue: { avgSpending },
          confidence: 0.9,
        },
      });
      
      spikes.push({
        month,
        spending,
        average: avgSpending,
        percentIncrease,
        severity,
      });
    }
  }
  
  return spikes;
}

/**
 * Detect suspicious vendors
 */
export async function detectSuspiciousVendors(companyId: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  // Group by vendor
  const vendorActivity = new Map<string, { count: number; total: number; expenses: any[] }>();
  
  for (const expense of expenses) {
    const vendor = expense.vendor || 'Unknown';
    const activity = vendorActivity.get(vendor) || { count: 0, total: 0, expenses: [] };
    activity.count++;
    activity.total += parseFloat(expense.amount.toString());
    activity.expenses.push(expense);
    vendorActivity.set(vendor, activity);
  }
  
  const suspicious = [];
  
  for (const [vendor, activity] of vendorActivity) {
    // Flag: Many transactions in short time
    if (activity.count > 10) {
      const daySpan = (Date.now() - activity.expenses[0].date.getTime()) / (1000 * 60 * 60 * 24);
      const transactionsPerDay = activity.count / daySpan;
      
      if (transactionsPerDay > 1) {
        await (prisma as any).anomalyDetection.create({
          data: {
            companyId,
            type: 'SUSPICIOUS_VENDOR',
            severity: 'WARNING',
            resource: 'expenses',
            resourceId: vendor,
            title: `High Transaction Frequency with ${vendor}`,
            description: `${activity.count} transactions totaling $${activity.total.toFixed(2)} with ${vendor} in the last ${daySpan.toFixed(0)} days (${transactionsPerDay.toFixed(1)} per day)`,
            detectedValue: { vendor, count: activity.count, total: activity.total, transactionsPerDay },
            expectedValue: { normalFrequency: '< 1 per day' },
            confidence: 0.7,
          },
        });
        
        suspicious.push({
          vendor,
          activity,
          reason: 'high_frequency',
        });
      }
    }
    
    // Flag: Round numbers (potential fraud)
    const roundNumbers = activity.expenses.filter((e: any) => {
      const amount = parseFloat(e.amount.toString());
      return amount % 100 === 0 || amount % 1000 === 0;
    }).length;
    
    if (roundNumbers > activity.count * 0.7) {
      suspicious.push({
        vendor,
        activity,
        reason: 'suspicious_round_amounts',
      });
    }
  }
  
  return suspicious;
}

/**
 * Detect missing receipts
 */
export async function detectMissingReceipts(companyId: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      amount: {
        gte: 75, // IRS requires receipts for expenses > $75
      },
      date: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
      },
    },
  });
  
  const missing = [];
  
  for (const expense of expenses) {
    const hasReceipt = (expense as any).receiptUrl || (expense as any).attachments;
    
    if (!hasReceipt) {
      const amount = parseFloat(expense.amount.toString());
      const severity = amount > 1000 ? 'CRITICAL' : amount > 500 ? 'WARNING' : 'INFO';
      
      await (prisma as any).anomalyDetection.create({
        data: {
          companyId,
          type: 'MISSING_RECEIPT',
          severity,
          resource: 'expenses',
          resourceId: expense.id,
          title: 'Missing Receipt for Expense',
          description: `Expense of $${amount.toFixed(2)} to ${expense.vendor || 'Unknown'} on ${expense.date.toDateString()} requires a receipt (IRS requirement for amounts > $75)`,
          detectedValue: { expenseId: expense.id, amount },
          expectedValue: { requiresReceipt: true },
          confidence: 1.0,
        },
      });
      
      missing.push(expense);
    }
  }
  
  return missing;
}

/**
 * Detect budget overruns
 */
export async function detectBudgetOverruns(companyId: string) {
  const budgets = await (prisma as any).budget.findMany({
    where: {
      userId: companyId,
      status: 'APPROVED',
    },
  });
  
  const overruns = [];
  
  for (const budget of budgets) {
    // Get actual spending for budget period
    const expenses = await prisma.expense.findMany({
      where: {
        userId: companyId,
        category: budget.category,
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
    });
    
    const actualSpending = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const budgetAmount = parseFloat(budget.amount.toString());
    const percentUsed = (actualSpending / budgetAmount) * 100;
    
    if (percentUsed > 90) {
      const severity = percentUsed > 110 ? 'CRITICAL' : percentUsed > 100 ? 'URGENT' : 'WARNING';
      
      await (prisma as any).anomalyDetection.create({
        data: {
          companyId,
          type: 'BUDGET_OVERRUN',
          severity,
          resource: 'budgets',
          resourceId: budget.id,
          title: `Budget ${percentUsed > 100 ? 'Exceeded' : 'Nearly Exceeded'}`,
          description: `${budget.category} budget: $${actualSpending.toFixed(2)} spent of $${budgetAmount.toFixed(2)} (${percentUsed.toFixed(0)}%)`,
          detectedValue: { category: budget.category, actualSpending, percentUsed },
          expectedValue: { budgetAmount },
          confidence: 1.0,
        },
      });
      
      overruns.push({
        budget,
        actualSpending,
        percentUsed,
        severity,
      });
    }
  }
  
  return overruns;
}

/**
 * Run all anomaly detection checks
 */
export async function runAllAnomalyDetectionChecks(companyId: string) {
  const results = {
    duplicateTransactions: await detectDuplicateTransactions(companyId),
    unusualExpenses: await detectUnusualAmounts(companyId, 'expenses'),
    unusualInvoices: await detectUnusualAmounts(companyId, 'invoices'),
    spendingSpikes: await detectSpendingSpikes(companyId),
    suspiciousVendors: await detectSuspiciousVendors(companyId),
    missingReceipts: await detectMissingReceipts(companyId),
    budgetOverruns: await detectBudgetOverruns(companyId),
  };
  
  const totalAnomalies =
    results.duplicateTransactions.length +
    results.unusualExpenses.length +
    results.unusualInvoices.length +
    results.spendingSpikes.length +
    results.suspiciousVendors.length +
    results.missingReceipts.length +
    results.budgetOverruns.length;
  
  return {
    totalAnomalies,
    results,
    summary: {
      critical: await getAnomalyCountBySeverity(companyId, 'CRITICAL'),
      urgent: await getAnomalyCountBySeverity(companyId, 'URGENT'),
      warning: await getAnomalyCountBySeverity(companyId, 'WARNING'),
      info: await getAnomalyCountBySeverity(companyId, 'INFO'),
    },
  };
}

/**
 * Get unresolved anomalies
 */
export async function getUnresolvedAnomalies(companyId: string, limit = 50) {
  return await (prisma as any).anomalyDetection.findMany({
    where: {
      companyId,
      isResolved: false,
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });
}

/**
 * Resolve anomaly
 */
export async function resolveAnomaly(
  anomalyId: string,
  resolvedBy: string,
  resolution: string
) {
  return await (prisma as any).anomalyDetection.update({
    where: { id: anomalyId },
    data: {
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
    },
  });
}

/**
 * Get anomaly statistics
 */
async function getAnomalyCountBySeverity(companyId: string, severity: string) {
  return await (prisma as any).anomalyDetection.count({
    where: {
      companyId,
      severity,
      isResolved: false,
    },
  });
}

/**
 * Get anomaly trends
 */
export async function getAnomalyTrends(companyId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const anomalies = await (prisma as any).anomalyDetection.findMany({
    where: {
      companyId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  // Group by day and type
  const byDay = new Map<string, any>();
  
  for (const anomaly of anomalies) {
    const dayKey = anomaly.createdAt.toISOString().split('T')[0];
    const day = byDay.get(dayKey) || { date: dayKey, total: 0, byType: {} };
    
    day.total++;
    day.byType[anomaly.type] = (day.byType[anomaly.type] || 0) + 1;
    
    byDay.set(dayKey, day);
  }
  
  return {
    trends: Array.from(byDay.values()),
    totalDetected: anomalies.length,
    byType: anomalies.reduce((acc: any, a: any) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {}),
  };
}

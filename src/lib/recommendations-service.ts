/**
 * FASE 9: Smart Recommendations Service
 * 
 * Generate intelligent recommendations for business optimization
 * - Tax saving opportunities
 * - Cost reduction suggestions
 * - Payment terms optimization
 * - Workflow automation ideas
 */

import { prisma } from './prisma';

/**
 * Generate tax saving recommendations
 */
export async function generateTaxSavingRecommendations(companyId: string) {
  const recommendations = [];
  
  // Check for deductible expenses not categorized
  const uncategorized = await prisma.expense.findMany({
    where: {
      userId: companyId,
      categoryId: null,
      amount: { gte: 100 },
    },
    take: 100,
  });
  
  if (uncategorized.length > 0) {
    const totalAmount = uncategorized.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    
    await (prisma as any).recommendation.create({
      data: {
        companyId,
        type: 'TAX_SAVING',
        title: 'Categorize Expenses for Tax Deductions',
        description: `${uncategorized.length} expenses totaling $${totalAmount.toFixed(2)} are uncategorized. Proper categorization can maximize your tax deductions.`,
        potentialSaving: totalAmount * 0.25, // Assume 25% tax rate
        estimatedImpact: 'High',
        actionSteps: [
          'Review uncategorized expenses',
          'Assign appropriate categories',
          'Consult with accountant for deductibility',
        ],
        relatedResource: 'expenses',
        priority: 8,
        confidence: 0.9,
      },
    });
    
    recommendations.push({
      type: 'tax_saving',
      title: 'Categorize Uncategorized Expenses',
      saving: totalAmount * 0.25,
    });
  }
  
  // Check for home office deduction opportunity
  // Note: category is now a relation, would need to query by category names
  const officeExpenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      },
      // Would need: category: { name: { in: ['Office', 'Utilities', 'Rent'] } }
    },
  });
  
  if (officeExpenses.length > 0) {
    const totalOffice = officeExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const homeOfficeDeduction = totalOffice * 0.2; // Typical 20% business use
    
    recommendations.push({
      type: 'tax_saving',
      title: 'Home Office Deduction',
      saving: homeOfficeDeduction,
    });
  }
  
  return recommendations;
}

/**
 * Generate cost reduction recommendations
 */
export async function generateCostReductionRecommendations(companyId: string) {
  const recommendations = [];
  
  // Analyze subscription expenses
  const subscriptions = await prisma.expense.findMany({
    where: {
      userId: companyId,
      // category: 'Software', // Would need category relation
      date: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  const recurringVendors = new Map<string, number>();
  for (const sub of subscriptions) {
    const vendor = sub.vendor || 'Unknown';
    recurringVendors.set(vendor, (recurringVendors.get(vendor) || 0) + 1);
  }
  
  // Find subscriptions that appear monthly
  for (const [vendor, count] of recurringVendors) {
    if (count >= 3) {
      const vendorExpenses = subscriptions.filter(s => s.vendor === vendor);
      const avgCost = vendorExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) / vendorExpenses.length;
      const potentialSaving = avgCost * 12 * 0.15; // Assume 15% savings with annual plan
      
      await (prisma as any).recommendation.create({
        data: {
          companyId,
          type: 'COST_REDUCTION',
          title: `Switch ${vendor} to Annual Plan`,
          description: `You're spending approximately $${avgCost.toFixed(2)}/month on ${vendor}. Switching to an annual plan could save 15-20%.`,
          potentialSaving,
          estimatedImpact: 'Medium',
          actionSteps: [
            `Contact ${vendor} sales`,
            'Request annual plan pricing',
            'Compare total cost savings',
          ],
          relatedResource: 'expenses',
          relatedId: vendor,
          priority: 6,
          confidence: 0.8,
        },
      });
      
      recommendations.push({
        type: 'cost_reduction',
        vendor,
        saving: potentialSaving,
      });
    }
  }
  
  return recommendations;
}

/**
 * Generate payment terms recommendations
 */
export async function generatePaymentTermsRecommendations(companyId: string) {
  const recommendations = [];
  
  // Analyze invoice payment patterns
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'PAID',
      issueDate: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  let totalEarly = 0;
  let earlyCount = 0;
  
  for (const invoice of paidInvoices) {
    const paymentDate = (invoice as any).paidDate || invoice.issueDate;
    const daysEarly = Math.floor((invoice.dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysEarly > 10) {
      totalEarly += parseFloat(invoice.total.toString());
      earlyCount++;
    }
  }
  
  if (earlyCount > 5) {
    const potentialSaving = totalEarly * 0.02; // 2% early payment discount
    
    await (prisma as any).recommendation.create({
      data: {
        companyId,
        type: 'PAYMENT_TERMS',
        title: 'Negotiate Early Payment Discounts',
        description: `You paid ${earlyCount} invoices early totaling $${totalEarly.toFixed(2)}. Consider negotiating 2% discounts for payments within 10 days.`,
        potentialSaving,
        estimatedImpact: 'Medium',
        actionSteps: [
          'Identify frequently used vendors',
          'Propose early payment terms (2/10 net 30)',
          'Set up automatic early payments',
        ],
        relatedResource: 'invoices',
        priority: 7,
        confidence: 0.75,
      },
    });
    
    recommendations.push({
      type: 'payment_terms',
      saving: potentialSaving,
    });
  }
  
  return recommendations;
}

/**
 * Generate workflow automation recommendations
 */
export async function generateAutomationRecommendations(companyId: string) {
  const recommendations = [];
  
  // Check for manual recurring expenses
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  const vendorFrequency = new Map<string, any[]>();
  for (const expense of expenses) {
    const vendor = expense.vendor || 'Unknown';
    const list = vendorFrequency.get(vendor) || [];
    list.push(expense);
    vendorFrequency.set(vendor, list);
  }
  
  for (const [vendor, expenseList] of vendorFrequency) {
    if (expenseList.length >= 6) {
      await (prisma as any).recommendation.create({
        data: {
          companyId,
          type: 'AUTOMATION',
          title: `Automate ${vendor} Expense Entry`,
          description: `${expenseList.length} manual entries for ${vendor}. Set up automatic import or recurring expense rules.`,
          estimatedImpact: 'Low',
          actionSteps: [
            'Set up bank feed connection',
            'Create expense rule for auto-categorization',
            'Enable receipt scanning',
          ],
          relatedResource: 'expenses',
          relatedId: vendor,
          priority: 5,
          confidence: 0.85,
        },
      });
      
      recommendations.push({
        type: 'automation',
        vendor,
        transactions: expenseList.length,
      });
    }
  }
  
  return recommendations;
}

/**
 * Generate all recommendations
 */
export async function generateAllRecommendations(companyId: string) {
  const [taxSaving, costReduction, paymentTerms, automation] = await Promise.all([
    generateTaxSavingRecommendations(companyId),
    generateCostReductionRecommendations(companyId),
    generatePaymentTermsRecommendations(companyId),
    generateAutomationRecommendations(companyId),
  ]);
  
  return {
    taxSaving,
    costReduction,
    paymentTerms,
    automation,
    totalRecommendations: taxSaving.length + costReduction.length + paymentTerms.length + automation.length,
  };
}

/**
 * Get pending recommendations
 */
export async function getPendingRecommendations(companyId: string, limit = 20) {
  return await (prisma as any).recommendation.findMany({
    where: {
      companyId,
      status: 'PENDING',
    },
    orderBy: [
      { priority: 'desc' },
      { potentialSaving: 'desc' },
    ],
    take: limit,
  });
}

/**
 * Accept and implement recommendation
 */
export async function acceptRecommendation(recommendationId: string, userId: string) {
  return await (prisma as any).recommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'ACCEPTED',
      implementedBy: userId,
      implementedAt: new Date(),
    },
  });
}

/**
 * Reject recommendation
 */
export async function rejectRecommendation(recommendationId: string, feedback?: string) {
  return await (prisma as any).recommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'REJECTED',
      feedback,
    },
  });
}

/**
 * Get recommendation statistics
 */
export async function getRecommendationStats(companyId: string) {
  const all = await (prisma as any).recommendation.findMany({
    where: { companyId },
  });
  
  const totalPotentialSaving = all
    .filter((r: any) => r.potentialSaving)
    .reduce((sum: number, r: any) => sum + parseFloat(r.potentialSaving.toString()), 0);
  
  const implemented = all.filter((r: any) => r.status === 'IMPLEMENTED');
  const actualSaving = implemented
    .filter((r: any) => r.actualSaving)
    .reduce((sum: number, r: any) => sum + parseFloat(r.actualSaving.toString()), 0);
  
  return {
    total: all.length,
    pending: all.filter((r: any) => r.status === 'PENDING').length,
    accepted: all.filter((r: any) => r.status === 'ACCEPTED').length,
    implemented: implemented.length,
    rejected: all.filter((r: any) => r.status === 'REJECTED').length,
    totalPotentialSaving,
    actualSaving,
    savingsRate: totalPotentialSaving > 0 ? (actualSaving / totalPotentialSaving) * 100 : 0,
  };
}

/**
 * FASE 9: AI Chatbot Service
 * 
 * Natural language interface for financial queries
 * - OpenAI integration
 * - Financial data queries
 * - Report generation
 * - Natural language commands
 */

import { prisma } from './prisma';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  message: string;
  data?: any;
  suggestions?: string[];
}

/**
 * Initialize chat conversation
 */
export async function createChatConversation(companyId: string, userId: string) {
  return await (prisma as any).chatConversation.create({
    data: {
      companyId,
      userId,
      title: 'New Conversation',
      context: {
        companyId,
        userId,
        startedAt: new Date(),
      },
    },
  });
}

/**
 * Send message to chatbot
 * Note: In production, integrate with OpenAI API
 */
export async function sendChatMessage(
  conversationId: string,
  userMessage: string
): Promise<ChatResponse> {
  const conversation = await (prisma as any).chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 10, // Last 10 messages for context
      },
    },
  });
  
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  
  // Save user message
  await (prisma as any).chatMessage.create({
    data: {
      conversationId,
      role: 'user',
      content: userMessage,
    },
  });
  
  // Detect intent and generate response
  const response = await processUserMessage(conversation.companyId, userMessage);
  
  // Save assistant message
  await (prisma as any).chatMessage.create({
    data: {
      conversationId,
      role: 'assistant',
      content: response.message,
      functionCall: response.data ? { function: 'query_data', data: response.data } : null,
    },
  });
  
  // Update conversation
  await (prisma as any).chatConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
  
  return response;
}

/**
 * Process user message and generate response
 */
async function processUserMessage(companyId: string, message: string): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();
  
  // Revenue queries
  if (lowerMessage.includes('revenue') || lowerMessage.includes('sales') || lowerMessage.includes('income')) {
    return await handleRevenueQuery(companyId, message);
  }
  
  // Expense queries
  if (lowerMessage.includes('expense') || lowerMessage.includes('spending') || lowerMessage.includes('cost')) {
    return await handleExpenseQuery(companyId, message);
  }
  
  // Invoice queries
  if (lowerMessage.includes('invoice') || lowerMessage.includes('bill')) {
    return await handleInvoiceQuery(companyId, message);
  }
  
  // Cash flow queries
  if (lowerMessage.includes('cash flow') || lowerMessage.includes('balance')) {
    return await handleCashFlowQuery(companyId, message);
  }
  
  // Tax queries
  if (lowerMessage.includes('tax')) {
    return await handleTaxQuery(companyId, message);
  }
  
  // Default response
  return {
    message: "I can help you with financial queries. Try asking about:\n- Revenue or sales\n- Expenses\n- Invoices\n- Cash flow\n- Tax information",
    suggestions: [
      'What was my revenue last month?',
      'Show me my top expenses',
      'How many unpaid invoices do I have?',
      'What is my cash flow forecast?',
    ],
  };
}

/**
 * Handle revenue queries
 */
async function handleRevenueQuery(companyId: string, message: string): Promise<ChatResponse> {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'PAID',
      issueDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const avgInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;
  
  return {
    message: `📊 **Revenue Summary (Last 30 Days)**\n\n` +
      `- Total Revenue: $${totalRevenue.toFixed(2)}\n` +
      `- Invoices Paid: ${invoices.length}\n` +
      `- Average Invoice: $${avgInvoice.toFixed(2)}`,
    data: {
      totalRevenue,
      invoiceCount: invoices.length,
      avgInvoice,
    },
    suggestions: [
      'Compare to previous month',
      'Show revenue by customer',
      'Generate revenue report',
    ],
  };
}

/**
 * Handle expense queries
 */
async function handleExpenseQuery(companyId: string, message: string): Promise<ChatResponse> {
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  
  // Group by category
  const byCategory = expenses.reduce((acc: any, exp) => {
    const category = exp.categoryId || 'Uncategorized';
    acc[category] = (acc[category] || 0) + parseFloat(exp.amount.toString());
    return acc;
  }, {});
  
  const topCategories = Object.entries(byCategory)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);
  
  let response = `💰 **Expense Summary (Last 30 Days)**\n\n` +
    `- Total Expenses: $${totalExpenses.toFixed(2)}\n` +
    `- Transaction Count: ${expenses.length}\n\n` +
    `**Top Categories:**\n`;
  
  for (const [category, amount] of topCategories) {
    response += `- ${category}: $${(amount as number).toFixed(2)}\n`;
  }
  
  return {
    message: response,
    data: {
      totalExpenses,
      count: expenses.length,
      byCategory,
    },
    suggestions: [
      'Show expense trends',
      'Find cost reduction opportunities',
      'Compare to budget',
    ],
  };
}

/**
 * Handle invoice queries
 */
async function handleInvoiceQuery(companyId: string, message: string): Promise<ChatResponse> {
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'SENT',
    },
  });
  
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  
  const overdue = unpaidInvoices.filter(inv => inv.dueDate < new Date());
  const totalOverdue = overdue.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  
  return {
    message: `📄 **Invoice Summary**\n\n` +
      `- Unpaid Invoices: ${unpaidInvoices.length} ($${totalUnpaid.toFixed(2)})\n` +
      `- Overdue: ${overdue.length} ($${totalOverdue.toFixed(2)})\n` +
      `- Awaiting Payment: ${unpaidInvoices.length - overdue.length}`,
    data: {
      unpaidCount: unpaidInvoices.length,
      totalUnpaid,
      overdueCount: overdue.length,
      totalOverdue,
    },
    suggestions: [
      'Send payment reminders',
      'View oldest unpaid invoices',
      'Generate aging report',
    ],
  };
}

/**
 * Handle cash flow queries
 */
async function handleCashFlowQuery(companyId: string, message: string): Promise<ChatResponse> {
  // Note: Transaction model doesn't have userId/companyId
  // Calculate from invoices and expenses instead
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'PAID',
      issueDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  
  const inflow = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const outflow = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const netFlow = inflow - outflow;
  
  return {
    message: `💵 **Cash Flow (Last 30 Days)**\n\n` +
      `- Inflow: $${inflow.toFixed(2)}\n` +
      `- Outflow: $${outflow.toFixed(2)}\n` +
      `- Net Cash Flow: $${netFlow.toFixed(2)}` +
      (netFlow >= 0 ? ' ✅' : ' ⚠️'),
    data: {
      inflow,
      outflow,
      netFlow,
    },
    suggestions: [
      'Forecast next month',
      'Show cash flow trends',
      'Identify improvement areas',
    ],
  };
}

/**
 * Handle tax queries
 */
async function handleTaxQuery(companyId: string, message: string): Promise<ChatResponse> {
  const currentYear = new Date().getFullYear();
  
  // Get year-to-date revenue and expenses
  const yearStart = new Date(currentYear, 0, 1);
  
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'PAID',
      issueDate: { gte: yearStart },
    },
  });
  
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: { gte: yearStart },
    },
  });
  
  const revenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);
  const deductions = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const taxableIncome = revenue - deductions;
  const estimatedTax = taxableIncome * 0.25; // Simplified 25% rate
  
  return {
    message: `🧾 **Tax Summary (${currentYear} YTD)**\n\n` +
      `- Revenue: $${revenue.toFixed(2)}\n` +
      `- Deductible Expenses: $${deductions.toFixed(2)}\n` +
      `- Taxable Income: $${taxableIncome.toFixed(2)}\n` +
      `- Estimated Tax: $${estimatedTax.toFixed(2)}\n\n` +
      `*Note: This is a simplified estimate. Consult your accountant for actual tax liability.*`,
    data: {
      revenue,
      deductions,
      taxableIncome,
      estimatedTax,
    },
    suggestions: [
      'Find tax saving opportunities',
      'Review deductible expenses',
      'Generate tax report',
    ],
  };
}

/**
 * Get chat history
 */
export async function getChatHistory(conversationId: string, limit = 50) {
  return await (prisma as any).chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

/**
 * Get user conversations
 */
export async function getUserConversations(companyId: string, userId: string) {
  return await (prisma as any).chatConversation.findMany({
    where: {
      companyId,
      userId,
      isActive: true,
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 10,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Last message
      },
    },
  });
}

/**
 * Close conversation
 */
export async function closeConversation(conversationId: string) {
  return await (prisma as any).chatConversation.update({
    where: { id: conversationId },
    data: { isActive: false },
  });
}
